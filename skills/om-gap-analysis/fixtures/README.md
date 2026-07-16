# Gate fixtures — expected exit codes

Run every command from this skill's directory. Each row is a binding behavior;
a change that flips any expected code is a regression.

| Command | Expected |
|---|---|
| `bin/gap-checklist-gate fixtures/gap-checklist/complete.md` | exit 0 |
| `bin/gap-checklist-gate fixtures/gap-checklist/happy-path-only.md` | exit 1 — names the phantom story ref and the reasonless out-of-scope |
| `bin/gap-checklist-gate fixtures/gap-checklist/no-categories.md` | exit 1 — fail-closed: no `coverage_categories` declared |
| `bin/gap-checklist-gate` | exit 2 — usage |
| `bin/gap-pipeline-crosscheck fixtures/gap-crosscheck/tree.md fixtures/gap-crosscheck/snapshot.md` | exit 1 — Story 3.1 missing citation (companion PR #29 via the unique proper-noun stem `ksef`), Story 3.2 phantom (`companion PR #77`) |
| `bin/gap-pipeline-crosscheck fixtures/gap-crosscheck/tree-cited.md fixtures/gap-crosscheck/snapshot.md` | exit 0 — both citations resolve |
| `bin/gap-pipeline-crosscheck fixtures/gap-crosscheck/snapshot.md fixtures/gap-crosscheck/tree.md` | exit 2 — fail-closed on swapped files |
| `bin/gap-depth-check fixtures/gap-depth/tree.md fixtures/gap-depth/snapshot.md fixtures/gap-depth/summary-fail.md` | exit 1 — companion PR #29 (CHANGES_REQUESTED) unsurfaced |
| `bin/gap-depth-check fixtures/gap-depth/tree.md fixtures/gap-depth/snapshot.md fixtures/gap-depth/summary-pass.md` | exit 0 |
| `bin/gap-depth-check fixtures/gap-depth/tree.md fixtures/gap-depth/snapshot.md fixtures/gap-depth/summary-fail.md --min-additions 200` | exit 1 — PR #15 (+300) also triggers |
| `bin/gap-depth-check fixtures/gap-depth/tree.md /nonexistent fixtures/gap-depth/summary-pass.md` | exit 2 — fail-closed |

## gap-validate-finding and gap-orientation-preflight

These two gates need a git checkout, which a fixture directory cannot ship.
Reproduce their binding cases against a synthetic repo:

```bash
T=$(mktemp -d) && git init -q "$T/repo" && mkdir -p "$T/repo/modules/currencies" \
  && echo "export const currencies = []" > "$T/repo/modules/currencies/index.ts" \
  && git -C "$T/repo" add -A && git -C "$T/repo" -c user.email=t@t -c user.name=t commit -qm init
printf 'Story 1.1: Multi-currency support\n- currency conversion on invoices\n' > "$T/story.txt"

BLOCK='- **Verdict**: ❌ Missing
- **Grounding query**: `currencies`
- **Grounding source**: core
- **Effort**: 3
- **Upstream pipeline**: none'

# Binding case: a ❌ whose query has real hits is rejected (exit 1) —
# the gate re-runs the query, it does not trust the block.
printf '%s\n' "$BLOCK" | bin/gap-validate-finding 1.1 --repo-root "$T/repo" --story "$T/story.txt"

# Strawman guard: an unrelated query on a ❌ is rejected (exit 1).
printf '%s\n' "$BLOCK" | sed 's/`currencies`/`zzqxnonexistent`/' \
  | bin/gap-validate-finding 1.1 --repo-root "$T/repo" --story "$T/story.txt"
```

For `bin/gap-orientation-preflight`, the binding case is staleness: seed a
clone one commit behind its source repo and re-run — the preflight must
fast-forward it and assert `HEAD` equals the remote tip before printing the
path (wrong-branch, dirty-tree, and ahead-of-remote checkouts must all fail
with exit 1). The remote-match is host-agnostic: any remote URL containing
`<owner>/<name>` qualifies, so a local source repo under a path ending in
`github.com/<owner>/<name>` works for tests.
