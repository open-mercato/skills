import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadRun, readJson, writeJson, writeText } from './storage.mjs';
import { pairs } from './runner.mjs';
import { digest } from './metrics.mjs';

const note = 'Fixed baseline-first order can warm caches. Cached input is included in input tokens; reasoning is a subset of output, not an additional total. Unknown usage remains null. No prices or precision/recall are inferred. Natural cases and heuristic prose metrics do not establish quality. One sample is not a stable estimate. Ambient globally discoverable skill metadata may remain. Native import cohorts and CLI cohorts are separate.';
const numeric = (value) => typeof value === 'number' && Number.isFinite(value);
const mean = (values) => values.length && values.every(numeric) ? values.reduce((total, value) => total + value, 0) / values.length : null;
const valueAt = (trial, key) => key.startsWith('usage.') ? trial.metrics?.usage?.[key.slice(6)] ?? null :
  key.startsWith('text.') ? trial.textMetrics?.[key.slice(5)] ?? null : trial[key] ?? trial.metrics?.[key] ?? null;
const measurements = ['usage.inputTokens', 'usage.cachedInputTokens', 'usage.cacheWriteInputTokens', 'usage.outputTokens',
  'usage.reasoningOutputTokens', 'usage.totalTokens', 'completedToolCalls', 'agentMessages', 'elapsedSeconds',
  'text.words', 'text.bytes', 'text.heuristicMeanSentenceWords', 'text.heuristicSemicolons'];
const delta = (baseline, candidate) => ({ baseline, candidate, delta: numeric(baseline) && numeric(candidate) ? candidate - baseline : null,
  percent: numeric(baseline) && baseline !== 0 && numeric(candidate) ? (candidate - baseline) / baseline * 100 : null });
const cell = (value) => String(value ?? 'unknown').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/\|/gu, '\\|').replace(/[\r\n]+/gu, ' ');
const csv = (value) => `"${String(value ?? '').replace(/"/gu, '""')}"`;

