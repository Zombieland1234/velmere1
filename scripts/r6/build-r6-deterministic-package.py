#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, shutil, tempfile, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=Path('/mnt/data/VELMERE_P101R1_V4_AUDITED_CURRENT_SOURCE_CANDIDATE_R6_2026-08-23.zip')
ARCHIVE_RECEIPT=Path('/mnt/data/VELMERE_R6_ARCHIVE_RECEIPT_2026-08-23.json')
GENERATED_AT='2026-08-23T02:50:00.000Z'
SELF_EXCLUSIONS={
 'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv','CURRENT_CANDIDATE_RECEIPT.json',
 'CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json','VELMERE_R6_CURRENT_SOURCE_MANIFEST.tsv',
}
RUNTIME_PREFIXES=('.git/','.velmere/','node_modules/','.next/','.pytest_cache/')
TIMESTAMP=(1980,1,1,0,0,0)

def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def sha_file(p:Path)->str:return sha(p.read_bytes())
def excluded(rel:str)->bool:return rel.startswith(RUNTIME_PREFIXES) or '/__pycache__/' in f'/{rel}/' or rel.endswith('.pyc')

def collect():
    out=[]
    for base,dirs,files in os.walk(ROOT):
        rd=Path(base).relative_to(ROOT)
        dirs[:]=sorted(d for d in dirs if not excluded((rd/d).as_posix()+'/'))
        for n in sorted(files):
            rel=(rd/n).as_posix()
            if not excluded(rel): out.append(rel)
    return sorted(out,key=lambda x:x.encode('utf-8'))

def rows(paths):
    return [(p,(ROOT/p).stat().st_size,sha_file(ROOT/p)) for p in paths]
def manifest(data):return ('path\tbytes\tsha256\n'+''.join(f'{p}\t{s}\t{h}\n' for p,s,h in data)).encode()

def build_identity_and_receipt():
    identity_paths=[p for p in collect() if p not in SELF_EXCLUSIONS]
    r=rows(identity_paths); m=manifest(r)
    body=b''.join(f'{p}\t{s}\t{h}\n'.encode() for p,s,h in r); path_bytes=b''.join(f'{p}\n'.encode() for p,_,_ in r)
    identity={
      'schemaVersion':'velmere.current-candidate-tree-identity-excluding-self.v6','generatedAt':GENERATED_AT,
      'canonicalParent':'P101R1','physicalParentCandidate':'R4','candidate':'R6','excludedPaths':sorted(SELF_EXCLUSIONS),
      'runtimePrefixExclusions':list(RUNTIME_PREFIXES)+['**/__pycache__/**','**/*.pyc'],
      'fileCount':len(r),'totalBytes':sum(s for _,s,_ in r),'pathSetSha256':sha(path_bytes),
      'aggregateIdentitySha256':sha(body),'manifestBodySha256':sha(body),'manifestWithHeaderSha256':sha(m),
      'truthBoundary':'Exact identity of all R6 candidate files except self-referential manifest/receipt/identity paths and transient runtime paths. No row FINAL credit.'
    }
    (ROOT/'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv').write_bytes(m)
    (ROOT/'VELMERE_R6_CURRENT_SOURCE_MANIFEST.tsv').write_bytes(m)
    (ROOT/'CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json').write_text(json.dumps(identity,indent=2)+'\n')
    campaign=json.loads((ROOT/'artifacts/r6/VELMERE_R6_CURRENT_EXECUTION_CAMPAIGN_RUN1.json').read_text())
    repeat=json.loads((ROOT/'artifacts/r6/VELMERE_R6_CURRENT_EXECUTION_REPEATABILITY.json').read_text())
    pglite=json.loads((ROOT/'artifacts/r6/VELMERE_R6_EXACT_PGLITE_PREPARATION.json').read_text())
    workflow=json.loads((ROOT/'artifacts/r6/VELMERE_R6_EXACT_WINDOWS_WORKFLOW_CONTRACT.json').read_text())
    delta=json.loads((ROOT/'artifacts/r6/VELMERE_R6_SOURCE_DELTA_FROM_R4.json').read_text())
    progress=json.loads((ROOT/'artifacts/r6/VELMERE_R6_20_ROW_PROGRESS.json').read_text())
    receipt={
      'schemaVersion':'velmere.current-candidate-receipt.r6.v1','generatedAt':GENERATED_AT,
      'classification':'AUDITED_CURRENT_SOURCE_CANDIDATE_R6','canonicalParent':'P101R1','physicalParentCandidate':'R4',
      'r5ContinuityNote':'Previously described R5 archive was not physically present; no R5 credit inherited.',
      'notCanonicalCheckpoint':True,'notFinalCandidate':True,'globalState':'NO_GO_STOP_SELL',
      'customerFinal':'0/20','paidValueFinal':'0/10','ownerExecutionOrder':'INTERNAL_20_OF_20_THEN_CUSTOMER_CAMPAIGNS',
      'identity':identity,
      'manifests':{'currentCandidate':'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv','r6Source':'VELMERE_R6_CURRENT_SOURCE_MANIFEST.tsv','sha256':sha(m)},
      'sourceDeltaFromR4':{'counts':delta['counts'],'changedPathCount':delta['changedPathCount'],'receipt':'artifacts/r6/VELMERE_R6_SOURCE_DELTA_FROM_R4.json'},
      'localCampaign':{'selectedTests':campaign['selectedTests'],'summary':campaign['summary'],'actualFailureCount':campaign['actualFailureCount'],'classification':campaign['classification'],'sourceBinding':campaign['sourceBinding']},
      'campaignRepeatability':{'classification':repeat['classification'],'selectedTests':repeat['selectedTests'],'classificationEqual':repeat['stableClassificationCount'],'exitCodeEqual':repeat['stableExitCodeCount'],'stdoutSha256Equal':repeat['stableStdoutHashCount'],'stderrSha256Equal':repeat['stableStderrHashCount']},
      'exactPglite':{'status':pglite['status'],'version':pglite['package']['version'],'integrity':pglite['package']['integrity'],'affectedTestCount':len(pglite['affectedTests']),'runtimeCredit':False},
      'exactWindows':{'workflowContract':workflow['status'],'checks':f"{workflow['passedCheckCount']}/{workflow['checkCount']}",'executed':False,'credit':False},
      'progress':{'rows':len(progress['rows']),'customerFinalNumerator':progress['customerFinalNumerator'],'paidValueFinalNumerator':progress['paidValueFinalNumerator']},
      'authorizedStagingCredit':False,'fieldRightsLegalApprovalCredit':False,'customerFinalCredit':False,
      'truthBoundary':'R6 closes four real local execution gaps and provides exact PGlite/Windows bridges. Exact PGlite bytes, hosted Windows execution, authorized staging, rights approval and every row-level Customer FINAL remain withheld.'
    }
    (ROOT/'CURRENT_CANDIDATE_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n')
    return identity

