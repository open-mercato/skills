# Model adapter contract

This contract is loaded before probing, reviewing, or dispatching a worker.

## Command adapter

Use a command adapter for a locally installed CLI. Define commands as arrays,
never shell strings:

```json
{
  "adapter": "command",
  "family": "example-family",
  "model": "example-model",
  "roles": ["reviewer", "worker"],
  "timeoutMs": 600000,
  "workerSecurity": {
    "network": "disabled",
    "remoteWrites": "disabled",
    "refWrites": "disabled",
    "enforcedBy": "provider-sandbox"
  },
  "commands": {
    "probe": ["example-cli", "--version"],
    "review": ["example-cli", "review", "--model", "{model}", "{promptFile}"],
    "worker": ["example-cli", "run", "--model", "{model}", "{promptFile}"]
  }
}
```

Supported placeholders are `{model}`, `{promptFile}`, `{schemaFile}`,
`{worktree}`, and `{metadataFile}`. The runtime expands each placeholder as one
argument and launches the executable without a shell. It also supplies the
prompt on standard input.

A reviewer command must be read-only in the worktree. A worker command may edit
the worktree only through a runtime-recognized audited adapter. Version 1
recognizes only `codex-workspace-write-sandbox` and requires the exact safety
shape: `codex exec`, ignored user config and rules, ephemeral state,
one runtime-validated `model_reasoning_effort` override,
`--sandbox workspace-write`, `--cd {worktree}`, no extra writable directory,
no search, remote, profile, or other config override, and a prompt from standard
input. Other CLIs remain reviewer-only until the runtime adds and tests an
equivalent adapter. The runtime also strips credential-like environment
variables, disables Git protocols and credential helpers, snapshots refs and
reflogs around the invocation, and fails if either changes.

## Observed invocation metadata

A command adapter should write this trusted adapter metadata to
`{metadataFile}` or `OM_HARNESS_METADATA_FILE`:

```json
{
  "actualModel": "provider-observed-model",
  "provider": "provider-name",
  "fallbackReason": null
}
```

This file is separate from model-authored review JSON. When the adapter cannot
report observed metadata, the runtime leaves `actualModel` empty and marks
provenance unverified; it never copies the requested model into that field.

## OpenAI-compatible adapter

Use this adapter for review-only HTTP models:

```json
{
  "adapter": "openai-compatible",
  "family": "example-family",
  "model": "example-model",
  "roles": ["reviewer"],
  "endpoint": "https://provider.example/v1/chat/completions",
  "credentialEnv": "EXAMPLE_API_KEY",
  "timeoutMs": 600000
}
```

The endpoint and credential-variable name must come from trusted configuration.
The secret itself comes only from the named environment variable. HTTP adapters
cannot be workers because they do not have a safe workspace-editing channel.

## Built-in preset adapter

Use `adapter: "preset"` for the maintained jury bindings:

- `deepseek-api` — OpenAI-compatible DeepSeek review with environment or
  official OpenCode auth-store credentials;
- `kimi-subscription` — managed Kimi CLI review in an empty directory with a
  generated no-tools agent;
- `opencode-zen` — GLM or MiMo review through the OpenCode Zen chat endpoint,
  using environment or official OpenCode auth-store credentials.

Preset adapters are review-only and contain no publication or workspace tools.
Generic `command` and `openai-compatible` adapters remain the extension points
for models outside the bundled jury.

## Reviewer output

Return one JSON object matching `review-result.schema.json`. The runtime accepts
surrounding CLI noise only when it can unambiguously extract one valid object.
Malformed or empty output becomes an explicit failed reviewer status; it never
silently becomes a pass.

Every reviewer invocation is fresh and tool-free: it receives the installed
`om-code-review` skill, full built-in checklist, structured output contract,
one resolved review packet, and its assigned subject part. It never receives
the conductor or worker transcript, implementer rationale, proposed fixes, or
another reviewer's output. The runtime records `freshContext: true` and the
`om-code-review` rubric and packet hashes on each result.

Wrapper-level councils also require a completed fresh Claude artifact matching
`fresh-review-result.schema.json`. That artifact is created by the host outside
the provider adapter pool, validated before fan-out, and rendered in the same
matrix. It cannot satisfy provider quorum.

## Availability and fallback

Probe before the run. Record selected, completed, skipped, failed, and timed-out
states separately. Optional missing reviewers do not fail an advisory profile
or an otherwise achievable quorum. Never substitute another model silently.
When an invocation uses a fallback, record both requested and observed model
identifiers and the reason.
