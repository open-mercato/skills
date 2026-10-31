#!/usr/bin/env node
import { prepare, cleanup } from './lib/skill-eval/storage.mjs';
import { run, importNative } from './lib/skill-eval/runner.mjs';
import { report } from './lib/skill-eval/report.mjs';

const usage = `Usage:
  node scripts/skill-eval.mjs prepare --config FILE --out NEW_DIRECTORY
  node scripts/skill-eval.mjs run --out DIRECTORY [--execute] [--retry-failed]
  node scripts/skill-eval.mjs report --out DIRECTORY [--assessments FILE]
  node scripts/skill-eval.mjs import --out DIRECTORY --session FILE --pair ID --variant baseline|candidate --model NAME --effort high --cohort PILOT [--artifact FILE]
  node scripts/skill-eval.mjs cleanup --out DIRECTORY

Run defaults to a dry plan. Cleanup removes only owned frozen inputs/worktrees,
retaining trial evidence and reports. Native import reads only the supplied file.
See docs/skill-evaluation/README.md for the versioned configuration contract.`;

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === 'help') { console.log(usage); return; }
  const allowed = { prepare: ['config', 'out'], run: ['out', 'execute', 'retry-failed'], report: ['out', 'assessments'],
    import: ['out', 'session', 'pair', 'variant', 'model', 'effort', 'cohort', 'artifact'], cleanup: ['out'] }[command];
  if (!allowed) throw new Error(`Unknown command: ${command}`);
  const options = {};
  while (args.length) {
    const flag = args.shift();
    if (!flag.startsWith('--') || !allowed.includes(flag.slice(2))) throw new Error(`Unknown argument: ${flag}`);
    const key = flag.slice(2);
    if (key in options) throw new Error(`Duplicate argument: ${flag}`);
    if (['execute', 'retry-failed'].includes(key)) options[key] = true;
    else {
      const value = args.shift();
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
      options[key] = value;
    }
  }
  const required = { prepare: ['out', 'config'], run: ['out'], report: ['out'],
    import: ['out', 'session', 'pair', 'variant', 'model', 'effort', 'cohort'], cleanup: ['out'] }[command];
  for (const key of required) if (!options[key]) throw new Error(`Missing --${key}`);
  let result;
  if (command === 'prepare') {
    const manifest = await prepare(options.config, options.out);
    result = { runId: manifest.runId, pairs: manifest.config.models.length * manifest.cases.length * manifest.config.repetitions, prepared: true };
  }
  if (command === 'run') {
    result = await run(options.out, { execute: options.execute, retryFailed: options['retry-failed'] });
    if (result.failed || result.cancelled) process.exitCode = 1;
  }
  if (command === 'report') result = await report(options.out, { assessmentsFile: options.assessments });
  if (command === 'import') result = await importNative(options.out, { session: options.session, pairId: options.pair,
    variant: options.variant, model: options.model, effort: options.effort, cohort: options.cohort, artifactFile: options.artifact });
  if (command === 'cleanup') { await cleanup(options.out); result = { cleanedInputs: true, retainedEvidence: true }; }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error(`skill-eval: ${error.message}`); process.exitCode = 1; });
