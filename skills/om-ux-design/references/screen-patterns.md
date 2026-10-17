# Screen anatomy reference

Use this in the portable mode of `om-ux-design`; the consuming repository's
`.ai/skills/om-ux-design/references/screen-patterns.md` overrides this template.
It is a place to record observed patterns, not a prescribed backoffice layout.

For the selected flow, identify the closest real product screen or component
story. Record the source path and these facts where they affect the task:

- Shell and navigation: page width, content regions, entry/return navigation,
  whether the flow actually needs a sidebar or header.
- Content hierarchy: heading levels, primary task, reading width, spacing and
  density, with long-content examples.
- Forms: field groups, labels, help/errors, action order, validation and recovery.
- Lists/details: relevant metadata, selection/actions, empty/no-results handling,
  pagination or scrolling when needed.
- Overlays: dialog/drawer size, focus behavior, dismissal and narrow-screen layout.
- Responsive/theme differences: supported breakpoints and themes, wrapping,
  overflow and controls that stay usable by keyboard and touch.

Use the actual component names and variants. Preserve repository conventions
over this list. Do not invent universal button heights, sidebar widths, title
weights or destructive-action styles. The bundled CSS includes starter classes
for common screens; use only what fits the selected product and adapt the rest.

For portable HTML, document fidelity limitations such as represented component
behavior or local icons. For a native runtime, import real components and follow
its existing icon and translation conventions. Avoid unnecessary source-level
implementation notes in visible product UI; keep them in the review context.
