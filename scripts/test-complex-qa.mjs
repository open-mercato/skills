import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const reference = read('skills/om-auto-qa-pr/references/complex-mode.md')
const code = reference.match(/```javascript\n([\s\S]*?)\n```/)[1]
const verdict = runInNewContext(`${code}\ncomplexQaVerdict`)
for (const mode of ['standalone', 'orchestrated']) {
  for (const missing of ['second actor', 'permission check']) {
    assert.equal(verdict([{result:'PASS'}, {name:missing,result:'not exercised',reason:'account unavailable'}]), 'PARTIAL', `${mode}: ${missing}`)
  }
  assert.equal(verdict([{result:'PASS'}, {result:'PASS'}]), 'PASS', `${mode}: fully exercised`)
  assert.equal(verdict([{result:'PASS'}, {result:'FAIL'}]), 'FAIL')
  assert.equal(verdict([{result:'PASS'}, {applicable:false,reason:'single language product'}]), 'PASS')
  assert.equal(verdict([]), 'PARTIAL')
}
assert.match(reference, /PARTIAL cannot grant `selfqa=eligible`, `qa-approved` or `qa-self-verified`/)
const skill = read('skills/om-auto-qa-pr/SKILL.md')
assert.match(skill, /Use complex depth unless `--basic` is explicit/)
assert.match(skill, /Load `references\/complex-mode.md` before scoping/)
assert.match(skill, /reject both depth flags together/)
assert.match(read('skills/om-auto-qa-pr/references/orchestrated-mode.md'), /Complex depth is the default under `--orchestrated`/)
console.log('Complex QA defaults and required-step verdict regressions passed.')
