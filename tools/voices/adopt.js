#!/usr/bin/env node
// 聴感ゲートを通った候補を標準の日本語として public/audio/<id>/ に写し、gate を approved にする（Ruling 65-1・68）。
// 既定は dry-run。--yes で実行。ID の既定は default-ja-female-v1（D26）。
//   npm run voices:adopt -- output/voices/<候補> --approved-by ひとみうさ --listened-on "iPhone SE" [--notes "…"] --yes
// 2026-11-03（VOICEPEAK の日本語の女性・男性）: 男性は --id default-ja-male-v1。今ある女性を新しい声に置き換える時は --replace
// （今のパックは output/voices/replaced/<id>-<日時>/ に移してから写す＝バックアップ。写した後の検査に落ちたら元に戻す）。
// 採用のコミットは 6c（standard-voices.json に日本語の行・messages）と同じ便にする。JSON に無いパックは build が落とす（番人）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { checkPack } from './check-pack.js';

const root = path.resolve(import.meta.dirname, '../..');
export const JAPANESE_STANDARD_ID = 'default-ja-female-v1';
// 採用できる標準の声の ID（言葉・性別・版。ほかの名前で public/audio に置かない）
export const STANDARD_ID_PATTERN = /^default-(en|ja)-(female|male)-v[0-9]+$/;

export async function adoptPack(candidateDir, { targetRoot = path.join(root, 'public/audio'), backupRoot = path.join(root, 'output/voices/replaced'), id = JAPANESE_STANDARD_ID, replace = false, approvedBy, listenedOn, notes = '', now = new Date(), yes = false, log = console.log } = {}) {
  if (!STANDARD_ID_PATTERN.test(id)) throw new Error(`--id は default-<en|ja>-<female|male>-v<番号> の形: ${id}`);
  if (!approvedBy?.trim()) throw new Error('--approved-by（承認した人）が要ります');
  if (!listenedOn?.trim()) throw new Error('--listened-on（聞いた機器。例: iPhone SE）が要ります');
  const source = path.resolve(candidateDir);
  const candidate = await checkPack(source, { requireApproved: false });
  if (!candidate.ok) throw new Error(`候補が検査を通りません:\n  ${candidate.problems.join('\n  ')}`);
  const target = path.join(targetRoot, id);
  const exists = await fs.access(target).then(() => true, () => false);
  if (exists && !replace) throw new Error(`${target} は既にあります（置き換える時は --replace。今のパックはバックアップに移します）`);
  const backup = exists ? path.join(backupRoot, `${id}-${now.toISOString().replace(/[:.]/g, '-')}`) : null;
  const manifest = { ...candidate.manifest, id, gate: { status: 'approved', approvedBy, approvedAt: now.toISOString(), listenedOn, notes, candidate: candidate.manifest.id } };
  // 置き換える時は、語ごとに revision（候補の名前）を付ける: 同じ URL の古い音がブラウザに残っていても、?v=<revision> で新しい音を取りに行く
  // （voice-pack-loader.js。SW の precache は中身のハッシュで替わり、?v は照合で無視する＝sw.ts の IGNORED_QUERY）
  if (exists) manifest.words = Object.fromEntries(Object.entries(manifest.words).map(([key, word]) => [key, { ...word, revision: candidate.manifest.id }]));
  const files = Object.values(manifest.words).map(word => word.file);
  log(`採用: ${candidate.manifest.id} → ${path.relative(root, target) || target}（${files.length} 本＋manifest.json・承認 ${approvedBy}・${listenedOn}）`);
  if (!yes) {
    log('（dry-run: 何も書いていません。実行するには --yes）');
    return { mode: 'plan', target, manifest };
  }
  if (backup) {
    await fs.mkdir(backupRoot, { recursive: true });
    await fs.rename(target, backup);
    log(`今のパックを移しました（バックアップ）: ${path.relative(root, backup) || backup}`);
  }
  await fs.mkdir(target, { recursive: true });
  try {
    for (const file of files) await fs.copyFile(path.join(source, file), path.join(target, file));
    await fs.writeFile(path.join(target, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    const check = await checkPack(target, { expectedId: id });
    if (!check.ok) throw new Error(`写した後の検査に落ちました:\n  ${check.problems.join('\n  ')}`);
  } catch (error) {
    await fs.rm(target, { recursive: true, force: true });
    if (backup) await fs.rename(backup, target);   // 置き換えに失敗したら元のパックに戻す
    throw error;
  }
  if (!backup) log(`次（同じコミットで）: src/app/voices/standard-voices.json に { "id": "${id}", "locale": "${id.includes('-ja-') ? 'ja-JP' : 'en'}", "voice": "${id.includes('-male-') ? 'male' : 'female'}" } を足す → npm run build`);
  return { mode: 'adopted', target, manifest };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    const { values, positionals } = parseArgs({ args: process.argv.slice(2), allowPositionals: true, options: {
      'approved-by': { type: 'string' }, 'listened-on': { type: 'string' }, notes: { type: 'string' }, yes: { type: 'boolean' },
      id: { type: 'string' }, replace: { type: 'boolean' }
    } });
    if (!positionals[0]) throw new Error('使い方: voices:adopt -- output/voices/<候補> --approved-by <名前> --listened-on <機器> [--notes …] --yes');
    await adoptPack(positionals[0], { approvedBy: values['approved-by'], listenedOn: values['listened-on'], notes: values.notes, yes: values.yes === true,
      id: values.id ?? JAPANESE_STANDARD_ID, replace: values.replace === true });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
