#!/usr/bin/env node
// Unit test for the skill-optimizer trace parser and skill-body guard.
// No network: it feeds a recorded stream-json fixture through parseTranscript
// and asserts per-step timing / tool / token attribution and run totals.

import { readFileSync, rmSync, existsSync, mkdtempSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseTranscript, checkSkillBody, validateMockSpec, resolveMockSpec, generateMockRepo,
  resolveModels, finalizeQuality, buildComparisonTable,
} from './skill-optimizer.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
let failures = 0
function eq(actual, expected, label) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) { console.error(`FAIL ${label}: expected ${e}, got ${a}`); failures++ }
  else console.log(`ok   ${label}`)
}
function truthy(v, label) { eq(Boolean(v), true, label) }

// --- trace parser -----------------------------------------------------------
const lines = readFileSync(path.join(here, 'fixtures', 'skill-optimizer-trace.jsonl'), 'utf8').split('\n')
const m = parseTranscript(lines)

eq(m.stepCount, 2, 'stepCount')
eq(m.toolCallsTotal, 3, 'toolCallsTotal')

eq(m.steps[0].n, 1, 'step1.n')
eq(m.steps[0].title, 'Locate the bug', 'step1.title')
eq(m.steps[0].outcome, 'found in foo.js', 'step1.outcome')
eq(m.steps[0].wallMs, 5000, 'step1.wallMs')          // begin 00s -> end 05s
eq(m.steps[0].toolCalls, 1, 'step1.toolCalls')       // one Read
eq(m.steps[0].approxTokens, 25, 'step1.approxTokens') // 20 (Read evt) + 5 (end evt)

eq(m.steps[1].wallMs, 6000, 'step2.wallMs')          // begin 06s -> end 12s
eq(m.steps[1].toolCalls, 2, 'step2.toolCalls')       // Edit + Bash
eq(m.steps[1].approxTokens, 70, 'step2.approxTokens') // 30 (tools evt) + 40 (end evt)

eq(m.totals.tokensIn, 5300, 'totals.tokensIn')       // 100 + 5000 cache_read + 200 cache_create
eq(m.totals.tokensOut, 88, 'totals.tokensOut')
eq(m.totals.costUsd, 0.05, 'totals.costUsd')
eq(m.totals.wallMs, 12000, 'totals.wallMs')
eq(m.isError, false, 'isError')

eq(Array.isArray(m.skillTrace.redundantWork), true, 'skillTrace.redundantWork parsed')
eq(m.skillTrace.ambiguities.length, 1, 'skillTrace.ambiguities count')

// --- skill-body guard -------------------------------------------------------
const good = `---\nname: om-demo\ndescription: A demo skill.\n---\n\nBody here.\n`
eq(checkSkillBody(good).ok, true, 'guard accepts valid skill')
eq(checkSkillBody(good).name, 'om-demo', 'guard reads name')

const noName = `---\ndescription: no name.\n---\nBody`
eq(checkSkillBody(noName).ok, false, 'guard rejects missing name')

const bigBody = `---\nname: om-demo\ndescription: big.\n---\n` + 'x'.repeat(20001)
eq(checkSkillBody(bigBody).ok, false, 'guard rejects oversized body')

// --- batched-markers parser fallback ----------------------------------------
const batched = parseTranscript(readFileSync(path.join(here, 'fixtures', 'skill-optimizer-batched.jsonl'), 'utf8').split('\n'))
eq(batched.stepCount, 2, 'batched stepCount')
eq(batched.markersBatched, true, 'batched flag set')
eq(batched.toolCallsTotal, 4, 'batched global tool total')
eq(batched.steps[0].toolCalls, 2, 'batched step1 tools redistributed')
eq(batched.steps[1].toolCalls, 2, 'batched step2 tools redistributed')
eq(batched.steps[0].approxTokens + batched.steps[1].approxTokens, 80, 'batched tokens redistributed to output total')
eq(batched.steps[0].wallMs, null, 'batched wall unknown')
// The non-batched fixture must NOT trip the fallback.
eq(m.markersBatched, false, 'clean fixture not flagged batched')

