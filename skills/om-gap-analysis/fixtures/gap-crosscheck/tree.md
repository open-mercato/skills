---
project: fixture-crosscheck
phase: 2-verifying
coverage_categories:
  - error-path
---

# Gap Analysis — Fixture Crosscheck

## Epic 3: Invoicing

#### Coverage
- error-path: Story 3.2

### Story 3.1: Manual KSeF e-invoice export
- **Description**: as an accountant, I export invoices to KSeF manually
- **Acceptance criteria**:
  - [ ] an invoice can be exported to KSeF on demand
- **Status**: done

#### Gap analysis
- **Verdict**: ❌ Missing
- **Upstream pipeline**: none

### Story 3.2: Export failure is visible
- **Description**: as an accountant, I see a failed export with a reason
- **Acceptance criteria**:
  - [ ] a failed export shows an error state
- **Status**: done

#### Gap analysis
- **Verdict**: ❌ Missing
- **Upstream pipeline**: companion PR #77 (open)
