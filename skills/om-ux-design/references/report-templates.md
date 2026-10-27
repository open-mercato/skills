# Design handoff

Use this for `om-ux-design` step 6. Lead with the selected task and its outcome.
Keep detailed maps in the artifact; link them instead of repeating them.

A short report names the flow and what now works, the source/component references,
actual verification and the remaining decision. Include the exact launch route
and source version. Say whether the result reuses native components or represents
them in portable HTML; name proposed/default styling when no DS exists. State
simulation limits and whether browser feedback needs export before sharing.

Use glossary emojis only when helpful. Omit empty optional sections. Preserve
these line-anchored fields at the end of the report:

```text
Design: <repo-relative entry point or launch record>
Source: <repo-relative spec or backlog path>
Verification: passed | incomplete
Acceptance: pending | accepted <version and evidence reference>
Next: <one explicitly chosen outstanding action, or none>
```

`Verification: passed` means the relevant required checks actually ran and passed;
name their scope in the prose. `Acceptance: accepted` requires the owner's actual
acceptance of this version, never inferred from earlier scope approval or passing
tests. The report uses `Design:` while proposing; only the accepted spec uses
`Prototype: <repo-relative path>`. `Next:` does not start a new task or publish
anything. Keep instructions for opening the artifact self-contained.
