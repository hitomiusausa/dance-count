import { RoutineEditorState } from '../../engine/routine-editor-state.js';
import { checkCounts, type CountsProblem } from './counts.ts';
import { FIGURE_NAME_MAX, FIGURES_MAX, ROUTINE_NAME_MAX } from './limits.ts';
import type { Routine, RoutineFigure } from './routine.ts';

// S4 の編集の型（Ruling 36）。画面はこのクラスの状態を描くだけ。
// - 行を開いて名前・カウントを入れ「決定」で確定。開ける行は同時に1つ。
// - 閉じ方の原則: どんな閉じ方でも「有効なら確定・無効なら捨てる」（決定・別の行・追加・全体を試聴・戻る）。
// - 行を開くと「くわしく」は閉じ、「くわしく」を開くと開いている行を原則どおり閉じる（排他）。
// - 変更（確定）は元に戻す／やり直すの対象。入力途中の文字は対象外。
// 変更した操作は true を返す（画面はその時だけ保存する）。
export interface FigureDraft { name: string; counts: string }
export type OpenRow = { kind: 'edit'; index: number; draft: FigureDraft } | { kind: 'add'; draft: FigureDraft };
export type DraftReason = CountsProblem | 'name' | null;
export interface DraftCheck { valid: boolean; counts: string; reason: DraftReason }

type Meta = Omit<Routine, 'id' | 'danceId' | 'name' | 'bpm' | 'countInBars' | 'source' | 'status' | 'figures'>;

export class RoutineEditor {
  private readonly edits: RoutineEditorState;
  private readonly meta: Meta;
  private readonly newFigureId: () => string;
  open: OpenRow | null = null;
  moreOpen = false;

  constructor(routine: Routine, newFigureId: () => string) {
    const { id: _id, danceId: _danceId, name: _name, bpm: _bpm, countInBars: _bars, source: _source, status: _status, figures: _figures, ...meta } = routine;
    this.meta = meta;
    this.edits = new RoutineEditorState(routine);
    this.newFigureId = newFigureId;
  }

  get routine(): Routine {
    const core = this.edits.value as Pick<Routine, 'id' | 'danceId' | 'name' | 'bpm' | 'countInBars' | 'source' | 'status' | 'figures'>;
    return { ...core, ...this.meta, countInBars: core.countInBars === 2 ? 2 : 1 };
  }

  get canUndo(): boolean { return this.edits.canUndo; }
  get canRedo(): boolean { return this.edits.canRedo; }
  get canAdd(): boolean { return this.routine.figures.length < FIGURES_MAX; }

  // 入力欄の値の検証。理由の1行は同時に1つ（カウント → 名前の順）。空のカウントは理由を出さない。
  check(draft: FigureDraft = this.open?.draft ?? { name: '', counts: '' }): DraftCheck {
    const counts = checkCounts(this.routine.danceId, draft.counts);
    if (counts.problem) return { valid: false, counts: counts.counts, reason: counts.problem };
    const named = draft.name.trim() !== '';
    if (counts.empty) return { valid: false, counts: counts.counts, reason: null };
    return { valid: named, counts: counts.counts, reason: named ? null : 'name' };
  }

  openRow(index: number): boolean {
    if (this.open?.kind === 'edit' && this.open.index === index) return false;
    const changed = this.close();
    const figure = this.routine.figures[index];
    if (!figure) return changed;
    this.open = { kind: 'edit', index, draft: { name: figure.name, counts: figure.counts } };
    this.moreOpen = false;
    return changed;
  }

  openAdd(): boolean {
    if (this.open?.kind === 'add') return false;
    const changed = this.close();
    if (!this.canAdd) return changed;
    this.open = { kind: 'add', draft: { name: '', counts: '' } };
    this.moreOpen = false;
    return changed;
  }

  setDraft(patch: Partial<FigureDraft>): void {
    if (!this.open) return;
    const draft = { ...this.open.draft, ...patch };
    draft.name = draft.name.slice(0, FIGURE_NAME_MAX);
    this.open = { ...this.open, draft };
  }

  // 「決定」「追加する」。無効なら何もしない（ボタンは押せない見た目）。
  decide(): boolean {
    if (!this.open || !this.check().valid) return false;
    return this.close();
  }

  // 閉じ方の原則: 有効なら確定・無効なら捨てる。
  close(): boolean {
    const open = this.open;
    this.open = null;
    if (!open) return false;
    const check = this.check(open.draft);
    if (!check.valid) return false;
    const figure = { name: open.draft.name.trim(), counts: check.counts };
    if (open.kind === 'add') {
      this.edits.addFigure({ id: this.newFigureId(), ...figure });
      return true;
    }
    const current = this.routine.figures[open.index];
    if (!current || (current.name === figure.name && current.counts === figure.counts)) return false;
    this.edits.update((value: { figures: RoutineFigure[] }) => { Object.assign(value.figures[open.index]!, figure); });
    return true;
  }

