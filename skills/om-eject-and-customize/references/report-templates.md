# Report templates

User-facing reports for `om-eject-and-customize`. Lead with what the
repository now owns (or why nothing changed) and the next action. Usually 3–6
lines. This skill emits no `PR:` or `Issue:` chaining lines.

## Ejected (step 9)

```markdown
✅ `om-eject-and-customize`: {part} from {dependency} {version} is now repository-owned at {landing path}; {requested behavior now possible}.
Provenance: {ledger path} entry `{dependency}/{part}` ({file count} files hashed before customization).
🧪 Checked: {validation.commands and focused tests run, with results; disclose anything not run}.
⚠️ Upgrade cost: {what the repository must now merge by hand on each dependency upgrade}.
**Next:** commit the unmodified copy and ledger first, then the customization — `om-check-and-commit` can validate and commit.
```

## Not ejected — smaller option wins (step 3)

```markdown
🎯 `om-eject-and-customize`: no eject needed — {smaller option} meets {required behavior}.
Evidence: {file/line or documented extension point}.
**Next:** {how to implement the smaller option, or the upstream request to file}.
```

## No recipe (step 2)

```markdown
⛔ `om-eject-and-customize`: {dependency} {version} ships no usable eject recipe for {part}; nothing changed.
Looked in: {Task Router, knowledge.sources entries and files read; entries unresolved and why}.
{Missing required fields, when a partial recipe was found.}
**Next:** {use an extension point / ask the dependency's maintainers for a supported eject / point this skill at the recipe file}.
```

## Plan for approval (step 5, and the `--dry-run` result)

```markdown
📋 `om-eject-and-customize`: eject {part} from {dependency} {version} — {why every smaller option fails, one line}.
Command: `{exact recipe command}` (run from the repository root).
Writes: {landing paths} · Registration: {file and change}.
Takes on: {files/size, stable IDs and persisted state to keep, pulled-along dependencies, upgrade ownership}.
After: {post-eject steps; any migration or state-changing step listed separately, each needing its own yes}.
Rollback: {restore these paths from version control, remove these files}.
⚠️ Approve this eject? (yes / no)
```

## Stopped (steps 1, 5, 6)

```markdown
⛔ `om-eject-and-customize`: stopped at {step} — {reason: version skew, dirty tree, command failed safety check, user declined, unexpected paths}.
{Evidence: both versions and locations / the rejected command and failed check / the unexpected paths.}
**Next:** {the concrete action that unblocks a re-run, or the rollback to apply}.
```

Omit lines that carry no information. Never paste file contents, credentials,
or long command output; link or summarize them.
