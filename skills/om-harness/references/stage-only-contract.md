# Stage-only handoff contract

This contract is loaded by both wrapper skills before creating their worktree.

1. Work in an isolated worktree and run `capture` before any edits. Keep the
   resulting starting commit, complete ref snapshot, and reflog snapshot under
   the ignored run-artifact directory. Capture also activates the publication
   guard in this worktree's Git directory and records its ownership in the
   start-state artifact. A second capture cannot replace an active run.
2. Do not create intermediate commits. Store progress in run artifacts instead.
3. Do not invoke publication-oriented skills, remote writes, or the tracker
   `create-pr` operation.
4. Build an allowlist containing every intended product, test, spec, and process
   file. Keep raw model output and generated review artifacts under a configured
   ignored artifact directory, not in the allowlist.
5. Run the full configured validation gate and the required review passes. Bind
   each wrapper-level council to an exact-subject `om-code-review` packet, start
   fresh Claude and every configured advisor concurrently, and require the
   matching Claude artifact before accepting the final council result. For
   `high-assurance`, require every packet ledger to reach `gated`; a packet in
   `awaiting_validation`, `blocked`, or `aborted` cannot enter the handoff.
6. Invoke the runtime `stage` command with the worktree, original start-state
   artifact, allowlist, final implementation `--review-packet`, and matching
   approved `--host-review` artifact. Create these even for `standard`; preparing
   review packets needs only the pipeline config, not model bindings.
7. Require all of these checks to pass:
   - current `HEAD`, refs, and reflogs equal the captured starting state;
   - the working and staged content hashes both match the approved implementation packet;
   - both the packet and fresh host validation gates passed, with exit code zero for every passed command;
   - the staged diff is non-empty;
   - the staged diff passes whitespace/error checking;
   - the complete non-ignored working diff matches the complete index diff, independently of Git assume-unchanged/skip-worktree flags, so no hidden unstaged content remains;
   - every staged path came from the allowlist.
8. Report the absolute worktree path, branch, staged paths, validation evidence,
   suggested commit message, prepared pull-request body, and issue-claim state.
   A successful `stage` deactivates this run's publication guard after all
   handoff checks pass. A failed stage keeps it active for repair and retry.

On abort or terminal failure, stop all workers, reviewers, and validation
processes, then run `end-run --worktree <path> --start-state <original artifact>
--reason <text>`. This deactivates only the matching run's publication guard;
it never resets files, releases issue claims, or releases packet leases. Perform
the wrapper's claim cleanup and any explicit packet recovery separately. Keep
the guard active while repairing or retrying the same run. After a crash,
verify the owning processes stopped before using `end-run`; never delete
another run's guard. Installed hooks allow ordinary publication outside an
active run. Literal `git -C`, `cd`, and `pushd` targets are checked too, so
starting a shell in the primary checkout cannot bypass an active worktree's
guard. Unresolved directory expansions or indirect publication require host
permission when this repository has an active run. Publication from other
linked worktrees remains available when it does not target the active run.

Worker adapters must also enforce disabled network, remote writes, and ref
writes. The runtime passes only an explicit environment allowlist and disables
Git protocols and credential helpers for worker processes. If any assertion
fails, stop with a blocked result. Never repair an unexpected commit by
rewriting history automatically.

## Host permissions and platform support

Before edits, require host tool permissions that deny remote publication through
shell, network, and tracker tools. Hooks are supplemental lexical checks, not a
sandbox: arbitrary application code can perform network I/O. If those host
permissions cannot be established, stop the staged run with that limitation.
The compatibility hook launchers require Bash and Node on macOS, Linux, or WSL.
Native PowerShell hook wiring is not supported; do not claim those guards are
active there. The Node runtime and JSON artifacts remain platform-neutral.

During the fix phase, write the exact regression-test paths as a JSON array to
`.om-freeze-tests`; an empty legacy sentinel retains conventional test-name
protection. Install `guard.mjs` with both compatibility launchers and wire
`Edit|Write|MultiEdit|NotebookEdit`. Invalid hook input fails closed.
