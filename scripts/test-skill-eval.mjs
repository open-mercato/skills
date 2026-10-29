import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { prepare, loadConfig, loadRun, cleanup, treeDigest, readJson } from './lib/skill-eval/storage.mjs';
import { run, importNative, schedule } from './lib/skill-eval/runner.mjs';
import { report } from './lib/skill-eval/report.mjs';
import { artifactDigest, checkExpectations, parseCodexStream, parseNativeSession, textMetrics } from './lib/skill-eval/metrics.mjs';

const execute = promisify(execFile);
const cli = path.resolve('scripts/skill-eval.mjs');
const git = async (directory, ...args) => (await execute('git', ['-C', directory, ...args])).stdout.trim();

async function fixture(t, { mode = 'success', skillName = 'describe-change', outputName = 'run' } = {}) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-eval-test-'));
  const collection = path.join(temporary, 'collection');
  const source = path.join(temporary, 'source');
  const configDirectory = path.join(temporary, 'config');
  const context = path.join(configDirectory, 'evidence');
  const out = path.join(temporary, outputName);
  for (const directory of [collection, source, context]) await fs.mkdir(directory, { recursive: true });
  for (const directory of [collection, source]) {
    await git(directory, 'init', '-q');
    await git(directory, 'config', 'user.name', 'Fixture');
    await git(directory, 'config', 'user.email', 'fixture@example.invalid');
  }
  await fs.mkdir(path.join(collection, 'skills', skillName), { recursive: true });
  await fs.writeFile(path.join(collection, 'skills', skillName, 'SKILL.md'), 'Write a concise description.\n');
  await git(collection, 'add', '.');
  await git(collection, 'commit', '-qm', 'Baseline');
  const baseline = await git(collection, 'rev-parse', 'HEAD');
  await fs.appendFile(path.join(collection, 'skills', skillName, 'SKILL.md'), 'Use one sentence.\n');
  await git(collection, 'commit', '-qam', 'Candidate');
  const candidate = await git(collection, 'rev-parse', 'HEAD');
  await fs.writeFile(path.join(source, 'app.txt'), 'before\n');
  await git(source, 'add', '.');
  await git(source, 'commit', '-qm', 'Source base');
  const base = await git(source, 'rev-parse', 'HEAD');
  await fs.writeFile(path.join(source, 'app.txt'), 'after\n');
  await git(source, 'commit', '-qam', 'Source head');
  const head = await git(source, 'rev-parse', 'HEAD');
  await fs.writeFile(path.join(context, 'request.txt'), 'Summarize this change.');
  const fake = path.join(temporary, 'fake codex.mjs');
  await fs.writeFile(fake, `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
if (args[0] === '--version') { console.log('codex-cli fake-1'); process.exit(0); }
if (args.includes('prompt-input')) process.exit(99);
const prompt = args.at(-1);
if (!args.includes('--ignore-user-config') || args[args.indexOf('--sandbox') + 1] !== 'read-only') process.exit(21);
if (args[args.indexOf('--model') + 1] !== 'model;$(touch SHOULD_NOT_EXIST)') process.exit(22);
if (!prompt.includes('Assigned skill:') || !prompt.includes('Frozen case context:')) process.exit(23);
if (!prompt.includes('Do not spawn or delegate to other agents') || !prompt.includes('trial outputs/results')) process.exit(24);
if (/baseline|candidate/iu.test(prompt)) process.exit(25);
const assigned = prompt.match(/^Assigned skill: (.*)$/mu)[1];
const variant = fs.readFileSync(assigned, 'utf8').includes('Use one sentence.') ? 'candidate' : 'baseline';
const mode = ${JSON.stringify(mode)};
const marker = ${JSON.stringify(path.join(temporary, 'failed-once'))};
const emit = (event) => console.log(JSON.stringify(event));
emit({ type: 'thread.started', thread_id: 'new-context-' + process.pid });
emit({ type: 'turn.started' });
emit({ type: 'item.started', item: { id: 'tool-1', type: 'command_execution' } });
emit({ type: 'item.completed', item: { id: 'tool-1', type: 'command_execution', exit_code: 1 } });
emit({ type: 'item.completed', item: { id: 'tool-1', type: 'command_execution', exit_code: 1 } });
emit({ type: 'item.completed', item: { id: 'msg-1', type: 'agent_message', text: JSON.stringify({ artifactText: variant === 'baseline' ? 'The change improves loading; it adds a useful guard.' : 'Adds a loading guard.', proposedActions: [],
  ...(mode === 'echo-path' ? { evidence: [prompt.split('\\n').find((line) => line.startsWith('Assigned skill:'))] } : {}) }) } });
if (mode === 'mutate') fs.appendFileSync(args[args.indexOf('-C') + 1] + '/app.txt', 'mutated');
if (mode === 'candidate-fails-once' && variant === 'candidate' && !fs.existsSync(marker)) {
  fs.writeFileSync(marker, '');
  emit({ type: 'turn.completed', usage: { input_tokens: 5000, cached_input_tokens: 0, output_tokens: 500 } });
  emit({ type: 'turn.failed', error: { message: 'Fixture failed once' } });
  process.exit(2);
}
if (mode === 'timeout') setTimeout(() => {}, 30000);
else if (mode === 'failure') { emit({ type: 'turn.failed', error: { message: 'Fixture failed' } }); process.exit(2); }
else if (mode === 'malformed') console.log('{malformed');
else if (mode !== 'partial') emit({ type: 'turn.completed', usage: { input_tokens: variant === 'baseline' ? 100 : 80, cached_input_tokens: 20, output_tokens: 10, reasoning_output_tokens: 4 } });
`, { mode: 0o700 });
  const configPath = path.join(configDirectory, 'experiment.json');
  const config = { version: 1, skill: { repository: collection, baseline, candidate, name: skillName },
    models: [{ name: 'model;$(touch SHOULD_NOT_EXIST)', reasoningEffort: 'high' }], repetitions: 1, concurrency: 1,
    codex: { executable: fake, timeoutSeconds: mode === 'timeout' ? 1 : 10 },
    cases: [{ id: 'tiny-case', task: 'Describe the frozen code change. Data: $(touch SHOULD_NOT_EXIST)',
      source: { repository: source, base, head }, contextDirectory: context }] };
  await fs.writeFile(configPath, JSON.stringify(config));
  const before = { source: await treeDigest(source), collection: await treeDigest(collection),
    head: await git(source, 'rev-parse', 'HEAD'), worktrees: await git(source, 'worktree', 'list', '--porcelain') };
  t.after(async () => {
    try { await cleanup(out); } catch {}
    await fs.rm(temporary, { recursive: true, force: true });
  });
  return { temporary, source, collection, context, configPath, config, out, before };
}

