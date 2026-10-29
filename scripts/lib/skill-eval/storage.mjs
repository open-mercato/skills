import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { digest } from './metrics.mjs';

const execute = promisify(execFile);
export const formatVersion = 1;
export const inside = (parent, child) => child === parent || child.startsWith(`${parent}${path.sep}`);
export async function git(repository, args) {
  const { stdout } = await execute('git', ['--no-optional-locks', '-c', 'core.hooksPath=/dev/null', '-C', repository, ...args],
    { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  return stdout.trimEnd();
}
export const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
export async function writeText(file, value) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, value, { mode: 0o600, flag: 'wx' });
  await fs.rename(temporary, file);
}
export const writeJson = (file, value) => writeText(file, `${JSON.stringify(value, null, 2)}\n`);
function requireValue(condition, message) { if (!condition) throw new Error(message); }
const nonempty = (value) => typeof value === 'string' && value.trim() && !value.includes('\0');
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/u;
export async function canonical(file) {
  const absolute = path.resolve(file);
  try { return await fs.realpath(absolute); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return path.join(await canonical(path.dirname(absolute)), path.basename(absolute));
  }
}
async function repositoryPath(file) {
  const repository = await fs.realpath(file);
  requireValue((await fs.stat(repository)).isDirectory(), 'Repository must be a directory');
  const root = await git(repository, ['rev-parse', '--show-toplevel']);
  requireValue(await fs.realpath(root) === repository, 'Repository path must name the Git checkout root');
  return repository;
}
async function revision(repository, ref) {
  requireValue(nonempty(ref) && !ref.startsWith('-'), 'A non-option Git revision is required');
  return git(repository, ['rev-parse', '--verify', `${ref}^{commit}`]);
}
export const orders = ['baseline-first', 'interleaved', 'random'];

// Pre-registered quality checks: each item is a phrase or a list of alternative phrases.
function loadExpectations(raw) {
  requireValue(raw && typeof raw === 'object' && !Array.isArray(raw), 'expectations must be an object');
  requireValue(Object.keys(raw).every((key) => ['mustFind', 'mustNotClaim'].includes(key)), 'expectations accept only mustFind and mustNotClaim');
  const phrases = (list, name) => {
    if (list === undefined) return [];
    requireValue(Array.isArray(list), `expectations.${name} must be an array`);
    return list.map((item) => {
      const alternatives = Array.isArray(item) ? item : [item];
      requireValue(alternatives.length > 0 && alternatives.every(nonempty), `expectations.${name} entries must be non-empty phrases`);
      return alternatives;
    });
  };
  const expectations = { mustFind: phrases(raw.mustFind, 'mustFind'), mustNotClaim: phrases(raw.mustNotClaim, 'mustNotClaim') };
  requireValue(expectations.mustFind.length + expectations.mustNotClaim.length > 0, 'expectations need at least one mustFind or mustNotClaim entry');
  return expectations;
}

