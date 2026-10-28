# New skill: om-pipeline-retro — classify finished runs and rank what second passes cost

## Goal

Give any repository running this collection a read-only answer to one question it cannot answer today: how often did the pipeline carry a change to merge in a single pass, and what stopped it the rest of the time? The collection has no skill that reads its own history; every harness change therefore ships on argument rather than on a measured before and after.

## Scope

- `skills/om-pipeline-retro/SKILL.md` — the new interactive skill: enumerate finished runs, gather per-run evidence, classify deterministically, report, offer a handoff.
- `skills/om-pipeline-retro/references/classify-runs.sh` — the deterministic classifier. Reads the assembled tracker data on stdin, writes the classification on stdout, contacts nothing.
- `skills/om-pipeline-retro/references/agentic-setup.md`, `references/rules.md` — own copies of the standard step files, shared parts byte-identical to the canonical text, with this skill's specifics appended.
- `skills/om-pipeline-retro/references/report-templates.md` — the report shapes, kept out of the body so an unused table costs no tokens.
- `skills/om-setup-agent-pipeline/references/skill-coverage.md` — roster entry, so a missing install is distinguishable from an unrelated token.
- `skills/om-setup-agent-pipeline/references/trackers/TEMPLATE.md`, `.../github.md`, `.ai/trackers/github.md` — `createdAt`, `closedAt`, `additions`, `changedFiles` join the documented `get-pr` field set and `createdAt` joins the merged and closed `list-prs` queries, because the skill's timing and size figures were reading fields the contract never promised.
- `UPGRADE_NOTES.md`, `DECISIONS.md` — the descriptor re-sync a custom tracker needs, and the two choices worth recording.
- `docs/skills/om-pipeline-retro.md`, `docs/skills/README.md`, `README.md` — the documentation card, the two index rows, and the skill count.

## Non-goals

- No change to any existing skill's behaviour or templates. The tracker contract gains four documented fields on operations that already exist, which is the additive path `BACKWARD_COMPATIBILITY.md` prescribes, and every shipped descriptor is updated in this same change.
- No new tracker operation. The skill composes **list-prs** and **get-pr**, both already in the descriptor contract, so every provider that implements the contract supports it unchanged.
- No new config key. Window and limit are arguments, not settings.
- No write path of any kind. Filing an issue is a handoff to `om-prepare-issue`, gated on the user.

## Evidence (verified, not assumed)

The classifier was written against a real corpus before it was written into a skill: 416 pull requests and 1749 branch commits from a public repository that runs this collection, of which 198 carry agent run markers.

```
clean single pass          125   median  1.9h to merge  p90  22.8h
hard recovery               38   median 22.8h           p90 100.8h
loop checkpoints (design)    2   median  3.3h
second pass, no cause       34   median  7.0h           p90  18.2h
in flight, not classified    2

hard recovery by change size:  8% under +200 added lines
                              14% at 200-600
                              40% above +600

ranked causes (excess hours beyond a 1.9h clean run, split across a request's causes):
  change requested by a reviewer   26 requests   419h
  review could not be recorded     31 requests   360h
  base moved under the change      17 requests   354h
  cause not stated                 20 requests   222h
  run did not finish                6 requests    74h

declared Outcome lines found: 0 of 199
```

Two findings came straight out of that corpus without any change to the collection, which is the argument for the skill existing at all. The reviewing step could not record a formal verdict on 31 of the requests that took a second pass, and on 69 across the classified window, because the tracker refuses an approval from the account that authored the request; in 71 requests across the whole corpus no formal approval exists at all, so the verdict lives only as a comment. And base movement costs 354 hours over 17 requests, the most per request of any stated cause.

These are the numbers after an adversarial review of the first draft, not before it. The first classifier counted a run per marker comment, so a single review that ran longer than an hour was reported as a second review round: it over-reported clean runs as rework and, once cause detection also stopped matching negated prose ("uninterrupted") and quoted text, requests moved from fabricated causes into the honest unexplained bucket. The corrected classifier counts runs from the claim boilerplate's opening comments and reads only agent-authored, unquoted text.

## Design decisions

- **Bash and `jq`, not Python.** The collection requires POSIX-ish portable shell in skills and states outright never to assume `python3` exists, while `jq` is already a prerequisite of the tracker descriptor. A Python reference implementation was written first for validation and is not shipped.
- **The script lives under `references/`.** That is the only location the reference-resolution gate verifies, so a broken pointer fails CI instead of failing at runtime in a user's repository. No skill in the collection ships an executable today; this is a new pattern, which is why the body also states the inline fallback and the file carries its rules in a comment header.
- **No `## Chaining` section and no chaining reference lines.** The contract binds that section on `om-auto-*` skills. More importantly the report is about requests this run did not create, so a line-anchored `PR:` line would be read by a chained consumer as this run's subject. Requests are linked inline instead.
- **Second pass is not failure.** Loop-mode checkpoints are classified separately rather than counted as rework, and a run whose record states no reason is reported as unexplained rather than guessed at. A request still carrying the in-progress label is not a finished run at all and is counted nowhere.
- **Runs are counted from their opening comment**, the one the claim boilerplate posts ("started by", "taking over"), not from marker density. Each skill posts several marker comments per run, so counting occurrences reports a long run as two.
- **A request's excess time is split across its causes**, so the ranked column sums to the hours actually lost instead of billing the same delay to every cause it touched.

## Risks

- **Cost.** Classification needs one **get-pr** call per finished run; there is no bulk operation carrying comments and individual reviews together. Mitigated by a `--limit` default of 30 and a report header that states the window and the count actually examined.
- **Timestamp coverage.** Run clustering needs comment timestamps. Where a provider omits them the classifier degrades to counting marker comments, which is an upper bound, and says so in `timestampCoverage`; the report header repeats it.
- **Marker dependence.** A repository whose skills post no marker comments cannot be classified. The empty-result line says exactly that rather than reporting a misleading zero.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: The skill

- [x] 1.1 Classifier validated against a 416-request corpus, reproducing an independent reference implementation
- [x] 1.2 `SKILL.md`, the three reference files, and the documentation card
- [x] 1.3 Roster entry and the two index rows
- [x] 1.4 `bash scripts/lint.sh` and `node scripts/test-browser-providers.mjs` both green
- [x] 1.5 Adversarial review of the draft, and the four blocking defects it found: run counting, the descriptor field contract, closed-unmerged pricing, and a read-only skill that would have run the setup skill on a repository without a pipeline
- [x] 1.6 `get-pr` and `list-prs` field sets extended in `TEMPLATE.md`, the shipped GitHub descriptor, and this repo's installed copy, with an `UPGRADE_NOTES.md` entry

### Phase 2: Review and land

- [ ] 2.1 Open the pull request against the collection's base branch
- [ ] 2.2 Address review; confirm the additive-only scope holds

### Phase 3: What the report itself asks for next

- [ ] 3.1 A machine-readable `Outcome:` line in the run-summary block of the PR-driving skills. On the validation corpus not one of 199 classified requests carries such a line, and 34 second passes state no reason anywhere; the classifier already reads such a line where it exists, so the unexplained count is the measurement that would show the change working.
- [ ] 3.2 Runner identity on commits, so a repository running several agents can tell which one produced a change. Today only one runner signs its work, which is why the skill classifies runs rather than actors.
