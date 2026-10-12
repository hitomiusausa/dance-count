import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DANCE_NAMES } from '../../../src/engine/ui-messages.js';
import { checkCounts, normalizeCounts } from '../../../src/app/routines/counts.ts';
import { figureIdentity } from '../../../src/app/routines/figure-names.ts';
import { REVIEWED_COUNTS, buildReviewedFigures, reviewedCounts, reviewedFigureBySlug, reviewedFigures, type ReviewedCount } from '../../../src/app/routines/reviewed-counts.ts';
import { figureNameChoices, figureSlug } from '../../../src/app/routines/figure-names.ts';

// 監修済みのカウント表の番人（D52・Ruling 110-2）。「ひとみうさが OK を付けた行だけ出荷」を人の注意でなくテストで守る。
const root = path.resolve(import.meta.dirname, '../../..');
const SHEET = path.join(root, 'docs/app-v1/figure-counts-review.md');
const DATE = /^\d{4}-\d{2}-\d{2}$/;

test('(a) every entry is reviewed by ひとみうさ on a real date not in the future', () => {
  const now = new Date();   // 端末の日付（UTC だと日本の 0〜9 時に「未来」と誤判定する）
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n, i) => String(n).padStart(i ? 2 : 4, '0')).join('-');
  for (const entry of REVIEWED_COUNTS) {
    assert.equal(entry.reviewedBy, 'ひとみうさ', entry.englishName);
    assert.match(entry.reviewedAt, DATE, entry.englishName);
    assert.ok(!Number.isNaN(Date.parse(entry.reviewedAt)) && entry.reviewedAt <= today, `${entry.englishName} ${entry.reviewedAt}`);
    assert.ok(entry.basis.trim() !== '', `${entry.englishName} has no basis`);
  }
});

test('(b) counts and alternatives pass checkCounts and are stored normalized', () => {
  for (const entry of REVIEWED_COUNTS) {
    for (const counts of [entry.counts, ...(entry.alternatives ?? [])]) {
      const check = checkCounts(entry.danceId, counts);
      assert.equal(check.problem, null, `${entry.danceId} ${entry.englishName} ${counts}`);
      assert.equal(check.empty, false, `${entry.danceId} ${entry.englishName}`);
    }
    assert.equal(entry.counts, normalizeCounts(entry.counts), entry.englishName);
  }
});

test('(c) each entry is a verified figure (figure: identity) and appears once', () => {
  const seen = new Set<string>();
  for (const entry of REVIEWED_COUNTS) {
    const identity = figureIdentity(entry.danceId, entry.englishName);
    assert.ok(identity.startsWith('figure:'), `${entry.danceId} ${entry.englishName} → ${identity}`);
    assert.ok(!seen.has(identity), `duplicate ${identity}`);
    seen.add(identity);
    assert.equal(reviewedCounts(entry.danceId, entry.englishName), entry);
  }
});

// 監修シートの表を読む。見出し（## 以下）に種目名（日英）か種目 ID があればその節の種目。列は見出しの名前で探す。
// 出荷する行（レビュー M-2 の統括裁定）: 判定が OK（訂正があれば訂正の値、無ければ案の値）か、判定が空で訂正に値がある行（訂正の値）。
// 判定が OK 以外（NG・保留・? など）の行は訂正があっても出さない（fail-closed）。判定・訂正とも空の行は存在しないのと同じ。
// 「ほかの形」（レビュー I-1）: 「、」（または , ， ／ /）で区切った形を正規化・並べ替えて alternatives と照合する（余分も不足も落ちる）。
const DANCES = Object.entries(DANCE_NAMES as Record<string, Record<string, string>>)
  .flatMap(([danceId, names]) => [danceId, ...Object.values(names)].map(name => ({ danceId, name: name.toLowerCase() })))
  .sort((a, b) => b.name.length - a.name.length);