test('CLI prepare/run/report/cleanup handles generic skill and paired metrics without source mutations', async (t) => {
  const setup = await fixture(t);
  const prepared = await execute(process.execPath, [cli, 'prepare', '--config', setup.configPath, '--out', setup.out]);
  assert.equal(JSON.parse(prepared.stdout).pairs, 1);
  const dry = await run(setup.out);
  assert.equal(dry.trials, 2);
  assert.deepEqual(await fs.readdir(path.join(setup.out, 'trials')), []);
  const outcome = await run(setup.out, { execute: true });
  assert.deepEqual(outcome, { completed: 2, failed: 0, skipped: 0, cancelled: false });
  const resume = await run(setup.out, { execute: true });
  assert.equal(resume.skipped, 2);
  const generated = await report(setup.out);
  assert.equal(generated.completePairs, 1);
  const summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  const pair = summary.comparisons[0];
  assert.equal(pair.measurements['usage.totalTokens'].delta, -20);
  assert.equal(pair.measurements.completedToolCalls.baseline, 1);
  assert.equal(pair.measurements['usage.cachedInputTokens'].baseline, 20);
  assert.equal(summary.trials[0].metrics.usage.totalTokens, 110);
  assert.equal(summary.trials[0].modelVerification, 'requested-only');
  assert.equal(summary.trials[0].textMetrics.heuristicSemicolons, 1);
  const exported = JSON.stringify(summary);
  assert.ok(!exported.includes(setup.temporary));
  assert.ok(!exported.includes('new-context-'));
  const blinded = await readJson(path.join(setup.out, 'judge', 'blinded-artifacts.json'));
  assert.equal(blinded.artifacts.length, 2);
  assert.ok(!JSON.stringify(blinded).includes('skillCommit'));
  assert.equal(await treeDigest(setup.source), setup.before.source);
  assert.equal(await treeDigest(setup.collection), setup.before.collection);
  assert.equal(await git(setup.source, 'rev-parse', 'HEAD'), setup.before.head);
  await cleanup(setup.out);
  assert.equal(await git(setup.source, 'worktree', 'list', '--porcelain'), setup.before.worktrees);
  await fs.access(path.join(setup.out, 'reports', 'report.md'));
  await assert.rejects(run(setup.out), /drift/u);
});

test('a second skill runs using the same contract; arguments never enter a shell', async (t) => {
  const setup = await fixture(t, { skillName: 'plan-a-release' });
  await prepare(setup.configPath, setup.out);
  assert.equal((await run(setup.out, { execute: true })).completed, 2);
  assert.equal((await report(setup.out)).completePairs, 1);
  await assert.rejects(fs.access(path.join(setup.temporary, 'SHOULD_NOT_EXIST')));
});

test('dry plan exposes executable arguments that preserve shell metacharacters as path data', async (t) => {
  const setup = await fixture(t, { outputName: 'run $(touch dollar-marker) `touch tick-marker`' });
  await prepare(setup.configPath, setup.out);
  const dry = await run(setup.out);
  assert.ok(!('command' in dry));
  assert.deepEqual(dry.commandArgv, [process.execPath, cli, 'run', '--out', await fs.realpath(setup.out), '--execute']);
  const result = await execute(dry.commandArgv[0], dry.commandArgv.slice(1), { cwd: setup.temporary });
  assert.equal(JSON.parse(result.stdout).completed, 2);
  await assert.rejects(fs.access(path.join(setup.temporary, 'dollar-marker')));
  await assert.rejects(fs.access(path.join(setup.temporary, 'tick-marker')));
});

