# Authoring patterns — what goes into a skill and how to shape it

Generic skill-design guidance `om-create-skill` applies in author mode (steps 1–3
of `references/author-workflow.md`). It complements `references/philosophy.md`:
that file decides *which layer* a fragment belongs to; this one decides *whether
the fragment should exist at all*, *what kind of resource* it is, and *how much
freedom* it leaves the executing agent.

Contents: 1. Start from concrete requests · 2. Only write what the agent lacks ·
3. Pick the degree of freedom · 4. Choose the resource type · 5. Organize
references · 6. Output patterns · 7. Workflow patterns · 8. Frontmatter limits ·
9. What never goes into a skill · 10. Iterate after real use

## 1. Start from concrete requests

Before drafting, write down two or three realistic requests the skill must
handle, phrased the way a user or a calling skill would actually send them. For
each one, ask:

1. How would I carry this out from scratch, with no skill at all?
2. Which part would I re-derive or rewrite every time (the same script, the same
   schema lookup, the same boilerplate)?

Each answer to question 2 is a candidate bundled resource (section 4). The
requests also seed the trigger phrases for the `description`
(`references/description-guide.md`). When the brief already makes the usage
clear, keep this short — but do not skip it for a skill whose inputs are vague.

## 2. Only write what the agent lacks

The context window is shared with the system prompt, the conversation, every
other skill's `description`, and the user's request. Assume the executing agent
is already capable; add only the procedural knowledge, repository facts, and
guardrails it cannot infer. For every paragraph, ask: *does the agent really
need this, and does it justify its token cost on every run?* Prefer one short
example over a long explanation.

## 3. Pick the degree of freedom

Match specificity to how fragile the task is:

| Freedom | Form | Use when |
| --- | --- | --- |
| High | prose instructions, heuristics | several approaches are valid; the right call depends on context |
| Medium | pseudocode, a parameterized script or snippet | a preferred pattern exists but some variation is fine |
| Low | an exact script or command sequence, few parameters | the operation is error-prone, consistency is critical, or the order is mandatory |

A narrow path with cliffs on both sides gets guardrails (low freedom); an open
field gets directions (high freedom). Gates, markers, and anything another skill
parses are always low freedom.

## 4. Choose the resource type

A skill is a `SKILL.md` plus optional bundled resources in its own directory:

- **`references/`** — text loaded into context on demand (procedures, templates,
  schemas, domain notes). The layering rules are in `references/philosophy.md`.
- **`scripts/`** — executable code for work that must be deterministic or would
  otherwise be rewritten on every run. A script can run without being read into
  context, which saves tokens. Every script you add must be exercised by actually
  running it before handing back (a representative sample when there are many
  similar ones), and must follow the repository's portability conventions.
- **`assets/`** — files used in the *output*, not read for reasoning: templates to
  copy, boilerplate projects, images, fonts. They never need to load into
  context.

Delete any placeholder resource the skill does not use. A pointer to a bundled
file is checked by the lint gate's reference-resolution rule, so every path you
name must exist.

## 5. Organize references

- **Keep information in one place.** A fact lives in the body *or* in a
  reference, never both — duplication drifts.
- **One level deep.** Every reference is pointed to from `SKILL.md` directly; do
  not chain reference → reference → reference for anything the flow needs.
- **Split by domain or variant** when a skill serves several (per provider, per
  tracker, per data domain): the body keeps the selection logic, and each variant
  gets its own file so a run loads only the one it chose.
- **Table of contents** at the top of any reference longer than ~100 lines, so a
  partial read still shows the full scope.
- **Very large references** (thousands of lines): give the body the search
  patterns to find the relevant section instead of expecting a full read.

## 6. Output patterns

When a skill must produce consistent output, choose the strictness on purpose:

- **Strict template** — for anything parsed downstream (reference lines,
  markers, machine fields, data formats): say "use exactly this structure" and
  give it verbatim.
- **Flexible default** — for human-facing reports: give a sensible default
  shape and say explicitly which parts may adapt to the findings.
- **Input/output example pairs** — when quality depends on style (commit
  messages, summaries, titles), two or three worked pairs teach more than a
  description of the style.

User-facing templates in this collection also follow the reporting rules in the
skill's own `references/rules.md` and live in the generated skill's own
report-templates reference file.

## 7. Workflow patterns

- **Sequential** — open the workflow with the numbered overview of the whole run,
  so the agent sees the path before the detail.
- **Conditional** — state the decision point in the body ("new content →
  creation flow; existing content → editing flow") and keep each branch's
  detail in its own reference (`references/philosophy.md`: the premise stays up,
  the branch content goes down).

## 8. Frontmatter limits

- `name` — kebab-case (lowercase letters, digits, single hyphens; no leading,
  trailing, or doubled hyphen), at most 64 characters, equal to the directory
  name.
- `description` — the only routing surface: put every "when to use" trigger
  here (`references/description-guide.md`). A "when to use" section in the body
  is read only after the skill was already chosen, so it cannot fix routing.
  The length cap is enforced by `scripts/lint.sh`.
- Add no other frontmatter fields unless the repository's conventions call for
  them.

## 9. What never goes into a skill

A skill carries only what an agent needs to do the job. Do not add a per-skill
README, installation guide, quick-reference card, changelog, or notes on how the
skill was created or tested — collection-level documentation lives outside
`skills/`, and extra files only add clutter and stale copies.

## 10. Iterate after real use

The first version is a hypothesis. After the skill runs on real tasks, note where
the agent struggled, re-derived something, or loaded more than it needed, and
fold that back: a missing guardrail into the body, a repeated derivation into a
script or reference, an unused paragraph out. Run the gate again after every
change (`references/gates.md`).
