# Add an interactive prototype skill, decoupled from any one design system

## 📝 TLDR

The designer role in this collection can produce a spec with static mockups attached, walk a pull request's UI in a real browser, extract the repository's design contract, and decide a direction before anything is drawn. What it cannot do is hand a reviewer a screen they can click through and comment on *before* implementation starts, which is the cheapest moment to discover that a flow is wrong. An interactive prototype skill with an anchored-comment engine exists upstream but is bound to one design system and stranded on a branch whose pull requests were closed without merging. This spec generalizes it in three layers and adds it as `om-mockup-prototype`. Token values come from a committed snapshot rather than a parser for one stylesheet; branding sits behind a `theme.css` carrying eight identity tokens, so a prototype directory is self-contained and rebranding is one file; the hand-written component layer stays but stops claiming to mirror any specific component library.

## 📝 Resolved decisions

- **D1 — One spec, not two.** The design-token contract and the skill are formally separable, but a token contract with no consumer is speculative and a skill without one is not portable. They ship together.
- **D2 — One shipped example design system, not a menu.** The default token snapshot carries the upstream project's values. Anyone wanting a different one derives it from that example. No neutral-versus-branded variant selection, no descriptor registry.
- **D3 — Substitute what upstream has not finished, with the seam at a file boundary.** Where the upstream design-system track has shipped an artifact, the skill consumes it. Where it has not, the skill carries its own primitive, shaped so the eventual replacement is a file swap rather than a rewrite.
- **D4 — The prototype is self-contained.** A generated directory renders with no build step, no network access, and no installed design system. This constraint outranks fidelity.
- **D5 — Three phases across two repositories.** Decoupling is proven upstream against a real design system before the skill is added here, because generalizing in a repository that cannot run the result is guesswork.

## 📝 Problem Statement

### The collection has no pre-implementation prototype step

`om-auto-write-spec` attaches mockups as static PNGs rendered from throwaway HTML. `om-ux-review-pr` judges a running UI on an open pull request. `om-ux-setup` extracts the design contract. `om-ux-shape` decides a direction before screens exist. Between the last two there is nothing that produces an artifact a stakeholder can operate: click from a list to a detail, open a drawer, and leave a comment pinned to the field they are objecting to.

That gap matters most for the reviewers who are not developers. A static PNG cannot answer "what happens when I press this", and a pull request preview arrives after the implementation cost is already sunk.

### The upstream skill that fills it cannot travel

An interactive prototype skill exists in the upstream monorepo with a working engine: click-through navigation with visited-screen history, presentation mode, comment pins anchored to elements, persistence in `localStorage`, an append-only operation log with tombstones for deletions, re-anchoring for orphaned comments, and export back into the repository. That engine is 27 KB of product-agnostic JavaScript and is the part with no equivalent anywhere in this collection.

It is stranded. It lives on a branch whose two pull requests were closed without merging, 50 commits ahead of and 50 behind the upstream default branch. Every improvement made to it is stuck there.

### Three couplings block extraction

1. **The token sync script is a parser for one file, not a configurable input.** It holds a specific application stylesheet path as a constant, then parses that file's internal structure: its light block, its dark block, its framework theme block, with hard thresholds ("at least 40 tokens in dark") and required token names. Pointing it at another repository's stylesheet fails on structure long before it fails on content.

2. **The bundled stylesheets reference 64 token names with no fallbacks.** The existing resolution check rejects any unresolved variable, so in a repository whose design system does not define those names the skill refuses to initialize.

3. **The repository root is derived by walking three directories up from the skill.** That works today across the three common installation directories only because all three happen to sit at the same depth.

### The component layer promises a fidelity nobody enforces

Its header comments declare hand-written "primitive equivalents" and claim to mirror a named application shell component. Nothing verifies either claim. A measured example from the button: the real component renders a 2.25rem height with 1rem horizontal padding, while the prototype renders the same height with 0.75rem padding, because the icon-bearing variant was transcribed as the default. The prototype also carries four button variants against the real ten, and four sizes against five.

