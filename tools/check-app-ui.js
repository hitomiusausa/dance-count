#!/usr/bin/env node
// 新アプリの高齢者向け数値基準（仕様 §6 U1〜U15・Ruling 7・16・18・21・23・33・35・43・47）を Playwright で検査する。
// 前提: `npm run dev`（既定 http://localhost:5173/）を起動しておく。DC_BASE_URL で `npm run preview`（4174）にも向けられる。
// DC_ONLY=S5,S4 のように状態名の頭で絞れる（直しながらの確認用。完了の判定は絞らずに全部で）。
// 1件でも違反があれば終了コード1。U14（禁止語）は node --test 側（test/app/i18n.test.ts）。
import path from 'node:path';
import { AxeBuilder } from '@axe-core/playwright';
import { chromium } from 'playwright-core';
import { ABOUT_TEXT } from '../src/app/i18n/about.ts';
import { APP_MESSAGES } from '../src/app/i18n/messages.ts';
import { SCREENS, buildHash, showsTabs } from '../src/app/router/routes.ts';
import { reviewedFigures } from '../src/app/routines/reviewed-counts.ts';
import { figureDisplayName } from '../src/app/routines/figure-names.ts';
import { formatCounts } from '../src/app/lib/count-display.ts';
import { DANCE_PROFILES } from '../src/engine/dance-profiles.js';
import { UI_CHECK_ROUTINES as R, manyRoutines, openAfterSeed, seedRoutinesInPage } from './ui-check-routines.js';
import { UI_CHECK_VOICES as V, seedVoicePacksInPage } from './ui-check-voices.js';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:5173/';
const VIEWPORTS = [{ width: 375, height: 667 }, { width: 1280, height: 900 }];
const ZOOM_VIEWPORT = { width: 640, height: 450 }; // 1280×900 の 200% 拡大相当（U9）
const NARROW_VIEWPORT = { width: 320, height: 568 }; // 最も狭い端末（iPhone SE 第1世代）。横スクロールが出ない（段4から全画面）
// Fable 答え 2026-10-13 §2-4: iPhone SE の Safari 150%（「ぁあ」の 3 段目）相当。300px 未満は「ページが横に動かない・文字が切れない・主要ボタンが押せる」の 3 つだけ
const PHONE_ZOOM_VIEWPORT = { width: 250, height: 445 };
// 250 で「文字が切れない」（U10 の clipped text）も見る状態（48px・2 行・初期表示の数は問わない）
const ZOOM_TEXT_STATES = ['S0 初回', 'S0 前回あり', 'S1 前回あり', 'S1 前回あり・長いフィガー', 'S2 くわしく閉', 'S2 くわしく開'];
// iOS Safari のツールバー表示時の iPhone SE の見える高さ（Task 9 の実測）。主要操作が初期表示に入る（Ruling 71）。
// 全状態を reduced-motion 無しの 1 周だけ。期待値は opsSmall があればそれ（S5 の声チップはスクロールを許す。Ruling 71-6）、R47 は当てない
const SE_SAFARI_VIEWPORT = { width: 375, height: 548 };
// 段8 Task 12（final-review I1）: 種目タイルの名前の折れを見る幅（360＝Android の標準・320＝iPhone の拡大表示）
const TILE_VIEWPORTS = [{ width: 360, height: 640 }, NARROW_VIEWPORT];
// 段8（Ruling 102-1）: axe（@axe-core/playwright 4.13.0）で見る WCAG のタグ。375×667・no-preference・日本語の周だけ（ほかの周は同じ DOM の重複）。
// best-practice は入れない（U1〜U16 と重なる）。誤検出で止める規則は理由を書いてここに足す（裁定が要る）。今は空
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const AXE_DISABLED_RULES = [];
// 段8（Ruling 102-5）: 英語の周（375×548 と 320×568）。期待値は日本語と同じ。日本語の文そのものを見る項目（texts・行の名前など）は飛ばし、
// textKeys（鍵で書いた文）は表示言語の文で見る
const ENGLISH = 'en-US';
const LIMITS = Object.freeze({
  bodyFont: 18, minFont: 16, fineprintFont: 14, // U1
  primaryHeight: 56, playHeight: 72, playWidthRatio: 0.6, // U2
  tap: 48, tapGap: 8, // U3
  initialOps: 5, totalOps: 9, groupChoices: 10, moreSummaries: 1, // U4〜U6
  catalogChoices: 20, // U5 の例外: 照合済みの名前の一覧 [data-group][data-catalog] は選択肢でなく一覧（Ruling 54。src の FIGURE_CHOICES_MAX と同じ）
  contrastText: 4.5, contrastLarge: 3, contrastUi: 3, // U7
  motionMs: 300, // U8
  buttonLines: 2, // U10
  alertHeight: 120, // Ruling 23（375 幅）
  chipToDock: 8 // Ruling 47（S5: 声チップの下端〜▶ の帯の上端）
});

