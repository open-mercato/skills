#!/usr/bin/env node

// Contract and integration test for the om-auto-review-pr held-CI release
// (skills/om-auto-review-pr/references/ci-approval.md). Three layers:
//   1. the bundled gate helper's decide/readback rules, fed JSON directly;
//   2. the shipped approve-pending-runs shell, pulled verbatim out of each tracker
//      descriptor and run against a stubbed gh/glab that logs every call;
//   3. the review-pass sequence the skill follows (decide -> one approval call ->
//      readback), asserting that every refused case reaches the host with no
//      approval or pipeline-start request at all.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const helper = join(root, 'skills/om-auto-review-pr/scripts/held-ci-gate.mjs')
const trackers = join(root, 'skills/om-setup-agent-pipeline/references/trackers')
const descriptors = {
  github: join(trackers, 'github.md'),
  installedGithub: join(root, '.ai/trackers/github.md'),
  gitlab: join(trackers, 'gitlab.md'),
  forgejo: join(trackers, 'forgejo.md'),
  jira: join(trackers, 'jira.md'),
  linear: join(trackers, 'linear.md'),
}
const A = 'a'.repeat(40)
const B = 'b'.repeat(40)
const work = mkdtempSync(join(tmpdir(), 'held-ci-gate-'))
process.on('exit', () => rmSync(work, { recursive: true, force: true }))

const gate = payload => {
  const result = spawnSync(process.execPath, [helper], { encoding: 'utf8', input: JSON.stringify(payload) })
  return { ...result, json: result.status === 0 ? JSON.parse(result.stdout) : null }
}
const ok = payload => { const result = gate(payload); assert.equal(result.status, 0, result.stderr); return result.json }

const enabled = { ci: { approveHeldRunsOnReview: true } }
const held = [{ id: 101, workflowName: 'CI', url: 'https://github.example/o/r/actions/runs/101' }, { id: 102, workflowName: 'Lint', url: 'https://github.example/o/r/actions/runs/102' }]
const decideInput = (overrides = {}) => ({
  action: 'decide', config: enabled, heldRuns: held, reviewedSha: A, currentSha: A,
  reviewCompleted: true, changedFiles: ['src/cart.ts', 'src/cart.test.ts', 'docs/cart.md'], changedFilesComplete: true,
  suspiciousContent: false, duplicateOrMerged: false, descriptorPath: descriptors.github, ...overrides,
})

// --- 1. decide: the opt-in is off unless it is a literal true -----------------
for (const config of [undefined, {}, { ci: {} }, { ci: { maxWaitMinutes: 40 } }, { ci: { approveHeldRunsOnReview: false } }, { ci: { approveHeldRunsOnReview: 'true' } }, { ci: { approveHeldRunsOnReview: 1 } }, { ci: null }]) {
  const decision = ok(decideInput({ config }))
  assert.equal(decision.release, false, `opt-in ${JSON.stringify(config)} must not release`)
  assert.equal(decision.code, 'disabled')
  assert.equal(decision.disclose, true, 'held runs are still disclosed when release is off')
  assert.equal(decision.line, null, 'off by default adds no CI-not-released line, only the held disclosure')
}
assert.equal(ok(decideInput()).release, true, 'the fully eligible GitHub case releases')
assert.deepEqual(ok(decideInput()).heldRuns, ['101', '102'])
assert.equal(ok(decideInput({ heldRuns: [] })).code, 'nothing-held')
assert.equal(ok(decideInput({ heldRuns: [] })).disclose, false)
console.log('PASS: release is off by default, for explicit false and for non-boolean opt-ins')

