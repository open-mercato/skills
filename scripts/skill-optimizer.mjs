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
  --target-repo <path>  exercise the skill against a sandbox COPY of this repo
                        (remotes stripped). Mutually exclusive with --mock*.
  --mock [scenario]     generate a hermetic mock repo instead of copying one.
                        Scenarios: review (default; multi-file TS app with planted
                        findings), implement (a code change task + outcome props),
                        mini (tiny single-file JS smoke fixture). This is the
                        DEFAULT source when neither --target-repo nor --mock-spec.
  --mock-spec <path>    generate a mock repo from a JSON scenario spec
                        ({ files, branches, goal?, outcomeProperties?, task?,
                        name?, base? }).
  --run-model <model>   OPTIMIZATION TARGET: the model the skill is executed and
                        measured under every pass (default: sonnet). Accepts CLI
                        aliases (haiku, sonnet, opus) and full model ids.
  --analysis-model <m>  model for the analyze/optimize + scoring calls
                        (default: the CLI's configured model — independent of
                        the run model; analyzing a weak run with a stronger
                        model is the expected setup).
  --baseline-model [m]  DOWNSHIFT bar: measure the SHIPPED skill under this model
                        first; its quality score becomes the parity target every
                        run-model pass is judged against (bare default: opus).
  --compare-models <l>  after the final pass, measure the final candidate under
                        each comma-separated model and emit a cross-model
                        comparison (comparison.md). Works with --passes 1 as a
                        pure evaluation mode.
  --model <model>       shorthand that sets BOTH --run-model and --analysis-model
                        (error if combined with either specific flag).
  --out <dir>           artifacts dir
                        (default: .ai/analysis/skill-optimizer/<skill>-<ts>/)
  --mode cli|api        cli = use the logged-in Claude Code subscription
                        (ANTHROPIC_API_KEY removed from the child env);
                        api = export ANTHROPIC_API_KEY into the child.
                        Default: api when ANTHROPIC_API_KEY set AND CI=true,
                        else cli.
  --apply-final         copy the final candidate over skills/<name>/ when done
                        (off by default — review report.md + the diff first)
  --open-pr             blind-run mode: on a fresh branch in THIS repo, apply the
                        final candidate over skills/<name>/, commit, push, and
                        open a PR with the report. Refuses on a dirty tree; opens
                        DRAFT with the failure quoted if lint fails.
  -h, --help            show this help

Both modes invoke the same \`claude\` binary; --mode only controls whether
ANTHROPIC_API_KEY reaches the child process.`

function parseArgs(argv) {
  const opts = {
    skill: null,
    passes: 2,
    task: null,
    targetRepo: null,
    mock: null,          // scenario name when --mock is present
    mockGiven: false,    // whether --mock was passed at all
    mockSpec: null,      // path to a --mock-spec file
    model: null,         // shorthand for run + analysis
    runModel: null,
    analysisModel: null,
    baseline: null,      // baseline model name when --baseline-model has a value
    baselineGiven: false,
    compareModels: null, // array of model names
    out: null,
    applyFinal: false,
    openPr: false,
    mode: null,
    parseFixture: null,
    genMock: null,       // hidden: generate a mock repo at this dir and exit (tests)
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
      case '--mock': {
        opts.mockGiven = true
        // Optional scenario value: consume the next token only if it is not a flag.
        const peek = argv[i + 1]
        if (peek !== undefined && !peek.startsWith('--')) { opts.mock = argv[++i] }
        break
      }
      case '--mock-spec': opts.mockSpec = next(); break
      case '--model': opts.model = next(); break
      case '--run-model': opts.runModel = next(); break
      case '--analysis-model': opts.analysisModel = next(); break
      case '--baseline-model': {
        opts.baselineGiven = true
        const peek = argv[i + 1]
        if (peek !== undefined && !peek.startsWith('--')) { opts.baseline = argv[++i] }
        break
      }
      case '--compare-models': opts.compareModels = next().split(',').map((s) => s.trim()).filter(Boolean); break
      case '--out': opts.out = next(); break
      case '--mode': opts.mode = next(); break
      case '--apply-final': opts.applyFinal = true; break
      case '--open-pr': opts.openPr = true; break
      case '--parse-fixture': opts.parseFixture = next(); break
      case '--gen-mock': opts.genMock = next(); break
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

// Resolve the model triple from parsed opts. Throws a string on conflict so the
// arg-parsing test can assert without exiting the process.
export function resolveModels(opts) {
  if (opts.model && (opts.runModel || opts.analysisModel)) {
    throw '--model is a shorthand for --run-model + --analysis-model; do not combine it with either'
  }
  return {
    runModel: opts.runModel || opts.model || 'sonnet',
    analysisModel: opts.analysisModel || opts.model || null, // null => the CLI's configured default
    baselineModel: opts.baselineGiven ? (opts.baseline || 'opus') : null,
    compareModels: opts.compareModels || null,
  }
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
  let globalToolUses = 0
  let maxMarkersInEvent = 0

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
    globalToolUses += toolUses

    // Charge tool calls / output tokens of this event to the open step.
    if (current) {
      current.toolCalls += toolUses
      current.approxTokens += outTok
    }

    // Scan this event's text for step markers (may hold several).
    let markersInThisEvent = 0
    for (const block of content) {
      if (block.type !== 'text' || typeof block.text !== 'string') continue
      for (const raw of block.text.split('\n')) {
        const l = raw.trim()
        const b = l.match(STEP_BEGIN)
        if (b) {
          markersInThisEvent++
          current = { n: Number(b[1]), title: b[2].trim(), beginTs: ts, endTs: null, outcome: '', toolCalls: 0, approxTokens: 0 }
          steps.push(current)
          continue
        }
        const e = l.match(STEP_END)
        if (e) {
          markersInThisEvent++
          const n = Number(e[1])
          const step = [...steps].reverse().find((s) => s.n === n && s.endTs === null) || current
          if (step) { step.endTs = ts; step.outcome = e[2].trim() }
          if (step === current) current = null
        }
      }
    }
    if (markersInThisEvent > maxMarkersInEvent) maxMarkersInEvent = markersInThisEvent
  }

  const perStep = steps.map((s) => ({
    n: s.n,
    title: s.title,
    outcome: s.outcome,
    wallMs: s.beginTs !== null && s.endTs !== null ? s.endTs - s.beginTs : null,
    toolCalls: s.toolCalls,
    approxTokens: s.approxTokens,
  }))

  // Fallback for batched markers: when the model emits most/all SKILL_STEP
  // markers inside a single output block (rather than one segment per step as
  // the run prompt asks), a step's BEGIN and END share a timestamp and no
  // tool_use events fall inside it, so per-step attribution is empty. Detect
  // that (steps exist, tools happened, but none were attributed — or several
  // markers landed in one event) and redistribute the run's tool calls and
  // output tokens evenly across the ordered steps so the breakdown is not blank.
  const attributedTools = perStep.reduce((a, s) => a + s.toolCalls, 0)
  const markersBatched = perStep.length > 0
    && ((attributedTools === 0 && globalToolUses > 0) || maxMarkersInEvent > 2)
  const outTokTotal = result && result.usage ? (result.usage.output_tokens || 0) : 0
  if (markersBatched) {
    const S = perStep.length
    for (let k = 0; k < S; k++) {
      perStep[k].toolCalls = Math.floor(globalToolUses / S) + (k < globalToolUses % S ? 1 : 0)
      perStep[k].approxTokens = Math.floor(outTokTotal / S) + (k < outTokTotal % S ? 1 : 0)
      perStep[k].wallMs = null // no per-step timing signal when markers are batched
      perStep[k].attribution = 'redistributed'
    }
  }

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
    // Global count is the ground truth for tool calls; per-step is attribution.
    toolCallsTotal: globalToolUses,
    markersBatched,
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

// Build a throwaway repo and install `candidateDir` as the skill under test.
// `source` is either { type: 'repo', path } (sandbox copy, remotes stripped) or
// { type: 'mock', spec } (a generated hermetic fixture). Returns
// { sandbox, manifest } where manifest describes the mock's planted findings
// (null for a real-repo source).
function makeSandbox(skillName, candidateDir, source) {
  const sandbox = path.join(tmpdir(), `skopt-${skillName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  let manifest = null
  if (source.type === 'repo') {
    const targetRepo = source.path
    const isGit = existsSync(path.join(targetRepo, '.git'))
    if (isGit) {
      run('git', ['clone', '--local', '--no-hardlinks', '--quiet', targetRepo, sandbox])
      // Remove every remote so nothing can be pushed even if a guard is bypassed.
      const remotes = run('git', ['-C', sandbox, 'remote']).split('\n').map((s) => s.trim()).filter(Boolean)
      for (const r of remotes) run('git', ['-C', sandbox, 'remote', 'remove', r])
    } else {
      mkdirSync(sandbox, { recursive: true })
      cpSync(targetRepo, sandbox, { recursive: true, filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`) })
      gitInit(sandbox)
      gitCommitAll(sandbox, 'sandbox baseline')
    }
  } else {
    manifest = generateMockRepo(sandbox, source.spec)
  }
  // Install the candidate skill at project scope so the headless run loads it.
  const dest = path.join(sandbox, '.claude', 'skills', skillName)
  mkdirSync(path.dirname(dest), { recursive: true })
  cpSync(candidateDir, dest, { recursive: true })
  // Keep the installed skill out of git so it never appears in the work-product
  // diff (git add -A would otherwise stage the whole .claude/skills tree).
  const excludePath = path.join(sandbox, '.git', 'info', 'exclude')
  if (existsSync(path.dirname(excludePath))) {
    const prior = existsSync(excludePath) ? readFileSync(excludePath, 'utf8') : ''
    writeFileSync(excludePath, prior + '.claude/\n')
  }
  return { sandbox, manifest }
}

