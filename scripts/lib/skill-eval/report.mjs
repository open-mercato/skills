import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadRun, readJson, writeJson, writeText, listAttempts, readAttempt } from './storage.mjs';
import { pairs } from './runner.mjs';
import { artifactDigest, checkExpectations, digest } from './metrics.mjs';

const orderNotes = {
  'baseline-first': 'Fixed baseline-first order can warm caches and bias elapsed time and cached input toward the candidate.',
  interleaved: 'Interleaved (ABBA) order alternates which arm runs first per pair; it reduces order effects but does not remove them.',
  random: 'Trials ran in a seeded random order; the seed is recorded in manifest.json.',
};
function buildNote(manifest) {
  return [orderNotes[manifest.config.order ?? 'baseline-first'],
    'Deltas, intervals and expectation pass rates cover complete pairs only; failed, partial, timed-out, cancelled, interrupted and retried attempts appear in the per-arm attempt counts and non-completed cost.',
    'Cached input is included in input tokens; reasoning is a subset of output, not an additional total. Unknown usage remains null. No prices or precision/recall are inferred.',
    'Natural cases and heuristic prose metrics do not establish quality.',
    'Trials forbid delegation to other agents, so a skill whose procedure delegates is measured running a single-agent variant of that procedure.',
    'Trials name the assigned SKILL.md directly: they measure how a skill executes, not whether its description triggers it. Codex CLI is the only backend; another harness can behave differently.',
    'Ambient globally discoverable skill metadata may remain. Native import cohorts and CLI cohorts are separate.'].join(' ');
}
const numeric = (value) => typeof value === 'number' && Number.isFinite(value);
const mean = (values) => values.length && values.every(numeric) ? values.reduce((total, value) => total + value, 0) / values.length : null;
const valueAt = (trial, key) => key.startsWith('usage.') ? trial.metrics?.usage?.[key.slice(6)] ?? null :
  key.startsWith('text.') ? trial.textMetrics?.[key.slice(5)] ?? null : trial[key] ?? trial.metrics?.[key] ?? null;
const measurements = ['usage.inputTokens', 'usage.cachedInputTokens', 'usage.cacheWriteInputTokens', 'usage.outputTokens',
  'usage.reasoningOutputTokens', 'usage.totalTokens', 'completedToolCalls', 'agentMessages', 'elapsedSeconds',
  'text.words', 'text.bytes', 'text.heuristicMeanSentenceWords', 'text.heuristicMaxSentenceWords', 'text.heuristicSemicolons'];
const delta = (baseline, candidate) => ({ baseline, candidate, delta: numeric(baseline) && numeric(candidate) ? candidate - baseline : null,
  percent: numeric(baseline) && baseline !== 0 && numeric(candidate) ? (candidate - baseline) / baseline * 100 : null });
const cell = (value) => String(value ?? 'unknown').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/\|/gu, '\\|').replace(/[\r\n]+/gu, ' ');
// Two-sided 95% Student t quantiles for df 1..30.
const tTable = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131,
  2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
const tQuantile = (df) => df <= 30 ? tTable[df - 1] : df <= 60 ? 2.0 : df <= 120 ? 1.98 : 1.96;
const sampleSd = (values) => {
  if (values.length < 2) return null;
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return Math.sqrt(values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1));
};
// Paired-delta dispersion. With two or more cases the interval is clustered by case (a t interval over
// per-case mean deltas, each case weighted equally); within one case it is a t interval over pair deltas.
function pairedStatistics(entries, measurement) {
  const deltas = entries.map((entry) => ({ caseId: entry.caseId, value: entry.measurements[measurement].delta })).filter((entry) => numeric(entry.value));
  const values = deltas.map((entry) => entry.value);
  const byCase = new Map();
  for (const entry of deltas) byCase.set(entry.caseId, [...(byCase.get(entry.caseId) ?? []), entry.value]);
  const caseMeans = [...byCase.values()].map((list) => list.reduce((total, value) => total + value, 0) / list.length);
  const [sample, method] = caseMeans.length >= 2 ? [caseMeans, 'case-clustered-t'] : values.length >= 2 ? [values, 'paired-t'] : [[], null];
  const center = sample.length ? sample.reduce((total, value) => total + value, 0) / sample.length : null;
  const spread = sampleSd(sample);
  const half = spread === null ? null : tQuantile(sample.length - 1) * spread / Math.sqrt(sample.length);
  return { pairs: values.length, cases: caseMeans.length, meanDelta: mean(values), sd: sampleSd(values),
    ci95: half === null ? null : { method, center, low: center - half, high: center + half } };
}
const round = (value, digits = 1) => numeric(value) ? Number(value.toFixed(digits)) : value;
const interval = (statistics) => statistics.ci95 ? `${round(statistics.ci95.center)} [${round(statistics.ci95.low)}, ${round(statistics.ci95.high)}]` : 'n/a';
const csv = (value) => `"${String(value ?? '').replace(/"/gu, '""')}"`;

