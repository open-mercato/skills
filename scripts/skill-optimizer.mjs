#!/usr/bin/env node
// skill-optimizer — headless eval-and-optimize loop for a single skill.
//
// It runs a skill through Claude Code in headless (`-p`) mode inside a
// throwaway sandbox, measures the run from the stream-json trace (per-step
// wall time / tool calls / tokens + run totals), asks a second headless
// Claude call to propose SKILL.md edits, applies them to a CANDIDATE copy
// (never to skills/<name> in the repo), and re-measures — N passes.
//
// Nothing here mutates the working repo unless you pass --apply-final, and no
// skill run can push, commit, or touch a tracker (see the DRY-RUN safety model
// in docs/skill-optimizer.md). Zero npm dependencies; Node >= 20.
//
// Usage:
//   node scripts/skill-optimizer.mjs --skill <name> [--passes N] [--task "..."]
//        [--target-repo <path>] [--model <model>] [--out <dir>]
//        [--apply-final] [--mode cli|api]
//
// Hidden: --parse-fixture <file>  parse a stream-json file and print metrics
//         (used by the smoke test; performs no network calls).

import { spawn, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'
import {
  closeSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync, writeSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const USAGE = `skill-optimizer — headless eval-and-optimize loop for a skill

Usage:
  node scripts/skill-optimizer.mjs --skill <name> [options]

Options:
  --skill <name>        (required) directory under skills/ to optimize
  --passes N            measure->analyze->optimize iterations (default 2).
                        N passes = N runs and N-1 optimization rounds.
  --task "<brief>"      scenario brief handed to the skill run
                        (default: a small skill-agnostic dry-run brief)
  --target-repo <path>  repo to exercise the skill against
                        (default: a disposable copy of this skills repo)
  --model <model>       model for both the run and the analysis call
                        (default: the CLI's configured model)
  --out <dir>           artifacts dir
                        (default: .ai/analysis/skill-optimizer/<skill>-<ts>/)
  --mode cli|api        cli = use the logged-in Claude Code subscription
                        (ANTHROPIC_API_KEY removed from the child env);
                        api = export ANTHROPIC_API_KEY into the child.
                        Default: api when ANTHROPIC_API_KEY set AND CI=true,
                        else cli.
  --apply-final         copy the final candidate over skills/<name>/ when done
                        (off by default — review report.md + the diff first)
  -h, --help            show this help

Both modes invoke the same \`claude\` binary; --mode only controls whether
ANTHROPIC_API_KEY reaches the child process.`

function parseArgs(argv) {
  const opts = {
    skill: null,
    passes: 2,
    task: null,
    targetRepo: null,
    model: null,
    out: null,
    applyFinal: false,
    mode: null,
    parseFixture: null,
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => {
      const v = argv[++i]
      if (v === undefined) fail(`missing value for ${a}`)
      return v
    }
    switch (a) {
      case '--skill': opts.skill = next(); break
      case '--passes': opts.passes = parseInt(next(), 10); break
      case '--task': opts.task = next(); break
      case '--target-repo': opts.targetRepo = next(); break
      case '--model': opts.model = next(); break
      case '--out': opts.out = next(); break
      case '--mode': opts.mode = next(); break
      case '--apply-final': opts.applyFinal = true; break
      case '--parse-fixture': opts.parseFixture = next(); break
      case '-h': case '--help': opts.help = true; break
      default: fail(`unknown argument: ${a}`)
    }
  }
  return opts
}

function fail(msg) {
  console.error(`skill-optimizer: ${msg}\n`)
  console.error('Run with --help for usage.')
  process.exit(2)
}

// ---------------------------------------------------------------------------
// stream-json trace parser
// ---------------------------------------------------------------------------

const STEP_BEGIN = /^SKILL_STEP_BEGIN\s+(\d+)\s*\|\s*(.*)$/
const STEP_END = /^SKILL_STEP_END\s+(\d+)\s*\|\s*(.*)$/

// Parse an array of raw stream-json lines into structured metrics.
// Attribution model: we walk events in order keeping a "current open step".
// tool_use blocks and assistant output_tokens seen while a step is open are
// charged to that step; markers carry their event's timestamp for wall time.
export function parseTranscript(lines) {
  const steps = []
  let current = null
  let allText = ''
  let result = null
  let firstTs = null
  let lastTs = null

  const tsOf = (ev) => {
    const t = ev && ev.timestamp ? Date.parse(ev.timestamp) : NaN
    return Number.isNaN(t) ? null : t
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let ev
    try { ev = JSON.parse(trimmed) } catch { continue }

    if (ev.type === 'result') { result = ev; continue }
    if (ev.type !== 'assistant' || !ev.message) continue

    const ts = tsOf(ev)
    if (ts !== null) { if (firstTs === null) firstTs = ts; lastTs = ts }

    const content = Array.isArray(ev.message.content) ? ev.message.content : []
    const outTok = ev.message.usage && typeof ev.message.usage.output_tokens === 'number'
      ? ev.message.usage.output_tokens : 0
    let toolUses = 0
    for (const block of content) {
      if (block.type === 'tool_use') toolUses++
      else if (block.type === 'text' && typeof block.text === 'string') allText += block.text + '\n'
    }

    // Charge tool calls / output tokens of this event to the open step.
    if (current) {
      current.toolCalls += toolUses
      current.approxTokens += outTok
    }

    // Scan this event's text for step markers (may hold several).
    for (const block of content) {
      if (block.type !== 'text' || typeof block.text !== 'string') continue
      for (const raw of block.text.split('\n')) {
        const l = raw.trim()
        const b = l.match(STEP_BEGIN)
        if (b) {
          current = { n: Number(b[1]), title: b[2].trim(), beginTs: ts, endTs: null, outcome: '', toolCalls: 0, approxTokens: 0 }
          steps.push(current)
          continue
        }
        const e = l.match(STEP_END)
        if (e) {
          const n = Number(e[1])
          const step = [...steps].reverse().find((s) => s.n === n && s.endTs === null) || current
          if (step) { step.endTs = ts; step.outcome = e[2].trim() }
          if (step === current) current = null
        }
      }
    }
  }

  const perStep = steps.map((s) => ({
    n: s.n,
    title: s.title,
    outcome: s.outcome,
    wallMs: s.beginTs !== null && s.endTs !== null ? s.endTs - s.beginTs : null,
    toolCalls: s.toolCalls,
    approxTokens: s.approxTokens,
  }))

  const skillTrace = extractSkillTrace(allText)

  const totals = { tokensIn: null, tokensOut: null, costUsd: null, wallMs: null, breakdown: null }
  if (result) {
    const u = result.usage || {}
    const cacheRead = u.cache_read_input_tokens || 0
    const cacheCreate = u.cache_creation_input_tokens || 0
    const input = u.input_tokens || 0
    totals.tokensIn = input + cacheRead + cacheCreate
    totals.tokensOut = u.output_tokens || 0
    totals.costUsd = typeof result.total_cost_usd === 'number' ? result.total_cost_usd : null
    totals.wallMs = typeof result.duration_ms === 'number' ? result.duration_ms : null
    totals.breakdown = { input, cacheRead, cacheCreate, output: u.output_tokens || 0 }
  }
  if (totals.wallMs === null && firstTs !== null && lastTs !== null) totals.wallMs = lastTs - firstTs

  return {
    steps: perStep,
    totals,
    skillTrace,
    stepCount: perStep.length,
    toolCallsTotal: perStep.reduce((a, s) => a + s.toolCalls, 0),
    isError: result ? Boolean(result.is_error) : null,
    resultText: result && typeof result.result === 'string' ? result.result : null,
  }
}

// Pull the fenced ```SKILL_TRACE\n{...}\n``` block (last wins) from joined text.
function extractSkillTrace(text) {
  const re = /```SKILL_TRACE\s*\n([\s\S]*?)\n```/g
  let m
  let last = null
  while ((m = re.exec(text)) !== null) last = m[1]
  if (!last) return null
  try { return JSON.parse(last) } catch { return { _unparsed: last.slice(0, 4000) } }
}

// ---------------------------------------------------------------------------
// Skill-body budget guard (mirrors scripts/lint.sh)
// ---------------------------------------------------------------------------

// Returns { ok, name, description, bodyChars, reason }. Mirrors the lint gate:
// frontmatter name + description required, body < 20000 bytes.
export function checkSkillBody(skillMdText) {
  if (!skillMdText.startsWith('---')) return { ok: false, reason: 'does not start with frontmatter' }
  const lines = skillMdText.split('\n')
  let close = -1
  for (let i = 1; i < lines.length; i++) { if (lines[i].trim() === '---') { close = i; break } }
  if (close === -1) return { ok: false, reason: 'unterminated frontmatter' }
  const fm = lines.slice(1, close).join('\n')
  const name = (fm.match(/^name:[ \t]*(.*)$/m) || [])[1]?.trim()
  const desc = (fm.match(/^description:[ \t]*(.*)$/m) || [])[1]?.trim()
  const body = lines.slice(close + 1).join('\n')
  const bodyChars = Buffer.byteLength(body, 'utf8')
  if (!name) return { ok: false, reason: 'frontmatter missing name' }
  if (!desc) return { ok: false, reason: 'frontmatter missing description' }
  if (bodyChars > 20000) return { ok: false, name, description: desc, bodyChars, reason: `body ${bodyChars} bytes > 20000` }
  return { ok: true, name, description: desc, bodyChars }
}

// ---------------------------------------------------------------------------
// Sandbox + skill install
// ---------------------------------------------------------------------------

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${r.status}): ${r.stderr || r.stdout}`)
  }
  return r.stdout
}

// Build a throwaway copy of targetRepo and install `candidateDir` as the skill
// under test. Returns the sandbox path. Strips all git remotes so no push
// target exists.
function makeSandbox(targetRepo, skillName, candidateDir) {
  const sandbox = path.join(tmpdir(), `skopt-${skillName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const isGit = existsSync(path.join(targetRepo, '.git'))
  if (isGit) {
    run('git', ['clone', '--local', '--no-hardlinks', '--quiet', targetRepo, sandbox])
    // Remove every remote so nothing can be pushed even if a guard is bypassed.
    const remotes = run('git', ['-C', sandbox, 'remote']).split('\n').map((s) => s.trim()).filter(Boolean)
    for (const r of remotes) run('git', ['-C', sandbox, 'remote', 'remove', r])
  } else {
    mkdirSync(sandbox, { recursive: true })
    cpSync(targetRepo, sandbox, { recursive: true, filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`) })
    run('git', ['-C', sandbox, 'init', '--quiet'])
    run('git', ['-C', sandbox, 'add', '-A'])
    run('git', ['-C', sandbox, '-c', 'user.email=opt@local', '-c', 'user.name=opt', 'commit', '--quiet', '-m', 'sandbox baseline', '--no-gpg-sign'])
  }
  // Install the candidate skill at project scope so the headless run loads it.
  const dest = path.join(sandbox, '.claude', 'skills', skillName)
  mkdirSync(path.dirname(dest), { recursive: true })
  cpSync(candidateDir, dest, { recursive: true })
  return sandbox
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function runPrompt(skillName, task) {
  return `You are evaluating the "${skillName}" Claude Code skill in a DRY RUN.

DRY-RUN RULES — non-negotiable:
- NEVER commit, push, or create/switch branches for real.
- NEVER create, edit, comment on, close, or label any issue or PR, and NEVER
  call \`gh\` or any tracker mutation. Describe what you WOULD do instead.
- This sandbox has no git remote and no tracker token on purpose. Treat every
  outbound/mutating action as "describe, do not perform".
- Read-only inspection of the repo is fine.

TASK for this run:
${task}

HOW TO RUN:
1. Invoke the "${skillName}" skill and follow its workflow for the task above,
   honoring the dry-run rules (simulate any step that would mutate anything).
2. Around EACH distinct workflow step, emit these marker lines on their own line:
     SKILL_STEP_BEGIN <n> | <short step title>
     ... do the step (dry-run) ...
     SKILL_STEP_END <n> | <one-line outcome>
   Number steps 1,2,3,... in order.
3. When finished, emit a single fenced block EXACTLY like this (valid JSON):

\`\`\`SKILL_TRACE
{
  "steps": [{"n": 1, "title": "...", "outcome": "..."}],
  "decisions": ["autonomous calls you made and why"],
  "redundantWork": ["actions/tool calls that felt redundant or repeated"],
  "ambiguities": ["skill instructions that were unclear or underspecified"]
}
\`\`\`

Keep prose tight. The markers and the SKILL_TRACE block are the deliverable.`
}

function analysisPrompt({ skillName, metrics, skillMd, refsList }) {
  return `You are optimizing the "${skillName}" Claude Code skill. Below is the
measured run of the CURRENT version plus its SKILL.md. Propose concrete edits
that would make the skill faster / clearer / less wasteful WITHOUT changing what
it accomplishes or dropping any safety rule.

Hard constraints on any proposed SKILL.md edit:
- Keep the YAML frontmatter with a "name:" (== "${skillName}") and a
  "description:" line.
- Keep the body (everything after the closing ---) under 20000 bytes.
- Do not remove safety/dry-run/claim-lock behavior; only tighten wording,
  remove redundancy, reorder for clarity, or push detail into references.

MEASURED METRICS (metrics.json):
${JSON.stringify(metrics, null, 2)}

REFERENCE FILES available to this skill: ${refsList.length ? refsList.join(', ') : '(none)'}

CURRENT skills/${skillName}/SKILL.md:
<<<SKILL_MD
${skillMd}
SKILL_MD

Respond with ONE fenced \`\`\`json block and nothing else, matching:
{
  "bottlenecks": ["..."],
  "redundantWork": ["..."],
  "ambiguities": ["..."],
  "proposedChanges": [
    {"file": "SKILL.md", "rationale": "why", "newContent": "FULL new file contents"}
  ],
  "expectedImpact": "one paragraph"
}
Only propose changes to files that exist (SKILL.md or a listed references/ file).
"newContent" must be the COMPLETE new file, not a diff. If nothing is worth
changing, return an empty proposedChanges array.`
}

// ---------------------------------------------------------------------------
// Headless Claude invocation
// ---------------------------------------------------------------------------

function childEnv(mode) {
  const env = { ...process.env }
  // No tracker token can reach the child, in either mode.
  delete env.GH_TOKEN
  delete env.GITHUB_TOKEN
  if (mode === 'cli') {
    // Force the subscription login; make sure the API key never bills here.
    delete env.ANTHROPIC_API_KEY
  }
  return env
}

const DISALLOWED = ['Bash(git push:*)', 'Bash(git commit:*)', 'Bash(git commit -m:*)', 'Bash(gh:*)', 'Bash(gh :*)']

// Run the skill headlessly, streaming stream-json to transcriptPath as it
// arrives. Returns the array of raw lines. Prints step markers for progress.
function runSkillHeadless({ prompt, cwd, model, mode, transcriptPath }) {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'dontAsk']
    for (const d of DISALLOWED) args.push('--disallowedTools', d)
    if (model) args.push('--model', model)
    const child = spawn('claude', args, { cwd, env: childEnv(mode), stdio: ['ignore', 'pipe', 'pipe'] })
    const lines = []
    const chunks = []
    const out = writeStream(transcriptPath)
    const rl = createInterface({ input: child.stdout })
    rl.on('line', (line) => {
      lines.push(line)
      out.write(line + '\n')
      const t = line.trim()
      const b = t.match(/"text":"SKILL_STEP_(BEGIN|END)/)
      if (b) {
        try {
          const ev = JSON.parse(t)
          for (const block of ev.message?.content || []) {
            if (block.type === 'text') {
              for (const raw of block.text.split('\n')) {
                const m = raw.trim().match(/^SKILL_STEP_(BEGIN|END)\s+(\d+)\s*\|\s*(.*)$/)
                if (m) process.stderr.write(`    step ${m[2]} ${m[1].toLowerCase()}: ${m[3].slice(0, 70)}\n`)
              }
            }
          }
        } catch { /* progress only */ }
      }
    })
    child.stderr.on('data', (d) => chunks.push(d))
    child.on('error', (err) => reject(err))
    child.on('close', (code) => {
      out.end()
      if (code !== 0 && lines.length === 0) {
        reject(new Error(`claude exited ${code}: ${Buffer.concat(chunks).toString().slice(0, 800)}`))
      } else {
        resolve(lines)
      }
    })
  })
}

// Persist the raw stream verbatim, line by line, as events arrive.
function writeStream(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  const fd = openSync(filePath, 'w')
  return {
    write: (s) => writeSync(fd, s),
    end: () => closeSync(fd),
  }
}

// Analysis call: single JSON result, no repo tools needed (content is inline).
function analyzeHeadless({ prompt, model, mode }) {
  const args = ['-p', prompt, '--output-format', 'json']
  if (model) args.push('--model', model)
  const r = spawnSync('claude', args, { encoding: 'utf8', env: childEnv(mode), maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`analysis claude exited ${r.status}: ${(r.stderr || '').slice(0, 800)}`)
  let text = r.stdout
  try {
    const obj = JSON.parse(r.stdout)
    if (typeof obj.result === 'string') text = obj.result
  } catch { /* fall through: treat stdout as the text */ }
  return extractJsonObject(text)
}

// Pull the first balanced {...} JSON object out of a (possibly fenced) string.
function extractJsonObject(text) {
  const fenced = text.match(/```json\s*\n([\s\S]*?)\n```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  if (start === -1) throw new Error('analysis produced no JSON object')
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return JSON.parse(candidate.slice(start, i + 1)) }
  }
  throw new Error('analysis JSON object was not balanced')
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function fmtMs(ms) { return ms === null || ms === undefined ? '—' : `${(ms / 1000).toFixed(1)}s` }
function fmtNum(n) { return n === null || n === undefined ? '—' : n.toLocaleString('en-US') }
function fmtCost(c) { return c === null || c === undefined ? '—' : `$${c.toFixed(4)}` }

function buildReport({ skillName, task, mode, model, passes, targetRepo, shippedDir, finalDir, diffText }) {
  const L = []
  L.push(`# skill-optimizer report — \`${skillName}\``, '')
  L.push(`- Skill: \`${skillName}\``)
  L.push(`- Task: ${task}`)
  L.push(`- Mode: \`${mode}\`  |  Model: \`${model || 'CLI default'}\``)
  L.push(`- Target repo: \`${targetRepo}\``)
  L.push(`- Passes: ${passes.length}`)
  L.push('')
  L.push('## Per-pass metrics', '')
  L.push('| Pass | Steps | Tool calls | Tokens in | Tokens out | Cost | Wall time | Error? |')
  L.push('|---|---|---|---|---|---|---|---|')
  for (const p of passes) {
    const m = p.metrics
    L.push(`| ${p.index} | ${m.stepCount} | ${m.toolCallsTotal} | ${fmtNum(m.totals.tokensIn)} | ${fmtNum(m.totals.tokensOut)} | ${fmtCost(m.totals.costUsd)} | ${fmtMs(m.totals.wallMs)} | ${m.isError ? 'yes' : 'no'} |`)
  }
  L.push('')
  for (const p of passes) {
    L.push(`### Pass ${p.index} — step breakdown`, '')
    if (!p.metrics.steps.length) { L.push('_No SKILL_STEP markers were emitted._', ''); continue }
    L.push('| Step | Title | Tool calls | Approx out-tokens | Wall | Outcome |')
    L.push('|---|---|---|---|---|---|')
    for (const s of p.metrics.steps) {
      L.push(`| ${s.n} | ${clip(s.title, 40)} | ${s.toolCalls} | ${fmtNum(s.approxTokens)} | ${fmtMs(s.wallMs)} | ${clip(s.outcome, 50)} |`)
    }
    L.push('')
  }
  L.push('## What changed each round', '')
  const changed = passes.filter((p) => p.analysis)
  if (!changed.length) {
    L.push('_No optimization rounds ran (single-pass run)._', '')
  } else {
    for (const p of changed) {
      L.push(`### After pass ${p.index} → candidate for pass ${p.index + 1}`, '')
      const a = p.analysis
      if (a.expectedImpact) L.push(`**Expected impact:** ${a.expectedImpact}`, '')
      for (const key of ['bottlenecks', 'redundantWork', 'ambiguities']) {
        if (Array.isArray(a[key]) && a[key].length) {
          L.push(`**${key}:**`)
          for (const item of a[key]) L.push(`- ${item}`)
          L.push('')
        }
      }
      if (p.appliedChanges?.length) {
        L.push('**Applied changes:**')
        for (const c of p.appliedChanges) L.push(`- \`${c.file}\` — ${c.rationale}`)
        L.push('')
      }
      if (p.rejectedChanges?.length) {
        L.push('**Rejected changes (failed the guard):**')
        for (const c of p.rejectedChanges) L.push(`- \`${c.file}\` — ${c.reason}`)
        L.push('')
      }
    }
  }
  L.push('## Final candidate diff vs shipped skill', '')
  L.push(`Shipped: \`${shippedDir}\`  →  Final candidate: \`${finalDir}\``, '')
  if (diffText.trim()) {
    L.push('```diff', diffText.trimEnd(), '```', '')
  } else {
    L.push('_No differences — the shipped skill was already at a local optimum for these passes._', '')
  }
  return L.join('\n')
}

function clip(s, n) { s = String(s || '').replace(/\|/g, '\\|'); return s.length > n ? s.slice(0, n - 1) + '…' : s }

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function listRefs(skillDir) {
  const refDir = path.join(skillDir, 'references')
  if (!existsSync(refDir)) return []
  const out = []
  const walk = (dir, prefix) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name), `${prefix}${e.name}/`)
      else out.push(`references/${prefix}${e.name}`)
    }
  }
  walk(refDir, '')
  return out
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) { console.log(USAGE); return }

  if (opts.parseFixture) {
    const raw = readFileSync(opts.parseFixture, 'utf8').split('\n')
    console.log(JSON.stringify(parseTranscript(raw), null, 2))
    return
  }

  if (!opts.skill) fail('--skill <name> is required')
  if (!Number.isInteger(opts.passes) || opts.passes < 1) fail('--passes must be a positive integer')
  const shippedDir = path.join(repoRoot, 'skills', opts.skill)
  if (!existsSync(path.join(shippedDir, 'SKILL.md'))) fail(`skill not found: skills/${opts.skill}/SKILL.md`)

  const mode = opts.mode || ((process.env.ANTHROPIC_API_KEY && process.env.CI === 'true') ? 'api' : 'cli')
  if (!['cli', 'api'].includes(mode)) fail(`--mode must be cli or api (got ${mode})`)
  if (mode === 'api' && !process.env.ANTHROPIC_API_KEY) fail('--mode api requires ANTHROPIC_API_KEY in the environment')

  const targetRepo = path.resolve(opts.targetRepo || repoRoot)
  if (!existsSync(targetRepo)) fail(`--target-repo does not exist: ${targetRepo}`)

  const task = opts.task
    || `Run this skill's workflow against this repository in DRY-RUN mode on a trivial example (do not mutate anything; describe what you would do). Keep it small.`

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = path.resolve(opts.out || path.join(repoRoot, '.ai', 'analysis', 'skill-optimizer', `${opts.skill}-${ts}`))
  mkdirSync(outDir, { recursive: true })

  console.error(`skill-optimizer: skill=${opts.skill} passes=${opts.passes} mode=${mode} model=${opts.model || 'CLI default'}`)
  console.error(`  target repo : ${targetRepo}`)
  console.error(`  artifacts   : ${outDir}`)

  // Candidate for pass 1 = the shipped skill.
  let candidateDir = path.join(outDir, 'candidate-current')
  cpSync(shippedDir, candidateDir, { recursive: true })

  const passes = []

  for (let i = 1; i <= opts.passes; i++) {
    console.error(`\n=== Pass ${i}/${opts.passes}: measure ===`)
    const passDir = path.join(outDir, `pass-${i}`)
    mkdirSync(passDir, { recursive: true })
    // Snapshot exactly the skill version being measured.
    const measuredDir = path.join(passDir, 'skill-candidate')
    cpSync(candidateDir, measuredDir, { recursive: true })

    const sandbox = makeSandbox(targetRepo, opts.skill, candidateDir)
    const prompt = runPrompt(opts.skill, task)
    writeFileSync(path.join(passDir, 'run-prompt.txt'), prompt)
    const transcriptPath = path.join(passDir, 'transcript.jsonl')

    let metrics
    try {
      const lines = await runSkillHeadless({ prompt, cwd: sandbox, model: opts.model, mode, transcriptPath })
      metrics = parseTranscript(lines)
    } catch (err) {
      console.error(`  run failed: ${err.message}`)
      metrics = { steps: [], totals: { tokensIn: null, tokensOut: null, costUsd: null, wallMs: null }, skillTrace: null, stepCount: 0, toolCallsTotal: 0, isError: true, error: err.message }
    } finally {
      rmSync(sandbox, { recursive: true, force: true })
    }
    writeFileSync(path.join(passDir, 'metrics.json'), JSON.stringify(metrics, null, 2))
    const t = metrics.totals
    console.error(`  steps=${metrics.stepCount} toolCalls=${metrics.toolCallsTotal} tokensIn=${fmtNum(t.tokensIn)} tokensOut=${fmtNum(t.tokensOut)} cost=${fmtCost(t.costUsd)} wall=${fmtMs(t.wallMs)}`)

    const passRecord = { index: i, metrics, analysis: null, appliedChanges: [], rejectedChanges: [] }
    passes.push(passRecord)

    // Optimization round (not after the final pass).
    if (i < opts.passes) {
      console.error(`=== Pass ${i}: analyze + optimize ===`)
      const skillMd = readFileSync(path.join(candidateDir, 'SKILL.md'), 'utf8')
      const refsList = listRefs(candidateDir)
      const aPrompt = analysisPrompt({ skillName: opts.skill, metrics, skillMd, refsList })
      writeFileSync(path.join(passDir, 'analysis-prompt.txt'), aPrompt)
      let analysis
      try {
        analysis = analyzeHeadless({ prompt: aPrompt, model: opts.model, mode })
      } catch (err) {
        console.error(`  analysis failed: ${err.message} — carrying candidate forward unchanged`)
        analysis = { bottlenecks: [], redundantWork: [], ambiguities: [], proposedChanges: [], expectedImpact: `analysis failed: ${err.message}` }
      }
      writeFileSync(path.join(passDir, 'analysis.json'), JSON.stringify(analysis, null, 2))
      passRecord.analysis = analysis

      // Apply proposed changes to a FRESH candidate copy (never the repo).
      const nextCandidate = path.join(outDir, `candidate-pass-${i + 1}`)
      cpSync(candidateDir, nextCandidate, { recursive: true })
      for (const change of analysis.proposedChanges || []) {
        const rel = String(change.file || '').replace(/^\.\//, '')
        const isSkillMd = rel === 'SKILL.md'
        const isRef = rel.startsWith('references/') && refsList.includes(rel)
        const targetFile = path.join(nextCandidate, rel)
        if ((!isSkillMd && !isRef) || rel.includes('..') || !existsSync(targetFile)) {
          passRecord.rejectedChanges.push({ file: rel, reason: 'file not part of the skill (only SKILL.md or a listed references/ file)' })
          continue
        }
        if (typeof change.newContent !== 'string' || !change.newContent.trim()) {
          passRecord.rejectedChanges.push({ file: rel, reason: 'empty newContent' })
          continue
        }
        if (isSkillMd) {
          const check = checkSkillBody(change.newContent)
          if (!check.ok || check.name !== opts.skill) {
            passRecord.rejectedChanges.push({ file: rel, reason: check.name !== opts.skill ? `frontmatter name '${check.name}' != '${opts.skill}'` : check.reason })
            continue
          }
        }
        writeFileSync(targetFile, change.newContent)
        passRecord.appliedChanges.push({ file: rel, rationale: change.rationale || '(no rationale given)' })
      }
      console.error(`  proposed=${(analysis.proposedChanges || []).length} applied=${passRecord.appliedChanges.length} rejected=${passRecord.rejectedChanges.length}`)
      candidateDir = passRecord.appliedChanges.length ? nextCandidate : candidateDir
    }
  }

  // Final candidate = whatever the last measured version was.
  const finalDir = path.join(outDir, 'final-candidate')
  cpSync(candidateDir, finalDir, { recursive: true })
  const diff = spawnSync('diff', ['-ru', shippedDir, finalDir], { encoding: 'utf8' })
  const diffText = diff.stdout || ''

  const report = buildReport({
    skillName: opts.skill, task, mode, model: opts.model,
    passes, targetRepo, shippedDir, finalDir, diffText,
  })
  writeFileSync(path.join(outDir, 'report.md'), report)
  console.error(`\nReport: ${path.join(outDir, 'report.md')}`)

  if (opts.applyFinal) {
    rmSync(shippedDir, { recursive: true, force: true })
    cpSync(finalDir, shippedDir, { recursive: true })
    console.error(`--apply-final: copied final candidate over skills/${opts.skill}/`)
  } else {
    console.error(`Review the report and diff, then re-run with --apply-final to adopt skills/${opts.skill}/.`)
  }
}

// Only drive the loop when run directly — importing (e.g. the parser test)
// must not kick off a run.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((err) => { console.error(`skill-optimizer: ${err.stack || err.message}`); process.exit(1) })
}
