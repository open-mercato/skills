#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const listMd = dir =>
  readdirSync(new URL('../' + dir, import.meta.url), { withFileTypes: true }).flatMap(entry => {
    const p = `${dir}/${entry.name}`
    if (entry.isDirectory()) return listMd(p)
    return entry.name.endsWith('.md') ? [p] : []
  })

const loaderOf = path => {
  const match = read(path).match(/PR_TRIAGE=\$\(jq -ce '([^']+)' "\$CONFIG"\)   # PR triage policy/)
  assert.ok(match, `${path} must load prTriage with the shared loader`)
  return match[1]
}

const triageSetup = 'skills/om-triage-pr/references/agentic-setup.md'
const reviewSetup = 'skills/om-review-pr/references/agentic-setup.md'
const filter = loaderOf(triageSetup)
assert.equal(loaderOf(reviewSetup), filter, 'om-triage-pr and om-review-pr must load prTriage identically')

const load = value => spawnSync('jq', ['-ce', filter], { input: JSON.stringify(value), encoding: 'utf8', timeout: 5000 })
const ok = value => { const result = load(value); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout) }
const rejected = value => assert.notEqual(load(value).status, 0, `must reject ${JSON.stringify(value)}`)

const defaults = ok({})
assert.deepEqual(defaults, { ciScopeFile: null, areaLabelPrefix: 'ci-area:', acceptanceLabel: null })
assert.deepEqual(ok({ prTriage: {} }), defaults)
assert.deepEqual(
  ok({ prTriage: { ciScopeFile: '.github/ci-scope.json', areaLabelPrefix: 'ci-area:', acceptanceLabel: 'needs-triage' } }),
  { ciScopeFile: '.github/ci-scope.json', areaLabelPrefix: 'ci-area:', acceptanceLabel: 'needs-triage' }
)
assert.deepEqual(ok({ prTriage: { ciScopeFile: null } }), defaults)
console.log('PASS: prTriage defaults and a full configuration load')

for (const prTriage of [
  [], 'x', null,
  { ciScopeFile: '' }, { ciScopeFile: '/etc/ci.json' }, { ciScopeFile: '../ci.json' },
  { ciScopeFile: 'ci/../../x.json' }, { ciScopeFile: 'ci scope.json' }, { ciScopeFile: '.github/ci.json\n' }, { ciScopeFile: 5 },
  { areaLabelPrefix: '' }, { areaLabelPrefix: null }, { areaLabelPrefix: 'ci area:' }, { areaLabelPrefix: 'ci-area:\nfoo' },
  { acceptanceLabel: '' }, { acceptanceLabel: false },
  { acceptanceLabel: 'needs triage' }, { acceptanceLabel: 'needs\ntriage' }, { acceptanceLabel: 'needs;triage' },
  { acceptanceLabel: 'qa-approved' }, { acceptanceLabel: 'qa-failed' }, { acceptanceLabel: 'merge-queue' },
  { acceptanceLabel: 'review' }, { acceptanceLabel: 'changes-requested' }, { acceptanceLabel: 'blocked' },
  { acceptanceLabel: 'do-not-merge' }, { acceptanceLabel: 'in-progress' },
  { acceptanceLabel: 'needs-qa' }, { acceptanceLabel: 'skip-qa' }
]) rejected({ prTriage })
console.log('PASS: invalid prTriage values stop the run')

const triage = read('skills/om-triage-pr/SKILL.md')
const triageTemplates = read('skills/om-triage-pr/references/report-templates.md')
const triageCiLevel = read('skills/om-triage-pr/references/ci-level.md')
const triageAcceptance = read('skills/om-triage-pr/references/acceptance.md')
const review = read('skills/om-review-pr/SKILL.md')
const reviewTemplates = read('skills/om-review-pr/references/report-templates.md')
const reviewProcedure = read('skills/om-review-pr/references/review-procedure.md')
const reviewCiLevel = read('skills/om-review-pr/references/ci-level.md')
const merge = read('skills/om-review-pr/references/merge-ready.md')

