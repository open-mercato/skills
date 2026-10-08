# Report templates

The user-facing shapes `om-app-spec-writing` produces: the Phase 5 handoff summary, the final report, the `--review` report, and the `--stories` critique a calling skill parses. Lead with the decision; the App Spec file holds the detail, so link it instead of replaying it. Omit empty optional sections.

## Handoff summary (Phase 5, before confirmation)

```markdown
📝 App Spec `{app name}` is ready for confirmation: {one sentence — who it serves and the measurable goal}.

| Phase | Workflows | Stories | Atomic commits | Blocks ROI? |
|---|---|---|---|---|
| 1 — {name} | WF1, WF2 | {n} | {n} | {no / what} |

- ✅ Challenger gates: {n}/{n} sections passed{; open WARNINGs logged in §10: n}
- ✅ Architect checkpoints: {#1, #2 status}
- ⚠️ Docs-only mappings still ungrounded: {n} — {the ones that decide a phase}
- ⛔ Blockers before Phase 1: {BLOCKER questions from §10, or omit the line}

Proposed features, in order: {n} — {one line each: goal → phase}.
Confirm to write the feature briefs and start `om-spec-writing` on the first one.
```

## Final report

Three to six lines, then the decomposition table when briefs were written:

```markdown
🎯 `om-app-spec-writing`: {outcome — App Spec confirmed / review delivered / stopped at Phase 0 for answers}.
📝 App Spec: {repo-relative path}
{Decisive open risk or blocker, when one remains.}
{Next action — the next feature to spec, or what the user must answer.}

| Feature | Phase | Brief | Spec status |
|---|---|---|---|
| {goal} | {n} | {path} | {written: <spec path> / next / waiting} |
```

## Review report (`--review`)

Same shape `om-spec-writing` uses for architectural reviews, applied to the business level:

```markdown
# 🔍 App Spec Review: {app name}

{Verdict and reason in 1–2 sentences: proceed to hand-off, revise, or resolve a direction call first.}

## ⚠️ Decision needed
{Only for an unresolved business or scope choice: the question, recommended answer, trade-off, and evidence still needed.}

## 🔍 Findings
- **{Critical|High|Medium|Low}: {specific problem}.** {Section and checklist item → consequence → recommended correction.}

## 🧪 Checklist appendix
| Section | Checklist | Result |
|---|---|---|
| §1.4 Domain Model | entity fields precise | ❌ `case_study` fields untyped |

## Review limits
{What was not checked — e.g. mappings left docs-only, knowledge sources not installed.}
```

Omit empty severity buckets; the appendix lists failed items and a pass count per section rather than every passing line.

## Story critique (`--stories <file>`)

Returned to the calling skill, which decides what enters its own file. Keep the field names exact — callers parse them:

```markdown
## Story critique — {input file}

### Epic {id}: {name}
- **Proposed story**: {title} — {as a [role], I want [capability], so that [outcome]}
  - **Addresses**: {coverage category, e.g. negative-path | race-condition | tenant-isolation | …}
  - **Acceptance criteria**: {1–3 criteria}
  - **Why**: {the failure or conflict it closes, citing the existing story id}
- **Missing path**: Story {id} — {alternate | failure}: {what happens → system state after}
- **Contradiction**: Stories {id} and {id} — {conflict pattern} → {resolution to confirm}
- **Out-of-scope candidate**: {category} — {why it may not apply; the caller must confirm the reason with its user}
```

List only epics with findings; end with one line: `Critique: <n> proposed stories, <n> missing paths, <n> contradictions`.
