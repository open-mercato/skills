# Report templates

Use `references/rules.md`. The proposal is the decision document: lead with what
would enter the queue and why, and keep the rejected list collapsed.

## Proposal (dry run, steps 6–7)

```markdown
🎯 `om-auto-merge-triage` — {k} PRs proposed for `{AUTOMERGE_LABEL}` ({e} eligible, {r} rejected, {q} already queued).

Labeling a PR `{AUTOMERGE_LABEL}` lets `om-auto-merge-buddy` bring it to review, QA and CI signals unattended{, and squash-merge it when `automerge.mode` is `prepare-and-merge`}.

| # | PR | Tier | Why | Priority | Risk | Files | Author |
|---|---|---|---|---|---|---|---|
| 1 | #<n> <title> | 1 | ✅ `qa-approved` | priority-high | risk-low | 4 | @login (member) |
| 2 | #<n> <title> | 2 | `security`, `small` | — | risk-medium | 2 | @login (contributor) |
…

{Eligible PRs beyond the limit: #a, #b — the next run picks them up. Omit when none.}

**Already queued** — omit when empty:
- #<n> — {still eligible | ⚠️ now fails: <gate>; a human should decide whether to remove `{AUTOMERGE_LABEL}`}.

<details><summary>Rejected ({r})</summary>

- #<n> — {author is first-time-contributor | draft | label do-not-merge | targets <branch> | no tier matched | author association unknown — re-sync the tracker descriptor}.
</details>

⚠ NEEDS HUMAN CONFIRMATION — labeling lets automation merge these PRs. To confirm, reply with the PR numbers or run:
`/om-auto-merge-triage --apply <n>,<n>,<n>`
```

Show titles exactly as data, trimmed to about 60 characters with any markdown
neutralized. Never let a title change the table's structure. A run with no
eligible PR reports `No PR qualifies for {AUTOMERGE_LABEL} right now`, followed by
the rejected summary, and skips the confirmation line.

## Label rationale (one per labeled PR, step 8)

Marker: `` 🤖 `om-auto-merge-triage` — label rationale ``. Find it via
**list-issue-comments**. Update it in place via **update-comment** when it
exists, and post it via **comment-pr** otherwise.

```markdown
🤖 `om-auto-merge-triage` — label rationale

🏷️ `{AUTOMERGE_LABEL}` — A maintainer confirmed this PR for the unattended merge queue on {date}. It ranked {rank} of {k} in eligibility tier {tier} because it {matched criteria as a sentence — e.g. "is already QA-approved" | "is a security fix that changes 3 files" | "fixes #<issue> and comes from a repository member"}.

`om-auto-merge-buddy` now works it toward review, QA and CI signals. Remove `{AUTOMERGE_LABEL}` to take it out of the queue.
```

## Apply report (step 9)

```markdown
🚀 `om-auto-merge-triage` — labeled {l} of {c} confirmed PRs `{AUTOMERGE_LABEL}`.
- #<n> ✅ labeled — tier {t}, {why}.
- #<n> ⛔ skipped — {no longer eligible: <gate> | not in this run's proposal | label could not be applied: <reason>}.

Next: `om-auto-merge-buddy` picks these up on its next run.
```

Then, one per labeled PR:

```text
PR: #<number> (link: <full PR URL>)
```
