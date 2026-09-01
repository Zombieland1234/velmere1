#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
def utc_now(): return dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00','Z')

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--run1',required=True); ap.add_argument('--run2',required=True); ap.add_argument('--output',required=True)
    a=ap.parse_args()
    p1=(ROOT/a.run1).resolve(); p2=(ROOT/a.run2).resolve(); out=(ROOT/a.output).resolve()
    r1=json.loads(p1.read_text()); r2=json.loads(p2.read_text())
    m1={x['file']:x for x in r1['results']}; m2={x['file']:x for x in r2['results']}
    files=sorted(set(m1)|set(m2)); comparisons=[]
    for f in files:
        x=m1.get(f); y=m2.get(f)
        comparisons.append({
          'file':f,'presentBoth':x is not None and y is not None,
          'classificationStable':bool(x and y and x['classification']==y['classification']),
          'exitCodeStable':bool(x and y and x['exitCode']==y['exitCode']),
          'stdoutHashStable':bool(x and y and x['stdoutSha256']==y['stdoutSha256']),
          'stderrHashStable':bool(x and y and x['stderrSha256']==y['stderrSha256']),
          'run1Classification':x['classification'] if x else None,
          'run2Classification':y['classification'] if y else None,
        })
    outcome=all(c['classificationStable'] and c['exitCodeStable'] for c in comparisons)
    failures=r1.get('actualFailureCount',0)+r2.get('actualFailureCount',0)
    payload={
      'schemaVersion':'velmere.r6.current-execution-repeatability.v1','generatedAt':utc_now(),
      'run1':p1.relative_to(ROOT).as_posix(),'run2':p2.relative_to(ROOT).as_posix(),
      'selectedTests':len(files),'stableClassificationCount':sum(c['classificationStable'] for c in comparisons),
      'stableExitCodeCount':sum(c['exitCodeStable'] for c in comparisons),
      'stableStdoutHashCount':sum(c['stdoutHashStable'] for c in comparisons),
      'stableStderrHashCount':sum(c['stderrHashStable'] for c in comparisons),
      'run1Summary':r1.get('summary'),'run2Summary':r2.get('summary'),'actualFailureCount':failures,
      'classification':'PASS_OUTCOME_REPEATABLE' if outcome and failures==0 else 'FAIL_REPEATABILITY',
      'truthBoundary':'Outcome repeatability means classification and exit-code stability. Byte-identical stdout is reported separately because legitimate receipts may contain time or run-specific values.',
      'comparisons':comparisons,
    }
    out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(payload,indent=2)+'\n')
    print(json.dumps({k:payload[k] for k in ('selectedTests','stableClassificationCount','stableExitCodeCount','stableStdoutHashCount','stableStderrHashCount','classification')},indent=2))
    return 0 if payload['classification']=='PASS_OUTCOME_REPEATABLE' else 2
if __name__=='__main__': raise SystemExit(main())
