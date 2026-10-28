# Test plan template

Detailed template and checklist for step 3 of `om-qa-buddy`. **Hard rule: no
clicking, no browser session until this file exists** — going by feel
produces incomplete coverage and a report nobody can defend later.

## `$ARTIFACTS_DIR/test-plan.md` — required sections

```markdown
# Test Plan — {target}

**Target:** {PR/issue link, or branch name}
**Branch:** `{branch}`
**Build:** {commit short SHA}
**Date:** {YYYY-MM-DD}

## Scope
In scope:
- {feature / module / flow, from the plain-language brief}

Out of scope:
- {feature} — {reason}

## Risk areas
| Hotspot (from knowledge base, if any) | Concrete risk | How it's probed |
|---|---|---|
| {theme} | {what could break} | {test case or technique} |

## Exit criteria
All Critical/High cases pass. No open Critical/High defects.

## Environment
- URL: {base URL from the test-env descriptor}
- Role/login: {role used, from the descriptor's credentials}

## Case inventory
| ID | Title | Type | Priority | Status |
|---|---|---|---|---|
| TC-{MODULE}-001 | ... | Functional | Critical | Not run |

---

## Cases

### TC-{MODULE}-001 — {Title}
**Type:** Functional / Regression / Negative / Smoke / ...
**Priority:** Critical / High / Medium / Low
**Preconditions:** {exact state required beforehand}
**Test data:** {exact values, never "valid input"}

**Steps:**
1. ...
2. ...

**Expected:** {precise, observable outcome}
**Actual:** (filled in during execution)
**Status:** ✅ Pass / ❌ Fail / ⚠️ Blocked
**Screenshot:** `step-NN-<slug>.png`
```

## Cross-cutting checklist — walk these every session, add a case for whichever applies

- **Access-boundary isolation** — if the product scopes data to an
  account/tenant/organization, a user from one scope must never read,
  update, or delete a record owned by another — by direct ID, and never via
  a list/search endpoint either.
- **Permission boundaries** — a user without a given permission gets a
  clear denial from the API and does not see the corresponding
  link/button/page in the UI.
- **Custom or configurable fields**, when the product has them — add via
  admin UI → appears on create, persists, shows on detail, is
  searchable/filterable, survives an update.
- **Localization**, when the product ships more than one locale — switching
  locale changes every user-visible string; watch for a raw translation key
  displayed verbatim, or a new feature that shipped in one language only.
- **Soft delete vs. hard delete**, when the product has one — deleting
  removes a record from the default list; re-creating with the same
  business key as a soft-deleted record does not falsely conflict.
- **Live/cross-tab updates**, when the product pushes real-time state — an
  action in one session should reflect in another without a manual refresh.
- **Boundary values and hostile input** (part of the exploratory pass in
  step 5, but plan for it here): empty input, max length + 1, special
  characters, injection-style strings.
- **Workflow interruption** (also exploratory): back button after submit,
  double-click submit, refresh mid-process, the same page open twice.

## Case structure and priority definitions

```
ID:            TC-[MODULE]-[NNN]
Title:         [Action] + [Expected outcome]
Priority:      Critical / High / Medium / Low
Type:          Functional / Regression / Smoke / Negative / Security
Preconditions: System state required BEFORE the test
Test Data:     Exact values (never "enter valid data")
Steps:         Numbered, one action per step
Expected:      Precise, observable, verifiable outcome
```

| Priority | Definition |
|---|---|
| Critical | Crash, data loss, security breach |
| High | Core business function broken, no workaround |
| Medium | Feature partially broken, workaround exists |
| Low | Cosmetic, minor UX, edge case |

Anti-patterns to avoid: vague preconditions ("user is logged in" — say which
role, which scope), multiple actions per step, subjective expected results
("page loads correctly" — state the exact behavior), generic test data ("a
valid email" — give the literal string).

## Coverage sanity-check before moving to execution

- Every acceptance criterion has at least one case.
- At least one Smoke, one Negative, and (when the change touches a shared
  module) one Regression case.
- Every matched risk-hotspot theme has a probing case.
- A scoped-data change → an access-boundary isolation case exists.
- A newly guarded endpoint/UI surface → a permission case exists.
