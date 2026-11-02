import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { MusicTrack } from '../../src/app/music/model.ts';
import { MUSIC_CATALOG_FILE, musicClipPath, musicPackFiles, parseMusicPackCatalog } from '../../src/app/music/pack.ts';
import { musicAvailable } from '../../src/app/platform/music.ts';
import { checkMusicPack } from '../../tools/music-pack-check.ts';
import { CLIP_VERSION, clipFfmpegArgs, clipFilter, rateLabel } from '../../tools/music-library.ts';

// 公開用の音楽の一式（docs/app-store/RELEASE-PLAN.md §1-2）
const track: MusicTrack = {
  id: 'waltz-moon-steps', revision: '0123456789abcdef-bars-v2-0123456789ab', title: 'Moon Steps', danceId: 'waltz', counts: '123', beatsPerBar: 3, anchorTick: 0,
  beatsMs: Array.from({ length: 40 }, (_, index) => index * 700), rates: [.8, 1, 1.1],
  sections: [{ id: 'early', startTick: 0, endTick: 18 * 960, anchorTick: 0 }, { id: 'middle', startTick: 18 * 960, endTick: 36 * 960, anchorTick: 18 * 960 }],
  preview: true, audioFormat: 'flac', clipVersion: 'rb1'
};
const catalog = { schemaVersion: 1, tracks: [track] };

test('a clip path carries the track and clip versions so a replaced track or a fixed cut never hits an old cache', () => {
  assert.equal(musicClipPath(track, 'early', .8), 'music/waltz-moon-steps/0123456789abcdef-bars-v2-0123456789ab/rb1/early-0.8.flac');
  assert.equal(musicClipPath(track, 'middle', 1), 'music/waltz-moon-steps/0123456789abcdef-bars-v2-0123456789ab/rb1/middle-1.flac');
  assert.notEqual(musicClipPath({ ...track, clipVersion: 'rb2' }, 'early', 1), musicClipPath(track, 'early', 1));
  assert.match(CLIP_VERSION, /^[a-z0-9-]+$/);
  assert.throws(() => parseMusicPackCatalog({ schemaVersion: 1, tracks: [{ ...track, clipVersion: undefined }] }), /clip version/);
  assert.equal(musicPackFiles([track]).length, 2 * 3);
  for (const rate of track.rates) assert.ok(musicClipPath(track, 'early', rate).endsWith(`early-${rateLabel(rate)}.flac`), 'tool and app write the rate the same way');
  assert.throws(() => musicClipPath({ ...track, id: '../x' }, 'early', 1));
  assert.throws(() => musicClipPath({ ...track, audioFormat: undefined }, 'early', 1));
});

test('the catalog is checked before any track is offered', () => {
  assert.deepEqual(parseMusicPackCatalog(catalog).map(item => item.id), ['waltz-moon-steps']);
  assert.throws(() => parseMusicPackCatalog({ ...catalog, schemaVersion: 2 }));
  assert.throws(() => parseMusicPackCatalog({ schemaVersion: 1, tracks: [track, track] }), /Duplicate/);
  assert.throws(() => parseMusicPackCatalog({ schemaVersion: 1, tracks: [{ ...track, audioFormat: 'mp3' }] }), /format/);
  assert.throws(() => parseMusicPackCatalog({ schemaVersion: 1, tracks: [{ ...track, sections: [{ id: 'early', startTick: 0, endTick: 999 * 960 }] }] }));
});

test('music stays hidden in a build without a pack (Node has no Vite flags)', () => {
  assert.equal(musicAvailable(), false);
});

