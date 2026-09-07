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
**Prototype**: {path compared, from the spec's Prototype line | none linked}.
**Screens walked**: {screens, tasks performed, viewport(s)}.
**Not walked**: {only skipped required coverage and the reason}.
