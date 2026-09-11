import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { test } from 'node:test'

import {
  escapeHtml,
  ensureAnatomyOverride,
  initializePrototype,
  initializePrototypeWithAnatomy,
  parseInitArguments,
} from '../skills/om-mockup-prototype/scripts/init-mockup.mjs'
import {
  assertBundledVariablesResolve,
  buildTokens,
  parseSyncArguments,
  resolveConfiguredPath,
  resolvePrototypeTarget,
  resolvePrototypesRoot,
  resolveRepoRoot,
  resolveSnapshot,
  tokensDrift,
} from '../skills/om-mockup-prototype/scripts/sync-tokens.mjs'

const repoRoot = resolve(import.meta.dirname, '..')
const testRootParent = join(repoRoot, '.ai/tmp')
mkdirSync(testRootParent, { recursive: true })

function createTestRoot() {
  return mkdtempSync(join(testRootParent, 'mockup-prototype-test-'))
}

test('init arguments reject traversal, missing values, unknown flags, and extras', () => {
  assert.throws(() => parseInitArguments(['../escape', '--requirements', 'requirements.md']), /slug/)
  assert.throws(() => parseInitArguments(['orders', '--requirements']), /Usage/)
  assert.throws(() => parseInitArguments(['--requirements', 'orders.md', 'orders']), /Usage|slug/)
  assert.throws(() => parseInitArguments(['orders', '--requirements', '--unknown']), /must be followed/)
  assert.deepEqual(parseInitArguments(['orders', '--requirements', 'docs/orders.md']), {
    slug: 'orders',
    requirements: 'docs/orders.md',
  })
})

test('HTML substitutions are escaped', () => {
  assert.equal(escapeHtml('<script title="x">&\'</script>'), '&lt;script title=&quot;x&quot;&gt;&amp;&#39;&lt;/script&gt;')
})

