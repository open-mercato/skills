#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
// Since the standard-step-files alignment, each skill's config-loading snippet
// (BROWSER_PROVIDER/BROWSER_FILE resolution, validation) lives in its own
// references/agentic-setup.md — assert over SKILL.md and that file together.
const readSkill = (name) => {
  let text = read(`skills/${name}/SKILL.md`);
  try {
    text += read(`skills/${name}/references/agentic-setup.md`);
  } catch {}
  return text;
};

const template = read("skills/om-setup-agent-pipeline/references/browsers/TEMPLATE.md");
const agentBrowser = read("skills/om-setup-agent-pipeline/references/browsers/agent-browser.md");
const playwright = read("skills/om-setup-agent-pipeline/references/browsers/playwright.md");
const setup = readSkill("om-setup-agent-pipeline");
const prepare = readSkill("om-prepare-test-env");
const envDescriptor = read("skills/om-prepare-test-env/references/env-descriptor.md");
const qaPr = readSkill("om-auto-qa-pr");
const integration = readSkill("om-integration-tests");

const operations = [
  "ensure-installed",
  "doctor",
  "open",
  "snapshot",
  "interact",
  "assert",
  "screenshot",
  "close",
];

for (const operation of operations) {
  assert.match(template, new RegExp(`^### ${operation}$`, "m"), `template: ${operation}`);
  assert.match(agentBrowser, new RegExp(`^### ${operation}$`, "m"), `agent-browser: ${operation}`);
  assert.match(playwright, new RegExp(`^### ${operation}$`, "m"), `playwright: ${operation}`);
}

function releaseAsset(platform, arch, musl = false) {
  const normalized = arch === "x86_64" || arch === "amd64" ? "x64"
    : arch === "arm64" || arch === "aarch64" ? "arm64"
      : "unsupported";
  if (platform === "darwin") return `agent-browser-darwin-${normalized}`;
  if (platform === "linux" || platform === "wsl2") {
    return `agent-browser-${musl ? "linux-musl" : "linux"}-${normalized}`;
  }
  if (platform === "win32" && (normalized === "x64" || normalized === "arm64")) {
    return "agent-browser-win32-x64.exe";
  }
  return "unsupported";
}

const matrix = [
  ["darwin", "x86_64", false, "agent-browser-darwin-x64"],
  ["darwin", "arm64", false, "agent-browser-darwin-arm64"],
  ["linux", "x86_64", false, "agent-browser-linux-x64"],
  ["linux", "aarch64", false, "agent-browser-linux-arm64"],
  ["linux", "x86_64", true, "agent-browser-linux-musl-x64"],
  ["linux", "aarch64", true, "agent-browser-linux-musl-arm64"],
  ["wsl2", "x86_64", false, "agent-browser-linux-x64"],
  ["wsl2", "aarch64", false, "agent-browser-linux-arm64"],
  ["win32", "amd64", false, "agent-browser-win32-x64.exe"],
  ["win32", "arm64", false, "agent-browser-win32-x64.exe"],
];

for (const [platform, arch, musl, expected] of matrix) {
  assert.equal(releaseAsset(platform, arch, musl), expected, `${platform}/${arch}/${musl}`);
}
assert.equal(releaseAsset("freebsd", "x86_64"), "unsupported");
assert.equal(releaseAsset("linux", "riscv64"), "agent-browser-linux-unsupported");

assert.match(agentBrowser, /agent-browser-darwin-\$ARCH/);
assert.match(agentBrowser, /agent-browser-\$LIBC-\$ARCH/);
assert.match(agentBrowser, /agent-browser-win32-x64\.exe/);
assert.match(agentBrowser, /Invoke-WebRequest/);
assert.match(agentBrowser, /install --with-deps/);
assert.match(agentBrowser, /sudo -n/);
assert.match(agentBrowser, /doctor --json/);
assert.match(agentBrowser, /ABS_SCREENSHOT_PATH/);
assert.doesNotMatch(agentBrowser, /BROWSERBASE_API_KEY|BROWSER_USE_API_KEY|KERNEL_API_KEY/);
assert.doesNotMatch(agentBrowser, /npm install|npx |node /);

assert.match(setup, /\.browser\.provider \/\/ "playwright"/);
assert.match(setup, /"browser": \{ "provider": "agent-browser" \}/);
assert.match(setup, /Invalid browser\.provider/);
assert.match(prepare, /BROWSER_FILE="\.ai\/browsers\/\$\{BROWSER_PROVIDER\}\.md"/);
assert.match(envDescriptor, /"browser": \{/);
assert.match(envDescriptor, /legacy compatibility object/);
for (const consumer of [qaPr, integration]) {
  assert.match(consumer, /\.ai\/browsers\/<provider>\.md|\.ai\/browsers\/\$\{BROWSER_PROVIDER\}\.md/);
  for (const operation of ["open", "snapshot", "interact", "assert"]) {
    assert.match(consumer, new RegExp(`\\*\\*${operation}\\*\\*`), `consumer operation ${operation}`);
  }
}

console.log(`Browser provider contract OK (${operations.length} operations, ${matrix.length} platform targets).`);
