import test from 'node:test';
import assert from 'node:assert/strict';
import { MIME_TYPES, RecorderError, TAKE_MS, pickMimeType, recordTake, recorderErrorKind, recorderSupported, requestMicrophone } from '../../src/app/platform/recorder.ts';
import { playBuffer, withRecordingSession } from '../../src/app/platform/audio-context.ts';

test('1.5 s takes and the legacy mime order (Ruling 57-1)', () => {
  assert.equal(TAKE_MS, 1500);
  assert.deepEqual(MIME_TYPES, ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']);
  assert.equal(pickMimeType(type => type === 'audio/mp4'), 'audio/mp4', 'iOS Safari');
  assert.equal(pickMimeType(() => true), 'audio/webm;codecs=opus', 'Chrome');
  assert.equal(pickMimeType(() => false), undefined, 'browser default');
  assert.equal(pickMimeType(() => { throw new Error('x'); }), undefined);
});

test('getUserMedia failures map to denied or failed (Ruling 57-1)', () => {
  assert.equal(recorderErrorKind({ name: 'NotAllowedError' }), 'denied');
  assert.equal(recorderErrorKind({ name: 'SecurityError' }), 'denied');
  for (const name of ['NotFoundError', 'NotReadableError', 'InvalidStateError', 'AbortError']) assert.equal(recorderErrorKind({ name }), 'failed', name);
  assert.equal(recorderErrorKind(new RecorderError('unsupported')), 'unsupported');
  assert.equal(recorderErrorKind('boom'), 'failed');
});

test('without MediaRecorder (Node) recording is unsupported, not a crash', async () => {
  assert.equal(recorderSupported(), false);
  await assert.rejects(recordTake(), (error: unknown) => error instanceof RecorderError && error.kind === 'unsupported');
  await assert.rejects(requestMicrophone(), (error: unknown) => error instanceof RecorderError && error.kind === 'unsupported');
});

test('the audio session is play-and-record only while recording, and goes back even on failure (Ruling 57-4)', async () => {
  const session = { type: 'playback' };
  Object.defineProperty(globalThis.navigator, 'audioSession', { value: session, configurable: true });
  try {
    let seen = '';
    await withRecordingSession(async () => { seen = session.type; });
    assert.equal(seen, 'play-and-record');
    assert.equal(session.type, 'playback');
    await assert.rejects(withRecordingSession(async () => { throw new Error('denied'); }));
    assert.equal(session.type, 'playback');
    await assert.rejects(withRecordingSession(() => { throw new Error('sync'); }));
    assert.equal(session.type, 'playback');
  } finally {
    delete (globalThis.navigator as { audioSession?: unknown }).audioSession;
  }
});

// --- 録音の開始・作成の失敗（Task 4 レビュー I-1・M-1）。Node に偽の MediaRecorder と mediaDevices を一時的に生やす。
type FakeOptions = { throwOnStart?: boolean; throwWithMimeType?: boolean };

function installFakeRecorder({ throwOnStart = false, throwWithMimeType = false }: FakeOptions) {
  const log = { tracksStopped: 0, constructed: [] as Array<string | undefined> };
  const stream = { getTracks: () => [{ stop: () => { log.tracksStopped += 1; } }] };
  class FakeMediaRecorder {
    static isTypeSupported(type: string) { return type === 'audio/mp4'; }
    state = 'inactive';
    mimeType: string;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onerror: (() => void) | null = null;
    onstop: (() => void) | null = null;
    constructor(_stream: unknown, options?: { mimeType?: string }) {
      log.constructed.push(options?.mimeType);
      if (options?.mimeType && throwWithMimeType) throw new Error('NotSupportedError');
      this.mimeType = options?.mimeType ?? 'audio/x-default';
    }
    start() {
      if (throwOnStart) throw Object.assign(new Error('start'), { name: 'InvalidStateError' });
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob([new Uint8Array(8)]) });
      this.onstop?.();
    }
  }
  const g = globalThis as { MediaRecorder?: unknown };
  Object.defineProperty(globalThis.navigator, 'mediaDevices', { value: { getUserMedia: async () => stream }, configurable: true });
  g.MediaRecorder = FakeMediaRecorder;
  return {
    log,
    restore() {
      delete g.MediaRecorder;
      delete (globalThis.navigator as { mediaDevices?: unknown }).mediaDevices;
    },
  };
}

test('if MediaRecorder.start() throws, the take fails as "failed" and the mic is closed (review I-1)', async () => {
  const fake = installFakeRecorder({ throwOnStart: true });
  try {
    assert.equal(recorderSupported(), true);
    let started = false;
    await assert.rejects(recordTake({ ms: 10, onStart: () => { started = true; } }), (error: unknown) => error instanceof RecorderError && error.kind === 'failed');
    assert.equal(started, false);
    assert.equal(fake.log.tracksStopped, 1);
  } finally {
    fake.restore();
  }
});

test('if the chosen mime type cannot be used, it retries once with the browser default (review M-1)', async () => {
  const fake = installFakeRecorder({ throwWithMimeType: true });
  try {
    const take = await recordTake({ ms: 10 });
    assert.deepEqual(fake.log.constructed, ['audio/mp4', undefined]);
    assert.equal(take.mimeType, 'audio/x-default');
    assert.ok(take.blob.size > 0);
    assert.equal(fake.log.tracksStopped, 1);
  } finally {
    fake.restore();
  }
});

test('playBuffer still reports the end when the sound cannot start (review M-4)', async () => {
  let ended = 0;
  const source = { buffer: null as unknown, onended: null as (() => void) | null, connect() {}, start() { throw new Error('closed'); }, stop() {} };
  const audio = { destination: {}, createBufferSource: () => source } as unknown as AudioContext;
  const stop = playBuffer(audio, {} as AudioBuffer, () => { ended += 1; });
  assert.equal(ended, 0, 'reported after the caller has the stop function');
  await Promise.resolve();
  assert.equal(ended, 1);
  stop();
  source.onended?.();
  assert.equal(ended, 1, 'only once');
});
