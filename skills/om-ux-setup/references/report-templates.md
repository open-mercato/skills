# Design-contract handover

Help the user decide whether the extracted contract is fit to commit. Report
effect, evidence, and gaps without repeating the extraction process.

```markdown
📝 `om-ux-setup` {created/refreshed} `.uxproof/`: {what UI work can now use these repository rules}.
Detected {stack}; {N tokens, N colors}; {N components} from {source roots}.
Screen patterns: {archetype → linked canonical example for every detected shape}.
{When relevant: manual decisions saved, generated changes on refresh, or source-hygiene warning/remedy.}
Next: review and commit {contract links}, then {one useful next invocation}.
```

Use an archetype/example table when long. Counts come from the extractor, never
estimates; retain a canonical file for every shape. On refresh, report generated
changes. Explain unanswered manual decisions only when they affect contract use.

With no declared tokens, say `{N} colors proposed from existing code; these are
suggestions, not enforced tokens.` State the next action once: choose and declare
tokens, then refresh. Distinguish detected conventions, team rules, and proposals.
