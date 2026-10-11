import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { adoptPack } from '../../../tools/voices/adopt.js';
import { checkPack } from '../../../tools/voices/check-pack.js';
import { writeSyntheticPack } from './helpers.js';

async function setup() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'dc-adopt-'));
  const cand = await writeSyntheticPack(base, 'cand-1');
  const targetRoot = path.join(base, 'public-audio');
  return { base, cand, targetRoot };
}

const approval = { approvedBy: 'ひとみうさ', listenedOn: 'iPhone SE', notes: '12 語とも自然', now: new Date('2026-10-13T00:00:00Z') };

test('adopt is a dry run without yes', async () => {
  const { base, cand, targetRoot } = await setup();
  try {
    const result = await adoptPack(cand, { targetRoot, ...approval, log: () => {} });
    assert.equal(result.mode, 'plan');
    await assert.rejects(fs.access(targetRoot));
  } finally { await fs.rm(base, { recursive: true, force: true }); }
});

test('adopt copies the pack under the fixed id with an approved gate (D26)', async () => {
  const { base, cand, targetRoot } = await setup();
  try {
    const result = await adoptPack(cand, { targetRoot, ...approval, yes: true, log: () => {} });
    assert.equal(result.mode, 'adopted');
    const target = path.join(targetRoot, 'default-ja-female-v1');
    const check = await checkPack(target);
    assert.deepEqual(check.problems, []);
    assert.equal(check.manifest.id, 'default-ja-female-v1');
    assert.deepEqual(check.manifest.gate, { status: 'approved', approvedBy: 'ひとみうさ', approvedAt: '2026-10-13T00:00:00.000Z', listenedOn: 'iPhone SE', notes: '12 語とも自然', candidate: 'cand-1' });
    await assert.rejects(adoptPack(cand, { targetRoot, ...approval, yes: true, log: () => {} }), /既にあります/);
  } finally { await fs.rm(base, { recursive: true, force: true }); }
});

test('adopt needs who approved it and refuses a broken candidate', async () => {
  const { base, cand, targetRoot } = await setup();
  try {
    await assert.rejects(adoptPack(cand, { targetRoot, yes: true, listenedOn: 'iPhone SE', log: () => {} }), /approvedBy|承認/);
    await fs.rm(path.join(cand, 'two.wav'));
    await assert.rejects(adoptPack(cand, { targetRoot, ...approval, yes: true, log: () => {} }), /two/);
    await assert.rejects(fs.access(path.join(targetRoot, 'default-ja-female-v1')));
  } finally { await fs.rm(base, { recursive: true, force: true }); }
});
