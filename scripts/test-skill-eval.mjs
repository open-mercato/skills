import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prepare, loadConfig, loadRun, cleanup, treeDigest, readJson } from './lib/skill-eval/storage.mjs';
import { run, importNative } from './lib/skill-eval/runner.mjs';
import { report } from './lib/skill-eval/report.mjs';
import { parseCodexStream, parseNativeSession, textMetrics } from './lib/skill-eval/metrics.mjs';

const execute = promisify(execFile);
const cli = path.resolve('scripts/skill-eval.mjs');
const git = async (directory, ...args) => (await execute('git', ['-C', directory, ...args])).stdout.trim();

async function fixture(t, { mode = 'success', skillName = 'describe-change' } = {}) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-eval-test-'));
  const collection = path.join(temporary, 'collection');
  const source = path.join(temporary, 'source');
  const configDirectory = path.join(temporary, 'config');
  const context = path.join(configDirectory, 'evidence');
  const out = path.join(temporary, 'run');
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
const variant = prompt.includes('/variants/baseline/') ? 'baseline' : 'candidate';
const mode = ${JSON.stringify(mode)};
const emit = (event) => console.log(JSON.stringify(event));
emit({ type: 'thread.started', thread_id: 'new-context-' + process.pid });
emit({ type: 'turn.started' });
emit({ type: 'item.started', item: { id: 'tool-1', type: 'command_execution' } });
emit({ type: 'item.completed', item: { id: 'tool-1', type: 'command_execution', exit_code: 1 } });
emit({ type: 'item.completed', item: { id: 'tool-1', type: 'command_execution', exit_code: 1 } });
emit({ type: 'item.completed', item: { id: 'msg-1', type: 'agent_message', text: JSON.stringify({ artifactText: variant === 'baseline' ? 'The change improves loading; it adds a useful guard.' : 'Adds a loading guard.', proposedActions: [] }) } });
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
  const blinded = await readJson(path.join(setup.out, 'reports', 'blinded-artifacts.json'));
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
    { type: 'turn_context', payload: { model: setup.config.models[0].name } },
    { type: 'token_usage_record', payload: { response_id: 'response-1', usage } },
    { type: 'token_usage_record', payload: { response_id: 'response-1', usage } },
    { type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 999, output_tokens: 999 } } } },
    { type: 'response_item', payload: { type: 'function_call', call_id: 'call-1' } },
    { type: 'response_item', payload: { type: 'function_call', call_id: 'call-1' } },
    { type: 'response_item', payload: { type: 'message', role: 'assistant', phase: 'final_answer', content: [{ type: 'output_text', text: 'Native description.' }] } },
  ];
  await fs.writeFile(session, events.map((entry) => JSON.stringify(entry)).join('\n'));
  const options = { session, pairId: 'm0-tiny-case-r1', variant: 'baseline', model: setup.config.models[0].name, effort: 'high', cohort: 'pilot-native' };
  const result = await importNative(setup.out, options);
  assert.equal(result.usage.totalTokens, 50);
  assert.equal(result.modelVerification, 'metadata-matched');
  await importNative(setup.out, { ...options, variant: 'candidate' });
  await assert.rejects(importNative(setup.out, { ...options, model: 'other' }), /model/u);
  await assert.rejects(importNative(setup.out, { ...options, cohort: 'cli' }), /cohort/u);
  await report(setup.out);
  const summary = await readJson(path.join(setup.out, 'reports', 'report.json'));
  assert.equal(summary.comparisons.length, 2);
  assert.equal(summary.trials.find((trial) => trial.cohort === 'pilot-native').metrics.completedToolCalls, 1);
  assert.equal(summary.comparisons[0].measurements['usage.totalTokens'].baseline, 110);
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
