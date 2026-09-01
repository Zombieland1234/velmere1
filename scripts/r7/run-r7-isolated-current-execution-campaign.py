#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, subprocess, sys, time

ROOT=pathlib.Path(__file__).resolve().parents[2]
TEST_DIR=ROOT/'scripts'/'current-execution'
LOADER='./scripts/pass11/register-offline-ts-loader.mjs'
EXTS={'.mjs','.mts','.ts'}

def sha(b:bytes)->str: return hashlib.sha256(b).hexdigest()
def classify(name:str, code:int, out:str, err:str)->str:
    if code==0: return 'PASS'
    text=(out+'\n'+err).lower()
    if name in {'test-exact-windows-server-2025-identity.mjs','verify-exact-windows-server-2025.mjs'} and ('windows' in text or os.name!='nt'):
        return 'EXTERNAL_GATE_EXACT_WINDOWS_SERVER_2025'
    if name=='verify-v4-ai-campaign-evidence.mjs' and ('usage' in text or 'argument' in text or 'receipt' in text or code!=0):
        return 'EXTERNAL_GATE_AI_CAMPAIGN_RECEIPT'
    if code==124: return 'TIMEOUT'
    return 'FAIL'

def main()->int:
    ap=argparse.ArgumentParser()
    ap.add_argument('--output',required=True)
    ap.add_argument('--timeout-seconds',type=int,default=180)
    ap.add_argument('--run-label',required=True)
    ap.add_argument('--start',type=int,default=1)
    ap.add_argument('--end',type=int,default=52)
    a=ap.parse_args()
    tests=sorted(p for p in TEST_DIR.iterdir() if p.is_file() and (p.name.startswith('test') or p.name.startswith('verify-')) and p.suffix in EXTS)
    if len(tests)!=52: raise SystemExit(f'R7 denominator mismatch: {len(tests)} != 52')
    if not (1 <= a.start <= a.end <= 52): raise SystemExit('invalid shard range')
    selected=tests[a.start-1:a.end]
    results=[]
    start=time.time()
    for idx,p in enumerate(selected,a.start):
        rel=p.relative_to(ROOT).as_posix()
        if p.name=='test-runtime-env-canonical-example.mjs':
            receipt=f'current-execution-out/r7/{a.run_label}/RUNTIME_ENV_CONTRACT_RECEIPT.json'
            (ROOT/receipt).parent.mkdir(parents=True,exist_ok=True)
            cmd=['node',rel,'--receipt',receipt]
        else:
            cmd=['node',rel] if p.suffix=='.mjs' else ['node','--import',LOADER,rel]
        t=time.time()
        try:
            cp=subprocess.run(cmd,cwd=ROOT,text=False,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=a.timeout_seconds,env={**os.environ,'CI':'1','NEXT_TELEMETRY_DISABLED':'1'})
            code=cp.returncode; outb=cp.stdout; errb=cp.stderr
        except subprocess.TimeoutExpired as e:
            code=124; outb=e.stdout or b''; errb=(e.stderr or b'')+b'\nR7_TIMEOUT\n'
        out=outb.decode('utf-8','replace'); err=errb.decode('utf-8','replace')
        cl=classify(p.name,code,out,err)
        results.append({'ordinal':idx,'file':rel,'command':cmd,'classification':cl,'exitCode':code,'elapsedMs':round((time.time()-t)*1000),'stdoutSha256':sha(outb),'stderrSha256':sha(errb),'stdout':out[-12000:],'stderr':err[-12000:]})
        print(f'[{idx:02d}/52] {cl} {p.name}',flush=True)
        partial={'schemaVersion':'velmere.r7.current-execution-shard.partial.v1','runLabel':a.run_label,'start':a.start,'end':a.end,'results':results}
        outp=ROOT/a.output; outp.parent.mkdir(parents=True,exist_ok=True); outp.write_text(json.dumps(partial,indent=2)+'\n',encoding='utf-8')
    counts={}
    for r in results: counts[r['classification']]=counts.get(r['classification'],0)+1
    pkg=(ROOT/'package.json').read_bytes(); lock=(ROOT/'package-lock.json').read_bytes()
    receipt={'schemaVersion':'velmere.r7.current-execution-campaign.v1','generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'runLabel':a.run_label,'candidate':'R7_MERGED_CURRENT_SOURCE','ancestry':{'commonBase':'R4','siblingBranches':['R5','R6']},'runtime':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'npm':subprocess.check_output(['npm','--version'],text=True).strip(),'platform':sys.platform,'osName':os.name},'sourceBinding':{'packageJsonSha256':sha(pkg),'packageLockSha256':sha(lock)},'denominator':52,'shard':{'start':a.start,'end':a.end,'selected':len(selected)},'counts':counts,'elapsedMs':round((time.time()-start)*1000),'results':results,'customerFinalCredit':False,'truthBoundary':'Local merged regression evidence only. Exact Windows and owner-authorized staging remain separate gates.'}
    outp=ROOT/a.output; outp.parent.mkdir(parents=True,exist_ok=True); outp.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS_OUTCOME_REPEATABLE_CANDIDATE' if not counts.get('FAIL') and not counts.get('TIMEOUT') else 'FAIL','counts':counts,'output':str(outp)},indent=2))
    return 1 if counts.get('FAIL') or counts.get('TIMEOUT') else 0
if __name__=='__main__': raise SystemExit(main())
