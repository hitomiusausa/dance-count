// 段7 レビュー M2: SW が index.html を返すナビゲーションはアプリの入口（scope の直下・index.html）だけ。
import test from 'node:test';
import assert from 'node:assert/strict';
import { appEntryPattern } from '../../src/sw-navigation.ts';

test('only the app entry (scope root or index.html, any query) gets index.html; deep paths go to the network', () => {
  const root = appEntryPattern('/');
  for (const ok of ['/', '/index.html', '/?ui-state=update-ready', '/index.html?x=1']) assert.ok(root.test(ok), ok);
  for (const no of ['/receive', '/foo', '/foo/bar', '/index.htm', '/indexXhtml', '/audio/x.wav']) assert.ok(!root.test(no), no);
  const sub = appEntryPattern('/app.v1/');
  for (const ok of ['/app.v1/', '/app.v1/index.html', '/app.v1/?a=b']) assert.ok(sub.test(ok), ok);
  for (const no of ['/', '/appXv1/', '/app.v1/deep/path', '/other/app.v1/']) assert.ok(!sub.test(no), no);
});