test('config rejects versions, duplicate cases, invalid refs, symlink escapes and nested outputs', async (t) => {
  const setup = await fixture(t);
  for (const change of [
    { ...setup.config, version: 2 },
    { ...setup.config, cases: [...setup.config.cases, ...setup.config.cases] },
    { ...setup.config, skill: { ...setup.config.skill, baseline: '--help' } },
    { ...setup.config, models: [{ name: 'model', reasoningEffort: undefined }] },
  ]) {
    await fs.writeFile(setup.configPath, JSON.stringify(change));
    await assert.rejects(loadConfig(setup.configPath));
  }
  await fs.writeFile(setup.configPath, JSON.stringify(setup.config));
  await assert.rejects(prepare(setup.configPath, path.join(setup.source, 'out')), /separate/u);
  await fs.symlink(setup.source, path.join(setup.temporary, 'source-link'));
  await assert.rejects(prepare(setup.configPath, path.join(setup.temporary, 'source-link', 'out')), /separate/u);
  await fs.symlink(path.join(setup.source, 'app.txt'), path.join(setup.context, 'escape'));
  await assert.rejects(prepare(setup.configPath, setup.out), /symlink/u);
  await fs.rm(path.join(setup.context, 'escape'));
  await fs.writeFile(path.join(setup.out), 'existing data');
  await assert.rejects(prepare(setup.configPath, setup.out));
  assert.equal(await fs.readFile(setup.out, 'utf8'), 'existing data');
});

test('unsafe source symlink cleans only owned worktrees when preparation fails', async (t) => {
  const setup = await fixture(t);
  await fs.symlink('/outside-inputs-secret', path.join(setup.source, 'bad-link'));
  await git(setup.source, 'add', '.');
  await git(setup.source, 'commit', '-qm', 'Unsafe fixture');
  setup.config.cases[0].source.head = await git(setup.source, 'rev-parse', 'HEAD');
  await fs.writeFile(setup.configPath, JSON.stringify(setup.config));
  const worktrees = await git(setup.source, 'worktree', 'list', '--porcelain');
  await assert.rejects(prepare(setup.configPath, setup.out));
  assert.equal(await git(setup.source, 'worktree', 'list', '--porcelain'), worktrees);
  await assert.rejects(fs.access(setup.out));
});

for (const mode of ['failure', 'malformed', 'partial', 'timeout']) {
  test(`preserves ${mode} attempts, unknown usage and explicit retries`, async (t) => {
    const setup = await fixture(t, { mode });
    await prepare(setup.configPath, setup.out);
    const result = await run(setup.out, { execute: true });
    assert.equal(result.failed, 2);
    assert.equal((await run(setup.out, { execute: true })).skipped, 2);
    await run(setup.out, { execute: true, retryFailed: true });
    await report(setup.out);
    const summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
    assert.equal(summary.recordedAttempts, 4);
    assert.equal(summary.comparisons[0].complete, false);
    assert.equal(summary.trials[0].metrics.usage.totalTokens, null);
    assert.equal(summary.aggregates[0].measurements['usage.totalTokens'].delta, null);
  });
}

test('resume rejects frozen input drift and manifest tampering', async (t) => {
  const setup = await fixture(t);
  await prepare(setup.configPath, setup.out);
  const input = path.join(setup.out, 'inputs', 'cases', 'tiny-case', 'context', 'request.txt');
  await fs.appendFile(input, 'changed');
  await assert.rejects(run(setup.out, { execute: true }), /drift/u);
  const manifest = path.join(setup.out, 'manifest.json');
  await fs.appendFile(manifest, ' ');
  await assert.rejects(loadRun(setup.out), /manifest/u);
});

test('native imports deduplicate response usage, verify model and keep cohorts separate', async (t) => {
  const setup = await fixture(t);
  await prepare(setup.configPath, setup.out);
  await run(setup.out, { execute: true });
  const session = path.join(setup.temporary, 'explicit-session.jsonl');
  const usage = { input_tokens: 40, cached_input_tokens: 30, output_tokens: 10, reasoning_output_tokens: 3 };
  const events = [
    { type: 'turn_context', payload: { model: setup.config.models[0].name, effort: 'high' } },
    { type: 'event_msg', payload: { type: 'task_started' } },
    { type: 'token_usage_record', payload: { response_id: 'response-1', usage } },
    { type: 'token_usage_record', payload: { response_id: 'response-1', usage } },
    { type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 999, output_tokens: 999 } } } },
    { type: 'response_item', payload: { type: 'function_call', call_id: 'call-1' } },
    { type: 'response_item', payload: { type: 'function_call', call_id: 'call-1' } },
    { type: 'response_item', payload: { type: 'message', role: 'assistant', phase: 'final_answer', content: [{ type: 'output_text', text: 'Native description.' }] } },
    { type: 'event_msg', payload: { type: 'task_complete' } },
  ];
  await fs.writeFile(session, events.map((entry) => JSON.stringify(entry)).join('\n'));
  const options = { session, pairId: 'm0-tiny-case-r1', variant: 'baseline', model: setup.config.models[0].name, effort: 'high', cohort: 'pilot-native' };
  const trialDirectory = path.join(setup.out, 'trials', 'm0-tiny-case-r1-baseline');
  const priorAttempts = await fs.readdir(trialDirectory);
  await assert.rejects(importNative(setup.out, { ...options, artifactFile: path.join(setup.temporary, 'missing-artifact') }), { code: 'ENOENT' });
  assert.deepEqual(await fs.readdir(trialDirectory), priorAttempts);
  await fs.writeFile(path.join(setup.out, '.running'), '{}');
  await assert.rejects(importNative(setup.out, options), { code: 'EEXIST' });
  assert.deepEqual(await fs.readdir(trialDirectory), priorAttempts);
  assert.equal(await fs.readFile(path.join(setup.out, '.running'), 'utf8'), '{}');
  await fs.rm(path.join(setup.out, '.running'));
  const result = await importNative(setup.out, options);
  assert.equal(result.attempt, 2);
  assert.equal(result.usage.totalTokens, 50);
  assert.equal(result.modelVerification, 'metadata-matched');
  assert.equal(result.effortVerification, 'metadata-matched');
  await importNative(setup.out, { ...options, variant: 'candidate' });
  await assert.rejects(importNative(setup.out, { ...options, model: 'other' }), /model/u);
  await assert.rejects(importNative(setup.out, { ...options, cohort: 'cli' }), /cohort/u);
  await report(setup.out);
  const summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  assert.equal(summary.comparisons.length, 2);
  assert.equal(summary.trials.find((trial) => trial.cohort === 'pilot-native').metrics.completedToolCalls, 1);
  assert.equal(summary.comparisons[0].measurements['usage.totalTokens'].baseline, 110);
  await fs.appendFile(session, '\n' + JSON.stringify({ type: 'event_msg', payload: { type: 'task_started' } }));
  const artifactFile = path.join(setup.temporary, 'artifact.txt');
  await fs.writeFile(artifactFile, 'A supplied artifact does not prove trial completion.');
  assert.equal((await importNative(setup.out, { ...options, artifactFile })).status, 'partial');
  await fs.appendFile(session, '\n' + JSON.stringify({ type: 'event_msg', payload: { type: 'turn_aborted' } }));
  assert.equal((await importNative(setup.out, { ...options, artifactFile })).status, 'interrupted');
  await fs.appendFile(session, '\n' + JSON.stringify({ type: 'turn_context', payload: { model: setup.config.models[0].name, effort: 'low' } }));
  await assert.rejects(importNative(setup.out, options), /effort metadata/u);
});

