# The three modes

The mode changes where you look for evidence, which risks matter, and who signs the Definition of Ready. In every mode, establish the current decision and investigate the unknown most likely to change it. Include detailed material when it affects that decision or the agreed next step. A mode does not require an interview question for every possible section.

## `existing`: a product with users

- **Sources:** the code, design contract (`.uxproof/`), `BACKWARD_COMPATIBILITY.md`, usage data, support tickets, and current users. Use `[PRODUCT]` for observed product behavior, `[DATA]` for data, and `[INTERVIEW]` for user accounts. Code shows what exists; it does not establish why users need it.
- **Start from:** read the relevant material, identify the decision, and understand where the current job fails and what that failure costs. Check whether the proposed change addresses the supported problem before planning its delivery. Ask only for missing facts or decisions the user can supply.
- **Additional brief detail when affected:** *What stays unchanged*, *Impact on existing data and users*, and *Compatibility surfaces touched*. Derive known constraints from the repository and link to their source. State that a surface is unaffected when that follows from the chosen scope; do not manufacture a migration plan for an unrelated discovery question.
- **Who signs the Definition of Ready:** the product owner, plus a compatibility check by the maintainer of any touched surface.
- **DoR addendum:** affected screens and user groups for a proposed change; migration and rollback paths when data, behavior, or compatibility changes require them. Mark unresolved consequential dependencies before implementation.
- **Skeptic checks first:** whether the change addresses the observed problem, then hidden dependencies, affected users, and what could break.
- **`om-synthetic-users` stance:** `validate`. Walk the running product through the browser provider; personas come from real segments in the data. Observed screens describe product behavior; persona reactions remain `[SYNTHETIC]` and never establish demand.

## `client`: a client brings an idea

- **Sources:** the client's stakeholders, their process, systems, data, and constraints. Tag interviews and workshop accounts `[INTERVIEW]`, and client documents `[DOCUMENT]`. A requested feature is a request; establish separately what supports the problem behind it.
- **Start from:** the decision the session must produce and its named decider, followed by the costly problem in the current process. Use a recent case to understand the effect on users and the business. Reframe relevant requested features through that problem and evidence. Defer a feature without a supported problem or record it as a proposal.
- **Additional brief detail:** *Stakeholders and decider*, binding *Constraints and appetite*, and the decisions made. Add *Systems and data*, *Rollout plan*, and non-functional requirements when they constrain the chosen direction. Ask about roles, compliance, accessibility, languages, devices, performance, or service commitments where they could change scope. Avoid running a general requirements workshop before the problem is clear.
- **Who signs the Definition of Ready:** the client's named decider. Record who must confirm any later autonomous assumptions.
- **DoR addendum:** the decider's sign-off on scope and on what must not get worse. For a delivery commitment, resolve material operational constraints and the transition from the old process; for an investigation, name what still needs to be learned.
- **Skeptic checks first:** a proposed solution mistaken for a problem, conflicting stakeholder needs, and constraints that would change the decision.
- **`om-synthetic-users` stance:** `simulate`. Treat simulated users and stakeholders as hypotheses; tag every output `[SYNTHETIC]` and pair useful findings with a plan to interview real people. Name who to reach and who arranges it; do not invent a sample size.

## `own`: our own idea

- **Sources:** the team's beliefs, tagged `[ASSUMPTION]`, plus any real research already available. A team's decision does not upgrade a belief into evidence, and an own idea can already have evidence.
- **Start from:** who may have the problem, what is known about their actual experience, and which belief could overturn the decision to continue. Define the smallest useful test or the provisional scope the team is considering. Investigate the highest consequence unknown first; do not require a fixed number of assumptions.
- **Additional brief detail:** keep *Riskiest assumptions* with Importance and Evidence, and a test, owner, and review point for each assumption that materially affects the next step. Under *Kill criteria*, say what observation would cause the team to stop or revise. Use a *Primary metric* with a threshold and date only when the metric fits the decision and the material or decision-maker supplies their basis. Otherwise name what must be learned before setting them. Do not invent numeric targets to complete a heading.
- **Who signs the Definition of Ready:** the team. Record whether each material assumption was tested, remains a proposal, or was explicitly accepted untested, with the named decision-maker and the scope of that acceptance.
- **DoR addendum:** a test result, or the recorded decision to proceed with specified uncertainty. Acceptance of an untested assumption does not satisfy missing evidence about the problem and target users. A brief can be ready for an experiment or record provisional scope while implementation readiness remains blocked under the common Definition of Ready.
- **Skeptic checks first:** confirmation bias, claims that the team represents the target users, benchmarks presented as validation, and a proposed solution that does not address the supported problem.
- **`om-synthetic-users` stance:** `adversary`. Look for reasons not to buy, switch, or trust. Treat reported objections as `[SYNTHETIC]` hypotheses to investigate. Agreement does not validate the idea; apply the companion skill's report limits.

## Panel subject and arguments

Select the subject separately from the stance: the subject determines what the panel walks.

- To examine a running product in `existing` mode, invoke `om-synthetic-users --app --stance validate`. For an available static prototype, pass its actual `.html` path instead of `--app`.
- For a narrative walkthrough, pass the brief path. Use the mode's stance for `client` or `own`; an explicitly chosen narrative walkthrough in `existing` mode uses `--stance simulate`. Describe it as a walkthrough of the written flow. If the application is unavailable, report that gap before offering this alternative; never silently substitute it for a screen check.
- Pass the agreed `--flow "<name>"` and resolved `--research <dir>`. Under `--quick`, offer `--runs 1 --panel 2`; one run yields exploratory hypotheses only. Read the installed companion's supported arguments before invoking it.

## Choosing when it is unclear

A running product with a new capability that current users have not asked for is `existing` with the `own` assumption checks added. A client with a product in production is `existing` with the client's decider signing. When two modes apply, combine their relevant checks and say so in the brief header. Add detail for real risks in the chosen scope; do not duplicate sections or interview questions.
