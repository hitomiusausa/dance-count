import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_MESSAGES } from '../../../src/app/i18n/messages.ts';
import { platformKindFrom } from '../../../src/app/platform/pwa.ts';
import { wakeLockTipKey } from '../../../src/app/practice/wake-tip.ts';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

test('the screen-dim tip names Auto-Lock only on iPhone/iPad; other devices get the screen timeout text (夜間便 A-4・監査 #16)', () => {
  assert.equal(wakeLockTipKey(platformKindFrom(IPHONE)), 'wakeLockTip');
  assert.equal(wakeLockTipKey(platformKindFrom(IPHONE_CHROME)), 'wakeLockTip');
  assert.equal(wakeLockTipKey(platformKindFrom(ANDROID)), 'wakeLockTipOther');
  assert.equal(wakeLockTipKey(platformKindFrom(MAC)), 'wakeLockTipOther');
  assert.equal(APP_MESSAGES['ja-JP'].wakeLockTipOther, '練習中は画面が暗くなることがあります。画面が消えるまでの時間を長めにすると便利です。');
  assert.equal(APP_MESSAGES.en.wakeLockTipOther, 'Your screen may dim during practice. A longer screen timeout helps.');
  assert.doesNotMatch(APP_MESSAGES['ja-JP'].wakeLockTipOther, /自動ロック/);
  assert.doesNotMatch(APP_MESSAGES.en.wakeLockTipOther, /Auto-Lock/);
});
