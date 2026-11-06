#!/usr/bin/env node
// Execute the shipped GitHub winner helper against an interleaved mock transport.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, chmodSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = p => readFileSync(join(root,p),'utf8');
const descriptor = read('skills/om-setup-agent-pipeline/references/trackers/github.md');
const winner = descriptor.match(/^gh_claim_winner\(\) \{\n[\s\S]*?^\}/m)?.[0];
assert.ok(winner, 'shipped winner helper');
const reset = descriptor.match(/^gh_get_claim_reset\(\) \{\n[\s\S]*?^\}/m)?.[0];
assert.ok(reset, 'shipped human reset audit helper');
const temp = mkdtempSync(join(tmpdir(),'claim-protocol-'));
const run = (command, args, env={}) => execFileSync(command,args,{encoding:'utf8',timeout:15000,env:{...process.env,...env}});
try {
  writeFileSync(join(temp,'winner.sh'), 'tracker_repo() { echo fixture/repo; }\n'+winner+'\ngh_claim_winner "$1" "$2"\n');
  // The mock synchronizes both initial reads and both POSTs. IDs cross a digit
  // boundary, exposing lexical sorting; every later comment is another API page.
  writeFileSync(join(temp,'gh'), `#!/usr/bin/env python3
import os,sys,json,time,fcntl
from pathlib import Path
p=Path(os.environ['CLAIM_FIXTURE']); run=os.environ.get('CLAIM_WORKER','solo')
def barrier(stage):
 (p/(stage+'-'+run)).touch()
 deadline=time.time()+10
 while len(list(p.glob(stage+'-*')))<2:
  if time.time()>deadline: raise RuntimeError('barrier timeout')
  time.sleep(.005)
args=sys.argv[1:]
if os.environ.get('CLAIM_FAIL_READ')=='1' and '--paginate' in args: sys.exit(1)
if os.environ.get('CLAIM_MALFORMED')=='1': print('{}'); sys.exit(0)
if 'initial' in args:
 barrier('initial'); print('[]'); sys.exit(0)
with open(p/'mutex','w') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX)
 data=json.loads((p/'data.json').read_text())
 if 'POST' in args:
  n=data['next']; data['next']+=1
  body='🤖 Claiming this issue — starting test run.\\nClaim-Run: '+run+'\\nClaim-State: active'
  data['comments'].append({'id':n,'user':{'login':os.environ.get('CLAIM_ACTOR',run)},'body':body})
  (p/'data.json').write_text(json.dumps(data)); result=str(n)
 elif 'PATCH' in args:
  cid=int(args[-2]); terminal=args[-1]
  c=next(c for c in data['comments'] if c['id']==cid)
  assert c['user']['login']==os.environ.get('CLAIM_ACTOR',run)
  c['body']=c['body'].replace('Claim-State: active','Claim-State: '+terminal)
  (p/'data.json').write_text(json.dumps(data)); result=json.dumps(c)
 elif '--slurp' in args: result=json.dumps([[c] for c in data['comments']])
 else: result=json.dumps(data['comments'])
if 'POST' in args: barrier('posted')
print(result)
`);
  chmodSync(join(temp,'gh'),0o755);
  const env={PATH:temp+':'+process.env.PATH,CLAIM_FIXTURE:temp};
  writeFileSync(join(temp,'worker.sh'), `set -eu
tracker_repo() { echo fixture/repo; }
${winner}
gh api initial >/dev/null
own=$(gh api -X POST comments)
# Caller supplies every live candidate from a full fresh read, per the contract.
live=$(gh api comments | jq '[.[] | select(.body|contains("Claim-State: active")) | .id|tostring]')
a=$(gh_claim_winner 7 "$live")
b=$(gh_claim_winner 7 "$live")
if [ "$(printf '%s' "$a" | jq -r .id)" != "$own" ] || [ "$a" != "$b" ]; then
 gh api -X PATCH comments "$own" withdrawn >/dev/null
 echo "stopped $own winner=$(printf '%s' "$b" | jq -r .id)"
else
 # Model the next permitted actions, never reached by the loser.
 echo "$own" >> "$CLAIM_FIXTURE/label-writes"
 echo "proceed $own"
fi
`);
  const worker=(id,actor)=>new Promise((resolve,reject)=>{
    const child=spawn('bash',[join(temp,'worker.sh')],{env:{...process.env,...env,CLAIM_WORKER:id,CLAIM_ACTOR:actor}});
    let out='',err=''; child.stdout.on('data',s=>out+=s);child.stderr.on('data',s=>err+=s);
    const timer=setTimeout(()=>child.kill('SIGTERM'),15000);
    child.on('error',reject);child.on('exit',code=>{clearTimeout(timer);code===0?resolve(out.trim()):reject(Error(err||'worker exit '+code));});
  });
  for(let i=0;i<12;i++) {
    for(const f of readdirSync(temp).filter(f=>/^(initial-|posted-|label-writes$)/.test(f))) rmSync(join(temp,f));
    writeFileSync(join(temp,'data.json'),JSON.stringify({next:9,comments:[]}));
    const sameBot=i%2===0;
    const results=await Promise.all([worker('run-a',sameBot?'shared[bot]':'alice'),worker('run-b',sameBot?'shared[bot]':'bob')]);
    assert.equal(results.filter(s=>s.startsWith('proceed')).length,1);
    assert.equal(results.filter(s=>s.startsWith('stopped')).length,1);
    assert.equal(readFileSync(join(temp,'label-writes'),'utf8').trim(),'9');
    const data=JSON.parse(readFileSync(join(temp,'data.json'),'utf8'));
    assert.equal(data.comments.filter(c=>c.body.includes('Claim-State: active')).length,1);
    assert.equal(data.comments.find(c=>c.id===10).body.includes('withdrawn'),true);
  }
  function elect(comments,ids,extra={}) {
    writeFileSync(join(temp,'data.json'),JSON.stringify({next:100,comments}));
    return JSON.parse(run('bash',[join(temp,'winner.sh'),'7',JSON.stringify(ids)],{...env,...extra}));
  }
  const comment=(id,state='active',user='shared[bot]')=>({id,user:{login:user},body:`🤖 Claiming this issue\nClaim-Run: run-${id}\nClaim-State: ${state}`});
  assert.equal(elect([comment(10),comment(9)],['9','10']).id,'9');
  assert.equal(elect([comment(9,'released'),comment(10)],['9','10']).id,'10');
  assert.equal(elect([comment(9,'withdrawn'),comment(10)],['9','10']).id,'10');
  assert.equal(elect([comment(9),comment(10)],['10']).id,'10','caller excludes exactly verified stale/superseded IDs');
  assert.equal(elect([{id:8,user:{login:'legacy'},body:'🤖 `autofix` started by @legacy'},comment(9)],['8','9']).user,'legacy');
  assert.equal(elect([],[]),null);
  assert.throws(()=>elect([],[],{CLAIM_FAIL_READ:'1'}),'failed reads are errors');
  assert.throws(()=>elect([],[],{CLAIM_MALFORMED:'1'}),'malformed reads are errors');
  assert.throws(()=>run('bash',[join(temp,'winner.sh'),'bad-id','[]'],env));
  // Reset authority comes from server label events, never a comment or a bot.
  writeFileSync(join(temp,'reset.sh'),'tracker_repo() { echo fixture/repo; }\n'+reset+'\ngh_get_claim_reset 7\n');
  writeFileSync(join(temp,'gh'),`#!/usr/bin/env python3
import os,json,sys
from pathlib import Path
p=Path(os.environ['CLAIM_FIXTURE'])
if os.environ.get('RESET_ERROR')=='1': sys.exit(1)
if any('/permission' in x for x in sys.argv):
 print((p/'permission.json').read_text())
else: print((p/'events.json').read_text())
`);
  const event=(id,actorType='User',name='claim-reset')=>({id,event:'labeled',label:{name},actor:{login:'maintainer',type:actorType},created_at:`2026-11-05T12:00:${String(id).padStart(2,'0')}Z`});
  const audit=(events,permission={permission:'write'})=>{
    writeFileSync(join(temp,'events.json'),JSON.stringify(events));
    writeFileSync(join(temp,'permission.json'),JSON.stringify(permission));
    return JSON.parse(run('bash',[join(temp,'reset.sh')],env));
  };
  assert.equal(audit([[event(1,'Bot')]]),null,'automation cannot reset claims');
  assert.equal(audit([[event(1,'User','in-progress')]]),null);
  assert.equal(audit([[event(1)],[event(2)]]).id,'2','latest human reset across pages');
  assert.equal(audit([[event(1)]],{permission:'read',user:{permissions:{triage:true}}}).actor,'maintainer');
  assert.throws(()=>audit([[event(1)]],{permission:'read'}),'untrusted label actor does not authorize reset');
  assert.throws(()=>run('bash',[join(temp,'reset.sh')],{...env,RESET_ERROR:'1'}),'failed audit is not no reset');
  // Contract completeness catches a forgotten installed copy, rather than only
  // testing one canonical file while another still tells an agent to skip claims.
  for(const name of readdirSync(join(root,'skills'))) {
    const rules=read(`skills/${name}/references/rules.md`);
    if (rules.includes('**Claim etiquette.**')) assert.match(rules,/elect the deterministic winner/,name);
  }
  console.log('Claim protocol OK: 12 interleaved double-claims (6 shared-bot), numeric order, all pages, terminal/legacy/stale candidates, failed reads, audited human UI reset and all rule copies.');
} finally {rmSync(temp,{recursive:true,force:true});}
