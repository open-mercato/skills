# Filing and updating issues

How `om-auto-audit-dependencies` turns kept findings into tracker issues (step 5):
one issue per vulnerable package, never a duplicate, updated in place on later runs.

## Identity marker

Every issue this skill files carries, as the first line of its body, the stable
marker

`` 🤖 `om-auto-audit-dependencies` — dependency <ecosystem>/<package> ``

It is the dedupe key. Parse it with the canonical pattern that accepts both the
backticked and the bare `🤖 om-auto-audit-dependencies —` form, and match it on
any line of the body: it is written first, but a person or another skill may
have edited the issue since. Several versions of one package (two lockfiles)
share one issue.

## Dedupe — before any create

For each kept package:

1. **search-issues** (open and closed) for the marker text plus the package name.
   Read candidates with **get-issue** and match the marker exactly.
2. **search-issues** (open) for each advisory id and alias — catches an issue a
   person filed by hand. Confirm that the same ecosystem and package are in
   scope; an advisory id alone may cover several packages.

Before updating any existing issue, run the three-signal claim check using its
assignees, labels and recent claim comments from **get-issue**, with the current
login from **current-user**. An item claimed by another actor is left unchanged
and reported as deferred; this audit never takes over or releases anyone's lock.

Then:

| Found | Action |
|---|---|
| Own open issue | Re-render the body. Unchanged → leave it (count `unchanged`). Changed (new advisory, new target, new lockfile) → **update-issue** the body, then one **comment-issue** naming only what changed (count `updated`). Labels: raise priority when a new advisory is more severe; never lower it. |
| Hand-filed open issue naming one of the advisories | Do not file. Post the upgrade path once as a marker-idempotent comment (find it via **list-issue-comments**, rewrite via **update-comment**); count `updated`. |
| Own **closed** issue, same package still vulnerable | File a new issue whose body links the closed one ("the earlier fix did not land, or the package regressed"). |
| Nothing | File a new issue. |

An own open issue whose package no longer shows up is not evidence of a fix:
it may be excluded, ignored, below threshold, removed, or in a failed scan.
Only after successfully querying the currently locked version(s) and verifying
that the issue's advisory ids/aliases no longer affect them, post/update one
marker-idempotent comment with purpose `no longer affected` naming the verified
versions. Otherwise report the evidence gap without a resolution claim. Never
close it; closing belongs to the change that fixed it.

## Title

- With a target: `Security: upgrade <package> <installed> → <target> (<n> <highest-severity> advisor<y|ies>)`
- No fixed release: `Security: <package> <installed> has no fixed release (<highest-severity>)`
- Unverified target: `Security: investigate upgrade for <package> <installed> (<highest-severity>)`. Use the no-fixed-release title only when advisory data confirms that fact; a null scanner target alone is insufficient.

Several installed versions → use the lowest installed version in the title.
Package and version strings were validated in step 0; never put advisory
summary text in a title.

## Labels

Through `apply_issue_label`; a missing label is a logged skip. When `SDLC.md`
defines its own inference for any of these, its rules win.

| Label | Rule |
|---|---|
| Category | `security` |
| Priority | highest kept severity — critical → `priority-extreme`, high → `priority-high`, moderate → `priority-medium`, low → `priority-low` |
| Risk | the upgrade, not the advisory — patch/minor jump → `risk-low`; override pin or no fixed release → `risk-medium`; major jump → `risk-high` |

Never pipeline labels, never `in-progress`. Record the set once in a
`` 🤖 `om-auto-audit-dependencies` — 🏷️ label rationale `` comment, one label per
line with a full-sentence reason, rewritten in place on later changes.
When changing priority or risk, remove competing labels in that group through
`remove_issue_label` so exactly one remains; preserve an existing higher
priority, and do not change unrelated classifications.

## Creating the issue

Preferred — invoke `om-prepare-issue` with `--title "<title>"`,
`--priority <level>`, `--risk <level>`, `--skip-dedupe` (dedupe already ran
above), and `--no-spec` (the advisory is the design authority), passing the body
sections from `references/report-templates.md` as the brief so they land
verbatim, with the marker line as an identity field it keeps first. Read its `Issue:` line back.

Fallback when `om-prepare-issue` is not installed — **create-issue** with the
title and the rendered body, then the labels and the rationale comment above,
and note the fallback in the report.

## Dry run

Do every read above, then print one line per planned action instead of mutating:

```
DRY-RUN: create "Security: upgrade lodash 4.17.15 → 4.17.21 (2 high advisories)" [security, priority-high, risk-low]
DRY-RUN: update #42 — added GHSA-xxxx-xxxx-xxxx, target 4.17.20 → 4.17.21
DRY-RUN: comment #57 (hand-filed) — upgrade path for CVE-2026-0001
```
