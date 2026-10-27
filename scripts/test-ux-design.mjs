import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
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
} from '../skills/om-ux-design/scripts/init-mockup.mjs'
import {
  assertBundledVariablesResolve,
  buildTokens,
  parseSyncArguments,
  parseTokenCss,
  resolveConfiguredPath,
  resolvePrototypeTarget,
  resolvePrototypesRoot,
  resolveRepoRoot,
  resolveSnapshot,
  tokensDrift,
} from '../skills/om-ux-design/scripts/sync-tokens.mjs'

const repoRoot = resolve(import.meta.dirname, '..')
const testRootParent = join(repoRoot, '.ai/tmp')
mkdirSync(testRootParent, { recursive: true })

function createTestRoot() {
  return mkdtempSync(join(testRootParent, 'ux-design-test-'))
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

test('token source honors the design contract, configured snapshot, legacy path, then bundled fallback', () => {
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

    mkdirSync(join(root, '.uxproof'), { recursive: true })
    writeFileSync(join(root, '.uxproof/tokens.json'), '[{"name":"surface","value":"navy","source":"design"}]')
    assert.equal(resolveSnapshot(root, { designTokens: 'config/tokens.json' }).source, '.uxproof/tokens.json')
    assert.equal(resolveSnapshot(root, { designTokens: 'missing.json' }).source, '.uxproof/tokens.json')
    rmSync(join(root, '.uxproof/tokens.json'))
    assert.throws(() => resolveSnapshot(root, { designTokens: 'missing.json' }), /Configured designTokens file does not exist: missing.json/)
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
    assert.match(readFileSync(join(target, 'README.md'), 'utf8'), /Comments remain in\s+this browser until exported/)
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
    const overridePath = join(root, '.ai/skills/om-ux-design/references/screen-patterns.md')
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


function withSnapshot(snapshot, run) {
  const root = createTestRoot()
  const path = join(root, 'tokens.json')
  try {
    writeFileSync(path, JSON.stringify(snapshot))
    return run(path)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('flat contract tokens preserve theme values, aliases, numeric zero, and source metadata', () => {
  withSnapshot([
    { name: 'background', value: 'white', source: 'src/base.css', theme: 'light' },
    { name: 'background', value: 'black', source: 'src/dark.css', theme: 'dark' },
    { name: '--space', value: 0, source: 'design', theme: 'both' },
    { name: 'surface', value: 'var(--background)', kind: 'alias', source: 'proposed' },
    { name: 'selection', value: 'var(--optional, blue)', source: 'src/base.css' },
  ], (path) => {
    const css = buildTokens(path)
    const blocks = parseTokenCss(css)
    assert.equal(blocks[':root'].get('--background'), 'white')
    assert.equal(blocks['.dark'].get('--background'), 'black')
    assert.equal(blocks[':root'].get('--space'), '0')
    assert.equal(blocks['.dark'].has('--space'), false)
    assert.equal(blocks[':root'].get('--surface'), 'var(--background)')
    assert.equal(blocks[':root'].get('--selection'), 'var(--optional, blue)')
    assert.match(css, /Source: src\/base.css/)
    assert.match(css, /Source: src\/dark.css/)
    assert.match(css, /Source: proposed/)
  })
})

test('explicit light and dark values override a both-theme base without losing its dark value', () => {
  withSnapshot([
    { name: 'surface', value: 'gray', theme: 'both' },
    { name: 'surface', value: 'white', theme: 'light' },
    { name: 'accent', value: 'blue' },
    { name: 'accent', value: 'navy', theme: 'dark' },
    { name: 'night', value: 'silver', theme: 'dark' },
  ], (path) => {
    const blocks = parseTokenCss(buildTokens(path))
    assert.equal(blocks[':root'].get('--surface'), 'white')
    assert.equal(blocks['.dark'].get('--surface'), 'gray')
    assert.equal(blocks[':root'].get('--accent'), 'blue')
    assert.equal(blocks['.dark'].get('--accent'), 'navy')
    assert.equal(blocks[':root'].has('--night'), false)
    assert.equal(blocks['.dark'].get('--night'), 'silver')
  })
})

test('legacy snapshots retain invariant values, derived aliases, and themed overrides', () => {
  withSnapshot({ tokens: {
    radius: { value: '4px', themeInvariant: true, dark: '9px' },
    'radius-md': { light: 'calc(var(--radius) - 1px)', dark: null },
    background: { light: '#ffffff', dark: '#000000' },
    zero: { value: 0 },
  } }, (path) => {
    const blocks = parseTokenCss(buildTokens(path))
    assert.equal(blocks[':root'].get('--radius'), '4px')
    assert.equal(blocks['.dark'].has('--radius'), false)
    assert.equal(blocks[':root'].get('--radius-md'), 'calc(var(--radius) - 1px)')
    assert.equal(blocks['.dark'].get('--background'), '#000000')
    assert.equal(blocks[':root'].get('--zero'), '0')
  })
})

test('token collisions fail clearly and identical duplicates retain their provenance', () => {
  withSnapshot([
    { name: 'surface', value: 'white', source: 'a.css' },
    { name: 'surface', value: 'white', source: 'b.css' },
  ], (path) => {
    const css = buildTokens(path)
    assert.match(css, /Source: a.css, b.css/)
    assert.equal((css.match(/--surface:/g) || []).length, 1)
  })
  for (const snapshot of [
    [{ name: 'surface', value: 'white' }, { name: 'surface', value: 'black' }],
    [{ name: 'surface', value: 'white' }, { name: '--surface', value: 'white' }],
    { tokens: { surface: { value: 'white' }, '--surface': { value: 'white' } } },
  ]) {
    withSnapshot(snapshot, (path) => assert.throws(() => buildTokens(path), /Conflicting token declarations/))
  }
})

test('malformed selected tokens fail with the source path, without using a lower-priority file', () => {
  const root = createTestRoot()
  try {
    mkdirSync(join(root, '.uxproof'))
    writeFileSync(join(root, 'configured.json'), '{"tokens":{"background":{"value":"white"}}}')
    const contract = join(root, '.uxproof/tokens.json')
    for (const malformed of ['{broken', '{}', '{"tokens":[]}', 'null', '[null]', '[{"name":"surface"}]']) {
      writeFileSync(contract, malformed)
      const selected = resolveSnapshot(root, { designTokens: 'configured.json' })
      assert.equal(selected.path, contract)
      assert.throws(() => buildTokens(selected.path), (error) => error.message.includes(contract))
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('flat tokens reject unsupported themes, invalid metadata, unsafe names, and invalid CSS values', () => {
  for (const [token, message] of [
    [{ name: 'surface', value: 'white', theme: 'sepia' }, /unsupported theme/],
    [{ name: 'surface', value: 'white', theme: null }, /unsupported theme/],
    [{ name: 'surface', value: 'white', source: {} }, /source must/],
    [{ name: 'bad;name', value: 'red' }, /not safe/],
    [{ name: 'surface', value: {} }, /string or finite number/],
    [{ name: 'surface', value: '' }, /string or finite number/],
    [{ name: 'surface', value: 'red; --other: blue' }, /unsafe CSS value/],
    [{ name: 'surface', value: 'url(https://example.invalid/image)' }, /unsafe CSS value/],
    [{ name: 'surface', value: 'white/*' }, /unsafe CSS value/],
    [{ name: 'surface', value: 'white\n--other: red' }, /unsafe CSS value/],
  ]) {
    withSnapshot([token], (path) => assert.throws(() => buildTokens(path), message))
  }
})

test('token aliases reject missing references and cycles in either theme', () => {
  for (const [snapshot, message] of [
    [[{ name: 'surface', value: 'var(--missing)' }], /undefined alias --missing in light theme/],
    [[{ name: 'surface', value: 'var(--surface)' }], /Circular token alias/],
    [[{ name: 'a', value: 'var(--b)' }, { name: 'b', value: 'var(--a)' }], /Circular token alias/],
    [[{ name: 'a', value: 'white' }, { name: 'a', value: 'var(--b)', theme: 'dark' }], /undefined alias --b in dark theme/],
    [{ tokens: { a: { value: 'var(--b)' } } }, /undefined alias --b/],
  ]) {
    withSnapshot(snapshot, (path) => assert.throws(() => buildTokens(path), message))
  }
})

test('token provenance cannot close the generated CSS comment', () => {
  withSnapshot([{ name: 'surface', value: 'white', source: 'source.css */\n:root { --injected: red; } /*' }], (path) => {
    const blocks = parseTokenCss(buildTokens(path))
    assert.deepEqual([...blocks[':root']], [['--surface', 'white']])
  })
})

test('contract and configured token paths reject symlinks outside the repository', () => {
  const root = createTestRoot()
  const outside = mkdtempSync(join(tmpdir(), 'om-token-outside-'))
  try {
    writeFileSync(join(outside, 'tokens.json'), '[]')
    symlinkSync(outside, join(root, '.uxproof'), 'dir')
    assert.throws(() => resolveSnapshot(root, {}), /symbolic link outside/)
    rmSync(join(root, '.uxproof'))
    symlinkSync(join(outside, 'tokens.json'), join(root, 'tokens.json'))
    assert.throws(() => resolveSnapshot(root, { designTokens: 'tokens.json' }), /symbolic link outside/)
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(outside, { recursive: true, force: true })
  }
})

test('initialization substitutes literal template values once and uses output-specific escaping', () => {
  const root = createTestRoot()
  const requirements = 'specs/$&-$`-$\'-$$-{{SLUG}}-<tag a="x">&.md'
  try {
    initializePrototype({ slug: 'literal-values', requirements }, {
      repoRoot: root,
      buildTokens: () => ':root {}',
    })
    const target = join(root, '.ai/prototypes/literal-values')
    const html = readFileSync(join(target, 'index.html'), 'utf8')
    const readme = readFileSync(join(target, 'README.md'), 'utf8')
    assert.ok(html.includes(escapeHtml(requirements)))
    assert.ok(readme.includes(requirements))
    assert.equal(readme.includes('&lt;tag'), false)
    const sandbox = { window: {} }
    runInNewContext(readFileSync(join(target, 'comments.js'), 'utf8'), sandbox)
    assert.equal(sandbox.window.__OM_PROTOTYPE_COMMENTS__.prototypeId, 'literal-values')
    assert.equal(sandbox.window.__OM_PROTOTYPE_COMMENTS__.operations.length, 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('initialization uses the explicit repository for config, token source, anatomy, and cleanup', () => {
  const root = mkdtempSync(join(tmpdir(), 'om-other-repo-'))
  try {
    mkdirSync(join(root, '.ai'))
    mkdirSync(join(root, '.uxproof'))
    writeFileSync(join(root, '.ai/agentic.config.json'), '{"paths":{"prototypes":"reviews/prototypes"}}')
    writeFileSync(join(root, '.uxproof/tokens.json'), '[{"name":"surface","value":"navy","source":"design"}]')
    const output = initializePrototypeWithAnatomy({ slug: 'other-root', requirements: 'spec.md' }, { repoRoot: root })
    assert.equal(output.output, 'reviews/prototypes/other-root')
    assert.match(readFileSync(join(root, output.output, 'tokens.css'), 'utf8'), /--surface: navy/)
    assert.equal(existsSync(join(root, '.ai/skills/om-ux-design/references/screen-patterns.md')), true)
    assert.throws(() => initializePrototypeWithAnatomy({ slug: 'other-failure', requirements: 'spec.md' }, {
      repoRoot: root,
      ensureAnatomyOverride: (options) => {
        assert.equal(options.repoRoot, root)
        throw new Error('anatomy failed')
      },
    }), /anatomy failed/)
    assert.equal(existsSync(join(root, 'reviews/prototypes/other-failure')), false)
    assert.equal(existsSync(join(root, output.output)), true)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('initialization refuses existing prototypes and unsafe direct-call slugs without altering files', () => {
  const root = createTestRoot()
  try {
    const args = { slug: 'reviewed', requirements: 'spec.md' }
    const options = { repoRoot: root, buildTokens: () => ':root {}' }
    initializePrototype(args, options)
    const target = join(root, '.ai/prototypes/reviewed')
    writeFileSync(join(target, 'comments.js'), 'reviewer operations')
    assert.throws(() => initializePrototypeWithAnatomy(args, options), /already exists/)
    assert.equal(readFileSync(join(target, 'comments.js'), 'utf8'), 'reviewer operations')
    assert.throws(() => initializePrototype({ slug: '../escape', requirements: 'spec.md' }, options), /slug/)
    assert.equal(existsSync(join(root, '.ai/escape')), false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('anatomy containment is checked before creating directories through a symlink', () => {
  const root = createTestRoot()
  const outside = mkdtempSync(join(tmpdir(), 'om-anatomy-outside-'))
  try {
    mkdirSync(join(root, '.ai'))
    symlinkSync(outside, join(root, '.ai/skills'), 'dir')
    assert.throws(() => ensureAnatomyOverride({ repoRoot: root }), /symbolic link outside/)
    assert.equal(existsSync(join(outside, 'om-ux-design')), false)
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(outside, { recursive: true, force: true })
  }
})

test('CLI initializes from the chosen source, detects theme drift, and rejects output symlinks', () => {
  const root = mkdtempSync(join(tmpdir(), 'om-ux-cli-'))
  const init = join(repoRoot, 'skills/om-ux-design/scripts/init-mockup.mjs')
  const sync = join(repoRoot, 'skills/om-ux-design/scripts/sync-tokens.mjs')
  const run = (script, args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' })
  try {
    execFileSync('git', ['init', '-q', root])
    mkdirSync(join(root, '.uxproof'))
    const tokenPath = join(root, '.uxproof/tokens.json')
    writeFileSync(tokenPath, JSON.stringify([
      { name: 'surface', value: 'white', theme: 'light', source: 'src/theme.css' },
      { name: 'surface', value: 'black', theme: 'dark', source: 'src/theme.css' },
    ]))
    const initialized = run(init, ['orders', '--requirements', 'spec.md'])
    assert.equal(initialized.status, 0, initialized.stderr)
    const output = '.ai/prototypes/orders'
    assert.equal(run(sync, ['--check', output]).status, 0)
    const outputPath = join(root, output, 'tokens.css')
    writeFileSync(outputPath, readFileSync(outputPath, 'utf8').replace('black', 'gray'))
    const drift = run(sync, ['--check', output])
    assert.equal(drift.status, 2)
    assert.match(drift.stderr, /\.dark --surface is gray, expected black/)
    const updated = run(sync, [output])
    assert.equal(updated.status, 0, updated.stderr)
    assert.equal(run(sync, ['--check', output]).status, 0)
    rmSync(outputPath)
    symlinkSync(tokenPath, outputPath)
    const rejected = run(sync, [output])
    assert.equal(rejected.status, 2)
    assert.match(rejected.stderr, /tokens.css must not be a symbolic link/)
    assert.doesNotThrow(() => JSON.parse(readFileSync(tokenPath, 'utf8')))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})


test('prototype writes refuse discovery ownership even when config targets a discovery slug or revision', () => {
  const root = createTestRoot()
  const slugRoot = '.ai/prototypes/discovery/orders'
  const revision = join(root, slugRoot, 'revision-001')
  const manifest = {
    format: 'discovery-prototype-v1', skill: 'om-mockup-prototype', slug: 'orders',
    revision: 1, revisionPath: `${slugRoot}/revision-001`, previousRevision: null,
    brief: '.ai/specs/product-brief.md', flow: 'Orders', panelReport: null,
    verification: 'not-run', files: [],
  }
  try {
    mkdirSync(revision, { recursive: true })
    writeFileSync(join(revision, 'prototype.json'), JSON.stringify(manifest))
    writeFileSync(join(revision, 'tokens.css'), 'manual discovery notes')
    assert.throws(() => resolvePrototypeTarget(revision, join(root, slugRoot), root), /discovery output/)
    assert.throws(() => resolvePrototypesRoot(root, { paths: { prototypes: `${slugRoot}/revision-001` } }), /discovery output/)
    assert.throws(() => initializePrototype({ slug: 'detail', requirements: 'spec.md' }, {
      repoRoot: root, prototypesRoot: revision,
    }), /discovery output/)
    assert.equal(existsSync(join(revision, 'detail')), false)
    assert.equal(readFileSync(join(revision, 'tokens.css'), 'utf8'), 'manual discovery notes')
    assert.deepEqual(JSON.parse(readFileSync(join(revision, 'prototype.json'), 'utf8')), manifest)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('prototype output cannot target git metadata or the design contract, including symlinks', () => {
  const root = createTestRoot()
  try {
    for (const protectedRoot of ['.git', '.uxproof']) {
      const path = join(root, protectedRoot)
      mkdirSync(path)
      writeFileSync(join(path, 'keep'), 'original')
      assert.throws(() => resolvePrototypesRoot(root, { paths: { prototypes: protectedRoot } }), /inside .git or .uxproof/)
      assert.throws(() => initializePrototype({ slug: 'design', requirements: 'spec.md' }, {
        repoRoot: root, prototypesRoot: path,
      }), /inside .git or .uxproof/)
      symlinkSync(path, join(root, 'linked-metadata'), 'dir')
      assert.throws(() => resolvePrototypesRoot(root, { paths: { prototypes: 'linked-metadata' } }), /inside .git or .uxproof/)
      rmSync(join(root, 'linked-metadata'))
      assert.equal(readFileSync(join(path, 'keep'), 'utf8'), 'original')
      assert.equal(existsSync(join(path, 'design')), false)
    }
    assert.equal(resolvePrototypesRoot(root, { paths: { prototypes: 'src/prototypes' } }), join(root, 'src/prototypes'))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('portable CSS rejects escaped and string-based image URLs', () => {
  for (const value of [String.raw`u\72l("https://example.invalid/image")`, 'image-set("https://example.invalid/image" 1x)', '-webkit-image-set("https://example.invalid/image" 1x)', 'image("https://example.invalid/image")']) {
    withSnapshot([{ name: 'background', value }], (path) => {
      assert.throws(() => buildTokens(path), /unsafe CSS value/)
    })
  }
})

test('prototype output cannot enter installed skills or their local overrides', () => {
  const root = mkdtempSync(join(tmpdir(), 'om-installed-boundary-'))
  try {
    for (const location of ['.agents/skills/example', '.ai/skills/example', 'custom-skills/example']) {
      const skill = join(root, location)
      mkdirSync(skill, { recursive: true })
      writeFileSync(join(skill, 'SKILL.md'), '---\nname: example\ndescription: Example skill\n---\n')
      assert.throws(() => resolvePrototypesRoot(root, { paths: { prototypes: location } }), /installed skill/)
      assert.equal(existsSync(join(skill, 'draft')), false)
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})