// Snapshot what the skill produced in the sandbox working tree: everything it
// changed or added (excluding the installed skill), plus the run's final text.
// A non-empty diff marks the skill as code-modifying for this run.
function captureWorkproduct(sandbox) {
  run('git', ['-C', sandbox, 'add', '-A'])
  const diff = spawnSync('git', ['-C', sandbox, 'diff', '--cached', '--', '.', ':(exclude).claude'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout || ''
  return diff
}

function gitInit(dir) {
  run('git', ['-c', 'init.defaultBranch=main', 'init', '--quiet', dir])
}
function gitCommitAll(dir, message) {
  run('git', ['-C', dir, 'add', '-A'])
  run('git', ['-C', dir, '-c', 'user.email=opt@local', '-c', 'user.name=opt', 'commit', '--quiet', '-m', message, '--no-gpg-sign'])
}

// ---------------------------------------------------------------------------
// Mock evaluation repos
// ---------------------------------------------------------------------------

// The agentic pipeline config every mock ships (labels/qaGate off, `npm test`
// as the validation gate) so a skill's preflight finds a pipeline and never
// needs a live tracker.
function agenticConfig() {
  return {
    version: 1,
    baseBranch: 'main',
    tracker: 'github',
    validation: { commands: ['npm test'] },
    labels: { enabled: false },
    qaGate: false,
    paths: { runs: '.ai/runs', analysis: '.ai/analysis', specs: '.ai/specs', scripts: '.ai/scripts', qa: '.ai/qa' },
    reviewChecklist: null,
  }
}

// Ship the real GitHub tracker descriptor so tracker-operation preflight passes.
function trackerFiles() {
  const src = path.join(repoRoot, 'skills', 'om-setup-agent-pipeline', 'references', 'trackers', 'github.md')
  return existsSync(src) ? { '.ai/trackers/github.md': readFileSync(src, 'utf8') } : {}
}

// The default base: a small-but-real multi-file TypeScript order-management app.
// Runs on Node's native type-stripping (Node >= 23 runs erasable-syntax .ts
// directly) — no build step, zero deps — validated by `node --test tests/*.test.ts`.
// Cross-module imports use explicit .ts specifiers (required at runtime).
const TS_APP = {
  'src/types.ts':
    'export type Money = { currency: string; cents: number }\n' +
    "export type Coupon = { code: string; kind: 'percent' | 'fixed'; value: number }\n" +
    'export type OrderItem = { sku: string; unitPrice: Money; qty: number }\n' +
    'export type Order = { id: string; items: OrderItem[]; coupons: Coupon[] }\n' +
    'export type PricedOrder = {\n' +
    '  id: string\n  subtotal: Money\n  discount: Money\n  total: Money\n  appliedCoupons: string[]\n}\n',
  'src/money.ts':
    "import type { Money } from './types.ts'\n\n" +
    "export function money(cents: number, currency = 'USD'): Money {\n  return { currency, cents }\n}\n\n" +
    'function assertSameCurrency(a: Money, b: Money): void {\n' +
    "  if (a.currency !== b.currency) {\n    throw new Error('currency mismatch: ' + a.currency + ' vs ' + b.currency)\n  }\n}\n\n" +
    'export function add(a: Money, b: Money): Money {\n  assertSameCurrency(a, b)\n  return { currency: a.currency, cents: a.cents + b.cents }\n}\n\n' +
    'export function subtract(a: Money, b: Money): Money {\n  assertSameCurrency(a, b)\n  return { currency: a.currency, cents: a.cents - b.cents }\n}\n\n' +
    'export function scale(a: Money, factor: number): Money {\n  return { currency: a.currency, cents: Math.round(a.cents * factor) }\n}\n\n' +
    'export function isNegative(a: Money): boolean {\n  return a.cents < 0\n}\n',
  'src/discount.ts':
    "import type { Coupon, Money } from './types.ts'\n" +
    "import { money, scale } from './money.ts'\n\n" +
    'export function clampPercent(value: number): number {\n  if (value < 0) return 0\n  if (value > 100) return 100\n  return value\n}\n\n' +
    '// The discount amount (a positive Money) a single coupon yields on a subtotal.\n' +
    'export function couponDiscount(subtotal: Money, coupon: Coupon): Money {\n' +
    "  if (coupon.kind === 'percent') {\n    return scale(subtotal, clampPercent(coupon.value) / 100)\n  }\n" +
    '  return money(Math.min(coupon.value, subtotal.cents), subtotal.currency)\n}\n',
  'src/coupons.ts':
    "import type { Coupon, Money } from './types.ts'\n" +
    "import { add, money } from './money.ts'\n" +
    "import { couponDiscount } from './discount.ts'\n\n" +
    '// Stack every coupon discount over a subtotal, capping the total at the\n' +
    '// subtotal so an order can never go negative.\n' +
    'export function stackCoupons(\n  subtotal: Money,\n  coupons: Coupon[],\n): { discount: Money; applied: string[] } {\n' +
    '  let discount = money(0, subtotal.currency)\n  const applied: string[] = []\n' +
    '  for (const coupon of coupons) {\n    if (coupon === undefined || coupon === null) continue\n' +
    '    discount = add(discount, couponDiscount(subtotal, coupon))\n    applied.push(coupon.code)\n  }\n' +
    '  if (discount.cents > subtotal.cents) {\n    discount = money(subtotal.cents, subtotal.currency)\n  }\n' +
    '  return { discount, applied }\n}\n',
  'src/orders.ts':
    "import type { Order, OrderItem, PricedOrder, Money } from './types.ts'\n" +
    "import { add, money, scale, subtract } from './money.ts'\n" +
    "import { stackCoupons } from './coupons.ts'\n\n" +
    'export function lineTotal(item: OrderItem): Money {\n  return scale(item.unitPrice, item.qty)\n}\n\n' +
    'export function subtotalOf(items: OrderItem[]): Money {\n' +
    "  const currency = items.length ? items[0].unitPrice.currency : 'USD'\n" +
    '  let sum = money(0, currency)\n  for (const item of items) sum = add(sum, lineTotal(item))\n  return sum\n}\n\n' +
    'export function priceOrder(order: Order): PricedOrder {\n' +
    '  const subtotal = subtotalOf(order.items)\n' +
    '  const { discount, applied } = stackCoupons(subtotal, order.coupons)\n' +
    '  return {\n    id: order.id,\n    subtotal,\n    discount,\n    total: subtract(subtotal, discount),\n    appliedCoupons: applied,\n  }\n}\n',
  'src/api/handlers.ts':
    "import type { Order } from '../types.ts'\n" +
    "import { priceOrder } from '../orders.ts'\n\n" +
    'export type PriceResponse =\n' +
    '  | { ok: true; total: number; currency: string; applied: string[] }\n' +
    '  | { ok: false; error: string }\n\n' +
    'export function handlePriceOrder(order: Order): PriceResponse {\n  try {\n' +
    '    const priced = priceOrder(order)\n' +
    '    return {\n      ok: true,\n      total: priced.total.cents,\n      currency: priced.total.currency,\n      applied: priced.appliedCoupons,\n    }\n' +
    '  } catch (error) {\n    return { ok: false, error: (error as Error).message }\n  }\n}\n',
  'src/index.ts':
    "export * from './types.ts'\n" +
    "export * from './money.ts'\n" +
    "export * from './discount.ts'\n" +
    "export * from './coupons.ts'\n" +
    "export * from './orders.ts'\n" +
    "export * from './api/handlers.ts'\n",
  'tests/money.test.ts':
    "import test from 'node:test'\n" +
    "import assert from 'node:assert'\n" +
    "import { add, money, scale, subtract } from '../src/money.ts'\n\n" +
    "test('add sums cents in the same currency', () => {\n  assert.strictEqual(add(money(150), money(50)).cents, 200)\n})\n\n" +
    "test('add rejects a currency mismatch', () => {\n  assert.throws(() => add(money(1, 'USD'), money(1, 'EUR')))\n})\n\n" +
    "test('scale rounds to whole cents', () => {\n  assert.strictEqual(scale(money(101), 0.5).cents, 51)\n})\n\n" +
    "test('subtract yields the difference', () => {\n  assert.strictEqual(subtract(money(200), money(75)).cents, 125)\n})\n",
  'tests/coupons.test.ts':
    "import test from 'node:test'\n" +
    "import assert from 'node:assert'\n" +
    "import { stackCoupons } from '../src/coupons.ts'\n" +
    "import { money } from '../src/money.ts'\n\n" +
    "test('stacks percent and fixed coupons', () => {\n" +
    "  const { discount, applied } = stackCoupons(money(1000), [\n" +
    "    { code: 'TEN', kind: 'percent', value: 10 },\n    { code: 'FIVE', kind: 'fixed', value: 500 },\n  ])\n" +
    "  assert.strictEqual(discount.cents, 600)\n  assert.deepStrictEqual(applied, ['TEN', 'FIVE'])\n})\n\n" +
    "test('caps total discount at the subtotal', () => {\n" +
    "  const { discount } = stackCoupons(money(1000), [{ code: 'BIG', kind: 'fixed', value: 5000 }])\n" +
    '  assert.strictEqual(discount.cents, 1000)\n})\n',
  'tests/orders.test.ts':
    "import test from 'node:test'\n" +
    "import assert from 'node:assert'\n" +
    "import { priceOrder } from '../src/orders.ts'\n" +
    "import { handlePriceOrder } from '../src/api/handlers.ts'\n\n" +
    'const order = {\n  id: \'o1\',\n  items: [\n' +
    "    { sku: 'a', unitPrice: { currency: 'USD', cents: 500 }, qty: 2 },\n" +
    "    { sku: 'b', unitPrice: { currency: 'USD', cents: 300 }, qty: 1 },\n  ],\n" +
    "  coupons: [{ code: 'TEN', kind: 'percent' as const, value: 10 }],\n}\n\n" +
    "test('prices an order with a percent coupon', () => {\n" +
    '  const priced = priceOrder(order)\n' +
    '  assert.strictEqual(priced.subtotal.cents, 1300)\n' +
    '  assert.strictEqual(priced.discount.cents, 130)\n' +
    '  assert.strictEqual(priced.total.cents, 1170)\n})\n\n' +
    "test('handler stays ok for a large fixed coupon', () => {\n" +
    "  const res = handlePriceOrder({ ...order, coupons: [{ code: 'X', kind: 'fixed', value: 9999 }] })\n" +
    '  assert.ok(res.ok === true && res.total >= 0)\n})\n',
}

const TSCONFIG =
  '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n' +
  '    "moduleResolution": "NodeNext",\n    "allowImportingTsExtensions": true,\n' +
  '    "erasableSyntaxOnly": true,\n    "verbatimModuleSyntax": true,\n' +
  '    "noEmit": true,\n    "strict": true\n  },\n  "include": ["src", "tests"]\n}\n'

function baseMockFilesTS() {
  return {
    'package.json': JSON.stringify({
      name: 'skopt-mock', version: '0.0.0', private: true, type: 'module',
      description: 'Hermetic multi-file TypeScript app for skill-optimizer evaluation runs.',
      scripts: { test: 'node --test tests/*.test.ts' },
    }, null, 2) + '\n',
    'tsconfig.json': TSCONFIG,
    'README.md': '# skopt-mock\n\nA disposable multi-file TypeScript order-management fixture generated by skill-optimizer. Not real code. Runs on Node native type-stripping; `npm test` = `node --test tests/*.test.ts`.\n',
    '.ai/agentic.config.json': JSON.stringify(agenticConfig(), null, 2) + '\n',
    '.gitignore': 'node_modules/\n',
    ...TS_APP,
    ...trackerFiles(),
  }
}

// The original tiny single-file JS fixture, kept as scenario `mini` for fast
// smoke runs / CI of the optimizer itself.
const COUPONS_BUGGY =
  '// Apply a list of coupons to an order, stacking their discounts.\n' +
  'function stackCoupons(order, coupons) {\n' +
  '  try {\n' +
  '    for (let i = 0; i <= coupons.length; i++) {\n' +
  '      const c = coupons[i]\n' +
  '      if (c == undefined) continue\n' +
  '      order.applied.push(c.code)\n' +
  '      order.total -= c.amount\n' +
  '    }\n' +
  '  } catch (e) {\n' +
  '    // ignore\n' +
  '  }\n' +
  '  return order\n' +
  '}\n\n' +
  'module.exports = { stackCoupons }\n'

const COUPON_FINDINGS = [
  'coupons.js: off-by-one loop bound `i <= coupons.length` reads one past the end.',
  'coupons.js: loose equality `c == undefined` instead of a strict check; also skips falsy entries.',
  'coupons.js: caller-object mutation `order.applied.push(...)` throws when `order.applied` is absent.',
  'coupons.js: swallowed catch hides every error, including the TypeError above.',
  'coupons.js: no unit test covers stackCoupons.',
]

function baseMockFilesMini() {
  return {
    'package.json': JSON.stringify({
      name: 'skopt-mock', version: '0.0.0', private: true,
      description: 'Tiny single-file JS fixture (mini) for skill-optimizer smoke runs.',
      scripts: { test: 'node --test' },
    }, null, 2) + '\n',
    'README.md': '# skopt-mock (mini)\n\nA disposable tiny fixture generated by skill-optimizer. Not real code.\n',
    'src/index.js': 'function add(a, b) {\n  return a + b\n}\n\nmodule.exports = { add }\n',
    'test/basic.test.js':
      "const test = require('node:test')\n" +
      "const assert = require('node:assert')\n" +
      "const { add } = require('../src/index.js')\n\n" +
      "test('add sums two numbers', () => {\n  assert.strictEqual(add(2, 3), 5)\n})\n",
    '.ai/agentic.config.json': JSON.stringify(agenticConfig(), null, 2) + '\n',
    '.gitignore': 'node_modules/\n',
    ...trackerFiles(),
  }
}

// The `review` flawed branch overlays several files of the TS app with a
// coherent, multi-file set of deliberately planted issues — including the
// interesting class where a dependent module (orders.ts) is NOT updated.
const REVIEW_FLAW_TYPES =
  'export type Money = { currency: string; cents: number }\n' +
  '// `kind` widened to string to "allow new coupon kinds".\n' +
  'export type Coupon = { code: string; kind: string; value: number }\n' +
  'export type OrderItem = { sku: string; unitPrice: Money; qty: number }\n' +
  'export type Order = { id: string; items: OrderItem[]; coupons: Coupon[] }\n' +
  'export type PricedOrder = {\n' +
  '  id: string\n  subtotal: Money\n  discount: Money\n  total: Money\n  appliedCoupons: string[]\n}\n'

const REVIEW_FLAW_COUPONS =
  "import type { Coupon, Money } from './types.ts'\n" +
  "import { add, money } from './money.ts'\n" +
  "import { couponDiscount } from './discount.ts'\n\n" +
  '// Reworked stacking. (No longer caps the total at the subtotal.)\n' +
  'export function stackCoupons(\n  subtotal: Money,\n  coupons: Coupon[],\n): { discount: Money; applied: string[] } {\n' +
  '  let discount = money(0, subtotal.currency)\n  const applied: string[] = []\n' +
  '  for (let i = 0; i <= coupons.length; i++) {\n    const coupon = coupons[i]\n' +
  '    if (coupon === undefined || coupon === null) continue\n' +
  '    discount = add(discount, couponDiscount(subtotal, coupon))\n    applied.push(coupon.code)\n  }\n' +
  '  return { discount, applied }\n}\n'

const REVIEW_FLAW_HANDLERS =
  "import type { Order } from '../types.ts'\n" +
  "import { priceOrder } from '../orders.ts'\n\n" +
  'export type PriceResponse =\n' +
  '  | { ok: true; total: number; currency: string; applied: string[] }\n' +
  '  | { ok: false; error: string }\n\n' +
  'export function handlePriceOrder(order: Order): PriceResponse {\n  try {\n' +
  '    const priced = priceOrder(order)\n' +
  '    return {\n      ok: true,\n      total: priced.total.cents,\n      currency: priced.total.currency,\n      applied: priced.appliedCoupons,\n    }\n' +
  "  } catch {\n    return { ok: true, total: 0, currency: 'USD', applied: [] }\n  }\n}\n"

const REVIEW_FINDINGS = [
  'src/types.ts: `Coupon.kind` widened from the `\'percent\' | \'fixed\'` union to `string`, removing the discriminated-union safety `discount.ts` relies on to stay exhaustive.',
  'src/coupons.ts: off-by-one loop bound `i <= coupons.length` reads one past the end of `coupons`.',
  'src/coupons.ts: the subtotal cap was dropped, so stacked discounts can exceed the subtotal.',
  'src/orders.ts: NOT updated for the dropped cap — `priceOrder` now produces a NEGATIVE total when stacked discounts exceed the subtotal (cross-file inconsistency).',
  'src/api/handlers.ts: the catch now swallows the error and returns `ok:true` with `total:0` instead of surfacing it.',
  'tests: no coverage was added for the new stacking behavior (negative-total / capping is untested).',
]

// Built-in scenarios. `base` selects the fixture family; `build()` returns the
// overlay ({ files?, branches?, goal?, outcomeProperties?, task? }).
const MOCK_SCENARIOS = {
  review: {
    base: 'ts',
    build: () => ({
      branches: [{
        name: 'feat/loyalty-pricing',
        commitMessage: 'feat: rework coupon stacking and widen coupon kind',
        files: {
          'src/types.ts': REVIEW_FLAW_TYPES,
          'src/coupons.ts': REVIEW_FLAW_COUPONS,
          'src/api/handlers.ts': REVIEW_FLAW_HANDLERS,
        },
        plantedFindings: REVIEW_FINDINGS,
      }],
    }),
  },
  implement: {
    base: 'ts',
    build: () => ({
      goal: 'Add currency-aware rounding to the pricing math: export a '
        + '`roundMoney` (round-half-to-even / banker\'s rounding) helper from '
        + 'src/money.ts, use it for percentage discounts in src/discount.ts and '
        + 'for line/subtotal amounts in src/orders.ts so no fractional cents leak, '
        + 'and add tests under tests/ covering the rounding. Keep `npm test` green.',
      outcomeProperties: [
        'src/money.ts exports a rounding helper (e.g. roundMoney) implementing round-half-to-even.',
        'src/discount.ts uses the rounding helper for percentage discounts (no raw Math.round leaking fractional cents).',
        'src/orders.ts applies the rounding when computing line/subtotal amounts.',
        'tests/ cover the rounding behavior and `npm test` stays green.',
        'All modules stay consistent: imports resolve and the change is threaded through every affected file.',
      ],
      task: 'Implement the currency-rounding change described in the goal across src/money.ts, src/discount.ts, and src/orders.ts, with tests. Make the edits in the working tree; do not commit or push.',
      branches: [{ name: 'task/currency-rounding', commitMessage: 'chore: scaffold currency-rounding task', files: {} }],
    }),
  },
  mini: {
    base: 'mini',
    build: () => ({
      branches: [{
        name: 'feat/coupon-stacking',
        commitMessage: 'feat: stack coupon discounts on an order',
        files: { 'src/coupons.js': COUPONS_BUGGY },
        plantedFindings: COUPON_FINDINGS,
      }],
    }),
  },
}

function baseFilesFor(kind) {
  return kind === 'mini' ? baseMockFilesMini() : baseMockFilesTS()
}

// Resolve --mock / --mock-spec / (default) into a normalized spec:
// { scenario, baseBranch, files, branches, goal, outcomeProperties, task }.
export function resolveMockSpec(opts) {
  const normBranches = (branches) => (branches || []).map((b) => ({
    name: b.name,
    commitMessage: b.commitMessage || `mock: ${b.name}`,
    files: b.files || {},
    plantedFindings: b.plantedFindings || [],
  }))
  if (opts.mockSpec) {
    const raw = readMockSpecFile(opts.mockSpec)
    const base = baseFilesFor(raw.base || 'ts')
    return {
      scenario: raw.name || `spec:${path.basename(opts.mockSpec)}`,
      baseBranch: 'main',
      files: { ...base, ...(raw.files || {}) },
      branches: normBranches(raw.branches),
      goal: raw.goal || null,
      outcomeProperties: raw.outcomeProperties || [],
      task: raw.task || null,
    }
  }
  const scenarioName = opts.mock || 'review'
  const scenario = MOCK_SCENARIOS[scenarioName]
  if (!scenario) fail(`unknown --mock scenario '${scenarioName}'. Built-in: ${Object.keys(MOCK_SCENARIOS).join(', ')}`)
  const s = scenario.build()
  return {
    scenario: scenarioName,
    baseBranch: 'main',
    files: { ...baseFilesFor(scenario.base), ...(s.files || {}) },
    branches: normBranches(s.branches),
    goal: s.goal || null,
    outcomeProperties: s.outcomeProperties || [],
    task: s.task || null,
  }
}

// Read + validate a user --mock-spec file. Fails with a clear message on a bad
// shape.
function readMockSpecFile(specPath) {
  const resolved = path.resolve(specPath)
  if (!existsSync(resolved)) fail(`--mock-spec file not found: ${resolved}`)
  let raw
  try { raw = JSON.parse(readFileSync(resolved, 'utf8')) } catch (e) { fail(`--mock-spec is not valid JSON: ${e.message}`) }
  const err = validateMockSpec(raw)
  if (err) fail(`--mock-spec invalid: ${err}`)
  return raw
}

// Returns an error string, or null when the spec is well-formed.
export function validateMockSpec(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'top level must be an object'
  const isStrMap = (o) => o && typeof o === 'object' && !Array.isArray(o) && Object.entries(o).every(([k, v]) => typeof k === 'string' && typeof v === 'string')
  const isStrArr = (a) => Array.isArray(a) && a.every((s) => typeof s === 'string')
  if (raw.files !== undefined && !isStrMap(raw.files)) return '"files" must be an object mapping path -> string content'
  if (raw.goal !== undefined && typeof raw.goal !== 'string') return '"goal" must be a string'
  if (raw.task !== undefined && typeof raw.task !== 'string') return '"task" must be a string'
  if (raw.name !== undefined && typeof raw.name !== 'string') return '"name" must be a string'
  if (raw.base !== undefined && raw.base !== 'ts' && raw.base !== 'mini') return '"base" must be "ts" or "mini"'
  if (raw.outcomeProperties !== undefined && !isStrArr(raw.outcomeProperties)) return '"outcomeProperties" must be an array of strings'
  if (raw.branches === undefined) return '"branches" is required (an array of { name, files?, commitMessage?, plantedFindings? })'
  if (!Array.isArray(raw.branches) || raw.branches.length === 0) return '"branches" must be a non-empty array'
  const seen = new Set()
  for (let i = 0; i < raw.branches.length; i++) {
    const b = raw.branches[i]
    const at = `branches[${i}]`
    if (!b || typeof b !== 'object' || Array.isArray(b)) return `${at} must be an object`
    if (typeof b.name !== 'string' || !b.name.trim()) return `${at}.name must be a non-empty string`
    if (/\s/.test(b.name)) return `${at}.name must not contain whitespace (got '${b.name}')`
    if (seen.has(b.name)) return `duplicate branch name '${b.name}'`
    seen.add(b.name)
    if (b.files !== undefined && !isStrMap(b.files)) return `${at}.files must be an object mapping path -> string content`
    if (b.commitMessage !== undefined && typeof b.commitMessage !== 'string') return `${at}.commitMessage must be a string`
    if (b.plantedFindings !== undefined && (!Array.isArray(b.plantedFindings) || b.plantedFindings.some((f) => typeof f !== 'string'))) return `${at}.plantedFindings must be an array of strings`
  }
  return null
}

// Materialize a resolved mock spec into `sandbox` as a git repo: base files on
// `main`, then one branch per scenario branch. Leaves the checkout on the last
// branch (the scenario branch under review). Returns the manifest object.
export function generateMockRepo(sandbox, spec) {
  mkdirSync(sandbox, { recursive: true })
  writeFiles(sandbox, spec.files)
  gitInit(sandbox)
  gitCommitAll(sandbox, 'chore: mock base project')

  const branches = []
  for (const b of spec.branches) {
    run('git', ['-C', sandbox, 'checkout', '--quiet', '-b', b.name, spec.baseBranch])
    const hasFiles = b.files && Object.keys(b.files).length > 0
    if (hasFiles) {
      writeFiles(sandbox, b.files)
      gitCommitAll(sandbox, b.commitMessage)
    }
    // A branch with no files stays even with base — the skill's own edits become
    // the diff (used by the `implement` scenario).
    branches.push({ name: b.name, commitMessage: b.commitMessage, plantedFindings: b.plantedFindings })
  }

  const manifest = {
    scenario: spec.scenario,
    baseBranch: spec.baseBranch,
    goal: spec.goal || null,
    task: spec.task || null,
    outcomeProperties: spec.outcomeProperties || [],
    branches,
  }
  // Keep the manifest in the sandbox but out of git, so it never shows up in the
  // diff the skill reviews.
  writeFileSync(path.join(sandbox, '.mock-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  const excludePath = path.join(sandbox, '.git', 'info', 'exclude')
  if (existsSync(path.dirname(excludePath))) writeFileSync(excludePath, '.mock-manifest.json\n')
  return manifest
}

function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files || {})) {
    if (rel.includes('..') || path.isAbsolute(rel)) throw new Error(`unsafe mock file path: ${rel}`)
    const dest = path.join(root, rel)
    mkdirSync(path.dirname(dest), { recursive: true })
    writeFileSync(dest, content)
  }
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function runPrompt(skillName, task, repoContext) {
  return `You are evaluating the "${skillName}" Claude Code skill in a sandbox.

SANDBOX RULES — non-negotiable:
- NEVER commit, push, or create/switch branches for real.
- NEVER create, edit, comment on, close, or label any issue or PR, and NEVER
  call \`gh\` or any tracker mutation. Describe what you WOULD do instead.
- This sandbox has no git remote and no tracker token on purpose. Treat every
  outbound/mutating action as "describe, do not perform".
- You MAY edit files in the working tree when the skill's job is to produce a
  code change — those edits are the work product we measure. Just do NOT commit,
  push, or switch/create branches. Leave the changes uncommitted in the tree.
${repoContext ? `\nREPO CONTEXT:\n${repoContext}\n` : ''}
TASK for this run:
${task}

HOW TO RUN:
1. Invoke the "${skillName}" skill and follow its workflow for the task above,
   honoring the sandbox rules (simulate any step that would push/commit/mutate a
   tracker; actually make code edits in the working tree when the skill implements a change).
2. Emit a marker as its OWN message segment at the moment each step starts and
   ends — print the BEGIN line, THEN do the step's work (tool calls), THEN print
   the END line. Never batch markers or emit them retroactively at the end.
     SKILL_STEP_BEGIN <n> | <short step title>
     ... do the step (its tool calls happen here) ...
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

// A compact textual summary of a run for the scoring/analysis prompts.
function runSummary(metrics) {
  const steps = (metrics.steps || []).map((s) => `  ${s.n}. ${s.title} — ${s.outcome}`).join('\n')
  const trace = metrics.skillTrace ? JSON.stringify(metrics.skillTrace, null, 2) : '(none)'
  return `STEP MARKERS:\n${steps || '  (none emitted)'}\n\nSKILL_TRACE:\n${trace}\n\nFINAL OUTPUT:\n${(metrics.resultText || '').slice(0, 6000)}`
}

function analysisPrompt({ skillName, runModel, cheapTarget, metrics, quality, skillMd, refsList }) {
  const cheapBias = cheapTarget ? `

THIS SKILL IS BEING OPTIMIZED TO RUN ON \`${runModel}\`, a SMALLER/CHEAPER model
than the one analyzing it. Your PRIMARY objective is to make the skill text
robust and DIRECT enough that \`${runModel}\` executes it correctly — fixing what
the measured run got wrong or failed to do — NOT to trim tokens. Bias every edit
toward directness: explicit numbered imperatives, concrete pass/fail criteria
instead of judgment calls, no reliance on implicit repo knowledge, tighter step
scoping, and pre-answered edge cases. Token/latency trims are strictly secondary
and must never come at the cost of correctness.` : `

This skill is being optimized to run on \`${runModel}\`. Tailor edits to that
model's strengths and failure modes.`
  return `You are optimizing the "${skillName}" Claude Code skill.${cheapBias}

Below is the measured run of the CURRENT version, its QUALITY report, and its
SKILL.md. Propose concrete SKILL.md (or references) edits. Prioritize, in order:
(1) fix anything the QUALITY report shows \`${runModel}\` got wrong or skipped
(missed findings, skipped/misordered steps, rule violations, degraded outcome);
(2) remove genuine ambiguity; (3) only then trim redundancy/tokens.

Hard constraints on any proposed SKILL.md edit:
- Keep the YAML frontmatter with a "name:" (== "${skillName}") and a "description:" line.
- Keep the body (everything after the closing ---) under 20000 bytes.
- Never remove safety/dry-run/claim-lock behavior or a real workflow step; make
  wording more direct, not thinner.
- Do NOT optimize for sandbox quirks — proposed changes must be correct in real
  environments (explicit fallbacks are fine; weakening tracker integration or
  removing steps because "the sandbox denied it" is not).

MEASURED METRICS (metrics.json):
${JSON.stringify({ ...metrics, resultText: undefined }, null, 2)}

QUALITY REPORT for this run:
${JSON.stringify(quality, null, 2)}

RUN SUMMARY:
${runSummary(metrics)}

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
  "qualityFixes": ["edits aimed at what the run got wrong"],
  "proposedChanges": [
    {"file": "SKILL.md", "rationale": "why", "newContent": "FULL new file contents"}
  ],
  "expectedImpact": "one paragraph"
}
Only propose changes to files that exist (SKILL.md or a listed references/ file).
"newContent" must be the COMPLETE new file, not a diff. If nothing is worth
changing, return an empty proposedChanges array.`
}

// Quality-scoring prompt. The model returns lists (caught/missed/hallucinated
// findings, step completion, rule violations, and — for code-modifying runs — an
// outcome verdict); JS computes the numeric score deterministically.
function qualityPrompt({ skillName, skillMd, metrics, manifest, goal, workproductDiff, baselineWorkproduct }) {
  const planted = manifest && manifest.branches
    ? manifest.branches.flatMap((b) => b.plantedFindings || []) : []
  const outcomeProps = manifest ? (manifest.outcomeProperties || []) : []
  const codeMod = Boolean(workproductDiff && workproductDiff.trim())
  const outcomeBlock = codeMod ? `

This run MODIFIED CODE. Also score the work product.
GOAL: ${goal || '(the task above)'}
${outcomeProps.length ? `REQUIRED OUTCOME PROPERTIES:\n${outcomeProps.map((p) => `  - ${p}`).join('\n')}` : ''}

CANDIDATE WORK PRODUCT (git diff):
<<<CANDIDATE_DIFF
${(workproductDiff || '').slice(0, 12000)}
CANDIDATE_DIFF
${baselineWorkproduct ? `\nBASELINE WORK PRODUCT (git diff) to compare against:\n<<<BASELINE_DIFF\n${baselineWorkproduct.slice(0, 12000)}\nBASELINE_DIFF` : ''}

Judge whether the candidate change still achieves the goal and is behaviorally
equivalent to (or better than) the baseline — were tests still written, edge
cases still handled, validation still present, or did it get shallower?` : ''
  return `You are grading how well the "${skillName}" skill run did its job. Be strict and concrete.

${planted.length ? `PLANTED FINDINGS the run SHOULD have caught (ground truth):\n${planted.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}` : '(No planted-findings ground truth — judge step completion and rule violations.)'}
${outcomeBlock}

THE SKILL'S DOCUMENTED WORKFLOW (SKILL.md) — use it to judge step completion and rule violations:
<<<SKILL_MD
${skillMd.slice(0, 12000)}
SKILL_MD

THE RUN:
${runSummary(metrics)}

Respond with ONE fenced \`\`\`json block and nothing else:
{
  "findings": {
    "caught": ["planted findings the run clearly identified"],
    "missed": ["planted findings the run did not identify"],
    "hallucinated": ["substantive issues the run claimed that are not real / not planted"]
  },
  "stepCompletion": { "expected": <int>, "completed": <int>, "skipped": ["step names skipped/aborted"], "outOfOrder": <bool> },
  "ruleViolations": ["things the run did that the skill forbids (e.g. would-have-committed, skipped the validation gate, wrong verdict shape)"],
  ${codeMod ? `"outcome": { "verdict": "equivalent|improved|degraded", "specifics": ["concrete notes on the produced code"] },` : ''}
  "summary": "one or two sentences"
}
If a category is empty, use an empty array. Only list findings actually present in the run's output.`
}

// Cross-model comparison prompt: diffs the final candidate's runs across models.
function comparisonPrompt({ skillName, goal, entries }) {
  const blocks = entries.map((e) => `### model \`${e.model}\`
metrics: steps=${e.metrics.stepCount} toolCalls=${e.metrics.toolCallsTotal} tokensIn=${e.metrics.totals.tokensIn} tokensOut=${e.metrics.totals.tokensOut} wallMs=${e.metrics.totals.wallMs} cost=${e.metrics.totals.costUsd}
quality: score=${e.quality ? e.quality.score : 'n/a'} recall=${e.quality && e.quality.findings ? e.quality.recall : 'n/a'}
run summary:
${runSummary(e.metrics)}
${e.workproductDiff && e.workproductDiff.trim() ? `work product (diff):\n<<<DIFF\n${e.workproductDiff.slice(0, 8000)}\nDIFF` : ''}`).join('\n\n')
  return `You are comparing how different models execute the SAME final candidate
of the "${skillName}" skill, to decide the cheapest model that runs it correctly.

GOAL / TASK: ${goal || '(skill workflow dry-run)'}

RUNS (one per model):
${blocks}

Diff the runs: where did the simpler/cheaper model diverge from the stronger one
— missed findings, skipped or misordered steps, shallower analysis, wrong
conclusions, or (when work products exist) weaker/incorrect code? For each
divergence decide whether it is a SKILL-TEXT problem (fixable by making the skill
more direct/explicit) or a CAPABILITY GAP (not fixable by wording — the model is
too weak for this skill).

Respond with ONE fenced \`\`\`json block and nothing else:
{
  "divergences": [
    {"model": "<weaker model>", "what": "how it diverged", "kind": "skill-text|capability-gap", "fix": "the skill edit that would close it, or why it can't be"}
  ],
  "perModel": [{"model": "...", "verdict": "runs it correctly | degraded | fails"}],
  "recommendedMinimumModel": "the cheapest model that runs this skill at acceptable quality",
  "rationale": "one paragraph"
}`
}

// Deterministically fold a quality-model response into a scored quality object.
// Exported for unit tests.
export function finalizeQuality(raw, { hasManifest }) {
  const q = raw && typeof raw === 'object' ? raw : {}
  const f = q.findings || {}
  const caught = Array.isArray(f.caught) ? f.caught.length : 0
  const missed = Array.isArray(f.missed) ? f.missed.length : 0
  const hallucinated = Array.isArray(f.hallucinated) ? f.hallucinated.length : 0
  const sc = q.stepCompletion || {}
  const skipped = Array.isArray(sc.skipped) ? sc.skipped.length : 0
  const violations = Array.isArray(q.ruleViolations) ? q.ruleViolations.length : 0
  const outcomeVerdict = q.outcome && typeof q.outcome.verdict === 'string' ? q.outcome.verdict : null

  let recall = null
  let precision = null
  let score
  if (hasManifest && (caught + missed) > 0) {
    recall = caught / (caught + missed)
    precision = (caught + hallucinated) > 0 ? caught / (caught + hallucinated) : 1
    score = 100 * (0.7 * recall + 0.3 * precision)
  } else {
    score = 100 // no findings ground truth — start full and apply penalties
  }
  score -= 10 * violations
  score -= 5 * skipped
  if (sc.outOfOrder) score -= 5
  if (outcomeVerdict === 'degraded') score -= 25
  if (outcomeVerdict === 'improved') score += 5
  score = Math.max(0, Math.min(100, Math.round(score)))

  return {
    score,
    recall: recall === null ? null : Number(recall.toFixed(3)),
    precision: precision === null ? null : Number(precision.toFixed(3)),
    findings: { caught: f.caught || [], missed: f.missed || [], hallucinated: f.hallucinated || [] },
    stepCompletion: { expected: sc.expected ?? null, completed: sc.completed ?? null, skipped: sc.skipped || [], outOfOrder: Boolean(sc.outOfOrder) },
    ruleViolations: q.ruleViolations || [],
    outcome: q.outcome || null,
    summary: q.summary || '',
  }
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
function fmtScore(q) { return q && typeof q.score === 'number' ? `${q.score}/100` : '—' }
function fmtRecall(q) { return q && q.recall !== null && q.recall !== undefined ? `${Math.round(q.recall * 100)}%` : '—' }

// Assemble the cross-model comparison table from measured entries. Pure (no I/O)
// so it is unit-tested directly. entries: [{model, metrics, quality}].
export function buildComparisonTable(entries) {
  const L = []
  L.push('| Model | Steps | Tool calls | Tokens in | Tokens out | Cost | Wall | Quality | Recall |')
  L.push('|---|---|---|---|---|---|---|---|---|')
  for (const e of entries) {
    const m = e.metrics
    L.push(`| \`${e.model}\` | ${m.stepCount} | ${m.toolCallsTotal} | ${fmtNum(m.totals.tokensIn)} | ${fmtNum(m.totals.tokensOut)} | ${fmtCost(m.totals.costUsd)} | ${fmtMs(m.totals.wallMs)} | ${fmtScore(e.quality)} | ${fmtRecall(e.quality)} |`)
  }
  return L.join('\n')
}

function buildReport(ctx) {
  const { skillName, task, mode, models, passes, sourceLabel, shippedDir, finalDir, diffText, manifest, baseline, comparison, downshift } = ctx
  const L = []
  L.push(`# skill-optimizer report — \`${skillName}\``, '')
  L.push(`- Skill: \`${skillName}\``)
  L.push(`- Task/goal: ${task}`)
  L.push(`- Mode: \`${mode}\``)
  L.push(`- Run model (optimization target): \`${models.runModel}\``)
  L.push(`- Analysis model: \`${models.analysisModel || 'CLI default'}\``)
  if (models.baselineModel) L.push(`- Baseline model (parity bar): \`${models.baselineModel}\``)
  L.push(`- Source: \`${sourceLabel}\``)
  L.push(`- Passes: ${passes.length}`)
  L.push('')

  if (downshift) {
    L.push('## Downshift result', '')
    L.push(downshift.verdict === 'parity-reached'
      ? `✅ **Parity reached.** \`${skillName}\` runs on \`${models.runModel}\` at ${downshift.costPct}% of \`${models.baselineModel}\` cost at equal quality (run-model quality ${downshift.runQuality}/100 ≥ baseline ${downshift.baselineQuality}/100).`
      : `⚠️ **Parity NOT reached.** \`${models.runModel}\` scored ${downshift.runQuality}/100 vs the \`${models.baselineModel}\` baseline ${downshift.baselineQuality}/100. ${downshift.detail}`)
    if (comparison && comparison.recommendedMinimumModel) L.push('', `Recommended minimum model: \`${comparison.recommendedMinimumModel}\`.`)
    L.push('')
  }

  if (manifest) {
    L.push('## Mock scenario', '')
    L.push(`Scenario \`${manifest.scenario}\` (base branch \`${manifest.baseBranch}\`).`, '')
    if (manifest.goal) L.push(`**Goal:** ${manifest.goal}`, '')
    if (manifest.outcomeProperties && manifest.outcomeProperties.length) {
      L.push('**Required outcome properties** (scored for code-modifying runs):')
      for (const p of manifest.outcomeProperties) L.push(`- ${p}`)
      L.push('')
    }
    for (const b of manifest.branches) {
      if (!b.plantedFindings || !b.plantedFindings.length) continue
      L.push(`**Planted findings on \`${b.name}\`** (judge recall against these):`)
      for (const f of b.plantedFindings) L.push(`- ${f}`)
      L.push('')
    }
  }

  L.push('## Per-pass metrics', '')
  L.push('| Pass | Model | Steps | Tool calls | Tokens in | Tokens out | Cost | Wall | Quality | Recall | Error? |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|')
  const row = (label, model, m, q) => `| ${label} | \`${model}\` | ${m.stepCount} | ${m.toolCallsTotal} | ${fmtNum(m.totals.tokensIn)} | ${fmtNum(m.totals.tokensOut)} | ${fmtCost(m.totals.costUsd)} | ${fmtMs(m.totals.wallMs)} | ${fmtScore(q)} | ${fmtRecall(q)} | ${m.isError ? 'yes' : 'no'} |`
  if (baseline) L.push(row('baseline', baseline.model, baseline.metrics, baseline.quality))
  for (const p of passes) L.push(row(String(p.index), p.model, p.metrics, p.quality))
  L.push('')

  // Quality regressions.
  const regressions = passes.filter((p) => p.qualityRegression)
  if (regressions.length) {
    L.push('> ⚠️ **Quality regression(s) detected** — the optimizer never silently accepts these:')
    for (const p of regressions) L.push(`> - Pass ${p.index} (\`${p.model}\`) scored ${p.quality?.score}/100, below the prior measured pass. The final candidate is chosen by highest quality, not lowest tokens.`)
    L.push('')
  }

  // Per-pass quality detail.
  for (const p of passes) {
    const q = p.quality
    if (!q) continue
    L.push(`### Pass ${p.index} — quality (${fmtScore(q)})`, '')
    if (q.summary) L.push(q.summary, '')
    if (q.findings) {
      const f = q.findings
      if (f.caught?.length) L.push(`**Caught (${f.caught.length}):** ${f.caught.map((x) => clip(x, 80)).join('; ')}`)
      if (f.missed?.length) L.push(`**Missed (${f.missed.length}):** ${f.missed.map((x) => clip(x, 80)).join('; ')}`)
      if (f.hallucinated?.length) L.push(`**Hallucinated (${f.hallucinated.length}):** ${f.hallucinated.map((x) => clip(x, 80)).join('; ')}`)
    }
    if (q.ruleViolations?.length) L.push(`**Rule violations:** ${q.ruleViolations.map((x) => clip(x, 80)).join('; ')}`)
    if (q.stepCompletion && (q.stepCompletion.skipped?.length || q.stepCompletion.outOfOrder)) {
      L.push(`**Step completion:** ${q.stepCompletion.completed ?? '?'}/${q.stepCompletion.expected ?? '?'} completed${q.stepCompletion.skipped?.length ? `, skipped: ${q.stepCompletion.skipped.join(', ')}` : ''}${q.stepCompletion.outOfOrder ? ', out of order' : ''}`)
    }
    if (q.outcome) L.push(`**Outcome equivalence:** \`${q.outcome.verdict}\`${q.outcome.specifics?.length ? ` — ${q.outcome.specifics.map((x) => clip(x, 80)).join('; ')}` : ''}`)
    L.push('')
  }

  // Step breakdowns.
  for (const p of passes) {
    L.push(`### Pass ${p.index} — step breakdown${p.metrics.markersBatched ? ' (markers batched — per-step attribution redistributed)' : ''}`, '')
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
      for (const key of ['qualityFixes', 'bottlenecks', 'redundantWork', 'ambiguities']) {
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

  if (comparison) {
    L.push('## Model comparison', '')
    L.push(`Final candidate measured under: ${comparison.entries.map((e) => `\`${e.model}\``).join(', ')}.`, '')
    L.push(buildComparisonTable(comparison.entries), '')
    if (comparison.analysis) {
      const a = comparison.analysis
      if (a.divergences?.length) {
        L.push('**Where cheaper models diverged:**')
        for (const d of a.divergences) L.push(`- \`${d.model}\` — ${d.what} _(${d.kind})_${d.fix ? `: ${d.fix}` : ''}`)
        L.push('')
      }
      if (a.recommendedMinimumModel) L.push(`**Recommended minimum model:** \`${a.recommendedMinimumModel}\` — ${a.rationale || ''}`, '')
    }
  }

  L.push(`## Final candidate diff vs shipped skill — optimized for \`${models.runModel}\``, '')
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

// Rough capability ordering so we can tell a "downshift" (cheaper run model than
// analysis/baseline) from an upshift. Unknown ids sort in the middle.
function modelRank(name) {
  if (!name) return 2
  const n = name.toLowerCase()
  if (n.includes('haiku')) return 1
  if (n.includes('sonnet')) return 2
  if (n.includes('opus')) return 3
  return 2
}

// Build the --open-pr body: run config + metrics + quality + what changed +
// downshift verdict + caveats. Mirrors the PR #32 live-run comment format.
function buildPrBody({ skillName, models, mode, sourceLabel, passes, baseline, downshift, comparison, manifest, lintOk, lintOutput, retargetNote }) {
  const L = []
  L.push(`🧬 **Optimizer candidate for \`${skillName}\`, tuned for \`${models.runModel}\`.**`, '')
  L.push('Produced by `scripts/skill-optimizer.mjs` — a blind optimizer run. Review the diff and the evidence below.', '')
  if (retargetNote) L.push(`> ${retargetNote}`, '')
  if (!lintOk) {
    L.push('> ⚠️ **DRAFT — `scripts/lint.sh` fails on this candidate.** Do not merge until fixed. Output:', '')
    L.push('```', (lintOutput || '').trim().slice(0, 2000), '```', '')
  }
  L.push('## Run config', '')
  L.push(`- Run model (target): \`${models.runModel}\``)
  L.push(`- Analysis model: \`${models.analysisModel || 'CLI default'}\``)
  if (models.baselineModel) L.push(`- Baseline model: \`${models.baselineModel}\``)
  L.push(`- Mode: \`${mode}\`  |  Source: \`${sourceLabel}\`  |  Passes: ${passes.length}`)
  L.push('')
  if (downshift) {
    L.push('## Downshift verdict', '')
    L.push(downshift.verdict === 'parity-reached'
      ? `✅ Parity reached — runs on \`${models.runModel}\` at ${downshift.costPct}% of \`${models.baselineModel}\` cost at equal quality (${downshift.runQuality}/100 ≥ ${downshift.baselineQuality}/100).`
      : `⚠️ Parity not reached — \`${models.runModel}\` ${downshift.runQuality}/100 vs \`${models.baselineModel}\` ${downshift.baselineQuality}/100. ${downshift.detail}`)
    L.push('')
  }
  L.push('## Per-pass metrics', '')
  L.push('| Pass | Model | Steps | Tool calls | Tokens in | Tokens out | Cost | Wall | Quality | Recall |')
  L.push('|---|---|---|---|---|---|---|---|---|---|')
  const r = (label, model, m, q) => `| ${label} | \`${model}\` | ${m.stepCount} | ${m.toolCallsTotal} | ${fmtNum(m.totals.tokensIn)} | ${fmtNum(m.totals.tokensOut)} | ${fmtCost(m.totals.costUsd)} | ${fmtMs(m.totals.wallMs)} | ${fmtScore(q)} | ${fmtRecall(q)} |`
  if (baseline) L.push(r('baseline', baseline.model, baseline.metrics, baseline.quality))
  for (const p of passes) L.push(r(String(p.index), p.model, p.metrics, p.quality))
  L.push('')
  if (manifest) {
    const last = passes[passes.length - 1]
    const q = last && last.quality
    if (q && q.findings) {
      L.push('## Finding recall (final pass vs mock manifest)', '')
      L.push(`Recall ${fmtRecall(q)} — caught ${q.findings.caught?.length || 0}, missed ${q.findings.missed?.length || 0}, hallucinated ${q.findings.hallucinated?.length || 0}.`, '')
      if (q.findings.missed?.length) { L.push('Missed:'); for (const x of q.findings.missed) L.push(`- ${x}`); L.push('') }
    }
  }
  const changed = passes.filter((p) => p.analysis && (p.appliedChanges?.length || p.analysis.qualityFixes?.length))
  if (changed.length) {
    L.push('## What the analysis proposed and why', '')
    for (const p of changed) {
      if (p.analysis.expectedImpact) L.push(`**Pass ${p.index} → ${p.index + 1}:** ${p.analysis.expectedImpact}`)
      for (const c of p.appliedChanges || []) L.push(`- \`${c.file}\` — ${c.rationale}`)
      L.push('')
    }
  }
  if (comparison && comparison.analysis && comparison.analysis.recommendedMinimumModel) {
    L.push('## Model comparison', '')
    L.push(`Recommended minimum model: \`${comparison.analysis.recommendedMinimumModel}\`. ${comparison.analysis.rationale || ''}`, '')
  }
  L.push('## Caveats', '')
  L.push('- Measurement is noisy (caching, tool latency); trust trends and structural changes over small deltas.')
  L.push('- Per-step attribution is approximate; run totals and cost come from the run `result` event and are exact.')
  L.push('- The full `report.md` (with the candidate diff) is attached as a comment when it does not fit here.')
  L.push('')
  L.push('🤖 Generated with [Claude Code](https://claude.com/claude-code)')
  return L.join('\n')
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) { console.log(USAGE); return }

  if (opts.parseFixture) {
    const raw = readFileSync(opts.parseFixture, 'utf8').split('\n')
    console.log(JSON.stringify(parseTranscript(raw), null, 2))
    return
  }

  if (opts.genMock) {
    // Hidden: generate a mock repo (no claude call) so tests can verify it.
    const spec = resolveMockSpec(opts)
    const manifest = generateMockRepo(path.resolve(opts.genMock), spec)
    console.log(JSON.stringify(manifest, null, 2))
    return
  }

  if (!opts.skill) fail('--skill <name> is required')
  if (!Number.isInteger(opts.passes) || opts.passes < 1) fail('--passes must be a positive integer')
  const shippedDir = path.join(repoRoot, 'skills', opts.skill)
  if (!existsSync(path.join(shippedDir, 'SKILL.md'))) fail(`skill not found: skills/${opts.skill}/SKILL.md`)

  const mode = opts.mode || ((process.env.ANTHROPIC_API_KEY && process.env.CI === 'true') ? 'api' : 'cli')
  if (!['cli', 'api'].includes(mode)) fail(`--mode must be cli or api (got ${mode})`)
  if (mode === 'api' && !process.env.ANTHROPIC_API_KEY) fail('--mode api requires ANTHROPIC_API_KEY in the environment')

  let models
  try { models = resolveModels(opts) } catch (e) { fail(String(e)) }

  // --open-pr writes the collection repo; refuse on a dirty tree up front.
  if (opts.openPr) {
    const dirty = run('git', ['-C', repoRoot, 'status', '--porcelain']).trim()
    if (dirty) fail('--open-pr requires a clean working tree in the collection repo (commit or stash first)')
  }

  // Evaluation source: real-repo copy vs generated mock. Default = mock.
  if (opts.targetRepo && (opts.mockGiven || opts.mockSpec)) fail('--target-repo is mutually exclusive with --mock / --mock-spec')
  if (opts.mockGiven && opts.mockSpec) fail('--mock and --mock-spec are mutually exclusive (a spec names its own scenario)')
  let source
  let mockSpec = null
  let sourceLabel
  if (opts.targetRepo) {
    const targetRepo = path.resolve(opts.targetRepo)
    if (!existsSync(targetRepo)) fail(`--target-repo does not exist: ${targetRepo}`)
    source = { type: 'repo', path: targetRepo }
    sourceLabel = `repo copy: ${targetRepo}`
  } else {
    mockSpec = resolveMockSpec(opts)
    source = { type: 'mock', spec: mockSpec }
    sourceLabel = `mock: ${mockSpec.scenario}`
  }

  const goal = opts.task || (mockSpec && mockSpec.goal) || null
  const mockBranch = mockSpec && mockSpec.branches.length ? mockSpec.branches[mockSpec.branches.length - 1] : null
  const isImplement = Boolean(mockSpec && mockSpec.goal)
  const repoContext = mockSpec
    ? `This is a generated MOCK evaluation repo (not real code). Base branch: `
      + `\`${mockSpec.baseBranch}\`. The current checkout is branch `
      + `\`${mockBranch ? mockBranch.name : mockSpec.baseBranch}\`. A configured `
      + `pipeline (.ai/agentic.config.json, npm test) is present; treat any tracker `
      + `issue/PR reference as hypothetical and describe what you would do. `
      + (isImplement
        ? `This is an IMPLEMENTATION task: make the code changes in the working tree (do not commit/push).`
        : `Its changes vs \`${mockSpec.baseBranch}\` are the material to evaluate.`)
    : null

  const task = opts.task
    || (mockSpec && mockSpec.task)
    || (mockSpec && mockSpec.goal)
    || (mockSpec
      ? `Run this skill's workflow against the current branch's changes vs ${mockSpec.baseBranch}. Do not commit/push; describe what you would do.`
      : `Run this skill's workflow against this repository on a trivial example (do not commit/push; describe what you would do). Keep it small.`)

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = path.resolve(opts.out || path.join(repoRoot, '.ai', 'analysis', 'skill-optimizer', `${opts.skill}-${ts}`))
  mkdirSync(outDir, { recursive: true })

  console.error(`skill-optimizer: skill=${opts.skill} passes=${opts.passes} mode=${mode}`)
  console.error(`  run model   : ${models.runModel}   analysis: ${models.analysisModel || 'CLI default'}${models.baselineModel ? `   baseline: ${models.baselineModel}` : ''}`)
  console.error(`  source      : ${sourceLabel}`)
  console.error(`  artifacts   : ${outDir}`)

  let manifest = null

  // One measurement: run the skill under `model` from `skillDir`, capture the
  // trace + work product, and score quality (against the mock manifest / goal).
  const measure = async (label, skillDir, model, referenceWorkproduct) => {
    const passDir = path.join(outDir, label)
    mkdirSync(passDir, { recursive: true })
    cpSync(skillDir, path.join(passDir, 'skill-candidate'), { recursive: true })
    const built = makeSandbox(opts.skill, skillDir, source)
    if (built.manifest) manifest = built.manifest
    const prompt = runPrompt(opts.skill, task, repoContext)
    writeFileSync(path.join(passDir, 'run-prompt.txt'), prompt)
    const transcriptPath = path.join(passDir, 'transcript.jsonl')

    let metrics
    let workproductDiff = ''
    try {
      const lines = await runSkillHeadless({ prompt, cwd: built.sandbox, model, mode, transcriptPath })
      metrics = parseTranscript(lines)
      workproductDiff = captureWorkproduct(built.sandbox)
    } catch (err) {
      console.error(`  run failed: ${err.message}`)
      metrics = { steps: [], totals: { tokensIn: null, tokensOut: null, costUsd: null, wallMs: null }, skillTrace: null, stepCount: 0, toolCallsTotal: 0, markersBatched: false, isError: true, error: err.message, resultText: null }
    } finally {
      rmSync(built.sandbox, { recursive: true, force: true })
    }
    writeFileSync(path.join(passDir, 'metrics.json'), JSON.stringify(metrics, null, 2))
    writeFileSync(path.join(passDir, 'workproduct.diff'), workproductDiff)
    writeFileSync(path.join(passDir, 'outcome.txt'), metrics.resultText || '')

    const skillMd = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8')
    const hasFindings = Boolean(manifest && manifest.branches && manifest.branches.some((b) => b.plantedFindings && b.plantedFindings.length))
    let quality = null
    try {
      const qPrompt = qualityPrompt({ skillName: opts.skill, skillMd, metrics, manifest, goal: goal || task, workproductDiff, baselineWorkproduct: referenceWorkproduct })
      writeFileSync(path.join(passDir, 'quality-prompt.txt'), qPrompt)
      const raw = analyzeHeadless({ prompt: qPrompt, model: models.analysisModel, mode })
      quality = finalizeQuality(raw, { hasManifest: hasFindings })
    } catch (err) {
      console.error(`  quality scoring failed: ${err.message}`)
      quality = { score: null, error: err.message }
    }
    writeFileSync(path.join(passDir, 'quality.json'), JSON.stringify(quality, null, 2))

    const t = metrics.totals
    console.error(`  [${label} / ${model}] steps=${metrics.stepCount} tools=${metrics.toolCallsTotal} tokIn=${fmtNum(t.tokensIn)} cost=${fmtCost(t.costUsd)} wall=${fmtMs(t.wallMs)} quality=${fmtScore(quality)}${metrics.markersBatched ? ' (markers batched)' : ''}`)
    return { label, model, metrics, quality, workproductDiff, skillDir, passDir }
  }

  // Candidate for pass 1 = the shipped skill.
  let candidateDir = path.join(outDir, 'candidate-current')
  cpSync(shippedDir, candidateDir, { recursive: true })

  // Optional baseline: measure the SHIPPED skill under the (stronger) baseline
  // model — its quality becomes the downshift parity bar.
  let baseline = null
  if (models.baselineModel) {
    console.error(`\n=== Baseline: shipped skill under ${models.baselineModel} ===`)
    baseline = await measure('baseline', candidateDir, models.baselineModel, null)
  }

  const strongerRank = Math.max(modelRank(models.analysisModel), models.baselineModel ? modelRank(models.baselineModel) : 0)
  const cheapTarget = modelRank(models.runModel) < strongerRank

  const passes = []
  let reference = baseline ? baseline.workproductDiff : null

  for (let i = 1; i <= opts.passes; i++) {
    console.error(`\n=== Pass ${i}/${opts.passes}: measure under ${models.runModel} ===`)
    const rec = await measure(`pass-${i}`, candidateDir, models.runModel, reference)
    if (i === 1 && !baseline) reference = rec.workproductDiff

    const passRecord = { index: i, model: models.runModel, metrics: rec.metrics, quality: rec.quality, workproductDiff: rec.workproductDiff, skillDir: rec.skillDir, passDir: rec.passDir, analysis: null, appliedChanges: [], rejectedChanges: [], qualityRegression: false }
    const prev = passes[passes.length - 1]
    if (prev && prev.quality && prev.quality.score != null && rec.quality && rec.quality.score != null && rec.quality.score < prev.quality.score) {
      passRecord.qualityRegression = true
      console.error(`  ⚠️ quality regression: ${rec.quality.score} < ${prev.quality.score} (previous pass)`)
    }
    passes.push(passRecord)

    // Optimization round (not after the final pass).
    if (i < opts.passes) {
      console.error(`=== Pass ${i}: analyze + optimize (${models.analysisModel || 'CLI default'}${cheapTarget ? ', cheap-target directness bias' : ''}) ===`)
      const skillMd = readFileSync(path.join(candidateDir, 'SKILL.md'), 'utf8')
      const refsList = listRefs(candidateDir)
      const aPrompt = analysisPrompt({ skillName: opts.skill, runModel: models.runModel, cheapTarget, metrics: rec.metrics, quality: rec.quality, skillMd, refsList })
      writeFileSync(path.join(rec.passDir, 'analysis-prompt.txt'), aPrompt)
      let analysis
      try {
        analysis = analyzeHeadless({ prompt: aPrompt, model: models.analysisModel, mode })
      } catch (err) {
        console.error(`  analysis failed: ${err.message} — carrying candidate forward unchanged`)
        analysis = { bottlenecks: [], redundantWork: [], ambiguities: [], qualityFixes: [], proposedChanges: [], expectedImpact: `analysis failed: ${err.message}` }
      }
      writeFileSync(path.join(rec.passDir, 'analysis.json'), JSON.stringify(analysis, null, 2))
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

  // Final candidate = the highest-quality measured version (never silently ship
  // a candidate that regressed quality for the sake of tokens). Ties → latest.
  const scored = passes.filter((p) => p.quality && p.quality.score != null)
  let finalPass = passes[passes.length - 1]
  if (scored.length) {
    const maxScore = Math.max(...scored.map((p) => p.quality.score))
    finalPass = [...scored].reverse().find((p) => p.quality.score === maxScore)
  }
  const finalCandidateDir = finalPass.skillDir
  const finalDir = path.join(outDir, 'final-candidate')
  cpSync(finalCandidateDir, finalDir, { recursive: true })
  const diffText = spawnSync('diff', ['-ru', shippedDir, finalDir], { encoding: 'utf8' }).stdout || ''

  // Cross-model comparison of the FINAL candidate (required when requested).
  let comparison = null
  if (models.compareModels && models.compareModels.length) {
    const entries = []
    for (const m of models.compareModels) {
      console.error(`\n=== Compare: final candidate under ${m} ===`)
      const rec = await measure(`compare-${m}`, finalCandidateDir, m, reference)
      entries.push({ model: m, metrics: rec.metrics, quality: rec.quality, workproductDiff: rec.workproductDiff })
    }
    let analysis = null
    try {
      const cPrompt = comparisonPrompt({ skillName: opts.skill, goal: goal || task, entries })
      writeFileSync(path.join(outDir, 'comparison-prompt.txt'), cPrompt)
      analysis = analyzeHeadless({ prompt: cPrompt, model: models.analysisModel, mode })
    } catch (err) {
      console.error(`  comparison analysis failed: ${err.message}`)
    }
    comparison = { entries, analysis }
    const cmL = [`# Model comparison — \`${opts.skill}\``, '', buildComparisonTable(entries), '']
    if (analysis) {
      if (analysis.divergences?.length) {
        cmL.push('## Where cheaper models diverged', '')
        for (const d of analysis.divergences) cmL.push(`- \`${d.model}\` — ${d.what} _(${d.kind})_${d.fix ? `: ${d.fix}` : ''}`)
        cmL.push('')
      }
      if (analysis.recommendedMinimumModel) cmL.push(`**Recommended minimum model:** \`${analysis.recommendedMinimumModel}\` — ${analysis.rationale || ''}`, '')
    }
    writeFileSync(path.join(outDir, 'comparison.md'), cmL.join('\n'))
  }

  // Downshift verdict when a baseline parity bar was measured.
  let downshift = null
  if (baseline) {
    const runQ = finalPass.quality ? finalPass.quality.score : null
    const baseQ = baseline.quality ? baseline.quality.score : null
    const parity = runQ != null && baseQ != null && runQ >= baseQ
    const baseCost = baseline.metrics.totals.costUsd
    const runCost = finalPass.metrics.totals.costUsd
    const costPct = (baseCost && runCost != null) ? Math.round((runCost / baseCost) * 100) : null
    const missed = finalPass.quality && finalPass.quality.findings ? finalPass.quality.findings.missed || [] : []
    downshift = {
      verdict: parity ? 'parity-reached' : 'parity-not-reached',
      runQuality: runQ, baselineQuality: baseQ, costPct,
      detail: parity ? '' : `${missed.length ? `Still missing: ${missed.slice(0, 3).join('; ')}. ` : ''}${comparison && comparison.analysis && comparison.analysis.recommendedMinimumModel ? `Recommended minimum model: ${comparison.analysis.recommendedMinimumModel}.` : 'See per-pass quality for what still fails.'}`,
    }
  }

  if (manifest) writeFileSync(path.join(outDir, 'mock-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

  const report = buildReport({
    skillName: opts.skill, task, mode, models, sourceLabel, passes, baseline,
    shippedDir, finalDir, diffText, manifest, comparison, downshift,
  })
  writeFileSync(path.join(outDir, 'report.md'), report)
  console.error(`\nReport: ${path.join(outDir, 'report.md')}`)

  if (opts.openPr) {
    await openPullRequest({
      skillName: opts.skill, models, mode, sourceLabel, passes, baseline,
      downshift, comparison, manifest, finalDir, reportText: report, outDir,
    })
  } else if (opts.applyFinal) {
    rmSync(shippedDir, { recursive: true, force: true })
    cpSync(finalDir, shippedDir, { recursive: true })
    console.error(`--apply-final: copied final candidate over skills/${opts.skill}/`)
  } else {
    console.error(`Review the report and diff, then re-run with --apply-final or --open-pr to adopt skills/${opts.skill}/.`)
  }
}

// Blind-run shipping: on a fresh branch in the COLLECTION repo, apply the final
// candidate over skills/<name>/, lint, commit, push, and open a PR. A candidate
// that breaks lint is still committed but the PR is opened as a DRAFT with the
// lint output quoted. Never merges; never touches any branch but the new one.
async function openPullRequest({ skillName, models, mode, sourceLabel, passes, baseline, downshift, comparison, manifest, finalDir, reportText, outDir }) {
  const branch = `optimize/${skillName}--${models.runModel}`.replace(/[^A-Za-z0-9/_.-]/g, '-')
  const origBranch = run('git', ['-C', repoRoot, 'rev-parse', '--abbrev-ref', 'HEAD']).trim()
  console.error(`\n=== --open-pr: branch ${branch} ===`)
  try {
    run('git', ['-C', repoRoot, 'checkout', '-b', branch])
  } catch (e) {
    console.error(`  could not create branch (already exists?): ${e.message}`)
    return
  }
  // Apply the candidate over the shipped skill.
  const target = path.join(repoRoot, 'skills', skillName)
  rmSync(target, { recursive: true, force: true })
  cpSync(finalDir, target, { recursive: true })

  // Lint the branch. A failure does not block the PR — it downgrades it to draft.
  const lint = spawnSync('bash', ['scripts/lint.sh'], { cwd: repoRoot, encoding: 'utf8' })
  const lintOk = lint.status === 0
  const lintOutput = `${lint.stdout || ''}${lint.stderr || ''}`
  console.error(`  lint: ${lintOk ? 'green' : 'FAILED (PR will be a draft)'}`)

  run('git', ['-C', repoRoot, 'add', path.join('skills', skillName)])
  const msg = `feat(${skillName}): optimizer candidate for ${models.runModel}\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  run('git', ['-C', repoRoot, '-c', 'user.email=opt@local', '-c', 'user.name=skill-optimizer', 'commit', '-m', msg, '--no-gpg-sign'])

  try {
    run('git', ['-C', repoRoot, 'push', '-u', 'origin', branch])
  } catch (e) {
    console.error(`  push failed: ${e.message}`)
    console.error(`  candidate committed on ${branch}; open a PR manually. Returning to ${origBranch}.`)
    return
  }

  const retargetNote = null
  const body = buildPrBody({ skillName, models, mode, sourceLabel, passes, baseline, downshift, comparison, manifest, lintOk, lintOutput, retargetNote })
  const bodyFile = path.join(outDir, 'pr-body.md')
  writeFileSync(bodyFile, body)
  const args = ['pr', 'create', '--base', 'main', '--head', branch, '--title', `feat(${skillName}): optimizer candidate for ${models.runModel}`, '--body-file', bodyFile]
  if (!lintOk) args.push('--draft')
  const created = spawnSync('gh', args, { cwd: repoRoot, encoding: 'utf8' })
  if (created.status !== 0) {
    console.error(`  gh pr create failed: ${(created.stderr || '').slice(0, 400)}`)
    console.error(`  branch ${branch} is pushed; open the PR manually with ${bodyFile}.`)
    return
  }
  const prUrl = (created.stdout || '').trim()
  console.error(`  PR: ${prUrl}${lintOk ? '' : ' (DRAFT — lint failed)'}`)
  // Attach the full report as a comment (it carries the candidate diff).
  const comment = spawnSync('gh', ['pr', 'comment', prUrl, '--body-file', path.join(outDir, 'report.md')], { cwd: repoRoot, encoding: 'utf8' })
  if (comment.status !== 0) console.error(`  (could not attach report comment: ${(comment.stderr || '').slice(0, 200)})`)
}

// Only drive the loop when run directly — importing (e.g. the parser test)
// must not kick off a run.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((err) => { console.error(`skill-optimizer: ${err.stack || err.message}`); process.exit(1) })
}
