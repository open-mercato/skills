# Scenario design — areas, priorities, routes

How `om-auto-qa-scenarios` turns per-PR evidence into testing routes: where the
repo's QA knowledge comes from (step 4), how PRs become areas with a priority
(step 5), and what each route must contain (step 6). The procedure is generic;
every product fact — area names, URLs, menu paths, roles — comes from the
repository.

## Where route knowledge comes from (step 4)

Look up, in this order, and stop at the first source that answers:

1. **`knowledge.sources`** (optional config) — repo-owned guides and route
   maps, or knowledge shipped inside an installed dependency
   (`references/agentic-setup.md`). Typical content: module → admin page map,
   navigation/menu structure, role and permission names, demo data.
2. **The repo `AGENTS.md` Task Router** — map each changed path to its row and
   follow the docs that row points to; the row's area name is the preferred
   area label.
3. **The `om-qa-buddy` knowledge base**, when `<paths.qa>/knowledge-base/`
   exists — `risk-hotspots.md` for known gotchas in the touched modules,
   `module-history.md` for prior verdicts. A hotspot matching a touched module
   becomes a "what can go wrong" bullet and raises QA depth. Read only; this
   skill never writes there.
4. **The changed code itself** — route, page, screen, or menu definitions in
   the PR's files, read the way the repo's own docs say routing works
   (file-based routes, a router table, menu registrations, CLI command names
   for non-UI products).
5. **Unresolved** → write `Route not resolved — entry point: <changed file>`.
   Never invent a URL, menu path, or role name. List every unresolved route in
   the run report so the repo can add the missing knowledge.

A route is whatever a human uses to reach the behavior: a URL path, a menu
path (`Settings → Users → Invite`), a CLI command, an API client call for an
API-only product. Use the form the repo's knowledge uses.

## Areas (step 5)

- Start from the area each PR's changed paths map to (Task Router row, module
  directory, or package), then refine from titles. Merge thin areas; split an
  area only when its routes do not overlap.
- Target **3–6 named areas plus one "No direct manual QA — broad smoke only"
  bucket**. More areas than that stops being a plan.
- Name areas the way the repo's users and docs do, not by directory names.
- A PR touching several areas is listed under the one it changes most and
  cross-referenced ("also touches …") in the others.

## Priority and depth

Priority sets **how soon** an area is tested; risk sets **how hard**.

| Report priority | From `priority-*` labels (unset = medium) | Typical content |
|---|---|---|
| P0 | `priority-high`, `priority-extreme` | access control and sessions, data-scope isolation (tenant/organization/account), money flows, data migrations, encryption, event/webhook/queue reliability, anything that can leak data or double-charge |
| P1 | `priority-medium` | user-facing create/read/update/delete flows, configurable fields, attachments, lists and table rendering, shared UI |
| P2 | `priority-low` | docs, tooling, tests, CI, developer experience — the broad-smoke bucket |

- An area's priority is the highest priority among its PRs. When a PR has no
  `priority-*` label, derive it from the themes above.
- Depth follows the highest `risk-*` in the area (unset = medium; infer it per
  `SDLC.md` when the repo defines risk inference). `risk-high` → an
  adversarial route: edge cases, rollback/undo, cross-scope access checks,
  permission denial, retry and duplicate delivery. `risk-low` → the broad-smoke
  route is enough.
- A `risk-high` PR in a P1/P2 area still gets its own deeper bullet set, so a
  modest-priority but dangerous change is never smoke-tested only.
- **QA-state signal.** A PR that merged carrying `needs-qa` without
  `qa-approved` is flagged in its area ("merged without recorded QA sign-off")
  and raises the area's depth by one step. `qa-approved` / `qa-self-verified`
  PRs are marked as already verified pre-merge; they still get a regression
  check, not a full route.

## Route content (step 6)

Each area section carries:

- **What changed** — 2–3 sentences in user language: who can now do what, or
  which failure is fixed. No file or function names.
- **Representative PRs** and **linked issue refs** — links exactly as the
  tracker returned them.
- **Where QA should click** — the resolved routes from step 4, one per line.
- **What human QA should verify** — concrete manual actions with an observable
  expected outcome ("Invite a user with the viewer role → the invite email
  lists viewer, and the user cannot open Billing"). Never "check it works".
- **What can go wrong** — concrete regression symptoms a tester would see,
  including matched knowledge-base hotspots.
- **Guided session** — the one or two PRs worth a full `om-qa-buddy <PR>`
  session (highest risk first), so a tester can go from this plan to an
  interactive run.

Cross-cutting checks to consider for every area (add a bullet only when the
area's changes make it relevant): access-scope isolation, permission
boundaries, configurable/custom fields, localization (untranslated keys,
one-language features), soft vs. hard delete, live/cross-tab updates, boundary
values and hostile input, workflow interruption (back after submit, double
submit, refresh mid-flow).

### Perceived-performance checks (UI surfaces)

For PRs that change rendered UI, add to the area's verify list:

- cold-load the changed screen and capture screenshot or recorded-flow
  evidence;
- the first useful shell or loading state appears before heavy interaction;
- interaction responsiveness on the changed interactive components;
- a mobile-viewport smoke pass;
- Lighthouse / Web Vitals when the preview environment supports it;
- report blocked performance evidence separately from functional QA.
