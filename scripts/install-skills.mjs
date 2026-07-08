#!/usr/bin/env node
// Symlink every skill in ./skills into the local Claude Code and Codex skill
// directories, so edits in this repo are picked up immediately — no
// `npx skills add` round-trip while developing.
//
// Usage:
//   npm run install-skills                 # install for claude + codex
//   npm run install-skills -- --agent claude
//   npm run install-skills -- --uninstall  # remove links owned by this repo
//   npm run install-skills -- --force      # replace non-symlink targets too

import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skillsDir = path.join(repoRoot, 'skills')

const AGENT_DIRS = {
  claude: path.join(homedir(), '.claude', 'skills'),
  codex: path.join(homedir(), '.codex', 'skills'),
}

const args = process.argv.slice(2)
const uninstall = args.includes('--uninstall')
const force = args.includes('--force')
const agentFlag = args.indexOf('--agent')
const agents = agentFlag === -1 ? Object.keys(AGENT_DIRS) : [args[agentFlag + 1]]

for (const agent of agents) {
  if (!AGENT_DIRS[agent]) {
    console.error(`Unknown agent "${agent}". Valid: ${Object.keys(AGENT_DIRS).join(', ')}`)
    process.exit(1)
  }
}

const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(path.join(skillsDir, entry.name, 'SKILL.md')))
  .map((entry) => entry.name)
  .sort()

if (skills.length === 0) {
  console.error(`No skills found in ${skillsDir}`)
  process.exit(1)
}

let failures = 0

for (const agent of agents) {
  const targetDir = AGENT_DIRS[agent]
  mkdirSync(targetDir, { recursive: true })
  console.log(`\n${agent} → ${targetDir}`)

  for (const skill of skills) {
    const source = path.join(skillsDir, skill)
    const target = path.join(targetDir, skill)

    let existing = null
    try {
      existing = lstatSync(target)
    } catch {}

    const ownedByRepo = existing?.isSymbolicLink() && path.resolve(path.dirname(target), readlinkSync(target)) === source

    if (uninstall) {
      if (ownedByRepo) {
        rmSync(target)
        console.log(`  removed  ${skill}`)
      } else if (existing) {
        console.log(`  skipped  ${skill} (not a link into this repo)`)
      }
      continue
    }

    if (ownedByRepo) {
      console.log(`  ok       ${skill} (already linked)`)
      continue
    }

    if (existing) {
      if (!existing.isSymbolicLink() && !force) {
        console.warn(`  SKIPPED  ${skill} — ${target} exists and is not a symlink (use --force to replace)`)
        failures++
        continue
      }
      rmSync(target, { recursive: true, force: true })
    }

    symlinkSync(source, target, 'dir')
    console.log(`  linked   ${skill}`)
  }
}

console.log(uninstall ? '\nDone (uninstall).' : `\nDone. ${skills.length} skills linked for: ${agents.join(', ')}.`)
if (failures > 0) {
  console.warn(`${failures} target(s) skipped — rerun with --force to replace them.`)
  process.exitCode = 1
}
