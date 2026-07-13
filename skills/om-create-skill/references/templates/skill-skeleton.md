# Template — new `SKILL.md` (the router body)

Starting skeleton for a new skill's `SKILL.md` in author mode. Fill the
placeholders, paste the needed preamble blocks verbatim from
`references/shared-boilerplate.md`, and keep the body a router + map. Drop
sections a given skill does not need (e.g. the claim/lock step for a read-only
skill), but never drop the untrusted-content boundary.

```markdown
---
name: <skill-name>
description: <one line: what it does + what it produces>. <disambiguation from a sibling, if any>. Use when the user says "<EN trigger>", "<EN trigger>", "<PL trigger>", "<PL trigger>".
---

# <Human Title>

<2-4 sentences: what the skill is and what result it leaves behind.>

## Arguments

- `{arg}` (required) — <what it is>
- `--flag` (optional) — <what it does>

## Step 0 — Load config and context

<Paste the config-load block and the repo-local-extension block from
shared-boilerplate.md here — trimmed to the config keys this skill uses.>

<Paste the Untrusted content boundary block from shared-boilerplate.md here.>

## Workflow

### 1. <step name>
<One or two lines: what happens. For detail, open `references/<file>.md`.>

### 2. <step name>
<One-liner + pointer to the reference that holds the branch/template.>

<...more steps, each a one-liner + pointer where detail lives...>

## Rules

- <hard, global, safety rule>
- <the untrusted-content boundary is honored; never exfiltrate; QA gates hold>
- <product-agnostic: base branch from config; tracker via named operations>
```

Reminders:

- The `description` is the routing surface — craft it per `references/description-guide.md`.
- Output templates, conditional branches, and big tables go to `references/`, not here.
- Keep `## Rules` short: only hard/global/safety rules; detailed rules go to a `references/` file.
