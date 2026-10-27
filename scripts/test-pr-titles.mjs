#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const paths = [
  'skills/om-open-pr/references/pr-finalize.md',
  'skills/om-auto-create-pr/references/pr-finalize.md',
  'skills/om-auto-create-pr-loop/references/pr-finalize.md',
  'skills/om-auto-fix-issue/references/pr-finalize.md',
  'skills/om-auto-review-pr/references/fork-pr-flow.md',
];
const sections = paths.map((path) => {
  const section = read(path).split('## PR title\n')[1]?.split('\n## ')[0].trim();
  assert.ok(section, `${path}: missing title instructions`);
  return section;
});
for (const section of sections) assert.equal(section, sections[0], 'Standalone title rules must agree');
const snippet = sections[0].match(/```bash\n([\s\S]*?)```/)[1];
const scratch = mkdtempSync(join(tmpdir(), 'pr-titles-'));
try {
  execFileSync('git', ['init', '--quiet', '--initial-branch=feat/ENG-123-login'], { cwd: scratch });
  const configPath = join(scratch, 'config.json');
  const shells = ['sh', 'bash'];
  if (spawnSync('zsh', ['--version']).status === 0) shells.push('zsh');
  let cases = 0;
  function run(shell, config, { issue = '', override = '', branch, summary = 'staff login', tail } = {}) {
    if (config === undefined) rmSync(configPath, { force: true });
    else writeFileSync(configPath, JSON.stringify(config));
    const script = `${snippet}\n${tail ?? 'render_pr_title "$TEST_PREFIX" "$TEST_AREA" "$TEST_SUMMARY" "$TEST_ISSUE" "$TEST_OVERRIDE"'}`;
    const args = shell === 'sh' ? ['-eu', '-c', script] : ['-euo', 'pipefail', '-c', script];
    const env = { ...process.env, CONFIG: configPath, TEST_PREFIX: 'feat', TEST_AREA: 'auth', TEST_SUMMARY: summary, TEST_ISSUE: issue, TEST_OVERRIDE: override };
    delete env.TITLE_HEAD_BRANCH;
    if (branch !== undefined) env.TITLE_HEAD_BRANCH = branch;
    const result = spawnSync(shell, args, { cwd: scratch, env, encoding: 'utf8' });
    assert.equal(result.status, 0, `${shell}: ${JSON.stringify(config)}\n${result.stderr}`);
    cases++;
    return result;
  }
  const pattern = '[A-Z][A-Z0-9]+-[0-9]+';
  // The documented no-match path must survive strict shell execution.
  for (const shell of shells) {
    assert.equal(run(shell, { ticketKeyPattern: pattern }, { branch: 'feat/no-ticket', tail: 'printf "%s" "$TICKET_KEY"' }).stdout, '');
    assert.equal(run(shell, undefined).stdout, 'feat(auth): staff login\n');
    assert.equal(run(shell, {}).stdout, 'feat(auth): staff login\n');
    assert.equal(run(shell, {}, { issue: '123' }).stdout, 'feat(auth): staff login (#123)\n');
    assert.equal(run(shell, {}, { issue: 'ENG-123' }).stdout, 'feat(auth): staff login (#ENG-123)\n');
    for (const [issue, expected] of [['123', '#123'], ['ENG-123', 'ENG-123']]) {
      assert.equal(run(shell, { prTitleTemplate: '[{issue}] {prefix}({area}): {summary}' }, { issue }).stdout, `[${expected}] feat(auth): staff login\n`);
    }
    for (const token of ['issue', 'ticketKey']) {
      for (const [left, right] of [['[', ']'], ['(', ')']]) {
        assert.equal(run(shell, { prTitleTemplate: `${left}{${token}}${right} {prefix}({area}): {summary}` }).stdout, 'feat(auth): staff login\n');
      }
    }
    const ticketConfig = { prTitleTemplate: '[{ticketKey}] {prefix}({area}): {summary}', ticketKeyPattern: pattern };
    assert.equal(run(shell, ticketConfig).stdout, '[ENG-123] feat(auth): staff login\n');
    assert.equal(run(shell, ticketConfig, { branch: 'feat/OPS-7-ENG-123-login' }).stdout, '[OPS-7] feat(auth): staff login\n');
    assert.equal(run(shell, ticketConfig, { branch: 'feat/no-ticket' }).stdout, 'feat(auth): staff login\n');
    assert.equal(run(shell, { ...ticketConfig, ticketKeyPattern: '[' }).stdout, 'feat(auth): staff login\n');
    assert.match(run(shell, { ...ticketConfig, ticketKeyPattern: '[' }).stderr, /ticketKeyPattern/);
    assert.equal(run(shell, { prTitleTemplate: '' }).stdout, 'feat(auth): staff login\n');
    assert.equal(run(shell, { prTitleTemplate: null, ticketKeyPattern: null }).stdout, 'feat(auth): staff login\n');
    assert.equal(run(shell, ticketConfig, { override: 'Exact caller title: $() `literal` {issue}' }).stdout, 'Exact caller title: $() `literal` {issue}\n');
    const literal = 'cost $5 & `literal` $(literal) "quotes" {issue} [{ticketKey}]';
    assert.equal(run(shell, { prTitleTemplate: '{summary} / {summary}' }, { summary: literal }).stdout, `${literal} / ${literal}\n`);
    // Simulate review checkout on a carry branch, retaining the source head ref.
    execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/carry/pr-144-ready'], { cwd: scratch });
    assert.equal(run(shell, ticketConfig, { branch: 'feat/ENG-123-login' }).stdout, '[ENG-123] feat(auth): staff login\n');
    execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/feat/ENG-123-login'], { cwd: scratch });
  }
  const setup = read('skills/om-setup-agent-pipeline/SKILL.md');
  const schema = JSON.parse(setup.match(/```json\n([\s\S]*?)```/)[1]);
  assert.equal(schema.prTitleTemplate, '{prefix}({area}): {summary}{issueRef}');
  assert.equal(schema.ticketKeyPattern, '');
  for (const key of ['prTitleTemplate', 'ticketKeyPattern']) {
    assert.match(setup, new RegExp('^- `' + key + '` — ', 'm'));
    assert.ok(read('skills/om-setup-agent-pipeline/references/config-capabilities.md').includes(`\`${key}\``));
  }
  assert.match(read(paths[4]), /TITLE_HEAD_BRANCH.*headRefName/);
  assert.match(read('skills/om-auto-update-changelog/SKILL.md'), /Skip (?:each|a) leading bracketed reference/);
  console.log(`PR title contract OK (${cases} executable cases across ${shells.join(', ')}, five standalone copies and setup/changelog consumers).`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
