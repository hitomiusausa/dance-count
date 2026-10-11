import test from 'node:test';
import assert from 'node:assert/strict';
import { MIME_TYPES, RecorderError, TAKE_MS, pickMimeType, recordTake, recorderErrorKind, recorderSupported, requestMicrophone } from '../../src/app/platform/recorder.ts';
import { withRecordingSession } from '../../src/app/platform/audio-context.ts';

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
