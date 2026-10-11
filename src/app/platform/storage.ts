// 端末内の保存（仕様 §7・Ruling 11）。IndexedDB `dance-count-v2` を version 2 に上げ、
// 既存の voice-packs を残したまま routines と settings を足す。版上げはここ1か所だけで行う。
// 注意: src/engine/recorded-voice-store.js は version 1 を直接開くので、v2 にした後に呼ぶと VersionError。
// 新アプリからは呼ばない（声の保存は src/app/voices/store.ts がここを経由する。Ruling 56）。
// 版上げの方針（Ruling 56-5）: 上げる時は DB_VERSION と upgradeAppDatabase の 1 か所だけ。test/app/settings/storage-upgrade.test.ts に
// 0→N・1→N・2→N の 3 経路を足す。既存ストアの削除・改名はしない。
export const DB_NAME = 'dance-count-v2';
export const DB_VERSION = 2;
export type StoreName = 'routines' | 'settings' | 'voice-packs';

// keyPath を持つストアは値の id で、持たないストア（settings）は引数のキーで保存する。
const STORES: Record<StoreName, IDBObjectStoreParameters | undefined> = {
  'voice-packs': { keyPath: 'id' },
  routines: { keyPath: 'id' },
  settings: undefined
};

export interface UpgradableDatabase {
  objectStoreNames: { contains(name: string): boolean };
  createObjectStore(name: string, options?: IDBObjectStoreParameters): unknown;
}

// 版上げの中身（Ruling 26。テストは偽の db で行う）。既にあるストアには触らない（削除・改名もしない）。
// oldVersion は 0（新規）か 1（旧画面で録音した端末）。どちらでも3ストアが揃う。
export function upgradeAppDatabase(db: UpgradableDatabase, _oldVersion: number): void {
  for (const [name, options] of Object.entries(STORES) as Array<[StoreName, IDBObjectStoreParameters | undefined]>) {
    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, options);
  }
}

export interface AppStorage {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  getAll<T>(store: StoreName): Promise<T[]>;
  // keyPath を持つストア（voice-packs・routines）は値の id がキー。settings は key を渡す。
  put<T>(store: StoreName, value: T, key?: string): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
}

let opening: Promise<AppStorage> | null = null;

// 開けない（IndexedDB が無い・プライベートモードで拒否）ときは reject。呼び出し側は既定値で動き続ける。
export function openAppStorage(): Promise<AppStorage> {
  opening ??= openDatabase().then(wrap, error => {
    opening = null;
    throw error;
  });
  return opening;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is not available'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = event => upgradeAppDatabase(request.result, event.oldVersion);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another tab'));
  });
}

function wrap(db: IDBDatabase): AppStorage {
  return {
    get<T>(store: StoreName, key: string) {
      return run<T | undefined>(db, store, 'readonly', objectStore => objectStore.get(key));
    },
    async getAll<T>(store: StoreName) {
      return (await run<T[] | undefined>(db, store, 'readonly', objectStore => objectStore.getAll())) ?? [];
    },
    async put<T>(store: StoreName, value: T, key?: string) {
      await run(db, store, 'readwrite', objectStore => (objectStore.keyPath ? objectStore.put(value) : objectStore.put(value, key)));
    },
    async delete(store: StoreName, key: string) {
      await run(db, store, 'readwrite', objectStore => objectStore.delete(key));
    }
  };
}

// 読みは要求の成功で返す。書き（put・delete）はトランザクションの完了（確定）まで待つ: 要求が成功しても確定前に
// 再読み込み・アプリを閉じると取り消されるので、true を返すのは本当に残った時だけ（S4 の「保存できませんでした」の根拠）。
function run<T>(db: IDBDatabase, store: StoreName, mode: IDBTransactionMode, action: (objectStore: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = action(transaction.objectStore(store));
    request.onerror = () => reject(request.error ?? new Error(`IndexedDB ${mode} failed`));
    if (mode === 'readonly') {
      request.onsuccess = () => resolve(request.result as T);
      return;
    }
    transaction.oncomplete = () => resolve(request.result as T);
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB write was aborted'));
  });
}

// 端末が勝手に消さないように頼む（Ruling 11・56-6。段7から前倒し）。最初の語の保存が成功した直後に 1 回だけ呼ぶ。
// 無い端末・断られた時は黙って続ける（結果は画面に出さない）。
export async function requestPersistentStorage(): Promise<void> {
  try {
    const manager = typeof navigator === 'undefined' ? undefined : navigator.storage;
    if (!manager?.persist) return;
    if (await manager.persisted?.()) return;
    await manager.persist();
  } catch { /* 何もしない */ }
}
