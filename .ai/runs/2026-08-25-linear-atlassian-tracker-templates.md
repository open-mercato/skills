# Linear and Atlassian tracker templates

## Overview

Add shipped split-tracker descriptors for Linear through `schpet/linear-cli` and Jira Cloud through Atlassian CLI (`acli`). Each descriptor will implement issue operations in its issue tracker and delegate pull requests, reviews, CI, repository identity, and PR label taxonomy to the companion GitHub descriptor.

### External References

- https://github.com/schpet/linear-cli — adopt the dedicated non-interactive issue, comment, label, authentication, and JSON-output commands; reject `linear issue pr` because PR mutations must remain behind the configured code-host descriptor.
- https://developer.atlassian.com/cloud/acli/guides/introduction/ — adopt Atlassian CLI authentication plus Jira work-item view/search/create/edit/assign/transition/comment commands; exclude Admin and Rovo Dev commands because they are outside tracker operations.

## Goal

Let `om-setup-agent-pipeline` install ready-to-customize `linear` and `atlassian` tracker descriptors with the same operation contract and safety guarantees as the shipped GitHub descriptor.

## Scope

- Add `linear.md` and `atlassian.md` under the setup skill's shipped tracker descriptors.
- Document authentication, identifier mapping, issue operations, label guards, claim signals, cross-project limits, and explicit delegation to GitHub for code-host operations.
- Update setup guidance, user-facing documentation, and the repository decision record to advertise the two shipped providers.

## Non-goals

- Implement pull requests or CI directly in Linear or Jira.
- Add a new config field or change the tracker operation contract.
- Install either external CLI automatically or store credentials.
- Change any standard cross-skill step file.

## Implementation Plan

### Phase 1: Provider descriptors

1. Add the Linear split-tracker descriptor with complete issue operations and explicit code-host delegation.
2. Add the Atlassian split-tracker descriptor with complete Jira work-item operations and explicit code-host delegation.

### Phase 2: Setup and documentation integration

1. Teach setup and its interview guidance that GitHub, Linear, and Atlassian are shipped provider choices.
2. Update repository documentation, decision history, and upgrade guidance for the new descriptors.

## Risks

- `schpet/linear-cli` is community-maintained and its flags may evolve; the descriptor pins its documented command surface and requires `auth-check` to verify the installed client.
- Atlassian CLI does not own repository PR/review/CI operations, so the template must fail loudly when the companion GitHub descriptor or CLI is unavailable.
- Linear and Jira identifiers do not auto-close issues from GitHub PR keywords; both templates must require an explicit issue transition after merge and preserve visible cross-links.
- Jira labels are free-form values rather than a separately provisioned taxonomy, so its issue-label guard validates non-empty input while PR taxonomy operations remain delegated to GitHub.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Provider descriptors

- [ ] 1.1 Add the Linear split-tracker descriptor with complete issue operations and explicit code-host delegation
- [ ] 1.2 Add the Atlassian split-tracker descriptor with complete Jira work-item operations and explicit code-host delegation

### Phase 2: Setup and documentation integration

- [ ] 2.1 Teach setup and its interview guidance that GitHub, Linear, and Atlassian are shipped provider choices
- [ ] 2.2 Update repository documentation, decision history, and upgrade guidance for the new descriptors