// 検査する画面と状態（Ruling 33・43）。kind は仕様 §3 の種別、ops は初期表示・total は画面全体の主要操作数の期待値（Ruling 18・35・36・40）。
// prepare は「前回あり」を実経路で作る（偽装クエリは使わない）。seed はブラウザの IndexedDB に検査用のルーティンを書く（Ruling 43）。
// steps は開いた後の人の操作（クリック・入力）。人の操作の後の状態は「初期表示 5 以下」を当てず全体（9 以下）だけを見る。
// 夜間便 B-1: 前回が S5 のルーティン（S5 の ▶ で保存される形）。種目の記憶（ワルツ）も持つ＝消えた時の落ち先
const LAST_ROUTINE = routine => ({ lastDanceId: 'waltz', lastKind: 'routine', lastRoutineId: routine.id, hints: { firstPlaybackDone: true } });
const RECEIVED_LONG = { ...R.longJa, id: 'r-uicheck-recvlong', source: 'received', provenance: { ...R.longJa.provenance, sourceKind: 'received' }, receivedFrom: { distributor: '山田', receivedAt: '2026-10-14T00:00:00.000Z' } };
const SEEDED = [R.waltz13, R.empty, R.longJa, R.longEn];
// 段5: 受け取る画面に渡す配布ファイル（tools/make-share-fixtures.js が作る。Ruling 87-3）
const SHARE = name => path.resolve(import.meta.dirname, '../test/fixtures/share', name);
const TOO_LARGE = { name: 'big.dancecount.txt', mimeType: 'text/plain', buffer: Buffer.alloc(20 * 1024 * 1024 + 1, 32) };
const LINE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/26.3.0';
// 段7（Ruling 92・95-3）: S12 と S1 の案内カードは端末で中身が変わる。UA と、Android の追加の案内・ホーム画面から開いた状態の偽物
const IOS_SAFARI_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1';
const IOS_CHROME_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const PLAYED = { lastDanceId: 'waltz', hints: { firstPlaybackDone: true } };   // 初めて鳴った後（S1 の案内カードの条件）
const S4_13 = `#/routines/${R.waltz13.id}/edit`;
// D57（Ruling 119-2）: U1 のタイルの行き先（監修済みのフィガーが 1 件以上なら F1、0 件なら S2）。表が空なら全部 S2＝今までと同じ
const figureNameJa = (danceId, englishName) => figureDisplayName(danceId, englishName, 'ja-JP');
const spaced = counts => formatCounts('waltz', counts);
const TILE_HREFS = Object.keys(DANCE_PROFILES).map(danceId => buildHash({ screen: reviewedFigures(danceId).length > 0 ? 'F1' : 'S2', params: { danceId } }));
// D57（Ruling 122-3）: requires: 'reviewed' の状態はワルツに監修済みのフィガーがある時だけ走る（無ければ「スキップ」と 1 行出して飛ばす）。
// 期待値はワルツの表から作る（1 行目＝基本・2 行目＝表の 1 件目）
const WALTZ_FIGURES = reviewedFigures('waltz');
const REVIEWED = WALTZ_FIGURES.length > 0;
const W1 = WALTZ_FIGURES[0];
const W_TWO_BARS = WALTZ_FIGURES.find(figure => figure.counts.length > 4) ?? W1;
// 一番長い日本語名（「フォーラウェイリバース＆スリップピボット」）: 前回の名前は 2 行で「…」（[data-ellipsis]・U10）
const W_LONGEST = REVIEWED ? WALTZ_FIGURES.reduce((longest, figure) => (figureNameJa('waltz', figure.englishName).length > figureNameJa('waltz', longest.englishName).length ? figure : longest)) : undefined;
const S5_13 = `#/routines/${R.waltz13.id}/play`;
const STATES = [
  // D56（Ruling 115-1・118-3）: 表紙 S0。扉「使う」「作る」＋行「設定」＝3。初めて鳴った後は「使う」の扉にくっついた「前回の練習 ▶ 続きから」で 4（C 案）。
  // 言語は [data-utility]、更新の帯の「更新する」は [data-alert-action]（数えない）。戻る・下タブは無い（U11）
  { name: 'S0 初回', hash: '#/', screen: 'S0', kind: 'cover', ops: 3, total: 3, absent: ['[data-resume]'], textKeys: ['coverUse', 'coverUseFor', 'coverMake', 'coverMakeFor', 'coverUseSub', 'coverMakeSub'] },
  { name: 'S0 前回あり', hash: '#/', screen: 'S0', kind: 'cover', settingsSeed: PLAYED, ops: 4, total: 4, firstView: ['[data-door="use"]', '[data-resume]', '[data-door="make"]', '.dc-cover-settings'],
    placed: [['[data-resume]', '[data-door="use"]']], textKeys: ['continueLast'] },
  // S2 を開いただけ（まだ鳴らしていない）では「続きから」は出さない（hints.firstPlaybackDone が立ってから。Ruling 115-1）
  { name: 'S0 前回あり・フィガー', hash: '#/', screen: 'S0', kind: 'cover', requires: 'reviewed', ops: 4, total: 4,
    settingsSeed: REVIEWED ? { lastDanceId: 'waltz', lastFigure: W1.slug, hints: { firstPlaybackDone: true } } : undefined, resumeName: REVIEWED ? `ワルツ · ${figureNameJa('waltz', W1.englishName)}` : undefined },
  // 夜間便 B-1（Ruling 124・監査 #2）: 前回が S5 のルーティンなら「ルーティン · {名前}」（受け取った物は「山田さんのルーティン · {名前}」）。名前は 2 行まで
  { name: 'S0 前回がルーティン', hash: '#/', screen: 'S0', kind: 'cover', seed: [R.waltz13], settingsSeed: LAST_ROUTINE(R.waltz13), ops: 4, total: 4,
    firstView: ['[data-door="use"]', '[data-resume]', '[data-door="make"]', '.dc-cover-settings'], resumeName: 'ルーティン · ワルツの練習', resumeLines: 2, textKeys: ['continueLast', 'resume'] },
  { name: 'S0 前回が受け取ったルーティン（長い名前）', hash: '#/', screen: 'S0', kind: 'cover', seed: [RECEIVED_LONG], settingsSeed: LAST_ROUTINE(RECEIVED_LONG), ops: 4, total: 4,
    firstView: ['[data-door="use"]', '[data-resume]', '[data-door="make"]'], resumeName: `山田さんのルーティン · ${RECEIVED_LONG.name}`, resumeLines: 2 },
  { name: 'S0 開いただけ', hash: '#/', screen: 'S0', kind: 'cover', prepare: '#/practice/waltz', ops: 3, total: 3, absent: ['[data-resume]'] },
  { name: 'S0 更新あり', hash: '#/?ui-state=update-ready', screen: 'S0', kind: 'cover', ops: 3, total: 3, alert: true, texts: ['新しい版があります。'], bannerAfter: '.dc-cover-settings' },
  // U1（S1 の ID のまま #/use。D56 Ruling 115-2）: 「先生の声で練習」カードを外した。主要操作は 種目群 1（前回カードがあれば 2）。左上「‹ 表紙」・下タブ 2 つ
  { name: 'S1 初回', hash: '#/use', screen: 'S1', kind: 'root', ops: 1, total: 1, tilesInView: true, absent: ['[data-teacher-card]'], textKeys: ['backToCover', 'tabFigures'], tileHrefs: TILE_HREFS },
  { name: 'S1 前回あり', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, prepare: '#/practice/waltz' },
  // D57（Ruling 121-2・121-4）: 前回がフィガーなら「ワルツ · ウィスク」。表に無い slug（訂正で外れた）は種目名だけ
  // 320 幅の英語では「Waltz · Closed Changes」が 2 行になり、最後の 2 タイルが下へ（320 は「横スクロール無し」の幅＝段8 発見 20。375×548 では入る）
  { name: 'S1 前回あり・フィガー', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, tilesMayScrollAt320: true, requires: 'reviewed', prepare: REVIEWED ? `#/practice/waltz/${W1.slug}` : undefined,
    resumeName: REVIEWED ? `ワルツ · ${figureNameJa('waltz', W1.englishName)}` : undefined },
  // 長い名前でも前回の名前は 2 行まで（3 行目以降は「…」。U10 は [data-ellipsis] を数えない・行数は R121 が見る）。全文は textContent に残る
  { name: 'S1 前回あり・長いフィガー', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, tilesMayScrollAt320: true, requires: 'reviewed',
    settingsSeed: REVIEWED ? { lastDanceId: 'waltz', lastFigure: W_LONGEST.slug } : undefined, resumeName: REVIEWED ? `ワルツ · ${figureNameJa('waltz', W_LONGEST.englishName)}` : undefined, resumeLines: 2 },
  { name: 'S1 前回がルーティン', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, tilesMayScrollAt320: true, seed: [R.waltz13], settingsSeed: LAST_ROUTINE(R.waltz13),
    resumeName: 'ルーティン · ワルツの練習', resumeLines: 2, textKeys: ['lastTime', 'resume'] },
  { name: 'S1 前回が受け取ったルーティン（長い名前）', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, tilesMayScrollAt320: true, seed: [RECEIVED_LONG], settingsSeed: LAST_ROUTINE(RECEIVED_LONG),
    resumeName: `山田さんのルーティン · ${RECEIVED_LONG.name}`, resumeLines: 2 },
  // 前回のルーティンが消えていれば種目の記憶（ワルツ）へ落ちる
  { name: 'S1 前回のルーティンが消えた', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, settingsSeed: LAST_ROUTINE({ id: 'r-uicheck-gone0001' }), resumeName: 'ワルツ' },
  { name: 'S1 前回のフィガーが表に無い', hash: '#/use', screen: 'S1', kind: 'root', ops: 2, tilesInView: true, settingsSeed: { lastDanceId: 'waltz', lastFigure: 'no-such-figure' }, resumeName: 'ワルツ' },
  // 段7（Ruling 90-3・90-7）: 更新の帯は S1 の最下段（種目タイルの下）。「更新する」は [data-alert-action]＝数えない。375×548 の初期表示（U12）は崩れない
  { name: 'S1 更新あり', hash: '#/use?ui-state=update-ready', screen: 'S1', kind: 'root', ops: 1, total: 1, tilesInView: true, alert: true,
    texts: ['新しい版があります。', '更新する'], bannerAfter: '.dc-tiles' },
  // 段7（Ruling 92-7・D42）: 初めて鳴った後の iPhone の Safari に、種目タイルの下の案内カード（行＋「閉じる」＝2）。PC には出さない。
  // 初期表示は 375 幅では 2 のまま（カードは下）・1280×900 ではカードまで見えて 4（上限内）なので ops は固定しない
  { name: 'S1 案内カード', hash: '#/use', screen: 'S1', kind: 'root', settingsSeed: PLAYED, userAgent: IOS_SAFARI_UA, total: 4, tilesInView: true,
    texts: ['ホーム画面に追加すると、アプリのように使えます', '閉じる'], placed: [['[data-install-card]', '.dc-tiles']] },
  { name: 'S1 案内カード（PC では出ない）', hash: '#/use', screen: 'S1', kind: 'root', settingsSeed: PLAYED, ops: 2, total: 2, tilesInView: true, absent: ['[data-install-card]'] },
  // D57（Ruling 119・120）: F1 ワルツ（監修済みが 1 件以上の時だけ）。基本の行 1・一覧 1＝2。見出しは種目名、基本の行は初期表示、行は表の件数
  { name: 'F1 ワルツ', hash: '#/figures/waltz', screen: 'F1', kind: 'focus', requires: 'reviewed', ops: 2, total: 2, textKeys: ['basicCount', 'tabFigures'],
    firstView: ['[data-basic]', '[data-list] [data-figure]'], figureRows: WALTZ_FIGURES.length, heading: 'ワルツ' },
  // U1 のタイルから（実経路）: 画面が替わると見出し h1 にフォーカス
  { name: 'F1（タイルから）', hash: '#/figures/waltz', via: { hash: '#/use', screen: 'S1' }, screen: 'F1', kind: 'focus', requires: 'reviewed', ops: 2, total: 2, focusHeading: true,
    steps: [{ click: '[data-group="dance"] a >> nth=0' }, { wait: '[data-screen="F1"]' }] },
  // Fable 答え 2026-10-13 §2-1: F1 の一番下の行（Playwright の click が行まで F1 を送る）→ S2 は上端から（「‹ 戻る」と名前が見える）
  { name: 'S2 F1 の下の行から', hash: REVIEWED ? `#/practice/waltz/${WALTZ_FIGURES.at(-1).slug}` : '#/practice/waltz', via: { hash: '#/figures/waltz', screen: 'F1' }, screen: 'S2', kind: 'focus',
    requires: 'reviewed', steps: [{ click: '[data-list] [data-figure] >> nth=-1' }, { wait: '[data-screen="S2"]' }], atTop: true, speedAndPlay: true },
  // S2 のフィガーの形: 見出しの下に「名前 · 型」・帯はフィガーの語・くわしくの「カウントの型」は無い（開くと 8＝ワルツは 1 減る）
  { name: 'S2 フィガー', hash: REVIEWED ? `#/practice/waltz/${W1.slug}` : '#/practice/waltz', screen: 'S2', kind: 'focus', requires: 'reviewed', ops: 5, speedAndPlay: true,
    texts: REVIEWED ? [`${figureNameJa('waltz', W1.englishName)} · ${spaced(W1.counts)}`] : [], strip: REVIEWED ? { labels: spaced(W1.counts) } : undefined },
  { name: 'S2 フィガー・くわしく開', hash: REVIEWED ? `#/practice/waltz/${W1.slug}` : '#/practice/waltz', screen: 'S2', kind: 'focus', requires: 'reviewed', openMore: true, total: 8,
    absent: ['[data-group="pattern"]'] },
  // 長い名前（「ヘジテーションチェンジ · 1 2 3 1 2 3」）は見出しの下で 1 行増え、375 幅では声チップが ▶ の帯の下に入る（スクロールで届く。S5 と同じ扱い＝Ruling 71-6）。
  // 速さと ▶ は初期表示のまま（speedAndPlay）なので ops は固定しない
  { name: 'S2 2 小節のフィガー', hash: REVIEWED ? `#/practice/waltz/${W_TWO_BARS.slug}` : '#/practice/waltz', screen: 'S2', kind: 'focus', requires: 'reviewed', speedAndPlay: true,
    strip: REVIEWED ? { labels: spaced(W_TWO_BARS.counts) } : undefined },
  // 表に無い slug は S2 の基本へ置き換え（Ruling 120-4）
  { name: 'S2 表に無いフィガー', hash: '#/practice/waltz/no-such-figure', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true, landsOn: '#/practice/waltz', strip: { labels: '1 2 3' } },
  { name: 'S2 くわしく閉', hash: '#/practice/waltz', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true, strip: { labels: '1 2 3' } },
  // D55（Ruling 114）: カウントの型の帯。ジャイブは 6 拍の型の 8 語（a も丸）・タンゴは S が Q の 2 倍の幅・320 でも 1 行
  { name: 'S2 ジャイブの帯', hash: '#/practice/jive', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true, strip: { labels: '1 2 3 a 4 5 a 6' } },
  { name: 'S2 タンゴの帯', hash: '#/practice/tango', screen: 'S2', kind: 'focus', ops: 5, speedAndPlay: true, strip: { labels: 'S S Q Q S', wide: [0, 2] } },
  { name: 'S2 くわしく開', hash: '#/practice/waltz', screen: 'S2', kind: 'focus', openMore: true, total: 9, voiceOffset: '±0 ms' },
  { name: 'S2 音が出ない', hash: '#/practice/waltz?ui-state=no-sound', screen: 'S2', kind: 'focus', speedAndPlay: true, alert: true },
  // 夜間便 A-4（Ruling 123・監査 #16）: 「自動ロック」は iPhone・iPad だけ。それ以外の端末は「画面が消えるまでの時間」
  { name: 'S2 画面が暗くなる案内', hash: '#/practice/jive?ui-state=wakelock-tip', screen: 'S2', kind: 'focus', speedAndPlay: true, alert: true, textKeys: ['wakeLockTipOther'] },
  { name: 'S2 画面が暗くなる案内（iPhone）', hash: '#/practice/jive?ui-state=wakelock-tip', screen: 'S2', kind: 'focus', userAgent: IOS_SAFARI_UA, speedAndPlay: true, alert: true, textKeys: ['wakeLockTip'] },
  // 段8（Ruling 100・仕様 §11）: 強制表示できなかった見た目。枠は 1 つ・速さと ▶ は初期表示のまま
  { name: 'S2 再生が止まった', hash: '#/practice/waltz?ui-state=stopped', screen: 'S2', kind: 'focus', speedAndPlay: true, alert: true,
    texts: ['再生が止まりました。もう一度 ▶ を押してください。'] },
  { name: 'S2 声が端末に無い', hash: '#/practice/waltz?ui-state=voice-missing', screen: 'S2', kind: 'focus', speedAndPlay: true, alert: true,
    texts: ['この声はまだ端末に入っていません。インターネットにつないで一度再生してください。'] },
  { name: 'S2 保存できなかった', hash: '#/practice/waltz?ui-state=save-failed', screen: 'S2', kind: 'focus', speedAndPlay: true, alert: true,
    texts: ['保存できませんでした。空き容量を確かめてください。', '閉じる'] },
  // Ruling 103-3（段4 Task 5）: 保存失敗の枠は「閉じる」で閉じる（ほかの案内を隠したままにしない）
  { name: 'S2 保存できなかった・閉じた', hash: '#/practice/waltz?ui-state=save-failed', screen: 'S2', kind: 'focus', total: 5,
    steps: [{ click: '[data-alert="save-failed"] [data-alert-action]' }], absent: ['[data-alert]'] },
  // D56（Ruling 115-2・118-3）: U2「使う › ルーティン」。「ファイルから受け取る」1・一覧 [data-list] 1。行を押すとすぐ鳴る（鳴らせない行は操作ではない）。
  // 一覧の下に「直す・消す時は表紙の「作る」から」の 1 行。編集・削除・配るは無い
  { name: 'U2 0件', hash: '#/use/routines', screen: 'U2', kind: 'root', ops: 1, total: 1, textKeys: ['receiveFromFile', 'editFromMake'], absent: ['[data-row-body]'] },
  { name: 'U2 3本（鳴らせない行あり）', hash: '#/use/routines', screen: 'U2', kind: 'root', seed: [R.waltz13, R.empty, R.longJa], ops: 2, total: 2,
    playRows: { play: 2, off: 1 }, textKeys: ['cannotPlayEmpty', 'editFromMake'], absent: ['[data-group="routine-actions"]', '.dc-primary'] },
  { name: 'U2 更新あり', hash: '#/use/routines?ui-state=update-ready', screen: 'U2', kind: 'root', ops: 1, total: 1, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1' },
  // 古い #/routines（D56 より前の案内・ブックマーク）は U2 に着き、ハッシュは #/use/routines に置き換わる（Ruling 116-1）
  { name: 'U2 古い経路から', hash: '#/routines', screen: 'U2', kind: 'root', ops: 1, total: 1, landsOn: '#/use/routines' },
  // D56（Ruling 115-3）: M0「作る」。行 3 つ（録音・ルーティン・配る。束にしない）＝3。行の下に「今どこまでできたか」の 1 行。左上「‹ 表紙」・下タブ無し
  { name: 'M0 未録音', hash: '#/make', screen: 'M0', kind: 'root', ops: 3, total: 3, texts: ['まだ録音していません', 'まだありません'], textKeys: ['makeIntro', 'makeShareSub'] },
  { name: 'M0 途中', hash: '#/make', screen: 'M0', kind: 'root', voiceSeed: [V.partialJa], seed: [R.waltz13], ops: 3, total: 3,
    texts: ['日本語 · 7 / 12 語 · 続きから', '1 本（受け取った物も直せます）'] },
  { name: 'M0 完成', hash: '#/make', screen: 'M0', kind: 'root', voiceSeed: [V.completeEn, V.receivedJa], seed: [R.waltz13, R.empty], ops: 3, total: 3,
    texts: ['英語 · 12 / 12 語 · 録音済み', '2 本（受け取った物も直せます）'] },
  // M1「作る › ルーティン」（今までの S3。D56 Ruling 115-3）: 「＋ 新しいルーティン」1・一覧 1。開いた行は「試聴」・編集・配る・削除（群は 1）。左上「‹ 戻る」（M0 へ）・下タブ無し
  { name: 'M1 0件', hash: '#/make/routines', screen: 'M1', kind: 'list', ops: 1, total: 1 },
  { name: 'M1 更新あり', hash: '#/make/routines?ui-state=update-ready', screen: 'M1', kind: 'list', ops: 1, total: 1, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1' },
  // 段5（Ruling 86-4）: 鳴らせる行には「配る」が編集と削除の間に（群は 1 つなので 3 のまま）
  { name: 'M1 2本・1本開', hash: '#/make/routines', screen: 'M1', kind: 'list', seed: [R.waltz13, R.empty], steps: [{ click: '.dc-row-head >> nth=0' }], total: 3,
    actions: { group: 'routine-actions', labels: ['試聴', '編集', '配る', '削除'] } },
  { name: 'M1 削除の確認', hash: '#/make/routines?ui-state=confirm-delete', screen: 'M1', kind: 'list', seed: [R.waltz13, R.empty], confirm: true },
  // 段7 最終レビュー m2（Ruling 30 の枠は 1 つ）: 新しい版があっても、消せなかった知らせが出ている間は更新の帯を出さない
  { name: 'M1 更新あり・消せなかった', hash: '#/make/routines?ui-state=update-ready', screen: 'M1', kind: 'list', seed: [R.waltz13, R.empty], failDeletes: true, alert: true,
    steps: [{ click: '.dc-row-head >> nth=0' }, { click: '[data-group="routine-actions"] button >> nth=3' }, { click: 'dialog[open] .dc-primary' }, { wait: '[data-alert="save-failed"]' }],
    absent: ['[data-alert="update"]'] },
  { name: 'S4 新規・種目選択', hash: '#/routines/new', screen: 'S4', kind: 'focus', ops: 1, total: 1 },
  { name: 'S4 0件', hash: `#/routines/${R.empty.id}/edit`, screen: 'S4', kind: 'focus', seed: SEEDED, ops: 3, total: 3 },
  { name: 'S4 13件・閉', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, total: 5 },
  { name: 'S4 13件・行を開', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, steps: [{ click: '.dc-figure-head >> nth=2' }], total: 8, patterns: 8, pressed: 1 },
  { name: 'S4 13件・くわしく開', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, openMore: true, total: 8 },
  { name: 'S4 不正カウント', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, invalidCounts: true, patterns: 8, pressed: 0,
    steps: [{ click: '.dc-add-tail' }, { fill: ['.dc-figure-form input >> nth=0', 'コントラチェック'] }, { fill: ['.dc-figure-form input >> nth=1', '12a3'] }] },
  // D19: 追加の行に既にある名前（1 件目＝templates[0] の 123）→ 複製専用の形。カウント欄・使える文字・形は出ず、注意は名前の欄の下、主ボタンは「1 2 3 で複製して追加」。
  // total 6＝閉じた 13 件の画面の 5 から「＋ フィガーを追加」が消え（追加の行を開いている間は出ない）、追加の行の 2 グループ（figure-form・count-patterns）が足される。
  // 下の帯（「▶ 全体を試聴」）は画面のキーボードが開いている間だけ隠す（D19・F6 round 4。判定は見えている高さ＝lib/keyboard.ts・単体テスト）。
  // Chromium にはキーボードが無いので、名前の欄にフォーカスがあっても帯は出たまま（dockWhileFocused: フォーカスで隠す作りに戻っていないか）
  { name: 'S4 同じ名前（追加）', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, total: 6, sameNameCopy: '1 2 3 で複製して追加', dockWhileFocused: true,
    steps: [{ click: '.dc-add-tail' }, { fill: ['.dc-figure-form input >> nth=0', R.waltz13.figures[0].name] }] },
  // D20・Ruling 54: 名前が空の追加の行は、名前の欄の下にその種目の照合済みフィガー全部（一覧＝[data-group="figure-names"][data-catalog]）。
  // カウントの欄・使える文字・形は名前が入ってから。total 7＝閉じた 13 件の 5 −「＋ フィガーを追加」＋ figure-form・figure-names・count-patterns。
  // 0 件のタンゴ（19 件＝一覧の最大）は 名前・種目「変える」＋3 グループ＝5（下固定の帯は追加の行の間は出ない）。
  { name: 'S4 追加の行・名前の一覧', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, steps: [{ click: '.dc-add-tail' }], total: 7,
    nameChoices: { count: 17, heading: 'ワルツのフィガー（17）', first: 'クローズドチェンジ' } },
  { name: 'S4 0件・追加の行', hash: `#/routines/${R.empty.id}/edit`, screen: 'S4', kind: 'focus', seed: SEEDED, steps: [{ click: '.dc-dock-button' }], total: 5,
    nameChoices: { count: 19, heading: 'タンゴのフィガー（19）', first: 'プログレッシブリンク' } },
  // 一覧の 17 番目（waltz13 は定義順の 0〜12 番を使うので未使用＝複製の形にならない。最長のワルツ名で 2 行の U10 も通す）
  // D52: 端末のほかのワルツにこの名前は無いが、監修済みの表（2026-10-13 転記）に 12&3 であるので、欄に 12&3・形が 1 つ押され・「目安のカウントです」
  { name: 'S4 追加の行・名前を選んだ後', hash: S4_13, screen: 'S4', kind: 'focus', seed: SEEDED, total: 6, patterns: 8, pressed: 1,
    autoFilled: { from: 'reviewed', counts: '12&3', name: 'フォーラウェイリバース＆スリップピボット' }, textKeys: ['countsFromReviewed'],
    steps: [{ click: '.dc-add-tail' }, { click: '[data-group="figure-names"] .dc-chip >> nth=16' }] },
  // D52（3d2f51e で監修表が 20 件になった後も「自動入力なし」を 1 つ持つ）: 0 件のタンゴの追加の行で、監修していない照合済みのフィガー（一覧の 5 番目
  // 「ナチュラルツイストターン」）を選ぶ → 欄は空・形は押されない・自動入力の行なし・「追加する」は押せない
  { name: 'S4 追加の行・監修していない名前', hash: `#/routines/${R.empty.id}/edit`, screen: 'S4', kind: 'focus', seed: SEEDED, total: 4, patterns: 8, pressed: 0,
    nameChosen: 'ナチュラルツイストターン', absent: ['[data-auto-counts]'],
    steps: [{ click: '.dc-dock-button' }, { click: '[data-group="figure-names"] .dc-chip >> nth=4' }] },
  // D52・Ruling 107・108: 2 本目のワルツ（waltzAuto）がこの名前を 12&3 で持つ → タップで欄に 12&3・形が 1 つ押され・「前に使ったカウントです」・
  // 「追加する」が押せる（名前をタップ → 追加するの 2 タップ）。操作の数は不変（6）。印の行は欄の aria-describedby に入る
  { name: 'S4 追加の行・前に使ったカウント', hash: S4_13, screen: 'S4', kind: 'focus', seed: [...SEEDED, R.waltzAuto], total: 6, patterns: 8, pressed: 1,
    autoFilled: { from: 'history', counts: R.waltzAuto.figures[0].counts, name: R.waltzAuto.figures[0].name }, textKeys: ['countsFromHistory'],
    steps: [{ click: '.dc-add-tail' }, { click: '[data-group="figure-names"] .dc-chip >> nth=16' }] },
  // 段5（Ruling 86-3）: 新しいルーティンの最初の保存の後に 1 回だけ「配る」で自分にも送れる、の枠（閉じる 1 つ・120px 以下）
  { name: 'S4 最初の保存の案内', hash: '#/routines/new', screen: 'S4', kind: 'focus', alert: true, total: 3, texts: ['ルーティンは「配る」でファイルにして、自分にも送っておけます。'],
    steps: [{ click: '.dc-tile >> nth=0' }, { fill: ['[aria-labelledby="dc-s4-name-label"]', '金曜のワルツ'] }, { press: ['[aria-labelledby="dc-s4-name-label"]', 'Enter'] },
      { wait: '[data-alert="backup-tip"]' }] },
  { name: 'S4 保存できなかった', hash: `${S4_13}?ui-state=save-failed`, screen: 'S4', kind: 'focus', seed: SEEDED, total: 5, alert: true,
    texts: ['保存できませんでした。空き容量を確かめてください。'] },
  { name: 'S4 小節の注意', hash: `#/routines/${R.waltzOffBar.id}/edit`, screen: 'S4', kind: 'focus', seed: [...SEEDED, R.waltzOffBar], total: 5, barNote: true },
  // ↑ ops は固定しない: 375×667 では注意の行のぶん「＋ フィガーを追加」が下の帯の下に隠れて初期表示 4、1280 幅では 5（「S4 13件・閉」と同じ扱い。U4 の上限 5 は当たる）
  // opsSmall: 375×548（Safari SE）では声チップが帯の下＝初期表示 4（Ruling 71-6）
  { name: 'S5 くわしく閉', hash: S5_13, screen: 'S5', kind: 'focus', seed: SEEDED, ops: 5, opsSmall: 4, speedAndPlay: true, chipToDock: true, singleLineHeading: true, strip: { labels: '1 2 3' } },
  // D55（Ruling 114-3）: 15 語のフィガーは 12 語ずつ（止まっている間は 1 頁目）
  { name: 'S5 長いフィガーの帯', hash: `#/routines/${R.waltzLongFigure.id}/play`, screen: 'S5', kind: 'focus', seed: [R.waltzLongFigure], ops: 5, opsSmall: 4, speedAndPlay: true,
    strip: { labels: '1 2 3 1 2 3 1 2 3 1 2 3' } },
  { name: 'S5 くわしく開', hash: S5_13, screen: 'S5', kind: 'focus', seed: SEEDED, openMore: true, total: 9 },
  { name: 'S5 音が出ない', hash: `${S5_13}?ui-state=no-sound`, screen: 'S5', kind: 'focus', seed: SEEDED, speedAndPlay: true, alert: true },
  { name: 'S5 再生が止まった', hash: `${S5_13}?ui-state=stopped`, screen: 'S5', kind: 'focus', seed: SEEDED, speedAndPlay: true, alert: true,
    texts: ['再生が止まりました。もう一度 ▶ を押してください。'] },
  { name: 'S5 声が端末に無い', hash: `${S5_13}?ui-state=voice-missing`, screen: 'S5', kind: 'focus', seed: SEEDED, speedAndPlay: true, alert: true,
    texts: ['この声はまだ端末に入っていません。'] },
  { name: 'S5 保存できなかった', hash: `${S5_13}?ui-state=save-failed`, screen: 'S5', kind: 'focus', seed: SEEDED, speedAndPlay: true, alert: true,
    texts: ['保存できませんでした。'] },
  { name: 'S5 40字の名前（全角）', hash: `#/routines/${R.longJa.id}/play`, screen: 'S5', kind: 'focus', seed: SEEDED, ops: 5, opsSmall: 4, speedAndPlay: true, chipToDock: true, singleLineHeading: true },
  { name: 'S5 40字の名前（英数字）', hash: `#/routines/${R.longEn.id}/play`, screen: 'S5', kind: 'focus', seed: SEEDED, ops: 5, opsSmall: 4, speedAndPlay: true, chipToDock: true, singleLineHeading: true },
  // D56（Ruling 115-4・118-3）: S6 は 言語・「困った時は」の束（追加の方法・音が鳴らない時）・「プライバシー・アプリについて」＝3（「声」は再生画面の声チップへ・
  // 「先生の方へ」は表紙の「作る」へ）。D61: 最後の束に見出し「このアプリについて」を足したので、375×548 では言語と「困った時は」の 2 つが初期表示に入り、
  // 「プライバシー・アプリについて」は下（スクロール）でもよい（opsSmall 2・初期表示の要素から外した）。375×667 以上は 3 つとも入る。左上「‹ 表紙」・下タブ無し
  { name: 'S6', hash: '#/settings', screen: 'S6', kind: 'list', ops: 3, opsSmall: 2, total: 3,
    linkGroups: { help: ['ホーム画面に追加する方法', '音が鳴らない時'], about: ['プライバシー・アプリについて'] },
    textKeys: ['settingsHelpHeading', 'settingsAboutHeading', 'settingsAbout', 'backToCover'], absent: ['a[href="#/voices"]', '[data-group="teacher"]', 'a[href="#/voices/record"]', 'a[href="#/share"]'],
    firstView: ['[data-group="language"]', 'a[href="#/help/install"]', 'a[href="#/help/sound"]'] },
  // 帯があっても 375×548 で言語と「困った時は」は初期表示に入る（「プライバシー・アプリについて」は下でもよい＝ops は固定しない）
  { name: 'S6 更新あり', hash: '#/settings?ui-state=update-ready', screen: 'S6', kind: 'list', total: 3, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1',
    firstView: ['[data-group="language"]', 'a[href="#/help/install"]', 'a[href="#/help/sound"]'] },
  // 段4（Ruling 60・63）＋段5（Ruling 86-1）＋D56（Ruling 115-5）: S7 は 一覧 1＋「ファイルから受け取る」1＝2。「自分の声を録音する」は表紙の「作る」へ移し、1 行の案内に。
  // 行を開くと voice-actions が足される。
  { name: 'S7 標準だけ', hash: '#/voices', screen: 'S7', kind: 'focus', ops: 2, total: 2, voiceRows: ['標準の声（英語）'], textKeys: ['recordFromMake'], absent: ['.dc-record-link'] },
  // 段8 Task 6 fix 1（レビュー I-1・Ruling 102-2）: S7 は読み込み中の形を通る。D56: S7 への入口は S2／S5 の声チップ（S1 の先生カード・S6 の「声」は無くなった。Ruling 115-5）。
  // フォーカスは見出し（main に落ちない）
  { name: 'S7（再生画面から）', hash: '#/voices', via: { hash: '#/practice/waltz', screen: 'S2' }, screen: 'S7', kind: 'focus', ops: 2, total: 2, focusHeading: true,
    steps: [{ click: 'a.dc-chip-row' }, { wait: '[data-screen="S7"]:not([data-loading])' }] },
  { name: 'S7 更新あり', hash: '#/voices?ui-state=update-ready', screen: 'S7', kind: 'focus', ops: 2, total: 2, alert: true, texts: ['新しい版があります。'], bannerAfter: 'h1' },
  // 段8（Ruling 103-2）: 声が多い生徒（受け取った 20＋自分の声 2＝標準と合わせて 23 行）。一覧は data-choices-max=24 まで。下のボタンはスクロールで届く（初期表示は固定しない）
  { name: 'S7 声が多い（受け取った 20 本）', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, ...V.received20], total: 2, rows: 23 },
  // 段8（Ruling 100-3）: 試聴で声が読めなかった時の枠（更新の帯はその間は出ない＝枠は 1 つ）
  { name: 'S7 声が端末に無い', hash: '#/voices?ui-state=voice-missing', screen: 'S7', kind: 'focus', ops: 2, total: 2, alert: true,
    texts: ['この声はまだ端末に入っていません。'] },
  // 段5 Task 10b・D56: 声が 3 本でも「ファイルから受け取る」は 375×548 の初期表示に入る
  { name: 'S7 3 本', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 2,
    voiceRows: ['標準の声（英語）', '自分の声（英語）', '山田さんの声', '自分の声（日本語） · 7 / 12 語'], firstView: ['.dc-receive-link'] },
  { name: 'S7 行を開', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 3,
    actions: { group: 'voice-actions', labels: ['配る', '削除'] },
    steps: [{ click: '[data-group="voice"] [role="radio"] >> nth=1' }, { click: '[data-group="voice"] [role="radio"] >> nth=1' }] },
  // D37: 受け取った声は配れない（開いた行は「削除」だけ）
  { name: 'S7 受け取った声を開', hash: '#/voices', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn, V.partialJa, V.receivedJa], total: 3,
    actions: { group: 'voice-actions', labels: ['削除'] },
    steps: [{ click: '[data-group="voice"] [role="radio"] >> nth=2' }, { click: '[data-group="voice"] [role="radio"] >> nth=2' }] },
  { name: 'S7 削除の確認', hash: '#/voices?ui-state=confirm-delete', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn], confirm: true },
  { name: 'S7 更新あり・消せなかった', hash: '#/voices?ui-state=update-ready', screen: 'S7', kind: 'focus', voiceSeed: [V.completeEn], failDeletes: true, alert: true,
    steps: [{ click: '[data-group="voice"] [role="radio"] >> nth=1' }, { click: '[data-group="voice"] [role="radio"] >> nth=1' },
      { click: '[data-group="voice-actions"] button >> nth=-1' }, { click: 'dialog[open] .dc-primary' }, { wait: '[data-alert="save-failed"]' }],
    absent: ['[data-alert="update"]'] },
  // S8（Ruling 59-6・63-2・D30）: 偽マイク（起動引数）で「録音をはじめる」まで実経路。録音そのものは smoke:voice。
  // マイク拒否は説明の画面の中の枠（説明 3 行の場所）で、言葉の 2 択と「録音をはじめる」は残る＝説明と同じ 2（D30）。
  { name: 'S8 説明', hash: '#/voices/record', screen: 'S8', kind: 'focus', ops: 2, total: 2, recordLanguage: 'en',
    steps: [{ wait: '.dc-dock .dc-primary:not([disabled])' }], absent: ['.dc-record-add-first'] },
  // 夜間便 A-1（Ruling 123・監査 #1a）: 日本語の声が途中（7/12）で、S7 の「続きを録音する」を通らずに来ても（M0 の行と同じ）日本語が選ばれている
  { name: 'S8 説明（日本語の途中あり）', hash: '#/voices/record', screen: 'S8', kind: 'focus', voiceSeed: [V.partialJa], ops: 2, total: 2, recordLanguage: 'ja-JP',
    steps: [{ wait: '.dc-dock .dc-primary:not([disabled])' }] },
  // D46: iPhone のブラウザで、まだ 1 語も録っていない時だけ「先にホーム画面に追加」の 1 行（16px・操作ではない）。375×548 でも言葉の 2 択と主ボタンは初期表示に入る
  { name: 'S8 iPhone Safari（未録音）', hash: '#/voices/record', screen: 'S8', kind: 'focus', userAgent: IOS_SAFARI_UA, ops: 2, total: 2, recordLanguage: 'en',
    steps: [{ wait: '.dc-record-add-first' }], textKeys: ['recordAddFirst'],
    firstView: ['[data-group="record-language"]', '.dc-dock .dc-primary'] },
  // Ruling 72: 説明の 1 行は「すぐ「Slow」と言って」・説明と枠は同じ 60px の箱（枠が出ても丸が動かない）
  { name: 'S8 1 語目・未録音', hash: '#/voices/record', screen: 'S8', kind: 'focus', total: 2, recordButton: true, noPrevious: true, recordHintWord: 'Slow', recordSlot: 60,
    steps: [{ click: '[data-group="record-language"] [role="radio"] >> nth=0' }, { click: '.dc-dock .dc-primary' }, { wait: '[data-step="word"]' }] },
  // takeShownCompact: 600px 未満では録れた語の説明の 1 行を出さない・それ以外は出したまま（Ruling 71-7）
  { name: 'S8 8 語目から前の語へ', hash: '#/voices/record', screen: 'S8', kind: 'focus', voiceSeed: [V.partialJa], total: 4, takeShown: true, takeShownCompact: true,
    steps: [{ click: '[data-group="record-language"] [role="radio"] >> nth=1' }, { click: '.dc-dock .dc-primary' }, { wait: '[data-step="word"]' },
      { click: '.dc-record-dock .dc-button--secondary' }, { wait: '.dc-take' }] },
  // 段5（Ruling 86-2・D39）: 帯は「完了」「配る ›」＝5（上限）。初めての完成の画面にだけバックアップの 1 行。375×548 でも 5 つが入る
  { name: 'S8 完成', hash: '#/voices/record', screen: 'S8', kind: 'focus', voiceSeed: [V.completeEn], total: 5, doneName: '自分の声（英語）',
    texts: ['「配る」で作ったファイルを自分にも送っておくと、端末を替えても声を使えます。'],
    firstView: ['#dc-s8-name', '[data-group="compare"]', '.dc-record-again', '.dc-record-dock .dc-button--secondary', '.dc-record-dock .dc-primary'],
    steps: [{ click: '[data-group="record-language"] [role="radio"] >> nth=0' }, { click: '.dc-dock .dc-primary' }, { wait: '[data-step="done"]' }] },
  // D59: 合図（3・2・1・今）の間は丸の中に大きい数字と「やめる」（丸は押せる＝やめる）。録音中は「● 録音中」と縮む棒・箱に「約 2 秒で…」（丸は押せない）
  { name: 'S8 合図の間', hash: '#/voices/record?ui-state=rec-countdown', screen: 'S8', kind: 'focus', total: 2, recordButton: true, recordSlot: 60, recordPhase: 'countdown', recordHintWord: 'Slow' },
  { name: 'S8 録音中', hash: '#/voices/record?ui-state=rec-capture', screen: 'S8', kind: 'focus', total: 2, recordButton: true, recordSlot: 60, recordPhase: 'capture' },
  // D60: 英語の画面では語の下の小さい語（いち・に）を出さない。日本語の画面では出す（英語の声を録る時の「スロー」など）
  { name: 'S8 1 語目・日本語の声', hash: '#/voices/record', screen: 'S8', kind: 'focus', total: 2, recordButton: true, recordOther: true,
    steps: [{ click: '[data-group="record-language"] [role="radio"] >> nth=1' }, { click: '.dc-dock .dc-primary' }, { wait: '[data-step="word"]' }] },
  { name: 'S8 マイク拒否', hash: '#/voices/record?ui-state=mic-denied', screen: 'S8', kind: 'focus', alert: true, ops: 2, total: 2, recordLanguage: 'en' },
  { name: 'S8 声が入っていない', hash: '#/voices/record?ui-state=no-voice', screen: 'S8', kind: 'focus', alert: true, total: 2, recordButton: true, recordSlot: 60 },
  // 最終レビュー M3: 録れた語で枠が出ても、丸と波形・「聞く」は初期表示に入ったまま（375×548 では枠を進み具合の行に重ねる）。ui-state は声を書かない（M5）
  { name: 'S8 録れた語で声が入っていない', hash: '#/voices/record?ui-state=no-voice', screen: 'S8', kind: 'focus', voiceSeed: [V.completeEn], alert: true, total: 3,
    recordButton: true, takeShown: true, steps: [{ wait: '.dc-wave rect:nth-of-type(41)' }] },
  // 段8（Ruling 100・§11）: マイクが見つからない・使用中は説明の画面の枠（ボタン無し）。言葉の 2 択と「録音をはじめる」は残る
  { name: 'S8 マイクを使えない', hash: '#/voices/record?ui-state=mic-failed', screen: 'S8', kind: 'focus', alert: true, ops: 2, total: 2, recordLanguage: 'en',
    texts: ['マイクを使えませんでした。'] },
  { name: 'S8 保存できなかった', hash: '#/voices/record?ui-state=save-failed', screen: 'S8', kind: 'focus', alert: true, total: 2, recordButton: true, recordSlot: 60,
    texts: ['保存できませんでした。'] },
  { name: 'S8 非対応', hash: '#/voices/record?ui-state=no-recorder', screen: 'S8', kind: 'focus', alert: true, ops: 0, total: 0 },
  // D53: http（LAN の IP など）で開くと iOS は録音の口ごと隠す。枠の文は「https で開くと録音できます」（ブラウザを替えても録れないため）
  { name: 'S8 http で開いた', hash: '#/voices/record?ui-state=no-https', screen: 'S8', kind: 'focus', alert: true, ops: 0, total: 0,
    textKeys: ['recordNeedsHttps'], absent: ['[data-alert="no-recorder"]'] },
  // 段5（Ruling 82・87-2）: S9 は 名前・声・同意・ルーティン・「ファイルを作る」＝5（上限）。作った後は「案内文をコピー」が足されて 6。
  // firstView: 375×548 でも名前・声・同意・主ボタンが初期表示に入る（声を選んだ後＝人の操作の後なので ops ではなく要素で見る）。
  // 段5 Task 10b: 声の指定（S7 の「配る」）で来た時だけ 名前 → 声 → 同意 → ルーティン の並び（指定なしは ルーティン → 声）。via で S7 から実経路で開く
  { name: 'S9 声あり', hash: '#/share', via: { hash: '#/voices', screen: 'S7' }, screen: 'S9', kind: 'focus', seed: [R.waltz13], voiceSeed: [V.completeEn], total: 5, primaryDisabled: true,
    firstView: ['[data-group="distributor"]', '[data-group="share-voice"]', '.dc-consent-row', '.dc-dock .dc-primary'],
    steps: [{ click: '[data-group="voice"] [role="radio"] >> nth=1' }, { click: '[data-group="voice"] [role="radio"] >> nth=1' },
      { click: '[data-group="voice-actions"] button >> nth=0' }, { wait: '[data-screen="S9"]:not([data-loading])' }], focusHeading: true },
  // 段8 Task 12（D51・final-review m2）: 録音もルーティンも無い時は帯に「先に…と配れます。」の 1 行（操作は増やさない＝名前と主ボタン（押せない）の 2）
  // 夜間便 B-3（Ruling 124・監査 #5）: ルーティン 1 本・完成した自分の録音 1 つなら、開いた時に両方選ばれている。同意は既定にしない（押すまで主ボタンは押せない）
  { name: 'S9 声 1・ルーティン 1（既定）', hash: '#/share', screen: 'S9', kind: 'focus', seed: [R.waltz13], voiceSeed: [V.completeEn], total: 5, primaryDisabled: true,
    present: ['.dc-share-routine[aria-checked="true"]', '[data-group="share-voice"] [role="radio"]:nth-child(2)[aria-checked="true"]', '.dc-consent-box[aria-checked="false"]'] },
  { name: 'S9 何も無い', hash: '#/share', screen: 'S9', kind: 'focus', ops: 2, total: 2, primaryDisabled: true, textKeys: ['shareNothingYet'], firstView: ['.dc-dock-note'] },
  // Fable 答え 2026-10-13 §2-3: 途中の自分の声だけの時は「録音した声はまだありません。」ではなく進み具合と「そろうと配れる」（操作は増えない）
  { name: 'S9 録音が途中', hash: '#/share', screen: 'S9', kind: 'focus', seed: [R.waltz13], voiceSeed: [V.partialJa], ops: 3, total: 3, primaryDisabled: true,
    texts: ['日本語の声は 7 / 12 語まで録音ずみです。12 語そろうと配れます。'], firstView: ['[data-list]'] },
  { name: 'S9 録音なし', hash: '#/share', screen: 'S9', kind: 'focus', seed: [R.waltz13], ops: 3, total: 3, primaryDisabled: true, texts: ['録音した声はまだありません。'], firstView: ['[data-list]'] },
  // 段8 Task 6 fix 1（レビュー I-1）・D56: M0「配る（ファイルを作る）」から（S9 も読み込み中の形を通る）。フォーカスは上の行の名前（h1）
  { name: 'S9（作るから）', hash: '#/share', via: { hash: '#/make', screen: 'M0' }, screen: 'S9', kind: 'focus', seed: [R.waltz13], ops: 3, total: 3, primaryDisabled: true,
    focusHeading: true, steps: [{ click: 'a.dc-hub[href="#/share"]' }, { wait: '[data-screen="S9"]:not([data-loading])' }] },
  { name: 'S9 作った後', hash: '#/share', screen: 'S9', kind: 'focus', seed: [R.waltz13], voiceSeed: [V.completeEn], fakeShare: true, total: 6,
    texts: ['ファイルを送ったら、下の案内文も送ってください。', '生徒への案内文をコピー'], firstView: ['.dc-result', '.dc-share-done .dc-button'],
    steps: [{ fill: ['[data-group="distributor"] input', '山田'] }, { click: '[data-group="share-voice"] [role="radio"] >> nth=1' },
      { click: '.dc-consent-box' }, { click: '.dc-dock .dc-primary' }, { wait: '.dc-result' }] },
  // 夜間便 B-6（Ruling 124・監査 #9a）: 作った後、「案内文をコピー」の下にたたんだ「案内文を見る」（summary[data-more]＝主要操作に数えない）。開くと案内文そのもの
  { name: 'S9 作った後・案内文を見る', hash: '#/share', screen: 'S9', kind: 'focus', seed: [R.waltz13], voiceSeed: [V.completeEn], fakeShare: true, total: 6, openMore: true,
    present: ['.dc-share-done details[open] [data-instructions-view]'], textKeys: ['showInstructions', 'instructionsIphoneHead', 'instructionsStep1'],
    steps: [{ fill: ['[data-group="distributor"] input', '山田'] }, { click: '.dc-consent-box' }, { click: '.dc-dock .dc-primary' }, { wait: '.dc-result' }] },
  // 段8（§11・段5）: 共有を拒まれた（navigator.share が NotAllowedError）→ 結果の 1 行と「ファイルを保存する」（自動では保存しない）。実経路
  { name: 'S9 共有を拒まれた', hash: '#/share', screen: 'S9', kind: 'focus', seed: [R.waltz13], voiceSeed: [V.completeEn], refuseShare: true, total: 7,
    texts: ['共有できませんでした。下の「ファイルを保存する」で保存できます。', 'ファイルを保存する'], firstView: ['.dc-result'],
    steps: [{ fill: ['[data-group="distributor"] input', '山田'] }, { click: '[data-group="share-voice"] [role="radio"] >> nth=1' },
      { click: '.dc-consent-box' }, { click: '.dc-dock .dc-primary' }, { wait: '.dc-result' }] },
  // §11「共有シート不可」: 共有できない端末（PC の Chrome＝headless）は保存に切り替え、ファイル名を出す（案内の枠は無し）
  { name: 'S9 共有できない端末', hash: '#/share', screen: 'S9', kind: 'focus', seed: [R.waltz13], voiceSeed: [V.completeEn], noShare: true, total: 6,
    texts: ['」を保存しました。LINE やメールに添付できます。'], firstView: ['.dc-result'],
    steps: [{ fill: ['[data-group="distributor"] input', '山田'] }, { click: '[data-group="share-voice"] [role="radio"] >> nth=1' },
      { click: '.dc-consent-box' }, { click: '.dc-dock .dc-primary' }, { wait: '.dc-result' }] },
  // S10（Ruling 83・87-2）: 選ぶ 1・確認 2（やめる・使う）・受け取った 1。ファイルは実経路（setInputFiles）。枠は 1 つ・中の操作は 1 つまで。
  { name: 'S10 選ぶ', hash: '#/receive', screen: 'S10', kind: 'focus', ops: 1, total: 1,
    texts: ['LINE で届いたファイルは、先に「"\u2060ファイル\u2060"に保存」しておくと、ここで選べます。', '選ぶ画面では「最近使った項目」にあります。'] },
  { name: 'S10 LINE の中', hash: '#/receive', screen: 'S10', kind: 'focus', userAgent: LINE_UA, alert: true, ops: 1, total: 1, texts: ['LINE の中で開いています。'] },
  { name: 'S10 確認', hash: '#/receive', screen: 'S10', kind: 'focus', total: 2, firstView: ['.dc-receive-dock .dc-primary'],
    texts: ['山田さんの声（日本語）· 12 語', 'ルーティン 2 本: ワルツのルーティン、タンゴ前のワルツ'],
    steps: [{ upload: ['input[type="file"]', SHARE('bundle-voice-routine.dancecount.txt')] }, { wait: '[data-step="confirm"]' }] },
  { name: 'S10 置き換え', hash: '#/receive', screen: 'S10', kind: 'focus', voiceSeed: [V.receivedJa], total: 2,
    texts: ['山田さんの声はすでにあります。「使う」で新しい方に置き換わります。'],
    steps: [{ upload: ['input[type="file"]', SHARE('bundle-voice-routine.dancecount.txt')] }, { wait: '[data-step="confirm"]' }] },
  { name: 'S10 読めない', hash: '#/receive', screen: 'S10', kind: 'focus', alert: true, total: 1,
    texts: ['このファイルは読めませんでした。先生に送り直してもらってください。（broken.txt）'],
    steps: [{ upload: ['input[type="file"]', SHARE('broken.txt')] }, { wait: '[data-alert="broken"]' }] },
  { name: 'S10 大きすぎ', hash: '#/receive', screen: 'S10', kind: 'focus', alert: true, total: 1, texts: ['このファイルは大きすぎて受け取れません。'],
    steps: [{ upload: ['input[type="file"]', TOO_LARGE] }, { wait: '[data-alert="too-large"]' }] },
  { name: 'S10 新しすぎ', hash: '#/receive', screen: 'S10', kind: 'focus', alert: true, total: 1, texts: ['新しいアプリで作られたファイルです。', '更新する'],
    steps: [{ upload: ['input[type="file"]', SHARE('too-new.txt')] }, { wait: '[data-alert="too-new"]' }] },
  // 段8（§11・段5）: 声が 20（別の先生の声 20 本）→ 選ぶ画面の枠。ルーティン 199 本＋2 本 → 確認に「1 本は受け取れません」。確認の画面の保存失敗。どれも実経路でファイルを選ぶ
  { name: 'S10 声が 20', hash: '#/receive', screen: 'S10', kind: 'focus', voiceSeed: V.received20, alert: true, total: 1,
    texts: ['声はすでに 20 あるので、受け取れません。'],
    steps: [{ upload: ['input[type="file"]', SHARE('bundle-voice-routine.dancecount.txt')] }, { wait: '[data-alert="voice-limit"]' }] },
  { name: 'S10 ルーティン 200 超', hash: '#/receive', screen: 'S10', kind: 'focus', seed: manyRoutines(199), bulkSeed: true, total: 2,
    texts: ['ルーティンは 200 本までなので、1 本は受け取れません。'],
    steps: [{ upload: ['input[type="file"]', SHARE('bundle-voice-routine.dancecount.txt')] }, { wait: '[data-step="confirm"]' }] },
  { name: 'S10 確認・保存できなかった', hash: '#/receive?ui-state=save-failed', screen: 'S10', kind: 'focus', alert: true, total: 2,
    texts: ['保存できませんでした。'],
    steps: [{ upload: ['input[type="file"]', SHARE('bundle-voice-routine.dancecount.txt')] }, { wait: '[data-alert="save-failed"]' }] },
  // §11「一部のルーティンが不正」: 読めない 1 本は名前を出し、声と読めた 1 本は受け取る（確認の画面）
  { name: 'S10 一部読めない', hash: '#/receive', screen: 'S10', kind: 'focus', total: 2,
    texts: ['ルーティン「こわれたルーティン」は読めませんでした。'],
    steps: [{ upload: ['input[type="file"]', SHARE('bundle-one-broken-routine.dancecount.txt')] }, { wait: '[data-step="confirm"]' }] },
  // Fable 答え 2026-10-13 §2-2: 声＋ルーティンの束はルーティンの在りかを 1 文で（出口は 1 つのまま・375×548 でも初期表示）
  // 夜間便 A-2（Ruling 123・監査 #3）: S10 にタブは無いので、文は「「使う」の下のタブ「ルーティン」」＝次の画面の場所を指す（鍵で ja/en とも見る）
  { name: 'S10 受け取った', hash: '#/receive', screen: 'S10', kind: 'focus', total: 1,
    texts: ['受け取りました', '「使う」で種目を選んで ▶ を押すと、山田さんの声で鳴ります。'], textKeys: ['receivedRoutinesToo'], firstView: ['.dc-dock .dc-primary'],
    steps: [{ upload: ['input[type="file"]', SHARE('bundle-voice-routine.dancecount.txt')] }, { wait: '[data-step="confirm"]' },
      { click: '.dc-receive-dock .dc-primary' }, { wait: '[data-step="done"]' }] },
  { name: 'S10 受け取った・声だけ', hash: '#/receive', screen: 'S10', kind: 'focus', total: 1, texts: ['「使う」で種目を選んで ▶ を押すと、山田さんの声で鳴ります。'],
    absentTexts: ['ルーティンは、「使う」の下のタブ「ルーティン」にあります。'],
    steps: [{ upload: ['input[type="file"]', SHARE('bundle-voice-only.dancecount.txt')] }, { wait: '[data-step="confirm"]' },
      { click: '.dc-receive-dock .dc-primary' }, { wait: '[data-step="done"]' }] },
  { name: 'S11', hash: '#/help/sound', screen: 'S11', kind: 'focus', textKeys: ['soundHelpSwitch', 'soundHelpRetry'] },
  // 段8（Ruling 98-4・102-2）: S6「困った時は」から S11 へ。画面が替わると見出しにフォーカス（VoiceOver は画面の名前から読む）
  { name: 'S11（設定から）', hash: '#/help/sound', via: { hash: '#/settings', screen: 'S6' }, screen: 'S11', kind: 'focus', focusHeading: true,
    steps: [{ click: 'a[href="#/help/sound"]' }, { wait: '[data-screen="S11"]' }] },
  // 段8 S13（Ruling 99-3）: 主要操作は mailto と「データを全て消す」の 2（375 幅の初期表示は文が長いので固定しない）。確認ダイアログは見た目だけ（消さない）
  { name: 'S13', hash: '#/about', screen: 'S13', kind: 'focus', total: 2,
    textKeys: ['aboutOperator', 'aboutNotOfficial', 'deleteAllData'], texts: ['info@kugainc.com'],
    firstView: ['.dc-about-contact'] },
  { name: 'S13 全て消す確認', hash: '#/about?ui-state=confirm-delete-all', screen: 'S13', kind: 'focus', confirm: true,
    texts: ['このアプリのデータを全て消しますか？', '録音した声・受け取った声・ルーティン・設定が消えます。'] },
  // 消せなかった（IndexedDB の clear が投げる）: 実経路で「データを全て消す」→「消す」→ 枠（ボタン無し）。S13 のまま
  { name: 'S13 消せなかった', hash: '#/about', screen: 'S13', kind: 'focus', failClears: true, alert: true, total: 2,
    steps: [{ click: '.dc-about-delete' }, { click: 'dialog[open] .dc-primary' }, { wait: '[data-alert="clear-failed"]' }],
    texts: ['消せませんでした。ブラウザの設定からサイトのデータを消すこともできます。'] },
  // 段7 S12（Ruling 92・95-3）: 端末ごとに 1 通りだけ。iPhone の Safari は手順 4 行（iOS 26.3 の実物どおり）と「引き継がれません」の 1 行（D43）
  { name: 'S12 iPhone Safari', hash: '#/help/install', screen: 'S12', kind: 'focus', userAgent: IOS_SAFARI_UA, ops: 0, total: 0,
    texts: ['画面の下の「…」を押します。', '「共有」を押します。', '「もっと見る」を押し、「ホーム画面に追加」を押します。', '右上の「追加」を押します。',
      '録音した声・受け取った声・ルーティンは、追加したアプリには引き継がれません。'], textKeys: ['installNotCarried'],
    firstView: ['.dc-install-steps li:last-child', '.dc-install-note'] },
  { name: 'S12 iPhone 他ブラウザ', hash: '#/help/install', screen: 'S12', kind: 'focus', userAgent: IOS_CHROME_UA, ops: 1, total: 1,
    texts: ['Safari で開くと、ホーム画面に追加できます。', 'アドレスをコピー'] },
  { name: 'S12 Android', hash: '#/help/install', screen: 'S12', kind: 'focus', userAgent: ANDROID_UA, installPrompt: true, ops: 1, total: 1, firstView: ['.dc-install .dc-primary'] },
  { name: 'S12 Android ボタンなし', hash: '#/help/install', screen: 'S12', kind: 'focus', userAgent: ANDROID_UA, ops: 0, total: 0, texts: ['右上の「⋮」を押します。', '「インストール」を押します。'] },
  { name: 'S12 PC', hash: '#/help/install', screen: 'S12', kind: 'focus', ops: 1, total: 1, texts: ['iPhone や Android で開くと、ホーム画面に追加できます。'] },
  // ホーム画面のアプリでは S6 の行から入る（S12 のアドレスで起動すると練習へ置き換える。段7 fix 1・レビュー I2 ＝下の状態）
  { name: 'S12 追加済み', hash: '#/help/install', via: { hash: '#/settings', screen: 'S6' }, screen: 'S12', kind: 'focus', userAgent: IOS_SAFARI_UA, standalone: true, ops: 0, total: 0,
    steps: [{ click: 'a[href="#/help/install"]' }, { wait: '[data-screen="S12"]' }], focusHeading: true,
    texts: ['このアプリはホーム画面から開いています。追加は済んでいます。'], absent: ['.dc-install-steps'] },
  // D56（Ruling 117-1）: ホーム画面のアプリの起動は表紙（S12 のアドレスで起動しても表紙へ置き換える）
  { name: 'ホーム画面のアプリを S12 のアドレスで起動', hash: '#/help/install', screen: 'S0', kind: 'cover', userAgent: IOS_SAFARI_UA, standalone: true, launchOnly: true, ops: 3, total: 3 }
];

