import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const updater = join(root, 'scripts/bump-agent-browser.mjs');
const shipped = 'skills/om-setup-agent-pipeline/references/browsers/agent-browser.md';
const installed = '.ai/browsers/agent-browser.md';
const source = readFileSync(join(root, shipped), 'utf8');
const assets = [...source.matchAll(/^    (agent-browser-\S+)\) ASSET_SHA256=([0-9a-f]{64})/gm)].map(m => m[1]);
assert.equal(assets.length, 7);
const release = { tag_name: 'v99.0.0', assets: assets.map((name, i) => ({ name, digest: `sha256:${String(i + 1).repeat(64)}` })) };
const scratch = mkdtempSync(join(tmpdir(), 'browser-pin-update-'));
const run = (data = release) => spawnSync(process.execPath, ['--input-type=module', '-e',
  'globalThis.fetch = async () => ({ok:true,json:async()=>JSON.parse(process.env.PIN_FIXTURE)}); await import(process.argv[1]);', updater],
  { cwd: scratch, encoding: 'utf8', env: { ...process.env, PIN_FIXTURE: JSON.stringify(data) } });
try {
  for (const path of [shipped, installed]) {
    mkdirSync(join(scratch, path, '..'), { recursive: true });
    writeFileSync(join(scratch, path), source);
  }
  execFileSync('git', ['init', '--quiet'], { cwd: scratch });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const updated = readFileSync(join(scratch, shipped), 'utf8');
  assert.equal(readFileSync(join(scratch, installed), 'utf8'), updated, 'both descriptors must move together');
  assert.match(updated, /AGENT_BROWSER_VERSION=v99\.0\.0/);
  for (const asset of release.assets) assert.ok(updated.includes(asset.digest.slice(7)));
  const workflow = readFileSync(join(root, '.github/workflows/agent-browser-pin.yml'), 'utf8');
  const stage = workflow.split('\n').find(line => line.trim().startsWith('git add '));
  assert.ok(stage, 'the updater workflow must stage its outputs');
  execFileSync('git', ['add', ...stage.trim().split(/\s+/).slice(2)], { cwd: scratch });
  const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: scratch, encoding: 'utf8' }).trim().split('\n');
  assert.deepEqual(staged.sort(), [shipped, installed].sort(), 'the generated PR must include both descriptors');

  writeFileSync(join(scratch, shipped), source);
  const custom = source + '\nLocal customization\n';
  writeFileSync(join(scratch, installed), custom);
  const refused = run();
  assert.notEqual(refused.status, 0, 'do not overwrite a customized installed descriptor');
  assert.equal(readFileSync(join(scratch, shipped), 'utf8'), source);
  assert.equal(readFileSync(join(scratch, installed), 'utf8'), custom);

  writeFileSync(join(scratch, installed), source);
  const incomplete = run({ tag_name: 'v99.0.0', assets: [] });
  assert.notEqual(incomplete.status, 0, 'missing release digests must prevent all writes');
  assert.equal(readFileSync(join(scratch, shipped), 'utf8'), source);
  assert.equal(readFileSync(join(scratch, installed), 'utf8'), source);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
console.log('Browser pin updater OK (descriptor parity, workflow staging, customization and digest safeguards).');
