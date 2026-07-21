# Human-friendly chaining markers — `PR: #N (link: …)` / `Issue: #N (link: …)` / `Spec: …`

Date: 2026-07-21 · Owner: pkarw · Skill: `om-auto-create-pr`

## Goal

Replace the env-style chaining markers (`PR_URL=`, `PR_NUMBER=`, `SPEC_PATH=`) that every
PR-producing/-driving skill emits at the end of its report with one fixed, human-friendly,
still machine-parseable format — and update every emitter, consumer, and contract document
so chaining (output → input) keeps working. A companion PR extends
[open-mercato/cezar](https://github.com/open-mercato/cezar) to discover PR/issue numbers
from sessions using the new report lines and from bare GitHub links in conversation.

## The new marker contract

Markers are single lines, exact shape, anywhere in the final report (canonically at the end):

```
Issue: #<number> (link: <full issue URL>)
PR: #<number> (link: <full PR URL>)
Spec: <repo-relative spec path>
```

Parse patterns (line-anchored):

- `^PR: #([0-9]+) \(link: (https?://\S+)\)\s*$`
- `^Issue: #([0-9]+) \(link: (https?://\S+)\)\s*$`
- `^Spec: (\S+)\s*$`

Rules:

- One line replaces the old `PR_URL=` + `PR_NUMBER=` pair; the number and the link travel together.
- Emitters use ONLY the new form. Consumers parse the new form AND still accept the legacy
  `PR_URL=<url>` / `PR_NUMBER=<n>` / `SPEC_PATH=<path>` lines from older skill output
  (same principle as the legacy bare `🤖 <skill> —` comment-marker rule).
- `Issue:` is emitted whenever the run's subject issue is known (issue-driven or issue-creating
  skills); `PR:` whenever a PR was produced/driven; `Spec:` where a skill defines it
  (`om-auto-write-spec`).
- Never rename, translate, omit, or decorate the label part (`PR: #` / `Issue: #` / `Spec: `).

## Scope

- Contract definitions: `AGENTS.md`, all 30 `skills/*/references/rules.md` (identical
  boilerplate line), `om-create-skill` references (`shared-boilerplate.md`,
  `repo-invariants.md`, any gate text), `BACKWARD_COMPATIBILITY.md` (new entry).
- Emitters: `references/pr-finalize.md` marker blocks (9 skills), final-report blocks in
  `SKILL.md` of om-auto-create-pr, om-auto-continue-pr(+loop), om-auto-create-pr-loop,
  om-auto-implement-spec, om-auto-write-spec (`Spec:`), om-open-pr, om-auto-fix-issue
  (`Issue:` + `PR:`), om-auto-fix-pr, om-auto-review-pr, om-auto-qa-pr.
- Consumers: chaining prose in the same SKILL.md files plus om-prepare-issue,
  om-auto-manage-issues, om-review-prs, spec-resolution.md, feature-route.md,
  review-report.md, enrich-existing-issue.md, claim-pr.md, worktree-setup.md,
  assumptions-comment.md, sdlc-template.md, trackers/github.md.
- Docs mirrors: `docs/skills/*.md`, `docs/roles/developer.md`, `SDLC.md`, `README.md`.
- NOT in this PR: the cezar changes (separate PR in open-mercato/cezar, tracked in Phase 5).

## Non-goals

- No change to the `🤖 <skill> —` comment-marker contract, `Status:` lines, `Tracking plan:`
  lines, or the `CEZ:*` protocol.
- No change to skill behavior beyond the report/marker format.
- No renaming of `om-create-skill` gate variables (`SKILL=`, `BASE_REF=`) — those are
  internal gate I/O, not chaining markers.

## Implementation plan

### Phase 1: Contract definition

Define the new format in AGENTS.md (§Autonomous and chainable, §Standard communication),
swap the identical **Marker contract** line in all 30 `references/rules.md`, update
`om-create-skill` boilerplate/invariants so new skills are generated with the new contract,
and add the BACKWARD_COMPATIBILITY.md entry (emit-new / parse-both).

### Phase 2: Emitters

Rewrite every marker emission block: the 9 `pr-finalize.md` files and the final-report
templates in the SKILL.md files listed under Scope. `om-auto-write-spec` gains `Spec:`;
`om-auto-fix-issue` adds `Issue:` next to `PR:`; report templates fold the old
human-summary `PR: {url}` line and the machine block into the single new form.

### Phase 3: Consumers and cross-references

Update all "consumes the `PR_NUMBER=` …" phrasing and every remaining reference in
skills/** so inputs parse the new lines (accepting legacy forms).

### Phase 4: Docs mirrors + validation

Mirror the changes in docs/skills/*.md, docs/roles/developer.md, SDLC.md, README.md,
setup templates; run `bash scripts/lint.sh`; self-review the diff.

### Phase 5: cezar companion PR (separate repository)

Extend open-mercato/cezar so its session-discovery understands the new report lines and
plain GitHub links:

- `src/runs/task-markers.ts`: parse `PR: #N (link: …)` / `Issue: #N (link: …)` (and legacy
  `PR_NUMBER=N` / `ISSUE_NUMBER=N`) from accumulated turn text as a **report tier** below
  `CEZ:PR`/`CEZ:ISSUE` but above fuzzy URL discovery.
- `src/runs/store.ts`: add a referenced-**issue** tier mirroring the referenced-PR janitor —
  track `github.com/…/issues/N` URLs in event text, resolve to `issueNumber` when unambiguous
  and no higher tier owns it.
- Unit + store tests; spec note in `.ai/specs/`.
- Open PR to open-mercato/cezar with its label conventions; record the PR link here.

## Risks

- **Breadth over depth**: ~85 files reference the markers; a missed emitter/consumer pair
  breaks a chain silently. Mitigation: exhaustive grep sweep for `PR_URL`, `PR_NUMBER`,
  `SPEC_PATH` must return only intentional legacy-compat mentions before the gate.
- **Downstream parsers** (user scripts, cezar) keying on `PR_URL=` break on new output.
  Mitigation: BACKWARD_COMPATIBILITY.md entry + cezar companion PR parses both.
- **Prose collision**: `PR:`/`Issue:` lines can occur in quoted text; parsers use
  line-anchored exact shape and last-occurrence-wins, same residual as the `CEZ:*` protocol.

Source doc: none (brief-driven).

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Contract definition

- [ ] 1.1 AGENTS.md marker contract rewrite
- [ ] 1.2 rules.md boilerplate swap across all 30 skills
- [ ] 1.3 om-create-skill boilerplate + invariants
- [ ] 1.4 BACKWARD_COMPATIBILITY.md entry

### Phase 2: Emitters

- [ ] 2.1 pr-finalize.md marker blocks (9 files)
- [ ] 2.2 SKILL.md final-report templates (PR-producing/-driving skills)
- [ ] 2.3 Issue-driven/-producing skills emit `Issue:`

### Phase 3: Consumers and cross-references

- [ ] 3.1 Chaining prose in SKILL.md consumers
- [ ] 3.2 references/*.md cross-file sweep to zero stale mentions

### Phase 4: Docs mirrors + validation

- [ ] 4.1 docs/skills mirrors + top-level docs
- [ ] 4.2 Lint gate + self-review

### Phase 5: cezar companion PR

- [ ] 5.1 task-markers report-tier parsing + tests
- [ ] 5.2 store referenced-issue tier + tests
- [ ] 5.3 cezar spec note + validation + PR opened
