# GitHub session-share operations (bundled fallback)

`om-share-this-session` uses this file only when `TRACKER` is `github` and the installed `.ai/trackers/github.md` does not define **publish-session-share** / **delete-session-share**. It defines exactly those two operations, in the descriptor format; every other operation still comes from the installed descriptor. When the installed descriptor defines them, the installed definitions win.

Requires `gh` (authenticated via **auth-check**), `jq`, and `base64`.

#### publish-session-share
`{owner}/{repo}`, `{branch}`, `{shareName}`, and a local `{bundleDir}` → atomically publish the four reviewed session-share artifacts on a new public branch and return repository, branch, commit, branch URL, and raw artifact URLs as JSON.

This operation is intentionally strict: the repository must already be public; the branch must be a new slash-free `session-share-…` ref; and the bundle directory must contain regular, non-symlinked `session.json`, `generated-files.zip`, `manifest.json`, and `privacy-report.json` files within the documented size cap. Git blobs, a tree, and a commit are created first; the public ref is created last, so a preparation failure does not expose a partial branch.

```bash
TARGET_REPO="{owner}/{repo}"
SHARE_BRANCH="{branch}"
SHARE_NAME="{shareName}"
BUNDLE_DIR="{bundleDir}"
printf '%s' "$TARGET_REPO" | grep -Eq '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' || exit 1
printf '%s' "$SHARE_NAME" | grep -Eq '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$' || exit 1
[ "$SHARE_BRANCH" = "session-share-$SHARE_NAME" ] || exit 1
[ "$(gh repo view "$TARGET_REPO" --json visibility --jq .visibility)" = "PUBLIC" ] || exit 1
gh api "repos/${TARGET_REPO}/git/ref/heads/${SHARE_BRANCH}" >/dev/null 2>&1 && exit 1

SESSION_SHARE_TMP=$(mktemp -d)
trap 'rm -rf "$SESSION_SHARE_TMP"' EXIT HUP INT TERM
printf '[]\n' > "$SESSION_SHARE_TMP/tree.json"
TOTAL_BYTES=0
for ARTIFACT in session.json generated-files.zip manifest.json privacy-report.json; do
  ARTIFACT_PATH="$BUNDLE_DIR/$ARTIFACT"
  [ -f "$ARTIFACT_PATH" ] && [ ! -L "$ARTIFACT_PATH" ] || exit 1
  ARTIFACT_BYTES=$(wc -c < "$ARTIFACT_PATH" | tr -d ' ')
  TOTAL_BYTES=$((TOTAL_BYTES + ARTIFACT_BYTES))
  [ "$ARTIFACT_BYTES" -le 26214400 ] && [ "$TOTAL_BYTES" -le 31457280 ] || exit 1
done

for ARTIFACT in session.json generated-files.zip manifest.json privacy-report.json; do
  ARTIFACT_PATH="$BUNDLE_DIR/$ARTIFACT"
  base64 < "$ARTIFACT_PATH" | tr -d '\n' > "$SESSION_SHARE_TMP/content.b64"
  BLOB_SHA=$(jq -n --rawfile content "$SESSION_SHARE_TMP/content.b64" '{content:$content,encoding:"base64"}' \
    | gh api -X POST "repos/${TARGET_REPO}/git/blobs" --input - --jq .sha) || exit 1
  jq --arg path "$ARTIFACT" --arg sha "$BLOB_SHA" \
    '. + [{path:$path,mode:"100644",type:"blob",sha:$sha}]' \
    "$SESSION_SHARE_TMP/tree.json" > "$SESSION_SHARE_TMP/tree.next.json" || exit 1
  mv "$SESSION_SHARE_TMP/tree.next.json" "$SESSION_SHARE_TMP/tree.json"
done

DEFAULT_BRANCH=$(gh repo view "$TARGET_REPO" --json defaultBranchRef --jq .defaultBranchRef.name) || exit 1
BASE_COMMIT=$(gh api "repos/${TARGET_REPO}/git/ref/heads/${DEFAULT_BRANCH}" --jq .object.sha) || exit 1
BASE_TREE=$(gh api "repos/${TARGET_REPO}/git/commits/${BASE_COMMIT}" --jq .tree.sha) || exit 1
TREE_SHA=$(jq -n --arg base "$BASE_TREE" --slurpfile entries "$SESSION_SHARE_TMP/tree.json" \
  '{base_tree:$base,tree:$entries[0]}' \
  | gh api -X POST "repos/${TARGET_REPO}/git/trees" --input - --jq .sha) || exit 1
COMMIT_SHA=$(jq -n --arg message "session share ${SHARE_NAME}" --arg tree "$TREE_SHA" --arg parent "$BASE_COMMIT" \
  '{message:$message,tree:$tree,parents:[$parent]}' \
  | gh api -X POST "repos/${TARGET_REPO}/git/commits" --input - --jq .sha) || exit 1
jq -n --arg ref "refs/heads/${SHARE_BRANCH}" --arg sha "$COMMIT_SHA" '{ref:$ref,sha:$sha}' \
  | gh api -X POST "repos/${TARGET_REPO}/git/refs" --input - >/dev/null || exit 1

jq -n \
  --arg repository "$TARGET_REPO" \
  --arg branch "$SHARE_BRANCH" \
  --arg commit "$COMMIT_SHA" \
  --arg branchUrl "https://github.com/${TARGET_REPO}/tree/${SHARE_BRANCH}" \
  --arg sessionUrl "https://raw.githubusercontent.com/${TARGET_REPO}/${SHARE_BRANCH}/session.json" \
  --arg archiveUrl "https://raw.githubusercontent.com/${TARGET_REPO}/${SHARE_BRANCH}/generated-files.zip" \
  --arg manifestUrl "https://raw.githubusercontent.com/${TARGET_REPO}/${SHARE_BRANCH}/manifest.json" \
  --arg privacyUrl "https://raw.githubusercontent.com/${TARGET_REPO}/${SHARE_BRANCH}/privacy-report.json" \
  '{repository:$repository,branch:$branch,commit:$commit,branchUrl:$branchUrl,artifacts:{session:$sessionUrl,archive:$archiveUrl,manifest:$manifestUrl,privacy:$privacyUrl}}'
```

#### delete-session-share
`{owner}/{repo}`, `{branch}`, and `{shareName}` → remove only the exact derived session-share ref after a failed issue creation or an explicit retention cleanup request. Deleting a public ref cannot guarantee erasure from clones, forks, caches, logs, or archives.

```bash
TARGET_REPO="{owner}/{repo}"
SHARE_BRANCH="{branch}"
SHARE_NAME="{shareName}"
printf '%s' "$TARGET_REPO" | grep -Eq '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' || exit 1
printf '%s' "$SHARE_NAME" | grep -Eq '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$' || exit 1
[ "$SHARE_BRANCH" = "session-share-$SHARE_NAME" ] || exit 1
gh api -X DELETE "repos/${TARGET_REPO}/git/refs/heads/${SHARE_BRANCH}"
# Verify removal — a surviving ref must be reported, never assumed gone.
gh api "repos/${TARGET_REPO}/git/ref/heads/${SHARE_BRANCH}" >/dev/null 2>&1 && exit 1
exit 0
```
