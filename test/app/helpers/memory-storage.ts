import type { AppStorage, StoreName } from '../../../src/app/platform/storage.ts';

// テスト用の保存領域（IndexedDB の代わり）。keyPath を持つストアは値の id をキーにする（本物と同じ）。
const KEY_PATH: Record<StoreName, string | null> = { 'voice-packs': 'id', routines: 'id', settings: null };

export function memoryStorage(initial: Record<string, unknown> = {}, { failWrites = false, failReads = false } = {}) {
  const data = new Map<string, unknown>(Object.entries(initial));
  const storage: AppStorage = {
    async get<T>(store: StoreName, key: string) { if (failReads) throw new Error('read'); return data.get(`${store}/${key}`) as T | undefined; },
    async getAll<T>(store: StoreName) {
      if (failReads) throw new Error('read');
      return [...data.entries()].filter(([key]) => key.startsWith(`${store}/`)).map(([, value]) => value as T);
    },
    async put<T>(store: StoreName, value: T, key?: string) {
      if (failWrites) throw new Error('quota');
      const keyPath = KEY_PATH[store];
      data.set(`${store}/${keyPath ? (value as Record<string, string>)[keyPath] : key}`, structuredClone(value));
    },
    async delete(store: StoreName, key: string) { if (failWrites) throw new Error('quota'); data.delete(`${store}/${key}`); },
    async clear(stores: readonly StoreName[]) {
      if (failWrites) throw new Error('quota');
      for (const key of [...data.keys()]) if (stores.some(store => key.startsWith(`${store}/`))) data.delete(key);
    }
  };
  return { storage, data };
}
