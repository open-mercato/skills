# Skill-by-skill evaluation harness

## Problem and outcome
Instruction refactors need repeatable baseline/candidate comparisons. A shorter skill is not necessarily cheaper or more accurate. The same tool must evaluate another skill with new configuration and cases, without code changes.

## Configuration and contract
A versioned JSON experiment selects a skill name, a local Git collection with baseline/candidate immutable refs, model names, explicit reasoning effort, repetitions, concurrency and case definitions. Each case has an id, task, pinned local repository base/head, and a directory of frozen contextual inputs. PR metadata is optional case evidence, not a core assumption. Paths are resolved relative to configuration and validated before file or process operations. Use spawn argument arrays, never executable shell interpolation.

Provide prepare/run/report commands and a documented native-session import path. Preparation archives skill versions and creates disposable detached worktrees. A trial receives only its assigned skill collection, source tree, frozen evidence and task. CLI workers have fresh contexts and read-only sandbox tools. All outputs come through the CLI result stream or assigned output artifact; no external mutations, claim, labels, review submission, push, commits, installs or autofix are permitted. The controller never modifies the source checkout or global installed skills. Failed preparation must clean only resources owned by this run.

The generic result keeps the generated artifact text, optional verdict/findings, proposed actions, evidence and limitations. Case-specific criteria and reviewer adjudication remain separate from measured costs. Skill names, result fields, tracker operations and existing config contracts are unchanged.

## Measurements and reports
Measure actual input, cached input, output and available reasoning tokens. Never add reasoning to output twice. Missing usage stays unknown. Count completed tool invocations once across start/completion events, record failed/partial runs and elapsed time, and retain immutable revision/environment metadata. Native imports consume explicitly supplied session logs and extract only selected run metrics, never unrelated conversation content.

Export per-trial and paired aggregates as JSON, CSV and Markdown. Compare generated artifact word/byte counts, heuristic prose sentence lengths and semicolons, with side-by-side text. Support optional human/reference assessments and blinded artifacts. Do not equate more findings with higher quality, assign ungrounded recall, or infer prices. Report fixed-order/cache effects, backend differences, incomplete trials and one-sample limits. Keep raw logs local. Publication is a separate explicit action.

## Verification
Tests use disposable Git repositories and a fake CLI stream. Cover immutable refs, path/symlink escapes, argument safety, bounded output capture, output isolation, usage/cache accounting, start/completion deduplication, failure and descendant-tree cancellation on Unix and Windows, malformed output, paired summaries, text metrics, resume/input drift, and cleanup ownership. Run the repository validation gate. The live study uses six PRs, baseline then candidate, gpt-6.1-sol and gpt-6-luna at high reasoning. The initial native pilot remains a separately identified cohort if the execution backend changes.

## Migration & Backward Compatibility
Additive tooling only. No existing skill, config, tracker operation, pipeline, QA, release or install contract changes. No production dependencies.
