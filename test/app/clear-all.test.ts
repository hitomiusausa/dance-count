// 段8（Ruling 99-4）: S13「データを全て消す」は 3 つのストアを空にし、受け口と旧画面の言語の鍵も消す。消せなければ投げる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_STORES, clearAllAppData } from '../../src/app/platform/storage.ts';
import { memoryStorage } from './helpers/memory-storage.ts';

const seeded = () => memoryStorage({
  'routines/r1': { id: 'r1' }, 'settings/app': { schemaVersion: 1, lastDanceId: 'waltz' }, 'voice-packs/v1': { id: 'v1' }
});

test('all three stores become empty, then the inbox and the old language key are cleared', async () => {
  const { storage, data } = seeded();
  const calls: string[] = [];
  await clearAllAppData(storage, { clearInbox: async () => { calls.push('inbox'); }, forgetLegacy: () => { calls.push('legacy'); } });
  assert.equal(data.size, 0);
  assert.deepEqual(calls, ['inbox', 'legacy']);
  assert.deepEqual([...APP_STORES].sort(), ['routines', 'settings', 'voice-packs']);
});

test('a failed clear throws and leaves the inbox and the old key alone (the screen says it could not delete)', async () => {
  const { storage, data } = memoryStorage({ 'routines/r1': { id: 'r1' } }, { failWrites: true });
  const calls: string[] = [];
  await assert.rejects(clearAllAppData(storage, { clearInbox: async () => { calls.push('inbox'); }, forgetLegacy: () => { calls.push('legacy'); } }));
  assert.equal(data.size, 1);
  assert.deepEqual(calls, []);
});

test('without an open storage there is nothing to delete with, so it throws', async () => {
  await assert.rejects(clearAllAppData(null, { clearInbox: async () => {}, forgetLegacy: () => {} }));
});
