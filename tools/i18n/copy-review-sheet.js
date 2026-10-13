#!/usr/bin/env node
// 段8（Ruling 96）: 文言の監修シート docs/app-v1/stage8-copy-review.md を作る。正本は src/app/i18n/messages.ts（と about.ts）のまま。
// 画面ごと・印つきの表にして、ひとみうさが見る時間を短くする。純粋な関数（下の export）＋最後に 1 回だけ書く。
// 「AI の一次案」「ひとみうさの直し」の 2 列だけは手で書いてよい（鍵で突き合わせて、作り直しても残す）。ほかの列は毎回作り直す。
// 使い方: npm run copy:sheet（messages.ts・about.ts を変えたら必ず。test/tools/copy-review-sheet.test.js が古いシートを落とす）
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '../..');
export const SHEET_PATH = 'docs/app-v1/stage8-copy-review.md';

// 鍵を参照するファイル → 画面（Ruling 96-1。画面の部品はその画面に数える）
export const SCREEN_FILES = Object.freeze({
  'src/app/screens/CoverScreen.tsx': 'S0',
  'src/app/screens/HomeScreen.tsx': 'S1',
  'src/app/screens/MakeScreen.tsx': 'M0',
  'src/app/screens/FigureListScreen.tsx': 'F1',
  'src/app/screens/PracticeScreen.tsx': 'S2',
  'src/app/screens/RoutinesScreen.tsx': 'U2',
  'src/app/screens/RoutineEditScreen.tsx': 'S4',
  'src/app/routines/FigureForm.tsx': 'S4',
  'src/app/screens/RoutinePlayScreen.tsx': 'S5',
  'src/app/screens/SettingsScreen.tsx': 'S6',
  'src/app/screens/VoicesScreen.tsx': 'S7',
  'src/app/screens/RecordVoiceScreen.tsx': 'S8',
  'src/app/screens/ShareScreen.tsx': 'S9',
  'src/app/screens/ReceiveScreen.tsx': 'S10',
  'src/app/screens/SoundHelpScreen.tsx': 'S11',
  'src/app/screens/InstallHelpScreen.tsx': 'S12',
  'src/app/screens/AboutScreen.tsx': 'S13'
});
export const INSTRUCTION_FILES = Object.freeze(['src/app/share/instructions.ts']);

export const GROUPS = Object.freeze([
  ['S0', 'S0 表紙'], ['S1', 'S1 使う › フィガー（種目）'], ['F1', 'F1 種目のフィガー'], ['S2', 'S2 再生'], ['U2', 'U2・M1 ルーティン（使う・作る）'], ['M0', 'M0 作る'], ['S4', 'S4 ルーティン編集'], ['S5', 'S5 ルーティン再生'],
  ['S6', 'S6 設定'], ['S7', 'S7 声'], ['S8', 'S8 自分の声を録音'], ['S9', 'S9 配る'], ['S10', 'S10 受け取る'],
  ['S11', 'S11 音が鳴らない時'], ['S12', 'S12 ホーム画面に追加する方法'], ['S13', 'S13 プライバシー・アプリについて'],
  ['common', '共通（複数の画面・部品）'], ['instructions', '生徒への案内文（S9 でコピーされる）'], ['errors', 'エラー・知らせ（仕様 §11）'],
  ['pageMeta', '公開ページのメタ（index.html の description・og:description。検索・共有の時に出る）']
]);

// 仕様 §11 の文（と段8で足す「消せませんでした」）。画面に関わらず「エラー」の節にまとめる。
export const ERROR_KEYS = Object.freeze([
  'noSoundTitle', 'noSoundBody', 'playbackStopped', 'voiceMissing', 'wakeLockTip', 'saveFailed', 'micDenied', 'micFailed', 'noRecorder',
  'noVoiceHeard', 'fileBroken', 'fileTooLarge', 'fileTooNew', 'voiceLimitReached', 'routinesOverLimit', 'routineUnreadable',
  'routinesUnreadableMore', 'openedInLine', 'shareRefused', 'clearAllFailed'
]);

// シートに載せない鍵（Ruling 96-5: 公開 URL の行は公開前に別途）
export const EXCLUDED_KEYS = Object.freeze(['instructionsApp']);

// 段4 M3 で挙がった「技術語の疑い」（言い換えの候補を考える材料。禁止語ではない）
export const TECH_WORDS = Object.freeze({
  ja: ['ブラウザ', 'アドレスバー', 'アドレス', 'ファイル', '版', 'Bluetooth', 'インストール', 'データ', 'サーバー', 'マイク'],
  en: ['browser', 'address bar', 'address', 'file', 'version', 'Bluetooth', 'install', 'data', 'server', 'microphone']
});
// 手動基準「本文の行の長さ 全角 35 字（英 70 字）」（仕様 §6）。{…} は 2 字の「○○」と数える
export const LENGTH_LIMITS = Object.freeze({ ja: 35, en: 70 });
// ひとみうさが英語を確かめ終えた鍵（ここに入れると「英語の初版」の印が外れる。監修の反映のコミットで足す）
export const REVIEWED_EN_KEYS = Object.freeze([]);

