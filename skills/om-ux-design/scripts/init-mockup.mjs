#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REPO_ROOT, assertPrototypeLocation, buildTokens, resolveConfiguredPath, resolvePrototypesRoot } from './sync-tokens.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = resolve(SCRIPT_DIR, '..')
const ASSETS_DIR = join(SKILL_DIR, 'references/assets')
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const OVERRIDE_RELATIVE = '.ai/skills/om-ux-design/references/screen-patterns.md'
const ANATOMY_TEMPLATE_PATH = join(SKILL_DIR, 'references/screen-patterns.md')

export function ensureAnatomyOverride(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT
  const uxproofDir = resolveConfiguredPath(repoRoot, '.uxproof', '.uxproof', '.uxproof')
  const overridePath = resolveConfiguredPath(repoRoot, OVERRIDE_RELATIVE, OVERRIDE_RELATIVE, 'screen-anatomy override')
  if (existsSync(overridePath)) {
    const resolved = realpathSync(overridePath)
    const resolvedRelative = relative(realpathSync(repoRoot), resolved)
    if (!resolvedRelative || resolvedRelative.startsWith('..') || isAbsolute(resolvedRelative)) {
      throw new Error('The screen-anatomy override must resolve inside the repository.')
    }
    if (!statSync(resolved).isFile()) throw new Error('The screen-anatomy override must be a file.')
    return { source: `repo-local override (${OVERRIDE_RELATIVE})`, created: false }
  }
  mkdirSync(dirname(overridePath), { recursive: true })
  const resolvedParent = realpathSync(dirname(overridePath))
  const parentRelative = relative(realpathSync(repoRoot), resolvedParent)
  if (!parentRelative || parentRelative.startsWith('..') || isAbsolute(parentRelative)) {
    throw new Error('The screen-anatomy override must resolve inside the repository.')
  }
  let content = readFileSync(ANATOMY_TEMPLATE_PATH, 'utf8')
  let prefilled = false
  if (existsSync(uxproofDir)) {
    const contractFiles = readdirSync(uxproofDir).filter((name) => !name.startsWith('.')).sort()
    if (contractFiles.length) {
      prefilled = true
      content = [
        content.trimEnd(),
        '',
        "## This repository's design contract",
        '',
        `Extracted by om-ux-setup into \`.uxproof/\`: ${contractFiles.map((name) => `\`${name}\``).join(', ')}.`,
        'Use these files to record the actual tokens, components and screen patterns.',
        'The copied template has not been checked against the running product.',
        '',
      ].join('\n')
    }
  }
  writeFileSync(overridePath, content, 'utf8')
  return {
    source: `shipped neutral template, scaffolded to ${OVERRIDE_RELATIVE}${prefilled ? ' (pre-filled from the om-ux-setup contract)' : ''}`,
    created: true,
  }
}

export function parseInitArguments(args) {
  if (args.length !== 3 || args[1] !== '--requirements') {
    throw new Error('Usage: init-mockup.mjs <prototype-slug> --requirements <requirements-path.md>')
  }

  const [slug, , requirements] = args
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error('Prototype slug must contain lowercase letters, digits, and single hyphens only.')
  }
  if (!requirements || requirements.startsWith('--')) {
    throw new Error('--requirements must be followed by a path.')
  }
  return { slug, requirements }
}

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function assertContainedPath(repoRoot, prototypesRoot, target) {
  const repositoryRoot = realpathSync(repoRoot)
  let existingAncestor = prototypesRoot
  while (!existsSync(existingAncestor)) existingAncestor = dirname(existingAncestor)
  const resolvedPrototypesRoot = realpathSync(existingAncestor)
  const rootRelative = relative(repositoryRoot, resolvedPrototypesRoot)
  if (rootRelative.startsWith('..') || isAbsolute(rootRelative) || resolve(prototypesRoot) === resolve(repoRoot)) {
    throw new Error('paths.prototypes must resolve inside the repository.')
  }
  const targetRelative = relative(prototypesRoot, target)
  if (!SLUG_PATTERN.test(targetRelative) || targetRelative.startsWith('..') || isAbsolute(targetRelative)) {
    throw new Error('Prototype target must be a direct child of paths.prototypes.')
  }
}

function renderTemplate(filename, replacements) {
  const content = readFileSync(join(ASSETS_DIR, filename), 'utf8')
  return content.replace(/\{\{([A-Z_]+)\}\}/g, (match, placeholder) => replacements[placeholder] ?? match)
}

export function initializePrototype({ slug, requirements }, options = {}) {
  parseInitArguments([slug, '--requirements', requirements])
  const repoRoot = options.repoRoot || REPO_ROOT
  const tokenBuilder = options.buildTokens || buildTokens
  const prototypesRoot = options.prototypesRoot || resolvePrototypesRoot(repoRoot)
  const target = resolve(prototypesRoot, slug)
  assertContainedPath(repoRoot, prototypesRoot, target)
  assertPrototypeLocation(repoRoot, target)
  mkdirSync(prototypesRoot, { recursive: true })

  if (existsSync(target)) {
    throw new Error(`Prototype already exists: ${relative(repoRoot, target)}`)
  }

  const staging = mkdtempSync(join(prototypesRoot, `.${slug}-staging-`))
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  const values = { MODULE: title, REQUIREMENTS: requirements, SLUG: slug }
  const htmlValues = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, escapeHtml(value)]))

  try {
    for (const filename of ['components.css', 'screens.css', 'prototype.css', 'prototype.js', 'theme.css']) {
      copyFileSync(join(ASSETS_DIR, filename), join(staging, filename))
    }
    writeFileSync(join(staging, 'index.html'), renderTemplate('index.html', htmlValues), 'utf8')
    writeFileSync(join(staging, 'README.md'), renderTemplate('README.md', values), 'utf8')
    writeFileSync(join(staging, 'comments.js'), renderTemplate('comments.js', { SLUG_JSON: JSON.stringify(slug) }), 'utf8')
    writeFileSync(join(staging, 'tokens.css'), tokenBuilder(undefined, undefined, { repoRoot }), 'utf8')
    renameSync(staging, target)
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }

  return relative(repoRoot, target)
}

export function initializePrototypeWithAnatomy(arguments_, options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT
  let output
  try {
    output = initializePrototype(arguments_, options)
    const anatomy = (options.ensureAnatomyOverride || ensureAnatomyOverride)({ repoRoot })
    return { output, anatomy }
  } catch (error) {
    if (output) rmSync(resolve(repoRoot, output), { recursive: true, force: true })
    throw error
  }
}

function main() {
  try {
    const { output, anatomy } = initializePrototypeWithAnatomy(parseInitArguments(process.argv.slice(2)))
    console.log(`Scaffold created: ${output}/`)
    console.log(`Screen anatomy: ${anatomy.source}`)
    console.log('Next: build stable .screen sections using the anatomy reference above.')
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
