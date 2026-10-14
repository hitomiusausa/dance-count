import { figureRangeTicks } from '../../engine/practice-range.js';
import { compileRhythm, compileRoutine } from '../../engine/rhythm-compiler.js';
import type { TrackProfile } from '../../engine/tempo-map.js';
import { wordOffsetsFor, type VoiceSelection } from '../voices/selection.ts';
import type { StripEvent, StripProgram } from './beat-indicator.ts';

// 再生セッション（S2）。音・WakeLock・2秒判定・中断の検知をまとめ、画面には SessionView だけを渡す。
// 端末に触る処理は deps で受け取る（本物は practice/session-deps.ts、テストは偽物）。
export const SOUND_CHECK_DELAY_MS = 2000;

interface CommonOptions {
  danceId: string;
  bpm: number;                 // 必ず数値（practice/speed.ts の resolveBpm・routine-preferences.ts を通す）
  metronome: boolean;
  countInBars: 0 | 1 | 2;      // S2 のオンは 2（D17）。1 はルーティンの「1小節」（Ruling 40）
  loop: boolean;
  barCounting?: boolean;       // D72 小節を数える（画面が barCountingAvailable で絞って渡す。省略＝オフ）
  track: TrackProfile | null;  // 曲の席（Ruling 20）。v1 は常に null
  voice: VoiceSelection;       // 鳴らす声（画面が voices/use-playback-voice.ts で解いた物。Ruling 61-3）
  voiceOffsetMs: number;       // 声のタイミング（practice/voice-offset.ts の voiceOffsetFor。Ruling 62）
}
// 鳴らす声とその声のタイミングの組（選んだ録音の声を端末から読み終える前に ▶ が押された時、play に Promise で渡す）
export type VoiceChoice = Pick<CommonOptions, 'voice' | 'voiceOffsetMs'>;
export interface FigureLike { id: string; name: string; counts: string }

// 2つの形（Ruling 40）。counts＝S2 のカウントの型。routine＝S4 の試聴・S5（range はフィガーの番号、0 始まり・両端を含む）。
export type PracticeOptions =
  | (CommonOptions & { kind: 'counts'; counts: string })
  | (CommonOptions & { kind: 'routine'; figures: readonly FigureLike[]; range?: { startIndex: number; endIndex: number } });

export interface CompiledProgram { compiled: unknown; rangeStartTick?: number; rangeEndTick?: number }

// エンジンに渡した compiled を、画面の帯（D55・Ruling 114-5）に見せる形にする（写すだけ。第 2 のコンパイルはしない）
export function programView(compiled: unknown): StripProgram {
  const source = compiled as { events: readonly StripEvent[]; figures?: readonly { startTick: number; endTick: number }[]; durationTicks: number };
  return {
    events: source.events,
    ...(source.figures ? { figures: source.figures.map(({ startTick, endTick }) => ({ startTick, endTick })) } : {}),
    endTick: source.durationTicks
  };
}

// カウントをエンジンに渡す形にする。範囲は小節の位相を保つため、ルーティン全体をコンパイルしてから切り出す。
export function compileProgram(options: PracticeOptions): CompiledProgram {
  if (options.kind === 'counts') return { compiled: compileRhythm({ danceId: options.danceId, counts: options.counts }) };
  const compiled = compileRoutine({ danceId: options.danceId, figures: options.figures });
  if (!options.range) return { compiled };
  const { startTick, endTick } = figureRangeTicks(compiled, options.range);
  return { compiled, rangeStartTick: startTick, rangeEndTick: endTick };
}

// [data-alert] の枠に出すもの（Ruling 30）。優先順位: no-sound ＞ stopped・voice-missing ＞ wake-tip。
export type SessionNotice = 'none' | 'no-sound' | 'stopped' | 'voice-missing' | 'wake-tip';

export interface SessionView {
  playing: boolean;
  starting: boolean;
  countIn: boolean;
  voiceKey: string | null;     // 鳴っている語（表示は lib/count-display.ts）
  originalTick: number | null;
  figureIndex: number | null;  // 鳴っているフィガー（ルーティンの時だけ。はじめの合図の間は null）
  leadTick: number | null;     // 夜間便 B-5: はじめの合図の間だけ、最初の語までの tick（負の数。帯の丸を灰で 1 語ずつ進める＝beat-indicator.ts leadStripView。数字は出さない＝Ruling 28）
  notice: SessionNotice;
  program: StripProgram | null; // 鳴らしている型（エンジンに渡した compiled の写し。止まっている間は null。D55・Ruling 114-5）
  bar: number | null;          // D72: 小節を数えている時だけ、今の小節の番号（1〜8。エンジンの同じ frame から）。合図の間・オフの時は null
}

export interface AudioLike { state: string; currentTime: number }

export interface EngineFrame {
  playing: boolean;
  event?: { voiceKey?: string | null; figureIndex?: number } | null;
  countIn?: boolean;
  originalTick?: number | null;
  leadTick?: number | null;    // はじめの合図の間だけ。最初の語までの tick＝負の数（エンジンの同じ frame。夜間便 B-5）
  bar?: number;                // D72: 小節を数えている時だけ
}