export async function loadConfig(file) {
  const configPath = await fs.realpath(file);
  const base = path.dirname(configPath);
  const raw = await readJson(configPath);
  requireValue(raw.version === 1, 'Unsupported experiment version (expected 1)');
  requireValue(raw.skill && idPattern.test(raw.skill.name), 'Invalid skill name');
  const repository = await repositoryPath(path.resolve(base, raw.skill.repository));
  const skill = { name: raw.skill.name, repository,
    baseline: await revision(repository, raw.skill.baseline), candidate: await revision(repository, raw.skill.candidate) };
  requireValue(Array.isArray(raw.models) && raw.models.length > 0, 'At least one model is required');
  const models = raw.models.map((model) => {
    requireValue(model && nonempty(model.name) && !model.name.startsWith('-'), 'Invalid model name');
    requireValue(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'].includes(model.reasoningEffort), 'Explicit reasoningEffort is required');
    return { name: model.name, reasoningEffort: model.reasoningEffort };
  });
  requireValue(new Set(models.map((model) => `${model.name}/${model.reasoningEffort}`)).size === models.length, 'Duplicate models');
  const repetitions = raw.repetitions ?? 1;
  const concurrency = raw.concurrency ?? 1;
  requireValue(Number.isSafeInteger(repetitions) && repetitions >= 1 && repetitions <= 100, 'repetitions must be 1..100');
  requireValue(Number.isSafeInteger(concurrency) && concurrency >= 1 && concurrency <= 32, 'concurrency must be 1..32');
  requireValue(Array.isArray(raw.cases) && raw.cases.length > 0, 'At least one case is required');
  const cases = [];
  for (const entry of raw.cases) {
    requireValue(entry && idPattern.test(entry.id) && nonempty(entry.task), 'Each case needs a safe id and task');
    requireValue(entry.source && nonempty(entry.source.repository), 'Each case needs source.repository');
    const sourceRepository = await repositoryPath(path.resolve(base, entry.source.repository));
    const source = { repository: sourceRepository, head: await revision(sourceRepository, entry.source.head) };
    if (entry.source.base) source.base = await revision(sourceRepository, entry.source.base);
    let contextDirectory = null;
    if (entry.contextDirectory) {
      contextDirectory = await fs.realpath(path.resolve(base, entry.contextDirectory));
      requireValue((await fs.stat(contextDirectory)).isDirectory(), 'contextDirectory must be a directory');
      await treeDigest(contextDirectory, { allowInternalSymlinks: false });
    }
    const expectations = entry.expectations === undefined ? null : loadExpectations(entry.expectations);
    cases.push({ id: entry.id, task: entry.task, source, contextDirectory, ...(expectations ? { expectations } : {}) });
  }
  requireValue(new Set(cases.map((entry) => entry.id)).size === cases.length, 'Duplicate case ids');
  const timeoutSeconds = raw.codex?.timeoutSeconds ?? 1800;
  requireValue(Number.isSafeInteger(timeoutSeconds) && timeoutSeconds > 0 && timeoutSeconds <= 86400, 'timeoutSeconds must be 1..86400');
  const executable = raw.codex?.executable ?? 'codex';
  requireValue(nonempty(executable), 'Invalid Codex executable');
  const order = raw.order ?? 'baseline-first';
  requireValue(orders.includes(order), `order must be one of: ${orders.join(', ')}`);
  requireValue(raw.seed === undefined || order === 'random', 'seed applies only to order "random"');
  const seed = order === 'random' ? raw.seed ?? randomInt(0, 2 ** 32 - 1) : null;
  requireValue(seed === null || (Number.isSafeInteger(seed) && seed >= 0 && seed < 2 ** 32), 'seed must be an integer 0..4294967295');
  return { version: 1, configPath, originalConfigDigest: digest(await fs.readFile(configPath)),
    skill, models, repetitions, concurrency, order, ...(seed !== null ? { seed } : {}), cases,
    codex: { executable: executable.includes(path.sep) ? await fs.realpath(path.resolve(base, executable)) : executable, timeoutSeconds } };
}

export async function treeDigest(root, { allowInternalSymlinks = true } = {}) {
  const entries = [];
  async function visit(relative) {
    const absolute = path.join(root, relative);
    const stat = await fs.lstat(absolute);
    if (stat.isSymbolicLink()) {
      requireValue(allowInternalSymlinks && inside(root, await fs.realpath(absolute)), `Unsafe symlink: ${relative}`);
      entries.push([relative, 'symlink', await fs.readlink(absolute)]);
    } else if (stat.isDirectory()) {
      for (const name of (await fs.readdir(absolute)).sort()) {
        if (name === '.git') continue;
        await visit(path.join(relative, name));
      }
    } else {
      requireValue(stat.isFile(), `Unsupported input type: ${relative}`);
      entries.push([relative, stat.mode & 0o111, digest(await fs.readFile(absolute))]);
    }
  }
  await visit('');
  return digest(JSON.stringify(entries));
}

async function freezeCollection(repository, commit, destination) {
  await fs.mkdir(destination, { recursive: true });
  const tree = await git(repository, ['ls-tree', '-rz', commit, '--', 'skills']);
  for (const line of tree.split('\0').filter(Boolean)) {
    const separator = line.indexOf('\t');
    const [mode, type, object] = line.slice(0, separator).split(' ');
    const relative = line.slice(separator + 1);
    requireValue(type === 'blob' && ['100644', '100755'].includes(mode), `Skill collection has an unsafe or unsupported entry: ${relative}`);
    const target = path.resolve(destination, relative);
    requireValue(inside(destination, target), 'Unsafe Git path');
    await fs.mkdir(path.dirname(target), { recursive: true });
    const { stdout } = await execute('git', ['-C', repository, 'cat-file', 'blob', object], { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024 });
    await fs.writeFile(target, stdout, { mode: mode === '100755' ? 0o700 : 0o600 });
  }
}

export async function prepare(configFile, output) {
  const config = await loadConfig(configFile);
  const root = await canonical(output);
  const inputRoots = [config.skill.repository, path.dirname(config.configPath),
    ...config.cases.flatMap((entry) => [entry.source.repository, ...(entry.contextDirectory ? [entry.contextDirectory] : [])])];
  for (const input of inputRoots) requireValue(!inside(input, root) && !inside(root, input), 'Output must be separate from all input repositories and context/config directories');
  await fs.mkdir(root, { mode: 0o700 });
  const runId = randomUUID();
  await writeJson(path.join(root, '.skill-eval-owner.json'), { version: 1, runId });
  const manifest = { version: 1, runId, createdAt: new Date().toISOString(), config,
    variants: {}, cases: [], ownedWorktrees: [], inputDigest: null };
  try {
    for (const variant of ['baseline', 'candidate']) {
      // Opaque names keep the arm label out of worker prompts and generated artifacts.
      let relative;
      do relative = `inputs/variants/${randomBytes(8).toString('hex')}`;
      while (Object.values(manifest.variants).some((entry) => entry.directory === relative));
      await freezeCollection(config.skill.repository, config.skill[variant], path.join(root, relative));
      await fs.access(path.join(root, relative, 'skills', config.skill.name, 'SKILL.md'));
      manifest.variants[variant] = { directory: relative, commit: config.skill[variant] };
    }
    for (const entry of config.cases) {
      const prepared = { id: entry.id, task: entry.task, source: {}, context: `inputs/cases/${entry.id}/context`,
        ...(entry.expectations ? { expectations: entry.expectations } : {}) };
      for (const kind of ['base', 'head'].filter((key) => entry.source[key])) {
        const relative = `inputs/cases/${entry.id}/${kind}`;
        const target = path.join(root, relative);
        await fs.mkdir(path.dirname(target), { recursive: true });
        manifest.ownedWorktrees.push({ repository: entry.source.repository, directory: relative });
        await git(entry.source.repository, ['worktree', 'add', '--detach', target, entry.source[kind]]);
        prepared.source[kind] = { directory: relative, commit: entry.source[kind] };
      }
      const context = path.join(root, prepared.context);
      if (entry.contextDirectory) await fs.cp(entry.contextDirectory, context, { recursive: true, dereference: false });
      else await fs.mkdir(context, { recursive: true });
      manifest.cases.push(prepared);
    }
    manifest.inputDigest = await treeDigest(path.join(root, 'inputs'));
    manifest.inputDigests = { version: 1,
      variants: Object.fromEntries(await Promise.all(Object.entries(manifest.variants).map(async ([variant, entry]) =>
        [variant, await treeDigest(path.join(root, entry.directory))]))),
      contexts: Object.fromEntries(await Promise.all(manifest.cases.map(async (entry) => [entry.id, await treeDigest(path.join(root, entry.context))]))) };
    const text = `${JSON.stringify(manifest, null, 2)}\n`;
    await fs.writeFile(path.join(root, 'manifest.json'), text, { mode: 0o600 });
    await writeJson(path.join(root, '.skill-eval-owner.json'), { version: 1, runId, manifestDigest: digest(text) });
    await fs.mkdir(path.join(root, 'trials'));
    // These values reach every worker prompt verbatim; arm words in them would undo the blinding.
    const labelled = [root, ...manifest.cases.map((entry) => entry.id)].filter((value) => /baseline|candidate/iu.test(value));
    if (labelled.length) process.stderr.write(`skill-eval: warning: the output path or case ids contain "baseline" or "candidate" and will appear in worker prompts: ${labelled.map((value) => JSON.stringify(path.basename(value))).join(', ')}\n`);
    return manifest;
  } catch (error) {
    for (const worktree of manifest.ownedWorktrees.reverse()) {
      try { await git(worktree.repository, ['worktree', 'remove', '--force', path.join(root, worktree.directory)]); } catch {}
    }
    await fs.rm(root, { recursive: true, force: true });
    throw error;
  }
}

async function loadOwnedManifest(output) {
  const root = await fs.realpath(output);
  const owner = await readJson(path.join(root, '.skill-eval-owner.json'));
  const text = await fs.readFile(path.join(root, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(text);
  requireValue(owner.version === 1 && manifest.version === 1 && owner.runId === manifest.runId && owner.manifestDigest === digest(text), 'Invalid or changed run manifest/ownership marker');
  return { root, manifest };
}

export async function loadRun(output, { verifyInputs = true } = {}) {
  const { root, manifest } = await loadOwnedManifest(output);
  for (const relative of ['inputs', 'trials']) {
    const absolute = path.join(root, relative);
    requireValue(!(await fs.lstat(absolute)).isSymbolicLink() && await fs.realpath(absolute) === absolute, 'Run directories must not be symlinks');
  }
  async function assertNoSymlinks(directory) {
    for (const name of await fs.readdir(directory)) {
      const target = path.join(directory, name);
      const stat = await fs.lstat(target);
      requireValue(!stat.isSymbolicLink(), 'Trial paths must not contain symlinks');
      if (stat.isDirectory()) await assertNoSymlinks(target);
    }
  }
  await assertNoSymlinks(path.join(root, 'trials'));
  if (verifyInputs) requireValue(await treeDigest(path.join(root, 'inputs')) === manifest.inputDigest, 'Frozen input drift detected; prepare a new experiment');
  return { root, manifest };
}

// After a trial, check only what that trial could read: its collection and case context by digest,
// and its source worktrees by HEAD plus a clean status. loadRun keeps the full-tree check.
export async function trialInputsIntact(root, manifest, entry, variant) {
  if (!manifest.inputDigests) return await treeDigest(path.join(root, 'inputs')) === manifest.inputDigest;
  try {
    if (await treeDigest(path.join(root, manifest.variants[variant].directory)) !== manifest.inputDigests.variants[variant]) return false;
    if (await treeDigest(path.join(root, entry.context)) !== manifest.inputDigests.contexts[entry.id]) return false;
    for (const source of [entry.source.base, entry.source.head].filter(Boolean)) {
      const directory = path.join(root, source.directory);
      if (await git(directory, ['rev-parse', 'HEAD']) !== source.commit) return false;
      if (await git(directory, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=matching']) !== '') return false;
    }
    return true;
  } catch { return false; }
}

const attemptPattern = /^attempt-[0-9]+$/u;
export async function listAttempts(directory) {
  return (await fs.readdir(directory)).filter((name) => attemptPattern.test(name)).sort((left, right) => Number(left.slice(8)) - Number(right.slice(8)));
}

// Write the first file into a private temporary directory, then rename it into place, so an
// attempt directory never exists without its metadata.
export async function createAttempt(directory, attempt, file, value) {
  const target = path.join(directory, `attempt-${attempt}`);
  const temporary = path.join(directory, `.attempt-${attempt}.${randomUUID()}.tmp`);
  await fs.mkdir(temporary, { mode: 0o700 });
  try {
    await writeJson(path.join(temporary, file), value);
    try { await fs.lstat(target); throw Object.assign(new Error(`Attempt already exists: attempt-${attempt}`), { code: 'EEXIST' }); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { recursive: true, force: true });
    throw error;
  }
  return target;
}

// Read an attempt's result, falling back to its start metadata; null when neither file exists
// (an attempt left empty by an older harness or a crash between mkdir and the first write).
export async function readAttempt(attemptDirectory) {
  for (const file of ['result.json', 'trial.json']) {
    try { return { file, value: await readJson(path.join(attemptDirectory, file)) }; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return null;
}

export async function withRunLock(output, operation, callback, { verifyInputs = true } = {}) {
  const { root } = await loadOwnedManifest(output);
  const lock = path.join(root, '.running');
  const handle = await fs.open(lock, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), operation }));
    return await callback(await loadRun(root, { verifyInputs }));
  } finally {
    await handle.close();
    await fs.rm(lock, { force: true });
  }
}

export async function cleanup(output) {
  return withRunLock(output, 'cleanup', async ({ root, manifest }) => {
    for (const worktree of manifest.ownedWorktrees) {
      const target = path.resolve(root, worktree.directory);
      requireValue(inside(path.join(root, 'inputs'), target), 'Refusing cleanup outside owned inputs');
      const registered = (await git(worktree.repository, ['worktree', 'list', '--porcelain', '-z'])).split('\0').includes(`worktree ${target}`);
      if (registered) await git(worktree.repository, ['worktree', 'remove', '--force', target]);
    }
    await fs.rm(path.join(root, 'inputs'), { recursive: true, force: true });
    await fs.mkdir(path.join(root, 'inputs'));
    await writeJson(path.join(root, 'cleanup.json'), { cleanedAt: new Date().toISOString(), runId: manifest.runId });
  }, { verifyInputs: false });
}
