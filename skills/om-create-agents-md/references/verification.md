# Verification checklist

What `om-create-agents-md` step 6 checks before the file is shown for
confirmation. Fix every failure and re-check; never hand over a failing file.
Use the required headings from the resolved template (built-in default: the
four boundary sections).

## Mechanical checks

```bash
f="<path/to/AGENTS.md>"   # the drafted file (a scratch copy until confirmed)

# 1. Required headings: exactly one of each, in order.
grep -nE '^## (Always|Ask First|Never|Validation Commands)$' "$f"

# 2. Legacy rule headings are gone.
grep -nE '^## (MUST Rules|Critical Rules|Key Rules)$|^## MANDATORY' "$f" && echo "FAIL: legacy heading"

# 3. Forbidden table headers.
grep -nE '^\|.*(Description|Details).*\|' "$f" && echo "REVIEW: table header"

# 4. Descriptive openers.
grep -nE '^(The [a-z]+ (module|package|service) provides|This (module|package|document) (is|describes))' "$f" && echo "REVIEW: descriptive opener"

# 5. Size tier.
wc -l < "$f"
```

When the template renames the required headings, substitute its list in check 1.

## Judgment checks

1. **Section minimums** — `Always`, `Ask First`, `Never`, and
   `Validation Commands` meet the tier minimums (`references/writing-rules.md`
   → Sizing, or the template's `## Sizing`). A shortfall is filled with real
   rules or `TODO(team):` markers, never invented ones.
2. **Forces in the right place** — MUST / MUST NOT only under `Always`;
   `Ask before …` only under `Ask First`; `Never …` only under `Never`.
3. **Every path exists** — each path in `Structure`, tables, checklists,
   cross-references, and the Task Router resolves in the working tree.
4. **Every command resolves** — each command maps to a script key, make
   target, or workflow step recorded in step 3. None deploys, migrates a shared
   database, publishes, or needs credentials.
5. **Tone** — every section opens with an imperative, a "When you need…"
   directive, or a constraint; the file opens with a one-line directive.
6. **Tables** — "When to use" / "When to modify" family columns only.
7. **Checklists** — numbered, imperative, include the repo's
   generation/registration step where needed, end with verification.
8. **Data models** — entities are constraint-framed with a MUST.
9. **No duplication** — topics owned by another file are pointers.
10. **Structure** — the directory tree is present (scoped files) and brief.
11. **No content lost** (rewrite / refresh) — every item of the step-4
    inventory is in the new file or in the removal ledger.
12. **Root file** — within its size target, Task Router rows point at real
    paths, and the column shape is unchanged.

## Result

Report the outcome in the handover as one line: tier and line count, pass or
the checks that needed a fix, and the number of `TODO(team):` markers left.
