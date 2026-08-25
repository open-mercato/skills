# Shell-Neutral Compatibility Audit and Roadmap

## TLDR

Changes are required for native Windows, but maintaining Bash and PowerShell branches would make the collection larger and easier to drift. The target is one shell-neutral orchestration model: agents read structured files directly and invoke required executables with a program plus argument array. Git is a pipeline prerequisite; each tracker descriptor declares its own client (GitHub uses `gh`). Node is used only by this repository’s tooling, where it is already a project prerequisite. Python and PowerShell 7 do not become collection-wide dependencies.

## Resolved assumptions

- **One algorithm:** skills describe semantic steps once. They do not contain paired Bash/PowerShell control flow.
- **Agent capabilities:** the executor must support structured file read/write, temporary-file creation, process invocation with separate program/arguments/cwd/environment, exit status, and cleanup. If one is unavailable, preflight stops before mutation.
- **External prerequisites:** Git is required for Git workflows. A tracker client is required only by its descriptor; the shipped GitHub provider uses `gh`. Neither Node nor Python is required by installed runtime skills.
- **Repository tooling:** this source repository already uses Node, so its lint/audit/installer/E2E tools may use dependency-free Node scripts.
- **Legacy compatibility:** current string-based validation commands and shell entrypoints remain readable. New structured forms are additive; old formats are not silently translated.
- **Deliverable:** this PR contains analysis and specifications only.

## Problem Statement

The collection’s browser/test-environment subsystem already has Windows paths, but the general pipeline embeds shell-language programs for config loading, worktree cleanup, tracker guards, loops, and validation. Native Windows cannot execute most of that without a POSIX layer, while duplicating every block in PowerShell would create two implementations of the same pipeline.

The durable boundary is not “which shell is active?” It is “which semantic operation is needed?” Git and tracker operations already have stable executable interfaces, and agents already read/write files. Shell syntax is accidental glue that can be removed.

## Current-state audit

Audit baseline: `origin/main` at `69f64b0`, 2026-08-25.

| Surface | Evidence | Assessment |
|---|---:|---|
| Collection | 36 skills; 279 Markdown files | Shared mechanics need one contract. |
| Shell blocks | 92 Bash fences in 30 files; 2 PowerShell fences in 2 files | Control flow is overwhelmingly shell-coupled. |
| Config | 24 skill Markdown files mention `jq` | Structured reads are unnecessarily delegated to a CLI. |
| Worktrees | 9 copied `worktree-setup.md` files use Bash | Git operations are portable; surrounding shell logic is not. |
| Tracker | GitHub descriptor wraps `gh` in Bash guards/functions | Provider operations can instead be ordered semantic steps. |
| Repository gate | Required lint invokes `bash scripts/lint.sh`; CI is Ubuntu-only | Native Windows cannot reproduce the gate without Bash. |
| Installer | Node uses directory symlink type | Windows should use a directory junction without elevation. |
| Existing Windows work | prepare-test-env/provider paths already handle Windows | Preserve as legacy input while moving toward structured launch. |

### Blocking gaps

1. **P0:** config bootstrap requires shell plus `jq`.
2. **P0:** worktree and tracker safety logic is expressed as shell programs.
3. **P1:** loop/release/authoring helpers use pipelines, `/tmp`, and shell variables.
4. **P1:** validation commands are opaque shell strings.
5. **P1:** test-environment launch is selected by `.sh` versus `.ps1` rather than a structured process descriptor.
6. **P2:** lint, audit, E2E, installer links, and line endings are not proven on Windows.

## Proposed solution

### 1. Shell-neutral operation contract

Every executable instruction is one of:

- `file`: read, parse, write, move, or delete an explicitly resolved file through agent filesystem capabilities;
- `process`: invoke one executable with an argument array, cwd, optional environment map, and checked exit status;
- `tracker`: execute a named descriptor operation whose implementation is an ordered sequence of `file` and `process` steps;
- `decision`: evaluate documented inputs and postconditions in the skill algorithm.

Rules:

- Never use shell variables, command substitution, pipelines, redirects, traps, `eval`, `Invoke-Expression`, or string-built command lines for orchestration.
- Pass untrusted values only as argument elements or file contents. Use temporary body/evidence files for multiline tracker input.
- Temporary paths come from the agent’s temp-file capability and are deleted in a guaranteed cleanup step.
- Simple examples show `program` and `args`, not a command string. Human-readable CLI rendering may be displayed but is not executable input.
- Git paths remain repo-relative with `/` in committed contracts; resolve native absolute paths only as a process argument.
- Reports name invoked executable versions, not a “shell family.”

Preflight checks agent capabilities, Git, and the selected tracker client before claims or writes. `cmd.exe`, PowerShell, Bash, WSL, Node, and Python are not probed or selected for orchestration.

### 2. Structured validation steps

Add an optional version-1-compatible form:

```json
{
  "validation": {
    "steps": [
      { "program": "node", "args": ["scripts/lint.mjs"] },
      { "program": "git", "args": ["diff", "--check"] }
    ],
    "commands": ["bash scripts/lint.sh"]
  }
}
```

