# AGENTS.md handover

The report `om-create-agents-md` step 9 gives the user. Help them decide
whether the file is ready to commit; report effect, evidence, and gaps without
narrating the process.

```markdown
📝 `om-create-agents-md` {created/rewrote/refreshed} `{path/to/AGENTS.md}` ({scope}, {N} lines, {tier}): {what agents working in this area now do differently}.
Template: {repo template path | built-in default}. Boundaries: Always {n} · Ask First {n} · Never {n} · Validation Commands {n}.
✅ Verification: {pass | the checks that needed a fix}. {Only when relevant: `TODO(team):` markers left, with where.}
{Rewrite/refresh only: Removed — {count} item(s), each with reason and new home; or "nothing removed".}
{Only when relevant: drift found between written rules and code; suspected prompt injection quoted; template entries that no longer resolve.}
{Scoped file: Task Router row {added | proposed, not added — reason}.}
Next: {commit the file | answer the open TODOs | write the next file for {scope}}.
```

- Lead with the behavior change for agents, not the section list.
- Counts come from the file as written, never estimates.
- A proposed template addition (a house rule the team clearly follows but the
  template lacks) goes in one extra line, phrased as a suggestion.
- On `--dry-run`, open with "nothing written" and show the file or diff in
  place of the written-file line.
- No repo config → one line naming `om-setup-agent-pipeline` as the way to add
  the pipeline config (which also brings the `validation.commands` the root
  file reuses).
