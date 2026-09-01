#!/usr/bin/env python3
import argparse,glob,hashlib,json,pathlib,subprocess,sys,time
ap=argparse.ArgumentParser();ap.add_argument('--pattern',required=True);ap.add_argument('--output',required=True);ap.add_argument('--run-label',required=True);a=ap.parse_args()
files=sorted(glob.glob(a.pattern)); results=[]; seen=set()
for f in files:
 d=json.loads(pathlib.Path(f).read_text())
 for r in d['results']:
  if r['ordinal'] in seen: raise SystemExit(f'duplicate ordinal {r["ordinal"]}')
  seen.add(r['ordinal']);results.append(r)
results.sort(key=lambda r:r['ordinal'])
if [r['ordinal'] for r in results]!=list(range(1,53)): raise SystemExit(f'incomplete denominator: {sorted(seen)}')
counts={}
for r in results: counts[r['classification']]=counts.get(r['classification'],0)+1
root=pathlib.Path(__file__).resolve().parents[2]
sha=lambda p:hashlib.sha256((root/p).read_bytes()).hexdigest()
out={'schemaVersion':'velmere.r7.current-execution-campaign.v1','generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'runLabel':a.run_label,'candidate':'R7_MERGED_CURRENT_SOURCE','ancestry':{'commonBase':'R4','siblingBranches':['R5','R6']},'runtime':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'npm':subprocess.check_output(['npm','--version'],text=True).strip(),'platform':sys.platform},'sourceBinding':{'packageJsonSha256':sha(pathlib.Path('package.json')),'packageLockSha256':sha(pathlib.Path('package-lock.json'))},'denominator':52,'counts':counts,'shards':files,'results':results,'customerFinalCredit':False,'truthBoundary':'Local merged regression evidence only. Exact Windows and owner-authorized staging remain separate gates.'}
pathlib.Path(a.output).write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'status':'PASS' if not counts.get('FAIL') and not counts.get('TIMEOUT') else 'FAIL','counts':counts,'output':a.output},indent=2))
raise SystemExit(1 if counts.get('FAIL') or counts.get('TIMEOUT') else 0)
