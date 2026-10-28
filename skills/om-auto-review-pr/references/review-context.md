# Reuse evidence within the review

This changes retrieval, not checks, validation execution, safety or required tracker readbacks. Collect evidence inside the existing workflow; do not add a separate reconnaissance phase.

## Group known reads

Read a known necessary file once, with sufficient content. Do not precede every known policy or procedure with separate listing, heading and existence probes. In one content operation, group the independent files or sections needed for the current branch. For shell access, set `reviewSkillDir` to the selected skill directory and use filename/line provenance, for example:

```sh
awk 'FNR == 1 { print "FILE " FILENAME } { print FNR ":" $0 }' \
  "$reviewSkillDir/references/agentic-setup.md" \
  "$reviewSkillDir/references/rules.md"
```

Separate parallel tool calls are still separate reads. Keep dependent decisions, mutations and adaptive follow-ups sequential. Apply existing secrecy rules to grouped output. Load setup and shared rules every run; load other procedures when their branch applies, not all branches in advance.

## Reuse, then expand when needed

Keep the PR identity, base/head, changed paths, mode, config, applicable instructions, feedback and validation evidence with provenance. A companion uses complete evidence already in context; it still runs its full workflow. Do not reprint a checklist, diff, engine instruction or report merely because a later phase names it.

Use supplied/configured paths directly. For unknown paths or large corpora, discover filenames and exact-symbol matches before printing relevant sections. Follow the task router, documented exceptions, actual consumers, tests and failure/retry paths. Expand whenever evidence is insufficient; no tool budget limits review depth. Deduplicate feedback without losing author, source or an explicit fixed, declined or deferred disposition.

Reuse requires unchanged content and scope. Changes to head, base, config, rules, dependency state or generated inputs invalidate affected evidence. Refresh mutable tracker state at required readbacks, after mutations and during CI follow-up. Never reuse attributed or earlier results instead of required validation execution; distinguish supplied evidence from observed execution.

## Keep conclusions complete

For CI, use exact-head structured check/workflow state and focused command, scope, result and failure excerpts. Cover every configured gate row and workflow-completeness guard. Verify command aliases at source. Scoped, skipped, pending or unavailable evidence is not an unqualified full pass; an empty search cannot clear a captured conflict or failure. Read more when ambiguous.

Keep the complete engine artifact and required human projection, including findings, qualifications, validation and markers. Link existing detail in follow-ups and explain changes instead of writing a second inventory.
