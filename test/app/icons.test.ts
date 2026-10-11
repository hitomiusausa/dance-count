import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ICON_NAMES } from '../../src/app/components/icon-names.ts';

const sprite = fs.readFileSync(path.resolve(import.meta.dirname, '../../src/app/components/icons.svg'), 'utf8');

test('every icon name has a symbol in icons.svg and vice versa (spec §5)', () => {
  const ids = [...sprite.matchAll(/<symbol id="i-([\w-]+)"/g)].map(match => match[1]).sort();
  assert.deepEqual(ids, [...ICON_NAMES].sort());
});

test('the sprite is hidden and has no emoji or external references', () => {
  assert.match(sprite, /^<svg[^>]*style="display:none"[^>]*aria-hidden="true"/);
  assert.doesNotMatch(sprite, /https?:\/\/(?!www\.w3\.org)/);
  assert.doesNotMatch(sprite, /\p{Extended_Pictographic}/u);
});
