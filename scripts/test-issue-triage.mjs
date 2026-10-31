#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const helper = fileURLToPath(new URL('../skills/om-auto-issue-triage/scripts/select-issues.mjs', import.meta.url))
const now = '2026-10-31T12:00:00Z'
const issue = (issueId, values = {}) => ({ issueId, state: 'OPEN', isPullRequest: false, title: 'Actionable issue', url: `https://tracker.example/${issueId}`, createdAt: '2026-10-20T12:00:00Z', labels: [], claimStatus: 'clear', ...values })
const run = values => spawnSync(process.execPath, [helper], { encoding: 'utf8', input: JSON.stringify({ now, issues: [], ...values }) })
const good = values => { const result = run(values); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout) }
assert.equal(good({}).label, 'cez-autofix')
assert.equal(good({ config: { autofix: { label: 'custom-fix' } } }).label, 'custom-fix')
assert.equal(good({ config: { labels: { meta: ['cez-autofix', 'custom-fix'] }, autofix: { label: 'custom-fix' } } }).label, 'custom-fix')
assert.equal(good({ config: { labels: { meta: ['cez-autofix'] } } }).label, 'cez-autofix')
for (const autofix of [null, { label: null }, { eligibility: null }, { eligibility: { excludeLabels: null } }, { eligibility: { lookbackDays: null } }]) assert.notEqual(run({ config: { autofix } }).status, 0)
for (const label of ['in-progress', 'qa-approved', 'review', 'automerge-signal-1-cr', 'bad;command']) assert.notEqual(run({ config: { autofix: { label } } }).status, 0)
for (const values of [{ limit: 0 }, { analyzeLimit: -1 }, { window: 1.5 }, { config: { autofix: { eligibility: { excludeLabels: null } } }, lookbackDays: '30' }]) assert.notEqual(run(values).status, 0)
const selected = good({ issues: [issue('1'), issue('2', { labels: ['priority-high', 'risk-low'] }), issue('3', { labels: ['priority-high', 'risk-high'] }), issue('4', { labels: ['blocked'] }), issue('5', { labels: ['in-progress'] }), issue('6', { claimStatus: 'unknown' }), issue('7', { state: 'CLOSED' }), issue('8', { isPullRequest: true }), issue('9', { labels: ['cez-autofix'] }), issue('10', { labels: undefined })] })
assert.deepEqual(selected.shortlist.map(value => value.issueId), ['2', '3', '1'])
assert.equal(selected.rejected.length, 7)
assert.deepEqual(selected.queued, ['9'])
assert.deepEqual(good({ issues: [issue('1', { labels: ['blocked'] })], config: { autofix: { eligibility: { excludeLabels: [] } } } }).shortlist.map(value => value.issueId), ['1'])
assert.equal(good({ issues: [issue('1'), issue('2')], analyzeLimit: 1, limit: 20 }).shortlist.length, 1)
const history = [issue('1', { createdAt: '2026-10-01T12:00:00Z' }), issue('2', { createdAt: '2026-08-01T12:00:00Z' })]
assert.deepEqual(good({ issues: history }).shortlist.map(value => value.issueId), ['1'])
assert.equal(good({ issues: history, window: 2 }).nextWindow, true)
assert.equal(good({ issues: history, window: 2 }).shortlist.length, 0)
assert.deepEqual(good({ issues: history, fromOldest: true }).shortlist.map(value => value.issueId), ['2'])
assert.deepEqual(good({ issues: history, issueId: '2' }).shortlist.map(value => value.issueId), ['2'])
const judgment = { outcome: 'match', reason: 'Current code demonstrates bounded work', evidence: ['repo:path:123'] }
const apply = { action: 'plan-apply', proposalIds: ['ABC-1', '2', '3', '4'], confirmedIds: ['ABC-1', '2', '3', '4', 'new'], issues: [issue('ABC-1', { judgment }), issue('2', { state: 'CLOSED', judgment }), issue('3', { claimStatus: 'active', judgment }), issue('4', { judgment: { outcome: 'unknown' } }), issue('new', { judgment })] }
assert.deepEqual(good(apply).applyIds, ['ABC-1'])
assert.deepEqual(good(apply).skipped.map(value => value.reason), ['closed', 'actively claimed', 'current suitability not established', 'not in proposal'])
assert.equal(good({ ...apply, config: { labels: { enabled: false } } }).applyIds.length, 0)
assert.equal(good({ ...apply, issues: [issue('ABC-1', { labels: ['cez-autofix'], judgment })] }).applyIds.length, 0)
assert.notEqual(run({ action: 'plan-apply', confirmedIds: ['ABC-1'] }).status, 0)
const skill = readFileSync(new URL('../skills/om-auto-issue-triage/SKILL.md', import.meta.url), 'utf8')
const call = skill.match(/`(apply_issue_label [^`]+)`/)[1]
const github = readFileSync(new URL('../skills/om-setup-agent-pipeline/references/trackers/github.md', import.meta.url), 'utf8')
const guard = github.match(/^apply_label\(\) \{\n[\s\S]*?^\}$/m)[0]
const result = spawnSync('bash', ['-c', `LABELS_ENABLED=true\nAUTOFIX_LABEL=cez-autofix\nISSUE_ID=123\nlabel_exists() { return 0; }\ntracker_repo() { printf owner/repo; }\ngh() { printf '%s\\n' "$*" >&2; }\n${guard}\napply_issue_label() { apply_label "$1" "$2"; }\n${call}`], { encoding: 'utf8' })
assert.equal(result.status, 0, result.stderr)
assert.equal(result.stderr.trim(), 'api -X POST repos/owner/repo/issues/123/labels -f labels[]=cez-autofix')
console.log('Issue triage selection, confirmation binding, current-state gates and issue-label command OK.')
const read = relative => readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8')
const searchSnippet = provider => read(`skills/om-setup-agent-pipeline/references/trackers/${provider}.md`).match(/#### search-issues\n[\s\S]*?```bash\n([\s\S]*?)```/)[1]
const executeSearch = (provider, stub, query = '') => {
  const script = searchSnippet(provider).split('# closed')[0].replaceAll('{state}', 'open').replaceAll('<query>', query).replaceAll('{owner}/{repo}', 'owner/repo')
  const result = spawnSync('bash', ['-c', `${stub}\n${script}`], { encoding: 'utf8', env: { ...process.env, ATLASSIAN_PROJECT: 'ACME' } })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim().split('\n')
}
const ghSearch = executeSearch('github', 'gh() { printf "%s\\n" "$@"; }')
assert.ok(!ghSearch.includes('--search'))
assert.ok(ghSearch.includes('1000'))
assert.ok(ghSearch.some(value => value.includes('createdAt')))
const jiraSearch = executeSearch('jira', 'acli() { printf "%s\\n" "$@"; }')
assert.ok(jiraSearch.includes('project = "ACME" AND statusCategory != Done'))
assert.ok(!jiraSearch.some(value => value.includes('text ~')))
assert.ok(executeSearch('jira', 'acli() { printf "%s\\n" "$@"; }', 'failed login').some(value => value.includes('text ~ "failed login"')))
const linearSearch = executeSearch('linear', 'linear() { printf "%s\\n" "$@"; }')
assert.ok(!linearSearch.includes('--search'))
assert.ok(linearSearch.includes('--all-teams'))
assert.ok(executeSearch('linear', 'linear() { printf "%s\\n" "$@"; }', 'failed login').includes('failed login'))
const gitlabSearch = executeSearch('gitlab', 'gl_project() { printf project; }; gl_list_jq() { printf "%s\\n" "$@"; }')
assert.ok(gitlabSearch.some(value => value.includes('state=opened') && value.includes('search=&')))
const forgejoSearch = executeSearch('forgejo', 'fj_repo() { printf owner/repo; }; fj_list_jq() { printf "%s\\n" "$@"; }')
assert.ok(forgejoSearch.some(value => value.includes('type=issues') && value.endsWith('&q=')))
console.log('All five provider search-issues snippets enumerate open issues with an empty text query.')

const preflight = read('skills/om-auto-issue-triage/references/agentic-setup.md')
assert.match(preflight, /Missing setup → stop[\s\S]*never run setup automatically/)
assert.doesNotMatch(preflight, /missing → run `om-setup-agent-pipeline`/i)
assert.match(skill, /Missing config or tracker descriptor stops with a setup hint, never an automatic setup run/)
console.log('Missing setup stops before tracker provisioning, preserving the dry-run boundary.')
