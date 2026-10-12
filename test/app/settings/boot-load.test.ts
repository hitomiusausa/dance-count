// 段8 Task 12（final-review m1）: 起動の読み込みがどこで reject しても、既定値で画面を出せる（殻のまま止まらない）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootLoad } from '../../../src/app/settings/boot-load.ts';
import { DEFAULT_SETTINGS, type AppSettings } from '../../../src/app/settings/settings.ts';

const SAVED = { ...DEFAULT_SETTINGS, lastDanceId: 'tango' } as AppSettings;
const fail = () => Promise.reject(new Error('boom'));

test('normal boot passes the opened storage to both loaders', async () => {
  const seen: unknown[] = [];
  const loaded = await bootLoad({
    open: async () => 'db',
    loadSettings: async storage => { seen.push(storage); return SAVED; },
    loadRoutines: async storage => { seen.push(storage); return ['r1']; }
  });
  assert.deepEqual(loaded, { storage: 'db', settings: SAVED, routines: ['r1'] });
  assert.deepEqual(seen, ['db', 'db']);
});

test('loadRoutines rejecting still gives the settings (and no routines)', async () => {
  const loaded = await bootLoad({ open: async () => 'db', loadSettings: async () => SAVED, loadRoutines: fail });
  assert.deepEqual(loaded, { storage: 'db', settings: SAVED, routines: [] });
});

test('loadSettings rejecting gives the default settings; open rejecting gives no storage', async () => {
  assert.equal((await bootLoad({ open: async () => 'db', loadSettings: fail, loadRoutines: async () => [] })).settings, DEFAULT_SETTINGS);
  const noStorage = await bootLoad({ open: fail, loadSettings: async storage => (storage === null ? SAVED : DEFAULT_SETTINGS), loadRoutines: async () => [] });
  assert.equal(noStorage.storage, null);
  assert.equal(noStorage.settings, SAVED);
});
