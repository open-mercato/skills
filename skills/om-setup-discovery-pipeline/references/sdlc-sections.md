# Inserting the product-layer blocks into SDLC.md (step 4)

The blocks are the `IF discovery` blocks of `om-setup-agent-pipeline/references/sdlc-template.md`, rendered with the repository's config (`{{tracker}}`, `{{specsDir}}`, `{{baseBranch}}`) and the answers from step 2 (`discovery.roles.*` resolve the nested conditionals). Every rendered block is wrapped:

```markdown
<!-- discovery:start -->
…rendered block…
<!-- discovery:end -->
```

A generated `SDLC.md` whose config already had `discovery.enabled` when `om-setup-agent-pipeline` ran carries the same markers, so both paths produce one file shape.

## Anchors, in document order

| Block | Where it goes | When the anchor is missing |
|---|---|---|
| The before-intake paragraph (`om-discover` establishes the product context…) | After the paragraph that starts "Before intake, the work is shaped" | After the *Purpose* section's last paragraph |
| Role lines (Product owner; Domain expert and Designer when declared) | Before the `- **Maintainer**` bullet in *Roles* | At the end of the *Roles* list |
| The Discovery and Intake rows | **Replace** the delivery-only Discovery and Intake rows of the lifecycle table (the pair the template renders under `IF NOT discovery`); wrap the replacement pair | Insert the pair above the first `| Triage |` row and leave the existing rows in place; report that the old Intake row is still there for the team to remove |
| *Definition of Ready* and *Product decisions as a protected contract* | After the after-merge paragraph ("After merge, this process stops…"), before the first of `## Label state machine`, `## The QA gate`, `## The claim protocol` that exists | Before `## Validation gate` |
| The amending paragraph (blocks owned by `om-setup-discovery-pipeline`) | After the first paragraph of *Amending this process* | Skipped, and reported |

The replaced Discovery and Intake rows are the one place this skill removes text, and only text the template itself generated. When the rows in the file do not match the template's delivery-only rows (the team edited them), do not replace: fall back to the insert-above-Triage path and say so.

## Idempotency and refresh

- Before inserting, look for existing markers. When every block is present and its content equals the freshly rendered block, report "already current" and write nothing.
- Without `--refresh`, an existing block whose content differs from the render is the team's: leave it and list it in the report.
- With `--refresh`, replace the content between each marker pair with the render and show the diff; text outside the markers is never touched.
- An `SDLC.md` without markers and without the delivery-only rows (hand-written, or generated before this layer existed) gets the missing-anchor treatment above, block by block.

## Adopting unmarked sections

An `SDLC.md` generated from an earlier template may already carry a block's text without markers — a `## Definition of Ready` heading, a `## Product decisions as a protected contract` heading, a Product owner bullet, or an Intake row that mentions the Definition of Ready. Never insert a second copy. For each such block: show the existing text next to the fresh render, offer to wrap it in markers as is (the team's text stays) or to wrap and refresh it (the render replaces it), and report the choice. Detection is by heading or, for table rows and bullets, by the leading cell or the bold role name; when detection is ambiguous, ask rather than guess.

## When SDLC.md does not exist

Render the whole template with `discovery.enabled` on, under the rules `om-setup-agent-pipeline/references/project-docs.md` sets for a generated `SDLC.md` (derived from this repository, shown before writing). Say in the report that the delivery half of the document was generated here because the delivery setup had skipped it.
