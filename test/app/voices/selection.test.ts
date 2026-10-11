import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryStorage } from '../helpers/memory-storage.ts';
import { packFixture } from '../helpers/voice-fixtures.ts';
import { createAppTranslator } from '../../../src/app/i18n/index.ts';
import { saveVoicePack } from '../../../src/app/voices/store.ts';
import {
  DEFAULT_VOICE, chooseVoice, forgetVoiceSettings, packSelection, resolveVoiceSelection, standardSelection, voiceDisplayName, wordOffsetsFor
} from '../../../src/app/voices/selection.ts';

test('a standard id resolves without touching the device', async () => {
  assert.deepEqual(standardSelection('default-en-female-v1'), { kind: 'standard', id: 'default-en-female-v1', locale: 'en' });
  assert.equal(standardSelection('user-recorded-v1'), null);
  assert.equal(standardSelection('default-ja-female-v1'), null, 'not in standard-voices.json until stage 6c');
  assert.deepEqual(await resolveVoiceSelection(null, 'default-en-female-v1'), DEFAULT_VOICE);
});

test('a complete recorded voice resolves to its pack; missing, partial or broken falls back to English silently (Ruling 61-2)', async () => {
  const { storage } = memoryStorage();
  await saveVoicePack(storage, packFixture('en', 12));
  await saveVoicePack(storage, packFixture('ja-JP', 7));
  const complete = await resolveVoiceSelection(storage, 'user-recorded-v1');
  assert.equal(complete.kind, 'pack');
  assert.equal(complete.kind === 'pack' && complete.pack.words.ah !== undefined, true);
  assert.deepEqual(await resolveVoiceSelection(storage, 'user-recorded-ja-v1'), DEFAULT_VOICE, 'partial');
  assert.deepEqual(await resolveVoiceSelection(storage, 'v-gone'), DEFAULT_VOICE, 'deleted');
  assert.deepEqual(await resolveVoiceSelection(storage, 'default-ja-female-v1'), DEFAULT_VOICE, 'Japanese standard before stage 6c');
  assert.deepEqual(await resolveVoiceSelection(memoryStorage({}, { failReads: true }).storage, 'user-recorded-v1'), DEFAULT_VOICE);
});

test('choosing writes the id and the derived voice language together (Ruling 60-3)', () => {
  assert.deepEqual(chooseVoice(DEFAULT_VOICE), { selectedVoiceId: 'default-en-female-v1', voiceLocale: 'en' });
  assert.deepEqual(chooseVoice(packSelection(packFixture('ja-JP', 12))), { selectedVoiceId: 'user-recorded-ja-v1', voiceLocale: 'ja-JP' });
});

test('deleting the selected voice goes back to English and forgets its offset (Ruling 60-4)', () => {
  const settings = { selectedVoiceId: 'user-recorded-v1', voiceOffsetMsByVoiceId: { 'user-recorded-v1': 20, 'default-en-female-v1': -10 } };
  assert.deepEqual(forgetVoiceSettings(settings, 'user-recorded-v1'), {
    voiceOffsetMsByVoiceId: { 'default-en-female-v1': -10 }, selectedVoiceId: 'default-en-female-v1', voiceLocale: 'en'
  });
  assert.deepEqual(forgetVoiceSettings(settings, 'v-other'), { voiceOffsetMsByVoiceId: settings.voiceOffsetMsByVoiceId });
});

test('names: standard long and short forms, recorded name, received from the distributor (Ruling 60-1・61-5)', () => {
  const ja = createAppTranslator('ja-JP');
  const en = createAppTranslator('en');
  assert.equal(voiceDisplayName(ja, DEFAULT_VOICE, 'row'), '標準の声（英語）');
  assert.equal(voiceDisplayName(ja, DEFAULT_VOICE, 'chip'), '標準（英語）');
  assert.equal(voiceDisplayName(ja, { kind: 'standard', id: 'default-ja-female-v1', locale: 'ja-JP' }, 'row'), '標準の声（日本語）');
  assert.equal(voiceDisplayName(en, DEFAULT_VOICE, 'chip'), 'Standard (English)');
  const mine = packSelection(packFixture('en', 12));
  assert.equal(voiceDisplayName(ja, mine, 'chip'), '自分の声（英語）');
  const received = packSelection({ ...packFixture('ja-JP', 12, { name: '山田の声' }), id: 'v-r', origin: 'received', distributor: { name: '山田' } });
  assert.equal(voiceDisplayName(ja, received, 'row'), '山田さんの声');
  assert.equal(voiceDisplayName(en, received, 'chip'), "山田's voice");
});

test('per-word offsets only come from a pack', () => {
  assert.deepEqual(wordOffsetsFor(DEFAULT_VOICE), {});
  const pack = { ...packFixture('en', 12), timingAdjustments: { globalOffsetMs: 10, wordOffsetsMs: { slow: 15 }, adjustedAt: 'x' } };
  assert.deepEqual(wordOffsetsFor(packSelection(pack)), { slow: 15 });
});
