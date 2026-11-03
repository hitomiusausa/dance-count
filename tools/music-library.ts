// 制作側の曲の台帳（output/music-probe/）を読み、練習用の音源を ffmpeg で切り出す。開発サーバー（music-dev-plugin.ts）と
// 公開用の音楽の一式（music-pack.ts）の両方がここを使う＝曲の選び方と切り出し方の正本は 1 つ（docs/app-store/RELEASE-PLAN.md §1-2）。
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { levelFromFilename, type MusicTrack } from '../src/app/music/model.ts';
import { buildMusicPreviewTrack, type PreviewDefinition } from './music-preview-track.ts';

const run = promisify(execFile);

export interface LocalEntry { id: string; title: string; label: string; danceId: string; source: string; stamp: number; analysis: any; track: MusicTrack | null }
export interface LibraryPaths { output: string; reportPath: string; indexPath: string }
export const TRIAL_TRACK_ID = 'paper-umbrella';   // 前の試作曲。開発の試聴だけ（公開の一式には入れない）
export const MUSIC_DANCES = ['waltz', 'rumba', 'chacha', 'tango', 'samba'] as const;
export const MUSIC_SAMPLE_RATE = 48000;

export function libraryPaths(root: string): LibraryPaths {
  const output = path.join(root, 'output/music-probe');
  return { output, reportPath: path.join(output, 'bar-analysis.json'), indexPath: path.join(output, 'library-index.json') };
}

// 台帳の曲を全部読む。原本と解析の指紋が合わない曲は落とし、小節が取れない曲は track: null で残す（warn で知らせる）。
export async function readMusicLibrary(paths: LibraryPaths, options: { trialSource?: string; warn: (message: string) => void }): Promise<Map<string, LocalEntry>> {
  const next = new Map<string, LocalEntry>();
  async function add(id: string, title: string, label: string, danceId: string, file: string, reportFile: string, definition?: PreviewDefinition, expectedHash?: string) {
    try {
      if (!/^[a-z0-9-]+$/.test(id)) throw Error('Invalid id');
      const analysis = JSON.parse(await readFile(reportFile, 'utf8'));
      const hash = createHash('sha256').update(await readFile(file)).digest('hex');
      if (hash !== analysis.sourceSha256 || (expectedHash && hash !== expectedHash)) throw Error('Source differs from analysis');
      const entry: LocalEntry = { id, title, label, danceId, source: file, stamp: (await stat(file)).mtimeMs, analysis, track: null };
      next.set(id, entry);
      try { entry.track = buildMusicPreviewTrack(hash, analysis, definition); } catch { options.warn(`Sample ${id} needs bar review before count playback.`); }
    } catch { options.warn(`Sample ${id} needs a matching local source and bar analysis.`); }
  }
  if (options.trialSource) await add(TRIAL_TRACK_ID, 'Paper Umbrella', '前の試作曲', 'rumba', options.trialSource, paths.reportPath);
  try {
    const index = JSON.parse(await readFile(paths.indexPath, 'utf8'));
    if (index.schemaVersion !== 1 || !Array.isArray(index.tracks) || index.tracks.length > 29) throw Error('Invalid library');
    for (const item of index.tracks) {
      if (!(MUSIC_DANCES as readonly string[]).includes(item.danceId) || !/^local-inputs\/[a-f0-9]{64}\.(mp3|wav|flac|ogg)$/.test(item.sourcePath) || !/^library\/[a-f0-9]{16}\/bar-analysis\.json$/.test(item.analysisPath)) continue;
      await add(item.id, item.title, item.label, item.danceId, path.join(paths.output, item.sourcePath), path.join(paths.output, item.analysisPath),
        { id: item.id, title: item.title, danceId: item.danceId, level: levelFromFilename(String(item.filenameAtSnapshot ?? '')) }, item.sourceSha256);
    }
  } catch { /* A library is optional until the creator prepares the samples. */ }
  return next;
}

// 速さの書き方（URL・ファイル名）。0.8 → "0.8"、1 → "1"、1.1 → "1.1"
export function rateLabel(rate: number): string {
  return String(rate);
}

