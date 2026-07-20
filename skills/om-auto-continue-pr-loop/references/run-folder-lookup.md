# Locate the run folder (step 3)

Prefer the explicit `Tracking plan:` line in the PR body (written by `om-auto-create-pr-loop`): fetch the PR body via **get-pr** (field `body`) and take the first line matching `^Tracking (plan|run folder):` (e.g. pipe the body through `grep -E '^Tracking (plan|run folder):' | head -n1`).

Expected value (current format): `Tracking plan: ${RUNS_DIR}/<date>-<slug>/PLAN.md`.

Fallbacks, in order:

1. `Tracking run folder: ${RUNS_DIR}/<date>-<slug>/` — derive `PLAN_PATH` as `${folder}/PLAN.md`.
2. Legacy flat-file format: `Tracking plan: ${RUNS_DIR}/<date>-<slug>.md` — still honored for PRs opened before the folder migration. In this case there is no run folder yet; create one at `${RUNS_DIR}/<date>-<slug>/`, move the flat plan into it as `PLAN.md`, and initialize `HANDOFF.md` and `NOTIFY.md` as part of this resume's first commit.
3. Legacy `Tracking spec:` line (older runs) — treat the same way as the legacy flat-file format.
4. Diff the PR against `origin/$BASE_BRANCH` and look for a new path under `${RUNS_DIR}/` authored by this branch. If exactly one new plan exists (folder or flat file), use it.
5. Legacy fallback: if nothing under `${RUNS_DIR}/` is found, look for a new file under the repo's specs directory (`paths.specs`, default `.ai/specs`) for PRs created before the runs-folder migration. Migrate it into a new run folder as above.
6. If multiple candidates were found, stop and ask the user which one to resume.
7. If no tracking plan can be resolved, stop with a clear error. Do NOT invent a plan path.

Record the resolved paths:

```bash
RUN_DIR="${RUNS_DIR}/<date>-<slug>"
PLAN_PATH="${RUN_DIR}/PLAN.md"
HANDOFF_PATH="${RUN_DIR}/HANDOFF.md"
NOTIFY_PATH="${RUN_DIR}/NOTIFY.md"
# Verification is checkpoint-based: ${RUN_DIR}/checkpoint-<N>-checks.md every ~5 Steps.
# Optional artifacts (test logs, screenshots) live at ${RUN_DIR}/checkpoint-<N>-artifacts/.
# Final gate log lives at ${RUN_DIR}/final-gate-checks.md at spec completion.
```
