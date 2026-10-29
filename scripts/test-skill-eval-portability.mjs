import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { hasPathSeparator } from './lib/skill-eval/storage.mjs';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function processExists(pid) {
  try { process.kill(pid, 0); return true; }
  catch { return false; }
}

async function waitFor(check, message, attempts = 200) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await check()) return;
    await delay(25);
  }
  throw new Error(message);
}

test('portable paths and process-tree cancellation cover Windows and Unix contracts', async (t) => {
  assert.equal(hasPathSeparator('bin/codex'), true);
  assert.equal(hasPathSeparator('bin\\codex.exe'), true);
  assert.equal(hasPathSeparator('codex'), false);

  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-eval-tree-'));
  const childScript = path.join(temporary, 'child.mjs');
  const controllerScript = path.join(temporary, 'controller.mjs');
  const descendantPidFile = path.join(temporary, 'descendant.pid');
  const descendantReadyFile = path.join(temporary, 'descendant.ready');
  await fs.writeFile(childScript, `
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const descendant = spawn(process.execPath, ['-e', ${JSON.stringify(`
const fs = require('node:fs');
process.on('SIGTERM', () => {});
fs.writeFileSync(${JSON.stringify(descendantReadyFile)}, 'ready');
setInterval(() => {}, 1000);
`)}], { stdio: 'ignore' });
writeFileSync(${JSON.stringify(descendantPidFile)}, String(descendant.pid));
setInterval(() => {}, 1000);
`);
  await fs.writeFile(controllerScript, `
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { stopProcessTree } from ${JSON.stringify(new URL('./lib/skill-eval/runner.mjs', import.meta.url).href)};
const child = spawn(process.execPath, [${JSON.stringify(childScript)}], {
  detached: process.platform !== 'win32',
  stdio: 'ignore',
});
while (true) {
  try { await access(${JSON.stringify(descendantReadyFile)}); break; }
  catch { await new Promise((resolve) => setTimeout(resolve, 10)); }
}
stopProcessTree(child);
`);
  const controller = spawn(process.execPath, [controllerScript], { stdio: 'ignore' });
  const controllerClosed = new Promise((resolve, reject) => {
    controller.once('error', reject);
    controller.once('close', (code) => code === 0 ? resolve() : reject(new Error(`controller exited ${code}`)));
  });
  let descendantPid;
  t.after(async () => {
    try { process.kill(controller.pid, 'SIGKILL'); } catch {}
    if (descendantPid) try { process.kill(descendantPid, 'SIGKILL'); } catch {}
    await fs.rm(temporary, { recursive: true, force: true });
  });
  await waitFor(async () => {
    try {
      descendantPid = Number(await fs.readFile(descendantPidFile, 'utf8'));
      await fs.access(descendantReadyFile);
      return Number.isSafeInteger(descendantPid);
    }
    catch { return false; }
  }, 'SIGTERM-resistant descendant process did not become ready');
  await controllerClosed;
  await waitFor(() => !processExists(descendantPid), 'descendant process survived process-tree cancellation');
  assert.equal(processExists(descendantPid), false);
});