def write_zip(dest,paths):
    with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1,allowZip64=True) as z:
        for rel in paths:
            info=zipfile.ZipInfo(rel,TIMESTAMP); info.create_system=0; info.external_attr=0o600<<16; info.compress_type=zipfile.ZIP_DEFLATED; info.flag_bits=0
            z.writestr(info,(ROOT/rel).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=1)

def verify(archive,paths):
    expected={p:sha_file(ROOT/p) for p in paths}
    with zipfile.ZipFile(archive) as z:
        infos=z.infolist(); names=[i.filename for i in infos]
        if names!=paths:raise RuntimeError('zip_path_order_mismatch')
        if z.testzip() is not None:raise RuntimeError('zip_crc_failure')
        for i in infos:
            if i.is_dir() or i.date_time!=TIMESTAMP or i.create_system!=0:raise RuntimeError(f'zip_metadata_mismatch:{i.filename}')
            if sha(z.read(i.filename))!=expected[i.filename]:raise RuntimeError(f'zip_entry_hash_mismatch:{i.filename}')
    return {'entryCount':len(paths),'allEntryHashesMatchSource':True,'pathOrderExact':True,'timestampsExact':True,'createSystemExact':True,'crcPass':True}

def main():
    identity=build_identity_and_receipt(); paths=collect()
    if any(excluded(p) for p in paths):raise RuntimeError('runtime_exclusion_failed')
    with tempfile.TemporaryDirectory(prefix='velmere-r6-package-') as td:
        a=Path(td)/'a.zip'; b=Path(td)/'b.zip'; write_zip(a,paths); write_zip(b,paths)
        if a.read_bytes()!=b.read_bytes():raise RuntimeError('deterministic_rebuild_mismatch')
        v=verify(a,paths); shutil.copyfile(a,OUTPUT)
    digest=sha_file(OUTPUT); delta=json.loads((ROOT/'artifacts/r6/VELMERE_R6_SOURCE_DELTA_FROM_R4.json').read_text())
    receipt={
      'schemaVersion':'velmere.r6.deterministic-source-archive-receipt.v1','generatedAt':GENERATED_AT,
      'archive':OUTPUT.name,'archiveByteLength':OUTPUT.stat().st_size,'archiveSha256':digest,'entryCount':len(paths),
      'sourceIdentityExcludingSelf':identity,'sourceDeltaFromR4':{'counts':delta['counts'],'changedPathCount':delta['changedPathCount']},
      'buildRecipe':'P101R1_R6_PACKAGE_BUILD_RECIPE.json','deterministicRebuilds':2,'byteIdenticalRebuilds':True,
      'firstSha256':digest,'secondSha256':digest,'verification':v,
      'runtimeExclusions':list(RUNTIME_PREFIXES)+['**/__pycache__/**','**/*.pyc'],
      'customerFinal':'0/20','paidValueFinal':'0/10','globalState':'NO_GO_STOP_SELL','customerFinalCredit':False,
      'truthBoundary':'Deterministic source packaging and exact entry/source identity only. No exact PGlite, hosted Windows, staging, rights, Customer FINAL, GO_PAID or LIVE credit.'
    }
    ARCHIVE_RECEIPT.write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps({'archive':str(OUTPUT),'bytes':receipt['archiveByteLength'],'sha256':digest,'entries':len(paths),'byteIdenticalRebuilds':True},indent=2))
if __name__=='__main__':main()