// ---- 切り出し（2026-11-02 に atempo から rubberband へ。docs/app-store/RELEASE-PLAN.md §1-3） ----
// 以前の atempo は、速さ 1 倍でも曲の頭から 1024 サンプル（44.1kHz で 23.2ms）を落とし、2 拍目から後ろが拍より約 21〜23ms 早く鳴っていた。
// 0.8 倍では拍ごとに −30〜−9ms ばらついた（クリック音で実測）。rubberband（拍の頭を守る設定）に替え、
// 区間の 1 秒前から読んで立ち上がりを捨て、残る一定のずれはクリック音で測って打ち消す（calibrateClipShifts）。
// 作り方を変えたら CLIP_VERSION を上げる＝保存した音源（開発の app-clips・公開の music/）の名前が変わり、古い音源が当たらない。
export const CLIP_VERSION = 'rb1';
const PRE_ROLL_SECONDS = 1;
const POST_ROLL_SECONDS = 0.5;
const STRETCH = 'transients=crisp:detector=percussive:window=short';
// 打ち消した後のずれの許容（クリック音での実測。2026-11-02 Linux の ffmpeg 6.1: 平均 0.5ms 以内・最大 2.7ms）
export const CLIP_MEAN_TOLERANCE_MS = 1;
export const CLIP_MAX_TOLERANCE_MS = 4;

export function clipRange(track: MusicTrack, sectionId: string, rate: number): { from: number; end: number; duration: number } {
  const section = track.sections.find(item => item.id === sectionId);
  if (!section) throw new Error(`Unknown section ${sectionId}`);
  if (!track.rates.includes(rate)) throw new Error(`Unknown rate ${rate}`);
  const from = track.beatsMs[section.startTick / 960]! / 1000, end = track.beatsMs[section.endTick / 960]! / 1000;
  return { from, end, duration: (end - from) / rate };
}

// from〜end（秒）を速さ rate で、出力の 0 秒が from の拍になるように切る。shift は calibrateClipShifts が測った打ち消しの量（秒）
export function clipFilter(from: number, end: number, rate: number, shift: number): string {
  const duration = (end - from) / rate, readFrom = Math.max(0, from - PRE_ROLL_SECONDS), lead = PRE_ROLL_SECONDS - (from - readFrom);
  return [
    `aresample=${MUSIC_SAMPLE_RATE}`, 'asetpts=PTS-STARTPTS', `atrim=start=${readFrom}:end=${end + POST_ROLL_SECONDS}`, 'asetpts=PTS-STARTPTS',
    ...(lead > 0 ? [`adelay=${lead * 1000}:all=1`] : []),   // 曲の頭から 1 秒以内の区間は、足りない分を無音で前に足す
    `rubberband=tempo=${rate}:${STRETCH}`, `atrim=start=${PRE_ROLL_SECONDS / rate + shift}`, 'asetpts=PTS-STARTPTS',
    `apad=whole_dur=${duration}`, `atrim=duration=${duration}`
  ].join(',');
}

export function clipFfmpegArgs(source: string, track: MusicTrack, sectionId: string, rate: number, codec: 'pcm' | 'flac', shift: number): string[] {
  const { from, end } = clipRange(track, sectionId, rate);
  const output = codec === 'flac' ? ['-c:a', 'flac', '-sample_fmt', 's16', '-f', 'flac'] : ['-c:a', 'pcm_s16le', '-f', 'wav'];
  return ['-v', 'error', '-i', source, '-af', clipFilter(from, end, rate, shift), '-ar', String(MUSIC_SAMPLE_RATE), ...output, '-'];
}

export async function renderClip(source: string, track: MusicTrack, sectionId: string, rate: number, codec: 'pcm' | 'flac', shift: number): Promise<Buffer> {
  const result = await run('ffmpeg', clipFfmpegArgs(source, track, sectionId, rate, codec, shift), { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  return result.stdout;
}

// stdin に音を渡して ffmpeg を走らせる。ffmpeg が先に終わった時（引数の誤りなど）は、書き込みの EPIPE ではなく ffmpeg のエラーの文で失敗させる
function ffmpegWithInput(args: string[], input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = execFile('ffmpeg', args, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) =>
      (error ? reject(new Error(`ffmpeg failed: ${String(stderr).trim() || error.message}`)) : resolve(stdout as unknown as Buffer)));
    child.stdin?.on('error', () => { /* 終了の理由は上のコールバックが stderr で知らせる */ });
    child.stdin?.end(input);
  });
}