test('concurrent repetitions use fresh sessions and a complete baseline phase barrier', async (t) => {
  const setup = await fixture(t);
  setup.config.repetitions = 2;
  setup.config.concurrency = 2;
  await fs.writeFile(setup.configPath, JSON.stringify(setup.config));
  await prepare(setup.configPath, setup.out);
  assert.equal((await run(setup.out, { execute: true })).completed, 4);
  await report(setup.out);
  const summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  const baselineFinish = Math.max(...summary.trials.filter((trial) => trial.variant === 'baseline').map((trial) => Date.parse(trial.finishedAt)));
  const candidateStart = Math.min(...summary.trials.filter((trial) => trial.variant === 'candidate').map((trial) => Date.parse(trial.startedAt)));
  assert.ok(candidateStart >= baselineFinish);
  const threads = new Set();
  for (const trial of summary.trials) {
    const raw = await fs.readFile(path.join(setup.out, 'trials', trial.id, 'attempt-1', 'stdout.jsonl'), 'utf8');
    threads.add(JSON.parse(raw.split('\n')[0]).thread_id);
  }
  assert.equal(threads.size, 4);
});

test('SIGTERM preserves cancelled trial evidence and releases execution lock', async (t) => {
  const setup = await fixture(t, { mode: 'timeout' });
  setup.config.codex.timeoutSeconds = 30;
  await fs.writeFile(setup.configPath, JSON.stringify(setup.config));
  await prepare(setup.configPath, setup.out);
  const child = spawn(process.execPath, [cli, 'run', '--out', setup.out, '--execute'], { stdio: 'ignore' });
  const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));
  const rawFile = path.join(setup.out, 'trials', 'm0-tiny-case-r1-baseline', 'attempt-1', 'stdout.jsonl');
  let ready = false;
  for (let poll = 0; poll < 250 && !ready; poll++) {
    try { ready = (await fs.stat(rawFile)).size > 0; } catch {}
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(ready, 'worker emitted a partial stream');
  child.kill('SIGTERM');
  assert.equal((await exited).code, 1);
  await assert.rejects(fs.access(path.join(setup.out, '.running')));
  const result = await readJson(path.join(path.dirname(rawFile), 'result.json'));
  assert.equal(result.status, 'cancelled');
  assert.equal(result.metrics.completedToolCalls, 1);
  assert.equal(result.metrics.usage.totalTokens, null);
});

test('resume rejects changed executor version and reports missing result as interrupted', async (t) => {
  const setup = await fixture(t);
  await prepare(setup.configPath, setup.out);
  await run(setup.out, { execute: true });
  const executable = setup.config.codex.executable;
  await fs.writeFile(executable, (await fs.readFile(executable, 'utf8')).replace('codex-cli fake-1', 'codex-cli fake-2'));
  await assert.rejects(run(setup.out, { execute: true }), /environment drift/u);
  const resultFile = path.join(setup.out, 'trials', 'm0-tiny-case-r1-baseline', 'attempt-1', 'result.json');
  await fs.rm(resultFile);
  await report(setup.out);
  const summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  assert.equal(summary.trials[0].status, 'interrupted');
  assert.equal(summary.comparisons[0].complete, false);
});

test('metrics count completed tool IDs once, preserve unknown usage and handle prose heuristics', () => {
  const stream = [
    { type: 'item.started', item: { id: 'a', type: 'command_execution' } },
    { type: 'item.completed', item: { id: 'a', type: 'command_execution', exit_code: 1 } },
    { type: 'item.completed', item: { id: 'a', type: 'command_execution', exit_code: 1 } },
    { type: 'item.completed', item: { id: 'b', type: 'agent_message', text: 'Final' } },
    { type: 'turn.completed' },
  ].map((entry) => JSON.stringify(entry)).join('\n');
  const result = parseCodexStream(stream);
  assert.equal(result.completedToolCalls, 1);
  assert.equal(result.agentMessages, 1);
  assert.equal(result.usage.totalTokens, null);
  assert.equal(parseNativeSession('').usage.totalTokens, null);
  assert.equal(textMetrics('One sentence; then another. Next.').heuristicSemicolons, 1);
  const prose = textMetrics('# A long heading that is not a sentence\n\n| ignored table | words |\n\nRead [the result](https://example.invalid/path) and check `api.method`. Next.\n\n```js\nconst ignored = 1;\n```');
  assert.deepEqual(prose.heuristicSentenceWords, [6, 1]);
  assert.equal(prose.heuristicMaxSentenceWords, 6);
});

