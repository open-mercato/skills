# om-auto-update-changelog

> 🤖 Autonomous — runs end-to-end without supervision

Drafts a `CHANGELOG.md` release entry covering every PR merged since the last release, using an emoji-driven, categorized format (Features, Fixes, Security, and so on). It credits the right contributor even for carried-forward fork PRs via the Supersede Credit Rule, leaves the Highlights paragraph blank for a human to fill, then hands the file edit to `om-auto-create-pr` so it lands as a normal docs PR. Use it at release time or at the end of a sprint; it is meant to be run by a maintainer, not on a schedule.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--version <x.y.z>` | Optional | Release heading version. Defaults to the manifest version; if that already matches the top heading, the skill asks which bump to use. |
| `--since <value>` | Optional | Lower bound for merged PRs — an ISO date, a git ref, or `last-release` (default), which resolves to the date in the topmost changelog heading. |
| `--date <YYYY-MM-DD>` | Optional | Date shown in the heading. Defaults to today. |
| `--dry-run` | Optional | Print the drafted entry to stdout only — do not edit `CHANGELOG.md` and do not invoke `om-auto-create-pr`. |
| `--slug <kebab-case>` | Optional | Override the slug passed to `om-auto-create-pr`. Defaults to `changelog-<version>`. |

## Works with

Consumes a window of merged PRs and delegates all PR mechanics to [om-auto-create-pr](om-auto-create-pr.md) (required — the run stops if it is missing), which opens the docs PR and emits the `PR:` chaining reference line this skill surfaces in its report. It pairs well with [om-close-fixed-issues](om-close-fixed-issues.md), which processes the same PR window but mutates the issue tracker instead.

---
*Source: [`skills/om-auto-update-changelog/SKILL.md`](../../skills/om-auto-update-changelog/SKILL.md)*
