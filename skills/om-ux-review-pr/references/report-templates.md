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

**Contract**: {applicable design-contract path | no contract; no [PRODUCT] claims}.
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

## Rules for filling it

- Rank by impact × frequency × reach. Usually five to seven findings suffice;
  group optional minor notes without hiding actionable user-impact findings.
- Attach every referenced screenshot; never claim a task was performed from
  static inspection alone. Label inferred recommendations honestly.
- Keep verified conformance defects distinct from policy or product choices.
  Use ⚠️ for a decision the team must own, with the recommended choice and cost.
- Without a design contract, say so once on the Contract line; no `[PRODUCT]`
  findings. Cite the exact applicable rule for every conformance finding.
- Preserve all four finding parts without repeating the consequence in a second
  summary. Evidence tiers remain governed by `references/evidence-tiers.md`.
