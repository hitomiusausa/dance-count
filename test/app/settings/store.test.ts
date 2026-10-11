import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppStorage, StoreName } from '../../../src/app/platform/storage.ts';
import { DEFAULT_SETTINGS } from '../../../src/app/settings/settings.ts';
import { SETTINGS_SCHEMA_VERSION, loadSettings, saveSettings } from '../../../src/app/settings/store.ts';

function memoryStorage(initial: Record<string, unknown> = {}, { failWrites = false, failReads = false } = {}) {
  const data = new Map<string, unknown>(Object.entries(initial));
  const storage: AppStorage = {
    async get<T>(store: StoreName, key: string) { if (failReads) throw new Error('read'); return data.get(`${store}/${key}`) as T | undefined; },
    async put<T>(store: StoreName, value: T, key?: string) { if (failWrites) throw new Error('quota'); data.set(`${store}/${key}`, value); }
  };
  return { storage, data };
}

function legacySource(value: string | null) {
  const state = { value, forgotten: false };
  return { state, source: { read: () => state.value, forget: () => { state.forgotten = true; state.value = null; } } };
}

test('no storage at all (private mode) still gives defaults', async () => {
  assert.deepEqual(await loadSettings(null, legacySource(null).source), DEFAULT_SETTINGS);
  assert.equal(await saveSettings(null, { lastDanceId: 'waltz' }), false);
});

test('save merges into the stored record and stamps the schema version', async () => {
  const { storage, data } = memoryStorage({ 'settings/app': { lastDanceId: 'tango', futureField: 42 } });
  assert.equal(await saveSettings(storage, { metronome: false }), true);
  assert.deepEqual(data.get('settings/app'), { lastDanceId: 'tango', futureField: 42, metronome: false, schemaVersion: SETTINGS_SCHEMA_VERSION });
  const loaded = await loadSettings(storage, legacySource(null).source);
  assert.equal(loaded.lastDanceId, 'tango');
  assert.equal(loaded.metronome, false);
});

test('a failing write returns false instead of throwing; a failing read gives defaults', async () => {
  assert.equal(await saveSettings(memoryStorage({}, { failWrites: true }).storage, { loop: false }), false);
  assert.deepEqual(await loadSettings(memoryStorage({}, { failReads: true }).storage, legacySource(null).source), DEFAULT_SETTINGS);
});

test('the old screen language moves over once and is forgotten only after saving', async () => {
  const { storage, data } = memoryStorage();
  const legacy = legacySource('ja-JP');
  const loaded = await loadSettings(storage, legacy.source);
  assert.equal(loaded.uiLocale, 'ja-JP');
  assert.equal((data.get('settings/app') as { uiLocale: string }).uiLocale, 'ja-JP');
  assert.equal(legacy.state.forgotten, true);
});

test('the old language is kept when saving fails, and ignored when a new one is saved or it is invalid', async () => {
  const failing = legacySource('ja-JP');
  assert.equal((await loadSettings(memoryStorage({}, { failWrites: true }).storage, failing.source)).uiLocale, 'ja-JP');
  assert.equal(failing.state.forgotten, false);
  const already = legacySource('ja-JP');
  assert.equal((await loadSettings(memoryStorage({ 'settings/app': { uiLocale: 'en' } }).storage, already.source)).uiLocale, 'en');
  assert.equal(already.state.forgotten, false);
  const junk = legacySource('xx-YY');
  assert.equal((await loadSettings(memoryStorage().storage, junk.source)).uiLocale, null);
});
