# The three modes

How `om-discover` differs by situation (workflow step 1, and the ladders in step 3). The brief's structure is one; the mode changes where discovery starts, which sections are mandatory beyond the common ones, who signs the Definition of Ready, and what the skeptic attacks first.

## `existing` — a product with users

- **Truth lives in:** the code, the design contract (`.uxproof/`), `BACKWARD_COMPATIBILITY.md`, usage data, support tickets, current users. Tag these `[PRODUCT]` and `[DATA]`.
- **Start from:** reading, not asking. Agent instruction files, README, specs, the contract, the compatibility surfaces, and whatever data extracts sit in the research directory. Ask the user only for goals, metrics, and what must stay unchanged — the repository cannot answer those.
- **Mandatory sections beyond the common ones:** *What stays unchanged*, *Impact on existing data and users*, *Compatibility surfaces touched* (from `BACKWARD_COMPATIBILITY.md`).
- **Who signs the Definition of Ready:** the product owner, plus a compatibility check by the maintainer of the touched surface.
- **DoR addendum:** migration and rollback path, list of affected screens and user groups.
- **Skeptic attacks first:** "what breaks", hidden dependencies, users the change forgets.
- **Persona walkthroughs:** on the running product through the browser provider when one is configured; personas come from real segments in the data, never invented.

## `client` — a client brings an idea

- **Truth lives in:** the client's stakeholders, their process, their systems and data, their constraints. Tag interviews and workshop exports `[INTERVIEW]`, client documents `[DOCUMENT]`.
- **Start from:** a workshop frame, in this order — the decision the session must produce; the stakeholder map with a named decider; each stakeholder's expectations and their own definition of success; constraints and appetite (budget, deadline and where it comes from, legal, organisational); the systems and data landscape (what exists, what to integrate with, who owns the data); the as-is process as a service blueprint (front stage, back stage, handoffs) with pain points by frequency and cost; and then the client's feature list **reframed**: for each requested feature, the problem it is meant to solve, the evidence that problem exists, and the outcome it should produce. Features with no problem behind them go to the parking lot, not the brief.
- **Mandatory sections beyond the common ones:** *Stakeholders and decider*, *Constraints and appetite*, *Systems and data*, *Decision log*, *Rollout plan* (pilot group, what happens to the old process, training, communication), *Non-functional requirements* the client will not raise on their own (roles and permissions, compliance, accessibility, languages, devices, performance, SLA).
- **Who signs the Definition of Ready:** the client's named decider. Autonomous assumptions later surfaced at merge (the assumptions comment) are confirmed by that person, and the brief records who that is.
- **DoR addendum:** the decider's sign-off on scope and on the anti-goals (what must not get worse).
- **Skeptic attacks first:** solution-shaped problem statements, stakeholders who were not in the room, constraints nobody priced.
- **Persona walkthroughs:** simulate users and stakeholders only as hypotheses; every output is tagged `[SYNTHETIC]` and paired with an entry on the interview plan (who, how many, who books them).

## `own` — our own idea

- **Truth lives in:** nowhere yet. The team's beliefs, tagged `[ASSUMPTION]` until tested.
- **Start from:** the vision in one sentence; the riskiest assumptions ranked by "if this is false, the product is pointless"; the smallest test for each; the kill criteria (what result makes us stop); the one metric that matters with a threshold and a date.
- **Mandatory sections beyond the common ones:** *Assumption map* (importance × evidence, with a test, an owner, and a date for every entry in the important-and-unproven corner), *Kill criteria*, *Primary metric with threshold*.
- **Who signs the Definition of Ready:** the team, with the riskiest assumption either tested or explicitly accepted untested — the brief records which.
- **DoR addendum:** the test result, or the recorded decision to build without it.
- **Skeptic attacks first:** confirmation, the "we are the user" fallacy, benchmarks read as validation, synthetic personas that agree.
- **Persona walkthroughs:** adversarial only — the persona looks for reasons not to buy, not to switch, not to trust. A walkthrough that agrees with the team is discarded as uninformative.

## Choosing when it is unclear

A brownfield repository with a brand-new capability the current users never asked for is `existing` (the compatibility risk is real) with the `own` assumption map added. A client who already has the product in production is `existing` with the client's decider signing. When two modes apply, take the union of their mandatory sections and say so in the brief header.
