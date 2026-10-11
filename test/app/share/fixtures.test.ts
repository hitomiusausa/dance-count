import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseBundle } from '../../../src/app/share/bundle.ts';

// 検査用の配布ファイル（tools/make-share-fixtures.js が作って commit 済み。ui:check と smoke:share が使う）が、
// 今の読み方で期待どおりに読める（形が変わったら `node tools/make-share-fixtures.js` で作り直す）。
const dir = path.resolve(import.meta.dirname, '../../fixtures/share');
const read = (name: string) => parseBundle(fs.readFileSync(path.join(dir, name), 'utf8'));

test('the share fixtures read as ui:check and smoke:share expect (Ruling 87-3)', () => {
  const full = read('bundle-voice-routine.dancecount.txt');
  assert.ok(full.ok);
  assert.deepEqual(full.distributor, { name: '山田' });
  assert.equal(full.voice?.pack.locale, 'ja-JP');
  assert.equal(full.voice?.pack.id, 'user-recorded-ja-v1');
  assert.deepEqual(full.routines.map(routine => routine.name), ['ワルツのルーティン', 'タンゴ前のワルツ']);
  const routinesOnly = read('bundle-routines-only.dancecount.txt');
  assert.ok(routinesOnly.ok && routinesOnly.voice === null && routinesOnly.routines.length === 1);
  const oneBroken = read('bundle-one-broken-routine.dancecount.txt');
  assert.ok(oneBroken.ok);
  assert.deepEqual(oneBroken.rejected, [{ name: 'こわれたルーティン' }]);
  const legacy = read('legacy-voice-pack.json');
  assert.ok(legacy.ok && legacy.legacy && legacy.voice?.pack.name === 'My recorded voice');
  assert.deepEqual(read('broken.txt'), { ok: false, problem: 'broken' });
  assert.deepEqual(read('too-new.txt'), { ok: false, problem: 'too-new' });
});
