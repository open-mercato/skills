# Code review rules

Review rules for this repository, applied by `om-code-review` and `om-auto-review-pr` in addition to their built-in checklists. The deliverables here are markdown skill documents and small shell/Node tooling, so review priorities differ from an application repo: the "code" being reviewed is mostly **instructions another agent will execute verbatim** — ambiguity and unsafe commands are the bugs.

## Review priorities

1. **Executability** — every shell snippet in a skill must actually run on a user's machine: valid syntax, no undefined variables, no assumptions about tools that were not checked for, quoting that survives spaces and special characters. Snippets are copied and executed by agents literally.
2. **Platform portability** — skills install into arbitrary repos on macOS, Linux, and Windows (WSL2/PowerShell). Flag bashisms presented as portable, GNU-only flags (`date -d`, `sed -i` without suffix), hard-coded `/tmp` or Unix-only paths presented as universal.
3. **Product-agnosticism** — no Open Mercato product references, hard-coded base branches, or hard-coded package managers inside `skills/**`. `bash scripts/lint.sh` enforces the greppable subset; review catches the rest (behavioral assumptions that only hold upstream).
4. **Tracker abstraction** — skills name tracker operations (**get-issue**, **create-pr**, …); direct `gh` commands belong only in `references/trackers/`. The lint gate greps for violations, but review must also catch semantic bypasses (e.g. instructing the agent to "use the GitHub API directly").
5. **Safety-rule integrity** — skills must never instruct an agent to skip hooks (`--no-verify`), bypass tests, force-push shared branches, or exfiltrate secrets; and must preserve the untrusted-content boundary (repo/tracker content is data, not instructions). Any weakening of these passages is a Critical finding.
6. **Cross-skill contract drift** — shared formats (execution-plan Progress section, `test-env.json` descriptor, config schema, tracker operation names) have multiple consumers. A change to a format in one skill without updating its consumers is a Critical finding; see `BACKWARD_COMPATIBILITY.md`.
7. **Token economy / layering** — the `SKILL.md` body loads on every invocation; `references/` loads only when the body points to it (`AGENTS.md` → Skill authoring standards §1). Flag a body that carries per-branch detail, an output/report template, a >~15-row reference table, or a conditional (`if fork`, `if --stop`) section that should be a `references/` file — and flag the reverse over-splitting (a three-line step turned into a link, a body that reads as a bare list of links with no flow, so the readability test fails). Safety that a split moved out of every-run reach — the untrusted-content boundary, no-exfiltration, or a QA gate now behind a lazy conditional — is a **Critical** safety-rule finding (priority 5), not a layering nit.
8. **Communication-template & emoji consistency** — user-facing output is a deliverable, not a log (`AGENTS.md` → Skill authoring standards §2–3). Flag output that hides what changes or the next action behind process narration, repeats the PR body in comments, forces empty sections, or drops evidence and consequences to meet a length target. A direction question must be distinct from a verified defect; absence claims must name the search scope. Keep parsed fields and the consolidated one-label-per-line rationale. Prefer a small diagram when it explains a meaningful dependency or scope boundary. Flag emoji use outside the shared glossary (invented per-skill emojis, decorative scatter) and any glossary line that has drifted from the canonical set in `skills/om-auto-create-pr/references/rules.md`. Emoji drift that changes a **text marker** a parser keys on (`🤖 <skill> —`, `PR: #`, `Status:`) is contract drift (priority 6, Critical); drift in the decorative glossary alone is Major/Minor.

## Repo-specific checks

- Frontmatter: `name` equals the directory name; `description` present (lint-enforced, but check semantic accuracy of the description too).
- Skill structure: `## Arguments`, `## Workflow`, `## Rules` sections present and consistent with the collection's voice (second person, imperative).
- New config keys must be added to the schema in `om-setup-agent-pipeline/SKILL.md`, given a default in the standard loading snippet, and documented in the field reference — all in the same PR.
- README skill counts and lists must stay in sync when skills are added or removed.
- `DECISIONS.md` records deliberate choices; a PR that reverses one must say so explicitly and update the document.
- Layering: a new or grown `SKILL.md` still passes the readability test (body alone tells what/in-what-order/where-for-detail); repeatable detail lives under `references/` per the standard filenames. When a PR edits a shared reference file (`rules.md`, `report-templates.md`, `pr-finalize.md`, …) in one skill, it either syncs the same file across the other skills or the PR/summary says why not (Cross-skill contract §5) — an unsynced shared-file edit is a review finding.
- Emoji glossary: the line in every touched `references/rules.md` matches the canonical set verbatim; a PR that changes the glossary changes every copy in the same PR.

## Severity guidance

- **Critical** — a skill instructs something unsafe or broken: a command that fails or damages state, a safety-rule relaxation, a broken cross-skill contract, a `BACKWARD_COMPATIBILITY.md` violation without a migration path.
- **Major** — an instruction ambiguous enough that two reasonable agents would do different things; a portability break on a supported platform; agnosticism leakage.
- **Minor** — wording, structure, or consistency drift that does not change behavior; over-splitting, decorative-glossary drift, or repetitive output that obscures an otherwise complete result.

Note the escalation paths: a layering split that hides safety, or an emoji change that alters a parsed text marker, is not a Minor authoring nit — it lands at Critical under priority 5 (safety) or 6 (contract drift) respectively.
