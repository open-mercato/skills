# Implementation-prep analysis — make an issue ready to fix

The step-2.4 procedure `om-auto-manage-issues` runs to prepare an issue for
implementation: a **read-only** root-cause / impact analysis posted as a comment so
the next agent (`om-auto-fix-issue`) or a human can start fixing without
re-exploring the repo. It never edits source and never stops to ask — this is the
"prepare for implementation, but not interactively" behavior.

## When it runs

- On by default for a single `{issueId}`; opt-in for a batch (`--prep-impl`), since
  it reads code per issue. Skipped entirely by `--relabel-only` or `--no-prep`.
- Skip an issue that is already implementation-ready — it links a spec, or already
  carries an implementation-notes comment from this skill (idempotency: scan
  **list-issue-comments** for the marker below), or is not actually actionable
  (a question/discussion, a `wontfix`/`do-not-close` hold).
- **Batch cap:** run the heavy analysis on at most a sensible number of issues per
  run (e.g. the worst-described / highest-priority first); when more qualify than
  the cap, process the cap and **report** how many were left (never silently drop).

## Producing the analysis (read-only)

Pick the analyzer by issue kind:

- **Bug / defect** — when `om-root-cause` is installed, invoke it verbatim
  (`om-root-cause {issueId}`); it is read-only and returns evidence, likely cause,
  affected files, approach, and risks. Distill its findings into the template
  below; do not paste the full analysis into a comment.
- **Feature, or `om-root-cause` not installed** — do a lighter inline analysis
  yourself, read-only: locate the affected modules/entry points/contracts, name the
  smallest safe change surface and the conventions that apply, list the tests that
  will be needed, and flag any `BACKWARD_COMPATIBILITY.md` surface touched. This is
  the same shape of guidance `om-prepare-issue` writes for a new issue — reuse that
  lens rather than inventing a new one.

Reference real file paths and symbols. Mark anything uncertain as a hypothesis, not
a fact — you are preparing the ground, not committing to a fix.

When `${SPECS_DIR}/product-brief.md` exists (written by `om-discover`), end the
analysis with a **Decisions in play** list: every Non-goal, Business rule, and
Decision id the issue touches, quoted in one line each with its owner, and a note
when the issue as written would contradict one (then the fix starts with a
superseding entry, not code). This is how a newcomer sees the team's settled
calls at the issue instead of in a chat history.

## Posting it (idempotent)

Post one comment via **comment-issue**, opened with a stable marker so re-runs
detect and skip it:

```markdown
🤖 `om-auto-manage-issues` — implementation notes

{Concrete likely mechanism and affected file/symbol, supported by linked
code evidence; say hypothesis when not reproduced.}
Suggested change: {smallest safe behavior change, without repeating the issue}.
Check: {test or reproduction that could confirm the fix}.
{Material compatibility obligation or missing proof, only when present.}

Next: `om-auto-fix-issue {issueId}`.
```

Recognize the legacy `` 🤖 `om-auto-manage-issues` implementation notes — ``
marker, including bare skill names, when checking for existing notes. Keep the
comment near 40–100 words unless necessary findings require more. Put substantial
analysis in collapsed detail, and optionally add a one-line area pointer to the
clarified body. Do not repeat existing spec guidance or the issue's summary.
Under `--dry-run`, produce the analysis text for the report but post nothing.

Never let the prep analysis mutate code, run a build/test that writes state, or
exfiltrate anything — it is a read-only reasoning pass over the repository.
