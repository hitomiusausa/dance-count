import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFigureCatalog } from '../../src/engine/figure-catalog.js';

test('figure catalog is dance-specific, unique, and keeps the current draft figures', () => {
  const routines = [
    { danceId: 'tango', figures: [{ name: 'Walks', counts: 'SS' }, { name: 'Walks', counts: 'SS' }] },
    { danceId: 'waltz', figures: [{ name: 'Closed Change', counts: '123' }] }
  ];
  const current = { danceId: 'tango', figures: [{ name: 'Draft Figure', counts: 'QQ' }] };

  assert.deepEqual(buildFigureCatalog(routines, current), [
    { name: 'Walks', counts: 'SS' },
    { name: 'Draft Figure', counts: 'QQ' }
  ]);
});
