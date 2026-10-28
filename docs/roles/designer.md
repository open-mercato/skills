# 🎨 Designer

[`om-ux-design`](../skills/om-ux-design.md) turns a specification or selected backlog scope into connected screens, using your repository's components, stories and prototype runtime. It checks the flow and relevant states in a browser, preserves review feedback, and hands over the selected version with its sources and acceptance status. When no suitable runtime exists, its portable HTML output states the limits of that representation.

[`om-auto-write-spec`](../skills/om-auto-write-spec.md) can attach screenshots of an accepted detailed design alongside the current app. When no accepted design exists, it creates illustrative mockups. Detailed design is an optional interactive step; the spec workflow still supports text-only output and `--no-mockups`.

← Back to the [README](../../README.md#-workflows-by-role)

## Skills you'll use

| Skill | When | Example call | What you get |
|---|---|---|---|
| [`om-auto-write-spec`](../skills/om-auto-write-spec.md) | Propose a redesign with visuals | `/om-auto-write-spec "Redesign the checkout summary panel — include mockups of the new layout and screenshots of the current one"` | a spec PR with mockups, current-app screenshots, and an assumptions comment |
| [`om-auto-write-spec`](../skills/om-auto-write-spec.md) | Spec a brand-new surface | `/om-auto-write-spec "Onboarding wizard for first-time merchants"` | a spec PR with proposed-flow mockups |
| [`om-auto-implement-spec`](../skills/om-auto-implement-spec.md) | See the design built | `/om-auto-implement-spec 2026-07-18-checkout-redesign` | the change implemented with before/after screenshots from the working app |
| [`om-auto-qa-pr`](../skills/om-auto-qa-pr.md) | Check the UI on an open PR | `/om-auto-qa-pr 123` | screenshots of the changed flow + a pass/fail report on the PR |
| [`om-synthetic-users`](../skills/om-synthetic-users.md) | Walk a prototype as the personas before showing it | `/om-synthetic-users .ai/prototypes/discovery/onboarding/revision-001/index.html --stance validate` | friction on real screens with screenshots, each tagged synthetic and paired with the usability test that would confirm it |
| [`om-ux-shape`](../skills/om-ux-shape.md) | Decide before drawing | `/om-ux-shape "Quick-add flow for the people list"` | a decided direction: smallest coherent scope, interaction contract, riskiest-assumption test |
| [`om-mockup-prototype`](../skills/om-mockup-prototype.md) | Try the discovery flow after its first synthetic panel | `/om-mockup-prototype .ai/specs/product-brief.md --flow "onboarding"` | a neutral clickable prototype, source context and browser-check results before the brief refresh and backlog |
| [`om-ux-design`](../skills/om-ux-design.md) | Design the selected specification scope | `/om-ux-design .ai/specs/2026-07-18-checkout-redesign.md --scope "checkout summary"` | connected detailed screens, component sources, preserved comments, browser evidence and acceptance status |
| [`om-ux-setup`](../skills/om-ux-setup.md) | Make the design system executable | `/om-ux-setup` | the repo's design contract in `.uxproof/` — tokens, components, screen archetypes, team rules |
| [`om-ux-review-pr`](../skills/om-ux-review-pr.md) | Judge a PR's UI, not just see it | `/om-ux-review-pr 123` | a design review: findings ranked by user impact, each with evidence, a pattern, a trade-off and a done-when |

## What happens automatically

- **Proposed-design + current-app screenshots** attached to the spec PR when the environment and browser provider are available. An accepted detailed design supplies the proposed screenshots; otherwise the workflow creates illustrative mockups. Missing prerequisites produce text-only output.
- **Assumptions comment** — autonomous Open-Questions defaults are posted for you to override, not silently baked in.
- **Full SDLC labels** on the spec PR, plus chain markers so [`om-auto-implement-spec`](../skills/om-auto-implement-spec.md) reuses the same branch/PR.
- **Before/after screenshots** from the real app on the implementing PR via [`om-auto-qa-pr`](../skills/om-auto-qa-pr.md).
- **Claim locks** — an issue-driven spec run claims the issue so concurrent agents back off.

## Tips

- Use `om-mockup-prototype` for neutral discovery flows and `om-ux-design` for detailed screens from a specification. Neither a successful browser check nor scope approval is acceptance of the finished design.
- After accepting a specific design version, authorize its `Prototype:` link in the spec. Keep proposals linked separately until then; an existing accepted version remains the implementation reference during further design work.
- Describe the surface concretely (which page, which panel, which states) so the current-app screenshots capture the right flow.
- No browser provider set up yet? Run `/om-prepare-test-env` first, or ask QA to — otherwise the spec degrades to text-only with no screenshots.
- Reply on the assumptions comment to steer the design; the autonomous defaults exist to be corrected.
- Use `/om-auto-qa-pr 123` any time to pull fresh screenshots of a PR's UI without touching source or labels.
- Run `/om-ux-setup` once per repo before the first design review — contract-grounded findings ("this repo already has a component for that") beat generic best practices.
- `/om-auto-qa-pr` captures the evidence; `/om-ux-review-pr` judges it. Use both on UI-heavy PRs.
