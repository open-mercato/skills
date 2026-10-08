# Guard pass — static design-contract conformance

A deterministic check of source against the design contract, with no browser.
It runs three ways: inside a full review (workflow step 5, over the diff), on
its own with `--guard` (over the diff, one marker-idempotent comment), and
repository-wide with `--guard --health [<path>]` (counts and trend, no
per-line findings). It never edits source.

## 1. Build the rule set

Load, in this order, and drop later duplicates by `id`:

1. Team-authored rules from `.uxproof/guards.json` (no `origin`).
2. Layer rules from the same file (`origin` set; shape in the `om-ux-setup`
   contract format).
3. Rules derived from the contract itself, only when the facts behind them
   exist:
   - `derived/raw-color` — a literal color value (hex, `rgb(`/`hsl(`, or a
     palette utility class of the styling system) on a UI line while
     `tokens.json` declares color tokens whose `source` is not `proposed`.
     Severity `critical` when the tokens carry a `dark` or `both` theme (the
     literal breaks theming), otherwise `warning`. Fix: the matching token.
   - `derived/raw-native` — a native element listed in
     `contract.json.nativeEquivalents` used directly. Severity `critical`: the
     house component carries focus, disabled, and error behavior the raw
     element skips. Fix: the registered component.
   - `derived/duplicate-component` — a new component file in the diff whose
     name or role duplicates a `components.json` entry. Severity `warning`,
     citing the registry entry. A new component is justified only when no
     registered one serves the case; say which case it serves or ask.

Proposed tokens (`source: "proposed"`) never arm a rule. No `.uxproof/` at all
→ the pass reports "no design contract" and produces no findings.

## 2. Scope the matches

- **Diff scope** (full review and `--guard`): only lines the diff adds or
  changes. Pre-existing hits in touched files are reported as one count per
  rule ("N older occurrences in files this PR touches"), never as findings of
  this PR.
- **Health scope**: every file under `<path>` (default: the repository root)
  matching each rule's `files` globs, excluding generated, vendored, and
  dependency directories.
- Match with a regex engine over quoted arguments (for example
  `grep -nE -e "$pattern" -- "$file"`); never splice a pattern into a shell
  command. `when`/`require` rules match per file: a file matching `when` and not
  `require` is one hit at line 1.

## 3. Triage every hit

- **Exempt** — the line carries `exemptMarker` plus a reason: skip it. A marker
  without a reason is a `warning` of its own.
- **Candidate exemption** — the hit is real text but the rule's `why` does not
  apply (a color used for decoration rather than meaning, a raw element inside
  the house component's own implementation): report it as "exempt with a
  reason", not as a violation.
- **Violation** — everything else, keeping the rule's severity. Group repeated
  hits of one rule in one file into a single entry with its line list.
- A hit from a layer the contract reports as stale (installed version differs
  from the stamp) keeps its severity but states the stale stamp.

## 4. Plan the remediation

Order the violations into a plan the author or a fix skill can execute:
shared components first (a fix there repairs every screen that uses them), then
screens, then tests and fixtures. Each step names the file, the rule, the lines,
and the exact replacement from the rule's `fix`. Cases the rule cannot decide
(an ambiguous mapping, a contrast check in an unusual context) are listed as
"check by hand". This skill never applies the plan.

## 5. Health (`--health` only)

- Count hits per rule, and per area: the immediate subdirectories of `<path>`,
  or of the contract's component roots and archetype example directories when
  no path is given.
- For each `when`/`require` rule, report coverage: files satisfying `require`
  out of files matching `when`, as a percentage.
- Delta: when the config names `ux.healthReport` (a repository-relative file),
  read its last committed revision as the baseline, compare every metric, then
  overwrite that one file with the new report. Without the key, report absolute
  numbers only and write nothing. Never commit the file: recommend committing it
  only in a change dedicated to design-system work, and restoring it otherwise
  so unrelated commits do not sweep it in.
- Rank areas by total violations; the suggested next area is the top of that
  ranking, never a guess.
