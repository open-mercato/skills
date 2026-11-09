#!/usr/bin/env node
// Execute the shipped atomic helpers with a mock GitHub API and real Git refs.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,chmodSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=readFileSync(join(root,'skills/om-setup-agent-pipeline/references/trackers/github.md'),'utf8');
const functions=['gh_lock_target','gh_get_lock','gh_acquire_lock','gh_release_lock'].map(name=>{
 const match=source.match(new RegExp('^'+name+'\\(\\) [({]\\n[\\s\\S]*?^[)}]','m'));
 assert.ok(match,`shipped ${name}`);return match[0];
}).join('\n');
const temp=mkdtempSync(join(tmpdir(),'atomic-claims-'));
const realGit=execFileSync('sh',['-c','command -v git'],{encoding:'utf8'}).trim();
const remote=join(temp,'remote space.git');
const baseEnv={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_AUTHOR_NAME:'Claim Test',GIT_AUTHOR_EMAIL:'claim@test.invalid',GIT_COMMITTER_NAME:'Claim Test',GIT_COMMITTER_EMAIL:'claim@test.invalid'};
const git=(...args)=>execFileSync(realGit,args,{env:baseEnv,encoding:'utf8',timeout:15000}).trim();
try {
 git('-c','init.defaultBranch=fixture','init','--bare',remote);
 const tree=execFileSync(realGit,['--git-dir',remote,'mktree'],{env:baseEnv,input:'',encoding:'utf8'}).trim();
 const base=git('--git-dir',remote,'commit-tree',tree,'-m','base');
 git('--git-dir',remote,'update-ref','refs/heads/base',base);
 writeFileSync(join(temp,'helpers.sh'),'tracker_repo() { echo fixture/repo; }\n'+functions+'\n"$@"\n');
 writeFileSync(join(temp,'gh'),`#!/usr/bin/env python3
import os,sys,json,subprocess,time
from pathlib import Path
a=sys.argv[1:]; remote=os.environ['CLAIM_REMOTE']; git=os.environ['REAL_GIT']
def g(*args,input=None): return subprocess.check_output([git,'--git-dir',remote,*args],input=input,text=True).strip()
def arg(key): return a[a.index(key)+1]
if os.environ.get('CLAIM_API_FAIL')=='1': sys.exit(1)
if a[:2]==['repo','view']:
 assert a[2]=='fixture/repo'; print(remote[:-4]);sys.exit(0)
path=next(x for x in a if x.startswith('repos/'))
if '/git/matching-refs/' in path:
 prefix='refs/'+path.split('/git/matching-refs/')[1]
 refs=[]
 for line in g('for-each-ref','--format=%(refname) %(objectname)','refs/om-locks/').splitlines():
  ref,sha=line.split()
  if ref.startswith(prefix): refs.append({'ref':ref,'object':{'type':'commit','sha':sha}})
 print(json.dumps(refs))
elif '/git/commits/' in path:
 sha=path.rsplit('/',1)[1]
 if '--jq' in a: print(g('show','-s','--format=%T',sha))
 else: print(json.dumps({'sha':sha,'message':g('show','-s','--format=%B',sha),'committer':{'date':g('show','-s','--format=%cI',sha)}}))
elif path.endswith('/git/commits'):
 data=json.load(sys.stdin)
 if os.environ.get('CLAIM_BARRIER'):
  p=Path(os.environ['CLAIM_BARRIER']);(p/os.environ['CLAIM_WORKER']).touch();deadline=time.time()+10
  while len(list(p.iterdir()))<2:
   if time.time()>deadline: raise RuntimeError('barrier timeout')
   time.sleep(.005)
 args=['commit-tree',data['tree'],'-m',data['message']]
 for parent in data['parents']: args+=['-p',parent]
 print(json.dumps({'sha':g(*args)}))
elif path.endswith('/git/refs'):
 ref=next(x[4:] for x in a if x.startswith('ref='));sha=next(x[4:] for x in a if x.startswith('sha='))
 if os.environ.get('CLAIM_POST_DENIED')=='1': sys.exit(1)
 result=subprocess.run([git,'--git-dir',remote,'update-ref',ref,sha,'0'*40],capture_output=True)
 if result.returncode: sys.exit(22)
 if os.environ.get('CLAIM_POST_LOST')=='1': sys.exit(1)
 print(json.dumps({'ref':ref,'object':{'sha':sha}}))
else: raise RuntimeError(path)
`);
 chmodSync(join(temp,'gh'),0o755);
 // Trigger a successor exactly after the helper's ownership read, before delete.
 writeFileSync(join(temp,'git'),`#!/usr/bin/env python3
import os,sys,subprocess
args=sys.argv[1:];git=os.environ['REAL_GIT']
if 'push' in args and os.environ.get('CLAIM_SWAP_SHA'):
 subprocess.run([git,'--git-dir',os.environ['CLAIM_REMOTE'],'update-ref','refs/om-locks/issue-7',os.environ['CLAIM_SWAP_SHA']],check=True)
os.execv(git,[git,*args])
`);
 chmodSync(join(temp,'git'),0o755);
 const env={...baseEnv,PATH:temp+':'+process.env.PATH,REAL_GIT:realGit,CLAIM_REMOTE:remote};
 function invoke(args,extra={},cwd=root) {
  return execFileSync('bash',[join(temp,'helpers.sh'),...args],{cwd,env:{...env,...extra},encoding:'utf8',timeout:15000,stdio:['pipe','pipe','pipe']}).trim();
 }
 const acquire=(run,extra={})=>JSON.parse(invoke(['gh_acquire_lock','issue','7',run,'shared[bot]',base],extra));
 const read=()=>JSON.parse(invoke(['gh_get_lock','issue','7']));
 const release=(lock,extra={},cwd=root)=>invoke(['gh_release_lock','issue','7',lock.sha,lock.runId,lock.actor],extra,cwd);
 function concurrent(run,barrier) {
  return new Promise((resolve,reject)=>{
   const child=spawn('bash',[join(temp,'helpers.sh'),'gh_acquire_lock','issue','7',run,'shared[bot]',base],{env:{...env,CLAIM_BARRIER:barrier,CLAIM_WORKER:run}});
   let out='',err='';child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);
   const timer=setTimeout(()=>child.kill('SIGTERM'),15000);
   child.on('error',reject);child.on('exit',code=>{clearTimeout(timer);code===0?resolve(JSON.parse(out)):reject(Error(err||'exit '+code));});
  });
 }
 assert.equal(read(),null);
 for(let round=0;round<8;round++) {
  const barrier=join(temp,'barrier-'+round);mkdirSync(barrier);
  const results=await Promise.all([concurrent('a-'+round,barrier),concurrent('b-'+round,barrier)]);
  assert.equal(results.filter(x=>x.status==='acquired').length,1);
  assert.equal(results.filter(x=>x.status==='conflict').length,1);
  assert.equal(results[0].lock.sha,results[1].lock.sha);
  const lock=read();assert.equal(acquire(lock.runId).status,'owned','idempotent re-entry');
  assert.throws(()=>release({...lock,runId:'wrong-run'}),'shared bot login cannot release another run');
  assert.equal(read().sha,lock.sha);
  release(lock);assert.equal(read(),null);
 }
 // Release must not depend on the caller's checkout or worktree hooks.
 const outside=acquire('outside-checkout').lock;
 release(outside,{},temp);assert.equal(read(),null,'release from a non-repository directory');
 const checkout=join(temp,'hooked checkout');
 git('-c','init.defaultBranch=fixture','init',checkout);
 const hook=join(checkout,'.git','hooks','pre-push');
 writeFileSync(hook,'#!/bin/sh\nexit 1\n');chmodSync(hook,0o755);
 const hooked=acquire('worktree-hook').lock;
 assert.throws(()=>execFileSync(realGit,['-C',checkout,'push',remote,':refs/om-locks/issue-7'],{env:baseEnv,stdio:'pipe'}),'fixture hook actually rejects pushes');
 assert.equal(read().sha,hooked.sha);
 release(hooked,{},checkout);assert.equal(read(),null,'release does not invoke caller worktree hooks');
 // Global policy remains effective even though the caller hooks are unrelated.
 const globalHooks=join(temp,'global-hooks');mkdirSync(globalHooks);
 writeFileSync(join(globalHooks,'pre-push'),'#!/bin/sh\nexit 1\n');chmodSync(join(globalHooks,'pre-push'),0o755);
 const policy=join(temp,'policy.gitconfig');writeFileSync(policy,'[core]\n  hooksPath = "'+globalHooks+'"\n');
 const protectedLock=acquire('global-policy').lock;
 assert.throws(()=>release(protectedLock,{GIT_CONFIG_GLOBAL:policy},temp),'configured global pre-push policy remains enforced');
 assert.equal(read().sha,protectedLock.sha,'failed release retains the lock');
 release(protectedLock,{},temp);
 const uncertain=acquire('lost-response',{CLAIM_POST_LOST:'1'});
 assert.equal(uncertain.status,'acquired','uncertain POST reconciles exact owner');release(uncertain.lock);
 assert.throws(()=>acquire('denied',{CLAIM_POST_DENIED:'1'}),'permission denial is not comment fallback or conflict');
 assert.equal(read(),null);
 assert.throws(()=>invoke(['gh_get_lock','issue','7'],{CLAIM_API_FAIL:'1'}),'failed reads are not absence');
 // A late reset/release cannot delete a replacement, even between read and push.
 const old=acquire('old-owner').lock;
 const message='om-claim-v1\n'+JSON.stringify({repo:'fixture/repo',kind:'issue',item:'7',runId:'successor',actor:'shared[bot]'});
 const successor=git('--git-dir',remote,'commit-tree',tree,'-p',base,'-m',message);
 assert.throws(()=>release(old,{CLAIM_SWAP_SHA:successor}),'expected-SHA lease fences stale recovery');
 assert.equal(read().sha,successor,'successor retained');
 assert.throws(()=>release(old),'second recovering worker must not remove successor');
 release(read());assert.equal(read(),null);
 assert.match(release(old),/absent/,'already released is idempotent');
 git('--git-dir',remote,'update-ref','refs/om-locks/issue-70',base);
 assert.equal(read(),null,'prefix matches are not the exact lock');
 git('--git-dir',remote,'update-ref','refs/om-locks/issue-7',base);
 assert.throws(()=>read(),'malformed foreign refs block rather than being stolen');
 git('--git-dir',remote,'update-ref','-d','refs/om-locks/issue-7');
 assert.throws(()=>invoke(['gh_get_lock','branch','7']));
 console.log('Atomic claims OK: 8 same-bot concurrent create-only races; identity, uncertain POST, denial, exact refs, conditional release and successor fencing with real Git transport.');
} finally {rmSync(temp,{recursive:true,force:true});}
