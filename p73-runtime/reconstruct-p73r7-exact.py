from __future__ import annotations
import argparse, json, subprocess, sys
from pathlib import Path

P72R3=(1597,20988569,'b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73','4db46e951d3f7f2cc04f61418279b9347bc21b4300b7152aa3e2c77395216252')
P73R4=(1598,21015520,'9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25','d0306b565af73939691a34554e4f7e57543f6d3b91d778a9c93ebf25f5ffd377')
P73R5=(1598,21014969,'9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25','1c0f505f6d580ef49cc3b6fdb1e52518b341e4da96a3f2729b5b7d05cd9a4401')
P73R6=(1598,21014960,'9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25','a2a10789ed3359f9880354abf3a6272ce34445b596fbee21711109c1bdee3c82')

def run(*args:str):
    print('+', ' '.join(args), flush=True)
    subprocess.run([sys.executable,*args],check=True)

def identity(path:Path):
    m=json.loads(path.read_text(encoding='utf-8'));p=m['projection']
    return (int(p['fileCount']),int(p['payloadBytes']),p['pathSetSha256'],p['sourceContentAggregateSha256'])

def require(path:Path,expected:tuple,label:str):
    got=identity(path)
    if got!=expected:raise SystemExit(f'{label} identity mismatch: {got} != {expected}')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--work-root',default='p73r7-work');ap.add_argument('--out-root',default='p73r7-out');a=ap.parse_args()
    work=Path(a.work_root);out=Path(a.out_root);out.mkdir(parents=True,exist_ok=True)
    source=work/'source'
    run('p49-build-projection/reconstruct-p49-direct-projection.py','--transport-manifest','p49-build-projection/P49_DIRECT_PROJECTION_TRANSPORT_MANIFEST.json','--expected-transport-manifest-sha256','b0be014f6191437023cb4e598972043025d02cf658b05b29566e4c7920a1ad8f','--projection-manifest','p49-build-projection/P47_BUILD_PROJECTION_MANIFEST.json','--runner','p49-build-projection/run-p47-product-windows-projection.mjs','--parts-root','p49-build-projection/parts','--work-root',str(work),'--output-root',str(out))
    run('p66-runtime/apply-p66-audit-pdf-delta.py','--source-root',str(source),'--manifest','p49-build-projection/P47_BUILD_PROJECTION_MANIFEST.json','--output-manifest',str(work/'P66.json'))
    run('p66-runtime/finalize-p66-shield-pro-row-id.py','--source-root',str(source),'--manifest',str(work/'P66.json'))
    run('p66-runtime/fix-p66-topology-ts-const.py','--source-root',str(source),'--manifest',str(work/'P66.json'))
    run('p68-runtime/apply-p68-audit-customer-truth.py','--source-root',str(source),'--manifest',str(work/'P66.json'),'--output-manifest',str(work/'P68.json'))
    run('p69-runtime/apply-p69-ecb-reference-fx.py','--source-root',str(source),'--manifest',str(work/'P68.json'),'--output-manifest',str(work/'P69.json'))
    run('p69-runtime/fix-p69r2-node24-pinned-egress.py','--source-root',str(source),'--manifest',str(work/'P69.json'),'--output-manifest',str(work/'P69R2.json'),'--receipt',str(out/'P69R2.json'))
    run('p71-runtime/apply-p71-owner-truth-advanced-automation.py','--source-root',str(source),'--manifest',str(work/'P69R2.json'),'--output-manifest',str(work/'P71.json'),'--receipt',str(out/'P71.json'))
    run('p71-runtime/apply-p71r1-expanded-advanced-automation.py','--source-root',str(source),'--manifest',str(work/'P71.json'),'--output-manifest',str(work/'P71R1.json'),'--receipt',str(out/'P71R1.json'))
    run('p71-runtime/apply-p71r2-optional-qa-status.py','--source-root',str(source),'--manifest',str(work/'P71R1.json'),'--output-manifest',str(work/'P71R2.json'),'--receipt',str(out/'P71R2.json'))
    run('p71-runtime/apply-p71r3-remove-stale-disclosure.py','--source-root',str(source),'--manifest',str(work/'P71R2.json'),'--output-manifest',str(work/'P71R5.json'),'--receipt',str(out/'P71R3.json'))
    run('p72-runtime/apply-p72-commercial-topology-measurement.py','--source-root',str(source),'--manifest',str(work/'P71R5.json'),'--output-manifest',str(work/'P72.json'),'--receipt',str(out/'P72_SOURCE_PATCH.json'))
    run('p72-runtime/apply-p72r3-typescript-contract-repair.py','--source-root',str(source),'--manifest',str(work/'P72.json'),'--output-manifest',str(work/'P72R3.json'),'--receipt',str(out/'P72R3_SOURCE_PATCH.json'));require(work/'P72R3.json',P72R3,'P72R3')
    run('p73-runtime/apply-p73r4-adjudicated-authority-engine.py','--source-root',str(source),'--manifest',str(work/'P72R3.json'),'--output-manifest',str(work/'P73R4.json'),'--receipt',str(out/'P73R4_SOURCE_PATCH.json'));require(work/'P73R4.json',P73R4,'P73R4')
    run('p73-runtime/apply-p73r5-pinned-maintainer-authority.py','--source-root',str(source),'--manifest',str(work/'P73R4.json'),'--output-manifest',str(work/'P73R5.json'),'--receipt',str(out/'P73R5_SOURCE_PATCH.json'));require(work/'P73R5.json',P73R5,'P73R5')
    run('p73-runtime/apply-p73r6-row-bound-chain-docs-parser.py','--source-root',str(source),'--manifest',str(work/'P73R5.json'),'--output-manifest',str(work/'P73R6.json'),'--receipt',str(out/'P73R6_SOURCE_PATCH.json'));require(work/'P73R6.json',P73R6,'P73R6')
    run('p73-runtime/apply-p73r7-row-parser-lint-repair.py','--source-root',str(source),'--manifest',str(work/'P73R6.json'),'--output-manifest',str(work/'P73R7_BUILD_PROJECTION_MANIFEST.json'),'--receipt',str(out/'P73R7_SOURCE_PATCH.json'))
    final=identity(work/'P73R7_BUILD_PROJECTION_MANIFEST.json')
    (out/'P73R7_RECONSTRUCTION_BOUNDARY.json').write_text(json.dumps({'schemaVersion':'velmere.p73r7.reconstruction-boundary.v1','status':'PASS','fileCount':final[0],'payloadBytes':final[1],'pathSetSha256':final[2],'aggregateSha256':final[3],'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False},indent=2)+'\n')
    print(json.dumps({'P73R7':final},indent=2))
if __name__=='__main__':main()
