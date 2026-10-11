import fs from 'node:fs/promises';
import path from 'node:path';
import { DANCE_PROFILES } from '../src/engine/dance-profiles.js';
import { atomicRhythmCases, auditCompiledTransitions, expectedEventTimeMs } from '../src/engine/dance-timing-audit.js';
import { compileRhythm, compileRoutine } from '../src/engine/rhythm-compiler.js';
import { measureOnset } from '../src/engine/onset-detector.js';
import { parsePcm16Wav } from './measure-voice-onsets.js';

const root = path.resolve(import.meta.dirname, '..');
const packDir = path.join(root, 'public/audio/default-en-female-v1');
const manifest = JSON.parse(await fs.readFile(path.join(packDir, 'manifest.json'), 'utf8'));
const report = JSON.parse(await fs.readFile(path.join(root, 'src/engine/data/legacy-routines-report.json'), 'utf8'));
const voiceMetrics = await measureVoiceMetrics(packDir, manifest);
const postOnsetMs = Object.fromEntries(Object.entries(voiceMetrics).map(([key, value]) => [key, value.postOnsetMs]));
const dances = [];

for (const profile of Object.values(DANCE_PROFILES)) {
  const atomicCases = atomicRhythmCases(profile);
  const tempi = [profile.practiceBpm, profile.competitionBpm.min, profile.competitionBpm.max];
  const uniqueTransitions = new Map();
  let eventCount = 0;
  let exactTickChecks = 0;

  for (const counts of atomicCases) {
    const compiled = compileRhythm({ danceId: profile.id, counts });
    eventCount += compiled.events.length;
    for (const event of compiled.events) {
      if (!Number.isInteger(event.absoluteTick)) throw new Error(`${profile.name} ${counts}: tickが整数ではありません`);
      for (const bpm of tempi) {
        const expected = event.absoluteTick / 960 * 60_000 / bpm;
        if (expectedEventTimeMs(event, bpm) !== expected) throw new Error(`${profile.name} ${counts}: ms変換が一致しません`);
        exactTickChecks += 1;
      }
    }
    for (const bpm of tempi) {
      for (const item of auditCompiledTransitions(compiled, bpm, postOnsetMs)) {
        const key = `${bpm}:${item.from}:${item.to}:${item.gapTicks}`;
        const prior = uniqueTransitions.get(key);
        if (!prior || item.overlapMs > prior.overlapMs) uniqueTransitions.set(key, { ...item, bpm, example: counts });
      }
    }
  }

  for (const counts of profile.templates) compileRhythm({ danceId: profile.id, counts });
  const templateRisks = [];
  for (const counts of profile.templates) {
    const compiled = compileRhythm({ danceId: profile.id, counts });
    for (const bpm of tempi) {
      templateRisks.push(...auditCompiledTransitions(compiled, bpm, postOnsetMs, { loop: true })
        .filter(item => item.overlapMs > 20)
        .map(item => ({ ...roundTransition(item), bpm, example: counts })));
    }
  }
  templateRisks.sort((a, b) => b.overlapMs - a.overlapMs);
  const risks = [...uniqueTransitions.values()].filter(item => item.overlapMs > 20).sort((a, b) => b.overlapMs - a.overlapMs);
  dances.push({
    danceId: profile.id,
    dance: profile.name,
    atomicCases: atomicCases.length,
    eventCount,
    exactTickChecks,
    templates: profile.templates.length,
    tempi,
    transitionTypes: uniqueTransitions.size,
    collisionRiskTypes: risks.length,
    worstCollision: risks[0] ? roundTransition(risks[0]) : null,
    templateCollisionRisks: templateRisks.length,
    worstTemplateCollision: templateRisks[0] ?? null
  });
}

let compiledRoutines = 0;
let compiledFigures = 0;
const figureCheckFailures = [];
let figureSyntaxChecks = 0;
for (const routine of report.routines) {
  for (const [figureIndex, figure] of routine.figures.entries()) {
    figureSyntaxChecks += 1;
    try {
      const leadingSubdivision = /^[&ae]/.test(figure.counts) ? 'pickup' : null;
      compileRhythm({ danceId: routine.danceId, counts: figure.counts, leadingSubdivision });
    } catch (error) {
      figureCheckFailures.push({ routineId: routine.id, routine: routine.name, figureIndex, figure: figure.name, counts: figure.counts, message: error.message });
    }
  }
}
for (const routine of report.routines.filter(item => item.status === 'mechanically-valid-unreviewed')) {
  const compiled = compileRoutine({ danceId: routine.danceId, figures: routine.figures });
  if (!compiled.events.every(event => Number.isInteger(event.absoluteTick))) throw new Error(`${routine.name}: tickが整数ではありません`);
  compiledRoutines += 1;
  compiledFigures += routine.figures.length;
}