// --- 1. decide: head, review and diff completeness ---------------------------
const refusal = (overrides, code) => {
  const decision = ok(decideInput(overrides))
  assert.equal(decision.release, false, `${code}: must refuse`)
  assert.equal(decision.code, code, JSON.stringify(decision))
  assert.match(decision.line, /^CI not released: /)
  assert.equal(decision.disclose, true)
  return decision
}
refusal({ currentSha: B }, 'head-moved')
assert.match(ok(decideInput({ currentSha: B })).line, /unreviewed/)
for (const sha of [undefined, '', 'abc123', A.slice(0, 39), A.toUpperCase()]) refusal({ currentSha: sha }, 'invalid-sha')
refusal({ reviewedSha: 'HEAD' }, 'invalid-sha')
for (const reviewCompleted of [undefined, false, 'true']) refusal({ reviewCompleted }, 'review-incomplete')
for (const values of [{ changedFilesComplete: false }, { changedFilesComplete: undefined }, { changedFiles: null }, { changedFiles: 'src/a.ts' }, { changedFiles: ['src/a.ts', ''] }, { changedFiles: [] }]) refusal(values, 'changed-files-incomplete')
for (const suspiciousContent of [true, undefined, 'no']) refusal({ suspiciousContent }, 'suspicious-content')
for (const duplicateOrMerged of [true, undefined]) refusal({ duplicateOrMerged }, 'duplicate-or-merged')
console.log('PASS: a moved head, short SHA, unfinished review, incomplete diff, suspicious content or duplicate refuses')

// --- 1. decide: anything CI executes refuses ---------------------------------
const executable = [
  '.github/workflows/ci.yml', '.github/actions/setup/action.yml', '.gitlab-ci.yml', '.forgejo/workflows/test.yaml', '.circleci/config.yml', 'Jenkinsfile',
  'scripts/test.sh', 'scripts/lint.sh', 'tools/release.mjs', 'ci/run.sh', 'bin/build',
  'package.json', 'packages/core/package.json', 'pyproject.toml', 'setup.py', 'requirements-dev.txt', 'Gemfile', 'go.mod', 'Cargo.toml', 'composer.json', 'pom.xml', 'build.gradle.kts', 'app/App.csproj',
  'yarn.lock', 'package-lock.json', 'pnpm-lock.yaml', 'bun.lockb', 'poetry.lock', 'Cargo.lock', 'go.sum', 'Gemfile.lock',
  '.npmrc', '.yarnrc.yml', '.yarn/plugins/plugin.cjs', '.pnpmfile.cjs', 'pnpm-workspace.yaml', '.nvmrc', '.tool-versions', 'rust-toolchain.toml', 'gradlew', '.env.test',
  'Dockerfile', 'docker/app.Dockerfile', 'docker-compose.yml', 'compose.yaml', '.devcontainer/devcontainer.json', 'flake.nix',
  'Makefile', 'build.rs', 'CMakeLists.txt', 'tox.ini', 'pytest.ini', 'tests/conftest.py', 'noxfile.py',
  'tsconfig.json', 'tsconfig.build.json', 'jest.config.ts', 'vitest.config.mts', 'playwright.config.ts', 'babel.config.js', '.babelrc', 'webpack.config.cjs', 'eslint.config.mjs', '.eslintrc.json', '.prettierrc', 'turbo.json',
  'jest.setup.ts', 'vitest.setup.ts', 'src/setupTests.ts', 'tests/setup.ts', 'e2e/global-setup.ts',
  '.gitattributes', '.gitmodules', '.pre-commit-config.yaml', '.husky/pre-commit',
]
for (const path of executable) {
  const decision = refusal({ changedFiles: ['src/cart.ts', path] }, 'executable-change')
  assert.deepEqual(decision.paths.map(entry => entry.path), [path], `${path} must be flagged alone`)
}
const ordinary = ['src/cart.ts', 'src/cart.test.ts', 'src/__tests__/cart.spec.tsx', 'tests/unit/cart_test.py', 'lib/cart.rb', 'README.md', 'docs/setup-guide.md', 'skills/om-x/SKILL.md', 'src/components/Package.tsx', 'locales/en.json']
assert.equal(ok(decideInput({ changedFiles: ordinary })).release, true, 'own source, tests and docs may release')
const many = ok(decideInput({ changedFiles: ['a/package.json', 'b/package.json', 'c/package.json', 'd/package.json', 'e/package.json', 'f/package.json'] }))
assert.equal(many.paths.length, 6)
assert.match(many.line, /…/, 'long lists are truncated in the review line, not in paths')
console.log(`PASS: ${executable.length} executable-surface paths refuse; ${ordinary.length} ordinary source/test/doc paths release`)

