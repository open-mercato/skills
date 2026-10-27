#!/usr/bin/env node
// Keeps the agent-browser pin in the om-setup-agent-pipeline browser descriptor
// at the latest stable release. The descriptor pins a version and per-asset
// SHA-256 sums (verified before the binary is ever executed); this script is
// the single way to move that pin.
//
//   node scripts/bump-agent-browser.mjs               rewrite the descriptor to the latest stable release
//   node scripts/bump-agent-browser.mjs --check       exit 0 when fresh, 20 when a newer stable release exists
//   node scripts/bump-agent-browser.mjs --latest-tag  print the latest stable tag and exit
//
// Stable means the GitHub releases/latest endpoint, which excludes drafts and
// prereleases. Sums come from the release's asset digest fields — the same
// source the descriptor's Pinned release section documents for manual bumps.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const DESCRIPTOR = 'skills/om-setup-agent-pipeline/references/browsers/agent-browser.md'
const INSTALLED_DESCRIPTOR = '.ai/browsers/agent-browser.md'
const RELEASES_LATEST = 'https://api.github.com/repos/vercel-labs/agent-browser/releases/latest'
const EXPECTED_ASSETS = [
  'agent-browser-darwin-arm64',
  'agent-browser-darwin-x64',
  'agent-browser-linux-arm64',
  'agent-browser-linux-musl-arm64',
  'agent-browser-linux-musl-x64',
  'agent-browser-linux-x64',
  'agent-browser-win32-x64.exe',
]
const STALE_EXIT_CODE = 20

const fail = (message) => {
  console.error(`bump-agent-browser: ${message}`)
  process.exit(1)
}

const response = await fetch(RELEASES_LATEST, {
  headers: {
    accept: 'application/vnd.github+json',
    ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  },
})
if (!response.ok) fail(`releases/latest returned HTTP ${response.status}`)
const release = await response.json()

const tag = release.tag_name
if (!/^v\d+\.\d+\.\d+$/.test(tag ?? '')) fail(`unexpected latest tag: ${tag}`)

const digests = new Map()
for (const asset of release.assets ?? []) {
  const digest = /^sha256:([0-9a-f]{64})$/.exec(asset.digest ?? '')?.[1]
  if (digest) digests.set(asset.name, digest)
}
const missing = EXPECTED_ASSETS.filter((name) => !digests.has(name))
if (missing.length > 0) {
  fail(`release ${tag} is missing sha256 digests for: ${missing.join(', ')} — the descriptor's asset table may need a manual update`)
}

if (process.argv.includes('--latest-tag')) {
  console.log(tag)
  process.exit(0)
}

const original = readFileSync(DESCRIPTOR, 'utf8')
const hasInstalledCopy = existsSync(INSTALLED_DESCRIPTOR)
if (hasInstalledCopy && readFileSync(INSTALLED_DESCRIPTOR, 'utf8') !== original) {
  fail('repository-local browser descriptor differs from the shipped copy; reconcile it before bumping the pin')
}
const pinned = /AGENT_BROWSER_VERSION=(v\d+\.\d+\.\d+)/.exec(original)?.[1]
if (!pinned) fail(`no AGENT_BROWSER_VERSION pin found in ${DESCRIPTOR}`)

if (process.argv.includes('--check')) {
  if (pinned === tag) {
    console.log(`pin is fresh: ${pinned}`)
    process.exit(0)
  }
  console.log(`pin is stale: descriptor has ${pinned}, latest stable is ${tag}`)
  process.exit(STALE_EXIT_CODE)
}

if (pinned === tag) {
  console.log(`already at ${tag}; nothing to do`)
  process.exit(0)
}

let updated = original.replaceAll(pinned, tag)
for (const name of EXPECTED_ASSETS) {
  const caseLine = new RegExp(`(${name.replaceAll('.', '\\.')}\\) ASSET_SHA256=)[0-9a-f]{64}`)
  if (!caseLine.test(updated)) fail(`no ASSET_SHA256 case entry for ${name} in ${DESCRIPTOR}`)
  updated = updated.replace(caseLine, `$1${digests.get(name)}`)
}
const win32Sum = /(\$expectedSha256 = ')[0-9a-f]{64}(')/
if (!win32Sum.test(updated)) fail(`no $expectedSha256 assignment found in ${DESCRIPTOR}`)
updated = updated.replace(win32Sum, `$1${digests.get('agent-browser-win32-x64.exe')}$2`)

for (const digest of digests.values()) {
  if (!updated.includes(digest)) fail(`digest ${digest} did not land in ${DESCRIPTOR}; aborting without writing`)
}
if (updated.includes(pinned)) fail(`old version ${pinned} still present after rewrite; aborting without writing`)

writeFileSync(DESCRIPTOR, updated)
if (hasInstalledCopy) writeFileSync(INSTALLED_DESCRIPTOR, updated)
console.log(`bumped agent-browser pin: ${pinned} -> ${tag}`)
