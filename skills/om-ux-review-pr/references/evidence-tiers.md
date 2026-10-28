# Evidence tiers

Every claim in a recommendation carries a tag naming the strongest tier it
honestly supports. The tag is part of the contract with the reader: it tells
them how hard to push back.

1. `[PRODUCT]` — this repository's own design contract (`.uxproof/`), its
   analytics, or a documented team decision, including confirmed brief/spec
   decisions and accepted prototype behavior. Cite the exact rule or decision
   and its acceptance source.
2. `[STANDARD]` — WCAG, platform guidelines, or a regulation. Name which one
   (for example WCAG 2.4.7, or the DSA for consent patterns).
3. `[PLATFORM]` — default framework or operating-system behavior users
   already expect.
4. `[RESEARCH]` — published usability research. Name the source.
5. `[HEURISTIC]` — a recognized heuristic. Name which one.
6. `[ASSUMPTION]` — reviewer judgment. Allowed, but labeled and falsifiable.

Rules:

- Never dress an `[ASSUMPTION]` as a `[STANDARD]`. Inflating a tier to win an
  argument destroys the value of every other tag in the report.
- A review whose findings are mostly assumptions must say so in its summary,
  so the author knows how much of it is taste.
- Without `.uxproof/`, state that the visual contract is unavailable on the
  Contract line. Confirmed brief/spec/prototype decisions can still support
  `[PRODUCT]` findings about the accepted behavior. A neutral discovery prototype
  does not establish visual fidelity requirements, and unconfirmed assumptions
  never qualify as product rules. When no applicable product source exists,
  tier 1 is unavailable for that claim.
