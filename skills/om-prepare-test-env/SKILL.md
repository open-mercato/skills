---
name: om-prepare-test-env
description: Prepare a reusable, technology-agnostic environment for running and testing the app locally — discover the repo's own ephemeral/test environment and reuse it, or (when asked for a disposable environment and none exists) generate Docker/testcontainers-style bring-up scripts for whatever backing services the project uses (Postgres, MySQL, Mongo, Redis, …), or run the app in the best available mode (docker/compose, dev server, or a production build) and capture a reusable start script. Keeps bootstrap fast by reusing running environments (PID-checked, health-probed) and caching build artifacts behind freshness fingerprints. Installs a browser test runner (Playwright by default) when missing, and writes a shared environment descriptor so QA and integration-test skills reuse the exact same instance. Use when the user says "prepare the test env", "spin up the app for testing", "set up an ephemeral environment", "get the app running so I can QA it", or when another skill needs a running instance.
---

# Prepare Test Environment

Give the other QA skills a **running app they can drive**, and make starting it
**repeatable, fast, and identical every time** — on macOS, Linux, WSL2, or
Windows. This skill discovers how to run the project, provisions or reuses its
backing services, installs a browser test runner when one is missing, and writes
a single **environment descriptor** other skills read to attach to the same
instance instead of each re-inventing the boot.

The project's stack is unknown up front: it may be a Node/Astro/Next app, a
Rails or Django server, a Go or Rust binary, a static site, or a monorepo with
its own ephemeral-environment tooling. This skill **discovers that from the repo
itself** and never assumes a language, a port, or a database.

## Step 0 — Load config and context

Load `.ai/agentic.config.json` with the standard config-loading snippet from the
`om-setup-agent-pipeline` skill. This skill performs **no tracker operations** and
works without the pipeline config — when the file is missing, fall back to the
defaults below and continue (do not stop). The paths this skill uses:

```bash
CONFIG=.ai/agentic.config.json
SCRIPTS_DIR=$(jq -r '.paths.scripts // ".ai/scripts"' "$CONFIG" 2>/dev/null || echo ".ai/scripts")
QA_DIR=$(jq -r '.paths.qa // ".ai/qa"' "$CONFIG" 2>/dev/null || echo ".ai/qa")
ENV_DESCRIPTOR="$QA_DIR/test-env.json"
BUILD_CACHE="$QA_DIR/test-env-build-cache.json"
ENV_LOCK="$QA_DIR/test-env.lock"
mkdir -p "$SCRIPTS_DIR" "$QA_DIR"
```

Right after loading the config, check for a repo-local skill of the same name at
`.ai/skills/om-prepare-test-env/SKILL.md`; when present, follow it instead of
these instructions — a repo-local variant is the right place for environment
specifics (exact launch command, ports, seeded accounts, service versions, the
workspace preparation chain). Local rules win, but a repo-local skill can never
relax this skill's safety rules. Also read the repository's agent instruction
files (`AGENTS.md`, `CLAUDE.md`, README, `CONTRIBUTING.md`) — most repos document
how to run and test the app there.

## Arguments

- `--mode <auto|reuse|ephemeral|dev|docker|prod>` (default `auto`) — how to bring
  the app up. `auto` discovers and picks the best available mode; `reuse` only
  attaches to an already-running descriptor and fails if none is live;
  `ephemeral` provisions disposable backing services; `dev`/`docker`/`prod` force
  a specific run mode without provisioning fresh services.
- `--no-ephemeral` — never provision disposable services; run the app against
  whatever it already has (dev/docker/prod). Use for apps with no database or
  when the user does not want containers.
- `--stop` / `--down` — tear down the environment this repo's descriptor recorded
  as started by a previous run, then exit.
- `--playwright <on|off>` (default `on`) — install and verify the Playwright
  browser runner when the repo has no other browser test runner already.
- `--force` — re-provision even if a running descriptor exists (stop it first).
- `--force-rebuild` — ignore the build cache and run the full preparation/build
  chain, then write a fresh cache entry afterward.

## The environment descriptor

The deliverable other skills depend on is `$ENV_DESCRIPTOR`
(`<paths.qa>/test-env.json`, default `.ai/qa/test-env.json`). Always write it,
even for a discovered environment, so the QA and integration-test skills
(`om-integration-tests` and any repo-local verify skills) attach to the same
instance:

