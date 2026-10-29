# Merge queue report

Use after classifying the queue. Follow `references/rules.md`. The report mode
is read-only and emits no chaining fields; the automerge templates follow below. Lead with the counts and the next useful action.

```markdown
🚀 `om-merge-buddy` — {ready} ready, {almost} almost ready, {blocked} blocked.
{Scope/date; disclose disabled label gates or missing check data when relevant.}

| PR and change | State | Next action and reason |
|---|---|---|
| [#{number}: {title}]({url}) | Ready | All required gates pass; ready for a merge decision. |
| [#{number}: {title}]({url}) | Almost ready | Wait for {check}; it is the only remaining gate. |
| [#{number}: {title}]({url}) | Blocked | Resolve {conflict/finding} and obtain {missing approval}. |
```

Use one row per included PR; keep all remaining blockers in that row. Do not
repeat labels, authors, or every passed gate. Retain the skill's sorting and
skip rules. When nothing is ready, say so and lead with the closest candidates.
A queue scan establishes gate status, not product fit or a fresh code review;
never infer those from green checks. `om-approve-merge-pr` rechecks gates when
asked to merge.

## Automerge run report (`--automerge`)

Lead with what merged and what still needs a human. One row per PR in the
queue, skipped ones included, so the next run's operator sees why each PR did
not move.

```markdown
🚀 `om-merge-buddy` automerge — {merged} merged, {parked} waiting on CI, {needsHuman} need a human, {skipped} skipped.
{Disclose a skipped orchestrator check, a tracker that cannot approve held runs, or label gates off.}

| PR and change | Outcome | What happened and what is next |
|---|---|---|
| [#{number}: {title}]({url}) | Merged | {Fixes applied, e.g. "merged the base, fixed 2 review findings"}; merged at `{sha}`. |
| [#{number}: {title}]({url}) | Waiting on CI | Pushed `{sha}`; {check} still running after {n} min. A later run picks it up. |
| [#{number}: {title}]({url}) | Needs a human | {The one blocker, e.g. "waiting for QA sign-off"}; judged at `{sha}`. |
| [#{number}: {title}]({url}) | Skipped | {Reason: claimed by {owner}, active orchestrator task, draft, `do-not-merge`}. |

PR: #{number} (link: {url})
```

End with one `PR:` chaining line per PR this run merged or changed, in queue
order; a carry-forward replacement is listed by its new number.

## Automerge status comment (per PR)

One marker-idempotent comment per PR, created on the first attempt and
rewritten in place via **update-comment** on every later one:

```markdown
🤖 `om-merge-buddy` — automerge status

{✅ Merged | 🔁 Waiting on CI | ⚠️ Needs a human}: {one sentence: what was done and the outcome}.
Judged at head `{sha}`. {Next action: "Remove the `{label}` label to stop automerge." when a human must act.}
```
