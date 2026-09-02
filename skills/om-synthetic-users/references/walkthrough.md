# Walking a flow (step 4)

How the personas walk the subject. The same step record is kept whatever the medium; what changes is where the screens come from.

## Subjects

- **Brief or spec (narrative).** Walk the named Key flow or the spec's UI/UX section step by step on paper. Every screen is as the document describes it; a screen the document does not describe is a *missing case*, not something to imagine.
- **Prototype (static HTML).** Open each file through the browser-provider operations — **open** (`file://` path), **snapshot** for the accessible structure, **interact** to click through, **assert** for expected text, **screenshot** at every judged state, **close**. The prototype's own navigation is the flow.
- **Running app (`--app`).** Boot only through `om-prepare-test-env` (reuse a healthy environment when its descriptor says so; record whether this run started it and tear down only what it started). Log in with the descriptor's role that matches the persona; never with personal credentials. Walk the flow with the same operations. Stop at real walls (permissions, broken environment) and list them under *Not walked*.

## The step record

For every step of the flow, for every persona:

| Step | Persona expects | Persona gets | Friction | Missing case | Contradiction with the brief | 📸 |
|---|---|---|---|---|---|---|

- *Friction*: where the persona hesitates, misreads, or takes a longer path, in the persona's words.
- *Missing case*: a situation from the persona's lines the flow does not handle (the constraint, the objection, the thing they will not do).
- *Contradiction*: the flow promises something a brief claim (cite `R0n`, `N0n`, `D0n`) forbids or the persona's material says they would not accept.
- *📸*: the screenshot file for prototype and app walks; "narrative" otherwise.

Judge the state matrix when screens exist — default, empty, loading, error, no-permission — and record a missing state as a missing case; the design contract in `.uxproof/`, when present, is the reference for what a house screen should look like.

## Consolidation

Group the step records into **barriers** (friction that stops the job), **missing cases**, and **contradictions**, ranked by how many personas hit them and how early in the flow. Each item becomes one hypothesis with the `[SYNTHETIC]` tag, the persona ids that produced it, and the real-user check that would confirm or refute it. Under `adversary`, each item also names the brief assumption it attacks.
