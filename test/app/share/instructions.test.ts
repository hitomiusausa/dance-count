import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppTranslator } from '../../../src/app/i18n/index.ts';
import { studentInstructions } from '../../../src/app/share/instructions.ts';
import { requestShareIntent, takeShareIntent } from '../../../src/app/state/share-intent.ts';

const ja = createAppTranslator('ja-JP');
const en = createAppTranslator('en');

test('the Japanese instructions are the spec §8 text with the stage-7 Android line (share_target) and the app URL opened outside LINE (Ruling 82-6)', () => {
  assert.equal(studentInstructions(ja, { hasVoice: true, appUrl: 'https://count.dancemap.jp/' }), [
    'Dance Count で、私の声のカウントを使えます。',
    '【iPhone】',   // 夜間便 A-6: 見出しの後で改行
    '1. このファイルを開き、右上の共有ボタン →「"ファイル"に保存」',
    '2. Dance Count を開き「使う」→ 下の「ルーティン」→「ファイルから受け取る」→「ファイルを選ぶ」',   // D56（Ruling 115-7）: 声あり・ルーティンだけとも同じ 1 通り
    '3. 「最近使った項目」からこのファイルを選び「使う」',
    '【Android】',
    'このファイルを開き、共有 →「Dance Count」→「使う」（「Dance Count」が出てこない時は、保存してから 2・3 の手順で「ファイルを選ぶ」）',
    '（スマホで受け取るのが便利です）',
    'アプリ: https://count.dancemap.jp/?openExternalBrowser=1'
  ].join('\n'));
});

test('English mirrors it; routines-only files change the first line; no URL means no app line (spec §16-1)', () => {
  const text = studentInstructions(en, { hasVoice: false, appUrl: '' });
  const lines = text.split('\n');
  assert.equal(lines[0], 'You can use my routines in Dance Count.');
  assert.deepEqual(lines.slice(1, 3), ['[iPhone]', '1. Open this file, tap Share (top right) → “Save to Files”']);
  assert.deepEqual(lines.slice(5, 7), ['[Android]', 'Open this file, tap Share → “Dance Count” → “Use” (if “Dance Count” is not listed, save the file and follow steps 2–3 to “Choose a file”)']);
  assert.equal(lines[3], '2. Open Dance Count → “Use” → “Routines” (bottom tab) → “Receive from a file” → “Choose a file”');
  assert.equal(lines.length, 8);
  assert.equal(studentInstructions(ja, { hasVoice: false, appUrl: '' }).split('\n')[3], studentInstructions(ja, { hasVoice: true, appUrl: '' }).split('\n')[3], 'step 2 is the same for routines-only files (D56)');
  assert.ok(!text.includes('App:'));
  assert.equal(studentInstructions(ja, { hasVoice: false, appUrl: '' }).split('\n')[0], 'Dance Count で、私のルーティンを使えます。');
  assert.equal(studentInstructions(en, { hasVoice: true, appUrl: 'not a url' }).split('\n').length, 8);
});

test('the share mark is taken once (Ruling 82-1)', () => {
  assert.equal(takeShareIntent(), null);
  requestShareIntent({ voiceId: 'user-recorded-v1' });
  assert.deepEqual(takeShareIntent(), { voiceId: 'user-recorded-v1' });
  assert.equal(takeShareIntent(), null);
  requestShareIntent({ routineId: 'r-11111111' });
  requestShareIntent({ voiceId: 'user-recorded-ja-v1' });
  assert.deepEqual(takeShareIntent(), { voiceId: 'user-recorded-ja-v1' }, 'the newest mark wins');
});