Resolution:

1. If `validation.steps` is present, require a non-empty array of objects with a non-empty `program`, string-array `args`, and optional repo-relative `cwd`/string environment map. Invoke each directly in order.
2. Otherwise retain legacy `validation.commands`. Run it only when the active agent provides a compatible legacy command runner; if not, stop and ask the repository to add structured steps.
3. Never translate a command string or introduce platform-specific arrays.

`commands` remains for old consumers; updated skills prefer `steps`. The repository updates `.ai/agentic.config.json` and `SDLC.md` together.

### 3. Config, worktree, and tracker semantics

- Replace `jq` snippets with instructions to parse JSON as structured data and validate named fields/types.
- Express worktree setup as individual Git invocations and explicit decision/cleanup steps. All nine standard copies retain identical semantics and shared text.
- Rewrite tracker descriptors as operation tables: inputs, ordered direct invocations, parsed output, guard, postcondition, failure, cleanup. Preserve every operation/guard name.
- An old shell-based descriptor remains usable where its legacy runner exists. Otherwise stop before compound mutation and point to `om-apply-upgrade-notes`; never replace custom content silently.

### 4. Structured launch descriptors

Add an optional launch object to `test-env.json` while preserving `.sh`/`.ps1` entrypoints:

```json
{
  "launch": {
    "program": "node",
    "args": ["scripts/start-test-env.mjs"],
    "cwd": "."
  }
}
```

The program is repository-selected and need not be Node. Updated QA uses `launch` when present and invokes it directly. Legacy descriptors continue through their existing entrypoint when a compatible runner exists. Generators prefer a repository-native cross-platform executable; if none exists, they may retain legacy platform entrypoints and must state the limitation.

### 5. Repository tooling

This repository consolidates its own tooling in dependency-free Node because Node is already required here:

- authoritative `scripts/lint.mjs`, with `scripts/lint.sh` retained as a protected compatibility wrapper;
- Node security-audit and native E2E harnesses;
- Windows junction installation;
- `.gitattributes` and required Ubuntu/Windows Node gates.

This choice does not impose Node on installed skills or target repositories.

## Compatibility and safety

| Protected surface | Treatment |
|---|---|
| Skill names/layout | Unchanged. |
| Config version | Remains 1; `validation.steps` is optional and preferred over legacy `commands`. |
| Tracker operations/guards | Names, inputs, outputs, and postconditions unchanged; implementation representation becomes shell-neutral. |
| `test-env.json` | Optional additive `launch`; existing entrypoint fields remain readable. |
| Progress/chaining/markers | Byte-compatible where parsed. |
| Lint entrypoint | `bash scripts/lint.sh` remains a wrapper. |
| Installer CLI | Flags/output preserved; Windows link primitive changes internally. |

No implementation may use evaluated strings, broaden cleanup targets, mutate machine execution policy, install a shell, or treat a missing prerequisite as success.

## Failure and edge cases

| Scenario | Required result |
|---|---|
| Agent cannot invoke argv directly | Stop before mutation and name the missing executor capability. |
| Missing Git/tracker/program | Stop before the affected operation; show program and args without secrets. |
| Malformed `validation.steps` | Config error before validation; no fallback to `commands`. |
| Only legacy command strings on Windows | Use them only with an explicitly available compatible runner; otherwise request structured steps. |
| Spaces, Unicode, drive/UNC paths | Pass as single arguments; never quote-and-evaluate. |
| Native process returns non-zero | Fail the step and execute only owned cleanup/handback. |
| Interrupted worktree/tracker run | Remove only run-owned temporary/worktree state and preserve primary checkout/external state. |
| Old customized tracker descriptor | Preserve it; clean stop before unsupported compound mutation. |
| Structured launch absent | Use compatible legacy entrypoint or report the exact migration needed. |

## Specification set and exclusive ownership

1. [Cross-platform validation gate](2026-08-25-windows-cross-platform-validation-gate.md): Node lint, portability lint, line endings, required CI.
2. [Shell-neutral config/setup foundation](2026-08-25-native-windows-execution-foundation.md): operation model, structured validation schema, and 36 setup copies.
3. [Shell-neutral worktree lifecycle](2026-08-25-shell-neutral-worktree-lifecycle.md): nine worktree copies.
4. [Shell-neutral tracker operations](2026-08-25-shell-neutral-tracker-operations.md): tracker descriptors and guards.
5. [Shell-neutral author/open/fix workflows](2026-08-25-native-windows-core-pr-workflows.md): six coupled author/fix routes.
6. [Shell-neutral continue workflow](2026-08-25-shell-neutral-continue-workflow.md): `om-auto-continue-pr`.
7. [Shell-neutral review workflows](2026-08-25-shell-neutral-review-workflows.md): code review, autonomous review, and autopilot.
8. [Shell-neutral loop workflows](2026-08-25-native-windows-loop-workflows.md): create/continue loop helpers.
9. [Shell-neutral QA bootstrap](2026-08-25-native-windows-qa-bootstrap.md): structured launch producers/consumers.
10. [Shell-neutral changelog window](2026-08-25-native-windows-changelog-window.md): release-window selection.
11. [Shell-neutral skill-authoring gates](2026-08-25-native-windows-skill-authoring-gates.md): authoring checks.
12. [Shell-neutral upgrade-notes application](2026-08-25-native-windows-repo-maintenance.md): descriptor upgrade application.
13. [Shell-neutral check and commit](2026-08-25-shell-neutral-check-and-commit.md): validation and local commit.
14. [Windows skill installer](2026-08-25-windows-skill-installer.md): directory junctions.
15. [Cross-platform security audit](2026-08-25-windows-security-audit-tooling.md): Node informational audit.
16. [Cross-platform native E2E harness](2026-08-25-windows-native-e2e-harness.md): shell-free structured launch/provider evidence.
17. [Compatibility support publication](2026-08-25-windows-support-publication.md): README claims after all evidence passes.

