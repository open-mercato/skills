# Native Windows Compatibility for the Skills Collection

## TLDR

The collection has proven Windows-aware test-environment and browser-provider paths, but the general PR pipeline is not yet runnable from native Windows PowerShell: bootstrap, worktree, tracker, loop, and local validation recipes still assume Bash/POSIX tools. This specification defines an additive PowerShell execution contract and a phased migration that preserves current POSIX behavior and downstream committed configuration.

## Resolved assumptions (autonomous defaults)

- **Supported native environment:** full native-Windows support targets PowerShell 7 (`pwsh`) with Git for Windows and the configured tracker CLI available. Windows PowerShell 5.1 may remain a documented fallback for already-supported isolated flows such as generated test-environment launchers, but it is not the full-pipeline baseline; Microsoft distinguishes the maintained cross-platform PowerShell product from Windows PowerShell 5.1.
- **Other Windows environments:** Git Bash/MSYS continues through the POSIX execution family; WSL2 continues through the Linux/POSIX family. Native Windows support must not require either one.
- **Compatibility:** existing config keys, tracker/browser operation names, plan formats, chaining markers, and generated environment descriptor fields remain backward compatible. New metadata and command variants are additive.
- **Project commands:** the collection guarantees that its own orchestration works in the selected shell. It cannot guarantee that arbitrary target-repository commands are portable; it must select configured shell-specific variants when supplied and report an actionable failure otherwise.
- **Scope:** this document specifies the work. It does not edit any runtime skill, standard reference, descriptor, or tool implementation.

None of these assumptions requires human confirmation because each is reversible and keeps the current POSIX path intact.

## Problem Statement

The collection advertises installable, repository-agnostic automation, and one important subsystem already claims macOS, Linux, WSL2, Git Bash, and native Windows support. That support does not extend to the full pipeline. A native Windows agent reaches Bash-only instructions before it can configure a repository, create an isolated worktree, call guarded tracker operations, parse loop state, or run this repository's own validation gate.

This is not solved by replacing `bash` with `pwsh` in a few examples. The affected snippets include shell variables, `jq`, process substitution, `/tmp`, POSIX redirects, `trap`, signal/PID handling, text pipelines, and cleanup. PowerShell can invoke native programs such as `git` and `gh`, but its language keywords, quoting, object pipeline, error propagation, path rules, and native-argument behavior differ from Bash. Microsoft explicitly documents shell-language constructs as runtime-specific and warns that native argument passing can differ by PowerShell version.

The result today is a partial compatibility story:

- Test-environment generation and browser provisioning have native Windows paths.
- Git Bash and WSL can run most of the remaining pipeline as POSIX environments.
- Native PowerShell cannot reliably run the general pipeline without translating undocumented Bash behavior or installing an additional POSIX shell.

The target outcome is a truthful support claim backed by executable Windows CI evidence.

## Current-state audit

The audit was run against `origin/main` at `69f64b0` on 2026-08-25. Counts are evidence of review surface, not a rule that every Bash block needs a duplicate.

| Surface | Evidence | Native-Windows assessment |
|---|---:|---|
| Collection size | 36 skill directories; 279 Markdown files under `skills/` | Broad enough that a per-file ad hoc fix will drift. |
| Shell examples | 92 fenced Bash blocks in 30 files; 2 fenced PowerShell blocks in 2 files | Compound orchestration is overwhelmingly POSIX-only. |
| Config loading | 24 skill Markdown files mention `jq`; 15 `agentic-setup.md` copies contain explicit Bash/`jq` mechanics | First-run and per-run setup can fail before the skill's main work begins. |
| Worktree setup | 9 duplicated `references/worktree-setup.md` files, all with Bash recipes | Every isolated PR workflow needs a native equivalent and synchronized semantics. |
| Tracker provider | Shipped GitHub descriptor uses Bash guard functions, loops, redirects, temporary files, and variable assignment around otherwise portable `gh` commands | `gh` is available on Windows, but the descriptor glue is not native PowerShell. |
| Loop/reference helpers | Command-heavy run-folder lookup, executor dispatch, review, label transition, and changelog window references use Bash and `/tmp` | Long-running/resumable variants remain blocked after basic worktree support. |
| Repository gate | `.ai/agentic.config.json` runs `bash scripts/lint.sh`; `package.json` invokes `scripts/lint.sh`; CI only proves Ubuntu | A native Windows contributor cannot reproduce the configured local gate without Bash. |
| Developer install | `scripts/install-skills.mjs` creates directory symlinks using `type: "dir"` | Windows symlink creation may require privilege or Developer Mode; Node supports directory junctions as the lower-friction directory-link primitive. |
| Line endings | No repository `.gitattributes`; generated test-environment guidance already requires LF for `.sh` | Git Bash compatibility and shell-wrapper reliability can regress under `core.autocrlf=true`. |

