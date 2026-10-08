# Codebase discovery for an AGENTS.md

What `om-create-agents-md` step 3 reads before drafting. The goal is a short
fact sheet for the target scope; every rule in the draft must trace to an entry
in it. Read only the target scope plus what it depends on — do not survey the
whole repo for a scoped file.

## Fact sheet

| Fact | Where to find it | Becomes |
|---|---|---|
| Name and job of the target | manifest name/description, README, entry point | title and the one-line directive |
| Real scripts / targets | the target's manifest scripts, `Makefile`/`justfile`/task-runner files, CI workflow steps that run it | `Validation Commands` (scoped first); checklist verification steps |
| Package manager / toolchain | lockfiles and manifests present (detected, never assumed) | the exact command prefix in every command |
| Code-generation or registration steps | scripts named like generate/codegen/register, generated-file headers, build hooks | a mandatory checklist step; a `Never edit generated files` rule |
| Directory layout | the tree two levels deep, excluding vendored, build, and dependency dirs | `Structure`; "When to modify" tables |
| Entry points and public surfaces | exports, route/handler registration, CLI definitions, published events, schema/migrations | `Always` rules on how to extend them; `Ask First` items for contract changes |
| Conventions the code follows | 3–5 representative files per kind: naming, error handling, data access, dependency injection, validation library, logging | `Always` MUST rules (only conventions that hold across the samples) |
| Repeated file kinds | files with the same shape (handlers, workers, components, migrations) | task checklists; "When you need / Copy from" table with the cleanest example |
| Persisted entities | models, schema files, migrations | Data Model Constraints |
| Environment and config | env-var reads, config schemas, `.env.example` (never real `.env` values) | "When to configure" table |
| Tests | test dirs, test naming, scoped test filters the runner supports | test command with a path filter; checklist verification |
| Dangerous operations | deploy, migrate, publish, seed, destructive scripts | `Ask First` or `Never` items; never in `Validation Commands` |
| Related instruction files | parent and sibling `AGENTS.md`/`CLAUDE.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `knowledge.sources` files | cross-references; rules already owned elsewhere (point, do not copy) |

## Discipline

- **Conventions need evidence.** A convention seen in one file is an
  observation; one that holds across the sampled files is a rule. When samples
  disagree, do not pick a winner — raise it as a step-5 question.
- **Commands must resolve.** Record each command with where it is defined
  (script key, make target, workflow step). No definition → not a command.
- **`BACKWARD_COMPATIBILITY.md` feeds `Ask First`.** Any protected surface it
  lists that lives in the target scope becomes an `Ask before changing …` item.
- **Existing rules win over inference.** A rule already written in an existing
  `AGENTS.md` or `CODE_REVIEW.md` is kept (or pointed to) even when the code
  sample does not show it; a contradiction between written rule and code is
  reported in the handover as drift, not silently resolved.
- **Secrets stay out.** Read `.env.example`-style templates for variable
  names only; never open real secret files, and never quote a value that
  looks like a credential.