test('configured paths stay inside the repository and preserve defaults', () => {
  const root = createTestRoot()
  try {
    assert.equal(resolvePrototypesRoot(root, {}), join(root, '.ai/prototypes'))
    assert.equal(
      resolvePrototypesRoot(root, { paths: { prototypes: 'artifacts/prototypes' } }),
      join(root, 'artifacts/prototypes'),
    )
    assert.throws(() => resolveConfiguredPath(root, '../outside', '.ai/prototypes', 'paths.prototypes'), /inside/)
    assert.throws(() => resolveConfiguredPath(root, resolve(tmpdir(), 'outside'), '.ai/prototypes', 'paths.prototypes'), /repository-relative/)
    assert.throws(() => resolveConfiguredPath(root, 'path with spaces', '.ai/prototypes', 'paths.prototypes'), /repository-relative/)
    const outside = mkdtempSync(join(tmpdir(), 'om-config-path-outside-'))
    symlinkSync(outside, join(root, 'linked-outside'), 'dir')
    assert.throws(
      () => resolveConfiguredPath(root, 'linked-outside/prototypes', '.ai/prototypes', 'paths.prototypes'),
      /symbolic link/,
    )
    rmSync(outside, { recursive: true, force: true })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('token source honors designTokens, then the conventional and bundled fallbacks', () => {
  const root = createTestRoot()
  try {
    mkdirSync(join(root, 'config'), { recursive: true })
    writeFileSync(join(root, 'config/tokens.json'), '{"tokens":{"surface":{"value":"white"}}}')
    const configured = resolveSnapshot(root, { designTokens: 'config/tokens.json' })
    assert.equal(configured.path, join(root, 'config/tokens.json'))
    assert.equal(configured.source, 'config/tokens.json')

    mkdirSync(join(root, '.ai/ds'), { recursive: true })
    writeFileSync(join(root, '.ai/ds/ds-tokens.json'), '{"tokens":{"surface":{"value":"white"}}}')
    const conventional = resolveSnapshot(root, {})
    assert.equal(conventional.path, join(root, '.ai/ds/ds-tokens.json'))
    assert.equal(conventional.source, '.ai/ds/ds-tokens.json')

    rmSync(join(root, '.ai/ds/ds-tokens.json'))
    assert.match(resolveSnapshot(root, {}).source, /bundled default snapshot/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('prototype initialization is atomic, retry-safe, and generates reviewer instructions', () => {
  const root = createTestRoot()
  const prototypesRoot = join(root, 'prototypes')
  const successfulSlug = 'successful-prototype'
  const tokenCss = ':root { --surface: white; }\n.dark { --surface: black; }\n'
  try {
    const output = initializePrototype(
      { slug: successfulSlug, requirements: 'requirements/<script>alert(1)</script>.md' },
      { prototypesRoot, buildTokens: () => tokenCss },
    )
    const target = join(prototypesRoot, successfulSlug)
    assert.equal(output, relative(repoRoot, target))
    const index = readFileSync(join(target, 'index.html'), 'utf8')
    assert.match(index, /requirements\/&lt;script&gt;alert\(1\)&lt;\/script&gt;\.md/)
    assert.doesNotMatch(index, /<script>alert\(1\)<\/script>/)
    assert.match(readFileSync(join(target, 'README.md'), 'utf8'), /Comments are not live collaboration/)
    assert.match(readFileSync(join(target, 'comments.js'), 'utf8'), /successful-prototype/)

    assert.throws(
      () => initializePrototype(
        { slug: 'token-failure', requirements: 'requirements.md' },
        { prototypesRoot, buildTokens: () => { throw new Error('token generation failed') } },
      ),
      /token generation failed/,
    )
    assert.equal(existsSync(join(prototypesRoot, 'token-failure')), false)

    assert.throws(
      () => initializePrototypeWithAnatomy(
        { slug: 'anatomy-failure', requirements: 'requirements.md' },
        {
          prototypesRoot,
          buildTokens: () => tokenCss,
          ensureAnatomyOverride: () => { throw new Error('anatomy scaffold failed') },
        },
      ),
      /anatomy scaffold failed/,
    )
    assert.equal(existsSync(join(prototypesRoot, 'anatomy-failure')), false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('screen-anatomy override scaffolding is idempotent and uses the design contract', () => {
  const root = createTestRoot()
  try {
    mkdirSync(join(root, '.uxproof'), { recursive: true })
    writeFileSync(join(root, '.uxproof/components.json'), '{}')
    const created = ensureAnatomyOverride({ repoRoot: root })
    assert.equal(created.created, true)
    assert.match(created.source, /pre-filled from the om-ux-setup contract/)
    const overridePath = join(root, '.ai/skills/om-mockup-prototype/references/screen-patterns.md')
    assert.match(readFileSync(overridePath, 'utf8'), /`components\.json`/)
    assert.equal(ensureAnatomyOverride({ repoRoot: root }).created, false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('token sync rejects ambiguous targets and audits every bundled variable', () => {
  const root = createTestRoot()
  const prototypesRoot = join(root, 'prototypes')
  const outside = mkdtempSync(join(tmpdir(), 'om-prototype-outside-'))
  const assets = join(root, 'assets')
  mkdirSync(prototypesRoot, { recursive: true })
  mkdirSync(assets, { recursive: true })
  try {
    assert.throws(() => parseSyncArguments(['--chek', 'orders']), /Usage/)
    assert.throws(() => parseSyncArguments(['orders', 'extra']), /Usage/)
    assert.throws(() => resolvePrototypeTarget(root, prototypesRoot), /immediate/)
    symlinkSync(outside, join(prototypesRoot, 'linked-prototype'), 'dir')
    assert.throws(() => resolvePrototypeTarget(join(prototypesRoot, 'linked-prototype'), prototypesRoot), /symbolic link/)

    writeFileSync(join(assets, 'components.css'), '.x { color: var(--missing-token); }')
    writeFileSync(join(assets, 'screens.css'), '')
    writeFileSync(join(assets, 'prototype.css'), '')
    assert.throws(
      () => assertBundledVariablesResolve(':root { --known-token: red; }', assets),
      /--missing-token/,
    )
    writeFileSync(join(assets, 'components.css'), '.x { color: var(--missing-token, red); }')
    assert.doesNotThrow(() => assertBundledVariablesResolve(':root {}', assets))
    assert.doesNotThrow(() => buildTokens())
    const unsafeSnapshot = join(root, 'unsafe-tokens.json')
    writeFileSync(unsafeSnapshot, '{"tokens":{"surface":{"value":"red; background: url(https://example.invalid)"}}}')
    assert.throws(() => buildTokens(unsafeSnapshot, assets), /unsafe CSS value/)
    writeFileSync(unsafeSnapshot, '{"tokens":{"bad;name":{"value":"red"}}}')
    assert.throws(() => buildTokens(unsafeSnapshot, assets), /not safe for a CSS custom property/)
    writeFileSync(unsafeSnapshot, '{"tokens":{"surface":null}}')
    assert.throws(() => buildTokens(unsafeSnapshot, assets), /must be an object/)
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(outside, { recursive: true, force: true })
  }
})

test('drift comparison is order-insensitive and catches missing, changed, and stale tokens', () => {
  assert.deepEqual(tokensDrift(':root {\n--a: 1;\n--b: 2;\n}', ':root {\n--b: 2;\n--a: 1;\n}'), [])
  assert.deepEqual(tokensDrift(':root {\n--a: 1;\n}\n.dark {\n--a: 1;\n}', ':root {\n--a: 1;\n}\n.dark {\n}'), [])
  assert.ok(tokensDrift(':root {\n--a: 1;\n}', ':root {\n--a: 2;\n}').length > 0)
  assert.ok(tokensDrift(':root {\n}', ':root {\n--a: 1;\n}').length > 0)
  assert.ok(tokensDrift(':root {\n--a: 1;\n}\n.dark {\n--a: 2;\n}', ':root {\n--a: 1;\n}\n.dark {\n}').length > 0)
})

test('repository root resolves through git with a stated working-directory fallback', () => {
  assert.equal(resolveRepoRoot(repoRoot), repoRoot)
  const outsideGit = mkdtempSync(join(tmpdir(), 'om-no-git-'))
  try {
    assert.equal(resolveRepoRoot(outsideGit), outsideGit)
  } finally {
    rmSync(outsideGit, { recursive: true, force: true })
  }
})
