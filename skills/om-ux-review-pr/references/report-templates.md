# Report templates

Use one marker-idempotent review comment as the authoritative finding record.
Aim for 150–300 words plus evidence; expand when actionable findings need more
room. Preserve the evidence/pattern/trade-off/acceptance quad for every finding.

## Review comment

Find the marker via **list-issue-comments** and update it with **update-comment**;
attach cited screenshots via **attach-image-evidence**. Re-runs replace the
existing review rather than posting another copy.

```markdown
🤖 `om-ux-review-pr` — evidence-first design review

🔍 {Recommended action and the concrete user-task consequence}.

**Contract**: {applicable visual-contract path | no visual contract}; {confirmed brief/spec/prototype decisions cited | no applicable product decisions}.
**Prototype**: {path compared, from the spec's Prototype line | none linked}.
**Screens walked**: {screens, tasks performed, viewport(s)}.
**Not walked**: {only skipped required coverage and the reason}.

### 🔍 Findings

1. **{Consequence-first title}** `<EVIDENCE-TAG>`
   - **Evidence**: {screen/element, observation, screenshot link, applicable rule or source}.
   - **Pattern**: {specific change; an existing repository pattern when available}.
   - **Trade-off**: {cost or deliberate choice needed}.
   - **Accept when**: {observable criterion}.

### 📸 Evidence
{Referenced screenshots, each captioned with the screen and state it proves}.

{Only when consequential: checks not run or findings mostly based on assumptions}.
_Advisory review; the author decides how to address these findings._
```

Omit empty findings, a routine “Strong” section, and lists of checks that passed.
Keep partial-coverage limitations visible. A clean review states the task that
worked and the evidence supporting it; do not manufacture criticism or praise.
In local mode return this report with artifact paths and state on the Contract
line that nothing was posted. In PR mode the final reply links this review with
its recommendation and next action in 3–6 lines.

## Guard comment (`--guard`)

Same marker discipline as the review comment, with its own marker so it never
replaces a full review. Lead with what the violations do to users; keep every
violation's rule, lines, and fix.

```markdown
🤖 `om-ux-review-pr` — design-contract guard

🔍 {Recommended action and the user-visible consequence of the worst violations}.

**Contract**: {contract path; layers with version, stale ones marked | no design contract}; {N} rules ({team}/{layer}/{derived}).
**Scope**: {N} changed lines in {N} files; {N} older occurrences in touched files, not counted against this change.

### 🔍 Violations
- ❌ **critical** `{rule id}` — {file}:{lines} — {what the line does} → {fix}. {why}
- ⚠️ **warning** `{rule id}` — {file}:{lines} — {…} → {fix}.
- **info** `{rule id}` — {…}

### 📋 Remediation plan
1. {Shared component first: file, rule, lines, exact replacement}.

{Only when present: exempt-with-a-reason candidates, and cases to check by hand.}
_Advisory; the author decides how to address these._
```

A clean pass says so in one line with the rule count and scope, and still
states older occurrences when there are any.

## Health report (`--guard --health`)

Returned locally; written to `ux.healthReport` only when configured.

```markdown
🔍 Design-contract health — {path or repository}, {date}: {the one trend that matters most, and the suggested next area}.

| Rule | Severity | Count | Change | Target |
|---|---|---|---|---|
| `{rule id}` | {severity} | {N} | {+N / −N / new / no baseline} | 0 |
| `{when/require rule id}` coverage | {severity} | {N}% | {±N pts} | 100% |

**By area** (worst first): {area — total; top rule}.
**Next area**: {top of the ranking}.
{Only when relevant: stale layers, rules skipped as invalid, baseline missing.}
```

## Rules for filling it

- Rank by impact × frequency × reach. Usually five to seven findings suffice;
  group optional minor notes without hiding actionable user-impact findings.
- Attach every referenced screenshot; never claim a task was performed from
  static inspection alone. Label inferred recommendations honestly.
- Keep verified conformance defects distinct from policy or product choices.
  Use ⚠️ for a decision the team must own, with the recommended choice and cost.
- Without a visual contract, say so once on the Contract line. `[PRODUCT]`
  findings may still cite confirmed brief/spec/prototype decisions about
  accepted behavior; neutral styling and unconfirmed assumptions do not qualify.
  Cite the exact applicable rule or accepted decision for every such finding.
- Preserve all four finding parts without repeating the consequence in a second
  summary. Evidence tiers remain governed by `references/evidence-tiers.md`.
