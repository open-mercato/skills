# Queue comments and final report

Update these stable markers in place with **list-issue-comments** and
**update-comment**. Match the exact automation-author identity and both
backticked and legacy bare skill names. Post the comment when absent.

- `` 🤖 `om-auto-merge-buddy-streamlined` — 🏷️ label rationale ``
  Keep one full-sentence reason per label in the effective set. Use
  `automerge-signal-1-cr` for approved review, `automerge-signal-2-qa` for
  satisfied QA, and `automerge-signal-3-ci` for local validation. Update each
  time a signal changes. Record the head, base SHA, QA policy, and the links
  that prove the signals. Labels alone never prove a stage passed.
- `` 🤖 `om-auto-merge-buddy-streamlined` — 🧪 local verification ``
  Give the head and base SHA. List each check command and the unit and
  integration tests selected, its result, and why it applies. Name full-suite
  fallbacks and any verified exclusions. Disclose pending, missing, or failed
  hosted checks and how their coverage or failure was handled locally.
- `` 🤖 `om-auto-merge-buddy-streamlined` — outcome ``
  Lead with the confirmed squash merge, human action, or next step. Include
  elapsed time, any forced takeover, the merge SHA when confirmed, and a
  short list of material alignment actions and fixes with evidence links.
  For a handoff include the latest head and base, what passed, what remains,
  any recoverable worktree, and the first concrete action to resume. Record
  claim release and any cleanup failure without marking it successful.

The final report gives elapsed time and each item outcome. Keep exact
chaining lines together at the end.

```text
PR: #<number> (link: <full PR URL>)
Issue: #<number> (link: <full issue URL>)
```
