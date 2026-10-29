#!/usr/bin/env node
// These hooks supplement host tool permissions; they are not a shell sandbox.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, isAbsolute, resolve, parse } from 'node:path'

function deny(message) { process.stderr.write(`[om-harness] ${message}\n`); process.exit(2) }
let input
try { input = JSON.parse(readFileSync(0, 'utf8')) } catch { deny('Malformed hook input; refusing an unverifiable operation.') }
if (!input || typeof input.tool_input !== 'object' || !input.tool_input) deny('Missing tool input.')
const tool = input.tool_input
if (process.argv[2] === 'block') {
  if (typeof tool.command !== 'string' || !tool.command.trim()) deny('Missing shell command.')
  const command = tool.command.replace(/\\\r?\n/g, '').replace(/\\(.)/g, '$1').replace(/["']/g, '')
  // Indirection cannot be validated by this lexical hook. Use an approved host
  // command or run the committed validation command with operator permission.
  if (/\$\(|`|(?:^|[;&|\n])\s*\$|\b(?:git|gh|glab)\s+\$|\b(?:eval|source)\b|\b(?:bash|sh|zsh|pwsh|powershell)\s+[^\n]*(?:-c\b|-Command\b)/i.test(command)) deny('Shell indirection requires explicit host permission outside a staged-only run.')
  const options = '(?:-[^\\s]+\\s+(?:[^-\\s][^\\s]*\\s+)?)*'
  const git = new RegExp('(?:^|[^\\w])git\\s+' + options + '(?:push|send-pack|http-push)(?:\\s|$)', 'i')
  const hostingCli = /\b(?:gh|glab)\b[\s\S]*\b(?:pr|mr)\s+(?:create|merge|reopen)\b/i
  const apiWrite = /\b(?:gh|glab)\b[\s\S]*\bapi\b[\s\S]*(?:(?:--method|-X)(?:\s+|=)(?:POST|PATCH|PUT|DELETE)\b|(?:--field|--input|-f|-F)\b)/i
  if (git.test(command) || hostingCli.test(command) || apiWrite.test(command) || /\b(?:curl|wget)\b/i.test(command)) deny('Remote publication is disabled during staged-only work.')
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