// U9・320 の周で全画面を回る前に入れるルーティン（S4・S5 が開けるように）。199 本の状態（bulkSeed）は入れない（S4 新規が上限で S3 へ置き換わる）
const sharedSeed = () => [...new Map(STATES.filter(state => !state.bulkSeed).flatMap(state => state.seed ?? []).map(item => [item.id, item])).values()];
// 英語の周で飛ばす、日本語の文そのものを比べる項目（構造・数・大きさ・axe 以外）
const JAPANESE_ONLY_CHECKS = { voiceRows: undefined, actions: undefined, nameChoices: undefined, nameChosen: undefined, sameNameCopy: undefined,
  doneName: undefined, linkGroups: undefined, barNote: undefined };
const ONLY = (process.env.DC_ONLY ?? '').split(',').map(item => item.trim()).filter(Boolean);
const SKIPPED = STATES.filter(state => state.requires === 'reviewed' && !REVIEWED);
const CHECKED = (ONLY.length ? STATES.filter(state => ONLY.some(prefix => state.name.startsWith(prefix))) : STATES).filter(state => !SKIPPED.includes(state));

// 偽マイク（ファイル指定なし＝既定のビープ。S8 に「録音をはじめる」で入るため。既存の状態には無害。Ruling 63-4）
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }).catch(error => {
  console.error('Google Chrome を起動できませんでした。Chrome のインストールと開発サーバー（npm run dev）を確認してください。');
  console.error(error.message);
  process.exit(2);
});