### Already portable; preserve rather than redesign

- `om-prepare-test-env` already selects `.sh` on POSIX/Git Bash/WSL and `.ps1` on native Windows, defines equivalent entrypoint semantics, handles Windows paths and line endings, and records `platform` in `test-env.json`.
- `om-integration-tests` already requires matching native POSIX and PowerShell scenario launchers when scaffolding agent-browser tests.
- The `agent-browser` descriptor ships a native Windows executable path and PowerShell installation recipe; `scripts/test-browser-providers.mjs` covers the Windows asset matrix.
- PR #18 established the correct pattern: one semantic contract, native implementations, identical output fields, and platform-specific tests. This proposal extends that pattern to the rest of the pipeline instead of changing the test-environment contract again.

### Blocking gaps

1. **P0 — setup bootstrap:** the canonical config-loading recipe assumes Bash and `jq`. A fresh native-Windows repository cannot consistently reach the rest of the workflow.
2. **P0 — tracker mutations:** the GitHub provider's guards and multi-command operations are Bash programs. Claiming, labeling, creating PRs, preserving multiline bodies, and evidence upload need PowerShell implementations with identical operation outputs.
3. **P0 — isolated worktrees:** all nine worktree references use Bash conditionals, command substitution, and trap-style cleanup. The core author/reviewer skills therefore cannot honor their isolation contract natively.
4. **P1 — validation selection:** `validation.commands` has no way to express different shell syntax for the same gate. This repository's configured gate is itself Bash-only.
5. **P1 — loop and release helpers:** resumable loop engines and changelog reachability use POSIX temp paths and text pipelines.
6. **P1 — verification gap:** no `windows-latest` job proves that PowerShell examples parse or that the core setup/worktree/tracker contract works without Bash.
7. **P2 — contributor tooling:** the installer link type, audit script, Codex E2E harness, and missing line-ending policy make Windows development less reliable even after runtime skills are fixed.

### External research and adopted guidance

