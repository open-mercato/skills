# Setup interview questions

The questions step 2 of `om-setup-discovery-pipeline` asks (skipped with `--defaults`, which answers no to both roles and accepts `paths.specs` as is). Ask in the user's language, one at a time, with the default shown and one line on what the answer changes, per `references/voice.md`. The wording below is the content, not the script: rephrase it for the person in front of you.

1. **Is there someone besides the product owner who owns the business rules?** A lawyer, an accountant, the client's subject-matter lead: the person who decides what the product must and must not do in their area, and who has to agree before one of those rules changes. Default: no. Yes adds a Domain expert line to the roles in `SDLC.md` (and sets `discovery.roles.domainExpert`); no means the product owner signs those rules.
2. **Is there a designer?** Someone who owns how the product looks and behaves on screen and should be asked before a flow or a user-facing spec is settled. Default: no. Yes adds a Discovery design responsibility (and sets `discovery.roles.designer`); their design rules come later from the design stage and `om-ux-setup`. Discovery uses `om-mockup-prototype` for neutral flow experiments; it does not author the design contract.
3. **Say where the brief will land**, as a statement, not a question: `om-discover` writes `product-brief.md`, the research folder, and `backlog.md` under `paths.specs` (default `.ai/specs`). If the user wants it elsewhere, that is `om-setup-agent-pipeline`'s setting; say so in one line and move on.

Not asked, on purpose:

- **Who the product owner is.** The layer has one by definition; when nobody else plays the role, the maintainer does. `SDLC.md` names the role, never the person.
- **Whether to enable the layer.** Running this skill is the yes.
