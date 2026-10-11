import test from 'node:test';
import assert from 'node:assert/strict';
import { PracticeSession, SOUND_CHECK_DELAY_MS, type EngineFrame, type PracticeOptions, type SessionView } from '../../../src/app/practice/session.ts';
import { DEFAULT_VOICE, packSelection, type VoiceSelection } from '../../../src/app/voices/selection.ts';
import { packFixture } from '../helpers/voice-fixtures.ts';

// 偽の端末: AudioContext・エンジン・WakeLock・タイマーを手で進める。
function harness({ wakeLock = true, voiceFails = false, tipShown = false, startThrows = false, lockHangs = false, stopEmitsFrame = false } = {}) {
  const audio = { state: 'running', currentTime: 0 };
  const calls: string[] = [];
  const timers: Array<{ at: number; run: () => void; cancelled: boolean }> = [];
  let now = 0;
  let stateListener: ((state: string) => void) | null = null;
  let onFrame: ((frame: EngineFrame) => void) | null = null;
  const starts: Array<Record<string, unknown>> = [];
  const voices: VoiceSelection[] = [];
  const packsSet: unknown[] = [];
  let tip = tipShown;
  let releases = 0;
  const session = new PracticeSession({
    unlock() { calls.push('unlock'); return audio; },
    async loadVoice(_audio, voice) { calls.push('loadVoice'); voices.push(voice); if (voiceFails) throw new Error('offline'); return { words: new Map(), id: voice.id }; },
    createEngine(_audio, _voice, frame) {
      calls.push('createEngine');
      onFrame = frame;
      return { setVoicePack(pack) { packsSet.push(pack); }, start(options) { if (startThrows) throw new Error('boom'); starts.push(options); return 0; }, stop() { calls.push('engine.stop'); if (stopEmitsFrame) onFrame?.({ playing: false }); } };
    },
    keepScreenOn() { calls.push('keepScreenOn'); if (lockHangs) return new Promise<null>(() => {}); return Promise.resolve(wakeLock ? { async release() { releases += 1; } } : null); },
    onStateChange(_audio, listener) { stateListener = listener; return () => { stateListener = null; }; },
    setTimer(run, ms) { const timer = { at: now + ms, run, cancelled: false }; timers.push(timer); return () => { timer.cancelled = true; }; }
  }, { wakeTipAlreadyShown: () => tip, markWakeTipShown: () => { tip = true; } });
  const views: SessionView[] = [];
  session.subscribe(view => views.push(view));
  return {
    session, audio, calls, starts, views, voices, packsSet,
    get tip() { return tip; },
    get releases() { return releases; },
    frame: (frame: EngineFrame) => onFrame?.(frame),
    setState(state: string) { audio.state = state; stateListener?.(state); },
    advance(ms: number) {
      now += ms;
      audio.currentTime += audio.state === 'running' ? ms / 1000 : 0;
      for (const timer of timers.filter(item => !item.cancelled && item.at <= now)) { timer.cancelled = true; timer.run(); }
    }
  };
}

const WALTZ: PracticeOptions = { kind: 'counts', danceId: 'waltz', counts: '123', bpm: 84, metronome: true, countInBars: 1, loop: true, track: null, voice: DEFAULT_VOICE, voiceOffsetMs: 0 };

test('unlock and the wake lock request happen synchronously inside play() (iOS tap rule)', () => {
  const h = harness();
  void h.session.play(WALTZ);
  assert.deepEqual(h.calls.slice(0, 2), ['unlock', 'keepScreenOn']);
  assert.equal(h.session.current.starting, true);
});

test('play starts the engine with numeric bpm and the chosen options', async () => {
  const h = harness();
  await h.session.play({ ...WALTZ, counts: '12&3', bpm: 90, metronome: false, countInBars: 0, loop: false });
  assert.equal(h.starts.length, 1);
  const options = h.starts[0]!;
  assert.equal(options.bpm, 90);
  assert.equal(options.metronome, false);
  assert.equal(options.countInBars, 0);
  assert.equal(options.loop, false);
  assert.equal((options.compiled as { events: unknown[] }).events.length, 4);
  assert.equal(h.session.current.playing, true);
});

test('a string or non-finite bpm and a track are refused before any sound', () => {
  const h = harness();
  assert.throws(() => h.session.play({ ...WALTZ, bpm: '84' as unknown as number }), TypeError);
  assert.throws(() => h.session.play({ ...WALTZ, bpm: Number.NaN }), TypeError);
  assert.throws(() => h.session.play({ ...WALTZ, track: {} as never }), /not supported/);
  assert.deepEqual(h.calls, []);
});

test('frames show the voice key and tick; lead-in shows neither', async () => {
  const h = harness();
  await h.session.play(WALTZ);
  h.frame({ playing: true, countIn: true, event: null, originalTick: null });
  assert.equal(h.session.current.countIn, true);
  assert.equal(h.session.current.voiceKey, null);
  h.frame({ playing: true, countIn: false, event: { voiceKey: 'two' }, originalTick: 1000 });
  assert.deepEqual([h.session.current.countIn, h.session.current.voiceKey, h.session.current.originalTick], [false, 'two', 1000]);
});

