import test from 'node:test';
import assert from 'node:assert/strict';
import { closeTarget } from '../../src/app/practice/notice-close.ts';

test('保存失敗の枠は自分だけを閉じ、ほかの案内は session を閉じる', () => {
  assert.equal(closeTarget('save-failed'), 'save-failed');
  for (const n of ['no-sound', 'stopped', 'voice-missing', 'wake-tip'] as const) assert.equal(closeTarget(n), 'session');
});
