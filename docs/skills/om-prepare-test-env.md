# om-prepare-test-env

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Prepares a reusable, technology-agnostic environment that other QA and integration-test skills can drive. It works like a compiler: the expensive first run discovers how the project boots, then generates cross-platform launch/teardown scripts (POSIX `.sh` or PowerShell `.ps1`) with reuse checks, build caching, and health waits baked in — every later run just executes the saved script and reports. It also provisions the configured browser provider and writes a shared `test-env.json` descriptor that UI and integration-test skills attach to. Use it to get a fast, repeatable local app instance before running tests or QA.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--mode <auto\|reuse\|ephemeral\|dev\|docker\|prod>` | Optional (default `auto`) | How to bring the app up; only consulted during generation. `reuse` only attaches to an already-running descriptor and fails if none is live. |
| `--no-ephemeral` | Optional | Never provision disposable services (generation-time choice). |
| `--stop` / `--down` | Optional | Run the teardown script for the environment this repo started, then exit. |
| `--browser <on\|off>` | Optional (default `on`) | Ensure the configured browser provider during generation. |
| `--browser-provider <name>` | Optional | Override `browser.provider` for this generation; matching `.ai/browsers/<name>.md` must exist. |
| `--playwright <on\|off>` | Optional | Compatibility alias; `on` selects the Playwright provider, `off` behaves like `--browser off`. |
| `--force` | Optional | Restart even if a healthy environment is already running (passed to the entrypoint script). |
| `--force-rebuild` | Optional | Ignore the build cache and run the full prepare/build chain (passed to the entrypoint script). |
| `--regenerate` | Optional | Discard the saved entrypoint scripts and re-run discovery/generation; use after the run recipe changes. |

## Works with

Emits the shared environment descriptor `.ai/qa/test-env.json` (base URL, services, start scripts) that consumer skills such as [om-integration-tests](om-integration-tests.md) and the auto QA flow attach to, plus the generated up/down scripts under `.ai/scripts`. It provisions the browser provider defined by the pipeline set up in [om-setup-agent-pipeline](om-setup-agent-pipeline.md).

---
*Source: [`skills/om-prepare-test-env/SKILL.md`](../../skills/om-prepare-test-env/SKILL.md)*
