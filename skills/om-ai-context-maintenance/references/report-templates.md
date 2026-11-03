# Maintenance report

Use this after preview or rotation in `om-ai-context-maintenance`; omit empty optional detail.

```text
`om-ai-context-maintenance` {archived N runs | previewed N eligible runs} in {run root}.
Kept dates on or after {UTC cutoff} unpacked under the {N}-day policy.
Retained {N}; skipped {N} for {active/uncertain/excluded/collision reasons}.
Archives: {paths, or a concise list with a local report link when long}.
{Errors and recovery action, when relevant.}
Status: {complete | preview | partial | blocked}
```

Summarize reasons without copying run contents. State whether originals were
removed and archive verification passed; a preview never claims either. On any
failed item, use `partial` (or `blocked` if nothing could run), preserve the
per-item error, and give the concrete recovery action. This local maintenance
skill emits no PR/issue/spec chaining lines and posts no tracker comments.
