#!/usr/bin/env python3
import argparse,json,pathlib,hashlib
ap=argparse.ArgumentParser();ap.add_argument('--run1',required=True);ap.add_argument('--run2',required=True);ap.add_argument('--output',required=True);a=ap.parse_args()
r1=json.loads(pathlib.Path(a.run1).read_text());r2=json.loads(pathlib.Path(a.run2).read_text())
A={x['file']:x for x in r1['results']};B={x['file']:x for x in r2['results']}; files=sorted(set(A)|set(B))
rows=[]
for f in files:
 x=A.get(f);y=B.get(f);rows.append({'file':f,'classificationStable':bool(x and y and x['classification']==y['classification']),'exitCodeStable':bool(x and y and x['exitCode']==y['exitCode']),'stdoutHashStable':bool(x and y and x['stdoutSha256']==y['stdoutSha256']),'stderrHashStable':bool(x and y and x['stderrSha256']==y['stderrSha256'])})
summary={k:sum(1 for r in rows if r[k]) for k in ['classificationStable','exitCodeStable','stdoutHashStable','stderrHashStable']}
out={'schemaVersion':'velmere.r7.campaign-repeatability.v1','denominator':len(files),'summary':summary,'status':'PASS_OUTCOME_REPEATABLE' if summary['classificationStable']==len(files) and summary['exitCodeStable']==len(files) else 'FAIL','rows':rows,'customerFinalCredit':False}
pathlib.Path(a.output).write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'status':out['status'],'summary':summary},indent=2))
raise SystemExit(0 if out['status'].startswith('PASS') else 1)
