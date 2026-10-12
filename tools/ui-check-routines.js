// ui:check と smoke:routines が使う検査用のルーティン（Ruling 43）。
// カウントは種目の templates だけで組み、名前は figure-terminology の照合済みの語だけを使う
// （未監修の旧ルーティンのカウント列を新アプリの経路に流さない）。
import { DANCE_PROFILES } from '../src/engine/dance-profiles.js';
import { FIGURE_TERMINOLOGY } from '../src/engine/figure-terminology.js';

const CREATED = '2026-10-11T08:00:00.000Z';

function verifiedNames(danceId) {
  const names = [];
  for (const entry of Object.values(FIGURE_TERMINOLOGY)) {
    if (entry.danceId === danceId && entry.claimStatus === 'verified' && !names.includes(entry.sourceAliases[0])) names.push(entry.sourceAliases[0]);
  }
  return names;
}

function routine(id, danceId, name, figureCount, minute, firstFigureName) {
  const names = verifiedNames(danceId);
  const templates = DANCE_PROFILES[danceId].templates;
  const createdAt = CREATED.replace('08:00', `08:${String(minute).padStart(2, '0')}`);
  return {
    id, danceId, name, bpm: null, countInBars: 1, source: 'user-created', status: 'ready',
    figures: Array.from({ length: figureCount }, (_, index) => ({
      id: `f-uicheck-${String(index).padStart(4, '0')}`,
      name: index === 0 && firstFigureName ? firstFigureName : names[index % names.length],
      counts: templates[index % templates.length]
    })),
    provenance: { sourceKind: 'user-created', authority: null, authorityClaimStatus: 'not-applicable', reviewStatus: 'unreviewed' },
    createdWith: { app: 'dance-count', version: 'ui-check' },
    createdAt, updatedAt: createdAt
  };
}

// 40 字ちょうどの名前（Ruling 47: 全角 40 字と英数字 40 字の2本）。
const LONG_JA = 'ワルツの通し練習・金曜クラス発表会に向けて先生と一緒に確認する用の大事なルーティン'.slice(0, 40);
const LONG_EN = 'Friday class waltz run-through for show!'.padEnd(40, 'x').slice(0, 40);
// 先生が自由に打った長いフィガー名（40 字）。名前だけで、カウントは templates のまま（Ruling 3・43）。
const LONG_FIGURE = 'ナチュラルターンからスピンターンへつなぐ先生オリジナルの入り方（金曜クラス用・前半）'.slice(0, 40);

export const UI_CHECK_ROUTINES = {
  waltz13: routine('r-uicheck-waltz13', 'waltz', 'ワルツの練習', 13, 0),
  empty: routine('r-uicheck-empty00', 'tango', 'タンゴの練習', 0, 1),
  longJa: routine('r-uicheck-longja40', 'waltz', LONG_JA, 3, 2, LONG_FIGURE),
  longEn: routine('r-uicheck-longen40', 'jive', LONG_EN, 3, 3),
  waltzOffBar: offBarRoutine(),
  waltzAuto: autoCountsRoutine()
};

// D52・Ruling 112-3: 「前に使ったカウント」の検査用の 2 本目のワルツ。waltz13 に無い一覧の 17 番目のフィガーを templates[1]（12&3）で持つ。
// S4 の waltz13 の追加の行でこの名前をタップすると、欄に 12&3 が入り、形のチップが 1 つ押され、「前に使ったカウントです」の行が出る。
function autoCountsRoutine() {
  const base = routine('r-uicheck-waltzauto', 'waltz', 'ワルツの自動入力の確認', 0, 5);
  return { ...base, figures: [{ id: 'f-uicheck-0000', name: 'フォーラウェイリバース＆スリップピボット', counts: DANCE_PROFILES.waltz.templates[1] }] };
}

// 小節の注意（D16・Ruling 52-5）の検査用。わざと 3 拍の倍数でないカウント（12）を 2 件入れる＝行の注意 2 件（全文 1・短い形 1）、
// 全体は 6+2+2=10 拍で小節の途中で終わる。templates の外のカウントだが、注意を出すための「打ち間違い」の見本で、正しいカウントを名乗らない。
// 名前は照合済みの語だけ（「シャッセ」単独は未照合なので「シャッセ フロム PP」）。
function offBarRoutine() {
  const base = routine('r-uicheck-waltzoff', 'waltz', 'ワルツの小節の確認', 0, 4);
  const figures = [['ナチュラルターン', '123123'], ['ウィスク', '12'], ['シャッセ フロム PP', '12']];
  return { ...base, figures: figures.map(([name, counts], index) => ({ id: `f-uicheck-${String(index).padStart(4, '0')}`, name, counts })) };
}

// 段8（Ruling 100）: ルーティン N 本（1 フィガーのワルツ）。199 本＋配布ファイルの 2 本で上限 200 を 1 本超える（S10「200 本までなので、1 本は受け取れません」）
export function manyRoutines(count) {
  return Array.from({ length: count }, (_, index) => {
    const id = `r-uicheck-many${String(index).padStart(4, '0')}`;
    return { ...routine(id, 'waltz', `ワルツ ${index + 1}`, 1, index % 60), id };
  });
}

// ブラウザの中で動く（page.evaluate に渡す）。アプリが版上げした DB（dance-count-v2 v2）の routines へ直接書く。
export async function seedRoutinesInPage(routines) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('dance-count-v2', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('routines', 'readwrite');
    for (const item of routines) transaction.objectStore('routines').put(item);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

// seed の後に画面を開く（段7 Task 1・段3からの「seed 直後の S4 待ちで 30 秒切れ」の直し）。
// 動いているアプリにハッシュだけ変えて渡すと、アプリはメモリの古い一覧（seed の前）で判断し、知らないルーティンの S4／S5 を
// S3 へ置き換える（replaceRoute）。その後の reload は置き換わった #/routines を読み直すので、重い時ほど S3 が出る。
// 空のページを挟んで、目当ての URL を新しく読み込む（アプリは IndexedDB から seed 済みの一覧を読む）。
export async function openAfterSeed(page, url) {
  await page.goto('about:blank');
  await page.goto(url);
}