```json
{
  "version": 1,
  "runId": "<short id, e.g. date+random>",
  "status": "running",
  "mode": "discovered | ephemeral | dev | docker | prod",
  "baseUrl": "http://127.0.0.1:<port>",
  "startedByThisRepo": true,
  "startScript": ".ai/scripts/test-env-up.sh",
  "stopScript": ".ai/scripts/test-env-down.sh",
  "app": { "startCommand": "<command>", "port": 4321, "healthPath": "/", "pid": 12345 },
  "services": [
    { "type": "postgres", "host": "127.0.0.1", "port": 55432, "container": "<name>", "url": "postgres://…", "env": { "DATABASE_URL": "…" } }
  ],
  "credentials": [ { "role": "admin", "username": "<demo>", "password": "<demo>" } ],
  "playwright": { "runner": "playwright", "installed": true, "config": ".ai/qa/playwright.config.ts", "browsers": ["chromium"] },
  "platform": "linux | darwin | wsl2 | win32",
  "startedAt": "<ISO-8601 UTC>",
  "notes": "<anything a consumer must know: how the app is torn down, seeded data, gotchas, the working preparation chain>"
}
```

Never put real secrets, production credentials, or tokens in the descriptor —
only disposable/demo values. The descriptor is committed-adjacent working state,
not a secret store.

## Workflow

### 1. Detect the platform (cross-OS)

Record the platform so generated scripts and the descriptor stay portable:

```bash
UNAME=$(uname -s 2>/dev/null || echo unknown)
case "$UNAME" in
  Linux*)  grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null && PLATFORM=wsl2 || PLATFORM=linux ;;
  Darwin*) PLATFORM=darwin ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM=win32 ;;
  *) PLATFORM=unknown ;;
esac
```

Portability rules for everything this skill generates:

- Prefer **Docker / Docker Compose** for services — it behaves identically across
  all four platforms and is the closest cross-platform equivalent of a
  testcontainers workflow.
- Write the primary scripts as POSIX `sh` (runs on macOS, Linux, WSL2, and Git
  Bash / WSL on Windows). When the repo clearly targets native Windows shells,
  also emit a `.ps1` mirror.
- Never hardcode a host path separator, a fixed port that might be taken, or a
  `localhost` the container network cannot reach — bind services to `127.0.0.1`
  and pick a free port (below).

### 2. Reuse a running environment first

If `$ENV_DESCRIPTOR` exists and reports `"status":"running"`, reuse the recorded
environment **only when all of these validation checks pass** — a state file is a
claim, not proof:

1. **The owning process is alive.** Check the recorded PID with a zero-signal
   probe (`kill -0 <pid>`). A dead owner means the descriptor is a leftover.
2. **It actually responds.** Probe with bounded timeouts at increasing depth:
   the app shell loads (`healthPath`), the API answers (an unauthenticated
   endpoint when the app has one), and — when credentials are recorded — one
   authenticated round trip succeeds. The deeper probes are what catch an app
   that serves static pages but has lost its database.
3. **It is fresh.** The environment's age (`now - startedAt`) is within a TTL
   (default ~10 minutes; make it overridable via an env var such as
   `TEST_ENV_CACHE_TTL_SECONDS`), **and** no tracked source file was modified
   after `startedAt` (`find <src dirs> -newer <marker>` or an mtime comparison).
   An environment running stale code must be rebuilt, not reused.

When every check passes, print the `baseUrl` and stop here unless `--force` was
passed — this boot-once/attach-many path is what makes repeated QA runs fast.
When any check fails, treat the environment as stale: clear the descriptor and
continue to provision a fresh one. When the repo's own test-env tooling already
implements reuse (its own state file, reuse flags, cache TTL), **use its
mechanism and honor its flags** instead of duplicating it.

### 3. Discover the repo's own environment

Before generating anything, look for an environment the project already ships —
it exists precisely so tests get a clean instance, and reusing it is always
better than inventing one. Search, in order:

1. **A scripted ephemeral/test environment** — a package script, `Makefile`
   target, or task named like `test:*:ephemeral`, `test-env`, `e2e:setup`,
   `dev:test`, `db:test`, or an "app up for tests" command. Check `package.json`
   scripts, `Makefile`, `Taskfile.yml`, `justfile`, and CI workflows
   (`.github/workflows/*`) — prefer whatever CI actually runs.
2. **Container orchestration** — `docker-compose*.yml`, `compose*.yml`, a
   `Dockerfile`, `.devcontainer/`, or Helm/k8s manifests. A compose file with the
   app plus its services is often a one-command environment already.
3. **A repo-local run/dev skill** or documented run command in the agent
   instructions / README.

