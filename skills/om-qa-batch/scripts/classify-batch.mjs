#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync(0, 'utf8'))
const config = input.config ?? {}
const fail = message => { throw new Error(message) }
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const stringList = (value, name) => {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.length === 0)) fail(`${name} must be an array of nonempty strings`)
  return value
}
const optionalLabel = (value, name) => {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !/^[A-Za-z0-9._/: -]+$/.test(value)) fail(`${name} must be a label name or null`)
  return value
}

const policy = config.humanQaPolicy === undefined ? {} : config.humanQaPolicy
if (!isObject(policy)) fail('humanQaPolicy must be an object')
const batchConfig = config.qaBatch === undefined ? {} : config.qaBatch
if (!isObject(batchConfig)) fail('qaBatch must be an object')

const baseBranch = input.baseBranch ?? config.baseBranch
if (typeof baseBranch !== 'string' || baseBranch.length === 0) fail('baseBranch must be resolved before classification')
const batchBranch = input.batchBranch ?? null
if (batchBranch !== null && typeof batchBranch !== 'string') fail('batchBranch must be a string or null')
const gateLabel = typeof config.qaGateLabel === 'string' && config.qaGateLabel.length > 0 ? config.qaGateLabel : 'needs-qa'
const humanLane = gateLabel === 'needs-qa' ? null : gateLabel
const batchLabel = optionalLabel(policy.batchCheckLabel, 'humanQaPolicy.batchCheckLabel')
const humanPaths = stringList(policy.paths, 'humanQaPolicy.paths')
const batchPaths = stringList(policy.batchPaths, 'humanQaPolicy.batchPaths')
const uiPaths = stringList(policy.uiPaths, 'humanQaPolicy.uiPaths')
const threshold = policy.uiFileThreshold === undefined ? 0 : policy.uiFileThreshold
if (!Number.isSafeInteger(threshold) || threshold < 0) fail('humanQaPolicy.uiFileThreshold must be a nonnegative integer')
const verdictLabels = ['qa-approved', 'qa-failed', ...stringList(policy.humanVerdictLabels, 'humanQaPolicy.humanVerdictLabels')]
const selfEvidenceLabels = stringList(batchConfig.autoQaEvidenceLabels, 'qaBatch.autoQaEvidenceLabels')
const autoEvidence = selfEvidenceLabels.length > 0 ? selfEvidenceLabels : ['qa-self-verified', 'automerge-signal-2-qa']
const normalizeLogin = login => String(login ?? '').toLowerCase().replace(/^app\//, '').replace(/\[bot\]$/, '')
const trusted = new Set([...stringList(input.automationIdentities, 'automationIdentities'), ...stringList(policy.trustedTriageAuthors, 'humanQaPolicy.trustedTriageAuthors')].map(normalizeLogin))

const globToRegExp = glob => {
  let pattern = ''
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index]
    if (char === '*') {
      if (glob[index + 1] === '*') {
        index++
        if (glob[index + 1] === '/') { index++; pattern += '(?:.*/)?' } else pattern += '.*'
      } else pattern += '[^/]*'
    } else if (char === '?') pattern += '[^/]'
    else pattern += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${pattern}$`)
}
const matcher = globs => { const compiled = globs.map(globToRegExp); return path => compiled.some(regex => regex.test(path)) }
const matchesHuman = matcher(humanPaths)
const matchesBatch = matcher(batchPaths)
const matchesUi = uiPaths.length > 0 ? matcher(uiPaths) : path => /\.(tsx|jsx|vue|svelte|html|css|scss|less)$/.test(path)
const isTest = path => /(^|\/)(__tests__|__integration__|__mocks__|tests?|e2e|fixtures)\//.test(path) || /\.(test|spec)\.[a-z0-9]+$/.test(path)
const isDocsOrTooling = path => /\.(md|mdx|txt)$/.test(path) || /^(\.github|\.ai|docs?)\//.test(path)
const areaOf = path => {
  const module = path.match(/(?:^|\/)modules\/([^/]+)\//)
  if (module) return module[1]
  const pkg = path.match(/^packages\/([^/]+)\//)
  if (pkg) return pkg[1]
  return path.split('/')[0]
}

const readTriage = pr => {
  const blocks = []
  for (const comment of pr.comments ?? []) {
    if (!trusted.has(normalizeLogin(comment.author))) continue
    const match = String(comment.body ?? '').match(/<!-- qa-triage v1\s*([\s\S]*?)-->/)
    if (!match) continue
    try {
      const block = JSON.parse(match[1])
      if (pr.headSha && block.head !== pr.headSha) continue
      blocks.push({ ...block, at: comment.createdAt ?? '' })
    } catch { continue }
  }
  blocks.sort((left, right) => String(left.at).localeCompare(String(right.at)))
  return blocks.at(-1) ?? null
}

const priorityRank = labels => {
  const order = ['priority-extreme', 'priority-high', 'priority-medium', 'priority-low']
  const found = order.findIndex(name => labels.includes(name))
  return found === -1 ? order.length : found
}

const prs = input.prs
if (!Array.isArray(prs)) fail('prs must be an array')
const seen = new Set()
const buckets = { gateMissed: [], batchCheck: [], candidates: [], coveredHuman: [], coveredAuto: [], noManualQa: [], stabilization: [], otherBase: [] }

for (const pr of prs) {
  if (!Number.isSafeInteger(pr.number) || pr.number < 1) fail('every PR needs a positive integer number')
  if (seen.has(pr.number)) continue
  seen.add(pr.number)
  const labels = Array.isArray(pr.labels) ? pr.labels.map(label => typeof label === 'string' ? label : label?.name).filter(Boolean) : []
  const files = (pr.files ?? []).map(file => typeof file === 'string' ? file : file?.path).filter(Boolean)
  const productFiles = files.filter(path => !isTest(path))
  const uiFiles = productFiles.filter(matchesUi)
  const addedUiFiles = (pr.files ?? []).filter(file => typeof file === 'object' && file?.status === 'added' && matchesUi(file.path) && !isTest(file.path)).map(file => file.path)
  const areas = [...new Set(productFiles.filter(path => !isDocsOrTooling(path)).map(areaOf))].slice(0, 4)
  const triage = readTriage(pr)
  const entry = { number: pr.number, title: pr.title ?? '', url: pr.url ?? '', author: normalizeLogin(pr.author), areas, uiFiles: uiFiles.length, priority: priorityRank(labels), reasons: [] }
  const has = name => name !== null && labels.includes(name)
  const verdict = verdictLabels.find(name => labels.includes(name)) ?? null

  if (batchBranch && pr.baseRefName === batchBranch) { entry.reasons.push('stabilization fix merged into the batch'); buckets.stabilization.push(entry); continue }
  if (pr.baseRefName && pr.baseRefName !== baseBranch) { entry.reasons.push(`merged into ${pr.baseRefName}, not ${baseBranch}`); buckets.otherBase.push(entry); continue }

  if (has(humanLane)) {
    if (verdict === 'qa-failed') { entry.reasons.push(`merged with ${humanLane} and a failed human QA verdict`); buckets.gateMissed.push(entry); continue }
    if (verdict) { entry.reasons.push(`a human tester signed it off before merge (${verdict})`); buckets.coveredHuman.push(entry); continue }
    entry.reasons.push(`merged while ${humanLane} had no human verdict`)
    buckets.gateMissed.push(entry)
    continue
  }
  if (triage?.lane === 'human') { entry.reasons.push(`trusted triage put it in the human lane (rules ${(triage.rules ?? []).join(', ') || 'unspecified'}) but the gate label is missing`); buckets.gateMissed.push(entry); continue }
  if (has(batchLabel)) { entry.reasons.push(`labelled ${batchLabel}`); buckets.batchCheck.push(entry); continue }
  if (triage?.lane === 'batch') { entry.reasons.push(`trusted triage put it in the batch lane (rules ${(triage.rules ?? []).join(', ') || 'unspecified'})`); buckets.batchCheck.push(entry); continue }

  const humanHit = productFiles.find(matchesHuman)
  const batchHit = productFiles.find(matchesBatch)
  if (humanHit) entry.reasons.push(`touches a human-QA path (${humanHit})`)
  if (batchHit) entry.reasons.push(`touches a batch-check path (${batchHit})`)
  if (threshold > 0 && uiFiles.length > threshold) entry.reasons.push(`${uiFiles.length} UI files changed (safety net ${threshold})`)
  if (addedUiFiles.length > 0) entry.reasons.push(`adds UI files (${addedUiFiles.slice(0, 2).join(', ')})`)
  if (labels.includes('feature') && uiFiles.length > 0) entry.reasons.push('feature with UI changes')
  const evidence = autoEvidence.find(name => labels.includes(name)) ?? (verdict === 'qa-approved' ? 'qa-approved' : null)
  if (!evidence && labels.includes('needs-qa') && uiFiles.length > 0) entry.reasons.push('UI change with no recorded QA evidence')
  if (entry.reasons.length > 0) { entry.evidence = evidence; buckets.candidates.push(entry); continue }

  if (evidence) { entry.reasons.push(`automatic QA evidence (${evidence})`); buckets.coveredAuto.push(entry); continue }
  if (labels.includes('skip-qa')) { entry.reasons.push('skip-qa: nothing user-visible to exercise'); buckets.noManualQa.push(entry); continue }
  if (uiFiles.length === 0) { entry.reasons.push('no UI file changed; CI and the smoke cover it'); buckets.noManualQa.push(entry); continue }
  entry.reasons.push('small UI change with no lane label; agent judgment')
  buckets.candidates.push(entry)
}

const byPriority = (left, right) => left.priority - right.priority || left.number - right.number
for (const list of Object.values(buckets)) list.sort(byPriority)
const counts = Object.fromEntries(Object.entries(buckets).map(([name, list]) => [name, list.length]))
counts.total = seen.size
process.stdout.write(JSON.stringify({ baseBranch, batchBranch, gateLabel: humanLane, batchLabel, counts, buckets }, null, 2) + '\n')