let violations = 0;
for (const state of SKIPPED) console.log(`\n== ${state.name} : スキップ（監修表にワルツが無い。Ruling 122-3）`);
const report = (label, problems) => {
  console.log(`\n== ${label} : ${problems.length ? `${problems.length} 件の違反` : 'PASS'}`);
  for (const problem of problems) console.log(`  ${problem}`);
  violations += problems.length;
};

try {
  // 2 画面幅 × reduced-motion 有無 ＋ 375×548（Safari SE・no-preference だけ。Ruling 71-9）
  // 段8: ＋英語の 375×548・320×568（Ruling 102-5）。axe は 375×667・no-preference・日本語の周だけ（Ruling 102-1）
  const RUNS = [
    ...VIEWPORTS.flatMap(viewport => ['no-preference', 'reduce'].map(reducedMotion => ({ viewport, reducedMotion, compact: false, locale: 'ja-JP' }))),
    { viewport: SE_SAFARI_VIEWPORT, reducedMotion: 'no-preference', compact: true, locale: 'ja-JP' },
    { viewport: SE_SAFARI_VIEWPORT, reducedMotion: 'no-preference', compact: true, locale: ENGLISH },
    { viewport: NARROW_VIEWPORT, reducedMotion: 'no-preference', compact: true, locale: ENGLISH }
  ].map(run => ({ ...run, axe: run.locale === 'ja-JP' && run.viewport === VIEWPORTS[0] && run.reducedMotion === 'no-preference' }));
  for (const state of CHECKED) {
    for (const { viewport, reducedMotion, compact, locale, axe } of RUNS) {
      const english = locale === ENGLISH;
      const label = `${state.name} @ ${viewport.width}x${viewport.height}${compact ? ' (Safari SE)' : ''}${reducedMotion === 'reduce' ? ' reduced-motion' : ''}${english ? ' English' : ''}`;
      const context = await browser.newContext({ viewport, locale, reducedMotion, permissions: ['microphone'], ...(state.userAgent ? { userAgent: state.userAgent } : {}) });
      // 共有シートの代わり（Ruling 87-2）: 共有できる端末として、すぐ「送った」で返す（headless の Chrome は共有シートを出せない）
      if (state.fakeShare) await context.addInitScript(() => { navigator.canShare = () => true; navigator.share = () => Promise.resolve(); });
      // 段8: 共有シートの無い端末（PC の Chrome。headless の Chrome は canShare が真を返すことがあるので偽にする＝smoke:share の先生と同じ）
      if (state.noShare) await context.addInitScript(() => { navigator.canShare = () => false; });
      // 段8: 共有シートが拒む（Android の Chrome が種類で断る時と同じ NotAllowedError。§11「共有を拒まれた」）
      if (state.refuseShare) await context.addInitScript(() => { navigator.canShare = () => true; navigator.share = () => Promise.reject(new DOMException('refused (ui:check)', 'NotAllowedError')); });
      // 段7: Android の Chrome の「ホーム画面に追加」の案内（beforeinstallprompt）を、アプリが読み終えた後に 1 回だけ出す偽物
      if (state.installPrompt) await context.addInitScript(() => addEventListener('load', () => {
        const event = new Event('beforeinstallprompt', { cancelable: true });
        event.prompt = () => Promise.resolve();
        event.userChoice = Promise.resolve({ outcome: 'dismissed' });
        dispatchEvent(event);
      }));
      // 段7 最終レビュー m2: 端末から消せない（IndexedDB の delete が投げる）。S3／S7 の「保存できませんでした」を出す
      if (state.failDeletes) await context.addInitScript(() => {
        IDBObjectStore.prototype.delete = function () { throw new DOMException('delete refused (ui:check)', 'UnknownError'); };
      });
      // 段8: 端末のデータを消せない（IndexedDB の clear が投げる）。S13 の「消せませんでした。…」を出す
      if (state.failClears) await context.addInitScript(() => {
        IDBObjectStore.prototype.clear = function () { throw new DOMException('clear refused (ui:check)', 'UnknownError'); };
      });
      // 段7: ホーム画面から開いた状態（display-mode: standalone だけを真に。ほかの問い合わせは本物のまま）
      if (state.standalone) await context.addInitScript(() => {
        const real = window.matchMedia.bind(window);
        window.matchMedia = query => (query === '(display-mode: standalone)' ? { ...real(query), matches: true, media: query } : real(query));
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`U15 console: ${message.text()}`); });
      page.on('pageerror', error => consoleErrors.push(`U15 pageerror: ${error.message}`));
      if (state.prepare || state.seed || state.voiceSeed || state.settingsSeed) {
        await page.goto(BASE + (state.prepare ?? '#/'));
        await page.waitForSelector('[data-screen]');
      }
      if (state.seed) await page.evaluate(seedRoutinesInPage, state.seed);
      if (state.voiceSeed) await page.evaluate(seedVoicePacksInPage, state.voiceSeed);
      if (state.settingsSeed) await page.evaluate(seedSettingsInPage, state.settingsSeed);
      // via: 別の画面から実経路で入る状態（S7 の「配る」→ S9 など。一回限りの印は URL に無いので直接は開けない）
      // seed した時は新しく読み込む（動いているアプリにハッシュだけ渡すと、古い一覧で S4／S5 を S3 へ置き換える。段7 Task 1）
      if (state.seed || state.voiceSeed || state.settingsSeed) await openAfterSeed(page, BASE + (state.via?.hash ?? state.hash));
      else await page.goto(BASE + (state.via?.hash ?? state.hash));
      await page.waitForSelector(`[data-screen="${state.via?.screen ?? state.screen}"]:not([data-loading])`);
      for (const step of state.steps ?? []) {
        if (step.click) await page.locator(step.click).click();
        if (step.fill) await page.locator(step.fill[0]).fill(step.fill[1]);
        if (step.upload) await page.locator(step.upload[0]).setInputFiles(step.upload[1]);
        if (step.press) await page.locator(step.press[0]).press(step.press[1]);
        if (step.wait) await page.waitForSelector(step.wait);
      }
      if (state.openMore) await page.locator('summary[data-more]').click();
      if (state.confirm) await page.waitForSelector('dialog[open][data-confirm]');
      const opened = state.openMore ? await page.locator('details[open]').count() : 0;
      // atTop（Fable 答え 2026-10-13 §2-1）: 進む画面替えの後は上端。下の scrollTo(0, 0) より前に読む（audit の中では 0 に戻した後になる）
      const carried = state.atTop ? await page.evaluate(() => window.scrollY) : 0;
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      // steps はブラウザに渡さない（S10 大きすぎの 20MB のファイルを audit の引数に載せない）
      const textKeys = (state.textKeys ?? []).map(key => (english ? APP_MESSAGES.en[key] ?? ABOUT_TEXT.en[key] : APP_MESSAGES['ja-JP'][key] ?? ABOUT_TEXT['ja-JP'][key]));
      // 開いたままの状態（OQ11 の番人）: 別の画面を経ていない・操作していない・確認ダイアログでない
      const firstLoad = !(state.via || state.steps || state.openMore || state.confirm || state.prepare);
      const shown = english ? { ...state, ...JAPANESE_ONLY_CHECKS, texts: undefined, absentTexts: undefined } : state;
      // D56（Ruling 116-3）: 下タブは「使う」の U1・U2 だけ・「戻る」は表紙 S0 以外の全画面（種別の表は routes.ts の SCREENS が正）
      const layout = { tabsExpected: showsTabs(state.screen), backExpected: SCREENS[state.screen].kind !== 'cover', kindExpected: SCREENS[state.screen].kind };
      const landed = state.landsOn && !(await landOn(page, state.landsOn)) ? [`R116 the hash is ${await page.evaluate(() => location.hash)}, expected ${state.landsOn}`] : [];
      const problems = await page.evaluate(audit, { state: { ...shown, ...layout, textKeys, firstLoad, steps: undefined, compact, english, narrow: viewport === NARROW_VIEWPORT, afterAction: Boolean(state.openMore || state.steps) }, LIMITS, reducedMotion: reducedMotion === 'reduce' });
      // 段8（Ruling 102-1）: axe の違反（規則・重さ・最初の要素）
      if (axe) {
        const { violations: found } = await new AxeBuilder({ page }).withTags(AXE_TAGS).disableRules(AXE_DISABLED_RULES).analyze();
        for (const item of found) problems.push(`AXE ${item.id} (${item.impact}) ${item.nodes.length} × ${item.nodes[0]?.target.join(' ')}`);
      }
      const openFail = state.openMore && opened === 0 ? ['U4 "more" did not open'] : [];
      if (carried > 0) problems.push(`R102 scroll carried over: scrollY ${carried}`);
      report(label, [...openFail, ...landed, ...problems, ...consoleErrors]);
      await context.close();
    }
  }

  // U9: 200% 拡大相当で横スクロールが出ない・viewport meta に拡大禁止が無い
  const context = await browser.newContext({ viewport: ZOOM_VIEWPORT, locale: 'en-US' });
  const page = await context.newPage();
  const problems = [];
  // S4・S5 は検査用のルーティンが要る（無いと S3 へ置き換わる）。先に入れて読み直してから全画面を回る。
  await page.goto(BASE);
  await page.waitForSelector('[data-screen]');
  await page.evaluate(seedRoutinesInPage, sharedSeed());
  await page.reload();
  await page.waitForSelector('[data-screen]');   // アプリがハッシュの変化を聞き始めてから次のハッシュへ
  // launchOnly: ホーム画面のアプリの起動の置き換えだけを見る状態（この周はホーム画面のアプリを偽らないので、同じハッシュで S12 が出る。S1 は他の状態で回る）
  for (const state of CHECKED.filter(item => !item.launchOnly)) {
    await page.goto(BASE + state.hash);
    await page.waitForSelector(`[data-screen="${state.screen}"]:not([data-loading])`);
    if (state.landsOn) await landOn(page, state.landsOn);   // 置き換えが済んでから次の状態へ（済む前に次のハッシュへ行くと、遅れた置き換えが上書きする）
    const { scrollWidth, clientWidth, meta } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      meta: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? ''
    }));
    if (scrollWidth > clientWidth) problems.push(`U9 ${state.name}: horizontal scroll ${scrollWidth} > ${clientWidth}`);
    if (/user-scalable\s*=\s*(no|0)|maximum-scale/i.test(meta)) problems.push(`U9 ${state.name}: viewport meta blocks zoom "${meta}"`);
  }
  report(`U9 拡大 ${ZOOM_VIEWPORT.width}x${ZOOM_VIEWPORT.height}`, problems);
  await context.close();

  // 320 幅（最も狭い端末）でも横スクロールが出ない（ひとみうさの要件・段4から）。状態の初期表示を全部回る。
  const narrow = await browser.newContext({ viewport: NARROW_VIEWPORT, locale: 'ja-JP' });
  const narrowPage = await narrow.newPage();
  const narrowProblems = [];
  await narrowPage.goto(BASE);
  await narrowPage.waitForSelector('[data-screen]');
  await narrowPage.evaluate(seedRoutinesInPage, sharedSeed());
  await narrowPage.reload();
  await narrowPage.waitForSelector('[data-screen]');
  for (const state of CHECKED.filter(item => !item.launchOnly)) {
    await narrowPage.goto(BASE + state.hash);
    await narrowPage.waitForSelector(`[data-screen="${state.screen}"]:not([data-loading])`);
    if (state.landsOn) await landOn(narrowPage, state.landsOn);
    const { scrollWidth, clientWidth } = await narrowPage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    if (scrollWidth > clientWidth) narrowProblems.push(`320 ${state.name}: horizontal scroll ${scrollWidth} > ${clientWidth}`);
  }
  report(`横スクロール ${NARROW_VIEWPORT.width}x${NARROW_VIEWPORT.height}`, narrowProblems);
  await narrow.close();

  // Fable 答え 2026-10-13 §2-4: 250×445（Safari 150% 相当）を日英 2 周。全状態で横スクロールが出ない。ZOOM_TEXT_STATES は seed して開き、文字が切れない（U10 clipped）も見る
  for (const locale of ['ja-JP', ENGLISH]) {
    const zoom = await browser.newContext({ viewport: PHONE_ZOOM_VIEWPORT, locale });
    const zoomPage = await zoom.newPage();
    const zoomProblems = [];
    await zoomPage.goto(BASE);
    await zoomPage.waitForSelector('[data-screen]');
    await zoomPage.evaluate(seedRoutinesInPage, sharedSeed());
    await zoomPage.reload();
    await zoomPage.waitForSelector('[data-screen]');
    for (const state of CHECKED.filter(item => !item.launchOnly)) {
      await zoomPage.goto(BASE + state.hash);
      await zoomPage.waitForSelector(`[data-screen="${state.screen}"]:not([data-loading])`);
      if (state.landsOn) await landOn(zoomPage, state.landsOn);
      const { scrollWidth, clientWidth } = await zoomPage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      if (scrollWidth > clientWidth) zoomProblems.push(`250 ${state.name}: horizontal scroll ${scrollWidth} > ${clientWidth}`);
    }
    await zoom.close();
    for (const state of CHECKED.filter(item => ZOOM_TEXT_STATES.includes(item.name))) {
      const context = await browser.newContext({ viewport: PHONE_ZOOM_VIEWPORT, locale });
      const page = await context.newPage();
      if (state.prepare) {
        await page.goto(BASE + state.prepare);
        await page.waitForSelector('[data-screen]:not([data-loading])');
        await page.goto(BASE + state.hash);
      } else if (state.settingsSeed) {
        await page.goto(BASE + '#/');
        await page.waitForSelector('[data-screen]');
        await page.evaluate(seedSettingsInPage, state.settingsSeed);
        await openAfterSeed(page, BASE + state.hash);
      } else await page.goto(BASE + state.hash);
      await page.waitForSelector(`[data-screen="${state.screen}"]:not([data-loading])`);
      if (state.openMore) await page.locator('summary[data-more]').click();
      await page.evaluate(() => document.fonts.ready);
      const found = await page.evaluate(zoomTextAudit);
      zoomProblems.push(...found.map(problem => `250 ${state.name}: ${problem}`));
      await context.close();
    }
    report(`横スクロール・切れた字 ${PHONE_ZOOM_VIEWPORT.width}x${PHONE_ZOOM_VIEWPORT.height} ${locale}`, zoomProblems);
  }

  // 段8 Task 12（final-review I1）: 種目タイルの名前（S1・S4 の種目選び）が語の途中で折れない（2 行になる時は空白か <wbr> の所だけ）・はみ出さない。
  // 360（Android の標準）と 320（iPhone の拡大表示）× 日英。1 画面に 1 回の読み込みだけ（数秒）
  for (const viewport of TILE_VIEWPORTS) {
    for (const locale of ['ja-JP', ENGLISH]) {
      const tileContext = await browser.newContext({ viewport, locale });
      const tilePage = await tileContext.newPage();
      const tileProblems = [];
      // 前回カード（最も長い名前のヴィエニーズワルツを前回にする）の種目名と「続きから」も同じ目で見る（修正便の追加裁定）
      await tilePage.goto(BASE + '#/practice/vwaltz');
      await tilePage.waitForSelector('[data-screen="S2"]:not([data-loading])');
      for (const hash of ['#/use', '#/routines/new']) {
        await tilePage.goto(BASE + hash);
        await tilePage.waitForSelector('[data-screen]:not([data-loading]) .dc-tile b');
        await tilePage.evaluate(() => document.fonts.ready);
        if (hash === '#/use' && !(await tilePage.locator('[data-resume]').count())) tileProblems.push('I1 #/use the last-session card is not shown');
        tileProblems.push(...(await tilePage.evaluate(tileNameBreaks)).map(problem => `I1 ${hash} ${problem}`));
      }
      report(`種目名の折れ ${viewport.width}x${viewport.height} ${locale}`, tileProblems);
      await tileContext.close();
    }
  }
} finally {
  await browser.close();
}