// --- model resolution -------------------------------------------------------
eq(resolveModels({}).runModel, 'sonnet', 'run-model defaults to sonnet')
eq(resolveModels({}).analysisModel, null, 'analysis-model defaults to CLI default (null)')
eq(resolveModels({}).baselineModel, null, 'baseline off by default')
eq(resolveModels({ runModel: 'haiku' }).runModel, 'haiku', 'run-model honored')
eq(resolveModels({ model: 'opus' }).runModel, 'opus', 'shorthand sets run-model')
eq(resolveModels({ model: 'opus' }).analysisModel, 'opus', 'shorthand sets analysis-model')
eq(resolveModels({ baselineGiven: true }).baselineModel, 'opus', 'baseline bare defaults to opus')
eq(resolveModels({ baselineGiven: true, baseline: 'sonnet' }).baselineModel, 'sonnet', 'baseline value honored')
eq(resolveModels({ compareModels: ['haiku', 'opus'] }).compareModels, ['haiku', 'opus'], 'compare-models passed through')
let threw = false
try { resolveModels({ model: 'opus', runModel: 'haiku' }) } catch { threw = true }
eq(threw, true, 'model + run-model conflict throws')

// --- quality finalization ---------------------------------------------------
const qWithManifest = finalizeQuality({
  findings: { caught: ['a', 'b', 'c'], missed: ['d', 'e'], hallucinated: ['x'] },
  stepCompletion: { expected: 5, completed: 5, skipped: [], outOfOrder: false },
  ruleViolations: [],
  summary: 'ok',
}, { hasManifest: true })
eq(qWithManifest.recall, 0.6, 'quality recall 3/5')
eq(qWithManifest.precision, 0.75, 'quality precision 3/4')
eq(qWithManifest.score, 65, 'quality composite score (0.7*recall+0.3*precision)')

const qPenalties = finalizeQuality({
  findings: { caught: [], missed: [], hallucinated: [] },
  stepCompletion: { skipped: ['step 3'], outOfOrder: false },
  ruleViolations: ['would have committed'],
  outcome: { verdict: 'degraded', specifics: ['dropped the tests'] },
}, { hasManifest: false })
eq(qPenalties.recall, null, 'no-manifest recall is null')
eq(qPenalties.score, 60, 'penalties: 100 -10 rule -5 skip -25 degraded')

const qImproved = finalizeQuality({ findings: {}, stepCompletion: {}, ruleViolations: [], outcome: { verdict: 'improved' } }, { hasManifest: false })
eq(qImproved.score, 100, 'improved outcome caps at 100')
eq(qPenalties.outcome.verdict, 'degraded', 'outcome verdict preserved')

// --- comparison table assembly ----------------------------------------------
const cmp = buildComparisonTable([
  { model: 'haiku', metrics: { stepCount: 6, toolCallsTotal: 12, totals: { tokensIn: 40000, tokensOut: 3000, costUsd: 0.03, wallMs: 45000 } }, quality: { score: 70, recall: 0.6 } },
  { model: 'opus', metrics: { stepCount: 8, toolCallsTotal: 17, totals: { tokensIn: 90000, tokensOut: 6000, costUsd: 0.2, wallMs: 90000 } }, quality: { score: 100, recall: 1 } },
])
truthy(cmp.includes('| `haiku` |'), 'comparison table has haiku row')
truthy(cmp.includes('| `opus` |'), 'comparison table has opus row')
truthy(cmp.includes('70/100'), 'comparison table shows quality score')
truthy(cmp.includes('60%'), 'comparison table shows recall percent')
eq(cmp.split('\n').length, 4, 'comparison table = header + separator + 2 rows')

