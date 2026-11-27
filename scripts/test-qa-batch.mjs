#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const helper = fileURLToPath(new URL('../skills/om-qa-batch/scripts/classify-batch.mjs', import.meta.url))
const run = input => spawnSync(process.execPath, [helper], { encoding: 'utf8', input: JSON.stringify(input) })
const good = input => { const result = run(input); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout) }

const config = {
  baseBranch: 'main',
  qaGateLabel: 'needs-human-qa',
  humanQaPolicy: {
    paths: ['app/styles/tokens.css'],
    batchCheckLabel: 'qa-batch-check',
    batchPaths: ['src/portal/**'],
    uiPaths: ['**/*.tsx'],
    uiFileThreshold: 3,
    trustedTriageAuthors: ['review-bot'],
    humanVerdictLabels: ['qa-human-ok']
  }
}
const pr = (number, values = {}) => ({ number, title: `PR ${number}`, baseRefName: 'main', author: 'dev', headSha: `sha${number}`, labels: [], files: [], comments: [], ...values })
const triage = (head, lane) => ({ author: 'review-bot[bot]', createdAt: '2026-11-25T10:00:00Z', body: `rationale\n<!-- qa-triage v1\n{"head":"${head}","lane":"${lane}","rules":["B1"]}\n-->` })

const result = good({
  config,
  batchBranch: 'stabilize/main-2026-11-26',
  automationIdentities: [],
  prs: [
    pr(1, { labels: ['needs-human-qa', 'needs-qa'] }),
    pr(2, { labels: ['needs-human-qa', 'qa-approved'], qaApproval: { head: 'sha2', human: true } }),
    pr(3, { labels: ['needs-qa', 'qa-batch-check'] }),
    pr(4, { comments: [triage('sha4', 'batch')], labels: ['needs-qa'] }),
    pr(5, { comments: [triage('stale', 'batch')], labels: ['skip-qa'] }),
    pr(6, { labels: ['needs-qa'], files: [{ path: 'src/portal/login/page.tsx', status: 'modified' }] }),
    pr(7, { labels: ['needs-qa', 'qa-self-verified'], files: [{ path: 'src/admin/List.tsx', status: 'modified' }] }),
    pr(8, { labels: ['needs-qa'], files: [{ path: 'src/admin/List.tsx', status: 'modified' }] }),
    pr(9, { labels: ['skip-qa'], files: [{ path: 'README.md', status: 'modified' }] }),
    pr(10, { baseRefName: 'stabilize/main-2026-11-26' }),
    pr(11, { baseRefName: 'release/1.x' }),
    pr(12, { labels: ['needs-qa'], files: ['a.tsx', 'b.tsx', 'c.tsx', 'd.tsx'].map(path => ({ path, status: 'modified' })) }),
    pr(13, { labels: ['needs-qa', 'qa-self-verified'], files: [{ path: 'src/admin/New.tsx', status: 'added' }] }),
    pr(14, { comments: [{ ...triage('sha14', 'human'), author: 'someone-else' }], labels: ['skip-qa'] }),
    pr(15, { comments: [triage('sha15', 'human')], labels: ['needs-qa'] }),
    pr(16, { labels: ['needs-human-qa', 'qa-failed'] }),
    pr(17, { labels: ['needs-qa'], files: [{ path: 'src/admin/__tests__/List.test.tsx', status: 'modified' }] }),
    pr(18, { labels: ['needs-human-qa', 'qa-approved', 'qa-failed'] }),
    pr(19, { labels: ['needs-human-qa', 'qa-human-ok'] }),
    pr(20, { labels: ['needs-human-qa', 'qa-approved', 'qa-self-verified'] }),
    pr(1, { labels: [] })
  ]
})
const ids = name => result.buckets[name].map(entry => entry.number)
assert.deepEqual(ids('gateMissed'), [1, 15, 16, 18, 19, 20])
assert.deepEqual(ids('coveredHuman'), [2])
assert.deepEqual(ids('batchCheck'), [3, 4])
assert.deepEqual(ids('candidates'), [6, 8, 12, 13])
assert.deepEqual(ids('coveredAuto'), [7])
assert.deepEqual(ids('noManualQa'), [5, 9, 14, 17])
assert.deepEqual(ids('stabilization'), [10])
assert.deepEqual(ids('otherBase'), [11])
assert.equal(result.counts.total, 20)
assert.match(result.buckets.candidates.find(entry => entry.number === 13).reasons.join(' '), /adds UI files/)
const edited = good({ config, prs: [pr(21, { labels: ['needs-qa'], comments: [
  { ...triage('sha21', 'batch'), createdAt: '2026-11-25T09:00:00Z', updatedAt: '2026-11-25T12:00:00Z' },
  { ...triage('sha21', 'auto'), createdAt: '2026-11-25T10:00:00Z' }
] })] })
assert.deepEqual(edited.buckets.batchCheck.map(entry => entry.number), [21], 'an edited triage comment wins by updatedAt')
const noAutoEvidence = good({ config: { ...config, qaBatch: { autoQaEvidenceLabels: [] } }, prs: [pr(7, { labels: ['skip-qa', 'qa-self-verified'] })] })
assert.deepEqual(noAutoEvidence.buckets.coveredAuto, [], 'an explicit empty autoQaEvidenceLabels must not fall back to defaults')
console.log('PASS: batch classifier buckets the human gate, batch lane, trusted triage, evidence and bases')

