import { RoutineEditorState } from '../../engine/routine-editor-state.js';
import { isOffBar } from './bar-check.ts';
import { checkCounts, normalizeCounts, type CountsProblem } from './counts.ts';
import { foldFigureName } from './figure-names.ts';
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
export type DraftReason = CountsProblem | 'sameName' | 'name' | null;
// 主ボタンの働き（Ruling 50-7）。画面はこれで文字・アイコン・押した時の処理を選ぶ（画面に判定を書かない）。
// add/done＝普通の確定、addCopy＝同じ名前の代表を複製して追加、matchCounts＝欄を代表にそろえる、updateAll＝同じ名前の全行をまとめて確定。
export type DraftAction = 'add' | 'done' | 'addCopy' | 'matchCounts' | 'updateAll';
// 同じ名前の代表（番号の若い行）と、自分以外で同じ名前の件数（Ruling 50-1）。
export interface SameName { index: number; name: string; counts: string; others: number }
// 止めない知らせ（Ruling 52-3）。理由の行の順位は 記号 → 先頭 → 並び → 同じ名前 → 名前が空 → まとめて変更の予告 → 小節の注意。
// 画面は reason が null の時だけ note を描く。valid には関わらない（小節の注意があっても「決定」は押せる）。
export type DraftNote = 'othersWillChange' | 'offBar' | null;
export interface DraftCheck { valid: boolean; counts: string; reason: DraftReason; action: DraftAction; note: DraftNote; same?: SameName }

