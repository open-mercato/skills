# Maintenance report

Use this after preview or rotation in `om-ai-context-maintenance`; omit empty optional detail.

```text
`om-ai-context-maintenance` {archived N runs into one archive | previewed N eligible runs for one archive} in {run root}.
Kept dates on or after {UTC cutoff} unpacked under the {N}-day policy.
Retained {N}; skipped {N} for {active/uncertain/excluded/collision reasons}.
Archive: {the single batch archive path}.
{Errors and recovery action, when relevant.}
Status: {complete | preview | partial | blocked}
```

Summarize reasons without copying run contents. State whether originals were
removed and archive verification passed; a preview never claims either. On any
failed item, use `partial` (or `blocked` if nothing could run), preserve the
per-item error, and give the concrete recovery action. For delegated delivery,
state whether the PR is complete, in progress, or blocked, and relay its exact
`PR: #<number> (link: <full PR URL>)` line last. Do not emit a PR line for preview
or no-op runs without a PR. State that source removals occurred only in the
isolated worktree; the caller's checkout changes after merge and update. Delegate
tracker comments and label handling to `om-auto-create-pr`.
