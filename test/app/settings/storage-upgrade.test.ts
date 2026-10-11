import test from 'node:test';
import assert from 'node:assert/strict';
import { DB_NAME, DB_VERSION, upgradeAppDatabase } from '../../../src/app/platform/storage.ts';

function fakeDb(existing: string[]) {
  const created: Array<[string, unknown]> = [];
  const names = new Set(existing);
  return {
    created,
    objectStoreNames: { contains: (name: string) => names.has(name) },
    createObjectStore(name: string, options?: unknown) { names.add(name); created.push([name, options]); }
  };
}

test('the app database is dance-count-v2 at version 2 (spec §7)', () => {
  assert.equal(DB_NAME, 'dance-count-v2');
  assert.equal(DB_VERSION, 2);
});

test('upgrading from version 1 keeps voice-packs and adds routines and settings', () => {
  const db = fakeDb(['voice-packs']);
  upgradeAppDatabase(db, 1);
  assert.deepEqual(db.created, [['routines', { keyPath: 'id' }], ['settings', undefined]]);
});

test('a fresh install creates all three stores; a second upgrade creates nothing', () => {
  const db = fakeDb([]);
  upgradeAppDatabase(db, 0);
  assert.deepEqual(db.created.map(([name]) => name), ['voice-packs', 'routines', 'settings']);
  upgradeAppDatabase(db, 2);
  assert.equal(db.created.length, 3);
});
