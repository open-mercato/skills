#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runtime = join(root, 'skills/om-harness/scripts/harness.mjs')
const temp = mkdtempSync(join(tmpdir(), 'harness hosts '))
const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }
function run(command, args, cwd = temp, expected = 0) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 30000 })
  assert.equal(result.status, expected, `${command} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`)
  return result
}
function cli(args, expected = 0) { return run(process.execPath, [runtime, ...args], temp, expected) }
function json(path) { return JSON.parse(readFileSync(path, 'utf8')) }
function save(path, value) { writeFileSync(path, JSON.stringify(value, null, 2) + '\n') }

try {
  const advisor = join(temp, 'advisor.mjs')
  writeFileSync(advisor, `import {readFileSync} from 'node:fs'; const prompt=readFileSync(0,'utf8'); if(!prompt.includes('<trusted_rubric>')) process.exit(9); console.log(JSON.stringify({verdict:'approve',findings:[],notes:[]}));`)
  for (const host of ['claude', 'codex']) {
    const dir = join(temp, host), repo = join(dir, 'repo')
    mkdirSync(repo, { recursive: true })
    for (const args of [['init', '-q'], ['config', 'user.name', 'Fixture'], ['config', 'user.email', 'fixture@example.invalid']]) run('git', args, repo)
    writeFileSync(join(repo, 'value.txt'), 'before\n')
    run('git', ['add', '.'], repo); run('git', ['commit', '-qm', 'baseline'], repo)
    const config = join(dir, 'config.json'), start = join(dir, 'start.json'), paths = join(dir, 'paths.txt')
    const packetPath = join(dir, 'packet.json'), freshPath = join(dir, 'fresh.json'), evidencePath = join(dir, 'evidence.json')
    const settings = { agentHarness: { version: 1, host, delivery: { mode: 'stage-only' }, models: {
      codex: { adapter: 'command', family: 'openai', model: 'fixture', roles: ['reviewer'], commands: { review: [process.execPath, advisor] } }
    }, profiles: { multi: { workers: [], reviewers: ['codex'], reviewPolicy: { mode: 'all-required', requiredReviewers: ['codex'] } } } } }
    save(config, settings)
    cli(['validate-config', '--config', config])
    cli(['capture', '--config', config, '--worktree', repo, '--output', start])
    assert.equal(json(start).host, host)
    writeFileSync(join(repo, 'value.txt'), 'after\n'); writeFileSync(paths, 'value.txt\n')
    const check = [process.execPath, '-e', `require('node:assert/strict').equal(require('node:fs').readFileSync(${JSON.stringify(join(repo, 'value.txt'))},'utf8'),'after\\n')`]
    run(check[0], check.slice(1))
    save(evidencePath, { version: 1, status: 'passed', reason: null, checks: [{ command: check, status: 'passed', exitCode: 0, evidence: 'Observed assertion exit 0' }] })
    const prepared = JSON.parse(cli(['prepare-review', '--config', config, '--worktree', repo, '--kind', 'implementation', '--paths-file', paths, '--validation-evidence', evidencePath, '--output', packetPath]).stdout)
    const packet = json(packetPath)
    assert.equal(packet.version, host === 'codex' ? 2 : 1)
    assert.equal(packet.contract.host, host === 'codex' ? 'codex' : undefined)
    const fresh = {
      version: packet.version,
      reviewer: { id: host, family: host === 'codex' ? 'openai' : 'anthropic', requestedModel: 'fixture', actualModel: null, provider: 'fixture', provenanceStatus: 'unverified', fallbackReason: null },
      freshContext: true, implementationContextInherited: false,
      contract: { name: 'om-code-review', version: 1, rubricSha256: prepared.rubricSha256, packetSha256: prepared.packetSha256, subjectSha256: prepared.subjectSha256, subjectKind: 'implementation', ...(host === 'codex' ? { host } : {}) },
      validationGate: packet.validationGate, status: 'completed', durationMs: 1,
      review: { verdict: 'approve', findings: [], notes: [] }
    }
    const reviewArgs = ['review', '--config', config, '--profile', 'multi', '--worktree', repo, '--paths-file', paths, '--review-packet', packetPath, '--host-review', freshPath, '--output-dir', join(dir, 'result')]
    for (const mutate of [
      value => { value.reviewer.id = host === 'codex' ? 'claude' : 'codex' },
      value => { value.reviewer.family = 'unrelated' },
      value => { value.freshContext = false },
      value => { value.implementationContextInherited = true },
      value => { value.contract.subjectSha256 = '0'.repeat(64) },
      value => { value.validationGate.checks[0].exitCode = 1 },
      value => { value.version = host === 'codex' ? 1 : 2 }
    ]) {
      const bad = structuredClone(fresh); mutate(bad); save(freshPath, bad)
      cli(reviewArgs, 1)
    }
    save(freshPath, fresh)
    cli(reviewArgs)
    const result = json(join(dir, 'result/review-result.json'))
    assert.equal(result.policy.completed, 1, 'Host must not satisfy the advisor policy')
    assert.deepEqual(result.reviewers.map(r => r.id), [host === 'codex' ? 'host:codex' : 'claude', 'codex'])
    assert.equal(result.reviewers[0].policyEligible, false)
    assert.match(readFileSync(join(dir, 'result/review-summary.md'), 'utf8'), host === 'codex' ? /Fresh Codex validation gate/ : /Fresh Claude validation gate/)
    if (host === 'codex') {
      const legacyConfig = join(dir, 'legacy-config.json'), legacyPacket = join(dir, 'legacy-packet.json')
      const legacy = structuredClone(settings); delete legacy.agentHarness.host; save(legacyConfig, legacy)
      cli(['prepare-review', '--config', legacyConfig, '--worktree', repo, '--kind', 'implementation', '--paths-file', paths, '--validation-evidence', evidencePath, '--output', legacyPacket])
      assert.match(cli(reviewArgs.map(arg => arg === packetPath ? legacyPacket : arg), 1).stderr, /packet host/)
      const stage = ['stage', '--worktree', repo, '--start-state', start, '--paths-file', paths, '--review-packet', legacyPacket, '--host-review', freshPath]
      assert.match(cli(stage, 1).stderr, /packet host/)
      for (const invalidHost of [undefined, 'unknown', null]) {
        const invalid = structuredClone(packet); invalid.contract.host = invalidHost; save(packetPath, invalid)
        cli(reviewArgs, 1)
      }
      save(packetPath, packet)
      const bad = structuredClone(fresh); delete bad.contract.host; save(freshPath, bad)
      cli(reviewArgs, 1); save(freshPath, fresh)
      assert.match(cli(['prepare-review', '--config', config, '--host', 'claude', '--kind', 'diagnosis', '--worktree', repo, '--paths-file', paths, '--output', legacyPacket], 1).stderr, /Explicit host/)
    }
    const staged = JSON.parse(cli(['stage', '--worktree', repo, '--start-state', start, '--paths-file', paths, '--review-packet', packetPath, '--host-review', freshPath]).stdout)
    assert.deepEqual(staged.stagedPaths, ['value.txt'])
  }
  const standard = join(temp, 'standard-config.json'), standardStart = join(temp, 'standard-start.json'), standardPacket = join(temp, 'standard-packet.json'), subject = join(temp, 'subject.txt')
  save(standard, {}); writeFileSync(subject, 'A diagnosis fixture with no external providers.\n')
  const standardRepo = join(temp, 'codex/repo')
  cli(['capture', '--config', standard, '--host', 'codex', '--worktree', standardRepo, '--output', standardStart])
  cli(['prepare-review', '--config', standard, '--host', 'codex', '--worktree', standardRepo, '--kind', 'diagnosis', '--artifact', subject, '--output', standardPacket])
  assert.equal(json(standardPacket).contract.host, 'codex')
  cli(['end-run', '--worktree', standardRepo, '--start-state', standardStart, '--reason', 'Fixture complete'])
  console.log('Harness host tests passed: Codex and legacy Claude councils/staging; wrong host, inherited context, stale hashes and failed evidence rejected.')
} finally { rmSync(temp, { recursive: true, force: true }) }
