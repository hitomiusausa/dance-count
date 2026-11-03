// 公開用の音楽の一式を作る（Mac で。docs/app-store/RELEASE-PLAN.md §1-2）。曲の原本と台帳（output/music-probe/）から:
//   <out>/music-catalog.json                                       曲の一覧（schemaVersion・tracks）
//   <out>/music/<id>/<revision>/<clipVersion>/<section>-<rate>.flac 練習用の音源（1 曲 = 区間 × 速さ）
// を作る。置き場所に曲の版と作り方の版が入るので、曲を差し替えても作り方を直しても古いキャッシュは当たらない。
// 切り出しの時刻のずれは、曲と同じサンプリング周波数のクリック音で測って打ち消し、許容に入らなければ止める（music-library.ts）。
// 作った FLAC は、同じ切り出しの WAV と 1 サンプルも違わないことを確かめてから書く（形を変えても音の頭がずれない）。
// 試作曲（Paper Umbrella）と、小節が取れない曲は入れない。曲の原本と一式は GitHub に入れない（.gitignore）。
// 使い方: npm run music:pack [-- --out output/music-pack] → ビルドで DC_MUSIC_PACK=output/music-pack
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type { MusicTrack } from '../src/app/music/model.ts';
import { MUSIC_CATALOG_FILE, MUSIC_PACK_SCHEMA_VERSION, musicClipPath, type MusicPackCatalog } from '../src/app/music/pack.ts';
import { CLIP_VERSION, assertRubberband, calibrateClipShifts, decodeToPcm, libraryPaths, rateLabel, readMusicLibrary, renderClip, sourceSampleRate, type ClipCalibration } from './music-library.ts';

const root = path.resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: { out: { type: 'string', default: 'output/music-pack' }, library: { type: 'string' } } });
const out = path.resolve(root, values.out!);
const paths = values.library ? { output: path.resolve(values.library), reportPath: '', indexPath: path.join(path.resolve(values.library), 'library-index.json') } : libraryPaths(root);

const warnings: string[] = [];
const library = await readMusicLibrary(paths, { warn: message => warnings.push(message) });
const tracks: MusicTrack[] = [];
const sources = new Map<string, string>();
for (const entry of library.values()) {
  if (!entry.track) continue;
  tracks.push({ ...entry.track, audioFormat: 'flac', clipVersion: CLIP_VERSION });
  sources.set(entry.id, entry.source);
}
for (const warning of warnings) console.warn(`skip: ${warning}`);
if (!tracks.length) {
  console.error(`No playable tracks in ${paths.indexPath}. Analyse the library first (tools/music-probe/README.md).`);
  process.exit(1);
}

await assertRubberband();
const calibrations = new Map<number, ClipCalibration>();
await rm(out, { recursive: true, force: true });
let bytes = 0, clips = 0;
for (const track of tracks) {
  const source = sources.get(track.id)!;
  const sampleRate = await sourceSampleRate(source);
  if (!calibrations.has(sampleRate)) {
    const calibration = await calibrateClipShifts(sampleRate, track.rates);
    calibrations.set(sampleRate, calibration);
    for (const [rate, { mean, max }] of calibration.residualMs) console.log(`calibration ${sampleRate} Hz ×${rateLabel(rate)}: shift ${(calibration.shifts.get(rate)! * 1000).toFixed(2)} ms, after mean ${mean.toFixed(2)} ms max ${max.toFixed(2)} ms`);
  }
  const { shifts } = calibrations.get(sampleRate)!;
  for (const section of track.sections) {
    for (const rate of track.rates) {
      const shift = shifts.get(rate);
      if (shift === undefined) throw new Error(`${track.id}: no calibration for ×${rateLabel(rate)}`);
      const [flac, wav] = await Promise.all([renderClip(source, track, section.id, rate, 'flac', shift), renderClip(source, track, section.id, rate, 'pcm', shift)]);
      const [fromFlac, fromWav] = await Promise.all([decodeToPcm(flac, 'flac'), decodeToPcm(wav, 'wav')]);
      if (!fromFlac.equals(fromWav)) throw new Error(`${track.id} ${section.id} ×${rateLabel(rate)}: FLAC differs from WAV (${fromFlac.length} vs ${fromWav.length} bytes)`);
      const file = path.join(out, musicClipPath(track, section.id, rate));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, flac);
      bytes += flac.length;
      clips += 1;
    }
  }
  console.log(`${track.id} (${track.danceId}${track.level ? ` · ${track.level}` : ''}): ${track.sections.length} sections × ${track.rates.length} rates`);
}
const catalog: MusicPackCatalog = { schemaVersion: MUSIC_PACK_SCHEMA_VERSION, tracks };
await writeFile(path.join(out, MUSIC_CATALOG_FILE), `${JSON.stringify(catalog)}\n`);
console.log(`music pack: ${tracks.length} tracks, ${clips} clips, ${(bytes / 1024 / 1024).toFixed(1)} MB → ${path.relative(root, out)}`);
