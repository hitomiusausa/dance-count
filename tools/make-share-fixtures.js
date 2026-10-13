#!/usr/bin/env node
// 段5の検査用の配布ファイル（Ruling 87-3）を test/fixtures/share/ に作る。アプリの buildBundle・エンジンの exportRecordedVoicePack を
// そのまま使う（形を手で書かない）。時刻は固定なので何度作っても同じバイト列。public/ には置かない（check-dist の外）。
//   bundle-voice-routine.dancecount.txt … 山田・日本語の声（12 語・各 0.3 秒の合成音）＋ワルツ 2 本（ui:check の S10・smoke:share）
//   bundle-voice-one-routine.dancecount.txt … 山田・日本語の声＋ワルツ 1 本（夜間便 B-2: 主ボタンが「ルーティンを鳴らす」）
//   bundle-routines-only.dancecount.txt … 山田・ワルツ 1 本（声なし）
//   bundle-voice-only.dancecount.txt … 山田・日本語の声だけ（ルーティンなし。ui:check の「S10 受け取った・声だけ」＝Fable 答え 2026-10-13 §2-2）
//   bundle-one-broken-routine.dancecount.txt … 山田・ワルツ 1 本＋読めないルーティン「こわれたルーティン」1 本
//   legacy-voice-pack.json … 旧画面の単体パック（dance-count-recorded-voice-pack・英語・名前「My recorded voice」）
//   broken.txt … 途中で切れた JSON／too-new.txt … schemaVersion 2 の束
// 使い方: node tools/make-share-fixtures.js
import fs from 'node:fs';
import path from 'node:path';
import { exportRecordedVoicePack } from '../src/engine/recorded-voice-pack.js';
import { buildBundle } from '../src/app/share/bundle.ts';
import { encodeMonoWav, fakeVoiceSamples, SAMPLE_RATE } from './make-fake-mic-wav.js';

const AT = '2026-10-12T09:00:00.000Z';
const KEYS = ['slow', 'quick', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'and', 'ah'];
const WORD_SECONDS = 0.3;

function voicePack(id, name, locale) {
  // 偽マイクの声（0.3 秒の無音 → 220Hz）の頭 0.3 秒ぶんを使わず、声の部分から 0.3 秒を切り出す（頭 40ms）
  const voice = fakeVoiceSamples();
  const start = Math.round(SAMPLE_RATE * 0.26);
  const samples = voice.slice(start, start + Math.round(SAMPLE_RATE * WORD_SECONDS));
  const wav = encodeMonoWav(samples);
  const words = Object.fromEntries(KEYS.map(key => [key, {
    blob: new Blob([wav], { type: 'audio/wav' }), mimeType: 'audio/wav', onsetMs: 40, sourceOnsetMs: 300, durationMs: WORD_SECONDS * 1000, normalized: true, gainDb: 0
  }]));
  return { schemaVersion: 1, type: 'dance-count-recorded-voice-pack', id, name, locale, vocabularyId: locale, updatedAt: AT, words, origin: 'recorded' };
}

function waltz(id, name, minute) {
  const createdAt = AT.replace('09:00', `09:${String(minute).padStart(2, '0')}`);
  return {
    id, danceId: 'waltz', name, bpm: null, countInBars: 2, source: 'user-created', status: 'ready',
    figures: [{ id: `f-${id.slice(2)}-1`, name: 'ナチュラルターン', counts: '123' }, { id: `f-${id.slice(2)}-2`, name: 'ウィスク', counts: '123' }],
    provenance: { sourceKind: 'user-created', authority: null, authorityClaimStatus: 'not-applicable', reviewStatus: 'unreviewed' },
    createdWith: { app: 'dance-count', version: 'fixture' }, createdAt, updatedAt: createdAt
  };
}

async function exported(pack) {
  const voice = JSON.parse(await exportRecordedVoicePack(pack));
  voice.exportedAt = AT;
  return voice;
}

const dir = path.resolve(import.meta.dirname, '../test/fixtures/share');
fs.mkdirSync(dir, { recursive: true });
const write = (name, text) => fs.writeFileSync(path.join(dir, name), text);
const japanese = await exported(voicePack('user-recorded-ja-v1', '自分の声（日本語）', 'ja-JP'));
const routines = [waltz('r-fixture-0001', 'ワルツのルーティン', 1), waltz('r-fixture-0002', 'タンゴ前のワルツ', 2)];

write('bundle-voice-routine.dancecount.txt', buildBundle({ distributorName: '山田', voice: japanese, routines, now: AT }));
write('bundle-voice-one-routine.dancecount.txt', buildBundle({ distributorName: '山田', voice: japanese, routines: routines.slice(0, 1), now: AT }));   // 夜間便 B-2
write('bundle-voice-only.dancecount.txt', buildBundle({ distributorName: '山田', voice: japanese, routines: [], now: AT }));
write('bundle-routines-only.dancecount.txt', buildBundle({ distributorName: '山田', voice: null, routines: routines.slice(0, 1), now: AT }));
const oneBroken = JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines: routines.slice(0, 1), now: AT }));
oneBroken.routines.push({ ...waltz('r-fixture-0003', 'こわれたルーティン', 3), figures: [{ id: 'f-fixture-0003-1', name: 'x', counts: '12a3' }] });
write('bundle-one-broken-routine.dancecount.txt', JSON.stringify(oneBroken));
const legacy = JSON.parse(await exportRecordedVoicePack(voicePack('user-recorded-v1', 'My recorded voice', 'en')));
legacy.exportedAt = AT;
delete legacy.origin;   // 旧画面の書き出しには origin が無い
write('legacy-voice-pack.json', JSON.stringify(legacy, null, 2));
write('broken.txt', '{"type":"x"');
write('too-new.txt', JSON.stringify({ ...JSON.parse(buildBundle({ distributorName: '山田', voice: null, routines: routines.slice(0, 1), now: AT })), schemaVersion: 2 }));
console.log(`wrote ${fs.readdirSync(dir).length} files to ${dir}`);