// 先頭に置く「先に決めてほしいこと」（Ruling 96-4・§3）。鍵がまだ無い行は出さない
export const TOP_DECISIONS = Object.freeze([
  { keys: ['share', 'shareRoutines', 'shareTitle'], text: '「配る / Share」のままか「送る / Send」にするか（段5 §0b-4）。決まったら関係する鍵をまとめて直す' },
  { keys: ['settingsHelpHeading'], text: 'S6 の見出し「困った時は / If something\'s wrong」（Ruling 98）' },
  { keys: ['aboutPrivacy1'], text: 'S13 の「このアプリについて」「プライバシー」の文は**法務確認待ち**（D47・D48。法的な約束は書いていない）' }
]);

const PLACEHOLDER = /\{\w+\}/g;
const QUOTE_RUN = /「[^「」]*」|“[^“”]*”/g;

// 鍵 → 画面の割り当て（純粋）。refs: { [file]: Set<key> }
export function assignGroups(keys, refs) {
  const groups = {};
  for (const key of keys) {
    if (ERROR_KEYS.includes(key)) { groups[key] = 'errors'; continue; }
    const screens = new Set();
    let instructions = false;
    let elsewhere = false;
    for (const [file, used] of Object.entries(refs)) {
      if (!used.has(key)) continue;
      if (SCREEN_FILES[file]) screens.add(SCREEN_FILES[file]);
      else if (INSTRUCTION_FILES.includes(file)) instructions = true;
      else elsewhere = true;
    }
    if (instructions && screens.size === 0 && !elsewhere) groups[key] = 'instructions';
    else if (screens.size === 1 && !elsewhere && !instructions) groups[key] = [...screens][0];
    else groups[key] = 'common';
  }
  return groups;
}

// ファイルの中の '鍵' "鍵" の文字列を拾う（translator.t('…') のほか、鍵の配列・三項演算子も拾える）
export function keysReferenced(source, keys) {
  const found = new Set();
  for (const match of source.matchAll(/['"`]([A-Za-z][A-Za-z0-9]*)['"`]/g)) if (keys.has(match[1])) found.add(match[1]);
  return found;
}

const visibleLength = text => [...text.replace(PLACEHOLDER, '○○').replace(/[ ⁠]/g, match => (match === '⁠' ? '' : ' '))].length;

// 印（純粋。Ruling 96-1）
export function marksFor(key, ja, en, reviewedEn = REVIEWED_EN_KEYS) {
  const marks = [];
  if (ja.includes('してください') || /\bplease\b/i.test(en)) marks.push('依頼');
  const jaPlain = ja.replace(QUOTE_RUN, '');
  const enPlain = en.replace(QUOTE_RUN, '');
  const tech = [...TECH_WORDS.ja.filter(word => jaPlain.includes(word)), ...TECH_WORDS.en.filter(word => new RegExp(`\\b${word}`, 'i').test(enPlain))];
  if (tech.length) marks.push(`技術語の疑い（${[...new Set(tech)].join('・')}）`);
  if (visibleLength(ja) > LENGTH_LIMITS.ja || visibleLength(en) > LENGTH_LIMITS.en) marks.push('長さ');
  if (!reviewedEn.includes(key)) marks.push('英語の初版');
  return marks;
}

const cell = text => String(text).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, '<br>')
  .replace(/ /g, '⍽').replace(/⁠/g, '');
const uncell = text => text.replace(/\\\|/g, '|').replace(/\\\\/g, '\\').trim();

// 前のシートから手で書く 2 列を鍵で拾う（純粋）
export function keptColumns(markdown) {
  const kept = new Map();
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('| ') || !line.includes('`')) continue;
    const cells = line.slice(2, -2).split(/(?<!\\) \| /);
    const key = cells[1]?.match(/^`([^`]+)`$/)?.[1];
    if (!key || cells.length !== 7) continue;
    const ai = uncell(cells[5]);
    const po = uncell(cells[6]);
    if (ai || po) kept.set(key, { ai, po });
  }
  return kept;
}

// シートの本文（純粋）。entries: [{ key, ja, en, group, legal }]
export function buildSheet(entries, kept = new Map()) {
  const lines = [
    '# 段8 文言の監修シート（自動生成）',
    '',
    '> 作り方: `npm run copy:sheet`（正本は `src/app/i18n/messages.ts` と `src/app/i18n/about.ts`。ここを直しても画面は変わらない）。',
    '> 手で書いてよいのは右の 2 列「AI の一次案」「ひとみうさの直し」だけ（鍵で突き合わせるので、作り直しても残る）。ほかの列は作り直すたびに上書きされる。',
    '> ひとみうさの見方: 「直し」の列に書くか、番号と鍵で言う（例「12 `share` は『送る』に」）。決まった物だけ `messages.ts` に写す（Ruling 96-3）。',
    '> 表の「⍽」は折らない空白（画面では普通の空白に見える）。',
    '',
    '## 先に決めてほしいこと',
    ''
  ];
  const keys = new Set(entries.map(entry => entry.key));
  TOP_DECISIONS.filter(item => item.keys.every(key => keys.has(key)))
    .forEach((item, index) => lines.push(`${index + 1}. ${item.text}（鍵 ${item.keys.map(key => `\`${key}\``).join('・')}）`));
  lines.push('', '## 印の意味', '',
    '- **依頼**: 「〜してください」／“Please”。手動基準は「1 画面に 1 つまで」（下の脚注に画面ごとの数）。',
    `- **技術語の疑い**: 60〜70代に通じにくいかもしれない語（${TECH_WORDS.ja.join('・')}）。「…」“…” の中の語（画面や iOS の実物の語）は数えない。`,
    `- **長さ**: ja ${LENGTH_LIMITS.ja} 字／en ${LENGTH_LIMITS.en} 字を超える（1 行に収まらない。{…} は 2 字と数える）。`,
    '- **英語の初版**: ひとみうさがまだ英語を確かめていない（確かめた鍵は道具の `REVIEWED_EN_KEYS` に足す）。',
    '- **法務確認待ち**: S13 の文（D47・D48）。公開の前に法務／ひとみうさが確かめる。', '');
  let number = 0;
  const requests = [];
  for (const [group, title] of GROUPS) {
    const rows = entries.filter(entry => entry.group === group);
    if (!rows.length) continue;
    lines.push(`## ${title}`, '', '| # | 鍵 | ja | en | 印 | AI の一次案 | ひとみうさの直し |', '|---|---|---|---|---|---|---|');
    let asks = 0;
    for (const entry of rows) {
      number += 1;
      const marks = marksFor(entry.key, entry.ja, entry.en);
      if (entry.legal) marks.unshift('法務確認待ち');
      if (marks.includes('依頼')) asks += 1;
      const keep = kept.get(entry.key) ?? { ai: '', po: '' };
      lines.push(`| ${number} | \`${entry.key}\` | ${cell(entry.ja)} | ${cell(entry.en)} | ${marks.join('・')} | ${cell(keep.ai)} | ${cell(keep.po)} |`);
    }
    lines.push('');
    requests.push([title, asks]);
  }
  lines.push('## 脚注: 節ごとの依頼の数（1 画面 1 つまでの材料。1 つの画面に同時に出る数ではない）', '');
  for (const [title, asks] of requests) lines.push(`- ${title}: ${asks}`);
  lines.push('');
  return lines.join('\n');
}