const result = {
  generatedAt: new Date().toISOString(),
  scope: {
    dances: dances.length,
    atomicCases: dances.reduce((sum, dance) => sum + dance.atomicCases, 0),
    atomicEvents: dances.reduce((sum, dance) => sum + dance.eventCount, 0),
    exactTickToMsChecks: dances.reduce((sum, dance) => sum + dance.exactTickChecks, 0),
    templates: dances.reduce((sum, dance) => sum + dance.templates, 0),
    compiledRoutines,
    compiledFigures,
    figureSyntaxChecks,
    figureCheckFailures: figureCheckFailures.length,
    reportRoutines: report.summary.routineCount,
    reportFigures: report.summary.figureCount
  },
  voices: voiceMetrics,
  onsetMismatches: Object.entries(voiceMetrics).filter(([, value]) => value.onsetDeltaMs !== 0).map(([key, value]) => ({ key, deltaMs: value.onsetDeltaMs })),
  figureCheckFailures,
  dances,
  needsReview: report.routines.filter(item => item.status === 'needs-review').map(item => ({
    id: item.id,
    name: item.name,
    issueCodes: [...new Set(item.issues.filter(issue => issue.severity !== 'info').map(issue => issue.code))],
    reviewIssues: item.issues.filter(issue => issue.severity !== 'info')
  }))
};

const outputPath = path.join(root, 'output/all-dance-timing-audit.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.table(dances.map(item => ({
  種目: item.dance,
  原子ケース: item.atomicCases,
  tick実測: item.exactTickChecks,
  遷移種類: item.transitionTypes,
  重なり注意: item.collisionRiskTypes,
  最大重なりms: item.worstCollision?.overlapMs ?? 0,
  標準例の注意: item.templateCollisionRisks,
  標準例最大ms: item.worstTemplateCollision?.overlapMs ?? 0,
  標準例: item.worstTemplateCollision?.example ?? '-'
})));
console.log(JSON.stringify({ outputPath, ...result.scope, onsetMismatches: result.onsetMismatches.length }, null, 2));

async function measureVoiceMetrics(directory, voiceManifest) {
  const metrics = {};
  for (const [key, word] of Object.entries(voiceManifest.words)) {
    const wav = parsePcm16Wav(await fs.readFile(path.join(directory, word.file)));
    const measured = measureOnset(wav.samples, wav.sampleRate);
    const activeEndMs = findActiveEndMs(wav.samples, wav.sampleRate, measured.threshold);
    let peak = 0;
    let sumSquares = 0;
    for (const sample of wav.samples) {
      peak = Math.max(peak, Math.abs(sample));
      sumSquares += sample ** 2;
    }
    metrics[key] = {
      fileMs: Math.round(wav.samples.length / wav.sampleRate * 1000),
      manifestOnsetMs: word.onsetMs,
      measuredOnsetMs: measured.onsetMs,
      onsetDeltaMs: measured.onsetMs - word.onsetMs,
      activeEndMs,
      postOnsetMs: activeEndMs - measured.onsetMs,
      peak: Number(peak.toFixed(3)),
      rms: Number(Math.sqrt(sumSquares / wav.samples.length).toFixed(3))
    };
  }
  return metrics;
}

function findActiveEndMs(samples, sampleRate, threshold) {
  const windowSize = Math.max(1, Math.round(sampleRate * 0.005));
  let lastActiveFrame = 0;
  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) sumSquares += samples[index] ** 2;
    if (Math.sqrt(sumSquares / (end - start)) >= threshold) lastActiveFrame = end;
  }
  return Math.round(lastActiveFrame / sampleRate * 1000);
}

function roundTransition(item) {
  return { ...item, gapMs: Math.round(item.gapMs), overlapMs: Math.round(item.overlapMs) };
}
