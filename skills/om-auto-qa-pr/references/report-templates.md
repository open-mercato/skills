# Report templates

## Verification report artifacts (step 10)

The machine- and human-readable report artifacts `om-auto-qa-pr` writes
into `$ARTIFACTS_DIR` in every mode (step 10). These are the primary deliverable
in local mode and the source of the PR comment in PR mode.

`$ARTIFACTS_DIR/report.json`:

```json
{
  "runId": "<RUN_ID>",
  "mode": "pr | local",
  "target": { "prNumber": 1234, "title": "…", "branch": "…", "headSha": "…" },
  "verdict": "PASS | FAIL | PARTIAL",
  "environment": { "baseUrl": "…", "role": "…", "startedByThisRepo": true, "browserProvider": "agent-browser | playwright | custom" },
  "scenario": [
    { "step": 1, "priority": "P1", "action": "…", "expected": "…", "observed": "…", "result": "PASS", "screenshot": "step-01-…​.png" }
  ],
  "hasUiTest": false,
  "notes": ["…"]
}
```

`$ARTIFACTS_DIR/report.md` is the authoritative human evidence report, posted
once in PR mode. Retain each required scenario step with expected/observed
results and its screenshot. Keep the introduction short; the table is the
proof. Omit empty notes and repeated descriptions of the PR.

```markdown
## 📸 UI QA evidence — {verdict}

**Verdict:** {✅ PASS | ❌ FAIL | ⚠️ PARTIAL} — {changed behavior exercised and decisive observation or limit}.
**Verified:** {branch} @ {headSha (short)}; `{baseUrl}`, role `{role}`, browser `{provider}`.

| # / Priority | Route and action | Expected | Observed | Result / Evidence |
|--------------|------------------|----------|----------|-------------------|
| 1 / P1 | {route, setup, action} | {expected} | {observed} | {PASS / FAIL / not exercised; screenshot link} |

### 📸 Screenshots
![{screen and state; what this image proves}]({path or url})

### ⚠️ Not exercised
{Only meaningful coverage limits, including missing permissions, empty/error
states, or environmental blockers; say what remains to be checked.}
```

Never fabricate a PASS or omit a required failed/unexercised step to shorten the
report. Report only observations; redact secrets, tokens, `.env` content, and
non-demo credentials in text and screenshots. Omit unsafe screenshots and state
the limitation. The JSON schema above remains unchanged.

## Follow-up UI-test scenario (step 12)

Only when `HAS_UI_TEST` is false: update one follow-up comment in PR mode, or
append it to `report.md` locally. Link the evidence report; do not repeat its
scenario table. Preserve fixture setup, assertions, and cleanup needed to turn
that scenario into a test.

```markdown
## 🧪 Follow-up: add a UI/integration test

Automate [this verified scenario]({evidence link}) with `om-integration-tests`:
{fixtures to create}, {scenario steps to reuse}, and {specific assertions}.
Delete every fixture during teardown. {Any additional case the run could not cover}.
```

## Final run report (step 14)

Aim for 3–6 lines plus PR/Issue references. Give outcome, evidence, limitation,
and next action; omit inapplicable fields and routine environment/label details.

```markdown
📸 `om-auto-qa-pr`: {PASS | FAIL | PARTIAL} — {behavior verified and result or blocker}.
Evidence: {PR comment link or local artifacts path}.
{Required coverage left, missing automated-test follow-up, or next QA action}.
{If requested: QA sign-off/failure applied and the evidence that justified it}.
```

Evidence-only runs do not grant QA approval. State that distinction when a
reader could mistake PASS for merge approval. Never duplicate the scenario
or label-rationale comment in the final reply.
