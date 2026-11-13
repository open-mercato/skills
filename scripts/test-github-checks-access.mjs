#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const read = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const shipped = read('skills/om-setup-agent-pipeline/references/trackers/github.md');
const section = shipped.split('#### get-pr-checks\n')[1].split('#### get-required-checks\n')[0];
assert.equal(read('.ai/trackers/github.md').split('#### get-pr-checks\n')[1].split('#### get-required-checks\n')[0],section);
const helper = section.match(/gh_get_pr_checks\(\) \(\n[\s\S]*?^\)/m)?.[0];
assert.ok(helper,'execute the shipped helper, not a test implementation');
const temp=mkdtempSync(join(tmpdir(),'github-checks-access-'));
const sha='a'.repeat(40);
const otherSha='b'.repeat(40);
try {
  writeFileSync(join(temp,'helper.sh'),'tracker_repo() { echo fixture/repo; }\n'+helper+'\ngh_get_pr_checks "$1"\n');
  writeFileSync(join(temp,'gh'),`#!/usr/bin/env python3
import os,sys,json
from pathlib import Path
a=sys.argv[1:];f=json.loads(Path(os.environ['CHECKS_FIXTURE']).read_text())
with open(os.environ['CHECKS_CALLS'],'a') as out: out.write(json.dumps(a)+'\\n')
if a[:2]==['pr','checks']:
 if f.get('normal') is not None: print(json.dumps(f['normal']))
 else: print(f.get('error','Resource not accessible by personal access token'),file=sys.stderr)
 sys.exit(f.get('exit',1))
path=next(x for x in a if x.startswith("repos/"))
if '/pulls/' in path:
 if f.get('metadataFailure'): sys.exit(1)
 if '--jq' in a: print(f.get('after',f['sha']))
 else: print(json.dumps({'head':{'sha':f['sha']},'html_url':'https://github.com/fixture/repo/pull/7'}))
elif '/actions/runs?' in path:
 assert 'head_sha='+f['sha'] in path
 assert '--paginate' in a and '--slurp' in a
 if f.get('runsFailure'): sys.exit(1)
 print(json.dumps(f['pages']))
else: raise RuntimeError(path)
`);
  chmodSync(join(temp,'gh'),0o755);
  function run(fixture,number='7') {
    writeFileSync(join(temp,'fixture.json'),JSON.stringify({sha,pages:[],...fixture}));
    writeFileSync(join(temp,'calls'),'');
    const result=spawnSync('bash',[join(temp,'helper.sh'),number],{encoding:'utf8',timeout:5000,env:{...process.env,PATH:temp+':'+process.env.PATH,CHECKS_FIXTURE:join(temp,'fixture.json'),CHECKS_CALLS:join(temp,'calls')}});
    assert.ifError(result.error);
    return {...result,calls:readFileSync(join(temp,'calls'),'utf8')};
  }
  const native=[{name:'third-party/security',state:'FAILURE',link:'https://example.invalid/check'}];
  for(const exit of [0,1,8]) {
    const result=run({normal:native,exit});
    assert.equal(result.status,exit);assert.deepEqual(JSON.parse(result.stdout),native);
    assert.doesNotMatch(result.calls,/actions\/runs/,'valid native check results retain their original exit status and visibility');
  }
  for(const error of ['HTTP 403: API rate limit exceeded','HTTP 401: Bad credentials','network unavailable']) {
    const result=run({error});assert.notEqual(result.status,0);assert.equal(result.stdout,'');
    assert.doesNotMatch(result.calls,/actions\/runs/,'unrelated failures never hide behind fallback');
  }
  const workflow=(id,workflow_id,conclusion='success',extra={})=>({id,workflow_id,run_attempt:1,event:'pull_request',name:'same name',status:'completed',conclusion,head_sha:sha,html_url:`https://github.com/fixture/repo/actions/runs/${id}`,...extra});
  const result=run({pages:[{workflow_runs:[workflow(1,11,'failure'),workflow(2,22),workflow(99,33,'success',{head_sha:otherSha})]},{workflow_runs:[workflow(3,11),workflow(4,11,'failure',{event:'push'})]}]});
  assert.equal(result.status,0,result.stderr);
  const rows=JSON.parse(result.stdout);
  assert.equal(rows.length,4,'latest workflow/event results plus a permanent visibility guard');
  assert.ok(rows.some(row=>row.name.includes('Actions 11, pull_request')&&row.state==='SUCCESS'));
  assert.ok(rows.some(row=>row.name.includes('Actions 11, push')&&row.state==='FAILURE'));
  assert.ok(rows.some(row=>row.name.includes('Actions 22, pull_request')),'same-name workflows remain separate');
  assert.ok(rows.some(row=>row.name.includes('third-party checks unverified')&&row.state==='PENDING'));
  assert.ok(!rows.some(row=>row.name.includes('Actions 33')),'other-head workflows cannot certify this PR');
  assert.equal(JSON.parse(run({pages:[]}).stdout)[0].state,'PENDING','empty Actions is never green');
  for(const [conclusion,state] of [['failure','FAILURE'],['cancelled','CANCELLED'],['timed_out','TIMED_OUT'],['action_required','ACTION_REQUIRED'],['neutral','NEUTRAL'],['skipped','SKIPPED'],[null,'PENDING'],['new-value','PENDING']]) {
    const result=run({pages:[{workflow_runs:[workflow(1,11,conclusion)]}]});
    assert.equal(JSON.parse(result.stdout)[0].state,state);
  }
  for(const status of ['queued','in_progress','waiting','requested','pending','unknown']) {
    assert.equal(JSON.parse(run({pages:[{workflow_runs:[workflow(1,11,'success',{status})]}]}).stdout)[0].state,'PENDING');
  }
  for(const fixture of [{metadataFailure:true},{sha:'bad-sha'},{runsFailure:true},{pages:{}},{pages:[{}]},{pages:[{workflow_runs:[workflow(1,11,'success',{id:null})]}]},{after:otherSha}]) {
    const result=run(fixture);assert.notEqual(result.status,0);assert.equal(result.stdout,'','failed/invalid/moving-head reads publish no partial diagnostics');
  }
  const invalid=run({},'7; touch surprise');assert.notEqual(invalid.status,0);assert.equal(invalid.calls,'');
  console.log('GitHub checks access OK: native result/exit preservation, exact-head paginated fallback, workflow/event identity, state mapping, permanent unknown-check guard and fail-closed errors/head changes.');
} finally {rmSync(temp,{recursive:true,force:true});}
