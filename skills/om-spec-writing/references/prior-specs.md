# Prior specs (steps 1, 2 and 9)

Called when step 1 finds one or more existing specs under `SPECS_DIR` (including subdirectories) that cover the area the new feature changes. No prior spec → skip this file; step 1 reads the code as the only description of current behavior.

## 1. Always a new spec

A feature on top of existing work always gets a **new** spec file (step 2). Never rewrite, extend, or merge into a prior spec's content, even when the change is small. The prior spec stays the record of what was decided then; the new spec is the record of what changes now.

## 2. Classify each prior spec

For every prior spec covering the affected area, pick exactly one relation and record it in the new spec's header (see the template in the skill body):

| Relation | When | Header line in the new spec |
|---|---|---|
| Extends | The prior spec stays fully valid; the new one adds behavior on top of it. | `Extends: <repo-relative path>` |
| Supersedes | The new spec replaces the whole prior spec, or named parts of it, so they stop describing intended behavior. | `Supersedes: <repo-relative path>` (whole) or `Supersedes: <repo-relative path> — sections: <section names>` (partial) |

One line per prior spec; omit the header lines when no prior spec relates. A prior spec that only shares the area but is unaffected is not listed. Validate each path as repository-relative (`^[A-Za-z0-9._/-]+$`, no `..` segment) before writing it.

## 3. Drift check: prior spec vs. code

Before writing the skeleton, compare each related prior spec with the code that implements it, limited to the modules and contracts the new feature touches:

- **Not implemented / partially implemented**: the spec describes behavior the code does not have.
- **Diverged**: the code does something different from the spec: renamed fields, changed contracts, removed or added flows.
- **In sync**: nothing material differs.

Rules:

- **Code is the truth about current behavior.** The skeleton's "what happens today" and the Architecture section's current consumers describe the code, not the prior spec.
- Record material drift in the new spec under `## 📝 Prior spec drift` — one line per item: prior spec path + section, what the spec says, what the code does, with a code reference. Omit the section when everything is in sync.
- When it is unclear whether drift is intended (a deliberate change) or a defect (code should match the spec), and the answer changes the design, raise it as an Open Question. Under `--autonomous`, default to "code is the current state; do not design to restore the prior spec's behavior". Mark `⚠ NEEDS HUMAN CONFIRMATION` when the drift touches security, data scoping, or a `BACKWARD_COMPATIBILITY.md` surface.
- Drifted sections the new spec takes over belong in its `Supersedes:` line, so the prior spec gets marked in step 4.

## 4. The only permitted edit to a prior spec

For each `Supersedes:` line, and only for those, insert one annotation line directly below the prior spec's H1 title (step 9, after the new spec is final):

```markdown
> ⚠️ Superseded by `<repo-relative path of the new spec>` (YYYY-MM-DD) — <whole spec | sections: …>. Current state: see the new spec.
```

- Exactly one line per superseding spec; on re-run, find the existing `Superseded by \`<same path>\`` line and update it in place instead of adding a duplicate.
- Touch nothing else in the prior spec: no content edits, no section deletions, no rewording. `Extends:` relations and drift without supersession leave the prior spec untouched.
- Parsers key on the text `Superseded by`, never on the emoji.