// Self-contained standalone installs: no cross-skill references/ pointers
for (const file of [...listMd('skills/om-triage-pr'), ...listMd('skills/om-review-pr')]) {
  assert.doesNotMatch(read(file), /om-[a-z-]+\/references\//, `${file} must not point into another skill's references/`)
}
assert.match(triage, /references\/qa-triage\.md/, 'triage must use its local QA lane rules')
assert.match(reviewProcedure, /references\/review-checklist\.md/, 'review-procedure must use its local review checklist')

// Triage contracts: fail-closed CI-Triage-Head, raise-only, allowed removals, no commit status
assert.match(triageTemplates, /<!-- qa-triage v1/, 'the triage comment must carry the qa-triage block')
assert.match(triageTemplates, /\nCI-Triage-Head: <full head sha>\n````/, 'CI-Triage-Head must be the last line of the triage comment')
assert.match(triage, /omit\s+`CI-Triage-Head:`/, 'triage must fail closed and omit CI-Triage-Head when incomplete')
assert.match(triage, /LABELS_ENABLED=true/, 'triage must require LABELS_ENABLED=true before emitting CI-Triage-Head')
assert.match(triage, /apply_label/, 'triage must check apply_label skips before emitting CI-Triage-Head')
assert.match(triage, /never\s+lowers one/, 'triage must state the raise-only rule')
assert.match(triage, /Never remove the human QA\s+label/, 'triage must never remove the human QA label')
assert.match(triage, /approvedDesign\.label/, 'triage Rules must include approvedDesign.label in allowed removals')
assert.doesNotMatch(triage, /lower CI level label when\s+it raises the CI level/, 'triage Rules must not remove lower CI level labels')
assert.match(triage, /leave any lower\s+level label in place/, 'triage Rules must leave lower CI level labels in place on raise')
assert.match(triage, /never posts a\s+commit status \(such as `ci-triage`\)/, 'triage must never post a ci-triage commit status')

// Skip daily batch PRs (same-repo only) and release-line backport PRs in both skills
for (const [name, content] of [['om-triage-pr', triage], ['om-review-pr', review]]) {
  assert.match(content, /qaBatch\.branchPrefix/, `${name} must skip daily batch PRs matching qaBatch.branchPrefix`)
  assert.match(content, /head repository\s+equals base repository/, `${name} must restrict batch PR skip to same-repository PRs`)
  assert.match(content, /BASE_BRANCH/, `${name} must skip PRs whose base branch is not BASE_BRANCH`)
  assert.match(content, /backport\.yml/, `${name} must skip release-line backport PRs`)
}

// ci-level.md contracts: base-branch-only reads, fail-closed, implies same-run labels, raise-only (leave lower level in place)
for (const [name, content] of [['om-triage-pr', triageCiLevel], ['om-review-pr', reviewCiLevel]]) {
  assert.match(content, /origin\/\$PR_BASE:\$CI_SCOPE_FILE/, `${name} ci-level.md must read ciScopeFile from origin/$PR_BASE`)
  assert.match(content, /never from the PR head/, `${name} ci-level.md must forbid reading ciScopeFile from the PR head`)
  assert.match(content, /omit\s+`CI-Triage-Head:`/, `${name} ci-level.md must fail closed on invalid/missing scope file`)
  assert.match(content, /added earlier\s+in the same run.*risk-high.*ci-area:\*/s, `${name} ci-level.md must count implies labels added earlier in the same run (risk-high, ci-area:*)`)
  assert.match(content, /leave any lower level label in place/, `${name} ci-level.md must leave lower level labels in place on raise`)
  assert.doesNotMatch(content, /two level labels at once/, `${name} ci-level.md must not report two level labels as a typo`)
}

// acceptance.md contracts: outside-contribution acceptance and automerge limits
assert.match(triageAcceptance, /never adds the acceptance decision, the automerge label or an\s+approval/, 'acceptance.md must forbid adding acceptance, automerge, or approval')
assert.match(triageAcceptance, /automation is never the only path\s+to merge/, 'acceptance.md must require maintainer decision for outside contributions')

// review-procedure.md contracts: follows om-code-review without local validation.commands
assert.match(reviewProcedure, /om-code-review/, 'review-procedure.md must follow om-code-review')
assert.match(reviewProcedure, /does not run `validation\.commands` locally/, 'review-procedure.md must not run local validation commands')
assert.match(reviewProcedure, /origin\/\$PR_BASE/, 'review-procedure.md must read repo checklists from base branch')

// Trusted-author checks on CI-Triage-Head and CURRENT_USER-only update-comment marker lookups
assert.match(review, /CI-Triage-Head:/, 'review must look for current-head triage')
assert.match(review, /trustedTriageAuthors/, 'review must verify trusted author on CI-Triage-Head')
assert.match(triageTemplates, /comment by a trusted identity/, 'triage report-templates must document trusted-author check on CI-Triage-Head')
assert.match(triageTemplates, /author being `CURRENT_USER`/, 'triage update-comment lookup must match only CURRENT_USER')
assert.match(triageTemplates, /HTTP 403/, 'triage report-templates must post with comment-pr instead of editing another trusted login')
assert.match(reviewTemplates, /author being\s+`CURRENT_USER`/, 'review update-comment lookup must match only CURRENT_USER')

// Merge-queue gates: re-read labels and withhold merge-queue after raising CI/QA labels, action_required non-green
assert.match(review, /re-read the\s+PR's labels/, 'review must re-read labels after raising routing labels')
assert.match(merge, /no CI or QA routing label was\s+raised in this run/, 'merge-ready must withhold merge-queue in the same run after raising CI/QA labels')
assert.match(merge, /action_required/, 'merge-ready must treat action_required fork runs as non-green')
assert.match(merge, /Current-head trusted triage/, 'merge-ready must require current-head trusted triage')
assert.match(merge, /never\s+count `om-review-pr`'s own approval toward `merge-queue`/, 'merge-ready must not count om-review-pr own approval for external authors')
assert.match(merge, /Never count an `accepted` label added by\s+a bot or this skill's account toward `merge-queue`/, 'merge-ready must require human accepted label for external authors')
assert.match(merge, /verified from the label's\s+timeline event; fail closed when unverifiable/, 'merge-ready must verify accepted label via timeline events and fail closed when unverifiable')
assert.match(merge, /write`,\s+`maintain`\s+or `admin` permission/, 'merge-ready must check write/maintain/admin permission for external authors')
assert.match(review, /never count this\s+skill's own approval or an `accepted` label added by a bot or this skill's\s+account/, 'review Rules must forbid counting own approval or bot accepted label for external PRs')
for (const gate of ['qa-failed', 'changes-requested', 'blocked', 'do-not-merge', 'the human QA label without `qa-approved`', 'acceptanceLabel']) {
  assert.ok(merge.includes(gate), `merge gates must include ${gate}`)
}

// Neither skill ever invokes merge-pr
for (const file of [...listMd('skills/om-triage-pr'), ...listMd('skills/om-review-pr')]) {
  assert.doesNotMatch(read(file), /merge-pr/, `${file} must not reference merge-pr`)
}
console.log('PASS: triage and review keep the routing, raise-only, self-contained and merge-gate contracts')

const capabilities = read('skills/om-setup-agent-pipeline/references/config-capabilities.md')
assert.match(capabilities, /\| `prTriage` \|/, 'config-capabilities must document prTriage')
const roster = read('skills/om-setup-agent-pipeline/references/skill-coverage.md')
for (const name of ['om-triage-pr', 'om-review-pr']) assert.ok(roster.includes(` ${name} `), `roster must list ${name}`)
console.log('PASS: prTriage is documented and both skills are on the roster')
