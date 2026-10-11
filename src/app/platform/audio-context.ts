// iOS 対策（仕様 §9・Ruling 6）はこの面に閉じる。AudioContext はアプリに1つだけ（前回カードのタップで解除し、
// 遷移先の S2 でそのまま使うため）。
let context: AudioContext | null = null;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };
type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

// 起動時に1回。マナーモードでも鳴らすための設定（WebKit の案内。実機確認が必須）。無い端末では何もしない。
export function configureAudioSession(): void {
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (!session) return;
  try { session.type = 'playback'; } catch { /* 古い実装は書き込み不可 */ }
}

// ▶（と前回カード）のクリック処理の中で、await より前に同期で呼ぶこと。
// AudioContext の生成・resume()・無音バッファ1回の再生で、iOS の音声ロックを外す。
export function unlockAudioInsideTap(): AudioContext {
  if (!context || context.state === 'closed') {
    const Context = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Context) throw new Error('Web Audio is not available');
    context = new Context();
  }
  context.resume().catch(() => { /* 2秒判定で拾う */ });
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 1, context.sampleRate);
  source.connect(context.destination);
  source.start(0);
  return context;
}

export function onAudioStateChange(audio: AudioContext, listener: (state: string) => void): () => void {
  const handler = () => listener(audio.state);
  audio.addEventListener('statechange', handler);
  return () => audio.removeEventListener('statechange', handler);
}

// Bluetooth の遅れ（Safari 18.4 以降・Chrome）。画面のハイライトにだけ足す（Ruling 29）。
// 取れない・数でない・負なら 0、0.5 秒を超える値は信用せず 0。
export const MAX_DISPLAY_LATENCY_SECONDS = 0.5;

export function outputLatencySeconds(audio: AudioContext): number {
  const value = (audio as AudioContext & { outputLatency?: number }).outputLatency;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_DISPLAY_LATENCY_SECONDS ? value : 0;
}

// 録音の間だけ音声セッションを「録音＋再生」にし、終わったら「再生」に戻す（Ruling 57-4）。
// 2026-10-12 実測（Playwright WebKit 26.5）: 'playback' のままの getUserMedia は即座に
// InvalidStateError「AudioSession category is not compatible with audio capture.」で落ちる＝この切り替えは必須。
// run は同期で呼ぶ（getUserMedia をタップの処理の中・最初の await より前に発行するため）。無い端末では何もしない。
export function withRecordingSession<T>(run: () => Promise<T>): Promise<T> {
  const session = (navigator as AudioSessionNavigator).audioSession;
  const set = (type: string) => { if (session) { try { session.type = type; } catch { /* 古い実装は書き込み不可 */ } } };
  set('play-and-record');
  let pending: Promise<T>;
  try {
    pending = run();
  } catch (error) {
    set('playback');
    return Promise.reject(error);
  }
  return pending.finally(() => set('playback'));
}

// 1 つの音を 1 回鳴らす（S8 の「聞く」。new Audio は使わない＝境界テスト）。戻り値で止める。鳴り終わり・止めた時に onEnded。
export function playBuffer(audio: AudioContext, buffer: AudioBuffer, onEnded: () => void): () => void {
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(audio.destination);
  let ended = false;
  source.onended = () => { if (!ended) { ended = true; onEnded(); } };
  source.start();
  return () => {
    if (ended) return;
    ended = true;
    try { source.stop(); } catch { /* もう止まっている */ }
    onEnded();
  };
}