test('CLI rejects unexpected flags; cleanup refuses unowned directories and live locks', async (t) => {
  const setup = await fixture(t);
  await assert.rejects(execute(process.execPath, [cli, 'run', '--out', setup.out, '--dangerously-bypass-approvals-and-sandbox']));
  await assert.rejects(cleanup(setup.source));
  await prepare(setup.configPath, setup.out);
  await fs.writeFile(path.join(setup.out, '.running'), '{}');
  await assert.rejects(cleanup(setup.out), /running/u);
  await fs.rm(path.join(setup.out, '.running'));
  const outside = path.join(setup.temporary, 'outside');
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'keep'), 'keep');
  await fs.rename(path.join(setup.out, 'trials'), path.join(setup.out, 'saved-trials'));
  await fs.symlink(outside, path.join(setup.out, 'trials'));
  await assert.rejects(cleanup(setup.out), /symlink/u);
  assert.equal(await fs.readFile(path.join(outside, 'keep'), 'utf8'), 'keep');
  await fs.rm(path.join(setup.out, 'trials'));
  await fs.rename(path.join(setup.out, 'saved-trials'), path.join(setup.out, 'trials'));
});

test('reports count every expected CLI pair before execution and native cohorts cover only imported pairs', async (t) => {
  const setup = await fixture(t);
  setup.config.cases.push({ ...setup.config.cases[0], id: 'never-started' });
  await fs.writeFile(setup.configPath, JSON.stringify(setup.config));
  await prepare(setup.configPath, setup.out);
  await report(setup.out);
  const reportFile = path.join(setup.out, 'reports', 'report.json');
  const before = await readJson(reportFile);
  assert.equal(before.recordedAttempts, 0);
  assert.equal(before.comparisons.length, 2);
  assert.ok(before.comparisons.every((pair) => !pair.complete && pair.baselineStatus === 'missing' && pair.candidateStatus === 'missing'));
  assert.equal(before.aggregates.find((entry) => entry.caseId === '*').incompletePairs, 2);
  assert.deepEqual(before.cohortScopes, [{ cohort: 'cli', scope: 'all manifest pairs', pairs: 2 }]);
  const session = path.join(setup.temporary, 'selected-native.jsonl');
  await fs.writeFile(session, JSON.stringify({ type: 'event_msg', payload: { type: 'task_complete', last_agent_message: 'One imported artifact.' } }));
  await importNative(setup.out, { session, pairId: 'm0-tiny-case-r1', variant: 'baseline', model: setup.config.models[0].name, effort: 'high', cohort: 'native' });
  await report(setup.out);
  const after = await readJson(reportFile);
  assert.equal(after.comparisons.filter((pair) => pair.cohort === 'cli').length, 2);
  assert.equal(after.comparisons.filter((pair) => pair.cohort === 'native').length, 1);
  assert.equal(after.comparisons.find((pair) => pair.cohort === 'native').candidateStatus, 'missing');
  assert.deepEqual(after.cohortScopes.find((cohort) => cohort.cohort === 'native'), { cohort: 'native', scope: 'imported pairs only', pairs: 1 });
});

test('cleanup holds the writer lock against run/import/cleanup and failed acquisition preserves it', async (t) => {
  const setup = await fixture(t);
  await prepare(setup.configPath, setup.out);
  const originalRm = fs.rm;
  let release;
  const paused = new Promise((resolve) => { release = resolve; });
  let reached;
  const reachedRemoval = new Promise((resolve) => { reached = resolve; });
  const inputPath = await fs.realpath(path.join(setup.out, 'inputs'));
  fs.rm = async (target, ...args) => {
    if (target === inputPath) { reached(); await paused; }
    return originalRm(target, ...args);
  };
  const cleaning = cleanup(setup.out);
  try {
    await reachedRemoval;
    const lockPath = path.join(setup.out, '.running');
    const owner = await fs.readFile(lockPath, 'utf8');
    assert.equal(JSON.parse(owner).operation, 'cleanup');
    await assert.rejects(run(setup.out, { execute: true }), { code: 'EEXIST' });
    await assert.rejects(importNative(setup.out, {}), { code: 'EEXIST' });
    await assert.rejects(cleanup(setup.out), { code: 'EEXIST' });
    assert.equal(await fs.readFile(lockPath, 'utf8'), owner);
    assert.deepEqual(await fs.readdir(path.join(setup.out, 'trials')), []);
  } finally {
    release();
    await cleaning;
    fs.rm = originalRm;
  }
  await assert.rejects(fs.access(path.join(setup.out, '.running')));
  assert.deepEqual(await fs.readdir(path.join(setup.out, 'inputs')), []);
});

