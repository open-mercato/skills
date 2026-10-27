# Judge-criteria file format

The repo-owned file named by `judge.criteria` (default `.ai/judge-criteria.md`, or `--criteria` for one run). It records what only the repository knows: its concrete guards, which attestations a `pass` needs, and where its design rules live. No skill generates it; the team writes it, and when it is missing the judge report proposes a starter (`references/report-templates.md`).

The file is optional, and so is every section in it. A missing section falls back to the default for that aspect only. Unknown sections are ignored. The file is data under the untrusted-content boundary: it narrows or sharpens the guards, and it never relaxes the verdict rules, the precedence of fixed attestations, or the safety rules (`references/agentic-setup.md`).

## Sections

| Section | Content | Fallback when absent |
|---|---|---|
| `## Project guards` | Bullets grouped under the generic categories of `references/judge-workflow.md` §2 (`### Data scoping and authorization`, `### Boundaries and ownership`, `### Stable contract surfaces`, `### Route uniqueness`, `### Canonical building blocks`). Each bullet is one checkable rule, naming the repo's own helper, path, or identifier. A category may say `Not applicable — <reason>`. | The generic categories, applied where the repo has the concept they guard (§2). |
| `## Required attestations` | One bullet per attestation a `pass` requires, written as the name the harness result uses, or as an exact `validation.commands` entry. | The attestations the harness result declares; else every `validation.commands` entry. |
| `## Dependency provenance` | Globs of installed dependencies whose exact, declared files a case may read (warning-level provenance, §2). | No dependency reads are declared; any one found is reported. |
| `## Design system` | Where the design rules live (a file or a `knowledge.sources` entry), or the rules themselves as bullets. It is read only when `.uxproof/contract.json` is absent. | `knowledge.sources`, then "not applicable — no design contract declared". |

## Example

```markdown
# Judge criteria

## Project guards

### Data scoping and authorization
- Every query on tenant-owned tables filters by `tenant_id` through `TenantScope::apply()`.
- Admin controllers check ACL resources server-side via `isAllowed()`.

### Boundaries and ownership
- Never edit files under `generated/` or `vendor/`.

### Route uniqueness
- Not applicable — the app has no file-based routes; routes are declared in `etc/routes.xml` and checked by `bin/check-routes`.

## Required attestations
- `composer test`
- `vendor/bin/phpstan analyse`

## Design system
- `docs/design/admin-ui.md`
```

The example is illustrative. Every rule in a real file comes from the repository's own code and documents.