When a usable environment is discovered, prefer it: run its own up-command,
resolve the `baseUrl` it exposes, and record `mode: "discovered"` in the
descriptor with the exact command in `notes` so teardown and future reuse are
unambiguous. Do **not** generate competing scripts when the repo already has a
working one.

### 4. Decide the mode

Pick the run mode from the arguments and what step 3 found:

- `--mode reuse` and no live descriptor → stop and report that nothing is running.
- A **discovered ephemeral/test environment** exists → use it (step 3).
- `--mode ephemeral` (or `auto` + the app needs a database and none is discovered)
  → **generate** a disposable environment (step 6).
- `--no-ephemeral`, or `auto` + the app needs no backing services (static site,
  stateless server) → **run the app directly** in the best available mode (step 7).

When `auto` is ambiguous — e.g. the app has a database but also a plain dev
server, and the user has not said whether they want disposable services — ask the
user once with `AskUserQuestion` (ephemeral vs. run-against-existing), then record
the choice. Do not provision containers the user did not ask for.

### 5. Prepare the workspace (fresh checkouts and worktrees)

A discovered ephemeral/test command almost always assumes a **fully prepared
workspace**: dependencies installed, code generation run, workspace packages
built. A fresh clone, a fresh worktree, or a PR-head checkout has none of that,
and launching the env command straight away fails on missing build outputs or
missing generated files — one avoidable failure per skipped prerequisite.

Before starting any environment in a workspace that has not run before:

1. **Discover the preparation chain** from the repo itself — package scripts,
   `Makefile`, CI workflow steps (CI runs the chain in the right order every
   day). The usual shape is: install dependencies → run code generation → build
   workspace packages/app, with **codegen before builds** whenever builds consume
   generated artifacts.
2. **Run the chain in that order**, then start the environment.
3. If the env command still fails on a missing artifact, that is the signal you
   skipped or mis-ordered a prerequisite — fix the chain, re-run, and **record
   the corrected chain** (see Self-improvement below) in the descriptor `notes`,
   the generated start script, and the repo-local skill.

State is **per checkout**: descriptors, locks, and build caches describe the
workspace they live in. A worktree does not inherit the main checkout's build
outputs — expect the full preparation chain on a worktree's first boot; the
build cache makes every subsequent boot cheap.

### 6. Generate a disposable (ephemeral) environment

Only when a disposable environment is wanted and the repo has none. The goal is a
**testcontainers-style** setup: fresh, isolated backing services on free ports,
wired into the app, disposable on teardown, reproducible from committed scripts.

**6a. Detect the backing services.** Infer what the app needs from evidence, not
assumption: `docker-compose*.yml` service images; ORM/driver config and
dependencies (a Postgres/MySQL/Mongo/Redis client in the manifest); connection
env vars in `.env.example`/`.env.sample` (`DATABASE_URL`, `MONGO_URL`,
`REDIS_URL`, …); migration folders; and the agent instructions. Produce a
concrete service list with an image and default port per service (e.g.
`postgres:16`, `mysql:8`, `mongo:7`, `redis:7`). When you cannot tell, ask the
user rather than guessing a database the app does not use.

**6b. Pick free ports** so parallel runs and an already-installed local database
never collide:

```bash
free_port() { python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()'; }
```

Give the reusable environment a **stable preferred port** when it is available
(so the descriptor and probes stay predictable across runs), and fall back to an
isolated free port when the preferred one is taken or reuse was declined.

**6c. Generate the bring-up script** at `$SCRIPTS_DIR/test-env-up.sh` (plus a
`.ps1` mirror on native Windows). It must, idempotently:

- Start each detected service as a disposable Docker container bound to
  `127.0.0.1:<freeport>` with a throwaway name/volume (prefer `--rm` and a
  tmpfs/anonymous volume so no state leaks between runs). Use official images and
  the versions the repo pins when it pins any.
- Wait for each service to accept connections (poll the port / run the client's
  ping) before continuing — never race the app ahead of its database.
- Export the connection env the app expects (`DATABASE_URL` etc.) pointing at the
  chosen host/port, matching the variable names discovered in 6a.
- Run the project's schema setup against the fresh service — its migrate/seed/init
  command as discovered in the repo (never hand-write SQL when the repo has a
  migration tool).
