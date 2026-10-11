// 回帰の固定（Ruling 66-1）: 英パック 12 本を今の rms-auto-v1 で測り直すと manifest の onsetMs と完全一致する。
// rms-auto-v1 のパラメータや parsePcm16Wav を誰かが変えたらここで落ちる。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { measureVoicePack } from '../../../tools/measure-voice-onsets.js';
import { REQUIRED_VOICE_KEYS } from '../../../src/engine/recorded-voice-pack.js';

const englishPack = path.resolve(import.meta.dirname, '../../../public/audio/default-en-female-v1');
// manifest の現物（2026-07-12 実測）。裁定本文の slow=25 は誤記で、現物は 30。
const EXPECTED = { slow: 30, quick: 45, one: 35, two: 45, three: 50, four: 80, five: 70, six: 40, seven: 40, eight: 25, and: 35, ah: 25 };

test('English pack onsets re-measure exactly to the committed manifest values', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-onset-'));
  try {
    await fs.cp(englishPack, dir, { recursive: true });
    const committed = JSON.parse(await fs.readFile(path.join(englishPack, 'manifest.json'), 'utf8'));
    assert.deepEqual(Object.keys(committed.words), [...REQUIRED_VOICE_KEYS]);
    for (const key of REQUIRED_VOICE_KEYS) assert.equal(committed.words[key].onsetMs, EXPECTED[key], `manifest ${key}`);
    const { measurements } = await measureVoicePack(dir);
    for (const key of REQUIRED_VOICE_KEYS) assert.equal(measurements[key].onsetMs, EXPECTED[key], `measured ${key}`);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
