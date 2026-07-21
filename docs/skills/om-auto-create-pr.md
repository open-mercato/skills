# om-auto-create-pr

> 🤖 Autonomous — runs end-to-end without supervision

Turn a free-form task brief into a disciplined autonomous run that ships as a PR against the configured base branch. The skill drafts a lightweight, Progress-tracked execution plan, works on a fresh branch in an isolated worktree, implements phase-by-phase with incremental commits, runs the full configured validation gate, self-reviews for breaking changes, and opens a ready-for-review PR with normalized pipeline labels. The Progress checklist makes the run resumable — if it can't finish in one invocation, `om-auto-continue-pr` picks up where it left off. Use it for arbitrary end-to-end tasks; for long multi-phase spec work that needs strict step tracking, use `om-auto-create-pr-loop` instead.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{brief}` | Yes | Free-form task description, from one sentence to several paragraphs. |
| `--spec <ref>` | Optional | A spec to implement — a path, a spec name/slug, or an issue/PR number to resolve one from. Becomes the plan's source doc; stops if it can't be resolved. |
| `--skill-url <url>` | Optional (repeatable) | External skill or reference page to honor during planning and execution. Reference material only, never permission to bypass project rules. |
| `--slug <kebab-case>` | Optional | Override the slug used in the plan filename. Defaults to one derived from the brief. |
| `--force` | Optional | Bypass the claim-conflict check when a previous run left a branch or plan behind. |

## Works with

Turns a `{brief}` into a new PR (detecting and reusing an existing PR for the same work rather than duplicating it), and ends by emitting the `PR:` / `Issue:` chaining reference lines for the next skill in a chain. Companion skills, all optional with inline fallbacks: [om-open-pr](om-open-pr.md) (PR opening/labels), [om-code-review](om-code-review.md) (self-review), [om-auto-review-pr](om-auto-review-pr.md) (the autofix loop), and [om-auto-continue-pr](om-auto-continue-pr.md) (resume).

---
*Source: [`skills/om-auto-create-pr/SKILL.md`](../../skills/om-auto-create-pr/SKILL.md)*