// 今の木から entries を作る（ファイルを読む）
export async function collectEntries(root = ROOT) {
  const { APP_MESSAGES } = await import(path.join(root, 'src/app/i18n/messages.ts'));
  const aboutPath = path.join(root, 'src/app/i18n/about.ts');
  const about = fs.existsSync(aboutPath) ? (await import(aboutPath)).ABOUT_TEXT : null;
  const keys = new Set(Object.keys(APP_MESSAGES.en).filter(key => !EXCLUDED_KEYS.includes(key)));
  const refs = {};
  for (const file of fs.globSync('src/app/**/*.{ts,tsx}', { cwd: root }).map(item => item.split(path.sep).join('/')).sort()) {
    if (file.startsWith('src/app/i18n/')) continue;
    refs[file] = keysReferenced(fs.readFileSync(path.join(root, file), 'utf8'), keys);
  }
  const groups = assignGroups([...keys], refs);
  const entries = [...keys].map(key => ({ key, ja: APP_MESSAGES['ja-JP'][key], en: APP_MESSAGES.en[key], group: groups[key], legal: false }));
  if (about) for (const key of Object.keys(about.en)) entries.push({ key, ja: about['ja-JP'][key], en: about.en[key], group: 'S13', legal: true });
  // 夜間便 A-5（Ruling 123・QW1）: 公開ページの説明は messages.ts に無い（index.html が正本）。「ja / en」の 1 行を読んで末尾の節に載せる
  const indexPath = path.join(root, 'index.html');
  const description = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8').match(/<meta name="description" content="([^"]*)"/)?.[1] : null;
  if (description) {
    const [ja, en = ''] = description.split(' / ');
    entries.push({ key: 'pageDescription', ja, en, group: 'pageMeta', legal: false });
  }
  return entries;
}

export async function renderSheet(root = ROOT) {
  const file = path.join(root, SHEET_PATH);
  const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  return buildSheet(await collectEntries(root), keptColumns(previous));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = await renderSheet();
  fs.writeFileSync(path.join(ROOT, SHEET_PATH), text);
  console.log(`wrote ${SHEET_PATH} (${text.split('\n').filter(line => /^\| \d+ \|/.test(line)).length} rows)`);
}
