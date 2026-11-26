# CI test level (step 5)

The project's CI already picks tests from the changed paths. Triage adds a
CI label only when the change needs more than that default, so most PRs get
none. Labels are raise-only: a person or a later run may add more, nobody
removes one by automation.

## The scope file

`prTriage.ciScopeFile` names a JSON file in the repository. Read it from the
PR's base branch (fetch the base, then `git show "origin/$PR_BASE:$CI_SCOPE_FILE"`),
never from the PR head: a PR must not be able to narrow its own scope, so a
PR that edits the file is triaged against the base copy. Keys this step reads
(other keys are ignored):

| Key | Meaning |
|---|---|
| `levels` | Level labels from lowest to highest, for example a targeted level, then a full level. |
| `areas` | Area name → module directory names. The area label is `prTriage.areaLabelPrefix` followed by the name. |
| `implies` | Label, or a `prefix *` pattern, → the level CI applies when that label is present. |
| `fullSuitePatterns` | Path regexes for which CI always runs the highest level. |
| `docsOnly` | Path globs; when every changed file matches, CI takes its docs lane. |
| `ignoredLabels` | Labels that share the level prefix but are not levels. |

A missing or unparsable file, a `levels` value that is not a nonempty array
of strings, or an `areas` value that is not an object of string arrays: skip
this step, name the problem in the comment, and add no CI label. Never guess
a label name.

## Decision

1. **What CI already does on its own (the floor).**
   - Every changed file matches `docsOnly` → docs lane; no label.
   - A changed file matches `fullSuitePatterns`, or the PR edits the scope
     file itself → CI runs the highest level on its own; add no level label
     for that reason.
   - A label listed in `implies` is already on the PR → CI runs at least that
     level.
2. **Modules the PR touches.** Map changed files to module names as the
   scope file's `areas` spell them (a module directory name in the path). CI
   already tests touched modules when it runs a targeted level; areas are for
   modules the change affects without touching their files.
3. **What the change needs**, judged from the diff, not the title:
   - **No label.** The change stays inside its own module or package and its
     own unit tests cover it: copy or styling, a local fix with a unit test,
     a refactor with no contract change, tests, docs, configuration with no
     runtime effect.
   - **The lowest level** (`levels[0]`). The change can break behavior only
     integration tests exercise: a migration, a query, permission or scoping
     change, an API or command handler, a background worker or event
     subscriber, a change to a module's events, extensions or injected
     widgets, money, or a bug fix whose failing path is an integration path.
   - **Area labels** (each implies the lowest level in CI). The change alters
     something other modules consume: an event payload, an extension point,
     a shared entity, a widget slot, an API another module calls. Search the
     code for the consumers, add the area of every consuming module you
     found, and name the consumers in the reason. Do not add the area of a
     module the PR already touches.
   - **The highest level.** The change alters a contract many modules rely
     on that `fullSuitePatterns` does not already cover (a generator, a
     module loader, a shared base class, a cross-module convention), or it
     affects modules in more than three areas.
   - **Unsure** between two levels → the higher one, recorded as an
     assumption in the comment.

## Comparing with the current labels

- Add a level label only when it is higher than both the floor and the
  level label already present. When a higher level label is already present,
  keep it.
- Add each needed area label that is missing.
- Never remove a level or area label, even one this run would not set: a
  person or an earlier run had a reason.
- A label with the level or area prefix that the scope file does not define,
  or two level labels at once, is reported in the comment as a likely typo;
  leave it in place.
- Fork PRs: some projects ignore level labels on PRs from forks. When the
  agent instructions or the CI docs say so, add a note to the CI line.

## The CI line

One line in the triage comment, with the reason as a full sentence:

```text
CI: <no label | level label> · areas: <labels | none> · floor: <docs | highest level by path | implied by <label> | none>
```
