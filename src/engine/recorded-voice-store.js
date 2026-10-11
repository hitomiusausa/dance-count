const DB_NAME = 'dance-count-v2';
const STORE_NAME = 'voice-packs';
const DB_VERSION = 1;
export const LOCAL_RECORDED_PACK_ID = 'user-recorded-v1';
export const JAPANESE_RECORDED_PACK_ID = 'user-recorded-ja-v1';

export async function loadLocalRecordedPack(id = LOCAL_RECORDED_PACK_ID) {
  const db = await openDatabase();
  return requestResult(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id));
}

export async function listLocalRecordedPacks() {
  const db = await openDatabase();
  return (await requestResult(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll())) ?? [];
}

export async function saveLocalRecordedPack(pack) {
  const db = await openDatabase();
  await requestResult(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(pack));
  return pack;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('このブラウザは録音音声の端末保存に対応していません'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('録音音声の保存領域を開けません'));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error('録音音声を保存できません'));
  });
}
