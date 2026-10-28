# om-synthetic-users

> 🧑‍💻 Interactive — acts once, may ask questions, reports, and hands control back

Builds a panel of personas from the material the repository already holds (`product-brief.md`, a spec, interview notes, data), interviews them about the last time the problem happened and then under the pressures the brief describes (never "would you use"), and walks a named flow through their eyes — on the brief or spec as a narrative, on a static prototype through the browser provider, or on the running app booted through `om-prepare-test-env`. It runs the whole thing more than once with a fresh panel and reports only what repeats, with the spread across runs as the error bar; tracks saturation; and, when real interview notes exist, runs the same script on the panel and reports where synthetic and real diverge, because the deviation is the finding and the calibration loop. Three stances: `validate` on a real product or prototype, `simulate` when the client's users are not yet reachable (every answer is "to confirm"), `adversary` for the team's own idea (the persona looks for reasons not to switch, and a run that agrees is discarded). Everything it produces is tagged `[SYNTHETIC]`: a hypothesis generator, never evidence, never numbers, and never a way to satisfy the Definition of Ready.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{subject}` | Yes | Path to `product-brief.md`, a spec, or a static prototype; or `--app` for the running application. |
| `--flow "<name>"` | No | The flow to walk when the subject has several. |
| `--stance validate\|simulate\|adversary` | No | Persona behaviour; defaults from the brief's mode (`existing`, `client`, `own`). |
| `--panel <n>` | No | Personas per run, sampled fresh each run. Default `3`; each persona is a subagent run, so panel × runs is the cost. |
| `--hold-out <files>` | No | Real interview notes kept out of the persona material so the parity check scores the panel against notes it never saw. |
| `--runs <n>` | No | Independent runs with fresh panels. Default `2`; `3` for consequential decisions. |
| `--open` | No | Exploratory interviews with no flow: topics and saturation instead of barriers. |
| `--research <dir>` | No | Where personas, transcripts, calibration, and walkthrough reports are written. Default `${SPECS_DIR}/research`. |

Each invocation reserves a new session directory for its report, transcripts,
screenshots and persona snapshot. A brief panel and a prototype walk
on the same flow and day retain separate evidence; earlier reports stay readable.

## Works with

For screen walkthroughs, the main agent operates the browser and passes each observed state and screenshot to the current persona's isolated subagent. The persona returns its reaction and proposed next action; it has no browser or network access. The main agent executes only interactions within the skill's existing scope and reports inaccessible steps honestly.

Reads the brief [om-discover](om-discover.md) wrote and hands its hypotheses back through `om-discover --refresh`; [om-spec-writing](om-spec-writing.md) turns them into Open Questions; [om-ux-review-pr](om-ux-review-pr.md) reads `personas.md` when it enters screens as a user. Walks prototypes and the running app through the browser provider and [om-prepare-test-env](om-prepare-test-env.md); loads the design contract from [om-ux-setup](om-ux-setup.md) when present. The research it rests on is listed in its `references/research-basis.md`.

During discovery, the first panel reads the brief before [om-mockup-prototype](om-mockup-prototype.md) makes the flow clickable. A separately accepted screen walkthrough can then inspect that prototype. Both reports stay synthetic when [om-discover](om-discover.md) refreshes the brief.

---
*Source: [`skills/om-synthetic-users/SKILL.md`](../../skills/om-synthetic-users/SKILL.md)*
