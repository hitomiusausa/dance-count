import { compileRhythm } from '../../engine/rhythm-compiler.js';
import type { TrackProfile } from '../../engine/tempo-map.js';

// 再生セッション（S2）。音・WakeLock・2秒判定・中断の検知をまとめ、画面には SessionView だけを渡す。
// 端末に触る処理は deps で受け取る（本物は practice/session-deps.ts、テストは偽物）。
export const SOUND_CHECK_DELAY_MS = 2000;

export interface PracticeOptions {
  danceId: string;
  counts: string;              // カウントの型（templates のどれか）
  bpm: number;                 // 必ず数値（practice/speed.ts の resolveBpm を通す）
  metronome: boolean;
  countInBars: 0 | 1;
  loop: boolean;
  track: TrackProfile | null;  // 曲の席（Ruling 20）。v1 は常に null
}

// [data-alert] の枠に出すもの（Ruling 30）。優先順位: no-sound ＞ stopped・voice-missing ＞ wake-tip。
export type SessionNotice = 'none' | 'no-sound' | 'stopped' | 'voice-missing' | 'wake-tip';

export interface SessionView {
  playing: boolean;
  starting: boolean;
  countIn: boolean;
  voiceKey: string | null;     // 鳴っている語（表示は lib/count-display.ts）
  originalTick: number | null;
  notice: SessionNotice;
}

export interface AudioLike { state: string; currentTime: number }

export interface EngineFrame {
  playing: boolean;
  event?: { voiceKey?: string | null } | null;
  countIn?: boolean;
  originalTick?: number | null;
}

export interface EngineLike {
  start(options: Record<string, unknown>): number;
  stop(): void;
}

export interface WakeLockLike { release(): Promise<void> }

export interface SessionDeps<A extends AudioLike, V> {
  unlock(): A;                                                              // クリック処理の中で同期
  loadVoice(audio: A): Promise<V>;
  createEngine(audio: A, voicePack: V, onFrame: (frame: EngineFrame) => void): EngineLike;
  keepScreenOn(): Promise<WakeLockLike | null>;                             // クリック処理の中で同期に発行
  onStateChange(audio: A, listener: (state: string) => void): () => void;
  setTimer(callback: () => void, ms: number): () => void;                  // 戻り値で取り消し
}

export interface SessionHints {
  wakeTipAlreadyShown(): boolean;
  markWakeTipShown(): void;
}

export const IDLE_VIEW: SessionView = Object.freeze({
  playing: false, starting: false, countIn: false, voiceKey: null, originalTick: null, notice: 'none'
}) as SessionView;

export class PracticeSession<A extends AudioLike, V> {
  private readonly deps: SessionDeps<A, V>;
  private readonly hints: SessionHints;
  private view: SessionView = IDLE_VIEW;
  private readonly listeners = new Set<(view: SessionView) => void>();
  private audio: A | null = null;
  private engine: EngineLike | null = null;
  private wakeLock: WakeLockLike | null = null;
  private cancelSoundCheck: (() => void) | null = null;
  private unsubscribeState: (() => void) | null = null;
  private generation = 0;

  constructor(deps: SessionDeps<A, V>, hints: SessionHints) {
    this.deps = deps;
    this.hints = hints;
  }

  get current(): SessionView { return this.view; }

  subscribe(listener: (view: SessionView) => void): () => void {
    this.listeners.add(listener);
    listener(this.view);
    return () => { this.listeners.delete(listener); };
  }

  // ▶ のクリック処理から同期で呼ぶ。unlock と WakeLock の request は最初の await より前に発行される。
  play(options: PracticeOptions): Promise<void> {
    if (options.track !== null) throw new Error('Playing with a track is not supported in v1');
    if (typeof options.bpm !== 'number' || !Number.isFinite(options.bpm)) throw new TypeError('bpm must be a finite number');
    this.halt();
    const generation = ++this.generation;
    const audio = this.deps.unlock();
    this.attach(audio);
    const wakeLockRequest = this.deps.keepScreenOn();
    this.update({ ...IDLE_VIEW, starting: true });
    return this.begin(generation, audio, options, wakeLockRequest);
  }

