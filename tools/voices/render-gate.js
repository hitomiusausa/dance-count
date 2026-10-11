#!/usr/bin/env node
// 聴感ゲートの道具（Ruling 67）: 候補パックごとに「語」と「カウントの流れ（クリック付き）」を Node だけで WAV に描画し、
// 英パックの同じ流れと並べて、ひとみうさが iPhone で答える 1 ページ（index.html）と gate-report.json を作る。
//   npm run voices:gate -- output/voices/<候補> [<候補>…] [--out output/voices/gate/<日付>]
//   聞き方: python3 -m http.server 4175 --directory output/voices/gate/<日付> → iPhone で http://<Mac の IP>:4175/
// ネットワークには出ない。public/ には書かない。output/timing-audit-before.json は読むだけ。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { DANCE_PROFILES } from '../../src/engine/dance-profiles.js';
import { atomicRhythmCases, auditCompiledTransitions } from '../../src/engine/dance-timing-audit.js';
import { compileRhythm } from '../../src/engine/rhythm-compiler.js';
import { COUNT_VOCABULARIES } from '../../src/engine/count-vocabularies.js';
import { REQUIRED_VOICE_KEYS } from '../../src/engine/recorded-voice-pack.js';
import { encodePcm16Wav, parsePcm16Wav } from './wav.js';
import { ENGLISH_PACK_DIR, TARGET_SAMPLE_RATE, dbfs, measureWord, peakOf } from './pipeline.js';

const root = path.resolve(import.meta.dirname, '../..');
const RATE = TARGET_SAMPLE_RATE;
const TICKS_PER_BEAT = 960;
export const PRE_ROLL_MS = 300;         // 頭の余白
export const TAIL_MS = 800;             // 最後の語の後の余白
export const WORD_GAP_MS = 500;         // 「語を 2 回」の間
export const REPETITIONS = 2;           // 流れは 2 回くり返す
export const OVERLAP_RISK_MS = 20;      // audit-all-dance-timing.js と同じ「重なり注意」の閾値
const CLICK_MS = 25;
const CLICK_HZ = { accent: 2000, beat: 1500 };
const CLICK_GAIN = 0.25;
const MIX_CEILING = 0.95;

// 5 つの型 × 練習の速さと試合の速さ（最速）＝ 10 本。12 語が全部どこかで鳴る（テストで固定）。
export const GATE_CASES = Object.freeze([
  { danceId: 'waltz', counts: '123' },
  { danceId: 'tango', counts: DANCE_PROFILES.tango.templates[0] },   // SSQQS（スロー・クイック）
  { danceId: 'chacha', counts: '234&1' },                             // アンド
  { danceId: 'samba', counts: '1a2' },                                // ア
  { danceId: 'pasodoble', counts: '12345678' }                        // 4〜8
]);

export function gateTracks() {
  return GATE_CASES.flatMap(item => {
    const profile = DANCE_PROFILES[item.danceId];
    return [['practice', profile.practiceBpm], ['fast', profile.competitionBpm.max]].map(([speed, bpm]) => ({
      id: `${item.danceId}-${speed}`, danceId: item.danceId, dance: profile.name, counts: item.counts, bpm, speed, beatsPerBar: profile.beatsPerBar
    }));
  });
}

export async function loadPack(dir) {
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const words = {};
  for (const key of REQUIRED_VOICE_KEYS) {
    const word = manifest.words?.[key];
    if (!word) throw new Error(`${dir}: 「${key}」がありません`);
    const wav = parsePcm16Wav(await fs.readFile(path.join(dir, word.file)));
    if (wav.sampleRate !== RATE) throw new Error(`${dir}/${word.file}: ${RATE}Hz ではありません（先に voices:process）`);
    const measured = measureWord(wav.samples, wav.sampleRate);
    // 置く位置は manifest の onsetMs（アプリと同じ）。postOnsetMs などは実測
    words[key] = { samples: wav.samples, ...measured, measuredOnsetMs: measured.onsetMs, onsetMs: word.onsetMs };
  }
  return { dir, manifest, words };
}