// A failed verdict remains must-test even after its request label was removed.
const verdicts = good({ config, prs: [
  pr(30, { labels: ['qa-failed', 'qa-self-verified'] }),
  pr(31, { labels: ['qa-failed', 'skip-qa'] }),
  pr(32, { labels: ['needs-human-qa', 'qa-approved'], qaApproval: { head: 'old-head', human: true } }),
  pr(33, { labels: ['needs-human-qa', 'qa-approved'] }),
  pr(34, { labels: ['qa-approved'], qaApproval: { head: 'sha34', human: true }, comments: [triage('sha34', 'human')] }),
  pr(35, { labels: ['qa-approved', 'qa-self-verified'], qaApproval: { head: 'old-head', human: false } })
] })
assert.deepEqual(verdicts.buckets.gateMissed.map(entry => entry.number), [30, 31, 32, 33, 35])
assert.deepEqual(verdicts.buckets.coveredHuman.map(entry => entry.number), [34])
assert.deepEqual(verdicts.buckets.coveredAuto, [])
const malformedTriage = good({ config, prs: [
  pr(36, { comments: [{ ...triage('sha36', 'human'), body: '<!-- qa-triage v1\n{"head":"sha36","lane":"human","rules":"3.2"}\n-->' }], files: ['view.tsx'] }),
  pr(37, { comments: [triage('unbound', 'human')], headSha: undefined, files: ['view.tsx'] }),
  pr(38, { comments: [{ ...triage('sha38', 'human'), body: '<!-- qa-triage v1\nnull\n-->' }], files: ['view.tsx'] })
] })
assert.deepEqual(malformedTriage.buckets.candidates.map(entry => entry.number), [36, 37, 38])
assert.deepEqual(malformedTriage.buckets.gateMissed, [])
console.log('PASS: failed/stale QA stays must-test and malformed or unbound triage is ignored')

const firstPassFixes = good({ config, batchBranch: 'stabilize/today', prs: [
  pr(40, { baseRefName: 'stabilize/today', labels: ['qa-failed'], files: [{ path: 'src/checkout/page.tsx', status: 'added' }] }),
  pr(41, { baseRefName: 'stabilize/today', labels: ['needs-qa'], files: [{ path: 'src/account/page.tsx', status: 'added' }] }),
  pr(42, { baseRefName: 'stabilize/today', labels: ['qa-batch-check'] }),
  pr(43, { baseRefName: 'stabilize/today', labels: ['qa-approved'], qaApproval: { head: 'sha43', human: true } })
] })
assert.deepEqual(firstPassFixes.buckets.gateMissed.map(entry => entry.number), [40])
assert.deepEqual(firstPassFixes.buckets.candidates.map(entry => entry.number), [41])
assert.deepEqual(firstPassFixes.buckets.batchCheck.map(entry => entry.number), [42])
assert.deepEqual(firstPassFixes.buckets.coveredHuman.map(entry => entry.number), [43])
assert.equal(firstPassFixes.counts.total, 4)
for (const bucket of Object.values(firstPassFixes.buckets)) {
  assert.ok(bucket.every(entry => entry.stabilization === true), 'stabilization remains provenance, not an exemption')
}
console.log('PASS: stabilization fixes present before the first start keep normal QA selection and failure precedence')



