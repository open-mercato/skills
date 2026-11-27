# Report templates (steps 7 to 9)

## Review body

Submitted with **review-pr** (approve or request changes). When the current
user is the PR author, post the same text with **comment-pr**.

```markdown
🤖 `om-review-pr` — 🔍 review of {short head sha}

**Verdict:** {approve | request changes}. {one sentence: why}

**Findings**
- **blocker** `path/to/file.ts:42`: {what goes wrong for whom}. {rule or behavior}. Fix: {concrete fix}.
- **major** ...
- **minor** ...
- **nit** ...

**CI on {short head sha}:** {green | pending: names | red: names, with the cause}.
**Routing labels raised:** {labels with one-line reasons | none}.
**Still waiting for:** {CI | a human tester | a maintainer's acceptance}. {omit when the PR moved to merge-queue}
```

Omit empty severity groups. With no findings at all, write "No findings."
On a re-review, start the findings with the status of each earlier finding.

## Label rationale comment

Exactly one per PR for this skill, found through **list-issue-comments** by
matching **both** its first-line marker
(`` 🤖 `om-review-pr` — 🏷️ label rationale `` or legacy
`🤖 om-review-pr — 🏷️ label rationale`) **and** its author being the trusted
account configured for this skill (the **current-user** login, or an
authorized login in `humanQaPolicy.trustedTriageAuthors` — never match or
edit a comment authored by an untrusted user even if it contains the marker).
Create it with **comment-pr** when no matching trusted comment exists, and
rewrite it in place with **update-comment** on every subsequent run. It lists
the pipeline label and every routing label this skill raised; labels set by
triage are explained in the triage comment.

```markdown
🤖 `om-review-pr` — 🏷️ label rationale

- 🚀 `merge-queue`: every gate holds on {short sha}: CI green, approved, no blocking label.
- 🔍 `review`: approved on {short sha}; still waiting for {gate}.
- ❌ `changes-requested`: {n} findings must be fixed first: {short list}.
- ⚠️ `risk-high`: raised from `risk-medium` because {reason}.
- 🧭 `ci-area:<area>`: {consumer} in {module} reads the changed {contract}.
```

Keep only the lines that apply.

## Final report

```markdown
🔍 PR #{n} · {approve | request changes} on {short sha}

- Findings: {b} blocker, {m} major, {mi} minor, {ni} nit.
- CI: {green | pending | red}.
- Labels: {raised labels | none}; pipeline: `{label}`.
- Waiting for: {gates | nothing}.
- {Proposed for automerge: reason. | omit}

PR: #{n} (link: {url})
```