process.exit(violations ? 1 : 0);

// D56（Ruling 116-1）: 古い経路の置き換え（replaceRoute）がハッシュに届くのを待つ。届いたら true
async function landOn(page, hash) {
  return page.waitForFunction(expected => location.hash.startsWith(expected), hash, { timeout: 5000 }).then(() => true, () => false);
}

// 250 幅の「文字が切れない」（audit の U10 clipped text と同じ判定だけ。ブラウザの中で動く）
function zoomTextAudit() {
  const issues = [];
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth) issues.push(`horizontal scroll ${de.scrollWidth} > ${de.clientWidth}`);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const elements = new Set();
  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (parent && walker.currentNode.textContent.trim() && parent.checkVisibility()) elements.add(parent);
  }
  for (const element of elements) {
    if (element.closest('[data-ellipsis]')) continue;
    if (element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflowX !== 'visible') {
      issues.push(`U10 clipped text ${element.scrollWidth} > ${element.clientWidth} ${element.tagName.toLowerCase()}.${element.className} "${element.textContent.trim().slice(0, 30)}"`);
    }
  }
  return issues;
}

// 段7: 設定（settings ストアの 'app'）を書く。ブラウザの中で動く（page.evaluate に渡す）。アプリが版上げした DB に書く
async function seedSettingsInPage(settings) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('dance-count-v2', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readwrite');
    transaction.objectStore('settings').put({ schemaVersion: 1, ...settings }, 'app');
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

// ---- ここから下はブラウザの中で動く（page.evaluate に関数ごと渡す。外の変数は使えない） ----
// 段8 Task 12（final-review I1）: 種目タイルの名前・前回カードの名前と「続きから」の文字ごとの行を測り、
// 行が変わる所の前が空白か、間に <wbr> がある時だけ許す
function tileNameBreaks() {
  const issues = [];
  // 前回カード: 「続きから」を 1 塊にしたぶん、ボタンがカードの内側に収まり、名前と重ならない
  const card = document.querySelector('.dc-resume');
  if (card) {
    const box = card.getBoundingClientRect();
    const padRight = parseFloat(getComputedStyle(card).paddingRight) || 0;
    const go = card.querySelector('.dc-resume-go')?.getBoundingClientRect();
    const text = card.querySelector('.dc-resume-text b')?.getBoundingClientRect();
    if (go && go.right > box.right - padRight + 0.5) issues.push(`the last-session button sticks out of the card (${Math.round(go.right)} > ${Math.round(box.right - padRight)})`);
    if (go && text && text.right > go.left + 0.5) issues.push(`the last-session name runs under the button (${Math.round(text.right)} > ${Math.round(go.left)})`);
  }
  for (const name of document.querySelectorAll('.dc-tile b, .dc-resume-text b, .dc-resume-go > span')) {
    if (name.scrollWidth > name.clientWidth + 1) issues.push(`"${name.textContent}" overflows its tile`);
    const chars = [];
    let wbrBefore = false;
    const walker = document.createTreeWalker(name, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.ELEMENT_NODE) { if (node.localName === 'wbr') wbrBefore = true; continue; }
      for (let offset = 0; offset < node.data.length; offset += 1) {
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        const rect = range.getBoundingClientRect();
        chars.push({ char: node.data[offset], top: rect.top, height: rect.height, wbrBefore });
        wbrBefore = false;
      }
    }
    for (let index = 1; index < chars.length; index += 1) {
      const previous = chars[index - 1];
      const current = chars[index];
      if (current.top - previous.top < previous.height / 2) continue;   // 同じ行
      if (/\s/.test(previous.char) || /\s/.test(current.char) || current.wbrBefore) continue;
      issues.push(`"${name.textContent}" breaks mid-word before "${chars.slice(index).map(item => item.char).join('')}"`);
    }
  }
  return issues;
}