// 開いた行の形（D19）。画面はこれで出す部品を選ぶ（画面に判定を書かない）。
// - countsShown: 追加の行で「複製して追加」の時は false（追加の行の「複製して追加」は名前だけで決まる＝カウントを触って欄が消えることは無い）＝カウントの欄・使える文字・カウントの形を出さない（複製では使わないため。
//   フォームが短くなり、キーボードが出ていても主ボタンが見える）。打っていたカウントは draft に残るので、名前を変えて
//   同じ名前でなくなれば欄ごと元に戻る。
// - sameName: 同じ名前の注意を名前の欄のすぐ下に出す形。'copy'＝追加の行（複製元の「名前（カウント）」＋名前を変える道の一言）、
//   'match'＝編集の行で既存の名前に打ち替えた時（「カウントを合わせる」。文は今のまま、位置だけ名前の欄の下）。
// - namePicker（D20・Ruling 54-2・3）: 追加の行で名前が空（空白だけも空）かつ種目に照合済みの名前がある（VW は無い）時だけ true＝
//   名前の欄の下にその種目の照合済みフィガー全部を並べ、カウントの欄・使える文字・カウントの形は出さない（名前が先。名前が入った瞬間に
//   同じ場所へ欄と形が出る）。編集の行では名前を空にしても出さない。打っていたカウントは draft に残る（複製の形と同じ）。
export interface FormLayout { countsShown: boolean; namePicker: boolean; sameName: 'copy' | 'match' | null }
export interface FormContext { kind: OpenRow['kind']; nameEmpty: boolean; hasCatalog: boolean }
export function formLayout(check: Pick<DraftCheck, 'action' | 'reason'>, context: FormContext): FormLayout {
  const copy = check.action === 'addCopy';
  const namePicker = context.kind === 'add' && context.nameEmpty && context.hasCatalog;
  return { countsShown: !copy && !namePicker, namePicker, sameName: check.reason !== 'sameName' ? null : copy ? 'copy' : 'match' };
}

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
  // 同じ名前（Ruling 50）: 名前の仲間に入る時はその仲間のカウントを受け取る。仲間のカウントを変える時は仲間ごと変わる。
  // 追加の行は「同じ名前」がカウントの理由より先、編集の行はカウントの理由が先。
  check(draft: FigureDraft = this.open?.draft ?? { name: '', counts: '' }, open: OpenRow | null = this.open): DraftCheck {
    const check = this.checkReason(draft, open);
    const counted = check.counts !== '' && check.reason !== 'symbols' && check.reason !== 'leading' && check.reason !== 'invalid';
    const note: DraftNote = check.action === 'updateAll' ? 'othersWillChange'
      : counted && isOffBar(this.routine.danceId, check.counts) ? 'offBar' : null;
    return { ...check, note };
  }

  private checkReason(draft: FigureDraft, open: OpenRow | null): Omit<DraftCheck, 'note'> {
    const editIndex = open?.kind === 'edit' ? open.index : null;
    const plain: DraftAction = editIndex === null ? 'add' : 'done';
    const counts = checkCounts(this.routine.danceId, draft.counts);
    const named = draft.name.trim() !== '';
    const same = named ? this.sameName(draft.name, editIndex) : undefined;
    const matches = !!same && !counts.problem && !counts.empty && counts.counts === normalizeCounts(same.counts);
    // 追加の行は名前だけで決める（F6 I1 の裁定。Ruling 50-2b を改める）: 同じ名前ならカウントが同じでも「複製して追加」。結果は同じで、
    // カウントを打ち直して欄やチップが指の下で消えることが無い（形の切り替えは名前を変えた時だけ）。
    if (editIndex === null && same) return { valid: false, counts: counts.counts, reason: 'sameName', action: 'addCopy', same };
    if (counts.problem) return { valid: false, counts: counts.counts, reason: counts.problem, action: plain };
    if (editIndex !== null && same) {
      const current = this.routine.figures[editIndex]!;
      const renamed = foldFigureName(draft.name) !== foldFigureName(current.name);
      if (renamed && !matches) return { valid: false, counts: counts.counts, reason: 'sameName', action: 'matchCounts', same };
      if (!renamed && !counts.empty && counts.counts !== normalizeCounts(current.counts)) {
        return { valid: true, counts: counts.counts, reason: null, action: 'updateAll', same };
      }
    }
    if (counts.empty) return { valid: false, counts: counts.counts, reason: null, action: plain };
    return { valid: named, counts: counts.counts, reason: named ? null : 'name', action: plain };
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

  // 閉じ方の原則: 有効なら確定・無効なら捨てる。名前そのままで仲間のカウントを変えた時は、同じ名前の全行のカウントを
  // 1 回の変更でそろえる（Ruling 50-4。ほかの行の名前の表記は触らない。元に戻す 1 回で全部戻る）。
  close(): boolean {
    const open = this.open;
    this.open = null;
    if (!open) return false;
    const check = this.check(open.draft, open);
    if (!check.valid) return false;
    const figure = { name: open.draft.name.trim(), counts: check.counts };
    if (open.kind === 'add') {
      this.edits.addFigure({ id: this.newFigureId(), ...figure });
      return true;
    }
    const current = this.routine.figures[open.index];
    if (!current || (current.name === figure.name && current.counts === figure.counts)) return false;
    const group = check.action === 'updateAll' ? foldFigureName(current.name) : null;
    this.edits.update((value: { figures: RoutineFigure[] }) => {
      if (group !== null) value.figures.forEach(item => { if (foldFigureName(item.name) === group) item.counts = figure.counts; });
      Object.assign(value.figures[open.index]!, figure);
    });
    return true;
  }

  // 「複製して追加」（Ruling 50-2）: 同じ名前の代表と同じ名前（代表の表記）・同じカウントを末尾に 1 件足して閉じる。打ったカウントは使わない。
  addCopy(): boolean {
    if (this.open?.kind !== 'add') return false;
    const { action, same } = this.check();
    if (action !== 'addCopy' || !same) return false;
    this.open = null;
    this.edits.addFigure({ id: this.newFigureId(), name: same.name, counts: same.counts });
    return true;
  }

  // 「カウントを合わせる」（Ruling 50-3）: 欄を代表のカウントと表記にそろえるだけ。行は開いたまま（変更はまだ無いので false）。
  matchCounts(): boolean {
    if (this.open?.kind !== 'edit') return false;
    const { action, same } = this.check();
    if (action === 'matchCounts' && same) this.open = { ...this.open, draft: { name: same.name, counts: same.counts } };
    return false;
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

  // 自分以外で同じ名前の行（Ruling 50-1）。代表は番号の若い行。無ければ undefined。
  private sameName(name: string, exceptIndex: number | null): SameName | undefined {
    const folded = foldFigureName(name);
    const indexes = this.routine.figures.flatMap((figure, index) => (index !== exceptIndex && foldFigureName(figure.name) === folded ? [index] : []));
    if (indexes.length === 0) return undefined;
    const first = this.routine.figures[indexes[0]!]!;
    return { index: indexes[0]!, name: first.name, counts: first.counts, others: indexes.length };
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
