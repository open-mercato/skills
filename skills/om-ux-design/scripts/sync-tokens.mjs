#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = resolve(SCRIPT_DIR, '..')
const ASSETS_DIR = join(SKILL_DIR, 'references/assets')
const BUNDLED_SNAPSHOT_PATH = join(SKILL_DIR, 'references/ds-tokens.default.json')
const CONTRACT_TOKENS_RELATIVE = '.uxproof/tokens.json'
const REPO_SNAPSHOT_RELATIVE = '.ai/ds/ds-tokens.json'
const PROTOTYPES_ROOT_RELATIVE = '.ai/prototypes'
const BUNDLED_STYLESHEETS = ['components.css', 'screens.css', 'prototype.css']
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function resolveRepoRoot(workingDirectory = process.cwd()) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: workingDirectory,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    console.error(
      `Not inside a git checkout; assuming the working directory is the repository root: ${workingDirectory}`,
    )
    return workingDirectory
  }
}

export const REPO_ROOT = resolveRepoRoot()

export function readAgenticConfig(repoRoot = REPO_ROOT) {
  const configPath = join(repoRoot, '.ai/agentic.config.json')
  if (!existsSync(configPath)) return {}
  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('the root value must be an object')
    }
    return parsed
  } catch (error) {
    throw new Error(
      `Could not read the pipeline config at ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export function resolveConfiguredPath(repoRoot, configuredPath, fallback, fieldName) {
  const value = configuredPath === undefined || configuredPath === null ? fallback : configuredPath
  if (typeof value !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(value) || isAbsolute(value)) {
    throw new Error(`${fieldName} must be a non-empty repository-relative path.`)
  }
  const target = resolve(repoRoot, value)
  const targetRelative = relative(repoRoot, target)
  if (!targetRelative || targetRelative.startsWith('..') || isAbsolute(targetRelative)) {
    throw new Error(`${fieldName} must resolve inside the repository.`)
  }
  let existingAncestor = target
  while (!existsSync(existingAncestor)) {
    const parent = dirname(existingAncestor)
    if (parent === existingAncestor) break
    existingAncestor = parent
  }
  const resolvedAncestor = realpathSync(existingAncestor)
  const resolvedRelative = relative(realpathSync(repoRoot), resolvedAncestor)
  if (resolvedRelative.startsWith('..') || isAbsolute(resolvedRelative)) {
    throw new Error(`${fieldName} must not resolve through a symbolic link outside the repository.`)
  }
  return target
}

export function resolvePrototypesRoot(repoRoot = REPO_ROOT, config = readAgenticConfig(repoRoot)) {
  const root = resolveConfiguredPath(repoRoot, config.paths?.prototypes, PROTOTYPES_ROOT_RELATIVE, 'paths.prototypes')
  assertPrototypeLocation(repoRoot, root)
  return root
}

export function assertPrototypeLocation(repoRoot, target) {
  const repositoryRoot = realpathSync(repoRoot)
  let existingAncestor = resolve(target)
  while (!existsSync(existingAncestor)) existingAncestor = dirname(existingAncestor)
  const locations = [resolve(target), realpathSync(existingAncestor)]
  for (const location of new Set(locations)) {
    const lexicalRelative = relative(resolve(repoRoot), location)
    const usesCanonicalRoot = lexicalRelative.startsWith('..') || isAbsolute(lexicalRelative)
    const boundary = usesCanonicalRoot ? repositoryRoot : resolve(repoRoot)
    const normalized = relative(boundary, location)
    if (normalized.startsWith('..') || isAbsolute(normalized)) {
      throw new Error('Prototype output must resolve inside the repository.')
    }
    if (normalized.split(/[\\/]/).some((part) => part === '.git' || part === '.uxproof')) {
      throw new Error('Prototype output must not be inside .git or .uxproof.')
    }
    let directory = location
    while (directory !== boundary) {
      if (existsSync(join(directory, 'SKILL.md'))) {
        throw new Error('Prototype output must not be inside an installed skill or local override.')
      }
      const manifest = join(directory, 'prototype.json')
      if (existsSync(manifest)) {
        try {
          if (lstatSync(manifest).isSymbolicLink()) throw new Error('ownership record is a symbolic link')
          const owner = JSON.parse(readFileSync(manifest, 'utf8'))
          if (owner?.format === 'discovery-prototype-v1' || owner?.skill === 'om-mockup-prototype') {
            throw new Error('This directory belongs to om-mockup-prototype discovery output; use a separate detailed-design directory.')
          }
        } catch (error) {
          throw new Error(`Could not use prototype directory at ${directory}: ${error.message}`)
        }
      }
      const parent = dirname(directory)
      if (parent === directory) break
      directory = parent
    }
  }
}

export function resolveSnapshot(repoRoot = REPO_ROOT, config = readAgenticConfig(repoRoot)) {
  const contractSnapshot = resolveConfiguredPath(repoRoot, CONTRACT_TOKENS_RELATIVE, CONTRACT_TOKENS_RELATIVE, '.uxproof/tokens.json')
  if (existsSync(contractSnapshot)) return { path: contractSnapshot, source: CONTRACT_TOKENS_RELATIVE }
  if (config.designTokens !== undefined && config.designTokens !== null) {
    const configuredSnapshot = resolveConfiguredPath(repoRoot, config.designTokens, REPO_SNAPSHOT_RELATIVE, 'designTokens')
    if (!existsSync(configuredSnapshot)) {
      throw new Error(`Configured designTokens file does not exist: ${config.designTokens}. Correct the path or remove designTokens to use automatic source selection.`)
    }
    return { path: configuredSnapshot, source: config.designTokens }
  }
  const repoSnapshot = resolveConfiguredPath(repoRoot, REPO_SNAPSHOT_RELATIVE, REPO_SNAPSHOT_RELATIVE, 'designTokens')
  if (existsSync(repoSnapshot)) return { path: repoSnapshot, source: REPO_SNAPSHOT_RELATIVE }
  return { path: BUNDLED_SNAPSHOT_PATH, source: 'bundled default snapshot (references/ds-tokens.default.json)' }
}

function readSnapshot(snapshotPath) {
  try {
    const parsed = JSON.parse(readFileSync(snapshotPath, 'utf8'))
    if (Array.isArray(parsed)) return flatDeclarations(parsed)
    if (!parsed || typeof parsed.tokens !== 'object' || parsed.tokens === null || Array.isArray(parsed.tokens)) {
      throw new Error('Expected a flat token array or a legacy "tokens" object.')
    }
    return legacyDeclarations(parsed.tokens)
  } catch (error) {
    throw new Error(
      `Could not read the token snapshot at ${snapshotPath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function propertyName(name) {
  if (typeof name !== 'string' || !/^(?:--)?[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) {
    throw new Error(`Token name "${name}" is not safe for a CSS custom property.`)
  }
  return name.startsWith('--') ? name : `--${name}`
}

function cssValue(value, name) {
  if ((typeof value !== 'string' && typeof value !== 'number') ||
      (typeof value === 'number' && !Number.isFinite(value)) || String(value).trim() === '') {
    throw new Error(`Token "${name}" must have a non-empty string or finite number value.`)
  }
  const result = String(value).trim()
  // CSS escapes can hide a URL function; image() and image-set() also accept
  // URL strings without a literal url(). Portable token values cannot fetch.
  if (/[;{}\r\n\0\\]|(?:url|(?:-webkit-)?image-set|image|src)\s*\(|\/\*|\*\//i.test(result)) {
    throw new Error(`Token "${name}" contains an unsafe CSS value.`)
  }
  return result
}

function addDeclaration(block, name, value, source) {
  const property = propertyName(name)
  const safeValue = cssValue(value, name)
  const previous = block.get(property)
  if (previous && (previous.value !== safeValue || previous.originalName !== name)) {
    throw new Error(`Conflicting token declarations for "${property}" in the same theme (${previous.originalName}, ${name}).`)
  }
  if (previous) {
    if (source) previous.sources.add(source)
    return
  }
  block.set(property, { name: property, value: safeValue, originalName: name, sources: new Set(source ? [source] : []) })
}

function flatDeclarations(tokens) {
  const themes = { both: new Map(), light: new Map(), dark: new Map() }
  for (const [index, token] of tokens.entries()) {
    if (!token || typeof token !== 'object' || Array.isArray(token)) {
      throw new Error(`Token at index ${index} must be an object.`)
    }
    const theme = token.theme === undefined ? 'both' : token.theme
    if (!Object.hasOwn(themes, theme)) {
      throw new Error(`Token "${token.name}" has unsupported theme "${theme}"; use light, dark, or both.`)
    }
    if (token.source !== undefined && (typeof token.source !== 'string' || !token.source.trim())) {
      throw new Error(`Token "${token.name}" source must be a non-empty string when provided.`)
    }
    addDeclaration(themes[theme], token.name, token.value, token.source)
  }
  const root = new Map([...themes.both, ...themes.light])
  // An explicit "both" value remains the dark base when "light" overrides it.
  const dark = new Map([...themes.both, ...themes.dark])
  for (const name of dark.keys()) {
    if (!themes.light.has(name) && !themes.dark.has(name)) dark.delete(name)
  }
  return { root: [...root.values()], dark: [...dark.values()] }
}

function legacyDeclarations(tokens) {
  const root = new Map()
  const dark = new Map()
  for (const [name, token] of Object.entries(tokens)) {
    if (!token || typeof token !== 'object' || Array.isArray(token)) {
      throw new Error(`Token "${name}" must be an object.`)
    }
    const lightValue = token.value !== undefined ? token.value : token.light
    if (lightValue === undefined || lightValue === null) {
      throw new Error(`Token "${name}" in the snapshot carries neither "value" nor "light".`)
    }
    addDeclaration(root, name, lightValue)
    if (!token.themeInvariant && token.dark !== undefined && token.dark !== null) {
      addDeclaration(dark, name, token.dark)
    }
  }
  return { root: [...root.values()], dark: [...dark.values()] }
}

function cssComment(value) {
  return value.replace(/\*\//g, '* /').replace(/\/\*/g, '/ *').replace(/[\r\n]/g, ' ')
}

function assertTokenAliasesResolve(root, dark) {
  for (const [theme, entries] of [['light', root], ['dark', [...root, ...dark]]]) {
    const declarations = new Map(entries.map(({ name, value }) => [name, value]))
    const checked = new Set()
    const visiting = new Set()
    const visit = (name) => {
      if (visiting.has(name)) throw new Error(`Circular token alias in ${theme} theme: ${name}`)
      if (checked.has(name)) return
      visiting.add(name)
      for (const match of declarations.get(name).matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/g)) {
        if (declarations.has(match[1])) visit(match[1])
        else if (match[2] !== ',') throw new Error(`Token ${name} references undefined alias ${match[1]} in ${theme} theme.`)
      }
      visiting.delete(name)
      checked.add(name)
    }
    for (const name of declarations.keys()) visit(name)
  }
}

function emitDeclarations(declarations, indent = '  ') {
  return declarations.map((declaration) => {
    const sources = [...declaration.sources].sort().map(cssComment)
    const provenance = sources.length ? ` /* Source: ${sources.join(', ')} */` : ''
    return `${indent}${declaration.name}: ${declaration.value};${provenance}`
  }).join('\n')
}

export function assertBundledVariablesResolve(generatedCss, assetsDirectory = ASSETS_DIR) {
  const bundledCss = BUNDLED_STYLESHEETS
    .map((filename) => readFileSync(join(assetsDirectory, filename), 'utf8'))
    .join('\n')
  const defined = new Set()
  const definitionPattern = /(--[A-Za-z0-9_-]+)\s*:/g
  for (const css of [generatedCss, bundledCss]) {
    for (const match of css.matchAll(definitionPattern)) defined.add(match[1])
  }

  const unresolved = new Set()
  for (const match of bundledCss.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)([^)]*)\)/g)) {
    const hasFallback = match[2].trimStart().startsWith(',')
    if (!hasFallback && !defined.has(match[1])) unresolved.add(match[1])
  }
  if (unresolved.size) {
    throw new Error(`Bundled styles reference undefined CSS variables: ${Array.from(unresolved).sort().join(', ')}`)
  }
}

export function buildTokens(snapshotPath, assetsDirectory = ASSETS_DIR, options = {}) {
  const snapshot = snapshotPath ? { path: snapshotPath, source: snapshotPath } : resolveSnapshot(options.repoRoot)
  const { root, dark } = readSnapshot(snapshot.path)
  assertTokenAliasesResolve(root, dark)

  const generated = [
    '/* GENERATED — do not edit by hand.',
    ` * Source: ${cssComment(snapshot.source)}`,
    ' * Regenerate with the om-ux-design skill: scripts/sync-tokens.mjs.',
    ' */',
    '',
    ':root {',
    '  color-scheme: light;',
    emitDeclarations(root),
    '}',
    '',
    '.dark {',
    '  color-scheme: dark;',
    emitDeclarations(dark),
    '}',
    '',
  ].join('\n')
  assertBundledVariablesResolve(generated, assetsDirectory)
  return generated
}

export function parseTokenCss(css) {
  const blocks = {}
  const blockPattern = /(?:^|\n)\s*(:root|\.dark)\s*\{([\s\S]*?)\}/g
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(blockPattern)) {
    const declarations = new Map()
    for (const line of match[2].split(';')) {
      const separator = line.indexOf(':')
      const name = line.slice(0, separator).trim()
      if (name.startsWith('--')) declarations.set(name, line.slice(separator + 1).trim())
    }
    blocks[match[1]] = declarations
  }
  return blocks
}

