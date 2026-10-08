# Public branch and issue publication

Loaded by `om-share-this-session` step 5, only after the exact acknowledgement is received for the final artifact hashes and destination.

## Destinations and names

- Issue repository: the `<issue-repo>` resolved in step 0 and named in the acknowledgement.
- Storage repository: the `<storage-repo>` resolved in step 0 (default: the issue repository); it must be public.
- Branch: `session-share-<share-name>` (slash-free and derived locally).
- Upload exactly `session.json`, `generated-files.zip`, `manifest.json`, and `privacy-report.json`. Never pass the source export, literal-redaction list, file manifest, review tree, or staging parent to a publication operation.

## Publish safely

1. Recompute the four artifact hashes and compare them byte-for-byte with the consent preview and `manifest.json`. A mismatch invalidates consent; return to the preview.
2. Run **search-issues** in the issue repository for the exact marker `[session-share:<share-name>]`, covering open **and** closed issues (run the operation once per state when it takes a single state). If an issue exists, stop and return it rather than creating a duplicate or overwriting its branch.
3. Invoke **publish-session-share** with the validated storage repository, derived branch, share name, and exact bundle directory. The operation must verify public visibility, reject an existing branch, create blobs/tree/commit privately through the API, and create the public ref last. Capture the returned commit and branch URL.
4. Build the issue body from `references/report-templates.md`, using only sanitized metadata and public links. Invoke **create-issue** against the issue repository; do not assign a user or assume labels exist.
5. If issue creation fails after the branch ref exists, immediately invoke **delete-session-share** for that exact repository and branch. If deletion also fails, stop and prominently report the exposed branch URL so a maintainer can remove it.

Do not silently fall back to a gist or a different repository: destination ownership and visibility are part of informed consent. If branch publication is unavailable, no issue is created and the local bundle remains local.
