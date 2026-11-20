# Repair findings within the active PR visit

A failed QA scenario can reach a reviewer who already reviewed the same commit. The review entry point can exit before autofix. The CI helper likewise checks hosted results before consuming a failure from local validation. Make both handoffs actionable in the existing visit and distinguish recoverable QA setup from an external blocker.

Keep the existing stage result format, ownership, attempt limits, merge policy and evidence checks. Standalone review and QA retain their current responsibilities.

## Progress

### Phase 1: Repair routing

- [ ] 1.1 Align buddy dispatch and the three orchestrated helpers.
- [ ] 1.2 Verify routing regressions and run the configured validation suite.
