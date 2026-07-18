# Verification report templates (step 7)

The machine- and human-readable report artifacts `om-auto-verify-pr-ui` writes
into `$ARTIFACTS_DIR` in every mode (step 7). These are the primary deliverable
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

`$ARTIFACTS_DIR/report.md` — a readable version with the verdict, environment,
the scenario table, embedded/linked screenshots, and notes for QA. Use this
template:

```markdown
## 📸 UI QA evidence — {verdict}

**Verdict:** {✅ PASS | ❌ FAIL | ⚠️ PARTIAL — environment-limited}
**Environment:** `{baseUrl}` · role `{role}` · browser `{provider}`
**Verified:** {branch} @ {headSha (short)}

### Scenario ({P0|P1|P2} — {area})
**Where to click:** `{route}`

| # | Step | Expected | Observed | Result |
|---|------|----------|----------|--------|
| 1 | {action} | {expected} | {observed} | ✅ |

### Screenshots
![Step 1 — {slug}]({path or url})

### Notes for QA
- {edge cases not covered; permission/empty/error observations}
```

Rules: report only what was observed; never paste secrets, tokens, `.env`
content, or non-demo credentials; redact sensitive values that leaked into a
screenshot before including it, or omit the screenshot and say so.
