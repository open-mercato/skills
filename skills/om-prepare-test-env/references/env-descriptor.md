# Environment descriptor

Full schema and rules for `$ENV_DESCRIPTOR` (`<paths.qa>/test-env.json`) — the
deliverable other skills depend on. Loaded from the `om-prepare-test-env` body
(Phase 1 reads `baseUrl` from it; the generated script writes it on every
successful run per the entrypoint contract).

The deliverable other skills depend on is `$ENV_DESCRIPTOR`
(`<paths.qa>/test-env.json`). The **generated script** writes it on every
successful run, so consumers (`om-auto-verify-pr-ui`, `om-integration-tests`)
always attach to the same instance:

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
  "browser": {
    "provider": "agent-browser",
    "installed": true,
    "command": "<absolute cached command path or repository runner command>",
    "version": "<version>",
    "descriptor": ".ai/browsers/agent-browser.md",
    "notes": ""
  },
  "testRunner": { "name": "playwright | cypress | wdio | other | none", "config": "<path or empty>" },
  "platform": "linux | darwin | wsl2 | win32",
  "startedAt": "<ISO-8601 UTC>",
  "notes": "<anything a consumer must know: teardown, seeded data, gotchas, the working preparation chain>"
}
```

`startScript`/`stopScript` record the paths of the scripts **actually
generated** — the `.ps1` paths when the entrypoint is the PowerShell flavor —
and `platform` records where the environment was booted (`win32` covers both
native PowerShell and Git Bash; the script extension disambiguates). Consumers
read `baseUrl` and `services` and never need to care about the flavor.

`browser` is the provider-neutral automation contract. New writers always emit
it. `playwright` is a legacy compatibility object: emit it as well when the
selected provider is Playwright, and preserve it when repairing an older
descriptor. Its shape remains `{ "runner": "playwright", "installed": true,
"config": "<path>", "browsers": ["chromium"] }`. Consumers resolve the provider in this order: `browser.provider`,
then a present `playwright.runner`, then the config's `browser.provider`, then
legacy Playwright. `testRunner` describes the repository's committed E2E suite;
it is independent of the agent-driven browser provider.

Never put real secrets, production credentials, or tokens in the descriptor —
only disposable/demo values. The descriptor is committed-adjacent working state,
not a secret store.