function click(mix, at, accent) {
  const length = Math.round(CLICK_MS / 1000 * RATE);
  const hz = accent ? CLICK_HZ.accent : CLICK_HZ.beat;
  for (let index = 0; index < length && at + index < mix.length; index += 1) {
    if (at + index < 0) continue;
    mix[at + index] += CLICK_GAIN * (accent ? 1 : 0.7) * Math.sin(2 * Math.PI * hz * index / RATE) * Math.exp(-index / (length / 5));
  }
}

// 語の onset を拍に合わせて置く（render-subdivision-audio-review.js と同じ置き方。アプリの「onset を拍に」と同じ）
export function renderTrack(words, compiled, bpm, beatsPerBar, { clicks = true, repetitions = REPETITIONS } = {}) {
  const tickSeconds = 60 / bpm / TICKS_PER_BEAT;
  const totalTicks = compiled.durationTicks * repetitions;
  const mix = new Float32Array(Math.ceil((PRE_ROLL_MS / 1000 + totalTicks * tickSeconds + TAIL_MS / 1000) * RATE));
  const at = tick => Math.round((PRE_ROLL_MS / 1000 + tick * tickSeconds) * RATE);
  if (clicks) for (let beat = 0; beat * TICKS_PER_BEAT < totalTicks; beat += 1) click(mix, at(beat * TICKS_PER_BEAT), beat % beatsPerBar === 0);
  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    for (const event of compiled.events.filter(item => item.voiceKey)) {
      const word = words[event.voiceKey];
      const start = at(event.absoluteTick + repetition * compiled.durationTicks) - Math.round(word.onsetMs / 1000 * RATE);
      for (let index = 0; index < word.samples.length; index += 1) {
        const target = start + index;
        if (target >= 0 && target < mix.length) mix[target] += word.samples[index];
      }
    }
  }
  const peak = peakOf(mix);
  if (peak > MIX_CEILING) for (let index = 0; index < mix.length; index += 1) mix[index] *= MIX_CEILING / peak;
  return { samples: mix, preRollMs: PRE_ROLL_MS };
}

export function renderWordDemo(word) {
  const gap = Math.round(WORD_GAP_MS / 1000 * RATE);
  const out = new Float32Array(word.samples.length * 2 + gap);
  out.set(word.samples, 0);
  out.set(word.samples, word.samples.length + gap);
  return out;
}

const riskList = (compiled, bpm, postOnsetMs) => auditCompiledTransitions(compiled, bpm, postOnsetMs, { loop: true })
  .filter(item => item.overlapMs > OVERLAP_RISK_MS)
  .map(item => ({ from: item.from, to: item.to, gapMs: Math.round(item.gapMs), overlapMs: Math.round(item.overlapMs) }));

// audit-all-dance-timing.js と同じ数え方（原子ケース × 3 速の遷移の種類で、重なり 20ms 超）。基準の英語値と並べる。
export function danceAudit(postOnsetMs, baseline) {
  return Object.values(DANCE_PROFILES).map(profile => {
    const tempi = [profile.practiceBpm, profile.competitionBpm.min, profile.competitionBpm.max];
    const unique = new Map();
    for (const counts of atomicRhythmCases(profile)) {
      const compiled = compileRhythm({ danceId: profile.id, counts });
      for (const bpm of tempi) {
        for (const item of auditCompiledTransitions(compiled, bpm, postOnsetMs)) {
          const key = `${bpm}:${item.from}:${item.to}:${item.gapTicks}`;
          const prior = unique.get(key);
          if (!prior || item.overlapMs > prior.overlapMs) unique.set(key, item);
        }
      }
    }
    const collisionRiskTypes = [...unique.values()].filter(item => item.overlapMs > OVERLAP_RISK_MS).length;
    const base = baseline?.dances?.find(item => item.danceId === profile.id)?.collisionRiskTypes ?? null;
    return { danceId: profile.id, dance: profile.name, collisionRiskTypes, baseline: base, ok: base === null ? null : collisionRiskTypes <= base };
  });
}