  setMoreOpen(open: boolean): boolean {
    this.moreOpen = open;
    return open ? this.close() : false;
  }

  // 閉じた行の移動（ドラッグ・つかみの上下矢印。Ruling 49）。開いている行は先に原則どおり閉じる（有効なら確定）。
  // 同じ位置・範囲外は何もしない（履歴も積まない）。
  move(from: number, to: number): boolean {
    const changed = this.close();
    const count = this.routine.figures.length;
    if (![from, to].every(Number.isInteger) || from === to || from < 0 || to < 0 || from >= count || to >= count) return changed;
    this.edits.moveFigure(from, to);
    return true;
  }

  // 開いた行の中の操作（↑・↓・複製・削除）。先に入力中の値を原則どおり確定してから行う。
  moveOpen(delta: -1 | 1): boolean {
    if (this.open?.kind !== 'edit') return false;
    const { index } = this.open;
    const committed = this.commitKeepingOpen();
    const target = index + delta;
    if (target < 0 || target >= this.routine.figures.length) return committed;
    this.edits.moveFigure(index, target);
    this.open = { kind: 'edit', index: target, draft: this.draftOf(target) };  // 行は動かしたフィガーについて行く
    return true;
  }

  duplicateOpen(): boolean {
    if (this.open?.kind !== 'edit' || !this.canAdd) return false;
    const { index } = this.open;
    this.commitKeepingOpen();
    this.edits.duplicateFigure(index, this.newFigureId(), '');
    this.open = { kind: 'edit', index, draft: this.draftOf(index) };
    return true;
  }

  removeOpen(): boolean {
    if (this.open?.kind !== 'edit') return false;
    const { index } = this.open;
    this.open = null;
    this.edits.update((value: { figures: RoutineFigure[] }) => { value.figures.splice(index, 1); });
    return true;
  }

  // 名前の確定（blur か Enter）。空なら直前の名前に戻す（空の名前は作らない）。
  rename(name: string): boolean {
    const next = name.trim().slice(0, ROUTINE_NAME_MAX);
    if (next === '' || next === this.routine.name) return false;
    this.edits.update((value: { name: string }) => { value.name = next; });
    return true;
  }

  // 種目を変える（フィガー0件の時だけ。仕様 §4 S4）。名前は呼び出し側が決める（既定の名前のままなら新しい種目の既定へ）。
  changeDance(danceId: string, name: string): boolean {
    const closed = this.close();  // 先に開いている行を原則どおり閉じる（Ruling 36-1）。確定でフィガーが増えたら種目は変えない（仕様 §4 S4）
    if (this.routine.figures.length > 0 || this.routine.danceId === danceId) return closed;
    this.edits.update((value: { danceId: string; name: string }) => { value.danceId = danceId; value.name = name.trim().slice(0, ROUTINE_NAME_MAX) || value.name; });
    return true;
  }

  setLeadInBars(bars: 1 | 2): boolean {
    if (this.routine.countInBars === bars) return false;
    this.edits.update((value: { countInBars: number }) => { value.countInBars = bars; });
    return true;
  }

  setBpm(bpm: number | null): boolean {
    if (this.routine.bpm === bpm) return false;
    this.edits.update((value: { bpm: number | null }) => { value.bpm = bpm; });
    return true;
  }

  undo(): boolean {
    this.close();
    if (!this.edits.canUndo) return false;
    this.edits.undo();
    return true;
  }

  redo(): boolean {
    this.close();
    if (!this.edits.canRedo) return false;
    this.edits.redo();
    return true;
  }

  // 行の試聴に使う並び。入力中の値が有効ならそれを使う（確定前でも。Ruling 36-7）。無効なら null（試聴は押せない）。
  previewOpen(): { figures: RoutineFigure[]; index: number } | null {
    if (!this.open) return null;
    const check = this.check();
    if (!check.valid) return null;
    const figures = this.routine.figures.map(figure => ({ ...figure }));
    const draftFigure = { id: 'f-preview0', name: this.open.draft.name.trim(), counts: check.counts };
    if (this.open.kind === 'add') return { figures: [...figures, draftFigure], index: figures.length };
    figures[this.open.index] = { ...draftFigure, id: figures[this.open.index]!.id };
    return { figures, index: this.open.index };
  }

  private draftOf(index: number): FigureDraft {
    const figure = this.routine.figures[index]!;
    return { name: figure.name, counts: figure.counts };
  }

  private commitKeepingOpen(): boolean {
    const open = this.open;
    const changed = this.close();
    this.open = open?.kind === 'edit' ? { kind: 'edit', index: open.index, draft: this.draftOf(open.index) } : null;
    return changed;
  }
}
