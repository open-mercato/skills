# Deduplicate chained review and QA stages

## Overview

Goal: ensure each autonomous pipeline chain performs one authoritative code-review pass through `om-auto-review-pr`, and one UI-QA pass when applicable.

## Scope

- Audit autonomous create, continuation, spec implementation, issue fix, and PR fix chains.
- Remove direct `om-code-review` self-review stages that are immediately followed by `om-auto-review-pr`.
- Keep compatibility, security, scope, validation, and fix-forward checks inside the retained `om-auto-review-pr` pass.
- Update affected reference files, summaries, and chaining descriptions so they describe the single-pass flow.
- Confirm `om-auto-qa-pr` remains conditional and is not invoked twice by orchestrators.

## Non-goals

- Do not weaken the configured validation gate.
- Do not remove the conditional review-first safeguard inside standalone `om-auto-qa-pr`.
- Do not change label, claim-lock, tracker, Progress, or chaining-reference contracts.
- Do not change when a user-facing diff requires UI QA.

## Implementation Plan

### Phase 1: Consolidate review stages

1. Remove redundant direct self-review steps from create, continuation, and fix-chain skills.
2. Consolidate the affected review-report references and summary wording around `om-auto-review-pr`.

### Phase 2: Verify orchestrator chains

1. Align spec/issue orchestration wording with the single-review contract and document the QA audit result in the diff where stale wording exists.
2. Run the repository lint gate and review the full diff for contract, security, scope, and cross-skill consistency.

## Risks

- Removing the earlier pass could accidentally drop explicit compatibility/security checks; the retained `om-auto-review-pr` instructions must continue to require them.
- Step renumbering can leave stale cross-references in standard reference files or summary templates.
- Conditional QA wording can be mistaken for duplication; preserve standalone review-first behavior and one orchestrator-owned UI-QA invocation.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Consolidate review stages

- [x] 1.1 Remove redundant direct self-review steps from create, continuation, and fix-chain skills — a20bdb8
- [x] 1.2 Consolidate the affected review-report references and summary wording around `om-auto-review-pr` — a20bdb8

### Phase 2: Verify orchestrator chains

- [x] 2.1 Align spec/issue orchestration wording with the single-review contract and document the QA audit result in the diff where stale wording exists — a20bdb8
- [x] 2.2 Run the repository lint gate and review the full diff for contract, security, scope, and cross-skill consistency — a20bdb8
