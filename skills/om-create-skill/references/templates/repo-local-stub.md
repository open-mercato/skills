# Template — repo-local overlay (`.ai/skills/<name>/SKILL.md`)

Optional overlay for a repo-local extension of a skill. A skill checks for this
file right after loading config (see the repo-local-extension block in
`references/shared-boilerplate.md`) and applies it as **repository-provided
configuration** — it may add repo specifics but cannot relax safety. Create it
only when the skill clearly needs per-repo detail (exact commands, ports, seeded
accounts, service versions). The shape is binding: `references/overlay-contract.md`.

```markdown
> **Repo-local override.** <One sentence: what this overlay changes in the installed `<skill-name>` skill.>

## <Base section or step name> (<add | replace | extend>)

- <exact launch/build/test commands for this repo>
- <ports, seeded accounts, service versions>
- <any command chain or convention unique to this repo>

## Lessons learned (add)

- <append working command chains and fixes here as they are discovered>
```

Notes:

- No frontmatter — the file must not start with `---`, so no harness mistakes it
  for a second skill with the same name.
- Only named delta sections; never copy base text you are not changing. Keep it
  under 50% of the base `SKILL.md` — over that, it is a fork (see the contract).
- This lives under `.ai/skills/`, not under `skills/` — it is repo configuration,
  not an installable skill, so it is outside the lint's product-agnostic scope.
- Keep it additive: the installed skill's rules always win on safety.