test('no sound after 2 seconds shows the banner (context never ran)', async () => {
  const h = harness();
  h.audio.state = 'suspended';
  await h.session.play(WALTZ);
  h.advance(SOUND_CHECK_DELAY_MS - 1);
  assert.equal(h.session.current.notice, 'none');
  h.advance(1);
  assert.equal(h.session.current.notice, 'no-sound');
});

test('sound running for 2 seconds shows no banner; pressing ▶ again clears an old banner', async () => {
  const h = harness();
  h.audio.state = 'suspended';
  await h.session.play(WALTZ);
  h.advance(SOUND_CHECK_DELAY_MS);
  assert.equal(h.session.current.notice, 'no-sound');
  h.audio.state = 'running';
  await h.session.play(WALTZ);
  assert.equal(h.session.current.notice, 'none');
  h.advance(SOUND_CHECK_DELAY_MS);
  assert.equal(h.session.current.notice, 'none');
});

test('stopping before 2 seconds cancels the check', async () => {
  const h = harness();
  h.audio.state = 'suspended';
  await h.session.play(WALTZ);
  h.session.stop();
  h.advance(SOUND_CHECK_DELAY_MS * 2);
  assert.equal(h.session.current.notice, 'none');
});

test('an interruption while playing stops, releases the wake lock and says so; no auto-resume', async () => {
  const h = harness();
  await h.session.play(WALTZ);
  h.setState('interrupted');
  assert.equal(h.session.current.playing, false);
  assert.equal(h.session.current.notice, 'stopped');
  assert.ok(h.calls.includes('engine.stop'));
  assert.equal(h.releases, 1);
  h.setState('running');
  assert.equal(h.session.current.playing, false);
  assert.equal(h.starts.length, 1);
});

test('a suspend while stopped is ignored', () => {
  const h = harness();
  void h.session.play(WALTZ);
  h.session.stop();
  h.setState('suspended');
  assert.equal(h.session.current.notice, 'none');
});

test('dispose (leaving the screen) stops the engine and releases the wake lock', async () => {
  const h = harness();
  await h.session.play(WALTZ);
  h.session.dispose();
  assert.ok(h.calls.includes('engine.stop'));
  assert.equal(h.releases, 1);
});

test('the wake-lock tip shows once, only after sound is confirmed, and marks the hint', async () => {
  const h = harness({ wakeLock: false });
  await h.session.play(WALTZ);
  assert.equal(h.session.current.notice, 'none');
  h.advance(SOUND_CHECK_DELAY_MS);
  assert.equal(h.session.current.notice, 'wake-tip');
  assert.equal(h.tip, true);
  h.session.dismissNotice();
  await h.session.play(WALTZ);
  h.advance(SOUND_CHECK_DELAY_MS);
  assert.equal(h.session.current.notice, 'none');
});

test('the no-sound banner wins over the wake-lock tip, and the tip is kept for next time', async () => {
  const h = harness({ wakeLock: false });
  h.audio.state = 'suspended';
  await h.session.play(WALTZ);
  h.advance(SOUND_CHECK_DELAY_MS);
  assert.equal(h.session.current.notice, 'no-sound');
  assert.equal(h.tip, false);
});

test('a missing voice (offline, not on the device) says so and does not start', async () => {
  const h = harness({ voiceFails: true });
  await h.session.play(WALTZ);
  assert.equal(h.session.current.notice, 'voice-missing');
  assert.equal(h.session.current.playing, false);
  assert.equal(h.starts.length, 0);
  assert.equal(h.releases, 1);
});

test('changing a setting while playing restarts once (stop -> apply -> start)', async () => {
  const h = harness();
  await h.session.play(WALTZ);
  await h.session.play({ ...WALTZ, bpm: 67 });
  assert.equal(h.starts.length, 2);
  assert.equal(h.starts[1]!.bpm, 67);
  assert.equal(h.calls.filter(call => call === 'createEngine').length, 1);
  assert.equal(h.releases, 1);
});

test('a second ▶ while the first is still loading wins; the first never starts', async () => {
  const h = harness();
  const first = h.session.play(WALTZ);
  const second = h.session.play({ ...WALTZ, bpm: 90 });
  await Promise.all([first, second]);
  assert.equal(h.starts.length, 1);
  assert.equal(h.starts[0]!.bpm, 90);
});

test('an engine that throws on start releases the wake lock and ends in a stopped notice', async () => {
  const h = harness({ startThrows: true });
  await h.session.play(WALTZ);
  assert.equal(h.releases, 1);
  assert.equal(h.session.current.starting, false);
  assert.equal(h.session.current.playing, false);
  assert.equal(h.session.current.notice, 'stopped');
});

test('a wake lock request that never settles does not delay the no-sound banner', async () => {
  const h = harness({ lockHangs: true });
  h.audio.state = 'suspended';
  void h.session.play(WALTZ);
  await new Promise(resolve => setImmediate(resolve));
  h.advance(SOUND_CHECK_DELAY_MS);
  assert.equal(h.session.current.notice, 'no-sound');
});