// 音の中身（16bit の生の値）だけを取り出す。FLAC を作り直した物が、WAV と 1 サンプルも違わないことを比べるのに使う
export function decodeToPcm(bytes: Buffer, inputFormat: 'flac' | 'wav'): Promise<Buffer> {
  return ffmpegWithInput(['-v', 'error', '-f', inputFormat, '-i', 'pipe:0', '-f', 's16le', '-c:a', 'pcm_s16le', '-'], bytes);
}

export async function sourceSampleRate(source: string): Promise<number> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', source]);
  const rate = Number(String(stdout).trim());
  if (!Number.isInteger(rate) || rate <= 0) throw new Error(`Cannot read the sample rate of ${source}`);
  return rate;
}

export async function assertRubberband(): Promise<void> {
  const { stdout } = await run('ffmpeg', ['-hide_banner', '-filters']);
  if (!/\brubberband\b/.test(String(stdout))) throw new Error('ffmpeg has no rubberband filter. Install an ffmpeg built with librubberband (Homebrew: brew install ffmpeg).');
}

// クリック音（0.5 秒ごと）を曲と同じサンプリング周波数で作り、同じ切り出しを通して、クリックが届く時刻のずれを測る
const CLICK_PERIOD = 0.5, CLICK_SECONDS = 12, CLICK_FROM = 3, CLICK_SPAN = 8;
async function measureClickErrors(sampleRate: number, rate: number, shift: number): Promise<number[]> {
  const samples = new Int16Array(Math.round(sampleRate * CLICK_SECONDS));
  const times: number[] = [];
  for (let t = 0.5; t < CLICK_SECONDS - 0.5; t += CLICK_PERIOD) {
    const at = Math.round(t * sampleRate);
    times.push(at / sampleRate);
    for (let j = 0; j < 16; j++) samples[at + j] = j % 2 === 0 ? 20000 : -20000;
  }
  const from = times.find(t => t >= CLICK_FROM)!, end = from + CLICK_SPAN;
  const raw = await ffmpegWithInput(['-v', 'error', '-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
    '-af', clipFilter(from, end, rate, shift), '-ar', String(MUSIC_SAMPLE_RATE), '-f', 's16le', '-'], Buffer.from(samples.buffer));
  const out = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
  return times.filter(t => t >= from && t < end).map(t => {
    const expected = (t - from) / rate, center = Math.round(expected * MUSIC_SAMPLE_RATE), window = Math.round(0.06 * MUSIC_SAMPLE_RATE);
    for (let i = Math.max(0, center - window); i < Math.min(out.length, center + window); i++) if (Math.abs(out[i]!) > 3000) return (i / MUSIC_SAMPLE_RATE - expected) * 1000;
    throw new Error(`Calibration click at ${expected.toFixed(3)} s is missing (rate ${rate}, ${sampleRate} Hz)`);
  });
}

export interface ClipCalibration { sampleRate: number; shifts: Map<number, number>; residualMs: Map<number, { mean: number; max: number }> }
// 速さごとの打ち消しの量（秒）を測り、打ち消した後にもう一度測って許容を超えたら止める（ずれた音源を作らない）
export async function calibrateClipShifts(sampleRate: number, rates: number[]): Promise<ClipCalibration> {
  const shifts = new Map<number, number>(), residualMs = new Map<number, { mean: number; max: number }>();
  for (const rate of rates) {
    const raw = await measureClickErrors(sampleRate, rate, 0);
    const shift = raw.reduce((a, b) => a + b, 0) / raw.length / 1000;
    const after = await measureClickErrors(sampleRate, rate, shift);
    const mean = after.reduce((a, b) => a + b, 0) / after.length, max = Math.max(...after.map(Math.abs));
    if (Math.abs(mean) > CLIP_MEAN_TOLERANCE_MS || max > CLIP_MAX_TOLERANCE_MS) {
      throw new Error(`Clip timing is off after calibration (${sampleRate} Hz ×${rate}: mean ${mean.toFixed(2)} ms, max ${max.toFixed(2)} ms)`);
    }
    shifts.set(rate, shift);
    residualMs.set(rate, { mean, max });
  }
  return { sampleRate, shifts, residualMs };
}
