# Inserting the product-layer blocks into SDLC.md (step 4)

The blocks are the `IF discovery` blocks of `om-setup-agent-pipeline/references/sdlc-template.md`, rendered with the repository's config (`{{tracker}}`, `{{specsDir}}`, `{{baseBranch}}`) and the answers from step 2 (`discovery.roles.*` resolve the nested conditionals). Two kinds of marker, because an HTML comment on its own line breaks a GFM table and splits a list:

- **Paragraphs and sections** are wrapped:

  ```markdown
  <!-- discovery:start -->
  …rendered block…
  <!-- discovery:end -->
  ```

- **Table rows and list items** carry an inline `<!-- discovery -->` at the end of the last cell or the bullet, already present in the template's text. No marker lines go inside a table or a list.

A generated `SDLC.md` whose config already had `discovery.enabled` when `om-setup-agent-pipeline` ran carries the same markers, so both paths produce one file shape.

## Anchors, in document order

| Block | Kind | Where it goes | When the anchor is missing |
|---|---|---|---|
| The before-intake paragraph (`om-discover` establishes the product context…) | wrapped | After the paragraph that starts "Before intake, the work is shaped" | After the last paragraph of *Purpose* |
| Role lines (Product owner; Domain expert and Discovery design when declared) | inline | Before the `- **Maintainer**` bullet in *Roles* | At the end of the *Roles* list |
| The Discovery and Intake rows | inline | In the lifecycle table: the existing Discovery row, when there is one, and the existing Intake row are **replaced** by the rendered pair, matched by the stage name in the first cell. An Intake row that does not mention the Definition of Ready is the delivery-only row, whatever its exact wording (the pre-2026-09 template wrote "with enough detail to act on"). The replaced text is shown in the diff. | Insert the pair above the first Triage row |
| *Definition of Ready* and *Product decisions as a protected contract* | wrapped | Immediately before the first of these headings that exists: `## Label state machine`, `## The QA gate`, `## The claim protocol`, `## The automation contract`, `## Validation gate` — after the lifecycle table and its after-merge paragraph when the file has one, never inside another section | Before `## Amending this process` |
| The amending paragraph (blocks owned by `om-setup-discovery-pipeline`) | wrapped | After the first paragraph of *Amending this process* | Skipped, and reported |

Replacing the Discovery and Intake rows is the one place this skill removes text, and only rows the template generated. When the existing Intake row already mentions the Definition of Ready and carries no inline marker, treat it as an unmarked block (below). When a row's first cell matches but the team clearly rewrote the table (extra columns, a different shape), do not replace: insert the pair above Triage, leave the row, and say so.

## Idempotency and refresh

- Before inserting, look for existing markers (wrapped blocks and inline-marked lines). When every block is present and its content equals the freshly rendered block, report "already current" and write nothing.
- Without `--refresh`, an existing block whose content differs from the render is the team's: leave it and list it in the report.
- With `--refresh`, replace the content between each marker pair, and each inline-marked line, with the render and show the diff; text outside the markers is never touched.
- An `SDLC.md` without markers (hand-written, or generated before this layer existed) gets the anchor treatment above, block by block.

## Adopting unmarked sections

An `SDLC.md` generated from an earlier template may already carry a block's text without markers — a `## Definition of Ready` heading, a `## Product decisions as a protected contract` heading, a Product owner bullet, or an Intake row that mentions the Definition of Ready. Never insert a second copy. For each such block: show the existing text next to the fresh render, offer to wrap it in markers as is (the team's text stays) or to wrap and refresh it (the render replaces it), and report the choice. Detection is by heading or, for table rows and bullets, by the leading cell or the bold role name; when detection is ambiguous, ask rather than guess.

## When SDLC.md does not exist

Render the whole template with `discovery.enabled` on, under the rules `om-setup-agent-pipeline/references/project-docs.md` sets for a generated `SDLC.md` (derived from this repository, shown before writing). Say in the report that the delivery half of the document was generated here because the delivery setup had skipped it.

## Preserve the delivery Designer

The generic **Designer** bullet from delivery setup is not a discovery-owned
block. Never adopt it into discovery markers or remove it when discovery is
disabled. The optional **Discovery design** bullet adds product-layer
responsibilities only when `discovery.roles.designer` is true. Match that exact
bold label when inserting or refreshing it; a pre-existing delivery Designer
bullet is not its adoption target.

## Removing the product layer

Removing inline-marked rows without replacements would erase delivery stages.
Before deleting any discovery-owned content, prepare the delivery-only Discovery
and Intake rows. Restore their exact pre-install text from the recorded setup
diff or version history when available. Otherwise render the `IF NOT discovery`
pair from the delivery template with the repository's current configuration.
Show the proposed removal diff, including that fallback when used, before
applying it. Preserve custom or ambiguous rows for manual resolution.

Replace the discovery-owned Discovery and Intake rows with that pair, then
remove the remaining discovery-marked blocks, inline items, routing entry and
`discovery` config key. Leave the generic Designer and every other delivery stage
untouched. After an install followed by removal, the lifecycle must still have
exactly one Discovery row, one Intake row and one delivery Designer bullet;
existing custom content must remain. Do not delete the brief, research or
prototype artifacts when disabling this layer.
