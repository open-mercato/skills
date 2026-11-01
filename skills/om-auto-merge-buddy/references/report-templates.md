# Report templates

Use `references/rules.md`. A sub-skill's review or QA evidence is the detailed
record. This skill links it and never repeats it.

## Status comment — skill-specific template (one per PR, edited in place)

> Keep the dashboard URL and startup details local. Never include them in this
> tracker comment, evidence/action links, or embedded checkpoint; remove legacy
> Dashboard lines when updating. Lead with the decision, reason, human action
> and evidence, following the recent status comments. For obsolete PRs explain
> that the entire change is already covered and no longer provides value.

Marker: `` 🤖 `om-auto-merge-buddy` — status ``. Find it via
**list-issue-comments**, counting only a comment written by `CURRENT_USER`, create it once with **comment-pr**, and rewrite it
whole via **update-comment**. The scheduler verifies the stored comment ID and
falls back to a complete marker/author search before creating; never duplicate
a status comment on resume, reset or a lost local file (`references/scheduler.md`). It serves as this skill's claim comment, its
label-rationale comment, and its run summary, so there is never a second
comment per visit or per round.

~~~markdown
🤖 `om-auto-merge-buddy` — status

**State:** {working — run <RUN_ID> since <ts> | waiting for CI on <sha> since <ts> | ✅ ready to merge | 🚀 merged <sha> | Queued for automatic QA | ⚠️ waiting for verified human interaction or required independent review | ⛔ <reason> — remove `automerge-blocked` to retry | 🔁 replaced by #<n> | closed — no remaining value; already covered on target | stopped — automerge label removed}
**Reason:** <specific missing gate/evidence, revision, failure cause, or successful evidence>
**Human action:** <Human action required — exact actor/role, action and location/link, why agent cannot act | No human action needed — automatic next step>
**Required action / owner:** <precise action> / <automation | maintainer | named reviewer | none>
**Retry when:** <observable condition; Next check is a scheduled read, not a merge ETA>
**Reason assessed:** <reasonCheckedAt UTC>
**Mode:** {prepare-to-merge | prepare-and-merge}
**updatedAt:** <UTC ISO-8601; semantic plan/progress change, not heartbeat>
**Next check:** <nextCheckAt UTC ISO-8601>
**Timing:** <firstStartedAt | unknown>; current-head readiness <readyAt | unknown>; elapsed includes CI waits
**Plan/progress:** <step status, evidence and next action; mirror local scheduler>
**QA approval routing:** <automatic | human>; source <config | CLI | default>, current head, assessed UTC
**Independent review:** {skipped | required — evidence link or missing reason}; source {config | CLI | default}, head <sha>, run <RUN_ID>, assessed <UTC>
**Risk checks:** {enforced | skipped — operator `--force`, run <RUN_ID>}
**CI baseline policy:** {strict | skip-proven-baseline-errors — operator `--skip-pre-existing-ci-errors`, run <RUN_ID>}

🏷️ **Signals** — one line per signal with its emoji and a full sentence:
- ✅|❌|⏳ `automerge-signal-1-cr` — {Approved by `om-auto-review-pr` on <sha> ([review](url)) | required independent human review also present on <sha> | missing: why}.
- ✅|❌|⏳ `automerge-signal-2-qa` — {QA not required (`skip-qa`) | self-QA passed on <sha> ([evidence](url)) | trusted completed QA PASS on unchanged head ([report](url)), coverage notes retained | human sign-off present | waiting for a human QA reviewer because the PR is risk-high}.
- ✅|❌|⏳ `automerge-signal-3-ci` — {All N checks green on <sha> | remaining checks pass; <k> exact-target baseline failures waived ([proof](url)) | <k> checks still running ([checks](url)) | <check> failing: cause}.

{📋 Entrance reconciliation: each signal’s evidence revision → current head, inspected delta, affected tested scope, retain/carry-forward/invalidate decision, reason and next action; link source evidence and the comparison.}
{📋 On the first visit only: the initial signals derived from the PR's existing state (`references/signals.md` → Bootstrap).}
{🔁 Changes this run made, one line each, with commit or PR links — omit when none.}
{CI baseline waivers, when used: each check/workflow/job identity and config, PR head + run/job URL, exact target SHA + run/job URL, failure signature/root cause, compared unchanged definitions, and assessment time. Never call waived red checks green.}
{Follow-ups: one source finding/comment → created or reused issue link per deferred item; keep unresolved filing work visible.}
{⛔/⚠️ What a human must do, when the state needs one — omit otherwise.}

<details><summary>Scheduler checkpoint</summary>

```json
{"version":1,"repository":"owner/repo","currentUser":"login","number":123,"title":null,"statusCommentUrl":null,"instanceId":"uuid","runId":"run-id","outcome":"waiting-ci","reason":{"code":"ci-pending","summary":"Current lint run is pending","gate":"ci","head":"sha","humanActionRequired":false,"requiredAction":"Read current-head checks","owner":"automation","whyAgentCannotAct":null,"actionLocation":null,"actionUrl":null,"retryWhen":"The named run settles","evidence":["run-url"]},"reasonCheckedAt":"UTC ISO-8601","signals":{},"qaScreenshots":[],"head":"sha","base":"target","plan":[{"step":"CI","status":"pending","evidence":"run-url"}],"nextAction":"Read current-head checks","firstStartedAt":null,"firstReadyAt":null,"readyAt":null,"readyHead":null,"readyPolicy":null,"mergeableDurationMs":null,"lastWorkedAt":"UTC ISO-8601","nextCheckAt":"UTC ISO-8601","updatedAt":"UTC ISO-8601"}
```
</details>

<details><summary>Signal record</summary>

```text
base: …
riskChecks: <enforced|skipped>
ciPolicy: <strict|skip-proven-baseline-errors>
ciTarget: <target-sha|none>
head: …
cr: …
qa: …
ci: …
attempts: cr=… qa=… ci=…
```
</details>
~~~

Update this same comment on every visit/transition with the current reason,
action/owner, retry condition and evidence, including changed facts under an
unchanged outcome (`references/scheduler.md`). Do not add a second reason
comment. Successful states also name their current evidence.

Keep it under ~160 words outside the records; concrete explanations take priority. Keep the scheduler checkpoint and
local plan/progress semantically identical; comment ID/URL and private
reservation/token/process details are local-only. Existing
signal record fields are unchanged. A heartbeat never advances `updatedAt`. Never paste logs; link the run.

## Skill-specific closure example

Use real versions, SHAs and evidence links; this is an illustrative completed
closure. Before confirmation say “Closing” rather than “Closed”. Keep the
existing scheduler checkpoint and signal record, with no invented passes.

~~~markdown
🤖 `om-auto-merge-buddy` — status

**State:** Closed — no remaining value.
**Reason:** This PR bumps `example-lib` to `2.4.0`. The target already uses
`2.5.1` in all affected manifests and lockfile resolutions, with the intended
fix preserved ([target commit](https://tracker.example/commit/target-sha)).
The full diff adds no other changes, so this PR no longer provides value.
**Human action:** No human action needed.
**Required action / owner:** None — closed without merging.
**Retry when:** Reopen if a remaining change is identified.
**Reason assessed:** <UTC>; PR head `<sha>`, target `<branch>@<sha>`.
~~~

For an already-fixed bug, replace the package comparison with the original
failing behavior, the target’s landed fix and regression/reproduction evidence.
Use `reason.code: "obsolete-pr"`, `gate: "relevance"`,
`humanActionRequired: false`, `owner: "none"` and `outcome: "closed-obsolete"`
only after confirmed closure; preserve actual signal evidence and attempts.

## Final run report

```markdown
🚀 `om-auto-merge-buddy` ({mode}, {used}/{window} min): {m} merged · {c} closed as obsolete · {r} ready · {w} waiting for CI · {h} waiting for a human · {b} blocked.
- #<n> {outcome} — {decisive reason}; {next action}.
…
{PRs still waiting for CI, which the next run checks first.}
📋 Run log: `<RUNS_DIR>/merge-buddy/<folder>/` ({steps} steps{, resumed from session <k>}).
```

Include requested/effective concurrency and evidence links for obsolete closures. Never count closed PRs as merged.

List created/reused follow-up issue links and unresolved filing work without repeating their bodies.

Then, one per PR touched (the replacement's number for a carried-forward PR):

```text
PR: #<number> (link: <full PR URL>)
```

## Readable canonical status text

Write ordinary human sentences with normal spaces. Keep commit/head, flag and
identifier literals in code spans; do not concatenate words or compress prose
to save tokens. Regenerate old run-together explanations from current structured
facts on the next safe visit; do not blindly preserve unreadable legacy prose
or guess word boundaries with a splitting heuristic. Render fields separately,
joining complete lines with `\n` and signal readings with `; `.

```javascript
function formatStatusReason({ reason, nextAction, head, signals = {} }) {
  if (!reason?.summary || !nextAction) throw new Error('Current structured reason and next action required')
  const human = reason.humanActionRequired === true
    ? `Human action required — ${reason.owner}. ${reason.requiredAction}`
    : reason.humanActionRequired === false
      ? `No human action needed. Automatic next step: ${nextAction}`
      : 'Reconcile the human-action requirement from current facts before continuing.'
  return [
    `**Reason:** ${reason.summary}`,
    `**Human action:** ${human}`,
    reason.actionLocation ? `**Location:** ${reason.actionLocation}` : null,
    reason.actionUrl ? `**Action link:** ${reason.actionUrl}` : null,
    reason.humanActionRequired && reason.whyAgentCannotAct ? `**Why the agent cannot act:** ${reason.whyAgentCannotAct}` : null,
    `**Resume when:** ${reason.retryWhen}`,
    head ? '**Head:** `' + head + '`' : null,
    '**Signals:** ' + ['cr', 'qa', 'ci'].map(gate => gate.toUpperCase() + ': ' + (signals[gate] ?? 'not recorded')).join('; '),
    `**Next action:** ${nextAction}`,
  ].filter(Boolean).join('\n')
}
```
