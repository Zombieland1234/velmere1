from __future__ import annotations
import csv, os, signal, subprocess, sys, threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NODE = '/home/oai/.npm/_npx/32bdabe214bd28ec/node_modules/node/bin/node'
LOG_DIR = ROOT / 'evaluation' / 'regression-logs'
SUM_DIR = ROOT / 'evaluation' / 'summaries'
LOG_DIR.mkdir(parents=True, exist_ok=True)
lock = threading.Lock()

def safe(v:str)->str:
    import re
    return re.sub(r'[^a-z0-9._-]+','-',v.lower()).strip('-')

def read_tsv(name: str, columns: int):
    with (ROOT/'evaluation'/name).open(encoding='utf-8', newline='') as f:
        return [row for row in csv.reader(f, delimiter='\t') if len(row)==columns]

def stem_for(kind,args):
    if kind=='vlm': return f'{args[0]}-{safe(args[1])}-{args[3]}'
    if kind=='pdf': return f'pdf-{safe(args[0])}-{args[2]}'
    return f'audit-{safe(args[0])}-{args[4]}'

def run_case(kind: str, args: list[str], timeout_s: int):
    stem=stem_for(kind,args)
    if (SUM_DIR/f'{stem}.json').exists():
        return kind,args,True,0,'SKIP existing\n'
    script = {'vlm':'run-one-vlm.ts','pdf':'run-one-pdf.ts','audit':'run-one-audit.ts'}[kind]
    cmd=[NODE,'--import','tsx',str(ROOT/'evaluation'/script),*args]
    p=subprocess.Popen(cmd,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=os.environ.copy(),start_new_session=True)
    try:
        out,_=p.communicate(timeout=timeout_s)
        return kind,args,p.returncode==0,p.returncode,out
    except subprocess.TimeoutExpired:
        try: os.killpg(p.pid, signal.SIGTERM)
        except ProcessLookupError: pass
        try: out,_=p.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            try: os.killpg(p.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            out,_=p.communicate()
        return kind,args,False,124,(out or '')+'\nHARD_TIMEOUT\n'

jobs=[]
jobs += [('vlm', row, 45) for row in read_tsv('vlm-cases.tsv',4)]
jobs += [('pdf', row, 60) for row in read_tsv('pdf-pending.tsv',3)]
jobs += [('audit', row, 60) for row in read_tsv('audit-pending.tsv',5)]
pending=[j for j in jobs if not (SUM_DIR/f'{stem_for(j[0],j[1])}.json').exists()]
print(f'total={len(jobs)} existing={len(jobs)-len(pending)} pending={len(pending)}',flush=True)
results=[]
with ThreadPoolExecutor(max_workers=1) as ex:
    futures=[ex.submit(run_case,*job) for job in pending]
    for i,fut in enumerate(as_completed(futures),1):
        result=fut.result(); results.append(result)
        kind,args,ok,code,out=result
        with lock:
            with (LOG_DIR/f'{kind}.log').open('a',encoding='utf-8') as f: f.write(out+'\n')
            if not ok:
                with (LOG_DIR/f'{kind}.fail').open('a',encoding='utf-8') as f: f.write(f'{args}\tcode={code}\n')
            print(f'[{i}/{len(pending)}] {kind} {args[0]} {args[-1]} => {"OK" if ok else "FAIL"}',flush=True)
fail=[r for r in results if not r[2]]
print(f'completed={len(results)} failed={len(fail)}')
sys.exit(1 if fail else 0)
