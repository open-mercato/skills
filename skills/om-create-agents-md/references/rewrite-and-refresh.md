# Rewrite and refresh an existing AGENTS.md

The two modes `om-create-agents-md` step 4 uses when the target file already
exists. Both are content-preserving: reclassification and rewording for tone
are fine, content loss is not.

## Rewrite — bring an existing file to the template's structure

Use when the file predates the template: legacy rule headings, missing
boundary sections, descriptive tone, "Description" tables.

1. **Inventory the file.** List every rule, limit, command, path, and
   operational detail with its current heading. This inventory is the
   no-loss baseline for step 6.
2. **Map legacy headings.** Use the template's `## Legacy headings` map when
   present; otherwise map `## MUST Rules`, `## Critical Rules`, `## Key Rules`,
   `MANDATORY:` H2s, and mixed "Always / Never" blocks into the boundary
   sections below.
3. **Hoist each rule into its boundary:**
   - MUST / MUST NOT defaults → `Always`, as `**MUST [verb]** — [rationale]`;
   - scope or contract decisions that need maintainer approval → `Ask First`,
     as `Ask before …`;
   - hard prohibitions and unsafe shortcuts → `Never`, as `Never …`.
4. **Add `Validation Commands`** with the smallest set of real, scoped
   commands that prove the affected path (discovered in step 3).
5. **Reframe tone** section by section (`references/writing-rules.md`):
   imperative openers, "When to use" columns, numbered checklists,
   constraint-framed entities. Keep all technical content of a very large file;
   only its framing changes.
6. **Preserve high-risk details verbatim in meaning** — hard limits, human
   confirmation boundaries, security and data-scoping rules, encryption or
   privacy defaults. Reclassify them; never soften them.
7. **Fix inbound anchors.** Search the repo for links to the old section
   anchors (`#must-rules`, `#critical-rules`, …) and list them; update them
   only when the user agrees (they live in other files).

## Refresh — re-sync facts that drifted from the code

Use when the structure is right but the code moved on. Change facts, keep the
team's wording.

1. **Check every concrete reference** against the current tree: paths in
   `Structure`, "Copy from" examples, Task Router `Read first` paths, and
   cross-reference targets that no longer exist.
2. **Check every command** in `Validation Commands` and checklists still
   resolves (script key, make target, workflow step).
3. **Look for new surface**: top-level directories, packages, entry points,
   generated-file steps, or file kinds added since the file was written that
   no rule or router row covers.
4. **Check written rules against the code**: a MUST rule the current code
   visibly contradicts is drift — report it and ask whether the rule or the
   code is wrong; never quietly delete the rule.
5. **Update only what drifted.** Fix broken paths and commands, add rows and
   rules for new surface, and leave every still-valid sentence untouched.

## Removal ledger (both modes)

Anything that does not reappear in the new file — a rule judged obsolete, a
path that no longer exists, a duplicated block replaced by a cross-reference —
goes into a ledger shown with the diff in step 7: the line, why it went, and
where its content now lives (if anywhere). An empty ledger is stated as
"nothing removed". Nothing leaves the file without appearing in the ledger.
