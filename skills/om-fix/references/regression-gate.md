# Intention-learning & differential regression gate (steps 2–5)

Mechanics for the test-first Red/Green protocol referenced from the skill body. The point of reordering the workflow this way is narrow: a regression test that is only ever run *after* the fix cannot prove it would have caught the original bug — it has nothing to fail against. Writing and running it first gives that proof for free, with no extra machinery (no stashing, no throwaway branches) because at that point in the workflow no production edit exists yet.

## Intention Learning (step 2)

Before treating anything in the current code as correct, write down — in your own head or in the analysis you carry into the next step — what the code is *supposed* to do, using only:

- the issue/bug description as told to you,
- the analyzer's (`om-root-cause`) description of the bug and the intended fix.

This is the **Semantic Oracle**: a plain statement of expected behavior derived from intent, not from output. The failure mode this guards against is subtle — an LLM asked to write a test against code it has just read as "the implementation" tends to assert what that code *does*, including its bug, rather than what it *should* do (the "misguidance effect"). Reading the buggy code to locate it is unavoidable and fine; the discipline is in *what grounds the assertion* — the issue text and root-cause brief, never "here's what the function currently returns."

If the analyzer's brief already includes a proposed test snippet, treat it as a first draft input to this step, not as the oracle itself — still restate the expected behavior from the issue text and still put the snippet through the fail-first verification below before trusting it.

## Draft the Red test, verify it fails (step 3)

1. Write the regression test from the Semantic Oracle. Do not touch production code yet.
2. Run the test now, against the unmodified code. It **must fail**.
3. If it passes: it is not exercising the bug. Discard it and rewrite — either the assertion is too loose, or it accidentally tests a code path the bug doesn't reach. Repeat until the test genuinely fails on the unmodified code.
4. If the test's outcome is not consistent across repeated runs (fails sometimes, passes other times, with no code change in between): treat it as unreliable, not as a successful "fails without." Rewrite it — flakiness here means the test is coupled to something other than the bug (timing, shared state, unseeded randomness), and an unreliable oracle is as useless as a false pass.

**No fixed retry limit.** Rewrite as many times as it takes; use judgment rather than a step counter. If, after real effort, the test still cannot be made to fail on the described bug — the bug doesn't reproduce in this environment, or the analyzer's root cause is itself wrong — stop and end the skill's output with `Status: blocked` and a one-line reason (e.g. "could not reproduce the described bug in a test — root cause may be wrong or environment-dependent"), exactly as the skill body already does for a missing or contradictory brief. This is a judgment call, not a mechanical cutoff.

## Make the minimal change (step 4)

Unchanged from the fix step's usual scope discipline (skill body step 4: edit only what the analyzer named, no unrelated refactors). The only difference from before is *when* this happens: after step 3 has already proven the test fails, not before.

## Verify Green (step 5)

Rerun the exact same test written in step 3, unmodified, against the now-fixed code. It **must pass**.

- If it still fails: the *fix* is incomplete or wrong, not the test — the test was already proven in step 3 to correctly target the described bug. Iterate on the fix, not the assertions, then rerun.
- Once it passes, continue into the skill body's existing full validation-gate loop as before.

## Reporting

The skill's `Tests:` output line should say, in a sentence, that the regression test was verified to fail on the unmodified code and pass on the fixed code — not just that a test was added. This is what lets `om-open-pr` and a human reviewer tell a differential-verified test apart from a rubber-stamp one without re-deriving the bug themselves.
