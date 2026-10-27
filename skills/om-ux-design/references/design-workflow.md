# From requirements to a finished flow

Use this at `om-ux-design` steps 1, 3 and 4. Scale the work to the selected task.

Read the source's outcome, scope, acceptance criteria and protected business
rules. Do not require a particular user-story heading if the same information
is already clear. If a critical rule is missing, ask one focused question and
continue independent work. A new intake document or approval round is unnecessary
when the user has already settled the scope.

Maintain a compact coverage map in the prototype's context or existing handoff:
requirement ID, user/role, entry point, screen/state, action, result/recovery and
screen link. Include only states relevant to those requirements. Treat loading,
empty/no-results, validation, denied access, request failure, retry, conflict and
long content as prompts to check applicability, not a requirement to invent them
for every screen. Separate review simulation controls from product navigation.

Choose a representative screen with the most important content and reusable
patterns. Render it before expanding the flow. Compare it with the provided
visual references and real component examples. Check:

- One clear primary task, with headings, actions and content ordered by that task.
- Type and spacing that make groups and relationships readable; useful reading
  widths, comfortable paragraphs and content that survives realistic extremes.
- Existing component variants, density, alignment and action ordering used
  consistently, with meaningful labels and concise recovery instructions.
- Responsive behavior at the widths the product supports, including wrapped
  actions, long labels, dialogs and scrollable content. Check supported themes
  through the product's own controls; do not invent a second theme as a ritual.
- Keyboard focus, labels, contrast and status communication that do not depend
  on color alone. Use the repository's accessibility standards.

Then extend the same decisions across the rest of the flow. Use consistent
fictional data across detail/edit/confirmation screens. Preserve submitted values
when a request fails; retain return destinations and back-navigation context.
Implement the important transitions in local demo state. Label unavailable
behavior in review notes instead of presenting a dead control as functional.

Keep visible copy in the product's current language and voice. Use specific
labels and factual explanations. Remove filler, generic promises and template
placeholders before handoff. Adopt the repository's writing skill when available.
The portable starter's example shell and copy do not constrain the final product.
