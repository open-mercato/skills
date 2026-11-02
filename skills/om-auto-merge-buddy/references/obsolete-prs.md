# Close a PR whose entire value is already on its target

Use this check after claiming and reading the PR, before review/QA/CI work.
Authorization comes from the PR's current `AUTOMERGE_LABEL`; you may close an
obsolete queued PR autonomously in either merge mode. This is closure without
merging, not approval, and does not need three passing merge signals.

1. Read the full diff and fresh actual target branch tip, not just the title,
   bot author, issue state or an open replacement PR. Record head, target branch,
   target SHA, assessment UTC and precise evidence. Do not execute PR code during
   this read-only assessment.
2. For dependency bumps, inspect every manifest, workspace, lockfile resolution
   and other changed file. Compare versions using the ecosystem's version rules,
   not string order. The target must already provide the same or a later suitable
   version for every affected dependency and relevant lockfile occurrence, with
   the intended security/compatibility fix preserved. A newer direct version does
   not prove a vulnerable transitive occurrence is gone. A newer version on an
   unrelated release line, a prerelease, unresolved range, registry tag, missing
   lockfile or uncertain advisory coverage does not prove supersession. Include
   package names, proposed/target versions and target file/commit links.
3. For bug fixes, establish the original failing behavior and show that the
   target already fixes it: inspect the implemented path and existing regression
   evidence, or run an isolated target-only reproduction when needed. Link the
   landed fixing commit/merged PR and test/path evidence. A closed issue or a
   matching title alone is insufficient. Check any tests, docs or other changes
   for remaining independent value.
4. Close only if the **entire PR** adds no remaining value. Mixed PRs, partially
   superseded grouped bumps, useful regression coverage or uncertain evidence
   remain open and take the normal signal ladder. Respect an explicit human
   `do-not-close` instruction/label and foreign claims. `--force` never waives
   this proof or a closure restriction.
5. Immediately before closure, verify fenced ownership and stopped delegated
   stages under the scheduler lock, then re-read **get-pr** and resolve the
   target tip again. Require open state, the same head/target/tip and current
   `AUTOMERGE_LABEL`; any changed fact invalidates the assessment. Update the
   existing status comment with the proposed closure reason/evidence using the
   template in `references/report-templates.md`. If that write fails, do not
   close. Invoke **close-pr** once, preserving the head branch and linked issues.
   An older descriptor without this operation leaves the PR open and records
   the recommended closure plus descriptor-upgrade requirement; never substitute
   **close-issue**, **merge-pr** or a direct tracker command.
6. Read back **get-pr**. Only confirmed closed **and unmerged** is
   `closed-obsolete`; unknown/refused writes retain a cleanup/reconciliation
   checkpoint and report the actual state, never a successful closure. A crash
   after closing is recovered from tracker state and this own status note;
   do not repeat closure or create another comment. Finalize the same note,
   release only owned claims, and remove stale `ci-monitoring`, signal and
   `automerge-blocked` labels via guards. Keep historical evidence and assignees.
   Use existing closed-row scheduler cleanup; failed cleanup stays pending.
   Record in RUN/HANDOFF and the final report, remove the active row only after
   cleanup succeeds, and never append a merge journal entry or readiness metric.
   No follow-up issue is needed solely because this PR was obsolete.