export async function report(output, { assessmentsFile } = {}) {
  const { root, manifest } = await loadRun(output, { verifyInputs: false });
  const trials = [];
  function addTrial(trial) {
    const calculated = artifactDigest(trial.artifact);
    if (trial.artifactDigest && trial.artifactDigest !== calculated) throw new Error(`Stored artifact digest mismatch for ${trial.id}`);
    trials.push({ ...trial, artifactDigest: calculated });
  }
  for (const job of pairs(manifest)) {
    for (const variant of ['baseline', 'candidate']) {
      const id = `${job.id}-${variant}`;
      const directory = path.join(root, 'trials', id);
      let names;
      try { names = await listAttempts(directory); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      for (const name of names) {
        const attemptDirectory = path.join(directory, name);
        if ((await fs.lstat(attemptDirectory)).isSymbolicLink()) throw new Error('Attempt path must not be a symlink');
        const stored = await readAttempt(attemptDirectory);
        if (stored?.file === 'result.json') addTrial(stored.value);
        else if (stored) addTrial({ ...stored.value, status: 'interrupted', metrics: {}, artifact: { artifactText: '' } });
        else addTrial({ version: 1, id, pairId: job.id, caseId: job.caseId, repetition: job.repetition, variant, attempt: Number(name.slice(8)),
          skill: manifest.config.skill.name, skillCommit: manifest.variants[variant].commit, requestedModel: job.model.name,
          reasoningEffort: job.model.reasoningEffort, backend: 'unknown', cohort: 'cli', metadataMissing: true,
          status: 'interrupted', metrics: {}, artifact: { artifactText: '' } });
      }
    }
  }
  const expectationsByCase = new Map(manifest.cases.filter((entry) => entry.expectations).map((entry) => [entry.id, entry.expectations]));
  for (const trial of trials) {
    const expected = expectationsByCase.get(trial.caseId);
    if (expected && trial.status === 'completed') trial.expectations = checkExpectations(trial.artifact, expected);
  }
  const latest = new Map();
  for (const trial of trials) latest.set(`${trial.cohort}/${trial.id}`, trial);
  let assessments = [];
  if (assessmentsFile) {
    const provided = await readJson(assessmentsFile);
    if (provided.version !== 1 || !Array.isArray(provided.assessments)) throw new Error('Assessments require version 1 and assessments[]');
    assessments = provided.assessments;
    for (const assessment of assessments) {
      const current = latest.get(`${assessment.cohort}/${assessment.trialId}`);
      if (!current) throw new Error('Assessment refers to an unknown trial/cohort');
      if (typeof assessment.artifactDigest !== 'string' || !/^[a-f0-9]{64}$/u.test(assessment.artifactDigest)) throw new Error('Assessments require an explicit artifactDigest from the report or blinding key');
      if (assessment.artifactDigest !== current.artifactDigest) throw new Error(`Stale assessment for ${assessment.trialId}: artifactDigest does not match the latest artifact`);
      if (assessment.qualityScore !== undefined && (!numeric(assessment.qualityScore) || typeof assessment.scale !== 'string')) throw new Error('Quality scores require a finite number and explicit scale');
    }
  }
  const cohorts = [...new Set(['cli', ...trials.map((trial) => trial.cohort)])];
  const comparisons = [];
  for (const cohort of cohorts) for (const job of pairs(manifest)) {
    const baseline = latest.get(`${cohort}/${job.id}-baseline`);
    const candidate = latest.get(`${cohort}/${job.id}-candidate`);
    if (cohort !== 'cli' && !baseline && !candidate) continue;
    const complete = baseline?.status === 'completed' && candidate?.status === 'completed';
    comparisons.push({ pairId: job.id, caseId: job.caseId, model: job.model.name, reasoningEffort: job.model.reasoningEffort,
      repetition: job.repetition, cohort, complete,
      baselineStatus: baseline?.status ?? 'missing', candidateStatus: candidate?.status ?? 'missing',
      measurements: Object.fromEntries(measurements.map((key) => [key, delta(baseline ? valueAt(baseline, key) : null, candidate ? valueAt(candidate, key) : null)])),
      ...(expectationsByCase.has(job.caseId) ? { expectations: { baseline: baseline?.expectations?.passed ?? false, candidate: candidate?.expectations?.passed ?? false } } : {}),
      artifacts: { baseline: baseline?.artifact ?? null, candidate: candidate?.artifact ?? null },
      artifactDigests: { baseline: baseline?.artifactDigest ?? null, candidate: candidate?.artifactDigest ?? null },
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
  const sum = (values) => values.filter(numeric).reduce((total, value) => total + value, 0);
  // Guardrails count every recorded attempt, so failures that were later retried stay visible.
  function guardrail(cohort, model, reasoningEffort, caseId, variant) {
    const attempts = trials.filter((trial) => trial.cohort === cohort && trial.requestedModel === model && trial.reasoningEffort === reasoningEffort &&
      trial.variant === variant && (caseId === '*' || trial.caseId === caseId));
    const failedAttempts = attempts.filter((trial) => trial.status !== 'completed');
    const tokens = failedAttempts.map((trial) => trial.metrics?.usage?.totalTokens ?? null);
    const seconds = failedAttempts.map((trial) => trial.elapsedSeconds ?? null);
    return { attempts: attempts.length,
      byStatus: Object.fromEntries([...new Set(attempts.map((trial) => trial.status))].sort().map((status) => [status, attempts.filter((trial) => trial.status === status).length])),
      nonCompleted: { attempts: failedAttempts.length, totalTokens: sum(tokens), unknownTokenAttempts: tokens.filter((value) => !numeric(value)).length,
        elapsedSeconds: sum(seconds), unknownElapsedAttempts: seconds.filter((value) => !numeric(value)).length } };
  }
  function expectationSummary(entries, complete) {
    if (!entries.some((entry) => entry.expectations)) return null;
    const judged = complete.filter((entry) => entry.expectations);
    const count = (predicate) => judged.filter(predicate).length;
    // pass^k: share of cases whose every expected repetition passed (missing or failed trials count as failures).
    const passAll = (variant) => {
      const byCase = new Map();
      for (const entry of entries.filter((item) => item.expectations)) byCase.set(entry.caseId, (byCase.get(entry.caseId) ?? true) && entry.expectations[variant]);
      return byCase.size ? [...byCase.values()].filter(Boolean).length / byCase.size : null;
    };
    return { completePairs: judged.length, baselinePassed: count((entry) => entry.expectations.baseline), candidatePassed: count((entry) => entry.expectations.candidate),
      paired: { both: count((entry) => entry.expectations.baseline && entry.expectations.candidate),
        baselineOnly: count((entry) => entry.expectations.baseline && !entry.expectations.candidate),
        candidateOnly: count((entry) => !entry.expectations.baseline && entry.expectations.candidate),
        neither: count((entry) => !entry.expectations.baseline && !entry.expectations.candidate) },
      passHatK: { k: manifest.config.repetitions, baseline: passAll('baseline'), candidate: passAll('candidate') } };
  }
  const aggregates = [...groups].map(([key, entries]) => {
    const [cohort, model, reasoningEffort, caseId] = JSON.parse(key);
    const complete = entries.filter((entry) => entry.complete);
    const incomplete = entries.filter((entry) => !entry.complete);
    const ok = (status) => status === 'completed';
    const expectations = expectationSummary(entries, complete);
    return { cohort, model, reasoningEffort, caseId, completePairs: complete.length, incompletePairs: incomplete.length,
      incompleteByArm: { baselineOnly: incomplete.filter((entry) => !ok(entry.baselineStatus) && ok(entry.candidateStatus)).length,
        candidateOnly: incomplete.filter((entry) => ok(entry.baselineStatus) && !ok(entry.candidateStatus)).length,
        both: incomplete.filter((entry) => !ok(entry.baselineStatus) && !ok(entry.candidateStatus)).length },
      guardrails: { baseline: guardrail(cohort, model, reasoningEffort, caseId, 'baseline'), candidate: guardrail(cohort, model, reasoningEffort, caseId, 'candidate') },
      measurements: Object.fromEntries(measurements.map((measurement) => [measurement,
        delta(mean(complete.map((entry) => entry.measurements[measurement].baseline)), mean(complete.map((entry) => entry.measurements[measurement].candidate)))])),
      statistics: Object.fromEntries(measurements.map((measurement) => [measurement, pairedStatistics(complete, measurement)])),
      ...(expectations ? { expectations } : {}) };
  });
  const warnings = [];
  if (manifest.config.repetitions === 1) warnings.push('repetitions is 1: each pair is a single sample, so no dispersion or interval can be estimated within a case and deltas are not stable estimates. Use at least 3 repetitions.');
  try { await fs.access(path.join(root, '.running')); warnings.push('A writer lock (.running) exists: a run, import or cleanup may be active, and in-flight trials are reported as interrupted. Re-run report after it finishes.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const note = buildNote(manifest);
  const exportedTrials = trials.map((trial) => {
    const { spawnError, ...exported } = trial;
    const { errors, ...metrics } = exported.metrics;
    return { ...exported, spawnError: Boolean(spawnError), metrics: { ...metrics, errorCount: errors?.length ?? 0 } };
  });
  const summary = { version: 1, runId: manifest.runId, skill: manifest.config.skill.name,
    variants: Object.fromEntries(Object.entries(manifest.variants).map(([name, entry]) => [name, entry.commit])),
    order: manifest.config.order ?? 'baseline-first', ...(manifest.config.seed !== undefined ? { seed: manifest.config.seed } : {}),
    repetitions: manifest.config.repetitions, expectedCliTrials: pairs(manifest).length * 2, recordedAttempts: trials.length, note, warnings,
    cohortScopes: cohorts.map((cohort) => ({ cohort, scope: cohort === 'cli' ? 'all manifest pairs' : 'imported pairs only',
      pairs: comparisons.filter((pair) => pair.cohort === cohort).length })),
    trials: exportedTrials, comparisons, aggregates, assessments };
  async function outputDirectory(name) {
    const target = path.join(root, name);
    try { if ((await fs.lstat(target)).isSymbolicLink()) throw new Error(`${name} path must not be a symlink`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.mkdir(target, { recursive: true, mode: 0o700 });
    return target;
  }
  const directory = await outputDirectory('reports');
  await writeJson(path.join(directory, 'report.json'), summary);
  const columns = ['cohort', 'model', 'reasoningEffort', 'caseId', 'repetition', 'complete', 'baselineStatus', 'candidateStatus', 'baselineArtifactDigest', 'candidateArtifactDigest',
    ...measurements.flatMap((key) => [`${key}.baseline`, `${key}.candidate`, `${key}.delta`, `${key}.percent`])];
  const rows = comparisons.map((pair) => [pair.cohort, pair.model, pair.reasoningEffort, pair.caseId, pair.repetition, pair.complete,
    pair.baselineStatus, pair.candidateStatus, pair.artifactDigests.baseline, pair.artifactDigests.candidate,
    ...measurements.flatMap((key) => ['baseline', 'candidate', 'delta', 'percent'].map((field) => pair.measurements[key][field]))]);
  await writeText(path.join(directory, 'pairs.csv'), `${[columns, ...rows].map((row) => row.map(csv).join(',')).join('\n')}\n`);
  const arms = (entry, read) => `${cell(read(entry.guardrails.baseline))} / ${cell(read(entry.guardrails.candidate))}`;
  const nonCompleted = (field, unknown) => (arm) => `${round(arm.nonCompleted[field])}${arm.nonCompleted[unknown] ? ` (+${arm.nonCompleted[unknown]} unknown)` : ''}`;
  const expectationRows = aggregates.filter((entry) => entry.expectations);
  const markdown = [`# Skill evaluation: ${manifest.config.skill.name}`, '',
    ...warnings.map((warning) => `> **Warning:** ${warning}\n`), note, '',
    `Order: ${summary.order}${summary.seed !== undefined ? ` (seed ${summary.seed})` : ''}. Repetitions: ${summary.repetitions}. Expected CLI trials: ${summary.expectedCliTrials}. Recorded attempts: ${trials.length}. Every attempt remains in report.json.`, '',
    'CLI aggregates include every manifest pair, including trials that never started. Native cohorts cover imported pairs only. Deltas are differences of means over complete pairs (unknown when any pair lacks the value). The 95% interval column shows its own centre and covers pairs with known values; when two or more cases are pooled it is clustered by case and weights each case equally, so its centre can differ from the delta. Attempt columns count completed / all attempts per arm (baseline / candidate), including retried failures, and non-completed cost sums the tokens and seconds those attempts spent.', '',
    '| Cohort | Model / effort | Case | Complete pairs | Incomplete (baseline / candidate / both failed) | Total token delta | Interval centre [95% CI] | Tool delta | Seconds delta | Completed / all attempts | Non-completed tokens | Non-completed seconds |',
    '| --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |',
    ...aggregates.map((entry) => `| ${[entry.cohort, `${entry.model} / ${entry.reasoningEffort}`, entry.caseId, entry.completePairs,
      `${entry.incompleteByArm.baselineOnly} / ${entry.incompleteByArm.candidateOnly} / ${entry.incompleteByArm.both}`,
      round(entry.measurements['usage.totalTokens'].delta), interval(entry.statistics['usage.totalTokens']),
      round(entry.measurements.completedToolCalls.delta), round(entry.measurements.elapsedSeconds.delta)].map(cell).join(' | ')} | ${[
      arms(entry, (arm) => `${arm.byStatus.completed ?? 0}/${arm.attempts}`),
      arms(entry, nonCompleted('totalTokens', 'unknownTokenAttempts')), arms(entry, nonCompleted('elapsedSeconds', 'unknownElapsedAttempts'))].join(' | ')} |`), '',
    ...(expectationRows.length ? ['## Pre-registered expectations', '',
      'Literal phrase checks frozen in the manifest before execution, over complete pairs. pass^k is the share of cases whose every repetition passed, counting missing or failed trials as failures.', '',
      '| Cohort | Model / effort | Case | Judged pairs | Baseline passed | Candidate passed | Both / baseline only / candidate only / neither | pass^k baseline / candidate |',
      '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
      ...expectationRows.map(({ cohort, model, reasoningEffort, caseId, expectations: result }) => `| ${[cohort, `${model} / ${reasoningEffort}`, caseId, result.completePairs,
        result.baselinePassed, result.candidatePassed,
        `${result.paired.both} / ${result.paired.baselineOnly} / ${result.paired.candidateOnly} / ${result.paired.neither}`,
        `${round(result.passHatK.baseline, 2)} / ${round(result.passHatK.candidate, 2)} (k=${result.passHatK.k})`].map(cell).join(' | ')} |`), ''] : []),
    '## Generated artifacts side by side', '',
    '| Pair / cohort | Baseline | Candidate |', '| --- | --- | --- |',
    ...comparisons.map((pair) => `| ${cell(`${pair.pairId} / ${pair.cohort}`)} | ${cell(pair.artifacts.baseline?.artifactText)} | ${cell(pair.artifacts.candidate?.artifactText)} |`), '',
    '## Adjudicated quality', '', assessments.length ?
      '| Trial / cohort | Artifact digest | Human score | Scale | Notes |\n| --- | --- | ---: | --- | --- |\n' + assessments.map((entry) => `| ${[`${entry.trialId} / ${entry.cohort}`, entry.artifactDigest, entry.qualityScore, entry.scale, entry.notes].map(cell).join(' | ')} |`).join('\n') :
      'No assessments supplied. Compare blinded artifacts independently before interpreting cost savings as an improvement.', ''];
  await writeText(path.join(directory, 'report.md'), markdown.join('\n'));
  const blinded = [];
  const key = [];
  for (const trial of latest.values()) {
    const blindId = digest(`${manifest.runId}/${trial.cohort}/${trial.id}/${trial.artifactDigest}`).slice(0, 16);
    blinded.push({ blindId, caseId: trial.caseId, status: trial.status, artifactDigest: trial.artifactDigest, artifact: trial.artifact });
    key.push({ blindId, trialId: trial.id, cohort: trial.cohort, artifactDigest: trial.artifactDigest, variant: trial.variant, model: trial.requestedModel });
  }
  blinded.sort((left, right) => left.blindId.localeCompare(right.blindId));
  // The judge-facing file lives alone in judge/; the key and every identifying report stay elsewhere.
  const judge = await outputDirectory('judge');
  const secret = await outputDirectory('private');
  await writeJson(path.join(judge, 'blinded-artifacts.json'), { version: 1, artifacts: blinded });
  await writeJson(path.join(secret, 'blinding-key.private.json'), { version: 1, key });
  for (const legacy of ['blinded-artifacts.json', 'blinding-key.private.json']) await fs.rm(path.join(directory, legacy), { force: true });
  for (const warning of warnings) process.stderr.write(`skill-eval: warning: ${warning}\n`);
  return { report: path.join(directory, 'report.md'), blindedArtifacts: path.join(judge, 'blinded-artifacts.json'),
    blindingKey: path.join(secret, 'blinding-key.private.json'), recordedAttempts: trials.length,
    completePairs: comparisons.filter((entry) => entry.complete).length, warnings };
}
