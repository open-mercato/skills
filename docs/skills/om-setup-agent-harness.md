# om-setup-agent-harness

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Configures the optional staged-only harness for one repository: which models act as implementation workers and which as review advisors, the profile set, provider probes, and the optional Claude output style and prevention hooks. It writes only the additive `agentHarness` object in `.ai/agentic.config.json`, keeps secrets out of the repo (environment variable names only), and leaves everything staged for review. The bundled cross-model jury is a starting default — any OpenAI-compatible endpoint or local CLI can be bound as a reviewer instead.

## Parameters

- `--check` — validate and probe the current configuration without writing.
- `--preset <cross-model-jury|custom>` — start from the bundled jury or an empty registry.
- `--defaults` — enable every detected bundled model without asking.
- `--no-output-style` — skip the optional Claude output style.
- `--no-hooks` — skip the prevention hooks.

## Works with

Configures the harness that [om-fix-issue](om-fix-issue.md) and [om-implement-feature](om-implement-feature.md) consume. Wrappers reroute here automatically when a requested profile is missing or its providers are not ready. Runs after [om-setup-agent-pipeline](om-setup-agent-pipeline.md), which owns the rest of the config.

---
*Source: [`skills/om-setup-agent-harness/SKILL.md`](../../skills/om-setup-agent-harness/SKILL.md)*
