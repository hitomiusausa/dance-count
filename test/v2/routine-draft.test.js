import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoutineDraft, validRoutineDraft } from '../../src/v2/routine-draft.js';

const source = { id: 'r1', danceId: 'tango', figures: [{ id: 'f1', name: 'Walks', counts: 'SS' }] };

test('valid routine draft must match its source and contain complete figures', () => {
  assert.equal(validRoutineDraft({ ...source, figures: [{ id: 'draft', name: 'Link', counts: 'QQ' }] }, source), true);
  assert.equal(validRoutineDraft({ ...source, danceId: 'waltz' }, source), false);
  assert.equal(validRoutineDraft({ ...source, figures: [] }, source), false);
});

test('invalid or corrupted stored draft safely falls back to source', () => {
  assert.equal(readRoutineDraft({ getItem: () => '{bad json' }, 'key', source), source);
  assert.equal(readRoutineDraft({ getItem: () => JSON.stringify({ ...source, figures: [] }) }, 'key', source), source);
});