// --- 1. decide: only a descriptor that binds the approval to the SHA releases -
assert.equal(ok(decideInput({ descriptorPath: descriptors.github })).release, true)
assert.equal(ok(decideInput({ descriptorPath: descriptors.installedGithub })).release, true)
assert.equal(ok(decideInput({ descriptorPath: descriptors.jira })).release, true, 'jira delegates to GitHub')
assert.equal(ok(decideInput({ descriptorPath: descriptors.linear })).release, true, 'linear delegates to GitHub')
refusal({ descriptorPath: descriptors.gitlab }, 'provider-not-sha-bound')
refusal({ descriptorPath: descriptors.forgejo }, 'provider-unavailable')
refusal({ descriptorPath: join(work, 'missing.md') }, 'provider-unknown')
refusal({ descriptorPath: undefined }, 'provider-unknown')
const unmarked = join(work, 'unmarked-github.md')
writeFileSync(unmarked, readFileSync(descriptors.github, 'utf8').replace(/\*\*Reviewed-SHA binding:\*\* `sha-bound`/, ''))
refusal({ descriptorPath: unmarked }, 'provider-unknown')
const misplaced = join(work, 'misplaced-github.md')
writeFileSync(misplaced, readFileSync(descriptors.github, 'utf8').replace(/\*\*Reviewed-SHA binding:\*\* `sha-bound`[^\n]*\n/, '').replace('#### watch-run', '#### watch-run\n**Reviewed-SHA binding:** `sha-bound`'))
refusal({ descriptorPath: misplaced }, 'provider-unknown')
console.log('PASS: GitHub (and Jira/Linear) release; GitLab, Forgejo, unmarked or misplaced declarations refuse')

// --- 1. malformed input fails closed -----------------------------------------
for (const payload of [{}, { action: 'approve' }, { action: 'decide', config: enabled, heldRuns: 'x' }, { action: 'decide', config: enabled, heldRuns: [{}] }]) {
  assert.notEqual(gate(payload).status, 0, `malformed ${JSON.stringify(payload)} must exit non-zero`)
}
assert.notEqual(spawnSync(process.execPath, [helper], { encoding: 'utf8', input: 'not json' }).status, 0)
console.log('PASS: malformed input exits non-zero instead of deciding')

// --- 2. stubbed code hosts ----------------------------------------------------
const hostBin = join(work, 'bin')
const hostState = join(work, 'state.json')
const hostLog = join(work, 'calls.log')
spawnSync('mkdir', ['-p', hostBin])
writeFileSync(join(hostBin, 'fakehost'), `#!/usr/bin/env node
const { appendFileSync, readFileSync, writeFileSync } = require('node:fs')
const { spawnSync } = require('node:child_process')
const { basename } = require('node:path')
const tool = basename(process.argv[1])
const args = process.argv.slice(2)
const state = JSON.parse(readFileSync(process.env.HOST_STATE, 'utf8'))
const save = () => writeFileSync(process.env.HOST_STATE, JSON.stringify(state))
let method = 'GET', path = null, jq = null, input = false
for (let i = 1; i < args.length; i++) {
  if (args[i] === '-X') method = args[++i]
  else if (args[i] === '--jq') jq = args[++i]
  else if (args[i] === '-H') i++
  else if (args[i] === '--input') { input = true; i++ }
  else if (!args[i].startsWith('-') && path === null) path = args[i]
}
const body = input ? readFileSync(0, 'utf8') : ''
appendFileSync(process.env.HOST_LOG, JSON.stringify({ tool, method, path, body }) + '\\n')
const out = value => {
  const json = JSON.stringify(value)
  if (!jq) return process.stdout.write(json)
  const result = spawnSync('jq', ['-r', jq], { input: json, encoding: 'utf8' })
  process.stdout.write(result.stdout); process.exit(result.status)
}
if (tool === 'gh') {
  if (method === 'GET' && /actions\\/runs\\?/.test(path)) {
    const status = new URL('https://x/' + path).searchParams.get('status')
    return out({ workflow_runs: state.runs.filter(run => !status || run.conclusion === status) })
  }
  const approve = path.match(/actions\\/runs\\/(\\d+)\\/approve$/)
  if (method === 'POST' && approve) {
    const run = state.runs.find(item => String(item.id) === approve[1])
    if (!run || state.denyApprove.includes(run.id)) { process.stderr.write('HTTP 403: Must have admin rights to Repository.'); process.exit(1) }
    run.conclusion = null; run.status = 'queued'; save(); return out({})
  }
}
if (tool === 'glab') {
  if (method === 'GET' && /\\/pipelines\\?/.test(path)) {
    const sha = new URL('https://x/' + path).searchParams.get('sha')
    return out(state.pipelines.filter(pipeline => pipeline.sha === sha))
  }
  if (method === 'POST' && /merge_requests\\/\\d+\\/pipelines$/.test(path)) {
    const pipeline = { id: 500 + state.pipelines.length, sha: state.mrHeadSha, status: 'created' }
    state.pipelines.push(pipeline); save(); return out(pipeline)
  }
}
process.stderr.write('unexpected ' + tool + ' ' + method + ' ' + path); process.exit(1)
`)
chmodSync(join(hostBin, 'fakehost'), 0o755)
symlinkSync(join(hostBin, 'fakehost'), join(hostBin, 'gh'))
symlinkSync(join(hostBin, 'fakehost'), join(hostBin, 'glab'))

