# Setup interview questions

The questions step 2 of `om-discovery-setup` asks (skipped with `--defaults`, which answers no to both roles and accepts `paths.specs` as is). Ask in the user's words, one at a time, with the default shown.

1. **Is there a domain expert who is not the product owner?** Someone who owns business rules, non-goals, and decisions in their area and signs a superseding entry when one of theirs changes — a lawyer, an accountant, a client-side subject-matter lead. Default: no. Yes sets `discovery.roles.domainExpert` and adds the Domain expert role to `SDLC.md`.
2. **Is there a designer?** Someone who owns the design contract in `.uxproof/` and is consulted on key flows and user-facing specs. Default: no. Yes sets `discovery.roles.designer` and adds the Designer role; the contract itself comes from `om-ux-setup` (extracted from code) or `om-ux-style` (declared from references).
3. **Confirm where the brief lands.** `om-discover` writes `product-brief.md`, `research/`, and `backlog.md` under `paths.specs` (default `.ai/specs`). Changing it is a delivery-layer answer: point at `om-setup-agent-pipeline` rather than editing it here.

Not asked, on purpose:

- **Who the product owner is.** The layer has one by definition; when nobody else plays the role, the maintainer does. `SDLC.md` names the role, never the person.
- **Whether to enable the layer.** Running this skill is the yes.
