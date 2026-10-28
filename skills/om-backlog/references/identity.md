# Source identity and stable ids (steps 2–5)

The same repository can hold backlogs for several specs. A title id alone never
proves that an issue belongs to the source being processed.

## Resolve the existing tree before assigning ids

Normalize `{source}` to its repository-relative path, without `./` or `..`, and
use it as `BACKLOG_SOURCE`. Read `${SPECS_DIR}/backlog.md` when present. On a
filing run, use **search-issues** plus **get-issue** to recover this source's
tree, including closed issues; a dry run uses the local record only and skips
tracker access. Every managed issue carries these exact body lines:

```text
Backlog source: <BACKLOG_SOURCE>
Backlog id: <full item id>
```

Match both lines exactly before regenerating an existing issue. A search by id
or title only finds candidates; `E01` must not match `E01-S01`, and an issue
marked for a different source is never rewritten or reparented. When it covers
the requested outcome, show it as an external dependency/reference instead of
filing a duplicate. An adopted issue without a title prefix still has the two
body lines, or a source-qualified adoption comment when its body cannot be
edited because another actor has claimed it.

For older issues without the lines, use the source path in the existing
`backlog.md` section and corroborate it against the issue's design authority and
outcome. Show that mapping as an adoption in step 4, then add the lines only
after confirmation. A prefix alone, conflicting sources, or ambiguous matches
never authorize an update: leave the issue untouched and resolve the mapping
with the user. A source rename follows this same explicit adoption path; do not
silently create a new tree or rewrite another source's section.

## Allocate only genuinely new ids

Keep existing item-to-issue mappings before assigning ids to new outcomes.
Reordering, inserting an item, or moving a story never renumbers existing ids.
If an outcome changed so much that its identity is unclear, show the ambiguity
in the confirmation instead of reusing the old id by position.

For new epics, inspect all used ids with the requested prefix in the repository,
across sources and open/closed issues and the saved record. Allocate after the
highest epic number, starting at `01` only when none exists. For new stories or
tasks, allocate after the highest suffix already used under that id prefix.
Reserve ids recorded for retired, removed, or moved items too; never fill gaps.
The research epic uses the same allocation, retaining an existing `E00` only
when it already belongs to this source. `--prefix` affects new ids only.

On a dry run, preserve known local mappings but label new
ids provisional: they are checked again on the filing run before confirmation.
If the tracker inventory is incomplete, do not claim that new ids are free.
Immediately before creating or updating, re-read candidate issues and verify
the source/id pair and claim state. If another run has taken an id since the
tree was confirmed, stop that write and show the revised mapping; never let an
exact-title reuse in `om-prepare-issue` adopt another tree's issue.

## Keep the record for every source

`${SPECS_DIR}/backlog.md` has one section per `Backlog source:`. Update only the
current source's section and preserve other sources and retired mappings. A
legacy single-source file is read from its `# Backlog — {source}` heading and
wrapped into a source section without losing its rows. The tracker is the live
authority; the local record keeps the source-to-issue map and reserved ids.