const setHost = state => writeFileSync(hostState, JSON.stringify({ runs: [], denyApprove: [], pipelines: [], mrHeadSha: A, ...state }))
const readHost = () => JSON.parse(readFileSync(hostState, 'utf8'))
const calls = () => readFileSync(hostLog, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line))
const writes = () => calls().filter(call => call.method !== 'GET')

const operation = path => {
  const section = readFileSync(path, 'utf8').split(/^#### approve-pending-runs\s*$/m)[1].split(/^#### /m)[0]
  return section.match(/```bash\n([\s\S]*?)\n```/)[1]
}
const gitlabText = readFileSync(descriptors.gitlab, 'utf8')
const gitlabHelpers = [
  gitlabText.match(/^GL_JQ_DEFS='[\s\S]*?^'$/m)[0],
  ...[...gitlabText.matchAll(/^[a-z_]+\(\) \{\n[\s\S]*?^\}$/gm)].map(match => match[0]),
].join('\n\n')
const shell = (script, prelude = '') => {
  writeFileSync(hostLog, '')
  return spawnSync('bash', ['-c', `${prelude}\n${script}`], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${hostBin}:${process.env.PATH}`, HOST_STATE: hostState, HOST_LOG: hostLog, REPO: '' },
  })
}
const runGithub = (path, sha) => shell(operation(path).replaceAll('{owner}', 'o').replaceAll('{repo}', 'r').replaceAll('{headSha}', sha))
const runGitlab = sha => shell(operation(descriptors.gitlab).replaceAll('{prNumber}', '7').replaceAll('{headSha}', sha), gitlabHelpers)
const listRuns = sha => readHost().runs.filter(run => run.head_sha === sha).map(run => ({ databaseId: run.id, headSha: run.head_sha, status: run.status, conclusion: run.conclusion }))
const heldRun = (id, sha) => ({ id, head_sha: sha, status: 'completed', conclusion: 'action_required' })

// GitHub: approvals are bound to the reviewed SHA even when the host's filter is not.
for (const path of [descriptors.github, descriptors.installedGithub]) {
  setHost({ runs: [heldRun(101, A), heldRun(102, A), heldRun(201, B)] })
  const result = runGithub(path, A)
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.stdout.trim().split('\n'), ['101', '102'])
  assert.deepEqual(writes().map(call => call.path), ['repos/o/r/actions/runs/101/approve', 'repos/o/r/actions/runs/102/approve'], 'only runs created for the reviewed SHA are approved')
  assert.equal(readHost().runs.find(run => run.id === 201).conclusion, 'action_required', 'the later push stays held')
}
console.log('PASS: GitHub approve-pending-runs approves only run ids whose head_sha is the reviewed SHA')

// GitLab: the shipped operation is not SHA-bound — the A->B race starts unreviewed B.
setHost({ mrHeadSha: B })
const race = runGitlab(A)
assert.equal(race.status, 0, race.stderr)
const started = writes()
assert.equal(started.length, 1, 'the GitLab operation POSTs once')
assert.match(started[0].path, /merge_requests\/7\/pipelines$/)
assert.doesNotMatch(started[0].body, /[0-9a-f]{40}/, 'the POST carries no expected SHA')
assert.equal(readHost().pipelines[0].sha, B, 'a push after the head check gets its unreviewed code started')
console.log('PASS: GitLab approve-pending-runs demonstrably cannot bind to the reviewed SHA (why it is declared not-sha-bound)')

// --- 3. the review pass: decide -> one approval call -> readback -------------
const reviewPass = ({ host, descriptor = descriptors.github, provider = 'github', reviewedSha = A, ...overrides }) => {
  setHost(host)
  writeFileSync(hostLog, '')
  const decision = ok(decideInput({ descriptorPath: descriptor, reviewedSha, ...overrides }))
  if (!decision.release) return { decision, writes: writes(), approvals: 0 }
  const approval = provider === 'gitlab' ? runGitlab(reviewedSha) : runGithub(descriptor, reviewedSha)
  const approvalWrites = writes()
  const readback = ok({ action: 'readback', reviewedSha, heldRuns: decision.heldRuns, approveExitCode: approval.status, approveStdout: approval.stdout, runs: listRuns(reviewedSha) })
  return { decision, approval, readback, writes: approvalWrites }
}
const heldHost = () => ({ runs: [heldRun(101, A), heldRun(102, A)] })

const denied = [
  ['opt-in missing', { config: {} }],
  ['explicit false', { config: { ci: { approveHeldRunsOnReview: false } } }],
  ['workflow change', { changedFiles: ['src/a.ts', '.github/workflows/ci.yml'] }],
  ['lockfile change', { changedFiles: ['yarn.lock'] }],
  ['test config change', { changedFiles: ['src/a.test.ts', 'jest.config.js'] }],
  ['head advanced to B', { currentSha: B }],
  ['incomplete file list', { changedFilesComplete: false }],
  ['suspicious content', { suspiciousContent: true }],
  ['GitLab A->B race', { descriptor: descriptors.gitlab, provider: 'gitlab', host: { mrHeadSha: B } }],
  ['Forgejo', { descriptor: descriptors.forgejo }],
  ['unmarked descriptor', { descriptor: unmarked }],
]
for (const [name, scenario] of denied) {
  const pass = reviewPass({ host: heldHost(), ...scenario })
  assert.equal(pass.decision.release, false, `${name}: must refuse`)
  assert.deepEqual(pass.writes, [], `${name}: no approval or pipeline-start request may reach the host`)
  assert.equal(readHost().runs.filter(run => run.conclusion === 'action_required').length, scenario.host ? 0 : 2, `${name}: held runs stay held`)
  if (scenario.provider === 'gitlab') assert.equal(readHost().pipelines.length, 0, 'no GitLab pipeline is started for unreviewed B')
}
console.log(`PASS: ${denied.length} refused review passes send no approval or pipeline-start request`)

const full = reviewPass({ host: heldHost() })
assert.equal(full.decision.release, true)
assert.equal(full.writes.length, 2, 'one approval request per held run')
assert.deepEqual(full.readback.released, ['101', '102'])
assert.deepEqual(full.readback.pending, ['101', '102'], 'released runs become pending checks')
assert.deepEqual(full.readback.stillHeld, [])
assert.equal(full.readback.refused, false)
assert.equal(full.readback.disclose, false)
assert.equal(full.readback.line, `CI released: 2 held workflow runs for ${A.slice(0, 12)}`)
console.log('PASS: an eligible GitHub review pass releases every held run and reports them pending')

const refusedPass = reviewPass({ host: { ...heldHost(), denyApprove: [101, 102] } })
assert.equal(refusedPass.decision.release, true)
assert.equal(refusedPass.writes.length, 2, 'a permission refusal is attempted once per held run, never retried')
assert.deepEqual(refusedPass.readback.released, [])
assert.deepEqual(refusedPass.readback.stillHeld, ['101', '102'])
assert.equal(refusedPass.readback.refused, true)
assert.equal(refusedPass.readback.retry, false)
assert.equal(refusedPass.readback.disclose, true)
assert.match(refusedPass.readback.line, /^CI not released: .*maintainer with write access/)
console.log('PASS: a refused approval is reported once, keeps the runs held and disclosed, and is not retried')

const partial = reviewPass({ host: { ...heldHost(), denyApprove: [102] } })
assert.deepEqual(partial.readback.released, ['101'])
assert.deepEqual(partial.readback.pending, ['101'])
assert.deepEqual(partial.readback.stillHeld, ['102'])
assert.equal(partial.readback.refused, false)
assert.equal(partial.readback.approvalErrors, true, 'the failed approval is still surfaced')
assert.equal(partial.readback.disclose, true, 'still-held runs keep the held disclosure')
assert.equal(partial.readback.line, `CI released: 1 held workflow run for ${A.slice(0, 12)}; 1 still held for maintainer approval`)
console.log('PASS: a partial release reports released runs as pending and the rest as still held')

// --- 3. readback edge cases --------------------------------------------------
const readback = overrides => ok({ action: 'readback', reviewedSha: A, heldRuns: ['101'], approveExitCode: 0, approveStdout: '101\n', runs: [{ databaseId: 101, headSha: A, status: 'in_progress', conclusion: null }], ...overrides })
assert.deepEqual(readback({}).released, ['101'])
assert.deepEqual(readback({ runs: [{ databaseId: 101, headSha: A, status: 'completed', conclusion: 'success' }] }).pending, [], 'a finished run is released but not pending')
assert.deepEqual(readback({ runs: [] }).stillHeld, ['101'], 'a run missing from readback is not assumed released')
assert.deepEqual(readback({ runs: [{ databaseId: 101, headSha: B, status: 'queued', conclusion: null }] }).stillHeld, ['101'], 'a run on another SHA never counts as released')
assert.deepEqual(readback({ runs: [{ databaseId: 101, headSha: B, status: 'queued', conclusion: null }] }).foreignRuns, ['101'])
assert.deepEqual(readback({ runs: [{ databaseId: 101, headSha: A, status: 'completed', conclusion: 'action_required' }] }).approvedButStillHeld, ['101'])
assert.match(readback({ approveExitCode: 3, approveStdout: `APPROVAL_UNAVAILABLE ${A}`, runs: [{ databaseId: 101, headSha: A, status: 'completed', conclusion: 'action_required' }] }).line, /no programmatic approval/)
for (const values of [{ approveExitCode: undefined }, { runs: undefined }, { reviewedSha: 'abc' }]) assert.notEqual(gate({ action: 'readback', reviewedSha: A, heldRuns: ['101'], approveExitCode: 0, runs: [], ...values }).status, 0)
console.log('PASS: readback never counts missing, foreign-SHA or still-held runs as released')

// --- the prose contract names the helper and the binding rule -----------------
const procedure = readFileSync(join(root, 'skills/om-auto-review-pr/references/ci-approval.md'), 'utf8')
assert.match(procedure, /scripts\/held-ci-gate\.mjs/)
assert.match(procedure, /exactly \*\*once\*\*/)
assert.match(procedure, /Reviewed-SHA binding: sha-bound/)
assert.match(readFileSync(join(root, 'skills/om-auto-review-pr/SKILL.md'), 'utf8'), /scripts\/held-ci-gate\.mjs/)
assert.match(readFileSync(join(trackers, 'TEMPLATE.md'), 'utf8'), /Reviewed-SHA binding:/)
console.log('PASS: the procedure, SKILL.md and tracker template reference the gate and the binding declaration')