  // ■・戻る・画面を離れる。出ている案内はそのまま（no-sound のバナーは次の ▶ で消える）。
  stop(): void {
    this.generation += 1;
    this.halt();
    this.update({ ...IDLE_VIEW, notice: this.view.notice });
  }

  dismissNotice(): void {
    this.update({ ...this.view, notice: 'none' });
  }

  dispose(): void {
    this.stop();
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    this.audio = null;
    this.engine = null;
    this.listeners.clear();
  }

  private async begin(generation: number, audio: A, options: PracticeOptions, wakeLockRequest: Promise<WakeLockLike | null>) {
    const lockPromise = wakeLockRequest.catch(() => null);
    let voicePack: V;
    try {
      voicePack = await this.deps.loadVoice(audio);
    } catch {
      void lockPromise.then(lock => lock?.release());
      if (generation === this.generation) this.update({ ...IDLE_VIEW, notice: 'voice-missing' });
      return;
    }
    if (generation !== this.generation) {
      void lockPromise.then(lock => lock?.release());
      return;
    }
    const startedAt = audio.currentTime;
    try {
      this.engine ??= this.deps.createEngine(audio, voicePack, frame => this.onFrame(frame));
      this.engine.start({
        compiled: compileRhythm({ danceId: options.danceId, counts: options.counts }),
        bpm: options.bpm,
        loop: options.loop,
        metronome: options.metronome,
        countInBars: options.countInBars
      });
    } catch {
      void lockPromise.then(lock => lock?.release());
      if (generation === this.generation) this.update({ ...IDLE_VIEW, notice: 'stopped' });
      return;
    }
    this.update({ ...IDLE_VIEW, playing: true, countIn: options.countInBars > 0 });
    let lockOutcome: 'pending' | 'held' | 'unavailable' = 'pending';
    this.cancelSoundCheck = this.deps.setTimer(() => this.checkSound(generation, audio, startedAt, lockOutcome === 'unavailable'), SOUND_CHECK_DELAY_MS);
    const lock = await lockPromise;
    lockOutcome = lock === null ? 'unavailable' : 'held';
    if (generation !== this.generation) {
      void lock?.release();
      return;
    }
    this.wakeLock = lock;
  }

  // 2秒判定（Ruling 6-2）。鳴っていれば、WakeLock が取れなかった時の案内を1回だけ出す（Ruling 30）。
  private checkSound(generation: number, audio: A, startedAt: number, wakeLockUnavailable: boolean) {
    if (generation !== this.generation || !this.view.playing) return;
    if (audio.state !== 'running' || !(audio.currentTime > startedAt)) {
      this.update({ ...this.view, notice: 'no-sound' });
      return;
    }
    if (wakeLockUnavailable && this.view.notice === 'none' && !this.hints.wakeTipAlreadyShown()) {
      this.hints.markWakeTipShown();
      this.update({ ...this.view, notice: 'wake-tip' });
    }
  }

  // 中断（電話・ロック）。再生中のときだけ止めて1行を出す。running に戻っても自動再開しない（Ruling 30）。
  private attach(audio: A) {
    if (this.audio === audio) return;
    this.unsubscribeState?.();
    this.audio = audio;
    this.engine = null;
    this.unsubscribeState = this.deps.onStateChange(audio, state => {
      if ((state === 'suspended' || state === 'interrupted') && this.view.playing) {
        this.generation += 1;
        this.halt();
        this.update({ ...IDLE_VIEW, notice: this.view.notice === 'no-sound' ? 'no-sound' : 'stopped' });
      }
    });
  }

  private onFrame(frame: EngineFrame) {
    if (!frame.playing || !this.view.playing) return;
    const countIn = frame.countIn === true;
    this.update({
      ...this.view,
      countIn,
      voiceKey: countIn ? null : frame.event?.voiceKey ?? null,
      originalTick: countIn ? null : frame.originalTick ?? null
    });
  }

  private halt() {
    this.engine?.stop();
    this.cancelSoundCheck?.();
    this.cancelSoundCheck = null;
    const lock = this.wakeLock;
    this.wakeLock = null;
    void lock?.release();
  }

  private update(view: SessionView) {
    this.view = view;
    for (const listener of this.listeners) listener(view);
  }
}