// --- mock-spec validation ---------------------------------------------------
eq(validateMockSpec({ branches: [{ name: 'feat/x' }] }), null, 'validate accepts minimal spec')
eq(validateMockSpec({ files: { 'a.js': 'x' }, branches: [{ name: 'feat/x', files: { 'b.js': 'y' }, plantedFindings: ['f'] }] }), null, 'validate accepts full spec')
truthy(validateMockSpec(null), 'validate rejects null')
truthy(validateMockSpec({}), 'validate rejects missing branches')
truthy(validateMockSpec({ branches: [] }), 'validate rejects empty branches')
truthy(validateMockSpec({ branches: [{ name: '' }] }), 'validate rejects blank branch name')
truthy(validateMockSpec({ branches: [{ name: 'has space' }] }), 'validate rejects whitespace in name')
truthy(validateMockSpec({ branches: [{ name: 'a' }, { name: 'a' }] }), 'validate rejects duplicate branch')
truthy(validateMockSpec({ files: { k: 5 }, branches: [{ name: 'a' }] }), 'validate rejects non-string file content')
truthy(validateMockSpec({ branches: [{ name: 'a', plantedFindings: [1] }] }), 'validate rejects non-string finding')
eq(validateMockSpec({ goal: 'do a thing', outcomeProperties: ['x'], branches: [{ name: 'task/x' }] }), null, 'validate accepts goal + outcomeProperties')
truthy(validateMockSpec({ goal: 5, branches: [{ name: 'a' }] }), 'validate rejects non-string goal')
truthy(validateMockSpec({ outcomeProperties: 'x', branches: [{ name: 'a' }] }), 'validate rejects non-array outcomeProperties')

// --- implement scenario resolves with goal + outcome properties -------------
const implSpec = resolveMockSpec({ mock: 'implement' })
eq(implSpec.scenario, 'implement', 'implement scenario name')
truthy(implSpec.goal && implSpec.goal.length > 0, 'implement scenario has a goal')
eq(implSpec.outcomeProperties.length, 5, 'implement scenario outcome properties')
truthy('src/coupons.js' in implSpec.files, 'implement ships coupons on base')
eq(implSpec.branches[0].name, 'task/harden-coupons', 'implement task branch')

// --- mock generator produces a real git repo with a green npm test ----------
const work = mkdtempSync(path.join(tmpdir(), 'skopt-test-'))
try {
  const spec = resolveMockSpec({ mock: 'review' })
  const repo = path.join(work, 'mock')
  const manifest = generateMockRepo(repo, spec)

  eq(manifest.scenario, 'review', 'mock manifest scenario')
  eq(manifest.branches.length, 1, 'mock has one branch')
  eq(manifest.branches[0].name, 'feat/coupon-stacking', 'mock branch name')
  eq(manifest.branches[0].plantedFindings.length, 5, 'mock planted findings count')
  truthy(existsSync(path.join(repo, 'src', 'coupons.js')), 'mock planted file present')

  const branches = spawnSync('git', ['-C', repo, 'branch', '--format=%(refname:short)'], { encoding: 'utf8' }).stdout.split('\n').map((s) => s.trim()).filter(Boolean).sort()
  eq(branches, ['feat/coupon-stacking', 'main'], 'mock git branches')
  const head = spawnSync('git', ['-C', repo, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).stdout.trim()
  eq(head, 'feat/coupon-stacking', 'mock checked out on scenario branch')

  // Manifest exists but is invisible to git (info/exclude).
  truthy(existsSync(path.join(repo, '.mock-manifest.json')), 'mock manifest written')
  const porcelain = spawnSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' }).stdout.trim()
  eq(porcelain, '', 'mock working tree clean (manifest ignored)')

  // npm test is fast and green on the base branch.
  spawnSync('git', ['-C', repo, 'checkout', '-q', 'main'], { encoding: 'utf8' })
  const test = spawnSync('npm', ['test'], { cwd: repo, encoding: 'utf8' })
  eq(test.status, 0, 'mock npm test passes')
} finally {
  rmSync(work, { recursive: true, force: true })
}

if (failures) { console.error(`\n${failures} assertion(s) failed`); process.exit(1) }
console.log('\nAll skill-optimizer tests passed.')
