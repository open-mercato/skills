# Plan cache

Loaded by `om-smart-test` steps 2 and 5. The cache lets a repeated run on the
same commit skip analysis. It lives inside the git directory — per worktree,
never committed, no ignore rule needed:

```bash
CACHE_FILE=$(git rev-parse --git-path om-smart-test-cache.json)
```

## Validity (step 2)

Reuse the cached plan only when **all** hold:

1. `commitHash` equals `git rev-parse HEAD`;
2. the working tree is clean — `git status --porcelain` prints nothing (no staged, unstaged, or untracked changes);
3. `baseRef` equals the base ref this run resolves (step 3's resolution, or `--base`), and `baseCommit` equals `git rev-parse "$BASE_REF"` — a moved base changes the diff;
4. `inputsHash` equals the hash of the current inputs:

   ```bash
   MAP_FILE=$(jq -r '.smartTest.map // ".ai/test-map.json"' .ai/agentic.config.json 2>/dev/null || echo .ai/test-map.json)
   INPUTS_HASH=$({
     cat "$MAP_FILE" 2>/dev/null
     jq -c '{smartTest, validation}' .ai/agentic.config.json 2>/dev/null
   } | git hash-object --stdin)
   ```

   (When there is no map, the derived units depend on the workspace manifests; those changing means a new commit or a dirty tree, which conditions 1–2 already catch.)

Any mismatch, an unreadable file, or `--no-cache` → the cache is invalid; analyze afresh and overwrite it.

## Format (written in step 5)

Write it with the file-writing tool or `jq -n`; one object:

```json
{
  "commitHash": "<git rev-parse HEAD>",
  "baseRef": "<resolved base ref, or empty for local-only>",
  "baseCommit": "<git rev-parse of baseRef, or empty>",
  "inputsHash": "<INPUTS_HASH>",
  "savedAt": "<ISO-8601 timestamp>",
  "classification": "wide | test-only | unit-scoped | ignored-only",
  "affectedUnits": ["<unit name>@<unit root>"],
  "suites": [
    { "name": "<suite>", "mode": "full | related | direct | unit | skip", "args": ["<file or unit>"], "trigger": "<why>" }
  ]
}
```

A cached plan is run exactly as stored; the report marks it `[cache hit: <short-sha>]`.
