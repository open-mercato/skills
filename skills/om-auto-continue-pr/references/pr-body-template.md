# PR body — the canonical explanation of the change

Write for someone deciding whether this change belongs in the codebase. Aim for
150–300 words; a simple fix can be shorter. Keep the consequence, evidence, and
material limits even when they need more space. Omit empty sections and `N/A`.
On later runs, refresh this explanation to match the final change instead of
appending a history of the work. Preserve human-authored text on adopted PRs.

Title: `<prefix>(<area>): <behavioral change>`; use the caller's title when given.

```markdown
Closes #{issueId}
Tracking plan: {plan path}
Source doc: {spec path}
Status: in-progress

## 🎯 What changes
{Who encounters the problem, what happens today, and what will happen after this
change. State the benefit or reason in 1–3 concrete sentences. For a fix, include
the causal mechanism here rather than repeating the symptom in another section.}

## 📋 Scope
{The primary area and any shared systems it changes, with their effects. Identify
current consumers or a dependency on future work when that matters to adoption.
Explain why a shared change belongs here; flag independently shippable work.}

## ⚠️ Decision needed
{Only if relevant: the unresolved direction call or assumption, recommended next
step and its tradeoff. Separate a product choice from a demonstrated rule violation;
name the rule and evidence for the latter.}

## 💥 Compatibility
{Only when relevant: public contracts, persistent data, defaults or dependencies
that will be costly to undo; affected consumers and migration/rollback limits.}

## 🧪 Validation
{What ran and what it proved, with results and links to review/UI evidence. Name
failed, skipped or pending checks and the remaining QA action. Link long logs and
reproduction detail; do not paste the command transcript.}

## 📋 Decisions touched                      <!-- conditional: product-brief.md exists -->
{One line per Non-goal, Business rule, or Decision id this change relies on or
supersedes: the id, its effect, and whether honoured or superseded. For a
supersede, include the replacement id and approving owner. When none are touched,
state “No recorded decision is affected.”}

## 📋 Progress
See the tracking plan.
```

- Include `Closes` only for an implementing PR with a subject issue; use
  `Refs #{issueId}` for a spec-only PR. Include `Source doc:` only with a spec.
- Keep `Tracking plan:` and `Status:` on their own undecorated lines whenever a
  plan exists. Set `Status: complete` only under the engine's completion gate.
  Omit both fields and Progress for a run with no plan.
- Support material claims with a code/doc/test reference near the claim. Label
  inference as inference, and unexamined behavior as not checked. An absent
  search hit supports only the search scope; it does not prove no consumers exist.
- Use a small Mermaid flow/dependency diagram only when it makes cross-system
  effects easier to understand. Label edges by behavior, distinguish existing,
  new and planned components, and add a one-sentence takeaway. A component count
  or file inventory alone is not a reason for a diagram.
- If external references changed a design decision, add their link and that
  decision beside the relevant claim; keep the full adopt/reject record in the plan.
- A draft describes proposed and completed work accurately. A spec PR describes
  the proposal and its consequences; it never claims the runtime behavior exists.

## Resume specifics

Keep the existing `Tracking plan:` / `Status:` lines and any `Source doc:` link.
Refresh agent-owned prose to describe the full current change; report only the
resume's delta in the summary comment. Preserve an adopted author's prose.