const collapsed = good({ config: { ...config, qaGateLabel: 'needs-qa' }, prs: [pr(1, { labels: ['needs-human-qa'] })] })
assert.equal(collapsed.gateLabel, null)
assert.deepEqual(collapsed.buckets.gateMissed, [])
for (const bad of [
  { config: { ...config, humanQaPolicy: { batchPaths: [1] } }, prs: [] },
  { config: { ...config, humanQaPolicy: { uiFileThreshold: -1 } }, prs: [] },
  { config: { ...config, qaBatch: [] }, prs: [] },
  { config, prs: [{ number: 'x' }] },
  { config: { qaGateLabel: 'needs-human-qa' }, prs: [] },
  ...['qa-approved', 'qa-failed', 'needs-qa', 'skip-qa', 'needs-human-qa', 'qa-human-ok',
    'in-progress', 'claim-reset', 'merge-queue', 'automerge-signal-1-cr', 'automerge-signal-2-qa',
    'automerge-signal-3-passes-local-ci-checks', 'risk-high', 'priority-high'].map(label =>
    ({ config: { ...config, humanQaPolicy: { ...config.humanQaPolicy, batchCheckLabel: label } }, prs: [] }))
]) assert.notEqual(run(bad).status, 0, 'must reject ' + JSON.stringify(bad).slice(0, 80))
console.log('PASS: classifier rejects malformed policy, config and PR input')

const setup = read('skills/om-qa-batch/references/agentic-setup.md')
const filter = setup.match(/QA_BATCH=\$\(jq -ce '([^']+)'/)[1]
const load = value => spawnSync('jq', ['-ce', filter], { input: JSON.stringify(value), encoding: 'utf8', timeout: 5000 })
const defaults = JSON.parse(load({}).stdout)
assert.equal(defaults.branchPrefix, 'stabilize/')
assert.equal(defaults.inProgressLabel, 'qa-in-progress')
assert.equal(defaults.blockerLabel, 'qa-blocker')
assert.deepEqual(defaults.bugLabels, ['bug'])
assert.equal(defaults.smoke, null)
assert.deepEqual(defaults.testers, [])
const custom = { branchPrefix: 'batch/', greenTagPrefix: 'verified/', smoke: '.ai/qa/smoke.md', inProgressLabel: 'testing', bugLabels: ['bug', 'daily-qa'], blockerLabel: 'blocker', autoQaEvidenceLabels: ['qa-self-verified'], testers: ['qa-anna', 'Tester2'] }
assert.deepEqual(JSON.parse(load({ qaBatch: custom }).stdout), custom)
for (const qaBatch of [[], 'x',
  ...['branchPrefix', 'greenTagPrefix', 'inProgressLabel', 'blockerLabel', 'bugLabels', 'autoQaEvidenceLabels', 'testers'].flatMap(key => [{ [key]: null }, { [key]: false }]), { branchPrefix: 'no-slash' }, { branchPrefix: '../x/' }, { bugLabels: [] }, { bugLabels: [''] }, { smoke: '' }, { blockerLabel: 'qa-approved' }, { inProgressLabel: 'qa-failed' },
  { testers: 'qa-anna' }, { testers: [''] }, { testers: [1] }, { testers: ['ci-bot[bot]'] }, { testers: ['app/ci'] }, { testers: ['-x'] },
  ...['in-progress', 'ci-monitoring', 'needs-qa', 'skip-qa', 'merge-queue', 'qa', 'qa-self-verified',
    'automerge-signal-1-cr', 'automerge-signal-2-qa', 'automerge-signal-3-passes-local-ci-checks', 'risk-high', 'priority-high'].flatMap(label => [{ inProgressLabel: label }, { blockerLabel: label }, { bugLabels: ['bug', label] }])]) {
  assert.notEqual(load({ qaBatch }).status, 0, 'must reject qaBatch ' + JSON.stringify(qaBatch))
}
const qaBatchConfig = { qaGateLabel: 'needs-human-qa', humanQaPolicy: { batchCheckLabel: 'qa-batch-check' } }
for (const qaBatch of [{ inProgressLabel: 'needs-human-qa' }, { blockerLabel: 'qa-batch-check' }, { bugLabels: ['qa-approved'] }]) {
  assert.notEqual(load({ ...qaBatchConfig, qaBatch }).status, 0, 'must reject colliding qaBatch ' + JSON.stringify(qaBatch))
}
assert.equal(load(qaBatchConfig).status, 0)
console.log('PASS: qaBatch loader defaults, custom values and malformed inputs')

