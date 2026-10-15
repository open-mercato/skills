# Reproducible case template

Loaded by `om-evolve-harness` workflow step 6. When the repository defines `harness.caseTemplate`, that template wins; this file is the generic contract. The catalog's schema is authoritative for field names and enums — take the shape of an adjacent case in `harness.catalog`, then fill this contract rather than inventing a second format.

Use the next contiguous ID in the catalog's existing scheme (same prefix, same width).

```json
{
  "id": "<PREFIX>-NNN",
  "title": "Concrete user outcome",
  "family": "<catalog family enum>",
  "mode": "analysis|one-shot|spec|bugfix|review",
  "evaluationKind": "static|routing|implementation|regression",
  "risk": "low|medium|high",
  "prompt": "Standalone user request with observable scope",
  "tags": ["kebab-case"],
  "owner": { "kind": "root|guide|skill|facts|hook", "path": "app/relative/path", "ruleIds": ["<rule id>"] },
  "expectedRouter": { "required": ["route-id"], "allowedExtra": [] },
  "requiredSkills": ["<skill-name>"],
  "context": { "required": ["AGENTS.md", "owner/path"], "forbidden": [".env*", ".git/**"] },
  "requiredDecisions": ["semantic-decision-id"],
  "forbiddenPatterns": ["unsafe-regex"],
  "validators": ["catalog.schema", "owner.reference", "skills.reference", "router.contract", "context.budget", "context.forbidden", "patterns.forbidden"],
  "maxContextFiles": "<calibrated, see below>",
  "maxInitialContextBytes": "<calibrated, see below>",
  "maxTotalContextBytes": "<calibrated, see below>",
  "relatedCases": ["<PREFIX>-NNN"]
}
```

## Budget calibration

Copy the shape from an adjacent case, never its budgets. Calibrate them from this case's own measured footprint in a scaffolded controller: sum the on-disk size of `context.required` plus every `context.allowedExtra` path, counting a path toward the *initial* budgets unless it matches `harness.onDemandContext` (on-demand reference directories, installed-skill directories, dependency-knowledge snapshots). Round up to leave real slack — a budget equal to the declared set fails a correct run on one incidental read — then confirm against a clean passing live trace rather than a neighbouring case's envelope.

When the deterministic gate (`validateCase` / `validateAll`) measures this and rejects a case whose required or declared context cannot fit its own budgets, the case is unpassable or self-contradictory, not merely tight — fix the case, not the gate.

## Contrastive decisions

Omit a decision vocabulary when every offered label is mandatory. Include one only for a contrastive case; it must contain every `requiredDecisions` label plus at least one plausible but unmandated distractor.

## Writable cases

For `implementation` or `regression`, also declare `fixture`, `oracle`, and a narrow `allowedWrites`; add the ID to the writable registry/release matrix only when an executable disposable fixture exists. A regression oracle must fail before the edit and pass after it. When the task needs exact installed-dependency contracts, declare one to three bounded dependency-context entries (one package/module selector and one bounded query each) so the controller materializes and allowlists that evidence before the model runs; queries must resolve to distinct package/version output roots.

## Update together

Every surface the harness keeps in sync with the catalog — typically:

- the catalog, its expected count/ID sequence, and the schema enums;
- the validator catalog counts/sets and semantic validator definitions;
- the release matrix, only when the case belongs to a release lane;
- the fixtures index, for writable setup;
- the harness spec's or README's numbered use-case list and coverage totals.

The harness docs are authoritative for the list; `validateAll` fails a stale count.