This is not an oversight to correct once. It is the steady state of a hand-maintained copy. The fix is to stop making the promise.

## 📝 Scope and non-goals

**In scope.** Generalizing the three couplings; the `theme.css` convention; adding the skill with the collection's standard reference files and section structure; the roster entry; documentation across the skill page, README, designer role page, decisions log, and changelog.

**Not in scope.** Any change to the existing UX skills or their contracts. Pixel-fidelity rendering of a specific component library. A hosted or collaborative comment backend. Design-file review, which no skill in this collection covers. A second shipped design system.

**Deliberately deferred.** A sibling upstream skill covering design-tool briefs has the same coupling problems and is left for a separate change: one decision to review at a time.

## 📝 Grounded contract inventory

Surfaces this change touches, each verified against the current tree:

| Surface | Current state | Change |
|---|---|---|
| Content lint (`scripts/lint.sh` grep gate) | Bans upstream product tokens, hard-coded base branch and package manager across `skills/**` | Six hits removed from the imported files before merge |
| Frontmatter gate | `name` equals directory, description under 500 characters, no unquoted `": "`, body under 20,000 characters | Imported skill already satisfies all four (description 428, body 6,353) |
| Reference-resolution gate | Every `references/...` pointer must resolve | Three standard files added, one dangling cross-skill pointer removed |
| Roster-sync gate | `ROSTER=` in `om-setup-agent-pipeline/references/skill-coverage.md` must equal the contents of `skills/` | One name added |
| Tracker-abstraction gate | No direct tracker CLI outside `references/trackers/` | Not applicable; the skill performs no tracker operations |
| Layout convention (`DECISIONS.md`) | `skills/<name>/` with optional `references/` and `scripts/`; all 36 skills carry only `references/` | Imported `assets/` folded under `references/assets/`, following the nested-directory precedent |
| Cross-skill contract §5 | Standard step files per skill, own copy each | `agentic-setup.md`, `rules.md`, `report-templates.md` added |
| Cross-skill contract §1 | Chaining reference lines for PR-producing skills | Not applicable; this skill produces a directory, not a pull request |
| `DECISIONS.md` → Deferred | Defers skills beyond the pull-request pipeline that are product-specific upstream | Dated entry, framed as extending the UX layer added in #57 |

## 📝 Proposed Solution

Three layers, each with an explicit seam, under D3.

### Layer 1 — Base tokens: consume the committed snapshot

The upstream design-system track ships a committed token snapshot: 124 tokens, each carrying its light and dark value in one record along with a kind, a theme-invariance flag, and a framework alias. It is generated from the source stylesheet, guarded by a drift check that exits non-zero, and governed by the rule that any change to a token must regenerate it.

The sync script reads that instead of parsing CSS. It loses the block reader, the declaration parser, the group assertions, the thresholds, and the required-name checks, and becomes a mapping from JSON to custom properties. The light/dark split arrives as data rather than being reconstructed from a stylesheet's block structure, which is what made the parser brittle in the first place.

Resolution order: a `designTokens` key in `.ai/agentic.config.json`, then the conventional snapshot path, then the copy shipped inside the skill. The last step is what lets the skill produce a working prototype in a repository with no design system at all (D4).

### Layer 2 — Theming contract: substitute, seam at the file boundary

An open upstream change draws the boundary this skill needs but has not landed. The boundary is narrow, which is what makes it usable: **eight identity tokens** may be overridden — the primary colour with its hover and foreground, two brand accents, the radius, and the two font stacks. Everything else is a semantic contract: status roles consumed by alerts and badges, the selection accent wired to native control states, the layering scale that keeps portaled components ordered, and the focus-ring anatomy. Re-colouring a status role changes meaning, not appearance.

