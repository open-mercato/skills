---
project: fixture-depth
phase: 3-synthesizing
coverage_categories:
  - error-path
---

# Gap Analysis — Fixture Depth

## Epic 3: Invoicing

#### Coverage
- error-path: Story 3.1

### Story 3.1: Manual KSeF e-invoice export
- **Description**: as an accountant, I export invoices to KSeF manually
- **Acceptance criteria**:
  - [ ] an invoice can be exported to KSeF on demand
- **Status**: done

#### Gap analysis
- **Verdict**: ❌ Missing
- **Upstream pipeline**: companion PR #29 (open)

### Story 3.2: Invoice number formatting
- **Description**: as an accountant, exported invoice numbers are formatted correctly
- **Acceptance criteria**:
  - [ ] numbers follow the configured format
- **Status**: done

#### Gap analysis
- **Verdict**: ❌ Missing
- **Upstream pipeline**: PR #15 (open)
