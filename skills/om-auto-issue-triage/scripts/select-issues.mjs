#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync(0, 'utf8'))
const config = input.config ?? {}
const autofix = config.autofix === undefined ? {} : config.autofix
if (!autofix || typeof autofix !== 'object' || Array.isArray(autofix)) throw new Error('autofix must be an object')
const eligibility = autofix.eligibility === undefined ? {} : autofix.eligibility
if (!eligibility || typeof eligibility !== 'object' || Array.isArray(eligibility)) throw new Error('autofix.eligibility must be an object')
const label = autofix.label === undefined ? 'cez-autofix' : autofix.label
const reserved = [...(config.labels?.pipeline ?? ['review', 'changes-requested', 'qa', 'qa-failed', 'merge-queue', 'blocked', 'do-not-merge']), 'in-progress', 'ci-monitoring', 'needs-qa', 'skip-qa', 'qa-approved', 'qa-self-verified', 'automerge', 'automerge-blocked', ...(config.automerge?.label ? [config.automerge.label] : [])]
if (typeof label !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(label) || reserved.includes(label) || label.startsWith('automerge-signal-')) throw new Error('Invalid autofix.label or reserved process label')
const positive = (name, fallback) => {
  const value = input[name] !== undefined ? input[name] : eligibility[name] !== undefined ? eligibility[name] : fallback
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`)
  return value
}
const days = positive('lookbackDays', 30)
const analyzeLimit = positive('analyzeLimit', 100)
const limit = Math.min(positive('limit', 20), analyzeLimit)
const windowNumber = input.window ?? 1
if (!Number.isSafeInteger(windowNumber) || windowNumber < 1) throw new Error('window must be a positive integer')
const excluded = eligibility.excludeLabels === undefined ? ['blocked', 'do-not-fix'] : eligibility.excludeLabels
if (!Array.isArray(excluded) || excluded.some(value => typeof value !== 'string' || value.length === 0)) throw new Error('excludeLabels must be an array of nonempty strings')
const now = Date.parse(input.now)
if (!Number.isFinite(now)) throw new Error('now must be an explicit timestamp')
const issues = input.issues
if (!Array.isArray(issues)) throw new Error('issues must be an array')
const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
const seen = new Set()
for (const issue of issues) {
  if (!validId(issue.issueId) || seen.has(issue.issueId)) throw new Error('Issue IDs must be unique safe native identifiers')
  seen.add(issue.issueId)
}
const gate = issue => {
  if (issue.state !== 'OPEN') return issue.state === 'CLOSED' ? 'closed' : 'state unknown'
  if (issue.isPullRequest !== false) return issue.isPullRequest === true ? 'pull request' : 'issue kind unknown'
  if (!Array.isArray(issue.labels) || issue.labels.some(value => typeof value !== 'string')) return 'labels unknown'
  if (issue.labels.includes(label)) return 'already queued'
  const excludedLabel = issue.labels.find(value => excluded.includes(value))
  if (excludedLabel) return `label ${excludedLabel}`
  if (issue.labels.includes('in-progress') || issue.claimStatus === 'active') return 'actively claimed'
  if (issue.claimStatus !== 'clear') return 'claim unknown'
  if (!Number.isFinite(Date.parse(issue.createdAt))) return 'creation time unknown'
  return null
}
const priorities = config.labels?.priority ?? ['priority-low', 'priority-medium', 'priority-high', 'priority-extreme']
const risks = config.labels?.risk ?? ['risk-low', 'risk-medium', 'risk-high']
if (![priorities, risks].every(values => Array.isArray(values) && values.every(value => typeof value === 'string'))) throw new Error('Priority and risk labels must be arrays of strings')
const priority = issue => Math.max(-1, ...issue.labels.map(value => priorities.indexOf(value)))
const risk = issue => {
  const positions = issue.labels.map(value => risks.indexOf(value)).filter(value => value >= 0)
  return positions.length ? Math.max(...positions) : (risks.indexOf('risk-medium') >= 0 ? risks.indexOf('risk-medium') + 0.5 : risks.length)
}
const rank = (left, right) => priority(right) - priority(left) || risk(left) - risk(right) || Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.issueId.localeCompare(right.issueId)
const action = input.action ?? 'select'
if (action === 'plan-apply') {
  if (!Array.isArray(input.proposalIds) || !Array.isArray(input.confirmedIds) || [...input.proposalIds, ...input.confirmedIds].some(value => !validId(value))) throw new Error('Apply needs explicit proposalIds and confirmedIds')
  const proposal = new Set(input.proposalIds)
  const current = new Map(issues.map(issue => [issue.issueId, issue]))
  const applyIds = []
  const skipped = []
  for (const issueId of new Set(input.confirmedIds)) {
    const issue = current.get(issueId)
    let reason = config.labels?.enabled === false ? 'labels disabled' : !proposal.has(issueId) ? 'not in proposal' : !issue ? 'current issue unreadable' : gate(issue)
    if (!reason && (issue.judgment?.outcome !== 'match' || typeof issue.judgment?.reason !== 'string' || !issue.judgment.reason.trim() || !Array.isArray(issue.judgment.evidence) || !issue.judgment.evidence.some(value => typeof value === 'string' && value.trim()))) reason = 'current suitability not established'
    if (reason) skipped.push({ issueId, reason })
    else applyIds.push(issueId)
  }
  process.stdout.write(JSON.stringify({ label, applyIds, skipped }) + '\n')
} else if (action === 'select') {
  if (input.issueId !== undefined && !validId(input.issueId)) throw new Error('Invalid issueId')
  const openDated = issues.filter(issue => issue.state === 'OPEN' && Number.isFinite(Date.parse(issue.createdAt)))
  const oldest = Math.min(now, ...openDated.map(issue => Date.parse(issue.createdAt)))
  const span = days * 86400000
  const start = input.fromOldest ? oldest + (windowNumber - 1) * span : now - windowNumber * span
  const end = start + span
  if (![start, end].every(value => Number.isFinite(value) && Math.abs(value) <= 8640000000000000)) throw new Error('Window exceeds supported timestamp range')
  const inWindow = issues.filter(issue => input.issueId ? issue.issueId === input.issueId : Date.parse(issue.createdAt) >= start && Date.parse(issue.createdAt) < end)
  inWindow.sort((left, right) => (input.fromOldest ? 1 : -1) * (Date.parse(left.createdAt) - Date.parse(right.createdAt)) || left.issueId.localeCompare(right.issueId))
  const analyzed = inWindow.slice(0, analyzeLimit)
  const rejected = analyzed.flatMap(issue => { const reason = gate(issue); return reason ? [{ issueId: issue.issueId, reason }] : [] })
  const eligible = analyzed.filter(issue => !gate(issue)).sort(rank)
  const queued = issues.filter(issue => issue.state === 'OPEN' && Array.isArray(issue.labels) && issue.labels.includes(label)).map(issue => issue.issueId)
  const nextWindow = !input.issueId && openDated.some(issue => input.fromOldest ? Date.parse(issue.createdAt) >= end && Date.parse(issue.createdAt) < now : Date.parse(issue.createdAt) < start)
  process.stdout.write(JSON.stringify({ label, asOf: new Date(now).toISOString(), window: windowNumber, start: new Date(start).toISOString(), end: new Date(end).toISOString(), analyzed: analyzed.length, shortlist: eligible.slice(0, limit), rejected, queued, outsideWindow: issues.length - inWindow.length, pastAnalyzeLimit: Math.max(0, inWindow.length - analyzeLimit), pastShortlist: Math.max(0, eligible.length - limit), nextWindow }) + '\n')
} else {
  throw new Error('Unknown action')
}