function danceOfHeading(text: string): string | null {
  const lower = text.toLowerCase();
  return DANCES.find(dance => lower.includes(dance.name))?.danceId ?? null;   // 長い名前から（「ヴィニーズワルツ」を「ワルツ」にしない）
}
export type SheetRow = { danceId: string; englishName: string; counts: string; alternatives: string[] };
const ALTERNATIVES_SEPARATOR = /[、,，／/]/;
const alternativesOf = (cell: string) => cell.split(ALTERNATIVES_SEPARATOR).map(normalizeCounts).filter(Boolean).sort();
const cellsOf = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
export function approvedRows(sheet: string): SheetRow[] {
  const rows: SheetRow[] = [];
  let danceId: string | null = null;
  let columns: Record<string, number> | null = null;
  for (const line of sheet.split('\n')) {
    if (/^#{2,}\s/.test(line)) { danceId = danceOfHeading(line); columns = null; continue; }
    if (!line.trim().startsWith('|')) { columns = null; continue; }
    const cells = cellsOf(line);
    if (cells.includes('English') && cells.includes('判定')) { columns = Object.fromEntries(cells.map((cell, index) => [cell, index])); continue; }
    if (!columns || cells.every(cell => /^:?-*:?$/.test(cell))) continue;
    const at = (name: string) => cells[columns![name] ?? -1] ?? '';
    const corrected = at('訂正');
    const verdict = at('判定');
    const approved = /^ok$/i.test(verdict) || (verdict === '' && corrected !== '');
    if (!approved) continue;
    assert.ok(danceId, `approved row "${at('English')}" is not under a dance heading`);
    rows.push({ danceId, englishName: at('English'), counts: normalizeCounts(corrected || at('案')), alternatives: alternativesOf(at('ほかの形')) });
  }
  return rows;
}

test('(d) REVIEWED_COUNTS is exactly the OK / corrected rows of the review sheet (an absent sheet means none)', async () => {
  const sheet = await fs.readFile(SHEET, 'utf8').catch(() => '');
  const key = (row: { danceId: string; englishName: string; counts: string; alternatives?: readonly string[] }) =>
    [row.danceId, row.englishName, row.counts, (row.alternatives ?? []).map(normalizeCounts).sort().join('|')].join('\u0000');
  const fromSheet = approvedRows(sheet).map(key).sort();
  const shipped = REVIEWED_COUNTS.map(key).sort();
  assert.deepEqual(shipped, fromSheet);
});

test('(d) the sheet reader: OK takes the proposal, a correction wins, blank rows are skipped', () => {
  const sheet = [
    '## ワルツ',
    '| # | 日本語名 | English | 案 | 根拠 | 自信 | 判定 | 訂正 | ほかの形 | メモ |',
    '|---|---|---|---|---|---|---|---|---|---|',
    '| 1 | ウィスク | Whisk | 1 2 3 | x | 高 | OK |  |  |  |',
    '| 2 | シャッセフロムPP | Chasse from Promenade Position | 1 2 3 | x | 中 |  | 1 2 & 3 |  |  |',
    '| 3 | クローズドチェンジ | Closed Change | 1 2 3 | x | 高 |  |  |  |  |',
    '| 4 | リバースターン | Reverse Turn | 1 2 3 | x | 中 | 保留 | 1 2 3 1 2 3 |  |  |',
    '| 5 | バックウィスク | Back Whisk | 1 2 3 | x | 中 | NG |  |  |  |',
    '| 6 | ナチュラルターン | Natural Turn | 1 2 3 | x | 中 | OK | 1 2 3 1 2 3 | 1 2 3、 1&2 3 / 12&3 |  |',
    '## ヴィエニーズワルツ',
    '## スローフォックストロット',
    '| # | 日本語名 | English | 案 | 根拠 | 自信 | 判定 | 訂正 | ほかの形 | メモ |',
    '|---|---|---|---|---|---|---|---|---|---|',
    '| 1 | フェザーステップ | Feather Step | S Q Q | x | 高 | ok |  |  |  |'
  ].join('\n');
  const rows = approvedRows(sheet);
  assert.deepEqual(rows.map(row => [row.danceId, row.englishName, row.counts, row.alternatives]), [
    ['waltz', 'Whisk', '123', []], ['waltz', 'Chasse from Promenade Position', '12&3', []],
    ['waltz', 'Natural Turn', '123123', ['1&23', '12&3', '123']], ['slowfox', 'Feather Step', 'SQQ', []]
  ]);
});

test('(e) the table and autoCounts do not read the unreviewed data', async () => {
  for (const file of ['src/app/routines/reviewed-counts.ts', 'src/app/routines/auto-counts.ts']) {
    const text = await fs.readFile(path.join(root, file), 'utf8');
    for (const word of ['figure-catalog', 'legacy', 'imported-routine', 'figure-terminology', 'FIGURE-COUNTS-DRAFT']) {
      assert.ok(!text.includes(word), `${file} contains "${word}"`);
    }
  }
});

// D57（Ruling 120-2・122-3）: 「フィガー」タブの並び（登録簿の定義順）と slug での引き方。作り物の表で順を固定し、出荷の表は件数の和で見る
const fake = (danceId: string, englishName: string, counts: string): ReviewedCount => ({ danceId, englishName, counts, basis: 'テスト', reviewedBy: 'ひとみうさ', reviewedAt: '2026-10-13' });

test('reviewedFigures lists a dance in the registry order, not the table order', () => {
  const table = buildReviewedFigures([fake('waltz', 'Whisk', '123'), fake('waltz', 'Closed Changes', '123'), fake('tango', 'Progressive Link', 'QQ')]);
  assert.deepEqual(table.reviewedFigures('waltz').map(figure => figure.englishName), ['Closed Changes', 'Whisk']);
  assert.deepEqual(table.reviewedFigures('waltz')[1], { slug: 'whisk', englishName: 'Whisk', counts: '123' });
  assert.deepEqual(table.reviewedFigures('quickstep'), []);
  assert.equal(table.reviewedFigureBySlug('waltz', 'whisk')?.counts, '123');
  for (const slug of ['natural-turn', 'Whisk', undefined]) assert.equal(table.reviewedFigureBySlug('waltz', slug), null, String(slug));
  assert.equal(table.reviewedFigureBySlug('tango', 'whisk'), null, 'the slug is looked up within the dance');
  assert.deepEqual(buildReviewedFigures([]).reviewedFigures('waltz'), [], 'an empty table has no figures');
});

test('the shipped table: every entry is listed once under its dance, in registry order, and found by its slug', () => {
  const dances = [...new Set(REVIEWED_COUNTS.map(entry => entry.danceId))];
  assert.equal(dances.reduce((sum, danceId) => sum + reviewedFigures(danceId).length, 0), REVIEWED_COUNTS.length);
  for (const danceId of dances) {
    const order = figureNameChoices(danceId, 'en');
    const listed = reviewedFigures(danceId).map(figure => order.indexOf(figure.englishName));
    assert.deepEqual(listed, [...listed].sort((a, b) => a - b), danceId);
  }
  for (const entry of REVIEWED_COUNTS) assert.equal(reviewedFigureBySlug(entry.danceId, figureSlug(entry.englishName))?.counts, entry.counts, entry.englishName);
});
