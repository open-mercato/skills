# Setup report

Use after setup or refresh. Follow `references/rules.md`; report the result and
any remaining action, usually in 3–6 lines. This skill emits no chaining fields.

```markdown
✅ `om-setup-agent-pipeline` — {configured | refreshed | configured with gaps}.
{Files written and the consequential settings: tracker/browser and any companion code-host descriptor, QA gate, validation. Link the config.}
{Coverage passed, or missing skills with their install command and affected capability.}
{Next entry point for the user's task, or the unresolved operation/commit needed to use it.}
```

Use ⚠️ for gaps. Include detected-versus-chosen values when they need review;
the config holds the full settings. Report existing files left in place only
when that leaves a gap or explains why a requested change was not made. A custom
provider scaffold must name unfinished operations. For a split tracker, identify
the companion code-host descriptor and any missing dependency. Do not repeat a catalog of
all skills, docs, labels, and customization paths after successful setup.
