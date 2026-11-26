#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
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
  { ciScopeFile: 'ci/../../x.json' }, { ciScopeFile: 'ci scope.json' }, { ciScopeFile: 5 },
  { areaLabelPrefix: '' }, { areaLabelPrefix: null }, { areaLabelPrefix: 'ci area:' },
  { acceptanceLabel: '' }, { acceptanceLabel: false },
  { acceptanceLabel: 'qa-approved' }, { acceptanceLabel: 'qa-failed' }, { acceptanceLabel: 'merge-queue' }
]) rejected({ prTriage })
console.log('PASS: invalid prTriage values stop the run')

const triage = read('skills/om-triage-pr/SKILL.md')
const triageTemplates = read('skills/om-triage-pr/references/report-templates.md')
const review = read('skills/om-review-pr/SKILL.md')
const merge = read('skills/om-review-pr/references/merge-ready.md')
assert.match(triage, /om-auto-review-pr\/references\/qa-triage\.md/, 'triage must use the shared QA lane rules')
assert.match(triageTemplates, /<!-- qa-triage v1/, 'the triage comment must carry the qa-triage block')
assert.match(triageTemplates, /\nCI-Triage-Head: <full head sha>\n````/, 'CI-Triage-Head must be the last line of the triage comment')
assert.match(triage, /never\s+lowers one/, 'triage must state the raise-only rule')
assert.match(triage, /Never remove the human QA\s+label/, 'triage must never remove the human QA label')
assert.match(review, /CI-Triage-Head:/, 'review must look for current-head triage')
assert.doesNotMatch(review, /merge-pr/, 'review never merges')
for (const gate of ['qa-failed', 'changes-requested', 'blocked', 'do-not-merge', 'the human QA label without `qa-approved`', 'acceptanceLabel']) {
  assert.ok(merge.includes(gate), `merge gates must include ${gate}`)
}
console.log('PASS: triage and review keep the routing, raise-only and merge-gate contracts')

const capabilities = read('skills/om-setup-agent-pipeline/references/config-capabilities.md')
assert.match(capabilities, /\| `prTriage` \|/, 'config-capabilities must document prTriage')
const roster = read('skills/om-setup-agent-pipeline/references/skill-coverage.md')
for (const name of ['om-triage-pr', 'om-review-pr']) assert.ok(roster.includes(` ${name} `), `roster must list ${name}`)
console.log('PASS: prTriage is documented and both skills are on the roster')
