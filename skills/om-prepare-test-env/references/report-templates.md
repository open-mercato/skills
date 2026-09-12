# Environment report (steps 1 and 2.6)

The descriptor and scripts carry the environment contract. Report readiness,
how to use it, and limits without restating their schema. No chaining lines;
preserve generated scripts' machine-readable result lines unchanged.

## Successful run

Usually 3–6 lines:

```markdown
🧪 `om-prepare-test-env`: {reused/rebuilt/generated and verified} at {baseUrl}.
Ready: {probe result}; {duration}. {Generation only: cold Xs, warm Ys; warm reused.}
Descriptor: `{$ENV_DESCRIPTOR}`. Start/stop: `{native up command}` / `{native down command}`.
{When relevant: services/ports needed by the caller, browser limitation, or repair and verification.}
{When scripts changed: linked changes to review and commit.}
```

Name dependencies that affect access/readiness; do not give each healthy service
a sentence. Never print credentials. For repairs, name the failure prevented
and script rerun proving the fix without replaying debugging or history headers.

## Blocked or degraded run

State what is actually running, the failed command/probe, recorded fallback,
and what must change before retrying. App readiness and browser readiness are
separate claims. Failed cold/warm verification remains visible even when an
agent-driven fallback starts the app.

## Teardown

In one or two sentences, name what stopped and the descriptor's new status.
Report any environment left running because this repo did not start it.
