import { withRecordingSession } from './audio-context.ts';

// 録音の面（仕様 §7・Ruling 15・57）。getUserMedia・MediaRecorder はここだけ（test/app/platform-boundary.test.ts）。
// 1 回の呼び出しでマイクを開き、1.5 秒録り、必ず閉じる（マイクを開いたままにしない＝iOS の音声セッションの罠と
// 「録っていない間もマイクの印が点く」不安を消す。Ruling 57-4）。呼ぶのはタップの処理の中・最初の await より前（Ruling 8）。
export const TAKE_MS = 1500;                 // 仕様 §4 S8「1.5 秒だけ録音」
const STOP_GRACE_MS = 3000;                  // stop の後 'stop' が来ない時に諦めるまで
// legacy/voice-recorder.html と同じ順（iOS は audio/mp4、Chrome は webm/opus。2026-10-12 実測: macOS の Chrome・Playwright WebKit とも先頭が通る）
export const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'] as const;
const CONSTRAINTS: MediaStreamConstraints = { audio: true, video: false };   // OS の既定のまま（Ruling 57-5）

export type RecorderUnavailable = 'unsupported' | 'denied' | 'failed';

export class RecorderError extends Error {
  readonly kind: RecorderUnavailable;
  constructor(kind: RecorderUnavailable) {
    super(`recorder ${kind}`);
    this.name = 'RecorderError';
    this.kind = kind;
  }
}

export interface WordRecording { blob: Blob; mimeType: string }

export function recorderSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function' && typeof MediaRecorder !== 'undefined';
}

// 安全でない接続（http の LAN の IP など）で開いている（D53）。iOS は navigator.mediaDevices ごと隠すので、録音できない理由は
// ブラウザではなく接続。S8 の非対応の枠の文を「https で開くと録音できます」に替えるためだけに使う。
export function recorderNeedsHttps(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === false;
}

// 録れる形の最初の 1 つ。どれも無ければ undefined（＝ブラウザ既定）。
export function pickMimeType(isSupported: (type: string) => boolean = type => MediaRecorder.isTypeSupported(type)): string | undefined {
  return MIME_TYPES.find(type => { try { return isSupported(type); } catch { return false; } });
}

// getUserMedia の失敗の分け方（Ruling 57-1）。拒否は 'denied'、それ以外（マイクが無い・使用中・音声セッション）は 'failed'。
export function recorderErrorKind(error: unknown): RecorderUnavailable {
  if (error instanceof RecorderError) return error.kind;
  const name = typeof error === 'object' && error !== null ? (error as { name?: unknown }).name : undefined;
  return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed';
}

// S8 ステップ0「録音をはじめる」: 許可だけを取って、すぐ閉じる（Ruling 57-2）。
export function requestMicrophone(): Promise<void> {
  if (!recorderSupported()) return Promise.reject(new RecorderError('unsupported'));
  return withRecordingSession(async () => {
    const stream = await openMicrophone();
    stopStream(stream);
  });
}

// 1 語を録る: 開く → 録音開始（onStart）→ ms 後に止める → 閉じる。timeslice は使わない（iOS の MP4 を 1 つの Blob で受ける）。
// signal で途中でやめる（S8 を離れた・語を移った）: すぐ止めてマイクを閉じ、音声セッションを戻して 'failed' で終わる（結果は呼び出し側が捨てる）。
export function recordTake({ ms = TAKE_MS, onStart, signal }: { ms?: number; onStart?: () => void; signal?: AbortSignal } = {}): Promise<WordRecording> {
  if (!recorderSupported()) return Promise.reject(new RecorderError('unsupported'));
  if (signal?.aborted) return Promise.reject(new RecorderError('failed'));
  return withRecordingSession(async () => {
    const stream = await openMicrophone();
    try {
      if (signal?.aborted) throw new RecorderError('failed');   // 許可を待つ間に離れた
      return await capture(stream, ms, onStart, signal);
    } finally {
      stopStream(stream);
    }
  });
}

async function openMicrophone(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
  } catch (error) {
    throw new RecorderError(recorderErrorKind(error));
  }
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

function capture(stream: MediaStream, ms: number, onStart?: () => void, signal?: AbortSignal): Promise<WordRecording> {
  return new Promise((resolve, reject) => {
    const created = createRecorder(stream);
    if (!created) {
      reject(new RecorderError('failed'));
      return;
    }
    const { recorder, mimeType } = created;
    const chunks: Blob[] = [];
    let settled = false;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    let giveUpTimer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => {
      finish(new RecorderError('failed'));
      try { if (recorder.state !== 'inactive') recorder.stop(); } catch { /* もう止まっている */ }
    };
    const finish = (outcome: WordRecording | RecorderError) => {
      if (settled) return;
      settled = true;
      clearTimeout(stopTimer);
      clearTimeout(giveUpTimer);
      signal?.removeEventListener('abort', onAbort);
      if (outcome instanceof RecorderError) reject(outcome);
      else resolve(outcome);
    };
    signal?.addEventListener('abort', onAbort);
    recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
    recorder.onerror = () => finish(new RecorderError('failed'));
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || chunks[0]?.type || '';
      const blob = new Blob(chunks, type ? { type } : undefined);
      finish(blob.size > 0 ? { blob, mimeType: type } : new RecorderError('failed'));
    };
    try {
      recorder.start();
    } catch {
      finish(new RecorderError('failed'));   // 呼び出し側（recordTake の finally）がトラックを止める
      return;
    }
    onStart?.();
    stopTimer = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, ms);
    giveUpTimer = setTimeout(() => finish(new RecorderError('failed')), ms + STOP_GRACE_MS);
  });
}

// 選んだ形で作れなければ、1 回だけブラウザ既定（形を指定しない）で作り直す。それも駄目なら null。
function createRecorder(stream: MediaStream): { recorder: MediaRecorder; mimeType?: string } | null {
  const mimeType = pickMimeType();
  if (mimeType) {
    try { return { recorder: new MediaRecorder(stream, { mimeType }), mimeType }; } catch { /* 既定で作り直す */ }
  }
  try { return { recorder: new MediaRecorder(stream) }; } catch { return null; }
}