export interface EngineLike {
  start(options: Record<string, unknown>): number;
  stop(): void;
  setVoicePack(voicePack: unknown): void;   // 同じ AudioContext ではエンジンを使い回すので、声は毎回これで替える（Ruling 61-3）
}

export interface WakeLockLike { release(): Promise<void> }

export interface SessionDeps<A extends AudioLike, V> {
  unlock(): A;                                                              // クリック処理の中で同期
  loadVoice(audio: A, voice: VoiceSelection): Promise<V>;
  createEngine(audio: A, voicePack: V, onFrame: (frame: EngineFrame) => void): EngineLike;
  keepScreenOn(): Promise<WakeLockLike | null>;                             // クリック処理の中で同期に発行
  onStateChange(audio: A, listener: (state: string) => void): () => void;
  setTimer(callback: () => void, ms: number): () => void;                  // 戻り値で取り消し
}

export interface SessionHints {
  wakeTipAlreadyShown(): boolean;
  markWakeTipShown(): void;
  // 初めて鳴った印（S1 の「ホーム画面に追加」カードの条件。段7・Ruling 92-7。lastDanceId は S2 を開いただけで立つので使わない）
  firstPlaybackDone(): boolean;
  markFirstPlayback(): void;
}

export const IDLE_VIEW: SessionView = Object.freeze({
  playing: false, starting: false, countIn: false, voiceKey: null, originalTick: null, figureIndex: null, leadTick: null, notice: 'none', program: null, bar: null
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
  private halting = false;     // halt() の engine.stop() が返す playing:false を「自然な終わり」と取り違えない

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
  // pendingVoice: 選んだ声がまだ解けていない時の解決。解けるのを待ってその声で鳴らす。失敗した時だけ options の声（標準）で鳴らす（Ruling 61-2）。
  play(options: PracticeOptions, pendingVoice?: Promise<VoiceChoice>): Promise<void> {
    if (options.track !== null) throw new Error('Playing with a track is not supported in v1');
    if (typeof options.bpm !== 'number' || !Number.isFinite(options.bpm)) throw new TypeError('bpm must be a finite number');
    this.halt();
    const generation = ++this.generation;
    const audio = this.deps.unlock();
    this.attach(audio);
    const wakeLockRequest = this.deps.keepScreenOn();
    this.update({ ...IDLE_VIEW, starting: true });
    return this.begin(generation, audio, options, wakeLockRequest, pendingVoice);
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

  private async begin(generation: number, audio: A, options: PracticeOptions, wakeLockRequest: Promise<WakeLockLike | null>, pendingVoice?: Promise<VoiceChoice>) {
    const lockPromise = wakeLockRequest.catch(() => null);
    if (pendingVoice) {
      try { options = { ...options, ...(await pendingVoice) }; } catch { /* 解けなかった時だけ options の声（標準）のまま */ }
      if (generation !== this.generation) {
        void lockPromise.then(lock => lock?.release());
        return;
      }
    }
    let voicePack: V;
    try {
      voicePack = await this.deps.loadVoice(audio, options.voice);
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
    let program: StripProgram;
    try {
      this.engine ??= this.deps.createEngine(audio, voicePack, frame => this.onFrame(frame));
      this.engine.setVoicePack(voicePack);
      const compiled = compileProgram(options);
      program = programView(compiled.compiled);
      this.engine.start({
        ...compiled,
        bpm: options.bpm,
        loop: options.loop,
        metronome: options.metronome,
        countInBars: options.countInBars,
        voiceOffsetMs: options.voiceOffsetMs,
        wordOffsetsMs: wordOffsetsFor(options.voice),
        barCounting: options.barCounting === true
      });
    } catch {
      void lockPromise.then(lock => lock?.release());
      if (generation === this.generation) this.update({ ...IDLE_VIEW, notice: 'stopped' });
      return;
    }
    this.update({ ...IDLE_VIEW, playing: true, countIn: options.countInBars > 0, program });
    if (!this.hints.firstPlaybackDone()) this.hints.markFirstPlayback();
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
    if (!frame.playing) {
      // 繰り返しオフでエンジンが最後まで鳴らして自分で止まった。■ と同じ後始末をする。
      if (this.view.playing && !this.halting) this.stop();
      return;
    }
    if (!this.view.playing) return;
    const countIn = frame.countIn === true;
    this.update({
      ...this.view,
      countIn,
      voiceKey: countIn ? null : frame.event?.voiceKey ?? null,
      originalTick: countIn ? null : frame.originalTick ?? null,
      figureIndex: countIn ? null : frame.event?.figureIndex ?? null,
      leadTick: countIn ? frame.leadTick ?? null : null,
      bar: countIn ? null : frame.bar ?? null
    });
  }

  private halt() {
    this.halting = true;
    try {
      this.engine?.stop();
    } finally {
      this.halting = false;
    }
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
