# om-share-this-session

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Shares one coding-agent session publicly so the maintainers of a harness can learn from it. The bundle holds the complete sanitized session export, a ZIP of exactly the files this session created or changed, a manifest with hashes, and a privacy report. Everything is prepared locally by a bundled, dependency-free script that redacts secrets, personal data, home paths, and identifiers, and that never touches the network. You then review every turn and file yourself. Nothing leaves your machine until you type an exact acknowledgement that names the share and the destination repository. It then publishes the artifacts to a temporary branch in a public repository and files a feedback issue. If filing the issue fails, it rolls the branch back.

You choose the destination: `--issue-repo` / `--storage-repo`, or `sessionShare.issueRepo` / `sessionShare.storageRepo` in the config. When neither is set, the skill asks you. It never falls back to a default. The skill is off by default: it runs only in a repository whose committed config sets `sessionShare.enabled: true`. A confidential repository needs no setting to stay safe.

## Parameters

- `{share-name}` — a public, non-personal kebab-case slug.
- `--session <path>` — the native JSON export of the active session. For Codex, the skill can export the active thread itself through a local helper.
- `--files-manifest <path>` — the files this session created or changed.
- `--project-root <path>` — the root for those paths. Defaults to the current repository.
- `--issue-repo <owner/name>` — the repository that receives the feedback issue.
- `--storage-repo <owner/name>` — the public repository that holds the temporary branch.

## Works with

Maintainers can judge the published bundle with [om-judge-agent-session](om-judge-agent-session.md). Publication uses the tracker operations `publish-session-share` and `delete-session-share`. When your installed GitHub descriptor does not define them, the skill uses its own bundled fallback.

---
*Source: [`skills/om-share-this-session/SKILL.md`](../../skills/om-share-this-session/SKILL.md)*
