# Report templates

Use `references/rules.md`. A sub-skill's review or QA evidence is the detailed
record. This skill links it and never repeats it.

## Status comment (one per PR, edited in place)

Marker: `` 🤖 `om-auto-merge-buddy` — status ``. Find it via
**list-issue-comments**, counting only a comment written by `CURRENT_USER`, create it once with **comment-pr**, and rewrite it
whole via **update-comment**. It serves as this skill's claim comment, its
label-rationale comment, and its run summary, so there is never a second
comment per visit or per round.

~~~markdown
🤖 `om-auto-merge-buddy` — status

**State:** {working — run <RUN_ID> since <ts> | waiting for CI on <sha> since <ts> | ✅ ready to merge | 🚀 merged <sha> | ⚠️ waiting for human QA sign-off | ⛔ <reason> — remove `automerge-blocked` to retry | 🔁 replaced by #<n> | stopped — automerge label removed}
**Mode:** {prepare-to-merge | prepare-and-merge}

🏷️ **Signals** — one line per signal with its emoji and a full sentence:
- ✅|❌|⏳ `automerge-signal-1-cr` — {Approved by `om-auto-review-pr` on <sha> ([review](url)) | approved by @human on <sha> | missing: why}.
- ✅|❌|⏳ `automerge-signal-2-qa` — {QA not required (`skip-qa`) | self-QA passed on <sha> ([evidence](url)) | human sign-off present | waiting for a human QA reviewer because the PR is risk-high}.
- ✅|❌|⏳ `automerge-signal-3-ci` — {All N checks green on <sha> | <k> checks still running ([checks](url)) | <check> failing: cause}.

{📋 On the first visit only: the initial signals derived from the PR's existing state (`references/signals.md` → Bootstrap).}
{🔁 Changes this run made, one line each, with commit or PR links — omit when none.}
{⛔/⚠️ What a human must do, when the state needs one — omit otherwise.}

<details><summary>Signal record</summary>

```text
head: …
cr: …
qa: …
ci: …
attempts: cr=… qa=… ci=…
```
</details>
~~~

Keep it under ~120 words outside the record. Never paste logs; link the run.

## Final run report

```markdown
🚀 `om-auto-merge-buddy` ({mode}, {used}/{window} min): {m} merged · {r} ready · {w} waiting for CI · {h} waiting for a human · {b} blocked.
- #<n> {outcome} — {decisive reason}; {next action}.
…
{PRs still waiting for CI, which the next run checks first.}
📋 Run log: `<RUNS_DIR>/merge-buddy/<folder>/` ({steps} steps{, resumed from session <k>}).
```

Then, one per PR touched (the replacement's number for a carried-forward PR):

```text
PR: #<number> (link: <full PR URL>)
```