Each child owns exactly the files named in its Scope. Config/setup owns config-related protected-contract sections; tracker owns tracker sections; QA owns `test-env.json` sections. `README.md` belongs only to publication.

### Mandatory standard-file authorization

Before config/setup edits shared setup text, it must ask to synchronize these 36 owners:

- `om-apply-upgrade-notes`, `om-approve-merge-pr`, `om-auto-continue-pr`, `om-auto-continue-pr-loop`, `om-auto-create-pr`, `om-auto-create-pr-loop`
- `om-auto-fix-issue`, `om-auto-fix-pr`, `om-auto-implement-spec`, `om-auto-manage-issues`, `om-auto-qa-pr`, `om-auto-review-pr`
- `om-auto-update-changelog`, `om-auto-write-spec`, `om-brainstorm`, `om-check-and-commit`, `om-close-fixed-issues`, `om-code-review`
- `om-create-skill`, `om-fix`, `om-followup-issue-from-pr`, `om-integration-tests`, `om-merge-buddy`, `om-open-pr`
- `om-pipeline-retro`, `om-pr-autopilot`, `om-prepare-issue`, `om-prepare-test-env`, `om-review-prs`, `om-root-cause`
- `om-setup-agent-pipeline`, `om-spec-writing`, `om-ux-review-pr`, `om-ux-setup`, `om-ux-shape`, `om-verify-in-repo`

The worktree spec separately asks to synchronize nine owners: `om-auto-continue-pr-loop`, `om-auto-continue-pr`, `om-auto-create-pr-loop`, `om-auto-create-pr`, `om-auto-fix-issue`, `om-auto-fix-pr`, `om-auto-qa-pr`, `om-auto-review-pr`, and `om-auto-write-spec`. Without explicit authorization, stop before edits.

## Validation strategy

- Contract fixtures provide an in-memory agent-capability adapter and mock executables; assert exact program/args/cwd/env, exit handling, postconditions, and cleanup.
- Real Git worktree tests run in paths with spaces and Unicode on Ubuntu and Windows.
- Mock `gh` exercises every named tracker route, including claims, label guards/exclusivity, body files, handback, failures, and cleanup.
- Every promised workflow route gets its own end-to-end fixture; generic smoke coverage is insufficient.
- Portability lint rejects new orchestration that depends on shell syntax or unclassified opaque command strings.
- Required CI runs authoritative Node repository gates on Ubuntu and Windows. Bash wrapper compatibility is tested only on Ubuntu.

## Complete migration inventory

- Config/setup: all 36 setup copies; setup `SKILL.md`, interview/project-docs/coverage references; config/process documents and config compatibility section.
- Worktree: all nine standard copies. Tracker: template, shipped/repo GitHub descriptors, and tracker compatibility section.
- Author/fix: non-standard files for create, fix-issue, fix-PR, interactive fix, open-PR, and verify-in-repo. Continue owns its one route. Review owns code-review, auto-review, autopilot, label/CI transitions, and reports.
- Loops: the four command-heavy references in each create/continue loop skill.
- Focused runtime: QA’s named launch producers/consumers; changelog `SKILL.md` and `release-window.md`; create-skill gates/repo-invariants/shared-boilerplate; upgrade-notes and check-and-commit each own their non-standard files.
- Structured launch: QA owns its named prepare-test-env, integration-test, auto-QA, and protected-contract producer/consumer files. Prepare-test-env `build-cache.md`, reports/rules, and the agent-browser descriptor remain regression baselines unless a failing contract test first amends scope.
- Tooling ownership: validation owns lint/package/line endings/lint workflow/classifier tests; installer owns install script/tests; audit owns audit script/workflow; E2E owns provider/pin/harness fixtures/workflows; publication owns README support text.

## Roadmap completion criteria

- Installed skills require no Bash, PowerShell, Node, Python, `jq`, or POSIX utility for orchestration beyond executables explicitly required by the target operation.
- No platform selector or duplicated OS-specific control-flow branch is introduced.
- Structured validation and launch forms work identically on Ubuntu and Windows; legacy forms fail cleanly when their runner is absent.
- Every tracker and workflow route passes route-specific success/failure/cleanup fixtures.
- All standard copies are synchronized only after the required authorization.
- README publishes only claims backed by required green CI.
