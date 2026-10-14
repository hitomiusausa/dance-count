import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildBundle, parseBundle } from '../../../src/app/share/bundle.ts';
import { BUNDLE_SCHEMA_VERSION } from '../../../src/app/share/limits.ts';
import { NOTE_MAX, cleanNote, limitNoteInput, noteLength } from '../../../src/app/share/note.ts';
import { planImport } from '../../../src/app/share/plan-import.ts';
import { normalizeRoutine } from '../../../src/app/routines/routine.ts';
import { waltzRoutine } from '../helpers/share-fixtures.ts';

// D68（ひとみうさ指示 2026-10-14）: 配る時の「生徒へのひとこと」。任意・80 字（書記素）まで・ファイルの任意の項目 note（版は上げない）。
const NOW = '2026-10-14T09:00:00.000Z';
const ok = (text: string) => {
  const parsed = parseBundle(text);
  if (!parsed.ok) throw new Error(`expected ok, got ${parsed.problem}`);
  return parsed;
};
const routinesOnly = (note?: string | null) => buildBundle({ distributorName: '山田', voice: null, routines: [waltzRoutine('r-11111111')], now: NOW, note });

test('the note counts what people see as one character (graphemes) and stops at 80', () => {
  assert.equal(NOTE_MAX, 80);
  assert.equal(noteLength('来週までに'), 5);
  assert.equal(noteLength('👨‍👩‍👧'), 1, 'a family emoji is one character');
  assert.equal(noteLength('が'), 1, 'a kana with a combining voiced mark is one character');
  const long = 'あ'.repeat(79) + '👍🏽' + 'い';
  assert.equal(limitNoteInput(long), 'あ'.repeat(79) + '👍🏽', 'the 80th character is kept whole, the 81st is not typed');
  assert.equal(limitNoteInput('一行目\n二行目'), '一行目 二行目');
});

test('cleanNote: text only, invisible characters dropped, spaces folded, empty is null', () => {
  assert.equal(cleanNote('  来週の練習日までに\n覚えてきてね  '), '来週の練習日までに 覚えてきてね');
  assert.equal(cleanNote('‮逆さま‏'), '逆さま');
  assert.equal(cleanNote('<b>太字</b><script>alert(1)</script>'), '<b>太字</b><script>alert(1)</script>', 'kept as plain text (the screen draws text, not HTML)');
  assert.equal(cleanNote('   '), null);
  assert.equal(cleanNote(42), null);
  assert.equal(cleanNote(null), null);
  assert.equal(noteLength(cleanNote('x'.repeat(5000))!), NOTE_MAX);
});

test('the bundle carries the note as an optional top-level "note" and keeps schemaVersion 1', () => {
  const withNote = JSON.parse(routinesOnly('来週までに覚えてきてね'));
  assert.equal(withNote.schemaVersion, BUNDLE_SCHEMA_VERSION);
  assert.equal(BUNDLE_SCHEMA_VERSION, 1, 'raising the version would make the current app say "made by a newer app"');
  assert.equal(withNote.note, '来週までに覚えてきてね');
  assert.equal('note' in JSON.parse(routinesOnly('')), false, 'an empty note is not written');
  assert.equal('note' in JSON.parse(routinesOnly()), false);
  assert.equal(ok(routinesOnly('来週までに覚えてきてね')).note, '来週までに覚えてきてね');
});

test('files without a note (made by the current app) still read, and a bad note never breaks a file', () => {
  const plain = routinesOnly();
  assert.equal(ok(plain).note, null);
  for (const value of [42, { text: 'x' }, ['x'], '', '   ', null]) {
    assert.equal(ok(JSON.stringify({ ...JSON.parse(plain), note: value })).note, null, `note ${JSON.stringify(value)}`);
  }
  assert.equal(noteLength(ok(JSON.stringify({ ...JSON.parse(plain), note: 'あ'.repeat(200) })).note!), NOTE_MAX, 'a longer note is cut, not refused');
});

test('a reader that knows only the pre-D68 keys sees the same file: everything but "note" reads the same with or without it', () => {
  const { note: _withNote, ...withNote } = ok(routinesOnly('来週までに'));
  const { note: _plain, ...plain } = ok(routinesOnly());
  assert.deepEqual(withNote, plain);
  // 今の本番（pre-D68）の parseBundle は決まった項目（schemaVersion・type・distributor・consent・voicePack・routines）だけを読み、
  // 知らない項目では落とさない。その形を固定する（ここで note を読む／検査する行を足したら、本番の端末との約束が変わる）
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../../../src/app/share/bundle.ts'), 'utf8');
  const parser = source.slice(source.indexOf('export function parseBundle'), source.indexOf('function readVoice'));
  assert.match(parser, /note = cleanNote\(data\.note\);/, 'the note is read leniently (cleanNote never throws, never returns broken)');
  assert.doesNotMatch(parser, /Object\.keys\(data\)/, 'no whitelist of top-level keys (unknown keys stay readable both ways)');
});

test('received routines keep the note (S5 shows it); stored values are cleaned again; sharing it again drops it', () => {
  const parsed = ok(routinesOnly('来週までに覚えてきてね'));
  let next = 0;
  const plan = planImport(parsed, [], [], { now: NOW, newId: prefix => `${prefix}-new-${String(next++).padStart(4, '0')}` });
  assert.equal(plan.note, '来週までに覚えてきてね');
  const routine = plan.routines[0]!.routine;
  assert.equal(routine.receivedFrom?.note, '来週までに覚えてきてね');
  assert.deepEqual(normalizeRoutine(structuredClone(routine)), routine, 'stored and read back as it is');
  const tampered = normalizeRoutine({ ...structuredClone(routine), receivedFrom: { ...routine.receivedFrom, note: '‮あ'.repeat(100) } });
  assert.equal(noteLength(tampered!.receivedFrom!.note!), NOTE_MAX);
  assert.equal(tampered!.receivedFrom!.note!.includes('‮'), false);
  const noNote = normalizeRoutine({ ...structuredClone(routine), receivedFrom: { ...routine.receivedFrom, note: 7 } });
  assert.equal(noNote!.receivedFrom!.note, undefined);
  const again = JSON.parse(buildBundle({ distributorName: '佐藤', voice: null, routines: [routine], now: NOW }));
  assert.equal(again.routines[0].receivedFrom, undefined, 'the first teacher and their note are not passed on (Ruling 80-2)');
  assert.equal('note' in again, false);
});
