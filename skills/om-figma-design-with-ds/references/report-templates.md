# Report templates

The brief and the prompt are artifacts another tool or person consumes: plain
Markdown, no emoji or pictographs, every name resolvable in the contract. The
audit and the final reply are for the user and follow `references/rules.md`.

## Design brief (Brief mode)

```markdown
# Design brief — {screen name}

## Goal
{One sentence: what the user accomplishes on this screen.}

## User
{Who, in what situation, with what constraint.}

## Layout
- Archetype: {kind} — {anatomy from the contract, region by region}.
- Width, page spacing, section spacing, field spacing: {contract size tokens}.

## Sections (in order)
1. {Section} — {purpose; components used}.

## Components (registry entries only)
- {Component name} ({variant or size}; design library: {designComponent}) — {what it renders, where, and its label text}.

## Tokens (contract entries only)
- Color: {code token → design variable, per role: text, background, border, status, destructive, restricted}.
- Type, spacing, radius, shadow, layering: {tokens per use}.

## Icons
- Set: {the icon set the conventions name}. {Each icon by component name.}
- Unknown mapping: `[ICON: needs-mapping — candidates: {A}, {B}]`.

## States to design
- Default; loading; empty (with the sentence and the action the user reads); error (with the recovery action); validation errors; success; hover, focus, active, disabled; each theme the tokens declare.
- {Archetype requiredStates not already listed.}

## Interactions
{Primary-action and cancel shortcuts the conventions define; focus order; labels for icon-only controls; required and invalid field marking.}

## Responsive
{Behavior per breakpoint the contract declares.}

## Out of scope
{What not to design.}

## Reference screens in the codebase
- {Two or three archetype example files from the contract.}

## Design-system gaps
{Only when present: the component or token the screen needs that the contract lacks, and what the user decided.}
```

## Audit (Audit mode)

```markdown
🔍 `om-figma-design-with-ds` audit — {screen}: {verdict in one sentence and the biggest remediation theme}.

**Contract**: {contract path; layers with version, stale ones marked}. **Design read via**: {provider operation | attached image, values estimated}.
{Only when found: screens that fit no archetype; missing states, as discoveries.}

### 🔍 Violations
1. **{critical|warning|info}** — {frame › element} — {value as it appears} → {exact fix}. {why} {×N in frames …}

### 📋 Remediation plan
1. {One executable design action, with where and how many.}

### Provider operations
{Only when a provider could apply fixes: bind-variable / swap-component / scale snaps, grouped. Not applied.}

### 🧪 Evidence limits
{Only material limits: skipped checks and why, pixel-estimated values, frames not read.}
```

## Prompt (Prompt mode)

A single fenced block the user pastes elsewhere. It carries, in this order:
the role ("audit this design against the design system below" or "produce a
design brief for the screen below"), the output constraints (no emoji or
pictographs; icons by name from the named set; unknown icons as
`[ICON: needs-mapping — candidates: …]`; severities as the words critical,
warning, info), the placeholders `<DESIGN_REFERENCE>` and `<CONTEXT>` left
intact, the contract digest (token names with design names by role, registry
components with library names, archetypes with anatomy and required states,
restricted tokens, manual-section rules), and the output format of the matching
template above. Follow it with one line telling the user what to replace.
The digest is generated from the contract at run time; never paste a stored
copy, which drifts.

## Final reply

3–6 lines: what was produced, the contract and layers it rests on, gaps the
user must decide, operations applied (with results) or available, and the one
useful next step (for example `om-ux-review-pr` once the screen is built).