function audit({ state, LIMITS, reducedMotion }) {
  const issues = [];
  const TARGETS = 'button, a[href], select, summary, input:not([type="hidden"]), label[for], [role=button], [role=switch], [role=radio]';
  const OPS = 'button, a[href], [role=button], [role=switch], [role=radio], input:not([type="hidden"]), select, summary, label[for]';
  const EXCLUDED_OPS = '[data-nav], [data-back], [data-utility], summary[data-more], [data-alert-action]';
  const FIXED_BARS = '[data-nav], .dc-dock';

  const visible = element => {
    if (element.closest('[hidden]')) return false;
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    // 閉じた <details> の中身は見えない（summary だけが見える）。Chrome は中身の rect を返すことがあるので明示的に除く
    const closed = element.closest('details:not([open])');
    if (closed && !closed.querySelector(':scope > summary')?.contains(element)) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const describe = element => `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? `.${element.className.trim().split(/\s+/).join('.')}` : ''} "${(element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24)}"`;
  const inFixedBar = element => Boolean(element.closest(FIXED_BARS));

  // 固定バーを除いた「見える範囲」（U4・U12・Ruling 21/23 の判定に使う）
  let usableTop = 0;
  let usableBottom = innerHeight;
  for (const bar of document.querySelectorAll(FIXED_BARS)) {
    if (!visible(bar)) continue;
    const rect = bar.getBoundingClientRect();
    if (rect.top <= 1) usableTop = Math.max(usableTop, rect.bottom);
    else usableBottom = Math.min(usableBottom, rect.top);
  }
  const fullyInView = element => {
    const rect = element.getBoundingClientRect();
    const top = inFixedBar(element) ? 0 : usableTop;
    const bottom = inFixedBar(element) ? innerHeight : usableBottom;
    return rect.top >= top - 0.5 && rect.bottom <= bottom + 0.5 && rect.left >= -0.5 && rect.right <= innerWidth + 0.5;
  };

  // U1 文字の大きさ
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textElements = new Set();
  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (parent && walker.currentNode.textContent.trim() && visible(parent)) textElements.add(parent);
  }
  for (const element of textElements) {
    const size = parseFloat(getComputedStyle(element).fontSize);
    const fineprint = element.closest('[data-fineprint]');
    if (size < LIMITS.fineprintFont - 0.01) issues.push(`U1 font ${size}px < ${LIMITS.fineprintFont} ${describe(element)}`);
    else if (!fineprint && size < LIMITS.minFont - 0.01) issues.push(`U1 font ${size}px < ${LIMITS.minFont} ${describe(element)}`);
    // D55: カウントの型の帯（ol.dc-beats の li）は本文ではなく丸の中の 1 字（aria-hidden。a・& と 9 個以上は 14・15px の data-fineprint）
    else if (element.closest('p, li, [data-body]') && !element.closest('.dc-beats') && size < LIMITS.bodyFont - 0.01) issues.push(`U1 body font ${size}px < ${LIMITS.bodyFont} ${describe(element)}`);
  }

  // U2 主要ボタン
  for (const element of document.querySelectorAll('.dc-primary')) {
    if (!visible(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.height < LIMITS.primaryHeight - 0.5) issues.push(`U2 primary height ${Math.round(rect.height)} < ${LIMITS.primaryHeight} ${describe(element)}`);
  }
  for (const element of document.querySelectorAll('[data-play]')) {
    if (!visible(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.height < LIMITS.playHeight - 0.5) issues.push(`U2 play height ${Math.round(rect.height)} < ${LIMITS.playHeight}`);
    if (rect.width < innerWidth * LIMITS.playWidthRatio - 0.5) issues.push(`U2 play width ${Math.round(rect.width)} < ${Math.round(innerWidth * LIMITS.playWidthRatio)}`);
  }

  // U3 タップ対象の大きさと間隔（固定バーと本文の間・別の固定バー同士は対象外。同じバーの中は測る）
  const targets = [...document.querySelectorAll(TARGETS)].filter(visible).filter(element => !(element.tagName === 'INPUT' && element.closest('label')));
  for (const element of targets) {
    const rect = element.getBoundingClientRect();
    if (rect.width < LIMITS.tap - 0.5 || rect.height < LIMITS.tap - 0.5) issues.push(`U3 tap ${Math.round(rect.width)}x${Math.round(rect.height)} ${describe(element)}`);
  }
  const modal = document.querySelector('dialog[open]:modal');
  for (let i = 0; i < targets.length; i += 1) {
    for (let j = i + 1; j < targets.length; j += 1) {
      const a = targets[i];
      const b = targets[j];
      if (a.contains(b) || b.contains(a)) continue;
      const barA = a.closest(FIXED_BARS);
      const barB = b.closest(FIXED_BARS);
      if (barA !== barB) continue; // 片方だけ固定バー、または別々の固定バー: スクロールで重なり方が変わるので対象外（同じバーの中は測る）
      // 開いた確認ダイアログ（showModal）の外は背景で押せない（inert）。ダイアログの中と外の組は測らない（375×548 で背景の行と重なる）
      if (modal && modal.contains(a) !== modal.contains(b)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const dx = Math.max(0, Math.max(ra.left, rb.left) - Math.min(ra.right, rb.right));
      const dy = Math.max(0, Math.max(ra.top, rb.top) - Math.min(ra.bottom, rb.bottom));
      const gap = Math.hypot(dx, dy);
      if (gap < LIMITS.tapGap - 0.5) issues.push(`U3 gap ${gap.toFixed(1)}px < ${LIMITS.tapGap} between ${describe(a)} and ${describe(b)}`);
    }
  }

  // U4 主要操作数（Ruling 18・35）: 同じ [data-group] は1つ、除外の要素は数えない。
  // 一覧 [data-list] は閉じた行（行の見出し）をまとめて1つ。開いた行の中身 [data-row-body] はその中の [data-group] ごと・グループ外は個別。
  const operationKey = element => {
    if (element.closest('[data-row-body]')) return element.closest('[data-group]') ?? element;
    return element.closest('[data-list]') ?? element.closest('[data-group]') ?? element;
  };
  const operations = scope => {
    const keys = new Set();
    for (const element of document.querySelectorAll(OPS)) {
      if (!visible(element) || element.closest(EXCLUDED_OPS)) continue;
      if (scope === 'initial' && !fullyInView(element)) continue;
      keys.add(operationKey(element));
    }
    return keys.size;
  };
  // Ruling 35: [data-list] は [data-group] の中にも [data-list] の中にも置かない
  for (const list of document.querySelectorAll('[data-list]')) {
    if (list.parentElement?.closest('[data-group], [data-list]')) issues.push(`U4 [data-list] must not be nested in a group or list ${describe(list)}`);
  }
  const initialOps = operations('initial');
  const totalOps = operations('all');
  // 「初期表示」は画面を開いた直後のこと。「くわしく」を開いた状態は人の操作の後なので全体（9以下）だけを見る（Ruling 31: 開くと8）。
  if (!state.afterAction && initialOps > LIMITS.initialOps) issues.push(`U4 initial operations ${initialOps} > ${LIMITS.initialOps}`);
  if (totalOps > LIMITS.totalOps) issues.push(`U4 total operations ${totalOps} > ${LIMITS.totalOps}`);
  if (state.total !== undefined && totalOps !== state.total) issues.push(`U4 total operations ${totalOps}, expected ${state.total}`);
  const expectedOps = state.compact && state.opsSmall !== undefined ? state.opsSmall : state.ops;   // 375×548 の例外（Ruling 71-6・9）
  if (expectedOps !== undefined && initialOps !== expectedOps) issues.push(`U4 initial operations ${initialOps}, expected ${expectedOps}`);

  // U5 選択肢の数・U6「くわしく」は1つ
  // 照合済みの名前の一覧（[data-catalog]）は選択肢でなく一覧なので 10 を当てず、黙って増えないよう catalogChoices を当てる（Ruling 54-4）
  for (const group of document.querySelectorAll('[data-group]')) {
    const choices = [...group.querySelectorAll(OPS)].filter(visible).length;
    // 段8（Ruling 103-2）: 上限が仕様で決まっている一覧（S7 の声＝24）は data-choices-max の値（それより多ければ違反）
    const limit = group.hasAttribute('data-choices-max') ? Number(group.dataset.choicesMax) : group.hasAttribute('data-catalog') ? LIMITS.catalogChoices : LIMITS.groupChoices;
    if (choices > limit) issues.push(`U5 group "${group.dataset.group}" has ${choices} choices > ${limit}`);
  }
  for (const select of document.querySelectorAll('select')) {
    if (select.options.length > LIMITS.groupChoices) issues.push(`U5 select has ${select.options.length} options`);
  }
  const summaries = document.querySelectorAll('summary[data-more]').length;
  if (summaries > LIMITS.moreSummaries) issues.push(`U6 ${summaries} "more" sections > ${LIMITS.moreSummaries}`);

  // U7 コントラスト（文字・操作の枠線）
  const linear = channel => { const c = channel / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const luminance = rgb => 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
  const parse = value => { const m = value.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { rgb: [+m[1], +m[2], +m[3]], alpha: m[4] === undefined ? 1 : +m[4] } : null; };
  const background = element => {
    for (let node = element; node; node = node.parentElement) {
      const parsed = parse(getComputedStyle(node).backgroundColor);
      if (parsed && parsed.alpha >= 0.9) return parsed.rgb;
    }
    return [255, 255, 255];
  };
  const ratio = (a, b) => { const la = luminance(a); const lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  for (const element of textElements) {
    const style = getComputedStyle(element);
    const color = parse(style.color);
    if (!color) continue;
    const size = parseFloat(style.fontSize);
    const large = size >= 24 && Number(style.fontWeight) >= 700;
    const needed = large ? LIMITS.contrastLarge : LIMITS.contrastText;
    const value = ratio(color.rgb, background(element));
    if (value < needed) issues.push(`U7 text contrast ${value.toFixed(2)} < ${needed} ${describe(element)}`);
  }
  for (const element of targets) {
    const style = getComputedStyle(element);
    const width = parseFloat(style.borderTopWidth);
    if (!(width > 0) || style.borderTopStyle === 'none') continue;
    const border = parse(style.borderTopColor);
    if (!border || border.alpha < 0.9) continue;
    const value = ratio(border.rgb, background(element.parentElement ?? element));
    if (value < LIMITS.contrastUi) issues.push(`U7 border contrast ${value.toFixed(2)} < ${LIMITS.contrastUi} ${describe(element)}`);
  }

  // U8 動き
  const durations = value => value.split(',').map(part => parseFloat(part) * (part.trim().endsWith('ms') ? 1 : 1000));
  for (const element of document.querySelectorAll('*')) {
    const style = getComputedStyle(element);
    for (const ms of [...durations(style.transitionDuration), ...durations(style.animationDuration)]) {
      if (reducedMotion ? ms > 0 : ms > LIMITS.motionMs) { issues.push(`U8 motion ${ms}ms ${describe(element)}`); break; }
    }
  }

  // U10 はみ出し・ボタン文言は2行まで（[data-ellipsis] は「…」で省略してよい要素。Ruling 47）
  for (const element of textElements) {
    if (element.closest('[data-ellipsis]')) continue;
    if (element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflowX !== 'visible') {
      issues.push(`U10 clipped text ${element.scrollWidth} > ${element.clientWidth} ${describe(element)}`);
    }
  }
  // 「ボタン文言は最大2行」を「各文字列2行まで・ボタン全体で折り返しは1回まで」と読む（アイコンや2段組みの配置は行に数えない）
  for (const button of targets) {
    if (!['BUTTON', 'A', 'SUMMARY'].includes(button.tagName)) continue;
    const texts = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    let wraps = 0;
    let reported = false;
    while (texts.nextNode()) {
      if (!texts.currentNode.textContent.trim()) continue;
      // [data-ellipsis]（2 行で「…」に切る名前）と、表紙の扉の説明 [data-description]（扉の名前ではなく説明。下の R115 が行数を見る）は数えない
      if (texts.currentNode.parentElement?.closest('[data-ellipsis], [data-description]')) continue;
      const range = document.createRange();
      range.selectNodeContents(texts.currentNode);
      const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size;
      wraps += Math.max(0, lines - 1);
      if (lines > LIMITS.buttonLines) { issues.push(`U10 button text ${lines} lines > ${LIMITS.buttonLines} ${describe(button)}`); reported = true; break; }
    }
    if (!reported && wraps > 1) issues.push(`U10 button text wraps ${wraps} times > 1 ${describe(button)}`);
  }

  // 段8（Ruling 97-6・U10 の読み替え）: 本文の最終行が「1 字＋句読点」だけにならない（「す。」だけの行）。
  // 2 行以上に折れる日本語の本文は句の境（phrased() の .dc-phrased）を持つ（句の境の無い文が keep-all なしで語の途中で折れていないか）
  const BODY_TEXT = 'p, li, .dc-hint, .dc-alert-text, .dc-dock-note, .dc-result, .dc-receive-help > div, .dc-receive-item, .dc-receive-note, '
    + '.dc-record-intro > div, .dc-consent-text, .dc-bar-note, .dc-dialog-title';
  const textLines = element => {
    const tops = new Map();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      for (let i = 0; i < node.textContent.length; i += 1) {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rect = [...range.getClientRects()].find(item => item.width > 0);
        if (!rect) continue;
        const top = Math.round(rect.top);
        const line = [...tops.keys()].find(key => Math.abs(key - top) <= 2) ?? top;
        tops.set(line, (tops.get(line) ?? '') + node.textContent[i]);
      }
    }
    return [...tops.entries()].sort((a, b) => a[0] - b[0]).map(([, text]) => text);
  };
  for (const element of document.querySelectorAll(BODY_TEXT)) {
    if (!visible(element) || element.closest('button, a, [data-ellipsis]')) continue;
    const lines = textLines(element);
    if (lines.length < 2) continue;
    const last = [...lines.at(-1).trim()];
    if (last.length === 1 || (last.length === 2 && /[。、．.,!?！？」）)]/.test(last[1]))) issues.push(`R97 orphan last line "${last.join('')}" ${describe(element)}`);
    if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(element.textContent) && !element.querySelector('.dc-phrased') && !element.closest('.dc-phrased')) {
      issues.push(`R97 wrapped Japanese text has no phrase breaks ${describe(element)}`);
    }
  }

  // 段8（Ruling 98-2）: › の行の束（[data-group] の中の .dc-link-row）は目に見える見出しを持つ（aria-labelledby で指す h2）。見出しの無い束は抜け道
  for (const group of document.querySelectorAll('[data-group]')) {
    if (!group.querySelector(':scope > .dc-link-row')) continue;
    const heading = document.getElementById(group.getAttribute('aria-labelledby') ?? '');
    if (!heading || !visible(heading) || !group.contains(heading)) issues.push(`R98 the row group "${group.dataset.group}" has no visible heading of its own`);
  }
  for (const [name, labels] of Object.entries(state.linkGroups ?? {})) {
    const rows = [...document.querySelectorAll(`[data-group="${name}"] > .dc-link-row .dc-link-label`)].map(label => label.textContent.trim());
    if (JSON.stringify(rows) !== JSON.stringify(labels)) issues.push(`R98 group "${name}" rows ${JSON.stringify(rows)}, expected ${JSON.stringify(labels)}`);
  }

  // U16（段8・Ruling 102-3）: ランドマークと名前。main はちょうど 1 つ・下タブの nav に名前・見出し h1 はちょうど 1 つ（見出しの無い画面を作らない）・
  // 名前の無い操作（文字も aria-label も aria-labelledby も無い）は 0・svg は aria-hidden か名前つき
  const mains = [...document.querySelectorAll('main')].filter(visible);
  if (mains.length !== 1) issues.push(`U16 ${mains.length} main landmarks, expected 1`);
  for (const navigation of document.querySelectorAll('nav[data-nav]')) if (!navigation.getAttribute('aria-label')?.trim()) issues.push('U16 the tab bar nav has no name');
  const headings = [...document.querySelectorAll('h1')].filter(visible);
  if (headings.length !== 1) issues.push(`U16 ${headings.length} h1 headings, expected 1`);
  const accessibleName = element => {
    const label = element.getAttribute('aria-label')?.trim();
    if (label) return label;
    const ids = element.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? [];
    const labelled = ids.map(id => document.getElementById(id)?.textContent?.trim() ?? '').join(' ').trim();
    if (labelled) return labelled;
    return (element.textContent ?? '').trim();
  };
  for (const element of document.querySelectorAll('button, a[href], [role=button], [role=radio], [role=switch], [role=checkbox]')) {
    if (!visible(element)) continue;
    if (!accessibleName(element)) issues.push(`U16 control without a name ${describe(element)}`);
  }
  for (const graphic of document.querySelectorAll('svg, img')) {
    if (!visible(graphic) || graphic.closest('[aria-hidden="true"]')) continue;
    if (!graphic.getAttribute('aria-label') && !graphic.getAttribute('alt')) issues.push(`U16 ${graphic.tagName.toLowerCase()} is neither hidden nor named ${describe(graphic.parentElement ?? graphic)}`);
  }

  // 段8（Ruling 101）: 起動の殻は最初の画面を描いたら消えている
  if (document.querySelector('.dc-boot')) issues.push('R101 the boot shell is still on the page');

  // U11 下タブと戻る（D56・Ruling 116-3: 下タブは U1・U2 だけ、戻るは表紙 S0 以外のすべて。種別の表 routes.ts と照合）
  const nav = document.querySelector('[data-nav]');
  const back = document.querySelector('[data-back]');
  const navVisible = Boolean(nav && visible(nav));
  const backVisible = Boolean(back && visible(back));
  if (state.kind !== state.kindExpected) issues.push(`U11 the state says kind "${state.kind}", routes.ts says "${state.kindExpected}"`);
  if (!state.tabsExpected && navVisible) issues.push('U11 tabs are visible on a screen without tabs');
  if (state.tabsExpected && !navVisible) issues.push('U11 tabs are missing on a "Use" root screen');
  if (!state.backExpected && backVisible) issues.push('U11 back button on the cover');
  if (state.backExpected) {
    if (!backVisible) issues.push('U11 back button missing');
    else {
      const rect = back.getBoundingClientRect();
      if (rect.height < LIMITS.tap - 0.5 || rect.width < LIMITS.tap - 0.5) issues.push('U11 back button smaller than 48px');
      if (!back.textContent.trim()) issues.push('U11 back button has no text');
    }
  }

  // U12 S1（U1）: 10種目が初期表示に入る（Ruling 16・D56 Ruling 118-3 の tilesInView）
  if (state.tilesInView && !(state.narrow && state.tilesMayScrollAt320)) {
    const tiles = [...document.querySelectorAll('[data-group="dance"] > *')];
    if (tiles.length !== 10) issues.push(`U12 expected 10 dance tiles, found ${tiles.length}`);
    tiles.forEach((tile, index) => { if (!fullyInView(tile)) issues.push(`U12 dance tile ${index + 1} is not fully in the first view (bottom ${Math.round(tile.getBoundingClientRect().bottom)} > ${Math.round(usableBottom)})`); });
  }

  // U13 固定バーが画面の端に接している（下タブ・再生帯。PC の上部タブは上端）
  for (const bar of document.querySelectorAll(FIXED_BARS)) {
    if (!visible(bar)) continue;
    const rect = bar.getBoundingClientRect();
    const touches = Math.abs(rect.bottom - innerHeight) <= 2 || Math.abs(rect.top) <= 2;
    if (!touches) issues.push(`U13 fixed bar not at an edge (top ${Math.round(rect.top)} bottom ${Math.round(rect.bottom)}) ${describe(bar)}`);
  }

  // Ruling 21・23: 速さと ▶ は初期表示に入る。警告の枠は 375 幅で 120px 以下、中の操作は1つ
  if (state.speedAndPlay) {
    for (const selector of ['[data-group="speed"]', '[data-play]']) {
      const element = document.querySelector(selector);
      if (!element || !fullyInView(element)) issues.push(`R21/23 ${selector} is not fully in the first view`);
    }
  }
  if (state.alert) {
    const alert = document.querySelector('[data-alert]');
    if (!alert || !visible(alert)) issues.push('R23 alert is not shown');
    else {
      if (innerWidth < 1024 && alert.getBoundingClientRect().height > LIMITS.alertHeight + 0.5) issues.push(`R23 alert height ${Math.round(alert.getBoundingClientRect().height)} > ${LIMITS.alertHeight}`);
      const actions = [...alert.querySelectorAll(OPS)].filter(visible);
      if (actions.length > 1 || actions.some(action => !action.matches('[data-alert-action]'))) issues.push('R23 alert has an action other than one [data-alert-action]');
    }
  }
  // Ruling 47: S5 は声チップの下端〜▶ の帯の上端に 8px 以上の余裕。見出し（ルーティン名）は1行
  if (state.chipToDock) {
    const chip = document.querySelector('.dc-chip-row');
    const dock = document.querySelector('.dc-dock');
    if (chip && dock && innerWidth < 1024 && innerHeight >= 600) {   // 600px 未満（Safari SE）は声チップのスクロールを許す（Ruling 71-6・9）
      const room = dock.getBoundingClientRect().top - chip.getBoundingClientRect().bottom;
      if (room < LIMITS.chipToDock - 0.5) issues.push(`R47 voice chip to dock ${Math.round(room)}px < ${LIMITS.chipToDock}`);
    }
  }
  if (state.singleLineHeading) {
    const heading = document.querySelector('h1');
    const lines = heading ? Math.round(heading.getBoundingClientRect().height / parseFloat(getComputedStyle(heading).lineHeight)) : 0;
    if (lines !== 1) issues.push(`R47 heading is ${lines} lines, expected 1`);
  }
  // Ruling 44: 確認ダイアログは質問1つ・ボタン2つ・取り消しが左
  if (state.confirm) {
    const dialog = document.querySelector('dialog[open][data-confirm]');
    if (!dialog) issues.push('R44 confirm dialog is not open');
    else {
      const buttons = [...dialog.querySelectorAll('button')].filter(visible);
      if (buttons.length !== 2) issues.push(`R44 dialog has ${buttons.length} buttons, expected 2`);
      const [left] = buttons.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      if (!left?.matches('[data-cancel]')) issues.push('R44 the cancel button is not on the left');
    }
  }
  // Ruling 36・38・50: 不正な文字は赤枠と、常設の「使える文字」の行が赤くなる（同じ文を 2 回出さない＝理由の行は無し）、「追加する」は押せない
  // （名前は検査用の 13 件に無いもの。同じ名前だと「複製して追加」になる。Ruling 50-2）
  if (state.invalidCounts) {
    if (!document.querySelector('.dc-input--bad[aria-invalid="true"]')) issues.push('R38 invalid counts are not marked');
    const hint = document.querySelector('.dc-hint.dc-hint--bad');
    if (!hint || !visible(hint)) issues.push('R50 the allowed-symbols line is not shown in red');
    if (document.querySelector('.dc-reason')) issues.push('R50 a reason line is shown under the red allowed-symbols line');
    const decide = [...document.querySelectorAll('.dc-figure-form .dc-primary')].pop();
    if (!decide?.disabled) issues.push('R36 "Add" is pressable with invalid counts');
  }
  // D19: 同じ名前の追加は複製専用の形。注意は名前の欄のすぐ下（aria-describedby も名前の欄）、カウント欄・使える文字・形は出さない、
  // 主ボタンは複製元のカウント入りで押せる。依頼（「してください」）は画面に 1 つまで（Ruling 52・Ruling 7）
  if (state.sameNameCopy) {
    const form = [...document.querySelectorAll('.dc-figure-form')].pop();
    const name = form?.querySelector('input');
    const notice = name?.nextElementSibling;
    if (!notice?.matches('.dc-reason') || !visible(notice)) issues.push('D19 the same-name notice is not right under the name field');
    else if (!(name.getAttribute('aria-describedby') ?? '').split(' ').includes(notice.id)) issues.push('D19 the name field is not described by the same-name notice');
    if (form?.querySelector('.dc-input--counts')) issues.push('D19 the counts field is shown while adding a copy');
    if (form?.querySelector('[data-group="count-patterns"] .dc-chip')) issues.push('D19 count patterns are shown while adding a copy');
    if (form?.querySelector('[data-allowed-symbols]')) issues.push('D19 the allowed-symbols line is shown while adding a copy');
    const button = form?.querySelector('.dc-primary');
    if (button?.textContent.trim() !== state.sameNameCopy) issues.push(`D19 the main button reads "${button?.textContent.trim()}", expected "${state.sameNameCopy}"`);
    if (button?.disabled) issues.push('D19 the copy button is not pressable');
    const requests = (document.body.innerText.match(/してください/g) ?? []).length;
    if (requests > 1) issues.push(`R52 ${requests} requests on one screen (Ruling 7)`);
  }
  // D19・F6 round 4: 帯を隠すのはキーボードが開いている間だけ。フォーカスだけでは隠さない（キーボードの無い Chromium では出たまま）
  if (state.dockWhileFocused) {
    const dock = document.querySelector('.dc-dock');
    const focused = document.activeElement;
    if (!focused?.matches('.dc-figure-form input')) issues.push('F6 the name field should still have focus in this state');
    if (!dock) issues.push('F6 the bottom dock is missing from the page');
    else if (!visible(dock)) issues.push('F6 the bottom dock is hidden without an on-screen keyboard (it must not hide on focus alone)');
  }
  // Ruling 53・D18: カウントの形はワルツで 8 個・欄と一致するチップだけ押された印（開いた行は 1 個・不正なカウントは 0 個）・文字はチップの中で折れない
  if (state.patterns !== undefined) {
    const chips = [...document.querySelectorAll('[data-group="count-patterns"] .dc-chip')].filter(visible);
    if (chips.length !== state.patterns) issues.push(`R53 ${chips.length} count patterns, expected ${state.patterns}`);
    const pressed = chips.filter(chip => chip.getAttribute('aria-pressed') === 'true').length;
    if (pressed !== state.pressed) issues.push(`R53 ${pressed} pressed count patterns, expected ${state.pressed}`);
    for (const chip of chips) if (chip.scrollWidth > chip.clientWidth) issues.push(`R53 count pattern "${chip.textContent}" overflows its chip`);
  }
  // D20・Ruling 54: 名前が空の追加の行は一覧だけ（件数・見出し・先頭）。カウントの欄・使える文字・形・候補は無く、主ボタンは押せない。
  // 一覧のグループは figure-form の兄弟（ほかの [data-group] の中に入れ子にしない）
  if (state.nameChoices) {
    const group = document.querySelector('[data-group="figure-names"][data-catalog]');
    const form = [...document.querySelectorAll('.dc-figure-form')].pop();
    if (!group || !visible(group)) issues.push('R54 the figure name list is not shown');
    else {
      const chips = [...group.querySelectorAll('.dc-chip')].filter(visible);
      if (chips.length !== state.nameChoices.count) issues.push(`R54 ${chips.length} figure names, expected ${state.nameChoices.count}`);
      const heading = group.querySelector('.dc-field-label')?.textContent.trim();
      if (heading !== state.nameChoices.heading) issues.push(`R54 the list heading reads "${heading}", expected "${state.nameChoices.heading}"`);
      if (chips[0]?.textContent.trim() !== state.nameChoices.first) issues.push(`R54 the first name is "${chips[0]?.textContent.trim()}", expected "${state.nameChoices.first}"`);
      if (group.parentElement?.closest('[data-group]')) issues.push('R54 the figure name list is nested in another group');
      if (chips.some(chip => chip.hasAttribute('aria-pressed'))) issues.push('R54 the figure names carry aria-pressed (they fill the name, they do not toggle)');
    }
    for (const [selector, what] of [['.dc-input--counts', 'counts field'], ['[data-allowed-symbols]', 'allowed-symbols line'],
      ['[data-group="count-patterns"] .dc-chip', 'count patterns'], ['.dc-suggestions', 'name suggestions']]) {
      if (form?.querySelector(selector)) issues.push(`R54 the ${what} is shown while the name is empty`);
    }
    if (!form?.querySelector('.dc-primary')?.disabled) issues.push('R54 "Add" is pressable while the name is empty');
  }
  // 一覧の名前をタップした後: 名前の欄に入り、一覧は消え、同じ所にカウントの欄と形が出る（カウントが空なので「追加する」はまだ押せない）
  if (state.nameChosen) {
    const form = [...document.querySelectorAll('.dc-figure-form')].pop();
    const name = form?.querySelector('input')?.value;
    if (name !== state.nameChosen) issues.push(`R54 the name field reads "${name}", expected "${state.nameChosen}"`);
    if (document.querySelector('[data-group="figure-names"]')) issues.push('R54 the figure name list is still shown after choosing a name');
    if (!form?.querySelector('.dc-input--counts')) issues.push('R54 the counts field did not appear after choosing a name');
    if (!form?.querySelector('.dc-primary')?.disabled) issues.push('R54 "Add" is pressable before the counts are entered');
  }
  // D52・Ruling 107・108: 一覧の名前をタップしたら前に使ったカウントが入り、欄の下（使える文字・理由の行の後）に印の 1 行。「追加する」が押せる
  if (state.autoFilled) {
    const form = [...document.querySelectorAll('.dc-figure-form')].pop();
    const name = form?.querySelector('input')?.value;
    if (!state.english && name !== state.autoFilled.name) issues.push(`D52 the name field reads "${name}", expected "${state.autoFilled.name}"`);
    const field = form?.querySelector('.dc-input--counts');
    if (field?.value !== state.autoFilled.counts) issues.push(`D52 the counts field reads "${field?.value}", expected "${state.autoFilled.counts}"`);
    const notes = [...(form?.querySelectorAll('[data-auto-counts]') ?? [])].filter(visible);
    if (notes.length !== 1 || notes[0].getAttribute('data-auto-counts') !== state.autoFilled.from) issues.push(`D52 expected one [data-auto-counts="${state.autoFilled.from}"] line, found ${notes.length}`);
    else {
      if (!(field?.getAttribute('aria-describedby') ?? '').split(' ').includes(notes[0].id)) issues.push('D52 the auto-counts line is not in the counts field aria-describedby');
      const symbols = form.querySelector('[data-allowed-symbols]');
      if (!symbols || !(symbols.compareDocumentPosition(notes[0]) & Node.DOCUMENT_POSITION_FOLLOWING)) issues.push('D52 the auto-counts line must come after the allowed-symbols line');
    }
    if (form?.querySelector('.dc-primary')?.disabled) issues.push('D52 "Add" is not pressable after the counts were filled in');
  }
  // D57（Ruling 119-2）: U1 のタイルの行き先
  if (state.tileHrefs) {
    const hrefs = [...document.querySelectorAll('[data-group="dance"] a')].map(tile => tile.getAttribute('href'));
    if (JSON.stringify(hrefs) !== JSON.stringify(state.tileHrefs)) issues.push(`R119 tile links ${JSON.stringify(hrefs)}, expected ${JSON.stringify(state.tileHrefs)}`);
  }
  // D57（Ruling 119-3・121-2）: F1 の行の数・見出し、前回の名前
  if (state.figureRows !== undefined) {
    const rows = [...document.querySelectorAll('[data-list] [data-figure]')].filter(visible);
    if (rows.length !== state.figureRows) issues.push(`R119 ${rows.length} figure rows, expected ${state.figureRows}`);
    const basic = document.querySelector('[data-basic]');
    if (basic?.parentElement?.closest('[data-list]')) issues.push('R119 the basic count row is inside the list');
  }
  if (state.heading && !state.english && document.querySelector('main h1')?.textContent.trim() !== state.heading) issues.push(`R119 the heading reads "${document.querySelector('main h1')?.textContent.trim()}", expected "${state.heading}"`);
  if (state.resumeLines) {
    const name = document.querySelector('[data-resume] .dc-resume-text b');
    const lines = name ? Math.round(name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight)) : 0;
    if (lines > state.resumeLines) issues.push(`R121 the last practice takes ${lines} lines > ${state.resumeLines}`);
  }
  if (state.resumeName && !state.english) {
    const name = document.querySelector('[data-resume] .dc-resume-text b')?.textContent.trim();
    if (name !== state.resumeName) issues.push(`R121 the last practice reads "${name}", expected "${state.resumeName}"`);
  }
  // D55（Ruling 114-2・114-3）: 帯は 1 行で枠からはみ出さない（320 でも）・丸は 12 まで・状態の期待（語の並び・S が Q の 2 倍）
  for (const strip of document.querySelectorAll('.dc-beats')) {
    if (!visible(strip)) continue;
    const cells = [...strip.children];
    if (strip.scrollWidth > strip.clientWidth + 1) issues.push(`R114 the count strip overflows ${strip.scrollWidth} > ${strip.clientWidth}`);
    if (cells.length > 12) issues.push(`R114 the count strip has ${cells.length} cells > 12`);
    if (new Set(cells.map(cell => Math.round(cell.getBoundingClientRect().top))).size > 1) issues.push('R114 the count strip wraps to a second line');
    if (state.strip) {
      const labels = cells.map(cell => cell.textContent.trim()).join(' ');
      if (labels !== state.strip.labels) issues.push(`R114 the strip reads "${labels}", expected "${state.strip.labels}"`);
      if (state.strip.wide) {
        const [wide, narrow] = state.strip.wide.map(index => cells[index]?.getBoundingClientRect().width ?? 0);
        if (!(wide > narrow * 1.6)) issues.push(`R114 a slow cell (${Math.round(wide)}px) is not about twice a quick cell (${Math.round(narrow)}px)`);
      }
    }
  }
  // D56（Ruling 115-1・115-3）: 表紙の扉の説明・M0 の行の状態の 1 行は 4 行まで（320 幅の日本語で 4 行。名前「使う」「作る」・行の名前は U10 の 2 行の規則のまま）
  for (const description of document.querySelectorAll('[data-description]')) {
    if (!visible(description)) continue;
    const lines = Math.round(description.getBoundingClientRect().height / parseFloat(getComputedStyle(description).lineHeight));
    if (lines > 4) issues.push(`R115 a door description is ${lines} lines > 4 ${describe(description)}`);
  }
  // D56（Ruling 115-2）: U2 の行は鳴らせる行だけがボタン（右端に「▶ 再生」の札）。鳴らせない行はボタンでなく、注意の 1 行を持つ
  if (state.playRows) {
    const play = [...document.querySelectorAll('[data-list] button.dc-row--play')].filter(visible);
    const off = [...document.querySelectorAll('[data-list] [data-row-off]')].filter(visible);
    if (play.length !== state.playRows.play) issues.push(`R115 ${play.length} playable rows, expected ${state.playRows.play}`);
    if (off.length !== state.playRows.off) issues.push(`R115 ${off.length} rows that cannot play, expected ${state.playRows.off}`);
    if (play.some(row => !row.querySelector('.dc-play-tag'))) issues.push('R115 a playable row has no "Play" tag');
    if (off.some(row => row.matches('button, a') || row.querySelector('button, a') || !row.querySelector('.dc-row-warn'))) issues.push('R115 a row that cannot play is pressable or has no note');
  }
  // Ruling 52・D16: 行の注意は 2 つで、依頼（「してください」）はちょうど 1 つ（Ruling 7 の機械判定）。全体の注意は一覧の下に 1 つ
  if (state.barNote) {
    const notes = [...document.querySelectorAll('.dc-row-note')].filter(visible);
    if (notes.length !== 2) issues.push(`R52 ${notes.length} row notes, expected 2`);
    const requests = notes.filter(note => note.textContent.includes('してください')).length;
    if (requests !== 1) issues.push(`R52 ${requests} row notes ask to edit, expected exactly 1 (Ruling 7)`);
    const barNotes = [...document.querySelectorAll('.dc-bar-note')].filter(visible);
    if (barNotes.length !== 1) issues.push(`R52 ${barNotes.length} mid-bar notes, expected 1`);
    else if (barNotes[0].closest('[data-list]')) issues.push('R52 the mid-bar note is inside the list');
  }
  if (state.voiceOffset) {
    const value = document.querySelector('[data-voice-offset]')?.textContent.trim();
    if (value !== state.voiceOffset) issues.push(`R62 voice timing reads "${value}", expected "${state.voiceOffset}"`);
  }
  // 段4（Ruling 60）: S7 の行の並び・選ばれているのは 1 つ・途中の声は選べない
  if (state.rows !== undefined) {
    const count = document.querySelectorAll('[data-group="voice"] .dc-voice-row').length;
    if (count !== state.rows) issues.push(`R103 ${count} voice rows, expected ${state.rows}`);
  }
  if (state.voiceRows) {
    const rows = [...document.querySelectorAll('[data-group="voice"] .dc-voice-name')].map(row => row.textContent.replace(/\s+/g, ' ').trim());   // 「7 / 12 語」の改行しない空白も 1 つの空白として
    if (JSON.stringify(rows) !== JSON.stringify(state.voiceRows)) issues.push(`R60 voice rows ${JSON.stringify(rows)}, expected ${JSON.stringify(state.voiceRows)}`);
    const checked = [...document.querySelectorAll('[data-group="voice"] [role="radio"][aria-checked="true"]')];
    if (checked.length !== 1) issues.push(`R60 ${checked.length} chosen voices, expected 1`);
    if (document.querySelector('[data-group="voice"] .dc-voice-partial[role="radio"]')) issues.push('R60 a partial voice is a radio (it must not be choosable)');
  }
  // 段4（Ruling 59）: 言葉の初期値は英語・録音ボタンは 144px で初期表示に入る・1 語目に「前の語」は無い・録れた語は波形と「聞く」が初期表示に入る・完成画面
  if (state.recordLanguage) {
    const checked = document.querySelector('[data-group="record-language"] [role="radio"][aria-checked="true"]');
    // 夜間便 A-1: 途中の声がある言葉が既定（日本語 7/12 だけ→日本語）。'en' は 1 つ目・'ja-JP' は 2 つ目
    const expected = document.querySelectorAll('[data-group="record-language"] [role="radio"]')[state.recordLanguage === 'ja-JP' ? 1 : 0];
    if (!checked || checked !== expected) issues.push(`R59 the record language does not start on ${state.recordLanguage}`);
  }
  if (state.recordButton) {
    const button = document.querySelector('.dc-rec');
    const rect = button?.getBoundingClientRect();
    if (!rect || Math.round(rect.width) !== 144 || Math.round(rect.height) !== 144) issues.push(`R59 record button ${rect ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : 'missing'}, expected 144x144`);
    else if (!fullyInView(button)) issues.push('R59 the record button is not fully in the first view');
  }
  if (state.noPrevious && document.querySelector('.dc-record-dock .dc-button--secondary')) issues.push('R59 "Previous" is shown on the first word');
  if (state.takeShown) {
    const take = document.querySelector('.dc-take');
    if (!take || !visible(take)) issues.push('R59 the waveform and "Play" are not shown for a recorded word');
    else if (!fullyInView(take)) issues.push('R59 the waveform and "Play" are not fully in the first view');
    if (document.querySelectorAll('.dc-wave rect').length !== 41) issues.push(`R59 waveform has ${document.querySelectorAll('.dc-wave rect').length} marks, expected 40 bars + the onset line`);
  }
  // Ruling 72: 説明の 1 行にその語が入る・説明と枠の箱は同じ高さ（丸が動かない）
  if (state.recordHintWord) {
    const hint = document.querySelector('.dc-record-hint');
    if (!hint || !visible(hint)) issues.push('R72 the record hint is not shown');
    else if (!hint.textContent.includes(state.recordHintWord)) issues.push(`R72 the record hint "${hint.textContent.trim()}" does not include "${state.recordHintWord}"`);
  }
  // 夜間便 A-3（Ruling 123・監査 #6）: 説明の 1 行の語（大きい語と同じ）は折らない 1 つの塊で、1 行に収まる（「スロ／ー」にしない）
  if ((state.recordOther || state.recordHintWord) && document.querySelector('.dc-record-hint:not(.dc-record-autostop)')) {
    const main = document.querySelector('.dc-record-main')?.textContent.trim() ?? '';
    const piece = [...document.querySelectorAll('.dc-record-hint .dc-nowrap')].find(item => item.textContent === main);
    if (!piece) issues.push(`A-3 the record hint has no no-wrap piece for "${main}"`);
    else if (piece.getClientRects().length !== 1) issues.push(`A-3 the word "${main}" in the record hint breaks across ${piece.getClientRects().length} lines`);
  }
  // D60: 語の下の小さい語は日本語の画面だけ（英語の画面に日本語の読みを出さない）
  if (state.recordOther || state.recordHintWord) {
    const other = document.querySelector('.dc-record-other');
    if (state.english && other) issues.push(`D60 the English screen shows the other reading "${other.textContent.trim()}"`);
    if (!state.english && !other) issues.push('D60 the Japanese screen lost the small other-language word');
  }
  if (state.english && document.querySelector('[data-screen="S8"][data-step="word"], [data-screen="S8"][data-step="intro"]')) {   // 完成画面の声の名前は打った名前のまま（対象外）
    const said = document.querySelector('main')?.innerText ?? '';
    if (/[\u3040-\u30ff]/.test(said) && !document.querySelector('[data-step="word"] .dc-record-main[lang="ja"]')) issues.push(`D60 the English S8 shows kana: "${said.match(/[^\n]*[\u3040-\u30ff][^\n]*/)?.[0]}"`);
  }
  // D59: 合図の間・録音中の見た目
  if (state.recordPhase === 'countdown') {
    const count = document.querySelector('.dc-rec-count');
    const cancel = document.querySelector('.dc-rec-cancel');
    if (!count || !visible(count) || count.textContent.trim() !== '3') issues.push(`D59 the countdown number is ${count ? `"${count.textContent.trim()}"` : 'missing'}, expected 3`);
    if (!cancel || !visible(cancel)) issues.push('D59 "Cancel" is not shown under the countdown');
    if (document.querySelector('.dc-rec')?.disabled) issues.push('D59 the record button must stay tappable (to cancel) during the countdown');
  }
  if (state.recordPhase === 'capture') {
    const bar = document.querySelector('.dc-rec-bar > span');
    const note = document.querySelector('.dc-record-slot[data-slot="capture"] .dc-record-autostop');
    if (!bar || !visible(bar.parentElement)) issues.push('D59 the shrinking bar is not shown while recording');
    else if (Math.round(bar.getBoundingClientRect().width) !== Math.round(bar.parentElement.getBoundingClientRect().width * 0.6)) issues.push(`D59 the bar is ${Math.round(bar.getBoundingClientRect().width)}px, expected 60% left`);
    if (!note || !visible(note)) issues.push('D59 "Stops automatically in about 2 seconds" is not shown while recording');
    if (!document.querySelector('.dc-rec')?.disabled) issues.push('D59 the record button must not be tappable while recording');
  }
  if (state.recordSlot !== undefined) {
    const slot = document.querySelector('.dc-record-slot');
    const height = slot ? Math.round(slot.getBoundingClientRect().height) : 0;
    if (height !== state.recordSlot) issues.push(`R72 the hint/alert box is ${height}px high, expected ${state.recordSlot}`);
  }
  // Ruling 71-7: 録れた語の説明の 1 行は 600px 未満では出さない（波形と「聞く」を初期表示に入れる）。それ以外は出したまま
  if (state.takeShownCompact) {
    const hint = document.querySelector('.dc-record-slot[data-slot="hint"]');
    const shown = Boolean(hint && visible(hint));
    if (innerHeight < 600 && shown) issues.push('R71 the record hint is shown for a recorded word below 600px');
    if (innerHeight >= 600 && !shown) issues.push('R71 the record hint is hidden for a recorded word at 600px or more');
  }
  // 段5（Ruling 82・83・87-2）: 要素が初期表示に入る・主ボタンが押せない／押せる・画面に出る文
  for (const selector of state.narrow ? [] : state.firstView ?? []) {   // 320 幅は「横スクロール無し・崩れない」の幅（初期表示の約束は 375×548）
    const element = document.querySelector(selector);
    if (!element || !visible(element)) issues.push(`R87 ${selector} is not shown`);
    else if (!fullyInView(element)) issues.push(`R87 ${selector} is not fully in the first view`);
  }
  if (state.primaryDisabled !== undefined) {
    const primary = document.querySelector('.dc-dock .dc-primary');
    if (!primary || primary.disabled !== state.primaryDisabled) issues.push(`R82 the main button is ${primary?.disabled ? 'disabled' : 'pressable'}, expected ${state.primaryDisabled ? 'disabled' : 'pressable'}`);
  }
  if (state.actions) {
    const labels = [...document.querySelectorAll(`[data-group="${state.actions.group}"] button`)].filter(visible).map(button => button.textContent.trim());
    if (JSON.stringify(labels) !== JSON.stringify(state.actions.labels)) issues.push(`R86 ${state.actions.group} ${JSON.stringify(labels)}, expected ${JSON.stringify(state.actions.labels)}`);
  }
  // 段7（Ruling 92-7）: 要素のすぐ前の兄弟（置き場）・出てはいけない要素
  for (const [selector, previous] of state.placed ?? []) {
    const element = document.querySelector(selector);
    if (!element) issues.push(`R92 ${selector} is not shown`);
    else if (!element.previousElementSibling?.matches(previous)) issues.push(`R92 ${selector} is not right after ${previous}`);
  }
  for (const selector of state.absent ?? []) if (document.querySelector(selector)) issues.push(`R92 ${selector} must not be shown here`);
  // 夜間便 B（Ruling 124）: その状態で必ずある要素（初期表示に入るかは問わない。選ばれている・開いている等の印を見る）
  for (const selector of state.present ?? []) if (!document.querySelector(selector)) issues.push(`R124 ${selector} is not there`);
  // 段7（Ruling 90-3）: 更新の帯の置き場（S1 は種目タイルのすぐ下・S3/S6/S7 は見出しのすぐ下）
  if (state.bannerAfter) {
    const banner = document.querySelector('[data-alert="update"]');
    if (!banner) issues.push('R90 the update banner is not shown');
    else if (!banner.previousElementSibling?.matches(state.bannerAfter)) issues.push(`R90 the update banner is not right after ${state.bannerAfter}`);
  }
  const said = document.body.innerText.replace(/\u00a0/g, ' ').replace(/\u2060/g, '');
  for (const text of [...(state.texts ?? []), ...state.textKeys]) {
    if (!said.includes(text.replace(/\u00a0/g, ' ').replace(/\u2060/g, ''))) issues.push(`R87 the screen does not say "${text}"`);
  }
  // 出てはいけない文（Fable 答え 2026-10-13 §2-2: 声だけの束にルーティンの 1 文は出ない）
  for (const text of state.absentTexts ?? []) if (said.includes(text)) issues.push(`R87 the screen must not say "${text}"`);
  // 段8（Ruling 102-2）: 画面が替わった後は、その画面の見出し（h1）にフォーカスがある
  if (state.focusHeading && !document.activeElement?.matches('main h1')) issues.push(`R102 focus is on ${document.activeElement?.tagName ?? 'nothing'}, expected the screen heading (main h1)`);
  // 段8 Task 6 fix 1（OQ11・レビュー M-1）: 開いたまま（画面を移っていない・操作していない）なら、フォーカスは動かさない（body のまま）
  if (state.firstLoad && document.activeElement !== document.body) issues.push(`R102 focus moved to ${describe(document.activeElement)} on first load, expected body`);
  if (state.doneName) {
    const value = document.querySelector('#dc-s8-name')?.value;
    if (value !== state.doneName) issues.push(`R59 the name field reads "${value}", expected "${state.doneName}"`);
    if ([...document.querySelectorAll('[data-group="compare"] button')].length !== 2) issues.push('R59 the comparison does not have 2 buttons');
  }
  return issues;
}
