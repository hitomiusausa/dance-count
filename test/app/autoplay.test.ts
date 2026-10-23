import test from 'node:test';
import assert from 'node:assert/strict';
import { requestAutoplay, takeAutoplay, cancelAutoplay } from '../../src/app/state/autoplay.ts';

test('the resume mark plays once for its dance and is then gone', () => {
  requestAutoplay({ kind: 'dance', id: 'waltz' });
  assert.equal(takeAutoplay({ kind: 'dance', id: 'waltz' }), true);
  assert.equal(takeAutoplay({ kind: 'dance', id: 'waltz' }), false);
});

test('a mark for another dance does not play and is still consumed', () => {
  requestAutoplay({ kind: 'dance', id: 'tango' });
  assert.equal(takeAutoplay({ kind: 'dance', id: 'waltz' }), false);
  assert.equal(takeAutoplay({ kind: 'dance', id: 'tango' }), false);
});

test('with no mark nothing plays (reload, browser back, direct open)', () => {
  assert.equal(takeAutoplay({ kind: 'dance', id: 'jive' }), false);
  assert.equal(takeAutoplay({ kind: 'routine', id: 'r-aaaaaaaa' }), false);
});

test('a routine mark plays once for that routine only (Ruling 40)', () => {
  requestAutoplay({ kind: 'routine', id: 'r-aaaaaaaa' });
  assert.equal(takeAutoplay({ kind: 'routine', id: 'r-aaaaaaaa' }), true);
  assert.equal(takeAutoplay({ kind: 'routine', id: 'r-aaaaaaaa' }), false);
});

test('kind and id must both match (a dance id never starts a routine)', () => {
  requestAutoplay({ kind: 'dance', id: 'r-aaaaaaaa' });
  assert.equal(takeAutoplay({ kind: 'routine', id: 'r-aaaaaaaa' }), false);
  requestAutoplay({ kind: 'routine', id: 'r-aaaaaaaa' });
  assert.equal(takeAutoplay({ kind: 'routine', id: 'r-bbbbbbbb' }), false);
});


test('leaving to choose music cancels a pending automatic start',()=>{
  for(const kind of ['dance','routine'] as const){
    requestAutoplay({kind,id:'test'});cancelAutoplay();assert.equal(takeAutoplay({kind,id:'test'}),false);
  }
});
