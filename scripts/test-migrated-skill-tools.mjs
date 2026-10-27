import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(import.meta.dirname, '..')
const gapRoot = join(repoRoot, 'skills', 'om-gap-analysis')
const scratch = mkdtempSync(join(tmpdir(), 'migrated-skill-tools-'))

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    input: options.input,
  })
}

function expectStatus(result, status, label) {
  assert.equal(
    result.status,
    status,
    `${label}: expected exit ${status}, got ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  )
}

try {
  const fixtureCases = [
    ['bin/gap-checklist-gate', ['fixtures/gap-checklist/complete.md'], 0],
    ['bin/gap-checklist-gate', ['fixtures/gap-checklist/happy-path-only.md'], 1],
    ['bin/gap-checklist-gate', ['fixtures/gap-checklist/no-categories.md'], 1],
    ['bin/gap-checklist-gate', [], 2],
    ['bin/gap-pipeline-crosscheck', ['fixtures/gap-crosscheck/tree.md', 'fixtures/gap-crosscheck/snapshot.md'], 1],
    ['bin/gap-pipeline-crosscheck', ['fixtures/gap-crosscheck/tree-cited.md', 'fixtures/gap-crosscheck/snapshot.md'], 0],
    ['bin/gap-pipeline-crosscheck', ['fixtures/gap-crosscheck/snapshot.md', 'fixtures/gap-crosscheck/tree.md'], 2],
    ['bin/gap-depth-check', ['fixtures/gap-depth/tree.md', 'fixtures/gap-depth/snapshot.md', 'fixtures/gap-depth/summary-fail.md'], 1],
    ['bin/gap-depth-check', ['fixtures/gap-depth/tree.md', 'fixtures/gap-depth/snapshot.md', 'fixtures/gap-depth/summary-pass.md'], 0],
    ['bin/gap-depth-check', ['fixtures/gap-depth/tree.md', 'fixtures/gap-depth/snapshot.md', 'fixtures/gap-depth/summary-fail.md', '--min-additions', '200'], 1],
    ['bin/gap-depth-check', ['fixtures/gap-depth/tree.md', '/nonexistent', 'fixtures/gap-depth/summary-pass.md'], 2],
  ]
  for (const [command, args, status] of fixtureCases) {
    expectStatus(run(join(gapRoot, command), args, { cwd: gapRoot }), status, `${command} ${args.join(' ')}`)
  }

  const projectRoot = join(scratch, 'project')
  const sessionPath = join(scratch, 'session.json')
  const filesPath = join(scratch, 'files.txt')
  const bundlePath = join(scratch, 'bundle')
  mkdirSync(projectRoot)
  writeFileSync(join(projectRoot, 'result.txt'), 'safe generated output\n')
  writeFileSync(filesPath, 'result.txt\n')
  writeFileSync(sessionPath, JSON.stringify({
    turns: [
      {
        role: 'user',
        content: 'prepare a share',
        environment: {
          DB_PASSWORD: 'synthetic-password-value',
          SERVICE_TOKEN: '0123456789abcdef0123456789abcdef01234567',
          buildHash: 'abcdef0123456789abcdef0123456789abcdef01',
        },
      },
      { role: 'assistant', content: 'done' },
    ],
  }))
  const bundleResult = run('node', [
    join(repoRoot, 'skills', 'om-share-this-session', 'scripts', 'prepare-share-bundle.mjs'),
    '--name', 'test-share',
    '--session', sessionPath,
    '--project-root', projectRoot,
    '--files', filesPath,
    '--out', bundlePath,
  ])
  expectStatus(bundleResult, 0, 'prepare-share-bundle')
  const sanitizedSession = readFileSync(join(bundlePath, 'session.json'), 'utf8')
  assert.doesNotMatch(sanitizedSession, /synthetic-password-value/)
  assert.doesNotMatch(sanitizedSession, /0123456789abcdef0123456789abcdef01234567/)
  assert.doesNotMatch(sanitizedSession, /abcdef0123456789abcdef0123456789abcdef01/)

  const traversalResult = run(join(gapRoot, 'bin', 'gap-orientation-preflight'), [
    '--repo', 'example/platform',
    '--branch', '../../outside',
    '--cache-dir', join(scratch, 'cache'),
    '--clone-url', join(scratch, 'missing-repository'),
  ])
  expectStatus(traversalResult, 2, 'orientation traversal rejection')
  assert.match(traversalResult.stderr, /safe branch name|dot path segments/)

  const broadCacheResult = run(join(gapRoot, 'bin', 'gap-orientation-preflight'), [
    '--repo', 'example/platform',
    '--branch', 'main',
    '--cache-dir', '/',
    '--clone-url', join(scratch, 'missing-repository'),
  ])
  expectStatus(broadCacheResult, 2, 'orientation broad cache rejection')
  assert.match(broadCacheResult.stderr, /repository-relative path/)

  const outsideCacheResult = run(join(gapRoot, 'bin', 'gap-orientation-preflight'), [
    '--repo', 'example/platform',
    '--branch', 'main',
    '--cache-dir', join(scratch, 'outside-cache'),
    '--clone-url', join(scratch, 'missing-repository'),
  ])
  expectStatus(outsideCacheResult, 2, 'orientation outside cache rejection')
  assert.match(outsideCacheResult.stderr, /repository-relative path/)

  const groundingRepo = join(scratch, 'grounding-repo')
  mkdirSync(groundingRepo)
  expectStatus(run('git', ['init', '--quiet'], { cwd: groundingRepo }), 0, 'grounding git init')
  writeFileSync(join(groundingRepo, 'feature.txt'), 'feature[alpha]\n')
  expectStatus(run('git', ['add', 'feature.txt'], { cwd: groundingRepo }), 0, 'grounding git add')
  expectStatus(run('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'fixture'], { cwd: groundingRepo }), 0, 'grounding git commit')
  const finding = [
    '- **Verdict**: ✅ Implemented',
    '- **Criteria coverage**:',
    '  - C1: covered `feature.txt`',
    '- **Grounding query**: `feature[alpha]`',
    '- **Grounding source**: core',
    '- **Effort**: 0',
    '- **Upstream pipeline**: none',
    '',
  ].join('\n')
  const groundingResult = run(join(gapRoot, 'bin', 'gap-validate-finding'), [
    '1.1', '--repo-root', groundingRepo,
  ], { input: finding })
  expectStatus(groundingResult, 0, 'fixed-string grounding query')

  process.stdout.write('Migrated skill tool contracts OK (gap fixtures, path containment, fixed-string grounding, and session redaction).\n')
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
