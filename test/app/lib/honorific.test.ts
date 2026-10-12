// D49: 名前が「先生」（OQ6: 「さん」「様」も）で終わる時は「さん」を付けない（「山田先生さんの声」を出さない）。英語は打った名前のまま。
import test from 'node:test';
import assert from 'node:assert/strict';
import { honorific } from '../../../src/app/lib/honorific.ts';
import { createAppTranslator } from '../../../src/app/i18n/index.ts';

test('Japanese adds さん, except after a name that already ends with 先生', () => {
  assert.equal(honorific('山田', 'ja-JP'), '山田さん');
  assert.equal(honorific('山田先生', 'ja-JP'), '山田先生');
  assert.equal(honorific('Smith', 'ja-JP'), 'Smithさん');
  assert.equal(honorific('先生の先輩', 'ja-JP'), '先生の先輩さん', 'only the end of the name counts');
  assert.equal(honorific('山田さん', 'ja-JP'), '山田さん', 'no さんさん (Fable OQ6)');
  assert.equal(honorific('山田様', 'ja-JP'), '山田様', 'no 様さん (Fable OQ6)');
});

test('English keeps the name as typed', () => {
  assert.equal(honorific('Yamada-sensei', 'en'), 'Yamada-sensei');
  assert.equal(honorific('山田先生', 'en'), '山田先生');
});

test('the six keys read naturally with both forms (D49)', () => {
  const ja = createAppTranslator('ja-JP');
  const name = (value: string) => honorific(value, 'ja-JP');
  assert.equal(ja.t('distributorVoice', { name: name('山田') }), '山田さんの声');
  assert.equal(ja.t('distributorVoice', { name: name('山田先生') }), '山田先生の声');
  assert.equal(ja.t('receivedFrom', { name: name('山田先生') }), '山田先生から');
  assert.equal(ja.t('madeBy', { dance: 'ワルツ', name: name('山田') }), 'ワルツ · 山田さんが作成');
  assert.equal(ja.t('fileVoiceFrom', { name: name('山田先生'), language: '日本語', count: 12 }), '山田先生の声（日本語）· 12 語');
  assert.equal(ja.t('replaceVoiceFrom', { name: name('山田') }), '山田さんの声はすでにあります。「使う」で新しい方に置き換わります。');
  assert.equal(ja.t('receivedVoiceFrom', { name: name('山田先生') }), 'ホームで種目を選んで ▶ を押すと、山田先生の声で鳴ります。');
  assert.equal(createAppTranslator('en').t('distributorVoice', { name: honorific('Yamada-sensei', 'en') }), "Yamada-sensei's voice");
});
