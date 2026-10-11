import { compileRoutine } from './rhythm-compiler.js';
import { getDanceProfile, TICKS_PER_BEAT } from './dance-profiles.js';
import { legacyRoutineProvenance } from './routine-provenance.js';

const LEADING_SUBDIVISION = /^[&ae]/;

export function assessLegacyRoutine(routine) {
  const issues = [];
  const figures = (routine.figures ?? []).map((figure, index) => ({
    id: `${routine.id}-figure-${index + 1}`,
    name: figure.name,
    counts: figure.counts
  }));

  if (!routine.id || !routine.danceId || !routine.name || figures.length === 0) {
    issues.push(issue('INVALID_ROUTINE_SHAPE', 'error', '必須項目またはフィガーがありません'));
  }

  for (const [index, figure] of figures.entries()) {
    if (LEADING_SUBDIVISION.test(figure.counts ?? '')) {
      issues.push(issue(
        'AMBIGUOUS_LEADING_SUBDIVISION',
        'review',
        '先頭の分割拍が前拍・現在拍・アウフタクトのどれに属するか確認が必要です',
        index,
        figure
      ));
    }
    if ((figure.counts ?? '').includes('&&')) {
      issues.push(issue(
        'REPEATED_SUBDIVISION',
        'error',
        '分割拍が連続しており、v2の拍位置へ自動変換できません',
        index,
        figure
      ));
    }
  }

  if (routine.danceId === 'jive') {
    issues.push(issue(
      'LEGACY_JIVE_TIMING',
      'review',
      '旧版のジャイブ表記は正確なQaQタイミングとして自動承認できません'
    ));
  }

  let compiled = null;
  if (!issues.some(item => item.severity === 'error' || item.code === 'AMBIGUOUS_LEADING_SUBDIVISION')) {
    try {
      compiled = compileRoutine({ danceId: routine.danceId, figures });
      const barTicks = getDanceProfile(routine.danceId).beatsPerBar * TICKS_PER_BEAT;
      for (const [index, compiledFigure] of compiled.figures.entries()) {
        const endPhaseTicks = compiledFigure.endTick % barTicks;
        if (endPhaseTicks === 0) continue;
        issues.push(issue(
          'FIGURE_PHASE_CONTINUES',
          'info',
          'フィガーは小節途中で終わり、次のフィガーが同じ小節位相を引き継ぎます',
          index,
          figures[index]
        ));
      }
      const routineRemainderTicks = compiled.durationTicks % barTicks;
      if (routineRemainderTicks !== 0) {
        issues.push(issue(
          'ROUTINE_INCOMPLETE_BAR',
          'review',
          `ルーティン全体が小節途中（残り${barTicks - routineRemainderTicks} ticks）で終わるため、ループ前に確認が必要です`
        ));
      }
    } catch (error) {
      issues.push(issue('COMPILE_ERROR', 'error', error.message));
    }
  }

  const blocking = issues.some(item => item.severity === 'error' || item.severity === 'review');
  const sourceFile = routine.sourceFile ?? 'dance-count-B_215.html';
  const provenance = legacyRoutineProvenance(sourceFile);
  if (routine.sourceReference != null) provenance.sourceReference = routine.sourceReference;
  return {
    id: routine.id,
    danceId: routine.danceId,
    name: routine.name,
    source: sourceFile,
    provenance,
    status: blocking ? 'needs-review' : 'mechanically-valid-unreviewed',
    figureCount: figures.length,
    durationTicks: compiled?.durationTicks ?? null,
    issues,
    figures
  };
}

export function assessLegacyRoutines(routines) {
  const assessed = routines.map(assessLegacyRoutine);
  const summary = {
    routineCount: assessed.length,
    figureCount: assessed.reduce((total, routine) => total + routine.figureCount, 0),
    mechanicallyValidUnreviewed: assessed.filter(routine => routine.status === 'mechanically-valid-unreviewed').length,
    needsReview: assessed.filter(routine => routine.status === 'needs-review').length,
    issueCounts: countIssues(assessed)
  };
  return { schemaVersion: 2, generatedAt: new Date().toISOString(), summary, routines: assessed };
}

function issue(code, severity, message, figureIndex = null, figure = null) {
  return {
    code,
    severity,
    message,
    ...(figureIndex === null ? {} : { figureIndex, figureName: figure?.name, counts: figure?.counts })
  };
}

function countIssues(routines) {
  const counts = {};
  for (const routine of routines) {
    for (const item of routine.issues) counts[item.code] = (counts[item.code] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}
