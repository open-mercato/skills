# Portable token generation

Read this before using `om-ux-design`'s portable helpers. Native runtimes use
their own source styles and component themes.

## Source selection

1. `.uxproof/tokens.json` when present.
2. An explicitly configured `designTokens` in `.ai/agentic.config.json`.
3. The conventional `.ai/ds/ds-tokens.json` snapshot when present.
4. `references/ds-tokens.default.json` bundled with the skill.

`designTokens` defaults to unset, without a setup question. A selected source
that is malformed fails with its path; an explicitly configured missing file
is an error. Do not hide a broken source by choosing default colors. When both
`.uxproof/` and `designTokens` exist, `.uxproof/` wins under the detailed-design
contract. Report that choice and inspect relevant discrepancies between it and
the live styles. Do not change the extraction or claim the ignored file was used.

The generated CSS records the selected source. Regenerate or check drift with:

```bash
node <skill-base-dir>/scripts/sync-tokens.mjs <paths.prototypes>/<slug>
node <skill-base-dir>/scripts/sync-tokens.mjs --check <paths.prototypes>/<slug>
```

Do not hand-edit `tokens.css`. Inspect `theme.css` too: the portable starter's
identity overrides must be adapted or removed where they conflict with the
selected source. A successful sync checks token generation, not visual fidelity.

## Flat extraction format

An array of `{ name, value, kind, source, theme? }` records, matching the current
`.uxproof/` contract. `source` identifies the source file or `design`/`proposed`;
those labels are provenance, not evidence of owner acceptance. `theme` is
`light`, `dark` or `both`; omitted theme means a shared base. The adapter groups
by token name, emits base/light values under `:root` and dark values under `.dark`,
and rejects ambiguous conflicting records. An optional leading `--` in a name
is normalized. See the executable tests for edge cases and validation behavior.

## Snapshot format

A JSON object with a `tokens` object remains supported. Keys become custom
property names; values use `value` for a shared value or `light` and `dark` for
theme variants. `themeInvariant: true` keeps the light/shared value in `:root`.
Metadata such as `kind` does not change CSS emission. References expressed as
`var(--name)` must resolve without cycles; use actual CSS values for other alias
notations rather than assuming the helper translates a design-tool language.

Names and values are validated before emission. CSS escapes, declaration
boundaries and URL-bearing functions such as `url()` and `image-set()` are
rejected so token values cannot introduce CSS rules or network requests. Paths are
validated inside the consuming repository, including symbolic-link containment.

## Default assets

The bundled snapshot and CSS are a working example for portable prototypes,
not a repository's approved DS. Their theme controls and semantic tokens may
help establish a proposal when no design system exists. Adapt them to supplied
references, and record any missing tokens/represented component behavior in the
handoff. Never infer DS conformance or human acceptance from using the defaults.
