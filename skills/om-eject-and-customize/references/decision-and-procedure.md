# Eject decision gate, verification, and provenance ledger

Loaded by `om-eject-and-customize` workflow steps 3, 6, and 7.

## Decision gate (step 3)

1. State the required behavior in one sentence, plus the exact part and the
   installed version it lives in.
2. List the smaller options, in this order, and reject each with evidence (a
   file and line, a documented limit, or a failed attempt) — or recommend it:
   1. configuration the part already exposes;
   2. an extension point the dependency documents (hooks, events, slots,
      interceptors, response or UI extensions);
   3. a supported override or replacement of a single contract, route,
      component, or service;
   4. a separate add-on package or provider;
   5. an upstream fix or feature request, when the need applies to every
      consumer of the dependency.
   Use the alternatives the recipe and the repository's guides name; the
   list above is the generic minimum.
3. A defect in the dependency itself is an upstream fix, not an eject:
   reproduce it against the installed version and report it. Never patch the
   installed copy.
4. Only when every smaller option fails does step 4 run.

## Verification after eject (step 6)

- Every new file sits under the recipe's landing location; the working tree
  shows no other change except the registration edit and paths the recipe
  names.
- The registration now points at the repository-owned copy, and nothing
  still resolves the part from the installed dependency.
- The installed dependency is byte-for-byte unchanged (its manifest version
  and file list match step 1).
- Stable identifiers and persisted state (schema snapshots, migration
  history) match the upstream copy.

A failed check → stop, show the unexpected paths, and offer the rollback:
restore the listed paths from version control and remove the files the
eject created. Never discard unrelated local work — the clean-tree
precondition in step 5 exists so the rollback touches only this eject.

## Provenance ledger (step 7)

The ledger is a repository-owned JSON file at `paths.ejectLedger` (default
`.ai/ejected.json`). It lets a later dependency upgrade tell upstream changes
from local customizations. Create it when missing; otherwise add or update
the entry for this part in place — one entry per ejected part, never
duplicates.

```json
{
  "ejected": [
    {
      "dependency": "<package name>",
      "part": "<ejectable unit name>",
      "version": "<exact installed version ejected from>",
      "procedure": "<the command that ran, or 'manual copy per recipe'>",
      "recipe": "<path of the recipe file, relative to the dependency root or repository>",
      "landing": ["<repo-relative path>", "..."],
      "registration": "<repo-relative file changed to point at the copy>",
      "ejectedAt": "<YYYY-MM-DD>",
      "files": { "<repo-relative path>": "sha256:<hex>" }
    }
  ]
}
```

- `files` holds checksums of the copy **before** customization, so a later
  diff can separate "changed upstream since this version" from "changed
  here".
- Compute checksums with whatever the platform provides (`sha256sum`, or
  `shasum -a 256` on macOS); record which files were hashed, never file
  contents.
- Re-ejecting the same part at a newer version updates `version`,
  `procedure`, `ejectedAt`, and `files` in the existing entry.

Recommend the commit order to the user: first the unmodified ejected copy
plus the ledger (the diff base), then the customization.
