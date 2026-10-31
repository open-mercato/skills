# Local React dashboard

Unless this invocation explicitly includes `--no-dashboard`, launch/reuse the
single shipped `scripts/dashboard.mjs` after resolving the primary working tree
and validating arguments, before processing the queue. `--dashboard-port` is an
optional integer port, default `5050`; reject invalid values before mutations,
never silently choose another port. Resolve the installed skill directory and
run its own file, not a repo-supplied script:

```text
node <installed-skill>/scripts/dashboard.mjs --ensure --root <primary-working-tree> --port <validated-port>
```

The helper prints its loopback URL and whether it reused an existing instance.
It persists beyond the skill invocation; do not kill it on ordinary run cleanup.
Reuse requires matching dashboard owner, version, source-build fingerprint and
exact primary-root fingerprint. An occupied foreign/different-root/older-build
port is a visible warning with the requested URL and reason; never kill a
stranger or pick an unrequested alternate port. Suggest an explicit different
port or `--no-dashboard`. Dashboard startup failure is observability failure,
not a review/QA/CI merge gate: log the warning and continue the authorized queue.
Explicit `--no-dashboard` skips startup **and all health/network probes**.

Record its URL (or startup warning) in `RUN.md`/`NOTIFY.md` and the existing
status summary; do not add a second comment. The dashboard exposes no mutation
API: it reads only the allowlisted queue and UTC-day merge journals under
`.ai/meta`, serves on `127.0.0.1`, strips private reservation/process details,
and renders safe PR/comment/evidence links. Missing files show an empty state;
malformed/racy/unreadable data shows a recoverable refresh error with the last
good data retained. It never treats the displayed snapshot as gate evidence.

The one file embeds pinned React 18.3.1 and ReactDOM production runtimes, their
MIT notices and the requested logo; it works offline with no runtime CDN,
package installation or application framework dependency. Branding was explicitly
requested for this visual tool; other skills remain product-agnostic. Visible
pages refresh every **5000 ms**, with no overlapping fetches, stale-day response
replacement or lost day/detail selection; show last update and refresh errors.

On each existing tracker queue refresh, checkpoint a compact optional `queue`
snapshot in the shared JSON: number/title/URL/status-comment URL/assignees and
`outcome: queued`. Keep focused plans/ownership in `activePrs`; snapshot rows
never grant claims/signals. Display active rows first, with active rows winning
repository/number duplicates. Top-level repository identity supplies omitted
row identities. Day selection shows processed merges with detail links.

Readiness statistics use recorded `firstStartedAt`, current-head/policy `readyAt`
and confirmed `mergedAt` (`references/scheduler.md`). Show live elapsed only for
known starts, and known count/denominator beside average/median readiness.
Missing historical timing is unknown, never fabricated from file times. Explain
that durations are wall-clock and include CI waits/pauses.

```javascript
function dashboardOptions({ noDashboard = false, port = '5050' } = {}) {
  if (typeof noDashboard !== 'boolean' || !/^[0-9]+$/.test(String(port))) throw new Error('Invalid dashboard arguments')
  const parsed = Number(port)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error('Invalid dashboard port')
  return { enabled: !noDashboard, port: parsed }
}
```