export async function report(output, { assessmentsFile } = {}) {
  const { root, manifest } = await loadRun(output, { verifyInputs: false });
  const trials = [];
  for (const job of pairs(manifest)) {
    for (const variant of ['baseline', 'candidate']) {
      const id = `${job.id}-${variant}`;
      const directory = path.join(root, 'trials', id);
      let names;
      try { names = await fs.readdir(directory); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      for (const name of names.filter((entry) => /^attempt-[0-9]+$/u.test(entry)).sort((left, right) => Number(left.slice(8)) - Number(right.slice(8)))) {
        const attemptDirectory = path.join(directory, name);
        if ((await fs.lstat(attemptDirectory)).isSymbolicLink()) throw new Error('Attempt path must not be a symlink');
        try { trials.push(await readJson(path.join(attemptDirectory, 'result.json'))); }
        catch (error) {
          if (error.code !== 'ENOENT') throw error;
          const metadata = await readJson(path.join(attemptDirectory, 'trial.json'));
          trials.push({ ...metadata, status: 'interrupted', metrics: {}, artifact: { artifactText: '' } });
        }
      }
    }
  }
  let assessments = [];
  if (assessmentsFile) {
    const provided = await readJson(assessmentsFile);
    if (provided.version !== 1 || !Array.isArray(provided.assessments)) throw new Error('Assessments require version 1 and assessments[]');
    assessments = provided.assessments;
    for (const assessment of assessments) {
      if (!trials.some((trial) => trial.id === assessment.trialId && trial.cohort === assessment.cohort)) throw new Error('Assessment refers to an unknown trial/cohort');
      if (assessment.qualityScore !== undefined && (!numeric(assessment.qualityScore) || typeof assessment.scale !== 'string')) throw new Error('Quality scores require a finite number and explicit scale');
    }
  }
  const latest = new Map();
  for (const trial of trials) latest.set(`${trial.cohort}/${trial.id}`, trial);
  const cohorts = [...new Set(trials.map((trial) => trial.cohort))];
  const comparisons = [];
  for (const cohort of cohorts) for (const job of pairs(manifest)) {
    const baseline = latest.get(`${cohort}/${job.id}-baseline`);
    const candidate = latest.get(`${cohort}/${job.id}-candidate`);
    if (!baseline && !candidate) continue;
    const complete = baseline?.status === 'completed' && candidate?.status === 'completed';
    comparisons.push({ pairId: job.id, caseId: job.caseId, model: job.model.name, reasoningEffort: job.model.reasoningEffort,
      repetition: job.repetition, cohort, complete,
      baselineStatus: baseline?.status ?? 'missing', candidateStatus: candidate?.status ?? 'missing',
      measurements: Object.fromEntries(measurements.map((key) => [key, delta(baseline ? valueAt(baseline, key) : null, candidate ? valueAt(candidate, key) : null)])),
      artifacts: { baseline: baseline?.artifact ?? null, candidate: candidate?.artifact ?? null },
      assessments: { baseline: assessments.filter((entry) => entry.trialId === baseline?.id && entry.cohort === cohort),
        candidate: assessments.filter((entry) => entry.trialId === candidate?.id && entry.cohort === cohort) } });
  }
  const groups = new Map();
  for (const pair of comparisons) {
    for (const caseId of [pair.caseId, '*']) {
      const key = JSON.stringify([pair.cohort, pair.model, pair.reasoningEffort, caseId]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(pair);
    }
  }
  const aggregates = [...groups].map(([key, entries]) => {
    const [cohort, model, reasoningEffort, caseId] = JSON.parse(key);
    const complete = entries.filter((entry) => entry.complete);
    return { cohort, model, reasoningEffort, caseId, completePairs: complete.length, incompletePairs: entries.length - complete.length,
      measurements: Object.fromEntries(measurements.map((measurement) => [measurement,
        delta(mean(complete.map((entry) => entry.measurements[measurement].baseline)), mean(complete.map((entry) => entry.measurements[measurement].candidate)))])) };
  });
  const exportedTrials = trials.map((trial) => {
    const { spawnError, ...exported } = trial;
    const { errors, ...metrics } = exported.metrics;
    return { ...exported, spawnError: Boolean(spawnError), metrics: { ...metrics, errorCount: errors?.length ?? 0 } };
  });
  const summary = { version: 1, runId: manifest.runId, skill: manifest.config.skill.name,
    variants: Object.fromEntries(Object.entries(manifest.variants).map(([name, entry]) => [name, entry.commit])),
    expectedCliTrials: pairs(manifest).length * 2, recordedAttempts: trials.length, note,
    trials: exportedTrials, comparisons, aggregates, assessments };
  const directory = path.join(root, 'reports');
  try { if ((await fs.lstat(directory)).isSymbolicLink()) throw new Error('Reports path must not be a symlink'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await writeJson(path.join(directory, 'report.json'), summary);
  const columns = ['cohort', 'model', 'reasoningEffort', 'caseId', 'repetition', 'complete', 'baselineStatus', 'candidateStatus',
    ...measurements.flatMap((key) => [`${key}.baseline`, `${key}.candidate`, `${key}.delta`, `${key}.percent`])];
  const rows = comparisons.map((pair) => [pair.cohort, pair.model, pair.reasoningEffort, pair.caseId, pair.repetition, pair.complete,
    pair.baselineStatus, pair.candidateStatus, ...measurements.flatMap((key) => ['baseline', 'candidate', 'delta', 'percent'].map((field) => pair.measurements[key][field]))]);
  await writeText(path.join(directory, 'pairs.csv'), `${[columns, ...rows].map((row) => row.map(csv).join(',')).join('\n')}\n`);
  const markdown = [`# Skill evaluation: ${manifest.config.skill.name}`, '', note, '',
    `Expected CLI trials: ${summary.expectedCliTrials}. Recorded attempts: ${trials.length}. Failed, partial and retried attempts remain in report.json.`, '',
    '| Cohort | Model / effort | Case | Complete pairs | Incomplete pairs | Total token delta | Tool delta | Seconds delta |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...aggregates.map((entry) => `| ${[entry.cohort, `${entry.model} / ${entry.reasoningEffort}`, entry.caseId, entry.completePairs, entry.incompletePairs,
      entry.measurements['usage.totalTokens'].delta, entry.measurements.completedToolCalls.delta, entry.measurements.elapsedSeconds.delta].map(cell).join(' | ')} |`), '',
    '## Generated artifacts side by side', '',
    '| Pair / cohort | Baseline | Candidate |', '| --- | --- | --- |',
    ...comparisons.map((pair) => `| ${cell(`${pair.pairId} / ${pair.cohort}`)} | ${cell(pair.artifacts.baseline?.artifactText)} | ${cell(pair.artifacts.candidate?.artifactText)} |`), '',
    '## Adjudicated quality', '', assessments.length ?
      '| Trial / cohort | Human score | Scale | Notes |\n| --- | ---: | --- | --- |\n' + assessments.map((entry) => `| ${[`${entry.trialId} / ${entry.cohort}`, entry.qualityScore, entry.scale, entry.notes].map(cell).join(' | ')} |`).join('\n') :
      'No assessments supplied. Compare blinded artifacts independently before interpreting cost savings as an improvement.', ''];
  await writeText(path.join(directory, 'report.md'), markdown.join('\n'));
  const blinded = [];
  const key = [];
  for (const trial of latest.values()) {
    const blindId = digest(`${manifest.runId}/${trial.cohort}/${trial.id}`).slice(0, 16);
    blinded.push({ blindId, caseId: trial.caseId, status: trial.status, artifact: trial.artifact });
    key.push({ blindId, trialId: trial.id, cohort: trial.cohort, variant: trial.variant, model: trial.requestedModel });
  }
  blinded.sort((left, right) => left.blindId.localeCompare(right.blindId));
  await writeJson(path.join(directory, 'blinded-artifacts.json'), { version: 1, artifacts: blinded });
  await writeJson(path.join(directory, 'blinding-key.private.json'), { version: 1, key });
  return { report: path.join(directory, 'report.md'), recordedAttempts: trials.length, completePairs: comparisons.filter((entry) => entry.complete).length };
}