- The [Agent Skills specification](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx) says bundled script-language support depends on the agent implementation. Therefore the core installed skills should not introduce a mandatory new Python or Node runtime merely to avoid shell pairing.
- The official [Agent Skills quickstart](https://github.com/agentskills/agentskills/blob/main/docs/skill-creation/quickstart.mdx) demonstrates adjacent Bash and PowerShell recipes for the same operation. This supports explicit variants for shell-language logic.
- Microsoft's [running commands in PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/learn/shell/running-commands) guidance distinguishes native executables from shell-specific language keywords. The design keeps simple `git`/`gh` argv calls single-sourced where quoting is identical and pairs compound language logic.
- Microsoft's [PowerShell parsing guidance](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing) documents platform/version-specific native-argument behavior. The design requires argv-safe calls and tests paths containing spaces instead of promising textual translation.
- Microsoft's [PowerShell path syntax](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_path_syntax) notes that slash-agnostic cmdlet paths do not guarantee native applications accept the same separators. Stored contracts remain repo-relative with `/`; execution recipes resolve native paths before passing them to native applications.
- GitHub's [workflow command documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands) notes that PowerShell 7 uses UTF-8 by default while Windows PowerShell 5.1 does not. The full pipeline baseline is PowerShell 7, and any 5.1 fallback must set encoding explicitly.
- Node's [filesystem documentation](https://nodejs.org/api/fs.html) defines `junction` as a Windows directory-link type and normalizes its target to an absolute path. The development installer should use junctions on Windows while retaining directory symlinks elsewhere.

## Proposed solution

Adopt one platform execution contract across the collection and implement it in the existing per-skill reference structure.

### 1. Execution-family contract

Every skill preflight resolves one of two execution families before running shell logic:

| Family | Selected when | Required interpreter | Notes |
|---|---|---|---|
| `posix` | The active environment provides a POSIX-compatible `sh`; includes macOS, Linux, WSL2, Git Bash/MSYS | POSIX `sh`; Bash only when a recipe explicitly needs it | Current behavior remains valid. |
| `powershell` | The agent is operating natively on Windows without choosing the POSIX path | PowerShell 7 (`pwsh`) | Must not call `sh`, WSL, Git Bash, `jq`, or POSIX utilities implicitly. |

Rules:

- Use the active environment; do not silently cross from native PowerShell into WSL or Git Bash.
- Treat `git`, `gh`, `node`, and project CLIs as native executables. A simple argv invocation may be shown once if it parses identically in both families.
- Any compound recipe using variables, conditionals, loops, pipelines, redirection, temporary files, background jobs, cleanup, or JSON parsing must provide explicit POSIX and PowerShell forms, or move the semantics into an already-required cross-platform executable.
- PowerShell recipes start with strict failure behavior, check `$LASTEXITCODE` after native commands, and use `try`/`finally` for cleanup. They must not mutate the machine-wide execution policy.
- Stored paths and cross-skill outputs remain repo-relative with `/`. Resolve to native absolute paths only at the invocation boundary; test spaces, Unicode, drive-letter paths, and long worktree paths.
- Temporary directories use the platform temp API and include a skill/run-specific suffix. Never hard-code `/tmp` or a drive root.
- Config JSON uses PowerShell built-ins (`Get-Content -Raw | ConvertFrom-Json`) in the PowerShell family; `jq` remains allowed only on the POSIX path where the recipe declares it.
- User-facing command examples must match the selected family. Reports name which family ran.

This contract belongs in the shared section of every `references/agentic-setup.md` copy. Because that is a standard file, the implementation must enumerate all skills carrying it and ask whether to synchronize the shared change before editing, as required by `AGENTS.md`.

### 2. Additive validation-command selection

Extend `validation` without removing or changing `commands`:

```json
{
  "validation": {
    "commands": ["node scripts/lint.mjs"],
    "commandsByShell": {
      "posix": ["bash scripts/check-generated.sh"],
      "powershell": ["pwsh -NoProfile -File scripts/check-generated.ps1"]
    }
  }
}
```

Resolution order:

1. Use the non-empty `validation.commandsByShell.<execution-family>` array when present.
2. Otherwise use the legacy `validation.commands` array unchanged and execute each command in the active shell.
3. Treat a syntax/interpreter failure as a gate failure with the exact command, shell family, and remediation. Do not auto-translate repository-owned commands.

`commandsByShell` is optional and additive, so the config schema stays at version 1. Updated setup writes it only when the detected commands genuinely differ. Old skills ignore it and keep using `commands`; updated skills continue to work with old configs. The implementation must update `.ai/agentic.config.json` and `SDLC.md` together in this repository.

### 3. Dual-recipe standard references

Keep the current standalone-install model; do not introduce cross-skill file pointers.

- Add platform selection and config loading to the shared portion of each `agentic-setup.md` copy.
- Add semantically equivalent PowerShell create/cleanup sections to all nine `worktree-setup.md` copies:
  - `om-auto-continue-pr-loop`
  - `om-auto-continue-pr`
  - `om-auto-create-pr-loop`
  - `om-auto-create-pr`
  - `om-auto-fix-issue`
  - `om-auto-fix-pr`
  - `om-auto-qa-pr`
  - `om-auto-review-pr`
  - `om-auto-write-spec`
- Preserve exact branch, detached-worktree, reuse, cleanup ownership, and no-nesting semantics. The recipes may differ syntactically but not behaviorally.
- Keep skill-specific behavior below the marked specifics section. Do not fork the shared contract per skill.

### 4. Platform-aware tracker descriptors

Update `skills/om-setup-agent-pipeline/references/trackers/TEMPLATE.md`, the shipped GitHub descriptor, and this repository's `.ai/trackers/github.md` in the same implementation PR.

Descriptor rules:

- Add a stable `Execution families: posix, powershell` capability line near prerequisites.
- For shell-neutral single native invocations, document the command once and state the returned value semantically rather than assigning a Bash variable.
- For guards and compound operations, provide `POSIX` and `PowerShell` subsections with identical inputs, outputs, and failure behavior.
- Preserve every named operation and guard name. PowerShell functions use the same conceptual guard names (`label_exists`, `apply_label`, and peers) even if PowerShell naming conventions would normally differ; skills refer to the contract names, not language symbols.
- Multiline bodies always use body files or stdin; no shell-dependent inline quoting.
- PowerShell temporary evidence files live under the platform temp directory and are removed in `finally`.
- Existing repo-local descriptor customizations remain authoritative. On native PowerShell, an older descriptor with no PowerShell capability may execute shell-neutral native commands, but a skill must stop before the first compound mutation and point to `om-apply-upgrade-notes`; it must not silently substitute the shipped descriptor or guess around custom operations.

This preserves old descriptors on their existing POSIX path while making the new Windows capability opt-in through an explicit descriptor upgrade.

### 5. Command-heavy reference migration

After setup, worktrees, and tracker operations work, audit the remaining 92 Bash fences. Each block receives one classification:

- `shell-neutral-native`: keep one command form and prove argv/path behavior on both families.
- `paired-shell-logic`: add a PowerShell recipe with the same semantic output.
- `posix-project-command`: keep it POSIX-only, state the prerequisite, and define the native-Windows fallback or clean stop.
- `obsolete`: replace with shell-neutral prose or remove if no skill needs to execute it.

The first migration set includes the command-heavy references found in:

- `om-auto-create-pr-loop` and `om-auto-continue-pr-loop`: executor dispatch, run-folder layout/lookup, step review, claim/finalization helpers.
- `om-auto-qa-pr`: bootstrap environment handling.
- `om-auto-review-pr`: label transitions.
- `om-auto-update-changelog`: release-window reachability and temporary commit sets.
- `om-create-skill`: completeness and reference gates.
- `om-setup-agent-pipeline`: skill coverage and provider installation.

The implementation must add a portability lint that reports unclassified executable fences. It should not require meaningless PowerShell duplicates for shell-neutral commands.

### 6. Cross-platform repository tooling

Make this repository itself a reliable Windows fixture:

- Move the authoritative lint implementation to `scripts/lint.mjs`; retain `scripts/lint.sh` as a compatibility wrapper so the protected `bash scripts/lint.sh` entry point continues to work.
- Change `package.json`, this repository's `validation.commands`, and the primary CI gate to invoke the Node implementation. Update `SDLC.md` with the same command.
- Port `scripts/audit-skills.sh` to a cross-platform Node implementation or retain it as an Ubuntu-only informational job with an explicitly scoped support statement. The required PR gate must not depend on it.
- Add a native PowerShell contract harness for setup/config parsing, worktree lifecycle, tracker guard behavior with a mocked CLI, path/quoting, and cleanup.
- Keep the existing POSIX Codex E2E harness; add a native Windows smoke path or a provider-contract fixture that exercises `.ps1` without invoking `sh`.
- In `scripts/install-skills.mjs`, use a directory junction on Windows and the existing directory symlink elsewhere. Preserve all flags, ownership detection, force behavior, and uninstall behavior; add tests for both strategies.
- Add `.gitattributes` at minimum for `*.sh text eol=lf` and `*.ps1 text`, matching the already-shipped generated-script guidance.

### 7. Support matrix and documentation

Document the result in `README.md` and `DECISIONS.md` only after CI proves it:

| Environment | Expected status after implementation |
|---|---|
| macOS/Linux POSIX | Fully supported; no behavior regression. |
| WSL2 | Fully supported through POSIX family. |
| Windows + Git Bash/MSYS | Fully supported through POSIX family; LF policy enforced. |
| Native Windows + PowerShell 7 | Fully supported for setup, PR pipeline, review, QA orchestration, and local repository gate. |
| Native Windows + Windows PowerShell 5.1 only | Limited compatibility for explicitly documented legacy flows; full pipeline preflight requests PowerShell 7. |

Do not use “works on Windows” without naming the tested shell and prerequisites.

## Contract and Compatibility Review

| Protected surface | Change | Compatibility treatment |
|---|---|---|
| Skill names/layout | None | No renames, aliases, or directory moves. |
| Config schema | Add optional `validation.commandsByShell` | Version remains 1; legacy `commands` stays the fallback and is never removed. |
| Tracker operations/guards | Add execution-family recipes and capability marker | Names, inputs, outputs, and semantics remain identical; template and shipped/repo descriptors update together. |
| Browser operations | No semantic change | Existing Windows implementation is retained and reused as precedent. |
| Cross-skill files | No format change | Progress, tracking-plan lines, chaining references, and `test-env.json` remain unchanged. |
| Label taxonomy | None | No label additions, removals, or semantic changes. |
| Installer CLI | Internal Windows link strategy change | Existing scripts/flags/output remain; ownership detection accepts junctions created by this repository. |
| Lint CLI | Add Node implementation | `scripts/lint.sh` remains as a wrapper for existing callers. |

No migration may require consumer repositories to regenerate `.ai/agentic.config.json`. Descriptor upgrades are needed only to enable native PowerShell mutations; POSIX use of older descriptors remains unchanged.

## Edge Cases and Failure Scenarios

| Scenario | Required behavior |
|---|---|
| Repository path contains spaces or Unicode | All setup, worktree, body-file, and validation operations succeed; no string-built command line is evaluated. |
| Windows drive or UNC path | Resolve with platform APIs; never concatenate a POSIX root or assume `C:` is part of a shell token. If Git worktrees do not support the resolved target, stop before mutation with the exact path and Git error. |
| Only Windows PowerShell 5.1 is installed | Full-pipeline preflight stops with a PowerShell 7 prerequisite; already-supported 5.1 flows keep their explicit encoding/execution-policy fallback. |
| `gh` or tracker CLI missing | The descriptor's auth/prerequisite check fails before claims or partial label mutations. |
| Old repo-local tracker descriptor on PowerShell | Execute only shell-neutral reads that are unambiguous; stop before compound mutation and name the descriptor upgrade path. Never replace custom content silently. |
| Only legacy `validation.commands` exists | Execute it in the active shell. On shell syntax failure, fail the gate and recommend adding `commandsByShell`; never report success based on a translated guess. |
| PowerShell native command returns non-zero without throwing | Recipe checks `$LASTEXITCODE` and fails; `$ErrorActionPreference` alone is insufficient. |
| Interrupted worktree run | `finally` removes only the worktree created by that run and prunes metadata; the user's primary checkout and pre-existing worktrees remain untouched. |
| `core.autocrlf=true` | `.sh` files retain LF; PowerShell files remain readable; CI validates line endings. |
| Windows symlink privilege unavailable | Development installer uses a junction and does not request elevation or Developer Mode. |
| Shell families produce different text/JSON | Contract tests compare normalized semantic outputs, not cosmetic whitespace. Parsed markers remain byte-compatible where consumers require exact lines. |

## Security and Safety Review

- Do not loosen the untrusted-content boundary while adding platform recipes.
- Never use `Invoke-Expression`, `cmd /c` string construction, or PowerShell's stop-parsing token as a general quoting workaround. Pass arguments as arrays/native argv.
- Do not change machine-wide execution policy, enable Developer Mode, request elevation, or install WSL/Git Bash automatically.
- Preserve the exact destructive-action scope of cleanup. PowerShell `Remove-Item -Recurse -Force` is allowed only for an explicitly resolved, run-owned temporary/worktree path after validation; broad roots and unresolved variables remain forbidden.
- Tracker body and evidence operations continue using files/stdin to prevent interpolation and secret leakage.

## Validation Strategy

### Static gates

- Existing frontmatter, product-agnosticism, reference resolution, roster, and tracker-abstraction assertions run through `node scripts/lint.mjs` on Ubuntu and Windows.
- A portability check inventories executable Markdown fences and rejects any new compound Bash block that lacks a classification or PowerShell pair.
- Parse every committed/generated `.ps1` fixture with PowerShell's parser; parse POSIX scripts with the current shell gate.
- Verify `.gitattributes` line-ending policy.

### Windows execution matrix

Add a `windows-latest` CI job whose `run` steps use `shell: pwsh` and never invoke Bash:

1. Load minimal, full, and legacy `.ai/agentic.config.json` fixtures; resolve defaults and `commandsByShell` correctly.
2. Create and clean an isolated Git worktree in a path containing spaces; assert the primary worktree is unchanged.
3. Exercise GitHub descriptor guard functions against a mock `gh` executable/function: missing label degrades, disabled labels no-op, pipeline labels remain exclusive, multiline bodies preserve formatting, and non-zero exits fail.
4. Verify run-folder and temporary-file helpers with native temp paths.
5. Run the Node lint and browser-provider platform matrix.
6. Install and uninstall fixture skills through Windows junctions without elevation.
7. Execute a PowerShell test-environment/provider fixture and assert no `sh`, WSL, Git Bash, `jq`, or POSIX utility is launched.

### Regression matrix

- Keep an Ubuntu POSIX job running the compatibility wrapper `bash scripts/lint.sh` and representative POSIX recipes.
- Add a Windows Git Bash lane only for the LF/Git-Bash support claim; it is not evidence for native PowerShell.
- Require both native Windows and POSIX jobs before the support claim is published.

## Risks & Impact Review

- **Highest risk — duplicated standard files:** platform policy and worktree logic can drift across skills. Mitigation: synchronize all copies in one implementation PR, machine-check shared sections, and follow the repository's mandatory ask-before-sync rule.
- **High risk — tracker parity:** a PowerShell guard that partially mutates labels or claims before failing could corrupt pipeline state. Mitigation: mock-driven operation tests and identical postconditions for both families.
- **Medium risk — config precedence:** updated and old skills may choose different validation arrays. Mitigation: additive fallback order, documentation, and no removal of `commands` until a future versioned migration (not proposed here).
- **Medium risk — documentation size:** naively pairing all 92 Bash blocks would inflate token cost. Mitigation: pair only compound shell logic, keep native argv commands single-sourced, and push detail into the existing per-skill references.
- **Medium risk — PowerShell version behavior:** quoting and encoding differ between 5.1 and 7. Mitigation: one full-pipeline baseline (7), explicit limited 5.1 status, and CI on the baseline.
- **Low risk — developer tooling migration:** moving lint logic to Node can change edge-case output. Mitigation: golden tests comparing current lint fixtures and retaining the Bash wrapper.

Rollback is phase-local: revert the relevant phase commits. Because config additions are optional and no existing format is rewritten, reverting leaves legacy POSIX consumers functional. Consumer repos that copied a newer descriptor retain an additive PowerShell section that older skills ignore.

## Phasing

### Phase 1: Platform contract and cross-platform gate

Ship the execution-family policy, additive validation schema, Node lint implementation plus Bash wrapper, Windows junction installer behavior, `.gitattributes`, and initial Windows CI fixtures. This phase makes the repository's own portability requirements executable without claiming the full skill pipeline is ready.

### Phase 2: Core PR pipeline on PowerShell

Synchronize agentic setup and all nine worktree standard references; add PowerShell tracker descriptor implementations; migrate the core author/reviewer paths (`om-auto-create-pr`, continue, fix, review, open PR, setup). Prove an end-to-end fixture can plan, worktree, validate, and prepare tracker mutations natively.

### Phase 3: Loop, QA, release, and authoring coverage

Migrate command-heavy loop, QA bootstrap, changelog, create-skill, and coverage references; complete the 92-fence classification; add regression lint; publish the support matrix only when all lanes pass.

Each phase is independently shippable and preserves the POSIX pipeline.

## Implementation Plan

### Phase 1: Platform contract and repository gate

1. Document the `posix`/`powershell` execution-family contract and PowerShell 7 baseline in `AGENTS.md`, `DECISIONS.md`, and the setup skill's schema/reference material; add `validation.commandsByShell` with legacy fallback and update `.ai/agentic.config.json` plus `SDLC.md` together.
2. Reimplement the lint gate in `scripts/lint.mjs`, retain `scripts/lint.sh` as a wrapper, switch package/config/CI callers to Node, and add golden lint fixtures.
3. Make `scripts/install-skills.mjs` use Windows junctions with ownership-safe uninstall; add `.gitattributes` and cross-platform installer tests.
4. Add the `windows-latest` PowerShell contract job and a portability-fence inventory that initially reports the Phase 2/3 backlog without blocking unchanged legacy files.

### Phase 2: Core pipeline recipes

1. Before editing standard references, enumerate every affected `agentic-setup.md` and `worktree-setup.md` owner and obtain the repository-required synchronization decision; record it in the implementation plan/PR.
2. Synchronize platform selection and native config loading across all affected `agentic-setup.md` copies, preserving skill-specific sections.
3. Add equivalent PowerShell worktree create/reuse/cleanup recipes to all nine standard `worktree-setup.md` copies and add path-with-spaces lifecycle tests.
4. Add execution-family capability and PowerShell implementations to the tracker template, shipped GitHub descriptor, and repo descriptor; test guarded reads/mutations against a mock CLI.
5. Update the setup, create/continue, fix, open-PR, and review workflows to select recipes mechanically and report the execution family; run a native Windows end-to-end fixture and the full POSIX regression gate.

### Phase 3: Complete collection coverage

1. Classify every executable Bash fence and migrate the loop/run-folder/step-review references for create/continue loop skills.
2. Migrate QA bootstrap, review label transitions, changelog release-window, create-skill gates, setup coverage, and remaining command-heavy outliers.
3. Port or explicitly scope informational developer scripts, add the native PowerShell provider/test-environment smoke path, and turn the portability inventory into a blocking lint rule for new regressions.
4. Re-run all Windows and POSIX gates, verify protected contracts and standard-file synchronization, then update README support claims and release notes.

## Completion Criteria

- A native `windows-latest` PowerShell job completes setup/config loading, worktree lifecycle, tracker guard fixtures, validation selection, lint, installer, and provider smoke tests without invoking Bash, WSL, Git Bash, `jq`, or POSIX utilities.
- Representative `om-auto-create-pr` and `om-auto-review-pr` fixture runs reach their expected tracker-operation boundary using only the PowerShell family and preserve exact Progress/chaining formats.
- All nine worktree copies and all affected agentic-setup shared sections are synchronized, with the required user sync decision documented.
- Updated and legacy configs both resolve validation commands correctly; older descriptors continue on POSIX and fail cleanly with an upgrade path on native PowerShell before mutation.
- `bash scripts/lint.sh` remains green and behavior-compatible; `node scripts/lint.mjs` is the authoritative cross-platform gate.
- README claims native Windows support only after required Windows CI is green.
- No protected contract listed in `BACKWARD_COMPATIBILITY.md` is renamed, removed, or made mandatory without a fallback.
