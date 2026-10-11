export class RoutineEditorState {
  constructor(routine) {
    this.past = [];
    this.future = [];
    this.current = cloneRoutine(routine);
  }

  replace(routine) {
    this.past = [];
    this.future = [];
    this.current = cloneRoutine(routine);
    return this.value;
  }

  update(mutator) {
    const next = cloneRoutine(this.current);
    mutator(next);
    if (JSON.stringify(next) === JSON.stringify(this.current)) return this.value;
    this.past.push(this.current);
    this.current = next;
    this.future = [];
    return this.value;
  }

  undo() {
    if (!this.canUndo) return this.value;
    this.future.push(this.current);
    this.current = this.past.pop();
    return this.value;
  }

  redo() {
    if (!this.canRedo) return this.value;
    this.past.push(this.current);
    this.current = this.future.pop();
    return this.value;
  }

  moveFigure(fromIndex, toIndex) {
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return this.value;
    if (fromIndex < 0 || fromIndex >= this.current.figures.length) return this.value;
    if (toIndex < 0 || toIndex >= this.current.figures.length || fromIndex === toIndex) return this.value;
    return this.update(value => {
      const [figure] = value.figures.splice(fromIndex, 1);
      value.figures.splice(toIndex, 0, figure);
    });
  }

  // nameSuffix は旧画面の既定（「（コピー）」）。新アプリは名前を変えずに複製する（'' を渡す。Ruling 39）。
  duplicateFigure(index, newId, nameSuffix = '（コピー）') {
    if (!Number.isInteger(index) || index < 0 || index >= this.current.figures.length || !newId) return this.value;
    return this.update(value => {
      const original = value.figures[index];
      value.figures.splice(index + 1, 0, {
        ...original,
        id: newId,
        name: `${original.name}${nameSuffix}`
      });
    });
  }

  addFigure(figure, index = this.current.figures.length) {
    if (!figure?.id || !figure?.name || !figure?.counts) return this.value;
    const insertionIndex = Math.max(0, Math.min(this.current.figures.length, index));
    return this.update(value => {
      value.figures.splice(insertionIndex, 0, {
        id: figure.id,
        name: figure.name,
        counts: figure.counts
      });
    });
  }

  get value() { return cloneRoutine(this.current); }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}

function cloneRoutine(routine) {
  return {
    id: routine.id,
    danceId: routine.danceId,
    name: routine.name,
    bpm: Number.isFinite(routine.bpm) ? routine.bpm : null,
    countInBars: Number.isInteger(routine.countInBars) ? routine.countInBars : 1,
    source: routine.source,
    status: routine.status,
    figures: (routine.figures ?? []).map(figure => ({
      id: figure.id,
      name: figure.name,
      counts: figure.counts
    }))
  };
}
