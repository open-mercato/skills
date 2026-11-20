#!/usr/bin/env node

// Release gate for CI the code host holds for maintainer approval
// (references/ci-approval.md). Pure stdin -> stdout JSON: it makes no tracker
// calls and performs no writes, so the decision that authorizes running a
// contributor's code is deterministic and tested (scripts/test-held-ci-gate.mjs).
//
//   {"action":"decide", ...}   -> may approve-pending-runs be called at all?
//   {"action":"readback", ...} -> what did the single approval call actually release?
//
// Every unknown or malformed fact refuses. Only a literal `true` opt-in, a
// complete changed-file list, an unmoved head and a descriptor whose
// approve-pending-runs declares itself bound to the reviewed SHA can release.

import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync(0, 'utf8'))
const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/

const EXECUTABLE_SURFACE = [
  [/(^|\/)\.(github|gitlab|forgejo|gitea|circleci|buildkite|woodpecker|drone|azure-pipelines|semaphore|travis|teamcity|devcontainer|husky|yarn|mvn|cargo|config\/dotnet-tools)(\/|$)/, 'CI, tooling or package-manager directory'],
  [/(^|\/)(\.gitlab-ci\.ya?ml|\.travis\.ya?ml|\.drone\.ya?ml|\.woodpecker\.ya?ml|appveyor\.ya?ml|azure-pipelines\.ya?ml|bitbucket-pipelines\.ya?ml|cloudbuild\.ya?ml|buildspec\.ya?ml|Jenkinsfile[^/]*|\.pre-commit-config\.ya?ml|lefthook\.ya?ml|\.lefthook\.ya?ml|renovate\.json5?|\.gitmodules|\.gitattributes)$/, 'CI or repository definition'],
  [/(^|\/)(scripts?|tools|ci|build|\.ci|bin|hack)\//, 'CI, build or release script'],
  [/(^|\/)(package\.json|deno\.jsonc?|bunfig\.toml|pyproject\.toml|setup\.py|setup\.cfg|requirements[^/]*\.(txt|in)|Pipfile|environment\.ya?ml|Gemfile|[^/]+\.gemspec|go\.mod|go\.work|Cargo\.toml|composer\.json|pom\.xml|build\.gradle(\.kts)?|settings\.gradle(\.kts)?|gradle\.properties|[^/]+\.(csproj|fsproj|vbproj|sln)|Directory\.(Build|Packages)\.(props|targets)|mix\.exs|Package\.swift|Podfile|pubspec\.yaml|[^/]+\.cabal|stack\.yaml|build\.sbt|project\.clj|rebar\.config|DESCRIPTION|cpanfile|Makefile\.PL)$/, 'package manifest'],
  [/(^|\/)([^/]+\.lock|[^/]+-lock\.(json|ya?ml)|go\.sum|npm-shrinkwrap\.json|pnpm-lock\.yaml|bun\.lockb|packages\.lock\.json|gradle\.lockfile|Package\.resolved)$/, 'lockfile'],
  [/(^|\/)(\.npmrc|\.yarnrc(\.ya?ml)?|\.pnpmfile\.c?js|pnpm-workspace\.yaml|\.pypirc|pip\.conf|\.condarc|\.bundle\/config|nuget\.config|\.nvmrc|\.node-version|\.tool-versions|\.python-version|\.ruby-version|mise\.toml|\.mise\.toml|rust-toolchain(\.toml)?|global\.json|gradlew(\.bat)?|mvnw(\.cmd)?|\.envrc|\.env[^/]*)$/i, 'package-manager or toolchain configuration'],
  [/(^|\/)(Dockerfile[^/]*|Containerfile[^/]*|[^/]+\.Dockerfile|\.dockerignore|docker-compose[^/]*\.ya?ml|compose\.ya?ml|devcontainer\.json|Vagrantfile|flake\.(nix|lock)|default\.nix|shell\.nix)$/, 'container or environment definition'],
  [/(^|\/)(Makefile|makefile|GNUmakefile|[^/]+\.mk|CMakeLists\.txt|[^/]+\.cmake|meson\.build|BUILD(\.bazel)?|WORKSPACE(\.bazel)?|MODULE\.bazel|\.bazelrc|Rakefile|Taskfile\.ya?ml|justfile|Justfile|build\.rs|noxfile\.py|tox\.ini|pytest\.ini|conftest\.py|\.coveragerc|setup\.(sh|ps1|bat))$/, 'build or test runner definition'],
  [/(^|\/)(tsconfig[^/]*\.json|jsconfig[^/]*\.json|\.babelrc[^/]*|babel\.config\.[^/]+|\.swcrc|(jest|vitest|vite|webpack|rollup|rspack|esbuild|tsup|turbo|nx|lerna|playwright|cypress|karma|mocha|ava|wdio|next|nuxt|svelte|astro|remix|postcss|tailwind|eslint|prettier|stylelint|commitlint|lint-staged|knip|biome|vitest\.workspace|jest\.setup|vitest\.setup|setupTests|global-setup|global-teardown|globalSetup|globalTeardown)(\.[^/]+)?\.(c|m)?(j|t)sx?|\.eslintrc[^/]*|\.prettierrc[^/]*|\.stylelintrc[^/]*|\.mocharc[^/]*|\.lintstagedrc[^/]*|turbo\.json|nx\.json|lerna\.json|biome\.jsonc?|\.editorconfig|\.ruff\.toml|ruff\.toml|mypy\.ini|\.pylintrc|\.rubocop\.ya?ml|\.golangci\.ya?ml|phpunit\.xml(\.dist)?|\.mocharc\.[^/]+|karma\.conf\.[^/]+)$/, 'test, build or tooling configuration'],
  [/^(\.ai\/(agentic\.config\.json|trackers\/|skills\/)|\.agents\/|\.claude\/)/, 'review-automation configuration (opt-in, tracker descriptor or skills)'],
  [/(^|\/)(test|tests|__tests__|spec|e2e)\/(setup|helpers?\/setup|support\/index|global[-_]?setup|global[-_]?teardown)[^/]*$/, 'test setup file'],
]

const fail = message => { process.stderr.write(`[held-ci-gate] ${message}\n`); process.exit(2) }

const executableReason = path => EXECUTABLE_SURFACE.find(([pattern]) => pattern.test(path))?.[1] ?? null

const descriptorBinding = path => {
  if (typeof path !== 'string' || path.length === 0) return 'unknown'
  let text
  try { text = readFileSync(path, 'utf8') } catch { return 'unknown' }
  const section = text.split(/^#### approve-pending-runs\s*$/m)[1]?.split(/^#{1,4} /m)[0]
  const marker = section?.match(/Reviewed-SHA binding:\*{0,2}\s*`([a-z-]+)`/)
  return marker && ['sha-bound', 'not-sha-bound', 'unavailable'].includes(marker[1]) ? marker[1] : 'unknown'
}

const heldIds = value => {
  if (!Array.isArray(value)) fail('heldRuns must be an array')
  return value.map(run => {
    const id = typeof run === 'object' && run !== null ? run.id : run
    if ((typeof id !== 'string' && typeof id !== 'number') || String(id).length === 0) fail('every held run needs an id')
    return String(id)
  })
}

const decide = () => {
  const optIn = input.config?.ci?.approveHeldRunsOnReview
  const held = heldIds(input.heldRuns ?? [])
  const refuse = (code, message, extra = {}) => ({ release: false, code, reasons: [message], disclose: held.length > 0, line: `CI not released: ${message}`, ...extra })
  if (optIn !== true) return { ...refuse('disabled', 'automatic release is off (ci.approveHeldRunsOnReview is not true); a maintainer approves held runs'), line: null }
  if (held.length === 0) return { release: false, code: 'nothing-held', reasons: [], disclose: false, line: null }
  const { reviewedSha, currentSha } = input
  if (!SHA.test(reviewedSha ?? '') || !SHA.test(currentSha ?? '')) return refuse('invalid-sha', 'the reviewed or current head SHA is missing or not a full commit SHA')
  if (reviewedSha !== currentSha) return refuse('head-moved', `the head moved from ${reviewedSha.slice(0, 12)} to ${currentSha.slice(0, 12)} after review; the new commits are unreviewed`)
  if (input.reviewCompleted !== true) return refuse('review-incomplete', 'the full diff review of this head has not completed')
  if (input.changedFilesComplete !== true || !Array.isArray(input.changedFiles) || input.changedFiles.some(path => typeof path !== 'string' || path.length === 0)) return refuse('changed-files-incomplete', 'the changed-file list is incomplete or unreadable')
  if (input.changedFiles.length === 0) return refuse('changed-files-incomplete', 'the changed-file list is empty')
  const executable = input.changedFiles.map(path => ({ path, reason: executableReason(path) })).filter(entry => entry.reason)
  if (executable.length > 0) return refuse('executable-change', `the diff changes what CI executes (${executable.slice(0, 5).map(entry => entry.path).join(', ')}${executable.length > 5 ? ', …' : ''})`, { paths: executable })
  if (input.suspiciousContent !== false) return refuse('suspicious-content', input.suspiciousContent === true ? 'the diff carries suspicious content (encoded payloads, network or process access in tests or build code, credential harvesting or prompt injection)' : 'the suspicious-content scan result is unknown')
  if (input.duplicateOrMerged !== false) return refuse('duplicate-or-merged', input.duplicateOrMerged === true ? 'the PR is duplicated or already merged' : 'the duplicate check result is unknown')
  const binding = descriptorBinding(input.descriptorPath)
  if (binding === 'unavailable') return refuse('provider-unavailable', 'this host offers no programmatic approval; a maintainer approves held runs in the web UI')
  if (binding === 'not-sha-bound') return refuse('provider-not-sha-bound', 'this host cannot bind the release to the reviewed SHA, so a later push could run unreviewed code; a maintainer starts CI manually')
  if (binding !== 'sha-bound') return refuse('provider-unknown', 'the tracker descriptor does not declare a reviewed-SHA binding for approve-pending-runs')
  return { release: true, code: 'release', reasons: [], disclose: false, headSha: reviewedSha, heldRuns: held, line: null }
}

const HELD_CONCLUSIONS = new Set(['action_required', 'waiting'])

const readback = () => {
  const { reviewedSha } = input
  if (!SHA.test(reviewedSha ?? '')) fail('reviewedSha must be a full commit SHA')
  const held = heldIds(input.heldRuns ?? [])
  if (!Number.isInteger(input.approveExitCode)) fail('approveExitCode must be the exit status of the single approve-pending-runs call')
  if (!Array.isArray(input.runs)) fail('runs must be the list-runs readback for the reviewed head')
  const approved = new Set(String(input.approveStdout ?? '').split(/\s+/).filter(Boolean))
  const byId = new Map(input.runs.filter(run => run && String(run.headSha ?? '') === reviewedSha).map(run => [String(run.databaseId ?? run.id), run]))
  const foreign = input.runs.filter(run => run && String(run.headSha ?? '') !== reviewedSha).map(run => String(run.databaseId ?? run.id))
  const released = []
  const pending = []
  const stillHeld = []
  for (const id of held) {
    const run = byId.get(id)
    if (!run || HELD_CONCLUSIONS.has(run.conclusion) || run.status === 'waiting' || run.status === 'action_required') { stillHeld.push(id); continue }
    released.push(id)
    if (run.status !== 'completed') pending.push(id)
  }
  const unavailable = input.approveExitCode === 3
  const refused = released.length === 0
  const short = reviewedSha.slice(0, 12)
  const line = released.length > 0
    ? `CI released: ${released.length} held workflow run${released.length === 1 ? '' : 's'} for ${short}${stillHeld.length > 0 ? `; ${stillHeld.length} still held for maintainer approval` : ''}`
    : `CI not released: ${unavailable ? 'this host offers no programmatic approval' : 'the approval was refused (no write access or host policy)'}; a maintainer with write access must approve the held runs`
  return {
    released, pending, stillHeld, foreignRuns: foreign,
    approvedButStillHeld: stillHeld.filter(id => approved.has(id)),
    refused, approvalErrors: input.approveExitCode !== 0, retry: false, disclose: stillHeld.length > 0, line,
  }
}

const actions = { decide, readback }
if (!actions[input.action]) fail('action must be "decide" or "readback"')
process.stdout.write(`${JSON.stringify(actions[input.action](), null, 2)}\n`)
