---
name: om-prepare-test-env
description: Prepare a reusable, technology-agnostic environment for running and testing the app locally — discover the repo's own ephemeral/test environment and reuse it, or (when asked for a disposable environment and none exists) generate Docker/testcontainers-style bring-up scripts for whatever backing services the project uses (Postgres, MySQL, Mongo, Redis, …), or run the app in the best available mode (docker/compose, dev server, or a production build) and capture a reusable start script. Installs a browser test runner (Playwright by default) when missing, and writes a shared environment descriptor so QA and integration-test skills reuse the exact same instance. Use when the user says "prepare the test env", "spin up the app for testing", "set up an ephemeral environment", "get the app running so I can QA it", or when another skill needs a running instance.
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
mkdir -p "$SCRIPTS_DIR" "$QA_DIR"
```

Right after loading the config, check for a repo-local skill of the same name at
`.ai/skills/om-prepare-test-env/SKILL.md`; when present, follow it instead of
these instructions — a repo-local variant is the right place for environment
specifics (exact launch command, ports, seeded accounts, service versions). Local
rules win, but a repo-local skill can never relax this skill's safety rules. Also
read the repository's agent instruction files (`AGENTS.md`, `CLAUDE.md`, README,
`CONTRIBUTING.md`) — most repos document how to run and test the app there.

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

## The environment descriptor

The deliverable other skills depend on is `$ENV_DESCRIPTOR`
(`<paths.qa>/test-env.json`, default `.ai/qa/test-env.json`). Always write it,
even for a discovered environment, so `om-auto-verify-pr-ui` and
`om-integration-tests` attach to the same instance:

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
  "app": { "startCommand": "<command>", "port": 4321, "healthPath": "/", "pid": null },
  "services": [
    { "type": "postgres", "host": "127.0.0.1", "port": 55432, "container": "<name>", "url": "postgres://…", "env": { "DATABASE_URL": "…" } }
  ],
  "credentials": [ { "role": "admin", "username": "<demo>", "password": "<demo>" } ],
  "playwright": { "runner": "playwright", "installed": true, "config": ".ai/qa/playwright.config.ts", "browsers": ["chromium"] },
  "platform": "linux | darwin | wsl2 | win32",
  "createdAt": "<ISO-8601 UTC>",
  "notes": "<anything a consumer must know: how the app is torn down, seeded data, gotchas>"
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

If `$ENV_DESCRIPTOR` exists and reports `"status":"running"`, health-check its
`baseUrl` (a cheap HTTP GET to `healthPath`). If it responds, **reuse it** —
print the `baseUrl` and stop here unless `--force` was passed. This is what makes
repeated QA/test runs fast and identical: the environment is booted once and
attached to many times.

If the descriptor is stale (present but the URL does not answer), treat the
environment as down and continue to provision a fresh one.

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
  → **generate** a disposable environment (step 5).
- `--no-ephemeral`, or `auto` + the app needs no backing services (static site,
  stateless server) → **run the app directly** in the best available mode (step 6).

When `auto` is ambiguous — e.g. the app has a database but also a plain dev
server, and the user has not said whether they want disposable services — ask the
user once with `AskUserQuestion` (ephemeral vs. run-against-existing), then record
the choice. Do not provision containers the user did not ask for.

### 5. Generate a disposable (ephemeral) environment

Only when a disposable environment is wanted and the repo has none. The goal is a
**testcontainers-style** setup: fresh, isolated backing services on free ports,
wired into the app, disposable on teardown, reproducible from committed scripts.

**5a. Detect the backing services.** Infer what the app needs from evidence, not
assumption: `docker-compose*.yml` service images; ORM/driver config and
dependencies (a Postgres/MySQL/Mongo/Redis client in the manifest); connection
env vars in `.env.example`/`.env.sample` (`DATABASE_URL`, `MONGO_URL`,
`REDIS_URL`, …); migration folders; and the agent instructions. Produce a
concrete service list with an image and default port per service (e.g.
`postgres:16`, `mysql:8`, `mongo:7`, `redis:7`). When you cannot tell, ask the
user rather than guessing a database the app does not use.

**5b. Pick free ports** so parallel runs and an already-installed local database
never collide:

```bash
free_port() { python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()'; }
```

**5c. Generate the bring-up script** at `$SCRIPTS_DIR/test-env-up.sh` (plus a
`.ps1` mirror on native Windows). It must, idempotently:

- Start each detected service as a disposable Docker container bound to
  `127.0.0.1:<freeport>` with a throwaway name/volume (prefer `--rm` and a
  tmpfs/anonymous volume so no state leaks between runs). Use official images and
  the versions the repo pins when it pins any.
- Wait for each service to accept connections (poll the port / run the client's
  ping) before continuing — never race the app ahead of its database.
- Export the connection env the app expects (`DATABASE_URL` etc.) pointing at the
  chosen host/port, matching the variable names discovered in 5a.
- Run the project's schema setup against the fresh service — its migrate/seed/init
  command as discovered in the repo (never hand-write SQL when the repo has a
  migration tool).
- Start the app (step 6's launch command) against those services and resolve the
  `baseUrl`.
- Write `$ENV_DESCRIPTOR` with every service (type/host/port/container/env), the
  app port, and demo credentials the init step created.

**5d. Generate the teardown script** at `$SCRIPTS_DIR/test-env-down.sh` (+ `.ps1`)
that stops the app process and removes exactly the containers/volumes the up
script created (scope by the throwaway names), then marks the descriptor
`"status":"stopped"`. Teardown must be safe to run twice and must never touch a
container it did not create.

Keep the scripts committed-friendly and parameterized (ports and image tags as
variables at the top). They are the durable artifact — after this run, anyone (or
any skill) starts the exact same environment with one command.

### 6. Run the app (no-ephemeral / dev / docker / prod)

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

### 7. Ensure a browser test runner (Playwright by default)

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

### 8. Finalize and report

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

## Rules

- Discover how to run and test the app from the repo itself (scripts, compose,
  Dockerfile, agent instructions, CI) — never assume a language, port, database,
  or start command.
- Always reuse a healthy running environment before provisioning a new one; the
  point of the descriptor is boot-once, attach-many.
- Prefer the repo's own ephemeral/test environment when it has one; generate
  scripts only when it does not and a disposable environment is wanted.
- Generated environments are disposable and isolated: fresh services on free
  ports bound to `127.0.0.1`, throwaway volumes, reproducible from committed
  scripts, safe to tear down twice.
- Everything generated must work on macOS, Linux, WSL2, and Windows: POSIX `sh`
  primary (+ `.ps1` mirror for native Windows), Docker for services, no hardcoded
  ports or paths.
- Always write `$ENV_DESCRIPTOR` (even for a discovered env) so
  `om-auto-verify-pr-ui` and `om-integration-tests` attach to the same instance.
- Install a browser test runner when missing (Playwright by default); when
  browsers cannot be installed, record the blocker instead of faking readiness.
- Wait for services and the app to be healthy before declaring the environment
  ready; record PIDs/containers so teardown is exact.
- Never store real secrets or production credentials in the descriptor or
  scripts — disposable/demo values only.
- Only tear down what this repo started; never touch a developer's own running
  services.