- Start the app (step 7's launch command) against those services and resolve the
  `baseUrl`.
- Write `$ENV_DESCRIPTOR` with every service (type/host/port/container/env), the
  app port, and demo credentials the init step created.

**6d. Generate the teardown script** at `$SCRIPTS_DIR/test-env-down.sh` (+ `.ps1`)
that stops the app process and removes exactly the containers/volumes the up
script created (scope by the throwaway names), then marks the descriptor
`"status":"stopped"`. Teardown must be safe to run twice and must never touch a
container it did not create.

Keep the scripts committed-friendly and parameterized (ports and image tags as
variables at the top). They are the durable artifact — after this run, anyone (or
any skill) starts the exact same environment with one command.

### 7. Run the app (no-ephemeral / dev / docker / prod)

Establish the launch command from the repo, in this order of preference, and
capture it into `$SCRIPTS_DIR/app-run.sh` (+ `.ps1`) as a reusable launcher:

1. **Docker / Compose** — when a Dockerfile or compose file builds a runnable app
   image, prefer it for parity with production. Build once, run detached, resolve
   the published port.
2. **Dev server** — the repo's dev script (e.g. an `astro dev` / framework dev
   command). Fast startup; best for iterative QA.
3. **Production build** — when neither a container nor a dev server fits, run the
   repo's build, then its start/serve command against the build output.

Rules:

- Never invent a port. Read it from the framework config, the dev-server output,
  the Dockerfile `EXPOSE`, or the compose `ports`. Resolve the real bound port and
  put it in the descriptor's `baseUrl`.
- Start the app in the background and **wait for it to be healthy** (poll the base
  URL until it returns) before declaring the environment ready — record the PID so
  teardown can stop it.
- Use the repo's own package manager / build tool as implied by its lockfile
  (npm/pnpm/bun for a JS lockfile, and the equivalent for other stacks); skip the
  install step when the project needs none. Install dependencies once inside the
  launcher so first-run and reruns behave identically.
- Capture the resolved launch command, port, and health path into the descriptor
  and into `app-run.sh` so the next run is a single command.

### 8. Ensure a browser test runner (Playwright by default)

The QA and integration-test skills drive a real browser, so make one available
unless `--playwright off`:

1. If the repo already has a browser test runner (`playwright.config.*`,
   `cypress.config.*`, `wdio.conf.*`, or an equivalent), use it as-is and record
   which one in the descriptor — do not install a second one.
2. Otherwise install Playwright and its browsers with the repo's package manager,
   then verify the binary runs (`npx playwright --version`) and at least one
   browser is present (`npx playwright install --with-deps chromium`, falling back
   to `npx playwright install chromium` when system deps cannot be installed).
   Write a minimal shared config at `$QA_DIR/playwright.config.ts` that reads the
   base URL from the environment (`process.env.BASE_URL`) so tests and ad-hoc
   specs point at whatever this skill booted — timeouts and retries live in this
   shared config, never in individual specs.
3. On a host where browsers cannot be installed, do not fail the whole run:
   record `playwright.installed: false` with the blocker in `notes`, so consumers
   can still run API-level checks and report the browser limitation honestly.

Record the runner, config path, and installed browsers in the descriptor.

### 9. Finalize and report

- Health-check the `baseUrl` one last time and set the descriptor `status`.
- Print a concise summary: mode chosen, `baseUrl`, services with their ports,
  whether this run started the env, the generated scripts, and the browser runner
  state. Point consumers at `$ENV_DESCRIPTOR`.
- Leave the environment **running** by default so the very next QA/test run
  reuses it. Only tear down when `--stop`/`--down` was passed, or when the caller
  explicitly asked for a start-then-stop check.

### Teardown mode (`--stop` / `--down`)