for (const operation of ['run', 'import']) {
  test(`${operation} verifies frozen inputs after acquiring the writer lock`, async (t) => {
    const setup = await fixture(t);
    await prepare(setup.configPath, setup.out);
    const originalOpen = fs.open;
    const lockPath = path.join(await fs.realpath(setup.out), '.running');
    let injected = false;
    fs.open = async (target, ...args) => {
      if (target === lockPath && !injected) {
        injected = true;
        await cleanup(setup.out);
      }
      return originalOpen(target, ...args);
    };
    try {
      const writing = operation === 'run' ? run(setup.out, { execute: true }) : importNative(setup.out, {});
      await assert.rejects(writing, /Frozen input drift/u);
      assert.ok(injected);
      assert.deepEqual(await fs.readdir(path.join(setup.out, 'trials')), []);
      await assert.rejects(fs.access(path.join(setup.out, '.running')));
    } finally { fs.open = originalOpen; }
  });
}

test('cleanup verifies ownership under its lock and can clean owned drifted inputs', async (t) => {
  const setup = await fixture(t);
  await prepare(setup.configPath, setup.out);
  await fs.appendFile(path.join(setup.out, 'inputs', 'cases', 'tiny-case', 'head', 'app.txt'), 'drift');
  await cleanup(setup.out);
  assert.deepEqual(await fs.readdir(path.join(setup.out, 'inputs')), []);
  assert.equal(await treeDigest(setup.source), setup.before.source);
  const originalOpen = fs.open;
  const lockPath = path.join(await fs.realpath(setup.out), '.running');
  const ownerFile = path.join(setup.out, '.skill-eval-owner.json');
  const owner = await fs.readFile(ownerFile, 'utf8');
  fs.open = async (target, ...args) => {
    if (target === lockPath) await fs.writeFile(ownerFile, '{}');
    return originalOpen(target, ...args);
  };
  try {
    await assert.rejects(cleanup(setup.out), /ownership/u);
    await assert.rejects(fs.access(lockPath));
  } finally {
    fs.open = originalOpen;
    await fs.writeFile(ownerFile, owner);
  }
});

test('artifact-bound assessments reject changed retry artifacts and derive legacy digests without modifying results', async (t) => {
  const setup = await fixture(t, { mode: 'partial' });
  await prepare(setup.configPath, setup.out);
  await run(setup.out, { execute: true });
  const resultFile = path.join(setup.out, 'trials', 'm0-tiny-case-r1-baseline', 'attempt-1', 'result.json');
  const original = await readJson(resultFile);
  assert.equal(original.artifactDigest, artifactDigest(original.artifact));
  delete original.artifactDigest;
  await fs.writeFile(resultFile, JSON.stringify(original));
  const legacyBytes = await fs.readFile(resultFile, 'utf8');
  await report(setup.out);
  const reportFile = path.join(setup.out, 'reports', 'report.json');
  const before = await readJson(reportFile);
  const trial = before.trials.find((entry) => entry.id === 'm0-tiny-case-r1-baseline');
  assert.equal(trial.artifactDigest, artifactDigest(original.artifact));
  assert.equal(await fs.readFile(resultFile, 'utf8'), legacyBytes);
  const assessmentFile = path.join(setup.temporary, 'assessments.json');
  const assessment = { trialId: trial.id, cohort: trial.cohort, artifactDigest: trial.artifactDigest, qualityScore: 4, scale: '1-5 retained detail' };
  await fs.writeFile(assessmentFile, JSON.stringify({ version: 1, assessments: [assessment] }));
  await report(setup.out, { assessmentsFile: assessmentFile });
  const judged = await readJson(reportFile);
  assert.equal(judged.comparisons[0].assessments.baseline[0].artifactDigest, trial.artifactDigest);
  const blindedBefore = await readJson(path.join(setup.out, 'judge', 'blinded-artifacts.json'));
  assert.ok(blindedBefore.artifacts.some((entry) => entry.artifactDigest === trial.artifactDigest));
  const executable = setup.config.codex.executable;
  await fs.writeFile(executable, (await fs.readFile(executable, 'utf8')).replace('useful guard.', 'different guard.'));
  await run(setup.out, { execute: true, retryFailed: true });
  await assert.rejects(report(setup.out, { assessmentsFile: assessmentFile }), /Stale assessment/u);
  await fs.writeFile(assessmentFile, JSON.stringify({ version: 1, assessments: [{ ...assessment, artifactDigest: undefined }] }));
  await assert.rejects(report(setup.out, { assessmentsFile: assessmentFile }), /explicit artifactDigest/u);
  await report(setup.out);
  const after = await readJson(reportFile);
  assert.notEqual(after.comparisons[0].artifactDigests.baseline, trial.artifactDigest);
  const blindedAfter = await readJson(path.join(setup.out, 'judge', 'blinded-artifacts.json'));
  assert.ok(!blindedAfter.artifacts.some((entry) => entry.artifactDigest === trial.artifactDigest));
});