const skill = read('skills/om-qa-batch/SKILL.md')
const writes = read('skills/om-qa-batch/references/tracker-writes.md')
assert.match(skill, /Never merge, tag, push, refresh or close the batch/)
assert.match(skill, /Automation never gives a verdict/)
assert.match(writes, /`stable` is refused while \*\*search-issues\*\* finds an open issue/)
assert.match(writes, /`qaBatch\.blockerLabel`, whichever batch it names/)
assert.match(writes, /`stable`\s+is also refused when the batch head differs from the tested head/)
assert.match(writes, /`QA head: <tested head sha>`/)
assert.match(writes, /\*\*unlabel-pr\*\* `qa-approved`/)
assert.match(writes, /A verdict run skips steps 1-5/)
assert.match(writes, /recorded on the batch PR, never in a local file/)
assert.match(writes, /`stable` is refused when the tested head is unknown/)
assert.match(skill, /Skips steps 1-5/)
assert.match(read('skills/om-qa-batch/references/report-templates.md'), /^Tested head: /m)
const trust = read('skills/om-qa-batch/references/trusted-comments.md')
const window = read('skills/om-qa-batch/references/batch-window.md')
assert.match(trust, /`qaBatch\.testers`[^.]*or \*\*current-user\*\*/)
assert.match(trust, /Assignment, PR authorship and\s+repository role prove nothing/)
assert.match(trust, /\*\*Untrusted marker comments\*\* are ignored, never parsed/)
assert.match(trust, /\^\[0-9a-f\]\{40\}\$/)
assert.match(trust, /\*\*Residual risk\.\*\*/)
// Every reader of checklist or verdict comments points at the one rule and does not restate it.
for (const [name, text] of [['tracker-writes', writes], ['batch-window', window], ['SKILL', skill]]) {
  assert.match(text, /references\/trusted-comments\.md/, name + ' must point to the shared trust rule')
  assert.doesNotMatch(text, /Assignment proves nothing|\*\*Residual risk/, name + ' must not restate the trust rule')
}
// Range start follows the release-process spec: previous green tag first, then the trusted QA head.
assert.match(window, /1\. \*\*The previous green tag\*\*/)
assert.match(window, /Skip a tag that points at `TO` or at\s+any of the batch PR's own commits/)
assert.match(window, /take the newest dated before the current batch PR's\s+`createdAt`/)
assert.match(window, /%\(objecttype\) %\(taggerdate:iso-strict\)/)
assert.match(window, /annotated tag \(`objecttype` `tag`\) is dated by its\s+`taggerdate`/)
assert.match(window, /report names it\s+lightweight/)
assert.match(window, /`FROM` =\s+`git merge-base <tag> <QA head>`, which can only over-include/)
assert.doesNotMatch(window, /use the tag and report the difference/)
assert.match(window, /2\. \*\*The previous batch's tested head\*\*[\s\S]*?`QA head:` of the newest trusted verdict[\s\S]*?`references\/trusted-comments\.md`/)
assert.match(window, /skip any\s+closed without merging/)
assert.match(window, /Never start from the previous batch PR's head \(`headRefOid`\)/)
assert.match(window, /It\s+need not be an ancestor of `TO`/)
assert.doesNotMatch(window, /is an\s+ancestor of `TO`\s+\(`git merge-base --is-ancestor`\)/)
// Enumeration walks every commit, so PRs that arrive through a base merge are never dropped.
assert.doesNotMatch(window, /--first-parent/)
assert.doesNotMatch(writes, /--first-parent/)
assert.match(window, /git log --format='%H%x09%P%x09%s' "\$FROM\.\.\$TO"/)
assert.match(window, /A merge commit with no PR of its own/)
assert.doesNotMatch(skill, /every first-parent commit/)
// 2: stale approval uses the trusted verdict only.
assert.match(writes, /`QA head:` of the trusted verdict, or no trusted verdict exists/)
assert.doesNotMatch(writes, /latest verdict comment/)
// 3: the stabilizer never certifies their own batch.
assert.match(writes, /Refuse `stable` when \*\*current-user\*\* stabilized the batch/)
assert.match(writes, /`Stabilizer:` set to the `--stabilizer`\s+login or, without it, the batch PR author/)
assert.match(writes, /`--start` never changes a\s+recorded `Stabilizer:`/)
assert.match(writes, /the `Stabilizer:` login of the checklist comment \(read under\s+`references\/trusted-comments\.md`\)/)
assert.match(writes, /the author or the merger of any stabilization PR \(\*\*list-prs\*\* state\s+merged, base = batch branch/)
assert.match(writes, /the author of any commit on the batch branch/)
assert.match(writes, /teams with more\s+than one tester set `qaBatch\.testers`/)
assert.match(trust, /`Stabilizer:`\) must match/)
assert.match(read('skills/om-qa-batch/references/report-templates.md'), /^Stabilizer: /m)
assert.match(writes, /whatever `qaBatch\.testers` contains/)
// 4: a checklist comment without a Tested head line.
assert.match(writes, /It exists without a `Tested head:` line → treat\s+it as no tested head recorded/)
assert.match(writes, /Each batch has exactly one: the earliest/)
assert.match(writes, /`--start`\s+never moves it/)
assert.match(writes, /`RETEST_FROM` = the `Tested head:` of the checklist comment/)
assert.doesNotMatch(writes, /on the head they tested/)
assert.match(writes, /Refuse when \*\*current-user\*\* is a bot or automation identity/)
assert.match(writes, /stop and name who holds\s+it/)
console.log('PASS: batch skill keeps verdicts human, read-only by default, and refuses stable with open blockers')

// The write workflow must preserve the collection's claim and reporting contract.
const claim = read('skills/om-qa-batch/references/claim-pr.md')
assert.equal(claim, read('skills/om-auto-create-pr/references/claim-pr.md'), 'batch installs its own unchanged canonical claim protocol')
const rules = read('skills/om-qa-batch/references/rules.md')
assert.ok(rules.startsWith(read('skills/om-auto-create-pr/references/rules.md')), 'shared rules remain canonical before batch specifics')
assert.doesNotMatch(rules, /No claim protocol|No label rationale comment/)
assert.match(writes, /Before \*\*any\*\* mutation, including stale-approval withdrawal/)
assert.match(writes, /A refused action makes no changes/)
assert.match(writes, /action-scoped PR claim under\s+`references\/claim-pr\.md`/)
assert.match(writes, /release the exact lock SHA last, on success and failure/)
assert.match(writes, /Keep the\s+persistent `qaBatch\.inProgressLabel`/)
assert.match(read('skills/om-qa-batch/references/report-templates.md'), /🤖 `om-qa-batch` — 🏷️ label rationale/)
assert.match(read('skills/om-qa-batch/references/checklist.md'), /qaApproval/)
assert.match(window, /qualifying QA grant/)
assert.match(read('skills/om-setup-agent-pipeline/SKILL.md'), /"qaBatch": \{\}/)
const configCommands = JSON.parse(read('.ai/agentic.config.json')).validation.commands
for (const command of configCommands) assert.ok(read('SDLC.md').includes('`' + command + '`'), 'SDLC must document ' + command)
console.log('PASS: batch writes keep atomic ownership, refusal before mutation, persistent tester freeze and head-bound evidence')

// Execute the actual freeze preflight: a successful guard that skipped a label
// can no longer reach the checklist/frozen announcement.
const freezePreflight = writes.match(/```bash\n([\s\S]*?)```/)[1]
for (const [available, status] of [['yes', 0], ['no', 1]]) {
  const result = spawnSync('bash', ['-c', `label_exists() { [ "$LABEL_AVAILABLE" = yes ] && [ "$1" = qa-in-progress ]; }\n${freezePreflight}\nprintf 'preflight-passed'`], {
    encoding: 'utf8', timeout: 5000,
    env: { ...process.env, QA_BATCH: JSON.stringify({ inProgressLabel: 'qa-in-progress' }), LABEL_AVAILABLE: available }
  })
  assert.equal(result.status, status, result.stderr)
  assert.equal(result.stdout.includes('preflight-passed'), available === 'yes')
}
assert.match(writes, /require that exact label and the tester\s+assignment in the read-back/)
assert.match(writes, /stop before publishing a checklist or announcing a freeze/)
assert.match(writes, /undo only this invocation.s new assignment\/freeze mutations/)
assert.match(window, /complete result set before\s+filtering/)
assert.match(window, /double it until the\s+returned count is below/)
assert.match(window, /unverifiable completeness is a discovery blocker/)
assert.doesNotMatch(window, /state open, limit 20/)
console.log('PASS: missing freeze labels abort before success; discovery and freeze read-back require complete evidence')

// Run the published Git snippets against real merge history rather than only
// asserting their wording. A pre-start stabilization fix and a later base PR
// must both appear, including through the merge's second parent.
const historyDir = mkdtempSync(join(tmpdir(), 'qa-batch-history-'))
try {
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: historyDir, encoding: 'utf8', timeout: 5000 })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  }
  git('init', '-q')
  git('config', 'user.name', 'Batch QA fixture')
  git('config', 'user.email', 'qa-fixture@example.invalid')
  git('checkout', '-b', 'fixture-base')
  git('commit', '--allow-empty', '-m', 'previous tested build')
  const from = git('rev-parse', 'HEAD')
  git('tag', 'green/previous')
  git('commit', '--allow-empty', '-m', 'feat: account view (#501)')
  git('checkout', '-b', 'fixture-batch')
  git('commit', '--allow-empty', '-m', 'fix: stabilization before start (#502)')
  git('checkout', 'fixture-base')
  git('commit', '--allow-empty', '-m', 'feat: checkout from newer base (#503)')
  git('checkout', 'fixture-batch')
  git('merge', '--no-edit', 'fixture-base')
  const to = git('rev-parse', 'HEAD')
  git('tag', 'green/current', to)
  git('tag', '-a', 'green/annotated', from, '-m', 'annotated previous build')
  const logSnippet = window.match(/```bash\n([^`]+)```/)[1]
  const log = spawnSync('bash', ['-c', logSnippet], {
    cwd: historyDir, encoding: 'utf8', timeout: 5000,
    env: { ...process.env, FROM: from, TO: to }
  })
  assert.equal(log.status, 0, log.stderr)
  assert.deepEqual([...log.stdout.matchAll(/\(#(\d+)\)/g)].map(match => Number(match[1])).sort(), [501, 502, 503])
  const tagSnippet = window.match(/`(git for-each-ref [^`]+)`/)[1]
  const tags = spawnSync('bash', ['-c', tagSnippet], {
    cwd: historyDir, encoding: 'utf8', timeout: 5000,
    env: { ...process.env, GREEN_PREFIX: 'green/' }
  })
  assert.equal(tags.status, 0, tags.stderr)
  assert.match(tags.stdout, /green\/current commit /)
  assert.match(tags.stdout, /green\/annotated tag /)
  assert.equal(git('rev-parse', 'green/current^{commit}'), to)
  assert.equal(git('rev-parse', 'green/previous^{commit}'), from)
} finally {
  rmSync(historyDir, { recursive: true, force: true })
}
console.log('PASS: published history snippets retain pre-start fixes and second-parent PRs and distinguish current/annotated tags')
