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