test('assessment digest includes structured findings and rejects changed native reimports', async (t) => {
  const setup = await fixture(t);
  await prepare(setup.configPath, setup.out);
  const session = path.join(setup.temporary, 'selected-session.jsonl');
  await fs.writeFile(session, JSON.stringify({ type: 'event_msg', payload: { type: 'task_complete' } }));
  const artifactFile = path.join(setup.temporary, 'artifact.json');
  const artifact = { artifactText: 'Same description.', findings: [{ severity: 'low', detail: 'First finding' }] };
  await fs.writeFile(artifactFile, JSON.stringify(artifact));
  const options = { session, artifactFile, pairId: 'm0-tiny-case-r1', variant: 'baseline', model: setup.config.models[0].name, effort: 'high', cohort: 'native' };
  const first = await importNative(setup.out, options);
  const assessmentFile = path.join(setup.temporary, 'assessments.json');
  await fs.writeFile(assessmentFile, JSON.stringify({ version: 1, assessments: [{ trialId: first.id, cohort: first.cohort, artifactDigest: first.artifactDigest, notes: 'Reviewed this exact finding.' }] }));
  await report(setup.out, { assessmentsFile: assessmentFile });
  artifact.findings[0].detail = 'Different finding';
  await fs.writeFile(artifactFile, JSON.stringify(artifact));
  const second = await importNative(setup.out, options);
  assert.equal(second.attempt, first.attempt + 1);
  assert.notEqual(first.artifactDigest, second.artifactDigest);
  await assert.rejects(report(setup.out, { assessmentsFile: assessmentFile }), /Stale assessment/u);
  assert.equal(artifactDigest({ findings: [], artifactText: 'Stable' }), artifactDigest({ artifactText: 'Stable', findings: [] }));
});

test('arm labels reach neither the worker prompt nor the judge-facing artifacts', async (t) => {
  const setup = await fixture(t, { mode: 'echo-path' });
  const manifest = await prepare(setup.configPath, setup.out);
  for (const entry of Object.values(manifest.variants)) assert.doesNotMatch(entry.directory, /baseline|candidate/u);
  assert.notEqual(manifest.variants.baseline.directory, manifest.variants.candidate.directory);
  assert.equal((await run(setup.out, { execute: true })).completed, 2);
  const generated = await report(setup.out);
  const blinded = await fs.readFile(generated.blindedArtifacts, 'utf8');
  assert.match(blinded, /Assigned skill:/u);
  assert.doesNotMatch(blinded, /baseline|candidate/iu);
  assert.deepEqual(await fs.readdir(path.join(setup.out, 'judge')), ['blinded-artifacts.json']);
  assert.equal(path.basename(path.dirname(generated.blindingKey)), 'private');
  const reports = await fs.readdir(path.join(setup.out, 'reports'));
  assert.ok(!reports.some((name) => name.includes('blind')));
  const key = await readJson(generated.blindingKey);
  assert.deepEqual(key.key.map((entry) => entry.variant).sort(), ['baseline', 'candidate']);
});

test('a candidate failure that is retried to success stays visible in per-arm guardrails', async (t) => {
  const setup = await fixture(t, { mode: 'candidate-fails-once' });
  await prepare(setup.configPath, setup.out);
  assert.deepEqual(await run(setup.out, { execute: true }), { completed: 1, failed: 1, skipped: 0, cancelled: false });
  await report(setup.out);
  let summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  let all = summary.aggregates.find((entry) => entry.caseId === '*');
  assert.deepEqual(all.incompleteByArm, { baselineOnly: 0, candidateOnly: 1, both: 0 });
  assert.equal((await run(setup.out, { execute: true, retryFailed: true })).completed, 1);
  await report(setup.out);
  summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  all = summary.aggregates.find((entry) => entry.caseId === '*');
  assert.equal(all.completePairs, 1);
  assert.equal(all.measurements['usage.totalTokens'].delta, -20);
  assert.deepEqual(all.guardrails.baseline.byStatus, { completed: 1 });
  assert.deepEqual(all.guardrails.candidate.byStatus, { completed: 1, failed: 1 });
  assert.equal(all.guardrails.candidate.attempts, 2);
  assert.equal(all.guardrails.candidate.nonCompleted.totalTokens, 5500);
  assert.equal(all.guardrails.baseline.nonCompleted.attempts, 0);
  assert.match(summary.note, /retried attempts appear in the per-arm attempt counts/u);
  const markdown = await fs.readFile(path.join(setup.out, 'reports', 'report.md'), 'utf8');
  assert.match(markdown, /\| 1\/1 \/ 1\/2 \| 0 \/ 5500 \|/u);
});

test('an empty attempt directory is reported as interrupted and does not block run', async (t) => {
  const setup = await fixture(t);
  await prepare(setup.configPath, setup.out);
  await fs.mkdir(path.join(setup.out, 'trials', 'm0-tiny-case-r1-candidate', 'attempt-1'), { recursive: true });
  await report(setup.out);
  let summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  const empty = summary.trials.find((trial) => trial.id === 'm0-tiny-case-r1-candidate');
  assert.equal(empty.status, 'interrupted');
  assert.equal(empty.metadataMissing, true);
  assert.deepEqual(await run(setup.out, { execute: true }), { completed: 1, failed: 0, skipped: 1, cancelled: false });
  assert.equal((await run(setup.out, { execute: true, retryFailed: true })).completed, 1);
  await report(setup.out);
  summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  assert.equal(summary.comparisons[0].complete, true);
  const attempts = await fs.readdir(path.join(setup.out, 'trials', 'm0-tiny-case-r1-candidate'));
  assert.deepEqual(attempts.sort(), ['attempt-1', 'attempt-2']);
});

test('a trial that changes its own inputs is recorded as input drift and stops the run', async (t) => {
  const setup = await fixture(t, { mode: 'mutate' });
  await prepare(setup.configPath, setup.out);
  await assert.rejects(run(setup.out, { execute: true }), /drift/u);
  const result = await readJson(path.join(setup.out, 'trials', 'm0-tiny-case-r1-baseline', 'attempt-1', 'result.json'));
  assert.equal(result.status, 'input-drift');
});

