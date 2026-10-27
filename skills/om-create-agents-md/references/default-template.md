# Built-in default template

The structure `om-create-agents-md` fills when the repo has no template of its
own (step 2 resolution fell through). Adapt sections to the file size — tiers
in `references/writing-rules.md` → Sizing. A repo template overrides any part
of this (`references/template-contract.md`).

## Required headings

Every file carries these four boundary sections, once each, in this order,
with these exact headings. Other sections live alongside them, never instead
of them.

| Section | What goes in it |
|---|---|
| `## Always` | Required defaults: MUST / MUST NOT rules and the commands agents apply without asking. The bulk of the constraint content. |
| `## Ask First` | Decisions that need maintainer input before changing behavior, scope, dependencies, branch or deploy flow, or a contract surface. |
| `## Never` | Prohibited actions and unsafe shortcuts, phrased as "Never …" bullets — the heading supplies the force. |
| `## Validation Commands` | The smallest set of real, copy-pasteable commands that prove the relevant code path (lint, build, typecheck, test, a targeted grep). |

When a rule fits more than one boundary, place it in the most restrictive:
`Never` > `Ask First` > `Always`.

## Skeleton — scoped file (package, app, module)

The skeleton is wrapped in a 4-backtick fence so the nested 3-backtick
`Validation Commands` block renders.

````markdown
# {Name} — Agent Guidelines

{One-line imperative directive: "Use {name} for {job}." / "Change {area} only through {entry point}."}

## {Optional decision table — "When to Use", "Strategy Selection"}

| When to use | Configuration |
|---|---|

## Always

1. **MUST {verb} …** — {consequence or rationale}
2. **MUST NOT {verb} …** — {what to do instead}

## Ask First

- Ask before {scope-changing decision: contract surface, dependency, data migration, infra}.

## Never

- Never {prohibited action}.

## Validation Commands

```bash
{real scoped test command discovered from the manifest}
{real scoped build/typecheck command}
```

## {Primary task — "Adding a New {Thing}" / "When You Need {X}"}

1. {Imperative step}
2. {…}
3. {Verification step}

## {Secondary sections — data model constraints, reference files, environment}

| When you need | Copy from |
|---|---|

## Structure

{Brief directory tree of the target — top two levels, generated/vendored dirs marked}

## Cross-Reference

- **{Topic}**: `{path/to/AGENTS.md}` → {Section}
````

## Skeleton — root file

The root file routes; package detail belongs in package files. It carries the
same four boundary sections (repo-wide rules only) plus:

- a one-paragraph project overview in imperative framing ("Use this repository
  for …; start at the Task Router");
- the **Task Router** — the table every skill in this collection reads to find
  where to look. Keep this column shape so it stays machine-friendly:

  ```markdown
  | When the task involves… | Read first | Key rules |
  |---|---|---|
  | {task keywords an agent would search for} | `{real path}` | {the rules that apply} |
  ```

  One row per significant area (each package/app group, API layer, UI layer,
  tests, CI, docs). Task keywords are verbs and nouns an agent would search for
  ("add an HTTP endpoint", "change the billing schema"), not bare package names.
- pointers to the process documents that exist: `SDLC.md`, `CODE_REVIEW.md`,
  `BACKWARD_COMPATIBILITY.md`, `.ai/agentic.config.json`;
- repo-wide `Validation Commands` from config `validation.commands` when set.

Keep the root file short — it loads for every task. Built-in target: under
~250 lines; push anything scoped to one package into that package's file and
leave a router row.

## Optional sections — use when the code has the shape

| Section | Use when |
|---|---|
| Decision table ("When to Use", "Strategy Selection") | the target offers alternative strategies, backends, or modes |
| Task checklist ("Adding a New X") | agents repeatedly add the same kind of file (handler, worker, migration, component) |
| Data Model Constraints | the target owns persisted entities |
| Reference files ("When you need / Copy from") | there are canonical example files worth copying |
| Environment / configuration | the target reads environment variables or config keys |
| Structure | always for scoped files; brief |
| Cross-Reference | another `AGENTS.md` or knowledge source owns a related topic |
