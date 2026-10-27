# Design-tool provider contract (and scaffold template)

Design tools are reached the same way trackers and browsers are: through a
committed descriptor the repository owns. `design.provider` in
`.ai/agentic.config.json` selects `.ai/design-tools/<provider>.md`. The
repository's copy is authoritative; this skill ships no provider-specific
commands, so a team can back a descriptor with a plugin, an MCP server, a CLI,
or a documented export workflow without editing the skill.

When scaffolding, copy everything below the line into
`.ai/design-tools/<provider>.md`, replace the placeholders, and implement each
operation. An operation the tool cannot perform is written as
`unsupported` — never omitted.

---

# Design-tool provider: <name>

## Declarations

- **References accepted**: <URL host(s) and path shape, and/or an id pattern
  (regex)> — anything else is rejected before any call.
- **Access**: <how access is granted, without secrets in this file — for
  example an already-authenticated local plugin or connector>.

## Operations

### doctor

Confirm the provider is reachable with the current session's access. Output
exactly:

```text
DESIGN_PROVIDER=<name>
DESIGN_ACCESS=none|read|read-write
DESIGN_NOTES=<empty or concrete blocker>
```

### read-frame

Input: one validated reference to a file, page, or frame. Output: the frame
tree summarized per frame — component instances with their library and
component name (or `local` when detached or drawn by hand), fills and strokes
with the bound variable name or the raw value, text styles, spacing and
radius, layering, icons with their source, and visible states or variants.

### list-variables

Output: the library's variables and styles — name, collection or group, value
per mode or theme. This is what the contract's `designName` fields map to.

### screenshot

Input: one frame reference. Output: an image file path for evidence.

### create-frame (write, optional)

Input: an accepted brief. Output: the created frame's reference. Only with
`read-write` access and the user's confirmation of this exact operation.

### bind-variable (write, optional)

Input: a node reference and a variable name. Output: the node's new binding.
Same confirmation rule.

### swap-component (write, optional)

Input: a node reference and a library component name. Output: the new
instance reference. Same confirmation rule.
