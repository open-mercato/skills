#!/usr/bin/env node
// These hooks supplement host tool permissions; they are not a shell sandbox.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve, parse } from 'node:path'
import { spawnSync } from 'node:child_process'

function deny(message) { process.stderr.write(`[om-harness] ${message}\n`); process.exit(2) }
function gitDirectory(cwd, flag) {
  const result = spawnSync('git', ['rev-parse', flag], { cwd, encoding: 'utf8', timeout: 5000 })
  if (result.status === 0) return resolve(cwd, result.stdout.trim())
  if (/not a git repository/i.test(result.stderr || '')) return null
  deny('Cannot establish whether a staged-only run is active.')
}
function activeGuard(directory) {
  if (!existsSync(directory)) return false
  const gitDir = gitDirectory(directory, '--absolute-git-dir')
  if (!gitDir) return false
  const sentinel = resolve(gitDir, 'om-harness', 'stage-only.json')
  if (!existsSync(sentinel)) return false
  try {
    const guard = JSON.parse(readFileSync(sentinel, 'utf8'))
    if (guard.version !== 1 || typeof guard.runId !== 'string' || !guard.runId || typeof guard.startState !== 'string' || !isAbsolute(guard.startState)) deny('Invalid staged-run guard.')
  } catch { deny('Unreadable staged-run guard.') }
  return true
}
function siblingGuard(directory) {
  const common = gitDirectory(directory, '--git-common-dir')
  if (!common) return false
  if (existsSync(resolve(common, 'om-harness', 'stage-only.json'))) return true
  const worktrees = resolve(common, 'worktrees')
  return existsSync(worktrees) && readdirSync(worktrees).some(name => existsSync(resolve(worktrees, name, 'om-harness', 'stage-only.json')))
}
function shellWords(command) {
  return command.match(/(?:[^\s"';&|]|\\.|"(?:[^"\\]|\\.)*"|'[^']*')+|[;&|\n]+/g) || []
}
function unquote(word) {
  return word.replace(/"((?:\\.|[^"\\])*)"|'([^']*)'|\\(.)/g, (_, double, single, escaped) => double !== undefined ? double.replace(/\\(["\\$`])/g, '$1') : single ?? escaped)
}
function commandDirectories(words, cwd) {
  // Inspect literal directory switches without executing shell text. Retain all
  // visited directories conservatively; expansions require host permission when
  // this repository has an active run whose destination cannot be established.
  const directories = new Set([cwd])
  let shellDirectory = cwd, gitBase = cwd, unresolved = false
  let commandStart = true, gitOptions = false
  for (let index = 0; index < words.length; index += 1) {
    const word = unquote(words[index])
    if (/^[;&|\n]+$/.test(word)) { gitBase = shellDirectory; commandStart = true; gitOptions = false; continue }
    let directoryCommand = false
    if (commandStart) {
      if (['env', 'command', 'builtin', 'exec'].includes(word)) continue
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(word)) { if (/^GIT_/.test(word)) unresolved = true; continue }
      commandStart = false
      if (word === 'git') { gitOptions = true; gitBase = shellDirectory; continue }
      directoryCommand = word === 'cd' || word === 'pushd'
      if (!directoryCommand) {
        if (['if', 'then', 'else', 'do', 'for', 'while', 'until', 'case', 'xargs'].includes(word)) unresolved = true
        continue
      }
    }
    if (!directoryCommand && !gitOptions) continue
    const pathOption = /^(-C|--git-dir=|--work-tree=)/.exec(word)?.[1]
    if (!directoryCommand && !pathOption && !['--git-dir', '--work-tree'].includes(word)) {
      if (['-c', '--config-env', '--namespace'].includes(word)) index += 1
      else if (!word.startsWith('-')) gitOptions = false
      continue
    }
    let value = pathOption && word.length > pathOption.length ? word.slice(pathOption.length) : words[++index]
    if (directoryCommand && value && /^[-+]/.test(unquote(value)) && unquote(value) !== '--') {
      unresolved = true
      continue
    }
    if (value && unquote(value) === '--') value = words[++index]
    if (!value || /[$`~]/.test(value)) { unresolved = true; continue }
    value = unquote(value)
    const directory = resolve(directoryCommand ? shellDirectory : gitBase, value)
    directories.add(directory)
    if (directoryCommand) shellDirectory = directory
    if (directoryCommand || word.startsWith('-C')) gitBase = directory
  }
  return { directories, unresolved }
}
let input
try { input = JSON.parse(readFileSync(0, 'utf8')) } catch { deny('Malformed hook input; refusing an unverifiable operation.') }
if (!input || typeof input.tool_input !== 'object' || !input.tool_input) deny('Missing tool input.')
const tool = input.tool_input
if (process.argv[2] === 'block') {
  if (typeof tool.command !== 'string' || !tool.command.trim()) deny('Missing shell command.')
  const command = tool.command.replace(/\\\r?\n/g, '').replace(/\\(.)/g, '$1').replace(/["']/g, '')
  const cwd = input.cwd || process.cwd()
  const words = shellWords(tool.command.replace(/\\\r?\n/g, ''))
  const targets = commandDirectories(words, cwd)
  // Keep quoted whitespace inside its original argument for Git's option scan.
  const publicationCommand = words.map(word => unquote(word).replace(/\s/g, '\0')).join(' ')
  const indirect = /\$\(|`|(?:^|[;&|\n])\s*\$|\b(?:git|gh|glab)\s+\$|\b(?:eval|source)\b|\b(?:bash|sh|zsh|pwsh|powershell)\s+[^\n]*(?:-c\b|-Command\b)/i.test(command)
  const ambiguousPublication = indirect && /\b(?:push|send-pack|http-push|create|merge|reopen|api|curl|wget)\b/i.test(command)
  if (![...targets.directories].some(activeGuard) && !((targets.unresolved || ambiguousPublication) && siblingGuard(cwd))) process.exit(0)
  // Indirection cannot be validated by this lexical hook. Use an approved host
  // command or run the committed validation command with operator permission.
  if (indirect || targets.unresolved) deny('Shell indirection requires explicit host permission outside a staged-only run.')
  const options = '(?:-[^\\s]+\\s+(?:[^-\\s][^\\s]*\\s+)?)*'
  const git = new RegExp('(?:^|[^\\w])git\\s+' + options + '(?:push|send-pack|http-push)(?:\\s|$)', 'i')
  const hostingCli = /\b(?:gh|glab)\b[\s\S]*\b(?:pr|mr)\s+(?:create|merge|reopen)\b/i
  const apiWrite = /\b(?:gh|glab)\b[\s\S]*\bapi\b[\s\S]*(?:(?:--method|-X)(?:\s+|=)(?:POST|PATCH|PUT|DELETE)\b|(?:--field|--input|-f|-F)\b)/i
  if (git.test(publicationCommand) || hostingCli.test(command) || apiWrite.test(command) || /\b(?:curl|wget)\b/i.test(command)) deny('Remote publication is disabled during staged-only work.')
  process.exit(0)
}
if (process.argv[2] !== 'freeze') deny('Unknown guard mode.')
const paths = [tool.file_path, tool.notebook_path, ...(Array.isArray(tool.edits) ? tool.edits.map(edit => edit?.file_path || edit?.notebook_path) : [])].filter(value => typeof value === 'string' && value.length)
if (!paths.length) deny('Missing edit target.')
for (const target of paths) {
  const absolute = isAbsolute(target) ? target : resolve(input.cwd || process.cwd(), target)
  const testPath = /(?:^|[\\/])(?:tests?|specs?|__tests__|__integration__)(?:[\\/]|$)|(?:^|[\\/])test_[^\\/]+|(?:[._](?:test|spec)[._])|(?:Test|Tests)\.(?:java|kt|cs)$|\.ipynb$/i.test(absolute)
  let directory = dirname(absolute)
  while (true) {
    const sentinel = resolve(directory, '.om-freeze-tests')
    if (existsSync(sentinel)) {
      let manifest
      try {
        const text = readFileSync(sentinel, 'utf8').trim()
        manifest = text ? JSON.parse(text) : null
        if (manifest !== null && (!Array.isArray(manifest) || manifest.some(path => typeof path !== 'string' || !path))) deny('Invalid frozen-test manifest.')
      } catch { deny('Unreadable frozen-test manifest.') }
      const listed = manifest?.some(path => resolve(directory, path) === absolute)
      if (testPath || listed) deny('Test files are frozen during the fix phase; fix product code.')
    }
    if (directory === parse(directory).root) break
    directory = dirname(directory)
  }
}
