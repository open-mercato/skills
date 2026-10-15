# Report templates

Loaded by `om-evolve-harness` workflow step 12. Lead with what the harness now catches that it missed before; keep the per-gate table complete — a missing row reads as a pass.

## Final report

```markdown
🎯 `om-evolve-harness`: <case ID> now catches <semantic failure, one sentence> — fixed in <owner kind> `<owner path>`.

- Change class: knowledge-contract | asset-sync (derived) — contracts: <list>
- Case: <case ID> (<new | corrected>), family <family>, risk <risk>, related <IDs>
- Evidence: <sanitized source summary and hash — never raw transcript text>

## 🧪 Before / after
| Gate | Before (owner unchanged) | After | Command slot |
|---|---|---|---|
| Target case | ❌ fail — <sanitized reason> | ✅ pass | `validateCase` / `validateLive` |
| Related tags + mandatory cases | — | ✅ / ❌ / NOT RUN | `validateFamily` |
| Catalog gate | — | ✅ / ❌ | `validateAll` |
| Writable target (`validation.commands`, focused tests) | — | ✅ / ❌ / NOT RUN | `fixture`, `validateWritable` |
| Knowledge-change manifest | — | ✅ / ❌ / NOT RUN | `validateKnowledgeChange` |
| Release suite (primary runner <name>; portability <name or "not requested">) | — | ✅ / ❌ / NOT RUN | `release` |

## 🔍 Review
- `om-code-review` on the harness diff: <verdict, blocker/major count>
- `om-judge-agent-session` lanes: <verdict per result, owners it named>

## Versions
<harness, framework, runner CLI, model, and skill versions exactly as run>

## ⚠️ Open items
<only when something is NOT RUN, blocked, or awaiting the user — each with the action that closes it>
```

Omit `Open items` when empty. The change is left in the working tree; name the next step (commit via `om-check-and-commit`, or a PR) in one line.
