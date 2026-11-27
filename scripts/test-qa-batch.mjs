#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

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
    pr(2, { labels: ['needs-human-qa', 'qa-approved'] }),
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

const collapsed = good({ config: { ...config, qaGateLabel: 'needs-qa' }, prs: [pr(1, { labels: ['needs-human-qa'] })] })
assert.equal(collapsed.gateLabel, null)
assert.deepEqual(collapsed.buckets.gateMissed, [])
for (const bad of [
  { config: { ...config, humanQaPolicy: { batchPaths: [1] } }, prs: [] },
  { config: { ...config, humanQaPolicy: { uiFileThreshold: -1 } }, prs: [] },
  { config: { ...config, qaBatch: [] }, prs: [] },
  { config, prs: [{ number: 'x' }] },
  { config: { qaGateLabel: 'needs-human-qa' }, prs: [] },
  ...['qa-approved', 'qa-failed', 'needs-qa', 'skip-qa', 'needs-human-qa', 'qa-human-ok'].map(label =>
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
for (const qaBatch of [[], 'x', { branchPrefix: 'no-slash' }, { branchPrefix: '../x/' }, { bugLabels: [] }, { bugLabels: [''] }, { smoke: '' }, { blockerLabel: 'qa-approved' }, { inProgressLabel: 'qa-failed' },
  { testers: 'qa-anna' }, { testers: [''] }, { testers: [1] }, { testers: ['ci-bot[bot]'] }, { testers: ['app/ci'] }, { testers: ['-x'] },
  ...['in-progress', 'ci-monitoring', 'needs-qa', 'skip-qa'].flatMap(label => [{ inProgressLabel: label }, { blockerLabel: label }, { bugLabels: ['bug', label] }])]) {
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
// 1: FROM comes from tracker metadata of the merged batch, never from verdict comment text.
// Range start follows the release-process spec: previous green tag first, then the trusted QA head.
assert.match(window, /1\. \*\*The previous green tag\*\*/)
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
