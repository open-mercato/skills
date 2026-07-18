# 🎨 Designer

The pipeline gives you a written spec with visuals attached: UI mockups of the proposed layout sitting next to screenshots of the current app, so a review is a design review, not a guessing game. When a browser provider is configured, `om-auto-write-spec` boots the running app through `om-prepare-test-env`, captures the current-state screenshots, and generates mockups as PR evidence — all on a ready, labeled spec PR with an assumptions comment you can correct. Once the design is agreed, the same visuals reappear as before/after screenshots when the change is built.

← Back to the [README](../../README.md#-workflows-by-role)

## Skills you'll use

| Skill | When | Example call | What you get |
|---|---|---|---|
| `om-auto-write-spec` | Propose a redesign with visuals | `/om-auto-write-spec "Redesign the checkout summary panel — include mockups of the new layout and screenshots of the current one"` | a spec PR with mockups, current-app screenshots, and an assumptions comment |
| `om-auto-write-spec` | Spec a brand-new surface | `/om-auto-write-spec "Onboarding wizard for first-time merchants"` | a spec PR with proposed-flow mockups |
| `om-auto-implement-spec` | See the design built | `/om-auto-implement-spec 2026-07-18-checkout-redesign` | the change implemented with before/after screenshots from the working app |
| `om-auto-verify-pr-ui` | Check the UI on an open PR | `/om-auto-verify-pr-ui 123` | screenshots of the changed flow + a pass/fail report on the PR |

## What happens automatically

- **Mockups + current-app screenshots** attached to the spec PR when a browser provider exists (degrades to text-only when it doesn't).
- **Assumptions comment** — autonomous Open-Questions defaults are posted for you to override, not silently baked in.
- **Full SDLC labels** on the spec PR, plus chain markers so `om-auto-implement-spec` reuses the same branch/PR.
- **Before/after screenshots** from the real app on the implementing PR via `om-auto-verify-pr-ui`.
- **Claim locks** — an issue-driven spec run claims the issue so concurrent agents back off.

## Tips

- Say "include mockups of the new layout and screenshots of the current one" in the brief — naming the visuals you want is what forces them into the spec PR.
- Describe the surface concretely (which page, which panel, which states) so the current-app screenshots capture the right flow.
- No browser provider set up yet? Run `/om-prepare-test-env` first, or ask QA to — otherwise the spec degrades to text-only with no screenshots.
- Reply on the assumptions comment to steer the design; the autonomous defaults exist to be corrected.
- Use `/om-auto-verify-pr-ui 123` any time to pull fresh screenshots of a PR's UI without touching source or labels.