The radius cascades through `calc()` to the whole scale, so one value re-rounds every surface.

The mechanism transfers unchanged, and this is the load-bearing observation: that convention is a plain `:root {}` plus `.dark {}` block loaded after the base tokens, with no framework directives and no build step, because utilities compile against indirection (`--color-primary: var(--primary)`) so a runtime override retints without recompilation. A prototype is plain CSS over the same custom properties, so it behaves identically without needing the framework at all.

Each generated prototype therefore carries its own `theme.css` in exactly that convention: the eight knobs, the semantic contract stated in a header comment, scaffolded inert and fully commented out. Someone who wants their own look copies the directory and edits eight values in one file. Someone who already maintains such a file for their application drops it in and the prototype takes on their brand.

**Seam:** when the upstream change lands, the skill scaffolds that template instead of its own copy. Same convention, so it is a swap of source, not of contract.

### Layer 3 — Visual primitives: keep, drop the claim

The upstream component gallery has shipped and renders real components, but they are framework components inside a product module, so a static prototype cannot consume them. The composer that could expose a static renderer over that registry is an unmerged draft carrying requested changes.

The bundled component and screen stylesheets stay. What goes is the claim. The header comments are replaced by an honest statement: a neutral skeleton parameterized by the repository's tokens, not a replica of its components. Drift stops being a defect once the promise is gone.

**Seam:** when a static renderer over a component registry exists, this layer is replaced by it. The token contract sits below the component layer, so layers 1 and 2 are unaffected.

Until then the division of labour is clean: this skill answers "does this flow make sense", a design-system composer answers "is this screen faithful to the system", and `om-ux-review-pr` answers "is the shipped UI right".

### Alternatives considered

**A design-system descriptor modeled on the tracker and browser providers.** Rejected: it invents a third provider contract to solve what eight tokens in one file already solve, drags `om-setup-agent-pipeline` into the change, and is less self-contained than a file inside the prototype directory (D4).

**A hard dependency on the `om-ux-setup` contract.** Rejected: its `tokens.json` is a flat list with no theme variant, and this skill verifies both themes. It also adds a network-fetched dependency to a workflow whose whole value is running from a directory with no build step. It remains usable as an optional token source.

**Compiling the CSS framework so screens use production utility classes.** Rejected: pixel fidelity bought with a build step, a hard framework dependency in an otherwise stack-agnostic collection, and the loss of the property that makes the artifact useful in a live review.

## 📝 Architecture

### Generated prototype directory

```text
<prototypes-dir>/<slug>/
├── index.html          screens as stable <section id="sN"> elements
├── tokens.css          GENERATED from the snapshot — never edited by hand
├── theme.css           the eight identity knobs — the file an adopter edits
├── components.css      neutral skeleton primitives
├── screens.css         neutral skeleton layouts
├── prototype.css       engine chrome (navigation, pins, presentation mode)
├── prototype.js        engine — product-agnostic
├── comments.js         append-only operation log of review feedback
└── README.md
```

Load order is `tokens.css` → `theme.css` → skeleton → engine chrome. Identity overrides land after the generated base and before anything consuming them, matching the upstream application ordering.

### Fallbacks

Every `var(--token)` in the bundled stylesheets gains a fallback. The existing resolution check already exempts variables with fallbacks, so the gate keeps working unchanged while the stylesheets stop requiring a specific design system to be present.

### Product specifics stay behind the override contract

Backend screen anatomy and any routing pointer to a product-specific composer live in the consuming repository's `.ai/skills/om-mockup-prototype/` override, per the standard repo-local extension contract. This follows the established path: `om-spec-writing`, `om-integration-tests`, and `om-prepare-test-env` all generalized by stripping specifics into an override, and the UX judgment layer moved wholesale in #57.

## 📝 Compatibility and instruction surface

No existing skill changes behavior. The additions are one skill directory, one roster line, and documentation. `om-setup-agent-pipeline` gains a roster entry only; its workflow is untouched, since the token path is an optional config key the new skill reads for itself.