test('the engine ending on its own (repeat off) returns to idle, cancels the 2-second check and releases the wake lock', async () => {
  const h = harness({ stopEmitsFrame: true });
  h.audio.state = 'suspended';
  await h.session.play({ ...WALTZ, loop: false });
  assert.equal(h.session.current.playing, true);
  h.frame({ playing: false });
  assert.equal(h.session.current.playing, false);
  assert.equal(h.session.current.starting, false);
  assert.equal(h.releases, 1);
  h.advance(SOUND_CHECK_DELAY_MS);
  assert.equal(h.session.current.notice, 'none');
  h.frame({ playing: false });
  assert.equal(h.releases, 1);
});

test('a normal stop() with an engine that reports its own stop releases the wake lock exactly once', async () => {
  const h = harness({ stopEmitsFrame: true });
  await h.session.play(WALTZ);
  h.session.stop();
  assert.equal(h.session.current.playing, false);
  await Promise.resolve();
  assert.equal(h.releases, 1);
});

test('pressing ▶ again while playing (engine reports its stop) still starts the new run', async () => {
  const h = harness({ stopEmitsFrame: true });
  await h.session.play(WALTZ);
  await h.session.play({ ...WALTZ, bpm: 90 });
  assert.equal(h.starts.length, 2);
  assert.equal(h.session.current.playing, true);
  await Promise.resolve();
  assert.equal(h.releases, 1);
});

const ROUTINE: PracticeOptions = {
  kind: 'routine', danceId: 'waltz', bpm: 84, metronome: true, countInBars: 2, loop: true, track: null, voice: DEFAULT_VOICE, voiceOffsetMs: 0,
  figures: [
    { id: 'f-00000001', name: 'A', counts: '123' },
    { id: 'f-00000002', name: 'B', counts: '12&3' },
    { id: 'f-00000003', name: 'C', counts: '123123' }
  ]
};

test('a routine plays the whole routine with its lead-in bars (Ruling 40)', async () => {
  const h = harness();
  await h.session.play(ROUTINE);
  const options = h.starts[0]!;
  assert.equal(options.countInBars, 2);
  assert.equal((options.compiled as { durationTicks: number }).durationTicks, 4 * 3 * 960);
  assert.equal(options.rangeStartTick, undefined);
});

test('a range keeps the bar position: it cuts the whole routine at figure boundaries', async () => {
  const h = harness();
  await h.session.play({ ...ROUTINE, range: { startIndex: 1, endIndex: 2 } });
  assert.deepEqual([h.starts[0]!.rangeStartTick, h.starts[0]!.rangeEndTick], [3 * 960, 12 * 960]);
});

test('frames report the sounding figure; the lead-in reports none', async () => {
  const h = harness();
  await h.session.play(ROUTINE);
  h.frame({ playing: true, countIn: true, event: null, originalTick: null });
  assert.equal(h.session.current.figureIndex, null);
  h.frame({ playing: true, countIn: false, event: { voiceKey: 'and', figureIndex: 1 }, originalTick: 4800 });
  assert.equal(h.session.current.figureIndex, 1);
});

test('a routine that does not compile stops with the "stopped" notice instead of throwing', async () => {
  const h = harness();
  await h.session.play({ ...ROUTINE, figures: [{ id: 'f-00000001', name: 'x', counts: '12a3' }] });
  assert.equal(h.session.current.playing, false);
  assert.equal(h.session.current.notice, 'stopped');
});

test('the chosen voice is loaded and set on the reused engine at every play (Ruling 61-3)', async () => {
  const h = harness();
  await h.session.play(WALTZ);
  const mine = packSelection(packFixture('en', 12));
  await h.session.play({ ...WALTZ, voice: mine });
  assert.deepEqual(h.voices.map(voice => voice.id), ['default-en-female-v1', 'user-recorded-v1']);
  assert.equal(h.calls.filter(call => call === 'createEngine').length, 1, 'the engine is reused on the same AudioContext');
  assert.deepEqual(h.packsSet.map(pack => (pack as { id: string }).id), ['default-en-female-v1', 'user-recorded-v1']);
});

test('the voice timing reaches the engine; per-word offsets only from a pack (Ruling 62)', async () => {
  const h = harness();
  await h.session.play({ ...WALTZ, voiceOffsetMs: -20 });
  assert.equal(h.starts[0]!.voiceOffsetMs, -20);
  assert.deepEqual(h.starts[0]!.wordOffsetsMs, {});
  const pack = { ...packFixture('en', 12), timingAdjustments: { globalOffsetMs: 30, wordOffsetsMs: { slow: 15 }, adjustedAt: 'x' } };
  await h.session.play({ ...WALTZ, voice: packSelection(pack), voiceOffsetMs: 30 });
  assert.equal(h.starts[1]!.voiceOffsetMs, 30);
  assert.deepEqual(h.starts[1]!.wordOffsetsMs, { slow: 15 });
});
