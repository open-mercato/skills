# Drafting the tree (step 2)

How the source becomes epics, stories, and tasks. The tree is shown to the user before anything is filed; this file is the drafting discipline.

## From a product brief

- **Epics** ← each item under *Scope → Now*. One epic per independently valuable slice of the product; a *Now* item that bundles two slices becomes two epics. *Later* items become one epic titled `E{nn} — Later` with the items as unfiled bullets in its body; *Not doing* items are never filed and are quoted in the parked epic's body as non-goals with their `N0n` ids.
- **Stories** ← the steps of the brief's Key flows that fall inside the epic, phrased as an outcome for a role from the Target group: "a {role} can {do the thing} and sees {the result}". A step with no outcome is a task, not a story.
- **Acceptance criteria** ← derived from the brief's Goals (the observable user outcome and its check), Business rules (`R0n`: each rule the story touches becomes a criterion), Decisions (`D0n`: a decision that constrains the story, such as the payment provider, becomes a criterion), Non-goals (what the story must not do), and the Key flow step the story implements. Given / When / Then, verifiable by someone who did not write them, at least one negative case per story. A criterion that traces to none of these is dropped, not kept.
- **Tasks** ← only when a story needs decomposition a single PR cannot carry (a migration, a contract change from `BACKWARD_COMPATIBILITY.md`, a third-party integration). Most stories have none.
- **Decisions in play** ← the `D0n`, `R0n`, `N0n` ids each story relies on, quoted in one line each, so the implementer and the reviewer see the settled calls at the issue.

## From a spec

- **Epics** ← Phases; **stories** ← the user-facing outcomes inside a Phase (a Phase's Steps grouped by the outcome they produce); **tasks** ← Steps that are purely technical. Acceptance criteria come from the spec's Edge Cases and the Decisions in play section. When the spec is issue-driven, the tracking issue is the root and the epics `Refs` it.

## Ids

`{prefix}{nn}` for epics, `{prefix}{nn}-S{nn}` for stories, `{prefix}{nn}-S{nn}-T{nn}` for tasks, zero-padded, assigned in tree order, never reused. The id opens the title: `E01-S02 — A member can submit a claim and sees its status`.

## Order, dependencies, labels

- Stories inside an epic are ordered so each leaves the product working; a story that depends on another names it (`Depends on: E01-S01`) and is filed after it.
- Priority and risk are inferred per `SDLC.md`'s rules from the story's content — a story touching authentication or login sessions, money, data scoping, or a migration is `risk-high` regardless of how small it looks (the product's own nouns, such as a mentoring "session", do not trigger it) — and passed to `om-prepare-issue` as `--priority` / `--risk`. An epic carries the highest risk of its stories. When `labels.enabled` is false the values are shown in the tree for the record and `om-prepare-issue` applies none.
- Category is `feature` for stories and epics, `refactor` or `dependencies` for the tasks that are one.

## The research variant

When step 1 finds Problems or Target group resting on assumptions, or the user asks for it, the tree has one epic `E00 — Discovery` (the id is fixed; `--prefix` replaces only the letter) whose children are **tasks**, one per collection-plan entry plus one per failing brief section the plan does not yet cover: "find out {question} from {role}", done when material for it lands under `${SPECS_DIR}/research/` with the tag the entry's method produces (`[INTERVIEW]`, `[DATA]`, `[DOCUMENT]`, or `[BENCHMARK]`), the owner as assignee when given, and the by-when date in the body. This is the only backlog a not-ready brief produces, and the report says which brief sections it repairs and which still need `om-discover --refresh`.

## Size

A first backlog is one to five epics and three to twelve stories. More than that means the *Now* scope is not the smallest coherent product; say so and suggest moving items to *Later* before filing.
