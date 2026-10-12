import { figureIdentity } from './figure-names.ts';

// 監修済みのカウント表（D52・Ruling 109・110）。ひとみうさが監修シート（docs/app-v1/figure-counts-review.md）で
// 「判定」に OK か訂正を書いた行だけをここへ写す。判定が空の行（未監修の案）は 1 件も書かない（Ruling 3 はそのまま有効）。
// - counts: 入れる値（正規化後）。alternatives: 「こう数える人もいる」形（v1 では画面に出さない。記録だけ）。
// - basis: シートの「根拠」の写し（出荷ビルドに入る。旧データの目印の語を含めない）。
// - シートと 1 対 1 であることは test/app/routines/reviewed-counts.test.ts が機械で照合する（転記の誤り・漏れも落ちる）。
// 表が空でも仕組みは出荷してよい（Ruling 110-3。その間は「前に使ったカウント」だけが入る）。
export interface ReviewedCount {
  danceId: string;
  englishName: string;
  counts: string;
  alternatives?: readonly string[];
  basis: string;
  reviewedBy: 'ひとみうさ';
  reviewedAt: string;   // YYYY-MM-DD（シートが戻った日）
}

export const REVIEWED_COUNTS: readonly ReviewedCount[] = Object.freeze([
  { danceId: 'waltz', englishName: 'Closed Changes', counts: '123', basis: '旧 ワルツ シルバー級 行3・ブロンズ級 行3『クローズドチェンジ』123、旧 ワルツ 2級(全ダ連) 行1『クローズド・チェンジ』123', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Whisk', counts: '123', basis: '旧 ワルツ シルバー級 行4・1級 行5『ウィスク』123', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Chasse from PP', counts: '12&3', basis: '旧 ワルツ シルバー級 行5『シャッセフロムPP』12&3、旧 ワルツ 1級 行6・21『シャッセ フロム PP』12&3', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Hesitation Change', counts: '123123', basis: '旧 ワルツ 1級 行13『ヘジテーションチェンジ』123123、旧 ワルツ 2級(全ダ連) 行9・20 同 123123', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Outside Change', counts: '123', basis: '旧 ワルツ 1級 行12『アウトサイドチェンジ』123、旧 ワルツ 2級(全ダ連) 行5・12 同 123', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Reverse Corte', counts: '123', basis: '旧 ワルツ 2級(全ダ連) 行11『リバース・コルテ』123。ISTD 一般知識・推定とも合う', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Back Whisk', counts: '123', basis: '旧 ワルツ 1級 行17『バックウィスク』123、旧 ワルツ 2級(全ダ連) 行18『バック・ホイスク』123', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Back Lock', counts: '12&3', basis: '旧 ワルツ 1級 行16『バックロック』12&3。ISTD 一般知識・推定とも合う', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Progressive Chasse to Right', counts: '12&3', basis: '旧 ワルツ 2級(全ダ連) 行4『プログレッシブ・シャッセ・トゥ・ライト』12&3、旧 ワルツ 1級 行15『シャッセ トゥ ライト』12&3', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Weave from PP', counts: '123123', basis: '旧 ワルツ 1級 行9『ウィーブ フロム PP』123123、旧 ワルツ 2級(全ダ連) 行19『ウィーブ・フロム・PP』123123', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Closed Telemark', counts: '123', basis: '旧 ワルツ 2級(全ダ連) 行16『クローズド・テレマーク』123。ISTD 一般知識・推定とも合う', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Open Impetus', counts: '123', basis: '旧 ワルツ 1級 行8『オープンインピタス（アンダーターン）』123、旧 ワルツ 2級(全ダ連) 行14『オープン・インピタス・ターン』123', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Contra Check', counts: '123', basis: '旧 ワルツ 1級 行20『コントラチェック』123。ISTD 一般知識・推定とも合う', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'waltz', englishName: 'Fallaway Reverse and Slip Pivot', counts: '12&3', basis: '旧 ワルツ 1級 行14『フォーラウェイリバース＆スリップピボット』12&3。ISTD 一般知識・推定とも合う', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'slowfox', englishName: 'Feather Step', counts: 'SQQ', basis: '旧 スローフォックス シルバー級 行1・1級 行2・6『フェザーステップ』SQQ', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'slowfox', englishName: 'Three Step', counts: 'SQQ', basis: '旧 スローフォックス シルバー級 行2・1級 行8・14『スリーステップ』SQQ', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'tango', englishName: 'Progressive Link', counts: 'QQ', basis: '旧 タンゴ 1級 行2・シルバー級 行2・ブロンズ級 行2・17『プログレッシブリンク』QQ', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'tango', englishName: 'Closed Promenade', counts: 'SQQS', basis: '旧 タンゴ 1級 行6・14・シルバー級 行3・ブロンズ級 行15・22『クローズドプロムナード』SQQS、旧 タンゴ 新ゴールド級 行29 同 SQQS', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'tango', englishName: 'Back Corte', counts: 'SQQS', basis: '旧 タンゴ 1級 行12・15・シルバー級 行5『バックコルテ』SQQS', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
  { danceId: 'tango', englishName: 'Open Promenade', counts: 'SQQS', basis: '旧 タンゴ 1級 行3・18・ゴールド級 行4・新ゴールド級 行4『オープンプロムナード』SQQS', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' },
]);

// figureIdentity（D22）で引く。照合済みでない名前（'text:'）は表に無いので null＝自由入力は履歴だけ（Ruling 106-5）。
export function reviewedCounts(danceId: string, name: string): ReviewedCount | null {
  const identity = figureIdentity(danceId, name);
  if (!identity.startsWith('figure:')) return null;
  return REVIEWED_COUNTS.find(entry => entry.danceId === danceId && figureIdentity(danceId, entry.englishName) === identity) ?? null;
}
