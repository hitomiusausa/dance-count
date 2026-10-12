// ui:check と smoke:voice が使う検査用の声（Ruling 63-1）。WAV はブラウザの中で合成する（dist でも動くよう import しない）。
// 固定データ: completeEn（録音・12 語・英語）・partialJa（録音・7 語・日本語）・receivedJa（受け取り・12 語・山田さん）。
const UPDATED = '2026-10-12T08:00:00.000Z';
const RECEIVED_TEACHERS = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '中村', '小林', '加藤', '吉田',
  '山口', '松本', '井上', '木村', '林', '清水', '山崎', '森', '池田', 'Smith'];
const KEYS = ['slow', 'quick', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'and', 'ah'];

function voice(id, name, locale, recorded, extra = {}) {
  return { schemaVersion: 1, type: 'dance-count-recorded-voice-pack', id, name, locale, vocabularyId: locale, updatedAt: UPDATED, origin: 'recorded', recorded, ...extra };
}

export const UI_CHECK_VOICES = {
  completeEn: voice('user-recorded-v1', '自分の声（英語）', 'en', 12),
  partialJa: voice('user-recorded-ja-v1', '自分の声（日本語）', 'ja-JP', 7),
  // sourceId・locale・distributor が test/fixtures/share/bundle-voice-routine.dancecount.txt の声と同じ＝S10 で「置き換え」になる（Ruling 84-4）
  receivedJa: voice('v-uicheck-recv', '山田の声', 'ja-JP', 12, { origin: 'received', distributor: { name: '山田' }, sourceId: 'user-recorded-ja-v1' }),
  // 段8（Ruling 100・103-2）: 受け取った声 20 本（上限ちょうど）。山田さんとは別の先生＝S10 で同じ先生の置き換えにならず「声はすでに 20 あるので…」。
  // S7 は 標準＋この 20 本＋自分の声 2 本で一覧の上限（data-choices-max）を見る
  received20: RECEIVED_TEACHERS.map((name, index) => voice(`v-uicheck-r${String(index).padStart(2, '0')}`, `${name}の声`, index % 2 ? 'en' : 'ja-JP', 12,
    { origin: 'received', distributor: { name }, sourceId: `src-uicheck-${String(index).padStart(2, '0')}` }))
};

// ブラウザの中で動く（page.evaluate に渡す。外の変数は使えない）。recorded 語ぶんの WAV（16bit・モノ・48kHz・0.745 秒・
// 40ms から 0.4 秒の 220Hz＋倍音）を作って voice-packs へ書く。
export async function seedVoicePacksInPage(voices) {
  const keys = ['slow', 'quick', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'and', 'ah'];
  const rate = 48000;
  const frames = Math.round(rate * 0.745);
  const bytes = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(bytes);
  const text = (offset, value) => { for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, frames * 2, true);
  for (let i = 0; i < frames; i += 1) {
    const t = i / rate;
    const on = t >= 0.04 && t < 0.44 ? 0.5 * (Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 440 * t)) / 1.5 : 0;
    view.setInt16(44 + i * 2, Math.round(on * 0x7fff), true);
  }
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('dance-count-v2', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('voice-packs', 'readwrite');
    for (const { recorded, ...pack } of voices) {
      const words = {};
      for (const key of keys.slice(0, recorded)) {
        words[key] = { blob: new Blob([bytes], { type: 'audio/wav' }), mimeType: 'audio/wav', onsetMs: 40, sourceOnsetMs: 320, durationMs: 745, normalized: true, gainDb: 0 };
      }
      transaction.objectStore('voice-packs').put({ ...pack, words });
    }
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export const UI_CHECK_VOICE_KEYS = KEYS;
