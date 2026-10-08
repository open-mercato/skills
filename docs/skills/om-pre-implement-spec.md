# om-pre-implement-spec

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Audits one specification before anyone writes code for it. It resolves the spec (path, name, issue, or spec PR), verifies its claims against the real codebase, and checks it against the repository's own rules: the readiness gate (declared status, no open questions or unconfirmed `⚠ NEEDS HUMAN CONFIRMATION` defaults, requirement-to-test traceability, defined contracts, phases with dependencies and exit gates), every protected surface in `BACKWARD_COMPATIBILITY.md`, the repo's spec template, and the rules in its agent instructions, routed guides, and review checklist. It then assesses risks and gaps and writes a report with a mechanical go / conditional / no-go verdict and a remediation plan. It never edits the spec or the code.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{spec}` | Yes | Repo-relative path, spec name/slug, an issue id that links a spec, or a spec-PR number. |
| `--no-save` | Optional | Print the report instead of writing it to `paths.analysis`. |
| `--autonomous` | Optional | For unattended callers: never ask; ambiguous or missing spec is a clean stop. |

## Works with

Runs between [om-spec-writing](om-spec-writing.md) (or [om-auto-write-spec](om-auto-write-spec.md)) and [om-auto-implement-spec](om-auto-implement-spec.md): a no-go sends the spec back for revision, a go or conditional verdict hands it on to implementation. The report is saved as `<paths.analysis>/pre-implement-<spec>.md` and the summary ends with `Readiness:`, `Report:`, and `Spec:` lines a caller can parse. Uses the `BACKWARD_COMPATIBILITY.md` that [om-setup-agent-pipeline](om-setup-agent-pipeline.md) generates, and falls back to a generic surface list (with a warning) when the repo has none.

---
*Source: [`skills/om-pre-implement-spec/SKILL.md`](../../skills/om-pre-implement-spec/SKILL.md)*