function wordLabels(locale) {
  const vocabulary = String(locale ?? '').startsWith('ja') ? COUNT_VOCABULARIES['ja-JP'] : COUNT_VOCABULARIES.en;
  return Object.fromEntries(REQUIRED_VOICE_KEYS.map(key => [key, vocabulary.prompts[key][0]]));
}

const localDate = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export async function renderGate(candidateDirs, { outDir, englishDir = ENGLISH_PACK_DIR, now = new Date(), log = console.log } = {}) {
  if (!candidateDirs.length) throw new Error('候補のフォルダを 1 つ以上');
  const date = localDate(now);
  const target = path.resolve(outDir ?? path.join(root, 'output/voices/gate', date));
  await fs.mkdir(target, { recursive: true });
  const tracks = gateTracks();
  const compiledById = Object.fromEntries(tracks.map(track => [track.id, compileRhythm({ danceId: track.danceId, counts: track.counts })]));
  let baseline = null;
  try { baseline = JSON.parse(await fs.readFile(path.join(root, 'output/timing-audit-before.json'), 'utf8')); } catch { /* 基準が無ければ英パックの描画とだけ比べる */ }

  const english = await loadPack(path.resolve(englishDir));
  const englishId = english.manifest.id;
  const englishPost = Object.fromEntries(REQUIRED_VOICE_KEYS.map(key => [key, english.words[key].postOnsetMs]));
  for (const track of tracks) {
    await fs.writeFile(path.join(target, `${englishId}-${track.id}.wav`), encodePcm16Wav(renderTrack(english.words, compiledById[track.id], track.bpm, track.beatsPerBar).samples, RATE));
  }

  const candidates = [];
  for (const dir of candidateDirs) {
    const pack = await loadPack(path.resolve(dir));
    const id = pack.manifest.id;
    const postOnsetMs = Object.fromEntries(REQUIRED_VOICE_KEYS.map(key => [key, pack.words[key].postOnsetMs]));
    const words = {};
    for (const key of REQUIRED_VOICE_KEYS) {
      const word = pack.words[key];
      await fs.writeFile(path.join(target, `${id}-${key}.wav`), encodePcm16Wav(renderWordDemo(word), RATE));
      words[key] = { onsetMs: word.onsetMs, measuredOnsetMs: word.measuredOnsetMs, durationMs: word.durationMs, peakDbfs: Number(dbfs(word.peak).toFixed(1)), postOnsetMs: word.postOnsetMs };
    }
    const trackResults = [];
    for (const track of tracks) {
      const compiled = compiledById[track.id];
      if (id !== englishId) await fs.writeFile(path.join(target, `${id}-${track.id}.wav`), encodePcm16Wav(renderTrack(pack.words, compiled, track.bpm, track.beatsPerBar).samples, RATE));
      trackResults.push({ id: track.id, bpm: track.bpm, speed: track.speed, risks: riskList(compiled, track.bpm, postOnsetMs), englishRisks: riskList(compiled, track.bpm, englishPost).length });
    }
    const audit = danceAudit(postOnsetMs, baseline);
    candidates.push({
      id,
      name: pack.manifest.name,
      voiceName: pack.manifest.voiceName,
      locale: pack.manifest.locale,
      speakingRate: pack.manifest.speakingRate,
      gate: pack.manifest.gate ?? null,
      labels: wordLabels(pack.manifest.locale),
      words,
      tracks: trackResults,
      danceAudit: audit,
      checks: {
        // Ruling 67-4 の字面（練習の速さで重なり 0）。英パック自身もサンバ 1a2（ア→2 の 16 分）で 1 件あるため、英語比の旗も並べる
        practiceRisksZero: trackResults.filter(item => item.speed === 'practice').every(item => item.risks.length === 0),
        practiceNotWorseThanEnglish: trackResults.filter(item => item.speed === 'practice').every(item => item.risks.length <= item.englishRisks),
        competitionNotWorseThanEnglish: trackResults.filter(item => item.speed === 'fast').every(item => item.risks.length <= item.englishRisks)
          && audit.every(item => item.ok !== false)
      }
    });
    log(`描画しました: ${id}（語 12・流れ ${tracks.length}）`);
  }

  const report = { generatedAt: now.toISOString(), date, english: { id: englishId, name: english.manifest.name }, tracks, candidates };
  await fs.writeFile(path.join(target, 'gate-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(target, 'index.html'), buildGatePage(report));
  log(`ページ: ${path.relative(root, path.join(target, 'index.html'))}`);
  log(`iPhone で聞く: python3 -m http.server 4175 --directory ${path.relative(root, target)} → http://<Mac の IP>:4175/`);
  return report;
}

const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// ひとみうさが iPhone（375 幅）で開く 1 ページ。外部読み込みなし・送信なし（結果はコピーして渡す）。
export function buildGatePage(report) {
  const data = JSON.stringify({
    date: report.date,
    english: report.english,
    tracks: report.tracks.map(track => ({ id: track.id, dance: track.dance, counts: track.counts, bpm: track.bpm, speed: track.speed })),
    candidates: report.candidates.map(item => ({
      id: item.id, name: item.name, speakingRate: item.speakingRate, labels: item.labels ?? wordLabels(item.locale),
      checks: item.checks ?? null
    })),
    keys: REQUIRED_VOICE_KEYS
  }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>声の聞き比べ ${escapeHtml(report.date)}</title>
<style>
:root { --bg: #fbfaf7; --fg: #1d1b18; --muted: #4f4a43; --line: #c9c2b6; --card: #ffffff; --accent: #8a3b12; --accent-fg: #ffffff; --chosen: #1f5c3a; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif; font-size: 18px; line-height: 1.6; }
main { max-width: 640px; margin: 0 auto; padding: 16px 16px 120px; }
h1 { font-size: 26px; margin: 8px 0 12px; }
h2 { font-size: 22px; overflow-wrap: anywhere; margin: 32px 0 8px; padding-top: 16px; border-top: 2px solid var(--line); }
h3 { font-size: 20px; margin: 24px 0 8px; }
p, li { font-size: 18px; }
.steps { padding-left: 1.4em; margin: 0 0 8px; }
.note { color: var(--muted); font-size: 16px; }
.row { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin: 12px 0; }
.label { font-size: 22px; font-weight: 700; margin: 0 0 8px; overflow-wrap: anywhere; }
.label small { display: block; font-size: 16px; font-weight: 400; color: var(--muted); }
button, input { font: inherit; font-size: 18px; }
button { min-height: 56px; border-radius: 10px; border: 2px solid var(--fg); background: var(--card); color: var(--fg); padding: 8px 12px; cursor: pointer; }
.play { width: 100%; background: var(--accent); border-color: var(--accent); color: var(--accent-fg); font-weight: 700; }
.plays { display: grid; grid-template-columns: 1fr; gap: 8px; }
.plays.two { grid-template-columns: 1fr 1fr; }
.choices { display: grid; grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
.choice { padding: 8px 4px; word-break: keep-all; }
.choice[aria-pressed="true"] { background: var(--chosen); border-color: var(--chosen); color: #ffffff; font-weight: 700; }
.choice[aria-pressed="true"]::before { content: "✓ "; }
.memo { width: 100%; min-height: 56px; margin-top: 8px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; background: #ffffff; color: var(--fg); }
.copy { width: 100%; background: var(--fg); color: var(--bg); font-weight: 700; font-size: 20px; }
.status { min-height: 1.6em; font-weight: 700; color: var(--chosen); }
textarea { width: 100%; min-height: 160px; font-size: 16px; border: 1px solid var(--line); border-radius: 10px; padding: 8px; background: #ffffff; color: var(--fg); }
.machine { font-size: 16px; color: var(--muted); }
</style>
</head>
<body>
<main>
<h1>声の聞き比べ</h1>
<p>新しい「日本語の声」を、1 つずつ聞いて答えるページです。全部で 10 分ほどです。</p>
<ol class="steps">
<li>イヤホンを外して、iPhone のスピーカーで聞いてください。音量は大きめに。</li>
<li>「▶ 聞く」を押すと鳴ります。いちばん近い答えを 1 つ押してください。</li>
<li>気になったことは、下の欄に一言どうぞ（書かなくても大丈夫です）。</li>
<li>最後に一番下の「結果をコピー」を押して、く！ちゃんに貼り付けて送ってください。</li>
</ol>
<p class="note">答えはこの iPhone の中にだけ残ります。どこにも送られません。</p>
<div id="app"></div>
<h2>終わったら</h2>
<button type="button" class="copy" id="copy">結果をコピー</button>
<p class="status" id="status" role="status"></p>
<p class="note">コピーできない時は、下の文章を長押しして「すべてを選択」→「コピー」してください。</p>
<textarea id="result" readonly aria-label="結果の文章"></textarea>
</main>
<audio id="player" preload="none"></audio>
<script>
const DATA = ${data};
const STORE = 'dc-voice-gate-' + DATA.date;
const SPEED = { practice: '練習の速さ', fast: '試合の速さ' };
let state = {};
try { state = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (error) { state = {}; }
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (error) { /* 保存できなくても続ける */ } renderResult(); };
const player = document.getElementById('player');
let playing = null;
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'onclick') node.addEventListener('click', value);
    else if (key === 'oninput') node.addEventListener('input', value);
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}
function resetButton() { if (playing) { playing.textContent = playing.dataset.label; playing = null; } }
function playButton(text, file) {
  const button = el('button', { type: 'button', class: 'play', 'data-label': text }, text);
  button.addEventListener('click', () => {
    if (playing === button) { player.pause(); resetButton(); return; }
    resetButton();
    player.src = file;
    player.currentTime = 0;
    player.play().then(() => { playing = button; button.textContent = '■ 止める'; }).catch(() => { button.textContent = '鳴りません。もう一度押してください'; });
  });
  return button;
}
player.addEventListener('ended', resetButton);
function choiceRow(stateKey, options) {
  const row = el('div', { class: 'choices', style: '--n:' + options.length, role: 'group' });
  for (const option of options) {
    const button = el('button', { type: 'button', class: 'choice', 'aria-pressed': String(state[stateKey]?.answer === option) }, option);
    button.addEventListener('click', () => {
      state[stateKey] = { ...(state[stateKey] || {}), answer: option };
      for (const sibling of row.children) sibling.setAttribute('aria-pressed', String(sibling === button));
      save();
    });
    row.append(button);
  }
  return row;
}
function memo(stateKey) {
  const input = el('input', { type: 'text', class: 'memo', placeholder: '気になった点（なくても大丈夫）', 'aria-label': 'メモ' });
  input.value = state[stateKey]?.memo || '';
  input.addEventListener('input', () => { state[stateKey] = { ...(state[stateKey] || {}), memo: input.value }; save(); });
  return input;
}
const countsText = counts => counts.split('').map(token => token === '&' ? 'アンド' : token === 'a' ? 'ア' : token === 'S' ? 'スロー' : token === 'Q' ? 'クイック' : token).join('・');
const trackTitle = track => track.dance + '　' + SPEED[track.speed] + '（1 分に ' + track.bpm + ' 拍）';
const app = document.getElementById('app');
DATA.candidates.forEach((candidate, index) => {
  const n = index + 1;
  app.append(el('h2', {}, '声 ' + n + '：' + candidate.name + '（速さ ' + candidate.speakingRate + '）'));
  if (candidate.checks) {
    const ok = candidate.checks.practiceNotWorseThanEnglish && candidate.checks.competitionNotWorseThanEnglish;
    app.append(el('p', { class: 'machine' }, '機械の確認：' + (ok ? '✓ 声どうしの重なりは英語と同じ以下です' : '△ 声どうしが重なる所があります（耳で確かめてください）')));
  }
  app.append(el('h3', {}, 'ことば（12）'), el('p', { class: 'note' }, '同じことばが 2 回鳴ります。数え言葉として自然かどうかを選んでください。'));
  for (const key of DATA.keys) {
    const stateKey = candidate.id + '|word|' + key;
    app.append(el('div', { class: 'row' },
      el('p', { class: 'label' }, '「' + candidate.labels[key] + '」'),
      playButton('▶ 聞く', candidate.id + '-' + key + '.wav'),
      choiceRow(stateKey, ['自然', '気になる', 'だめ']),
      memo(stateKey)));
  }
  app.append(el('h3', {}, 'カウントの流れ（' + DATA.tracks.length + '）'), el('p', { class: 'note' }, 'カチッという音（拍）と声がそろっているかを聞いてください。英語でも聞き比べられます。'));
  for (const track of DATA.tracks) {
    const stateKey = candidate.id + '|track|' + track.id;
    const plays = el('div', { class: candidate.id === DATA.english.id ? 'plays' : 'plays two' }, playButton('▶ 聞く', candidate.id + '-' + track.id + '.wav'));
    if (candidate.id !== DATA.english.id) plays.append(playButton('▶ 英語で聞く', DATA.english.id + '-' + track.id + '.wav'));
    app.append(el('div', { class: 'row' },
      el('p', { class: 'label' }, trackTitle(track), el('small', {}, countsText(track.counts))),
      plays,
      choiceRow(stateKey, ['ずれない', 'ずれる']),
      memo(stateKey)));
  }
  app.append(el('h3', {}, 'この声を採用しますか'));
  const adoptKey = candidate.id + '|adopt';
  app.append(el('div', { class: 'row' }, choiceRow(adoptKey, ['採用する', '採用しない']), memo(adoptKey)));
});
const cell = text => String(text || '').replace(/\\|/g, '／').replace(/\\n/g, ' ');
function resultMarkdown() {
  const lines = ['## 声の聞き比べの結果（' + DATA.date + '）', '', '### 表 A（ことば）', '', '| # | 語 | 候補 | 自然／気になる／だめ | メモ |', '|---|---|---|---|---|'];
  let n = 0;
  for (const candidate of DATA.candidates) for (const key of DATA.keys) {
    const answer = state[candidate.id + '|word|' + key] || {};
    lines.push('| ' + (++n) + ' | ' + candidate.labels[key] + ' | ' + candidate.id + ' | ' + cell(answer.answer || '（未回答）') + ' | ' + cell(answer.memo) + ' |');
  }
  lines.push('', '### 表 B（カウントの流れ）', '', '| # | 候補 | 種目・型・速さ | ずれない／ずれる | メモ |', '|---|---|---|---|---|');
  n = 0;
  for (const candidate of DATA.candidates) for (const track of DATA.tracks) {
    const answer = state[candidate.id + '|track|' + track.id] || {};
    lines.push('| ' + (++n) + ' | ' + candidate.id + ' | ' + track.dance + ' ' + track.counts + ' ' + track.bpm + ' | ' + cell(answer.answer || '（未回答）') + ' | ' + cell(answer.memo) + ' |');
  }
  lines.push('', '### 表 C（採用）', '', '| 候補 | 採用する／しない | 理由 |', '|---|---|---|');
  for (const candidate of DATA.candidates) {
    const answer = state[candidate.id + '|adopt'] || {};
    lines.push('| ' + candidate.id + ' | ' + cell(answer.answer || '（未回答）') + ' | ' + cell(answer.memo) + ' |');
  }
  return lines.join('\\n') + '\\n';
}
const result = document.getElementById('result');
const status = document.getElementById('status');
function renderResult() { result.value = resultMarkdown(); }
renderResult();
document.getElementById('copy').addEventListener('click', async () => {
  const text = resultMarkdown();
  result.value = text;
  let copied = false;
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); copied = true; } } catch (error) { copied = false; }
  if (!copied) {
    result.focus(); result.select(); result.setSelectionRange(0, text.length);
    try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
  }
  status.textContent = copied ? 'コピーしました。く！ちゃんに貼り付けて送ってください。' : 'コピーできませんでした。下の文章を長押ししてコピーしてください。';
});
</script>
</body>
</html>
`;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    const { values, positionals } = parseArgs({ args: process.argv.slice(2), allowPositionals: true, options: { out: { type: 'string' } } });
    await renderGate(positionals, { outDir: values.out });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