export function tokensDrift(currentCss, generatedCss) {
  const current = parseTokenCss(currentCss)
  const generated = parseTokenCss(generatedCss)
  const drift = []
  for (const selector of [':root', '.dark']) {
    const currentBlock = current[selector] || new Map()
    const generatedBlock = generated[selector] || new Map()
    for (const [name, value] of generatedBlock) {
      if (!currentBlock.has(name)) drift.push(`${selector} is missing ${name}`)
      else if (currentBlock.get(name) !== value) drift.push(`${selector} ${name} is ${currentBlock.get(name)}, expected ${value}`)
    }
    for (const [name, value] of currentBlock) {
      if (generatedBlock.has(name)) continue
      // A .dark re-declaration matching the generated :root value is a no-op, not drift.
      if (selector === '.dark' && (generated[':root'] || new Map()).get(name) === value) continue
      drift.push(`${selector} carries stale ${name}`)
    }
  }
  return drift
}

export function parseSyncArguments(args) {
  if (args.length === 1 && !args[0].startsWith('--')) return { checkOnly: false, target: args[0] }
  if (args.length === 2 && args[0] === '--check' && !args[1].startsWith('--')) {
    return { checkOnly: true, target: args[1] }
  }
  throw new Error('Usage: sync-tokens.mjs [--check] <paths.prototypes>/<prototype-slug>')
}

