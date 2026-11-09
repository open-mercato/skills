# Deliver a rotation through a PR

After the read-only preview, invoke the installed `om-auto-create-pr` skill by
name with a concrete task brief. Never fetch or install a missing companion;
report the preview and the missing skill instead. No eligible tracked artifacts
means a no-op: do not create an empty maintenance PR.

## Brief to pass

Include the resolved repository-relative run root, keep-days, exact exclusions,
UTC cutoff and preview inventory, plus the installed helper's absolute path.
Treat the inventory as provisional, not permission to delete those paths later.
Use a stable slug derived from the run root and UTC date; search for that branch
and its `Tracking plan:` before starting, and reuse its existing PR through
`om-auto-continue-pr`. A later invocation refreshes remaining work on that PR;
if its earlier plan is complete, append a new unchecked phase and commit it
before implementing additional rotations.
Do not mix rotation into an unrelated feature PR merely because it is open.

Require this implementation in the brief:

1. Use the configured base branch and the companion's isolated worktree,
   plan-first commits, early draft, validation gate, review, full label set,
   ready promotion, and cleanup. Do not rotate the caller's checkout or copy
   its uncommitted, untracked, or ignored run content into the branch. Only
   artifacts fully tracked in the selected base snapshot are eligible; report
   local-only or changed artifacts as retained. Recheck the caller's candidate
   paths before apply and retain any with local changes or uncertain ownership.
2. Refresh all open-PR references and live claims/leases immediately before
   apply, in addition to unfinished-plan checks. Exclude the maintenance PR's
   own plan/run folder. Preserve explicit exclusions and protect every new
   ambiguous candidate. If tracker evidence is incomplete, stay preview-only.
   Confirm quiescent writers; a new worktree alone does not prove inactivity.
3. Execute the bundled helper by its resolved installed path with the worktree
   as `--repo-root`, the resolved parameters, protected names as `--exclude`,
   and first preview, then `--apply`. Follow `rotation.md` without weakening
   verification or collision handling. Never use a guessed skill path or a
   helper read from archived run contents.
4. Inspect every changed path. Include the single verified batch `.tgz` with all
   corresponding tracked source removals in the same implementation commit;
   keep that archive in the run root alongside retained sources. Stage only those
   paths and the companion's own tracking artifacts. If ignore rules hide an
   archive, add only that verified archive explicitly, never change broad ignore
   rules or force-add the whole run root. Do not publish secrets or excluded
   context. Require exactly one newly added `.tgz` for a nonempty rotation; never
   create one archive per artifact or nest the previous per-artifact archives.
   Run a disposable extraction/byte comparison for representative artifacts and check that no eligible source removal lacks its archive.
5. If eligibility changes to an empty set, report a no-op and the actual status
   of any plan-only draft already opened; never invent rotated counts. If an
   item fails, preserve its source/recovery archive and report partial status.
   Do not mark the run complete while a failed rotation remains unresolved.

## Handoff

Relay the companion's actual completion or blocker and its exact `PR:` chaining
line. Keep counts scoped to the delegated worktree. The caller's sources stay
unpacked until the rotation PR is merged and the checkout is updated. No merge
or schedule is authorized by this skill. Readers still need explicit restoration
of an archived run after merge. Existing PRs retain the companion's standard
claim/reuse behavior; never open a second PR to recover a failed invocation.