test('the clip is cut from the analysed beat times with the same filter for every format', () => {
  const pcm = clipFfmpegArgs('in.wav', track, 'middle', 1.1, 'pcm', -.002);
  const flac = clipFfmpegArgs('in.wav', track, 'middle', 1.1, 'flac', -.002);
  const filter = (args: string[]) => args[args.indexOf('-af') + 1];
  assert.equal(filter(pcm), filter(flac));
  // 区間の 1 秒前から読み（12.6 − 1）、rubberband で速さを変え、1 秒 ÷ 速さ＋打ち消しの分を捨てる。atempo は使わない（頭を 1024 サンプル落とす）
  assert.match(filter(pcm)!, /atrim=start=11.6:end=25.7,.*rubberband=tempo=1.1:.*atrim=start=0.90709/);
  assert.doesNotMatch(filter(pcm)!, /atempo/);
  assert.ok(flac.includes('flac') && pcm.includes('pcm_s16le'));
});

test('a section at the very start of the song is padded in front instead of reading before 0 s', () => {
  assert.match(clipFilter(.4, 8.4, 1, 0), /atrim=start=0:end=8.9,asetpts=PTS-STARTPTS,adelay=600(\.\d+)?:all=1,rubberband/);
  assert.doesNotMatch(clipFilter(3, 11, 1, 0), /adelay/);
});

async function distWith(files: Record<string, string>): Promise<{ dist: string; files: string[] }> {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-music-pack-'));
  for (const [file, body] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(dist, file)), { recursive: true });
    await fs.writeFile(path.join(dist, file), body);
  }
  return { dist, files: Object.keys(files) };
}

test('check-dist requires a complete pack for a release and rejects leftovers', async () => {
  assert.deepEqual((await checkMusicPack({ ...(await distWith({})), required: false })).problems, []);
  assert.match((await checkMusicPack({ ...(await distWith({})), required: true })).problems.join(), /missing music-catalog.json/);
  const complete = Object.fromEntries([[MUSIC_CATALOG_FILE, JSON.stringify(catalog)], ...musicPackFiles([track]).map(file => [file, 'x'])]);
  const ok = await checkMusicPack({ ...(await distWith(complete)), required: true });
  assert.deepEqual(ok.problems, []);
  assert.match(ok.summary, /1 tracks 6 clips/);
  const missing = { ...complete };
  delete missing[musicPackFiles([track])[0]!];
  assert.match((await checkMusicPack({ ...(await distWith(missing)), required: true })).problems.join(), /dist has no such file/);
  assert.match((await checkMusicPack({ ...(await distWith({ ...complete, 'music/old/x.flac': 'x' })), required: true })).problems.join(), /must not ship music\/old/);
  const trial = { schemaVersion: 1, tracks: [{ ...track, id: 'paper-umbrella' }] };
  assert.match((await checkMusicPack({ ...(await distWith({ [MUSIC_CATALOG_FILE]: JSON.stringify(trial) })), required: true })).problems.join(), /trial track/);
});

// 実際の ffmpeg で、切り出しの時刻が拍に合うことを確かめる（2026-11-02: atempo は頭を 1024 サンプル落とし、拍より約 21〜23ms 早く鳴っていた）。
// ffmpeg（rubberband 入り）が無い環境では、音楽の一式も作れないので、ここも走らせない（理由を出す）。
const { execFileSync } = await import('node:child_process');
let ffmpegFilters = '';
try { ffmpegFilters = execFileSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }); } catch { /* ffmpeg が無い */ }
test('the cut lands on the beat at every speed after calibration (real ffmpeg)', { skip: /\brubberband\b/.test(ffmpegFilters) ? false : 'ffmpeg with rubberband is not installed' }, async () => {
  const { calibrateClipShifts, CLIP_MEAN_TOLERANCE_MS, CLIP_MAX_TOLERANCE_MS } = await import('../../tools/music-library.ts');
  for (const sampleRate of [44100, 48000]) {
    const calibration = await calibrateClipShifts(sampleRate, [.8, 1, 1.1]);
    for (const [rate, { mean, max }] of calibration.residualMs) {
      assert.ok(Math.abs(mean) <= CLIP_MEAN_TOLERANCE_MS && max <= CLIP_MAX_TOLERANCE_MS, `${sampleRate} Hz ×${rate}: mean ${mean} max ${max}`);
    }
  }
});