Two additive, optional configuration keys: `designTokens` and `paths.prototypes`, the latter following the existing `paths.specs` convention. Both have working defaults, so an installation that sets neither behaves correctly.

Script signatures are preserved, so upstream users of the skill see no interface change.

## 📝 Edge Cases & Failure Scenarios

| Scenario | Behavior |
|---|---|
| No token snapshot anywhere | Falls back to the copy shipped in `references/` and states which source was used. A prototype is always producible. |
| Snapshot present but malformed | Fails before creating the directory, naming file and parse position. The staging-directory pattern leaves no partial prototype. |
| Not a git checkout | Root resolution falls back to the working directory with a stated assumption, rather than silently resolving three levels up into an unrelated path. |
| Design system lacks some of the 64 names | Fallbacks render the neutral default; the resolution check stays silent because fallbacks are exempt. |
| Adopter overrides a semantic token | Not mechanically blocked, since it is plain CSS. The header comment states the contract and the hand-off step flags it. |
| Upstream theming change lands later | Existing files keep working; the convention is identical. New prototypes scaffold from the template. |
| A static component renderer appears later | Layer 3 is replaceable without touching layers 1 and 2. |
| Two prototypes on one origin | Comment storage is namespaced per prototype; isolation is part of the verification checklist. |

## 📝 Risks & Impact Review

**Blast radius.** One new skill directory, one roster line, documentation. No existing skill's behavior, no shared reference file, no tracker or label contract.

**Backward compatibility.** Nothing in this collection's protected surfaces is touched: no shared step-file format, no chaining marker, no config key removed or repurposed. Both added keys are optional with defaults.

**Coordination.** The upstream design-system track owns this area and settled the boundary between a registry-backed composer and this interactive workflow on 2026-08-02, including the storage split between composed mockups and interactive prototypes. This spec preserves that division and leaves one boundary question open below rather than deciding it unilaterally.

**Rollback.** Each phase reverts independently. The collection change is additive: removing the directory and the roster line restores the previous state exactly.

**What could still go wrong.** The snapshot format is owned upstream and could change; the mitigation is that the sync script consumes documented fields and fails loudly rather than guessing. The 64 fallback values are a second place where design defaults live and will drift from the snapshot over time; they are deliberately neutral, so the drift is invisible in any repository supplying real tokens.

## 📝 Research: what comparable tools get right

**Component workshop tools** key everything to a stable story identifier and treat renaming as a breaking change, because addons, visual-diff services, and deep links all resolve through it. The same discipline exists here as the stable screen-id rule, and it matters more, because comment anchors resolve against those ids. Worth stating explicitly in the skill rather than leaving as convention.

**Open-source design tools** anchor review comments to positions inside a document and keep them when the document changes, degrading to an orphaned state rather than dropping feedback. This skill already implements that, including tombstones and re-anchoring, and it is the strongest argument for adding it.

What those tools carry that this skill should keep skipping: a runtime, an account model, and hosted state. The value here is a directory that opens without a server and travels inside a pull request, and every decision above protects that property.

## 📋 Implementation Plan

### Phase 1 — Decouple upstream (separate repository, prerequisite)

Proven against a real design system before anything lands here (D5).

1. Rewrite the token sync to read the snapshot, dropping the block reader, declaration parser, group assertions, thresholds, and required-name checks. → verify: a check run on an existing prototype reports no drift and the regenerated output differs only in its header.
2. Resolve the repository root through git with a stated fallback. → verify: initialization succeeds through a symlinked skills directory and from a different install depth.
3. Add fallbacks to the 64 bundled variables. → verify: with the token source removed, a prototype renders in both themes and the resolution check stays silent.
4. Scaffold `theme.css` and wire it into the load order. → verify: uncommenting the primary colour and the radius re-tints and re-rounds every screen in both themes; re-commenting restores the original.
5. Replace the fidelity claims in the stylesheet headers, the page, and the generated readme. → verify: no comment asserts a correspondence to a named component file.
6. Move assets under `references/assets/` and update the path constant. → verify: a fresh run produces a byte-identical prototype apart from the two changed files.
7. Prove portability in a checkout without the upstream application. → verify: a prototype is produced, renders in both themes, and states its token source.