export function resolvePrototypeTarget(targetArgument, prototypesRoot = resolvePrototypesRoot(), repoRoot = REPO_ROOT) {
  const target = resolve(targetArgument)
  const targetRelative = relative(prototypesRoot, target)
  if (
    !targetRelative ||
    targetRelative.startsWith('..') ||
    isAbsolute(targetRelative) ||
    targetRelative.includes('/') ||
    targetRelative.includes('\\') ||
    !SLUG_PATTERN.test(targetRelative)
  ) {
    throw new Error('Target must be an immediate <paths.prototypes>/<prototype-slug> directory.')
  }
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`Prototype directory does not exist: ${targetArgument}`)
  }
  if (lstatSync(target).isSymbolicLink()) {
    throw new Error('Prototype target must not be a symbolic link.')
  }
  const resolvedRoot = realpathSync(prototypesRoot)
  const resolvedTarget = realpathSync(target)
  const resolvedRelative = relative(resolvedRoot, resolvedTarget)
  if (!resolvedRelative || resolvedRelative.startsWith('..') || isAbsolute(resolvedRelative)) {
    throw new Error('Prototype target resolves outside paths.prototypes.')
  }
  assertPrototypeLocation(repoRoot, resolvedTarget)
  return resolvedTarget
}

function main() {
  try {
    const { checkOnly, target: targetArgument } = parseSyncArguments(process.argv.slice(2))
    const target = resolvePrototypeTarget(targetArgument)
    const outputPath = join(target, 'tokens.css')
    try {
      if (lstatSync(outputPath).isSymbolicLink()) throw new Error('tokens.css must not be a symbolic link.')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const generated = buildTokens()

    if (checkOnly) {
      const current = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : ''
      const drift = tokensDrift(current, generated)
      if (drift.length) throw new Error(`tokens.css is out of date: ${outputPath}\n${drift.join('\n')}`)
      console.log('tokens.css is current.')
      return
    }

    writeFileSync(outputPath, generated, 'utf8')
    const count = (generated.match(/^\s+--/gm) || []).length
    console.log(`Wrote ${outputPath} (${count} tokens).`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 2
  }
}

function isInvokedDirectly() {
  if (!process.argv[1]) return false
  try {
    return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (isInvokedDirectly()) {
  main()
}
