#!/usr/bin/env node
// These documents are the executable agent protocol. Pin its recovery guards.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const recovery = read('skills/om-auto-merge-buddy/references/stalled-claims.md');
const buddy = read('skills/om-auto-merge-buddy/SKILL.md');
const scheduler = read('skills/om-auto-merge-buddy/references/scheduler.md');
const upgrades = read('UPGRADE_NOTES.md');

assert.match(buddy, /Sweep stalled claims[\s\S]*?references\/stalled-claims\.md/);
assert.match(scheduler, /At queue startup, apply `references\/stalled-claims\.md` before admission/);
assert.match(recovery, /every queue startup, including\nresumes and `--reset`/);
assert.match(recovery, /complete currently authorized open queue, not just local active rows/);
assert.match(recovery, /strictly more than 120 minutes without activity/);
for (const activity of ['heartbeat', 'claim/status edit', 'local stage activity', 'head push', 'review', 'PR comment', 'current-head CI activity']) {
  assert.ok(recovery.includes(activity), `activity clock includes ${activity}`);
}
assert.match(recovery, /Pending\/running\nCI, newer activity or incomplete activity reads defer recovery/);
assert.match(recovery, /unknown timestamp never counts as\nold/);
assert.match(recovery, /Exclude this sweep's own recheck\nlog writes/);
assert.match(recovery, /PID \*\*and process-start identity\*\*/);
assert.match(recovery, /every delegated worker, stage and unknown launch result has\nstopped/);
assert.match(recovery, /Only positive stopped\/dead proof permits automatic cleanup/);
assert.match(recovery, /remote owner without authoritative runtime access, missing reservation/);
assert.match(recovery, /Claims missing from local scheduling state are inspected and reported only/);
assert.match(upgrades, /without a matching reservation and authoritative owner\/delegate evidence are\nreported only, never automatically released/);

const steps = recovery.split('## Release once, then compete normally')[1].split('## Prevent recurrence')[0];
assert.match(steps, /scheduler transaction lock, re-read authorization/);
assert.match(steps, /same lock SHA\/run\/comment still owns the claim/);
assert.match(steps, /Any\n   change cancels this recovery/);
assert.match(steps, /cleanup checkpoint containing the old actor\/run\/comment\/lock SHA/);
assert.match(steps, /Mark that owner's claim released and call \*\*release-lock\*\* LAST with its\n   exact expected SHA and owner identity/);
assert.match(steps, /Never delete a ref unconditionally/);
assert.match(steps, /changed ref stops\n   cleanup; a successor is preserved/);
assert.ok(steps.indexOf('Mark that owner') < steps.indexOf('Verify the old claim is gone'), 'release precedes reservation cleanup and fresh competition');
assert.match(steps, /If any step fails, retain cleanup-pending\n   state and the original owner evidence for an idempotent retry/);
assert.match(steps, /preserve sibling rows/);
assert.match(steps, /preserve human assignees, foreign\n   claims, pending findings, attempt counts, evidence and unpublished worktrees/);
assert.match(steps, /Do not remove `automerge-blocked` or override a human veto/);
assert.match(steps, /cleanup itself grants no ownership\n   or CR\/QA\/CI signal/);
assert.match(recovery, /Do not\nintroduce automatically expiring locks/);
console.log('Stalled claims OK: startup routing, strict 120-minute inactivity, complete activity reads, stopped-owner/delegate proof, missing-state report-only policy, exact-generation release and preserved human gates.');
