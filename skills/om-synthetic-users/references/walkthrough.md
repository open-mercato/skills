# Walking a flow (step 4)

How the personas walk the subject, one persona per fresh-context subagent. The same step record is kept whatever the medium; what changes is where the screens come from.

## Subjects

- **Brief or spec (narrative).** Walk the named Key flow or the spec's UI/UX section step by step on paper. Every screen is as the document describes it; a screen the document does not describe is a *missing case*, not something to imagine.
- **Prototype (static HTML).** Open each file through the browser-provider operations — **open** (`file://` path), **snapshot** for the accessible structure, **interact** to click through, **assert** for expected text, **screenshot** at every judged state, **close**. The prototype's own navigation is the flow.
- **Running app (`--app`).** Boot only through `om-prepare-test-env` (reuse a healthy environment when its descriptor says so; record whether this run started it and tear down only what it started). Log in with the descriptor's role that matches the persona; never with personal credentials. Walk the flow with the same operations. Stop at real walls (permissions, broken environment) and list them under *Not walked*.

## The step record

For every step of the flow, for every persona, these fields (kept as a list per step in the transcript; the table below is the field list, not a layout):

| Step | First three things noticed | Persona expects | Persona gets | Fast reaction and feeling | Friction | Missing case | Contradiction with the brief | 📸 |
|---|---|---|---|---|---|---|---|---|

- *First three things noticed*: what this persona's eye goes to on the screen, from their state of mind and their goal, before reading. A primary action the persona did not notice in three is a finding.
- *Fast reaction and feeling*: the reaction in the state of mind at entry (the anxious persona reads a typo as a scam signal; the unhurried one shrugs), with the emotion and its strength.
- *Friction*: where the persona hesitates, misreads, or takes a longer path, in the persona's words.
- *Missing case*: a situation from the persona's lines the flow does not handle (the constraint, the objection, the thing they will not do, the pressure that flipped the decision in the interview).
- *Contradiction*: the flow promises something a brief claim (cite `R0n`, `N0n`, `D0n`) forbids or the persona's material says they would not accept.
- *📸*: the screenshot file for prototype and app walks; "narrative" otherwise.

Judge the state matrix when screens exist — default, empty, loading, error, no-permission — and record a missing state as a missing case; the design contract in `.uxproof/`, when present, is the reference for what a house screen should look like.

## Consolidation within a run

Group the step records into **barriers** (friction that stops the job), **missing cases**, and **contradictions**, with the personas that hit each and how early in the flow. This is one run's input to `references/panels-and-repeats.md`, where only what repeats across runs becomes a finding. Each surviving item becomes one hypothesis with the `[SYNTHETIC]` tag, the persona ids and runs that produced it, and the real-user check that would confirm or refute it. Under `adversary`, each item also names the brief assumption it attacks.
