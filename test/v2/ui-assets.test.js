import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const ICON_IDS = [
  'play', 'stop', 'plus', 'copy', 'trash', 'pencil', 'grip', 'globe', 'chevron',
  'undo', 'redo', 'repeat', 'metronome', 'gauge', 'voice', 'insert-after', 'check',
  'arrow-up', 'arrow-down'
];

const UI_TOKENS = ['--dc-primary', '--dc-text', '--dc-text-sub', '--dc-tap', '--dc-tap-lg', '--dc-font'];
const UI_CLASSES = ['.dc-btn', '.dc-icon', '.dc-toggle', '.dc-chip', '.dc-select', '.dc-bar', '.dc-panel', '.dc-add-figure'];

test('icons.svg defines every required symbol id', async () => {
  const svg = await fs.readFile(path.join(root, 'public/assets/icons.svg'), 'utf8');
  for (const id of ICON_IDS) assert.ok(svg.includes(`id="i-${id}"`), `missing symbol i-${id}`);
  assert.ok(!/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(svg), 'icons.svg must not contain emoji');
});

test('ui.css defines shared tokens and component classes', async () => {
  const css = await fs.readFile(path.join(root, 'public/assets/ui.css'), 'utf8');
  for (const token of UI_TOKENS) assert.ok(css.includes(token), `missing token ${token}`);
  for (const className of UI_CLASSES) assert.ok(css.includes(className), `missing class ${className}`);
});

test('practice.html links the shared UI assets and has no emoji', async () => {
  const html = await fs.readFile(path.join(root, 'public/practice.html'), 'utf8');
  assert.ok(html.includes('assets/ui.css'), 'ui.css link missing');
  assert.ok(html.includes('assets/icons.svg#i-globe'), 'globe icon missing');
  assert.ok(!/[\u{1F000}-\u{1FAFF}\u{2700}-\u{27BF}]/u.test(html), 'no emoji allowed');
});

test('routine-editor.html links the shared UI assets and labels card actions', async () => {
  const html = await fs.readFile(path.join(root, 'public/routine-editor.html'), 'utf8');
  assert.ok(html.includes('assets/ui.css'), 'ui.css link missing');
  assert.ok(html.includes('dc-add-figure'), 'list-end add button missing');
  assert.ok(html.includes('icons.svg#i-copy'), 'labeled duplicate action missing');
  assert.ok(!/[\u{1F000}-\u{1FAFF}\u{2700}-\u{27BF}]/u.test(html), 'no emoji allowed');
});
