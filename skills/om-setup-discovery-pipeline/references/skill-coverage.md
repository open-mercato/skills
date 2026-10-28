# Product-skill coverage check (step 7)

This skill installs standalone. Check only the optional product skills it names;
never inspect or load another skill's private `references/` directory.

Resolve `SKILLS_ROOT` as the parent of this skill's installed directory. A skill
is available when either `$SKILLS_ROOT/<name>/SKILL.md` or the repo-local
`.ai/skills/<name>/SKILL.md` exists.

```bash
PRODUCT_SKILLS="om-discover om-synthetic-users om-backlog om-mockup-prototype"
missing=""
for skill in $PRODUCT_SKILLS; do
  [ -f "$SKILLS_ROOT/$skill/SKILL.md" ] && continue
  [ -f ".ai/skills/$skill/SKILL.md" ] && continue
  missing="$missing $skill"
done
[ -z "$missing" ] && echo "PRODUCT_SKILL_COVERAGE_OK" || echo "PRODUCT_SKILL_COVERAGE_MISSING:$missing"
```

When product skills are missing, resolve the collection source from install
metadata or the current checkout; never guess it. Print one paste-ready command
with a `--skill` flag for each missing name:

```bash
npx skills add <collection-source> --skill om-discover --skill om-backlog
```

Interactive runs wait for installation and re-check. Under `--defaults`, report
the missing list and exact command, then continue; the product-layer config is
still valid without every optional product skill installed.
