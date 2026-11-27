#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const capabilities = read('skills/om-setup-agent-pipeline/references/config-capabilities.md');
const line = capabilities.match(/HUMAN_QA_POLICY=\$\([\s\S]*?\)   # QA triage policy/)[0];
assert.ok(line, 'setup must load the QA policy');
const filter = line.match(/jq -ce? '([^']+)'/)[1];
const load = value => spawnSync('jq', ['-ce', filter], {
  input: JSON.stringify(value), encoding: 'utf8', timeout: 5000
});
const defaults = JSON.parse(load({}).stdout);
assert.equal(defaults.whenUnsure, 'human');
assert.equal(defaults.approvedDesign.source, 'merged-spec');
assert.equal(defaults.uiFileThreshold, 0);
assert.equal(defaults.batchCheckLabel, null);
assert.deepEqual(defaults.batchPaths, []);
assert.deepEqual(JSON.parse(load({humanQaPolicy:{}}).stdout), defaults);
assert.deepEqual(JSON.parse(load({humanQaPolicy:{approvedDesign:{}}}).stdout), defaults);
for (const policy of [false, null, [], 1, 'human',
  { paths: false }, { paths: null }, { uiPaths: [1] },
  { uiFileThreshold: -1 }, { uiFileThreshold: 0.5 }, { uiFileThreshold: null },
  { whenUnsure: false }, { whenUnsure: 'guess' }, { approvedDesign: [] }, { approvedDesign: false },
  { approvedDesign: { source: null } }, { approvedDesign: { source: 'body' } }, { approvedDesign: { label: false } },
  { humanVerdictLabels: false }, { trustedTriageAuthors: [''] },
  { batchCheckLabel: false }, { batchCheckLabel: '' }, { batchPaths: null }, { batchPaths: [1] },
  { whenUnsure: 'batch' }, { whenUnsure: 'batch', batchCheckLabel: null }]) {
  assert.notEqual(load({ humanQaPolicy: policy }).status, 0,
    'must reject malformed policy: ' + JSON.stringify(policy));
}
const custom = {
  paths: ['src/auth/**'], uiPaths: ['src/ui/**'], uiFileThreshold: 10,
  whenUnsure: 'auto', approvedDesign: { source: 'none', label: 'design-approved' },
  humanVerdictLabels: ['qa-human-approved'], trustedTriageAuthors: ['reviewer'],
  batchCheckLabel: 'qa-batch-check', batchPaths: ['src/portal/**']
};
assert.deepEqual(JSON.parse(load({ humanQaPolicy: custom }).stdout), custom);
const batchUnsure = { ...custom, whenUnsure: 'batch' };
assert.deepEqual(JSON.parse(load({ humanQaPolicy: batchUnsure }).stdout), batchUnsure);
assert.equal(JSON.parse(load({ humanQaPolicy: { approvedDesign: { label: null } } }).stdout)
  .approvedDesign.label, null);
for (const label of ['qa-approved', 'qa-failed', 'needs-qa', 'skip-qa']) {
  assert.notEqual(load({ humanQaPolicy: { batchCheckLabel: label } }).status, 0, 'must reject reserved batchCheckLabel ' + label);
}
assert.notEqual(load({ qaGateLabel: 'needs-human-qa', humanQaPolicy: { batchCheckLabel: 'needs-human-qa' } }).status, 0,
  'must reject batchCheckLabel equal to qaGateLabel');
assert.notEqual(load({ humanQaPolicy: { batchCheckLabel: 'qa-human-ok', humanVerdictLabels: ['qa-human-ok'] } }).status, 0,
  'must reject batchCheckLabel equal to a human verdict label');
assert.equal(load({ qaGateLabel: 'needs-human-qa', humanQaPolicy: { batchCheckLabel: 'qa-batch-check' } }).status, 0);
console.log('PASS: actual QA policy loader defaults, custom values, null label, and malformed inputs');

// The executable deliverable is prose: freeze safety boundaries at the consuming
// instructions, rather than testing a second implementation of the classifier.
const triage = read('skills/om-auto-review-pr/references/qa-triage.md');
assert.match(triage, /human verdict[^\n]*takes precedence/i);
assert.match(triage, /existing `needs-qa`[^\n]*auto lane/i);
assert.match(triage, /never exempts money or architecture/i);
assert.match(triage, /Reject collisions rather than granting approval/);
assert.match(triage, /TRIAGED[^\n]*not (?:an? )?review verdict/i);
assert.match(triage, /orchestrated[^.]*driver owns/i);
assert.match(triage, /Never blocks the merge/);
assert.match(triage, /Never remove `BATCH_CHECK_LABEL`/);
assert.match(triage, /When it is null \(the\s+default\) there is no batch lane/);
assert.match(triage, /3b\. \*\*Batch lane\*\* \(only when `BATCH_CHECK_LABEL` is set and no step 3\s+rule fired\)/);
const setup = read('skills/om-auto-review-pr/references/agentic-setup.md');
assert.match(setup, /humanQaPolicy/);
assert.match(setup, /before[^\n]*claim/i);
console.log('PASS: consumer loads policy before claim; label precedence and triage-only reporting are explicit');