### Phase 2 — Add the skill here

8. Import the skill and clear the content gate: six forbidden-pattern hits removed, dangling cross-skill pointer dropped. → verify: `bash scripts/lint.sh` prints `Lint OK`.
9. Add the roster entry. → verify: the roster-sync gate passes, which it cannot before this step.
10. Add `references/agentic-setup.md`, `references/rules.md`, and `references/report-templates.md` from the canonical copies. → verify: the reference-resolution gate resolves every pointer.
11. Restructure `SKILL.md` into `## Arguments`, `## Workflow`, `## Rules`. → verify: the body still states what the skill does, in what order, and where detail lives; body stays inside the character budget.
12. Ship the default token snapshot in `references/` with its provenance documented in product-agnostic terms. → verify: initialization in a repository with no design system produces a rendering prototype.
13. Documentation: `docs/skills/om-mockup-prototype.md`; README under interactive skills and in the designer table; a row and a tip in `docs/roles/designer.md`; a dated `DECISIONS.md` entry framed as extending the UX layer from #57; a `CHANGELOG.md` entry. → verify: lint passes and every cross-reference resolves.

### Phase 3 — Consume from here (separate repository, follow-up)

14. Upstream replaces its local copy with the installed skill plus a repo-local override carrying the backend anatomy and composer routing. → verify: a prototype generated through the installed skill and override is equivalent to one generated before the change.

## 📋 Acceptance Criteria

- `bash scripts/lint.sh` exits zero with every gate satisfied, including roster sync and reference resolution.
- A prototype initializes and renders in both themes in a repository with no design system, no network access, and no build step.
- Editing the eight identity tokens in `theme.css` re-tints and re-rounds every screen in both themes; the semantic tokens are documented as out of contract in the file header.
- No file in the added skill asserts fidelity to a named component of any specific library.
- The comment engine passes its checklist: creation, reply, survival across reload, pins on inputs and buttons, re-anchoring, deletion tombstones, export, and storage isolation between two prototypes on one origin.
- The added skill performs no tracker operations and emits no chaining markers, consistent with producing a directory rather than a pull request.

## 📋 Rollout

Phase 2 is a single additive pull request here, mergeable once Phase 1 is verified upstream. No installation is affected until a user adds the skill; existing installs are untouched because nothing shared changes. Phase 3 is an upstream follow-up with no dependency in this direction.

## 📋 Open question for the design-system track owner

The upstream composer specification states that this skill is limited to backend and backoffice journeys, and that portal, storefront, and public frontend requests route to surface-specific workflows, with the explicit instruction that the prototype skill must not claim those surfaces.

Inside the upstream monorepo that routing resolves. In this collection it does not: the composer depends on a product module and its component registry, so it cannot travel, and "backoffice" has no referent in an arbitrary repository.

Proposal, offered for the track owner's decision rather than assumed here: restate the boundary in terms of the question rather than the surface. This skill answers "does this flow make sense"; a design-system composer answers "is this screen faithful to the system". That formulation holds in both contexts, needs no notion of backoffice, and preserves the original intent, because a generic "mock this screen" request still routes to the composer. The storage split and the division of labour are unaffected either way.

## Changelog

- **2026-08-26** — Initial spec. Three-layer decoupling (base tokens from a committed snapshot, theming contract as a substituted primitive with a file-swap seam, visual primitives kept without a fidelity claim), three-phase rollout across two repositories, and one boundary question referred to the upstream design-system track owner.
