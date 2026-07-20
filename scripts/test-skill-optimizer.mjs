#!/usr/bin/env node
// Unit test for the skill-optimizer trace parser and skill-body guard.
// No network: it feeds a recorded stream-json fixture through parseTranscript
// and asserts per-step timing / tool / token attribution and run totals.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseTranscript, checkSkillBody } from './skill-optimizer.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
let failures = 0
function eq(actual, expected, label) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) { console.error(`FAIL ${label}: expected ${e}, got ${a}`); failures++ }
  else console.log(`ok   ${label}`)
}

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

if (failures) { console.error(`\n${failures} assertion(s) failed`); process.exit(1) }
console.log('\nAll skill-optimizer parser tests passed.')