Read `$ENV_DESCRIPTOR`; if `startedByThisRepo` is true, run `stopScript`
(generated) or the discovered environment's own down-command, then mark the
descriptor `"status":"stopped"`. Never tear down an environment this repo did not
start (a developer's own long-running dev server), and never remove containers or
volumes outside the scoped names the up script created.

## Build cache — skip work that has not changed

Compiling, code generation, and package builds are the most expensive bootstrap
steps. Record every successful preparation/build in `$BUILD_CACHE`
(`<paths.qa>/test-env-build-cache.json`):

```json
{
  "builtAt": "<ISO-8601 UTC>",
  "sourceFingerprint": "<hash over tracked inputs>",
  "environmentFingerprint": "<hash over build-shaping env vars>",
  "artifactPaths": ["<build outputs that must exist>"],
  "projectRoot": "<absolute path of this checkout>"
}
```

Skip the preparation/build chain only when **all** of these hold; otherwise
rebuild:

- The entry is within the TTL (same TTL as environment reuse).
- The **source fingerprint** matches: a hash over tracked build inputs (source
  dirs, lockfile, build configs) using each file's `path:size:mtime` — cheap, no
  file reads. Ignore dependency, output, VCS, and cache directories
  (`node_modules`, `dist`, `.git`, `.cache`, `coverage`, dot-dirs, and their
  equivalents in the repo's stack).
- The **environment fingerprint** matches: the values of env vars that shape the
  build output (mode flags, feature toggles). A build made under different flags
  is a different build.
- Every listed artifact still exists and is non-empty.
- `projectRoot` matches this checkout — a worktree or moved checkout never
  inherits another checkout's cache entry.

Bias toward rebuilding: any unreadable, mismatched, or ambiguous cache state
means a full rebuild — a fast bootstrap is never worth testing stale artifacts.
The cache covers preparation and build only; database provisioning, migration,
and seeding still run fresh per environment.

## Locks — one bootstrap at a time, PID-checked

Concurrent runs (parallel agents, a human and an agent) must not build over each
other or double-provision. Guard bootstrap with a directory lock at `$ENV_LOCK` —
`mkdir` is atomic — holding owner metadata:

- **Acquire**: `mkdir "$ENV_LOCK"`, then write `owner.json` with
  `{pid, source, acquiredAt}` inside it.
- **Occupied**: read `owner.json`. Owner PID dead (`kill -0` fails) → the lock is
  stale: remove it and retake. Metadata unreadable and the lock older than the
  wait timeout → remove it. Owner alive → poll-wait (bounded, ~5 minutes), then
  re-check `$ENV_DESCRIPTOR` — the other process has likely produced an
  environment you can now reuse.
- **Release**: always, including on failure paths.

When the environment serves from shared workspace artifacts (an in-repo build
output), keep holding the lock for the environment's whole lifetime so a second
bootstrap cannot rebuild artifacts out from under the running app — a second
caller must reuse or wait, never build in parallel.

## Self-improvement — record every bootstrap lesson

When bootstrap fails for a reason these instructions did not anticipate — a
missing prerequisite, a wrong order, an undocumented flag, a service the repo
needs that discovery missed — fix it, verify the fix by booting successfully,
and then **durably record the lesson** so the next run cannot repeat the
mistake:

1. Append the exact working command chain (and the failure it prevents) to the
   repo-local skill at `.ai/skills/om-prepare-test-env/SKILL.md` — create it if
   missing as an extension of this skill (see Step 0).
2. Bake the fix into the generated scripts (`test-env-up.sh` / `app-run.sh`) so
   the scripted path is correct even without the skill.
3. Note it in the descriptor's `notes` for consumers attaching to this env.

A failure you fixed but did not record is a failure you scheduled for the next
run.

## Rules

- Discover how to run and test the app from the repo itself (scripts, compose,
  Dockerfile, agent instructions, CI) — never assume a language, port, database,
  or start command.
- Always reuse a healthy running environment before provisioning a new one — but
  validate reuse with PID liveness, real readiness probes, and freshness checks;
  a descriptor alone is not proof of a running environment.
- In a fresh checkout or worktree, run the repo's preparation chain (install →
  codegen → build, as the repo's scripts and CI imply) before starting any
  discovered environment command.
- Maintain the build cache and skip preparation/build only when every validity
  check passes; when in doubt, rebuild.
- Guard bootstrap with the PID-checked directory lock and release it on every
  exit path; never run two bootstraps concurrently in one checkout.
- Prefer the repo's own ephemeral/test environment when it has one — including
  its own reuse/caching flags — and generate scripts only when it does not and a
  disposable environment is wanted.
- Generated environments are disposable and isolated: fresh services on free
  ports bound to `127.0.0.1`, throwaway volumes, reproducible from committed
  scripts, safe to tear down twice.
- Everything generated must work on macOS, Linux, WSL2, and Windows: POSIX `sh`
  primary (+ `.ps1` mirror for native Windows), Docker for services, no hardcoded
  ports or paths.
- Always write `$ENV_DESCRIPTOR` (even for a discovered env) so the QA and
  integration-test skills attach to the same instance.
- Install a browser test runner when missing (Playwright by default); when
  browsers cannot be installed, record the blocker instead of faking readiness.
- Wait for services and the app to be healthy before declaring the environment
  ready; record PIDs/containers so teardown is exact.
- When a bootstrap failure teaches you a prerequisite, record it (repo-local
  skill, generated scripts, descriptor notes) before finishing — self-improve on
  every mistake.
- Never store real secrets or production credentials in the descriptor or
  scripts — disposable/demo values only.
- Only tear down what this repo started; never touch a developer's own running
  services.
