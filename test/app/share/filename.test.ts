import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_APP_URL, withExternalBrowser } from '../../../src/app/app-url.ts';
import { bundleFileName, cleanReceivedFileName } from '../../../src/app/share/filename.ts';

const NOW = new Date(2026, 9, 12, 23, 30);   // 端末の時計の 2026-10-12（月は 0 始まり）

test('file names follow the screen language and say what is inside (Ruling 80-3・D36)', () => {
  assert.equal(bundleFileName({ locale: 'ja-JP', distributorName: '山田', hasVoice: true, now: NOW }), '声-山田-2026-10-12.dancecount.txt');
  assert.equal(bundleFileName({ locale: 'en', distributorName: 'Yamada', hasVoice: true, now: NOW }), 'voice-Yamada-2026-10-12.dancecount.txt');
  assert.equal(bundleFileName({ locale: 'ja-JP', distributorName: '山田', hasVoice: false, now: NOW }), 'ルーティン-山田-2026-10-12.dancecount.txt');
  assert.equal(bundleFileName({ locale: 'en', distributorName: 'Yamada', hasVoice: false, now: NOW }), 'routines-Yamada-2026-10-12.dancecount.txt');
  assert.equal(bundleFileName({ locale: 'en', distributorName: 'Y', hasVoice: true, now: new Date(2026, 0, 5) }), 'voice-Y-2026-01-05.dancecount.txt');
});

test('characters a file name cannot hold become _, and an empty name gets a word', () => {
  assert.equal(bundleFileName({ locale: 'ja-JP', distributorName: ' 山田/先生:A*?"<>|\\\u0007 ', hasVoice: true, now: NOW }), '声-山田_先生_A________-2026-10-12.dancecount.txt');
  assert.equal(bundleFileName({ locale: 'ja-JP', distributorName: '  ', hasVoice: true, now: NOW }), '声-名前なし-2026-10-12.dancecount.txt');
  assert.equal(bundleFileName({ locale: 'en', distributorName: '', hasVoice: false, now: NOW }), 'routines-unnamed-2026-10-12.dancecount.txt');
});

test('the app URL is empty in tests, and the open-outside-LINE mark goes before the hash (F26・Ruling 82-6)', () => {
  assert.equal(PUBLIC_APP_URL, '');
  assert.equal(withExternalBrowser('https://count.dancemap.jp/'), 'https://count.dancemap.jp/?openExternalBrowser=1');
  assert.equal(withExternalBrowser('http://192.168.1.5:5199/?r=1#/receive'), 'http://192.168.1.5:5199/?r=1&openExternalBrowser=1#/receive');
  assert.equal(withExternalBrowser('https://count.dancemap.jp/?openExternalBrowser=1'), 'https://count.dancemap.jp/?openExternalBrowser=1');
  for (const bad of ['', 'not a url', 'javascript:alert(1)', 'file:///x']) assert.equal(withExternalBrowser(bad), null, bad);
});

test('direction-changing invisible characters are removed from the suggested name; C1 controls become _ (stage-5 review)', () => {
  assert.equal(bundleFileName({ locale: 'ja-JP', distributorName: '‮山田⁦先生⁩‏', hasVoice: true, now: NOW }), '声-山田先生-2026-10-12.dancecount.txt');
  assert.equal(bundleFileName({ locale: 'en', distributorName: 'A\u0085B', hasVoice: true, now: NOW }), 'voice-A_B-2026-10-12.dancecount.txt');
  assert.equal(bundleFileName({ locale: 'en', distributorName: '‮', hasVoice: false, now: NOW }), 'routines-unnamed-2026-10-12.dancecount.txt');
});

test('a received file name loses control and direction characters; nothing left means the fallback (stage-5 review)', () => {
  assert.equal(cleanReceivedFileName('声-山田‮txt.exe‬-2026-10-12.dancecount.txt', 'x'), '声-山田txt.exe-2026-10-12.dancecount.txt');
  assert.equal(cleanReceivedFileName('a\u0000b\nc\u009fd.txt', 'x'), 'abcd.txt');
  assert.equal(cleanReceivedFileName('‮\u0007 ', 'bundle.dancecount.txt'), 'bundle.dancecount.txt');
  assert.equal(cleanReceivedFileName('普通の名前.dancecount.txt', 'x'), '普通の名前.dancecount.txt');
});