test('order option schedules interleaved and reproducible seeded random trials', async (t) => {
  const setup = await fixture(t);
  for (const change of [{ ...setup.config, order: 'alphabetical' }, { ...setup.config, seed: 3 }, { ...setup.config, order: 'random', seed: -1 }]) {
    await fs.writeFile(setup.configPath, JSON.stringify(change));
    await assert.rejects(loadConfig(setup.configPath), /order|seed/u);
  }
  const manifest = (order, seed) => ({ cases: [{ id: 'a' }, { id: 'b' }], config: { models: [{ name: 'm', reasoningEffort: 'high' }], repetitions: 2, order, seed } });
  assert.deepEqual(schedule(manifest()).map((phase) => phase.map((task) => task.variant)), [Array(4).fill('baseline'), Array(4).fill('candidate')]);
  const interleaved = schedule(manifest('interleaved'));
  assert.equal(interleaved.length, 1);
  assert.deepEqual(interleaved[0].map((task) => task.variant), ['baseline', 'candidate', 'candidate', 'baseline', 'baseline', 'candidate', 'candidate', 'baseline']);
  const label = (phases) => phases[0].map((task) => `${task.pair.id}-${task.variant}`);
  assert.deepEqual(label(schedule(manifest('random', 7))), label(schedule(manifest('random', 7))));
  assert.notDeepEqual(label(schedule(manifest('random', 7))), label(schedule(manifest('random', 8))));
  assert.equal(new Set(label(schedule(manifest('random', 7)))).size, 8);
  await fs.writeFile(setup.configPath, JSON.stringify({ ...setup.config, order: 'random' }));
  const prepared = await prepare(setup.configPath, setup.out);
  assert.ok(Number.isSafeInteger(prepared.config.seed));
  const dry = await run(setup.out);
  assert.equal(dry.order, 'random');
  assert.equal(dry.seed, prepared.config.seed);
  assert.equal((await run(setup.out, { execute: true })).completed, 2);
  await report(setup.out);
  const summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  assert.equal(summary.seed, prepared.config.seed);
  assert.match(summary.note, /seeded random order/u);
});

test('aggregates carry paired dispersion and warn only for single repetitions', async (t) => {
  const setup = await fixture(t);
  await prepare(setup.configPath, setup.out);
  await run(setup.out, { execute: true });
  await report(setup.out);
  const single = await readJson(path.join(setup.out, 'reports', 'report.json'));
  assert.match(single.warnings[0], /repetitions is 1/u);
  assert.equal(single.aggregates[0].statistics['usage.totalTokens'].ci95, null);
  assert.match(await fs.readFile(path.join(setup.out, 'reports', 'report.md'), 'utf8'), /\*\*Warning:\*\* repetitions is 1/u);
  const repeated = await fixture(t, { outputName: 'repeated' });
  repeated.config.repetitions = 3;
  await fs.writeFile(repeated.configPath, JSON.stringify(repeated.config));
  await prepare(repeated.configPath, repeated.out);
  await run(repeated.out, { execute: true });
  await report(repeated.out);
  const summary = await readJson(path.join(repeated.out, 'reports', 'report.json'));
  assert.deepEqual(summary.warnings, []);
  const statistics = summary.aggregates.find((entry) => entry.caseId === '*').statistics['usage.totalTokens'];
  assert.equal(statistics.pairs, 3);
  assert.equal(statistics.sd, 0);
  assert.deepEqual(statistics.ci95, { method: 'paired-t', center: -20, low: -20, high: -20 });
});

test('pre-registered expectations produce paired pass rates and pass^k', async (t) => {
  const setup = await fixture(t);
  for (const expectations of [{ mustFind: [] }, { mustFind: [''] }, { mustFind: ['x'], extra: true }, { mustFind: 'x' }]) {
    await fs.writeFile(setup.configPath, JSON.stringify({ ...setup.config, cases: [{ ...setup.config.cases[0], expectations }] }));
    await assert.rejects(loadConfig(setup.configPath), /expectations/u);
  }
  setup.config.repetitions = 2;
  setup.config.cases[0].expectations = { mustFind: [['loading guard', 'load guard']], mustNotClaim: ['useful'] };
  await fs.writeFile(setup.configPath, JSON.stringify(setup.config));
  await prepare(setup.configPath, setup.out);
  await run(setup.out, { execute: true });
  await report(setup.out);
  const summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  const all = summary.aggregates.find((entry) => entry.caseId === '*');
  assert.deepEqual(all.expectations, { completePairs: 2, baselinePassed: 0, candidatePassed: 2,
    paired: { both: 0, baselineOnly: 0, candidateOnly: 2, neither: 0 }, passHatK: { k: 2, baseline: 0, candidate: 1 } });
  const baseline = summary.trials.find((trial) => trial.variant === 'baseline');
  assert.deepEqual(baseline.expectations, { passed: false, missing: ['loading guard'], violated: ['useful'] });
  assert.match(await fs.readFile(path.join(setup.out, 'reports', 'report.md'), 'utf8'), /## Pre-registered expectations/u);
  assert.equal(checkExpectations({ artifactText: 'x', findings: [{ detail: 'Load   Guard' }] }, { mustFind: [['load guard']], mustNotClaim: [] }).passed, true);
});

test('report warns when a writer lock is present', async (t) => {
  const setup = await fixture(t);
  await prepare(setup.configPath, setup.out);
  await fs.writeFile(path.join(setup.out, '.running'), '{}');
  const generated = await report(setup.out);
  assert.ok(generated.warnings.some((warning) => /writer lock/u.test(warning)));
  await fs.rm(path.join(setup.out, '.running'));
});
