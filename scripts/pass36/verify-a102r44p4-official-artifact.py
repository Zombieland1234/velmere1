from __future__ import annotations
import argparse, hashlib, json, os, pathlib, re, sys
from collections import Counter, defaultdict
from typing import Any

SHA_RE = re.compile(r"^[0-9a-f]{64}$")
EXPECTED_TOOLS = ("solc", "slither", "semgrep", "forge")
EXPECTED_VERSIONS = {"solc":"0.8.24", "slither":"0.11.5", "semgrep":"1.130.0", "forge":"1.2.3"}
EXPECTED_TOOL_HASHES = {
    "solc":"fb03a29a517452b9f12bcf459ef37d0a543765bb3bbc911e70a87d6a37c30d5f",
    "slither":"c1a8cc7dbfea17322a89aa5a73c23f92ee163b571cd16b06c1691f8edef264f2",
    "semgrep":"7e0362f596fc3d58a50e017922269350a963af53effa1a03c5477efb5ecac851",
    "forge":"fb15fd52f774c935fa15f1ad6ff018c56b7054f50b6329e20a882b8d12992a16",
}
EXPECTED_INTERPRETER_HASH = "3d47c83556de5a94fb39905399cf8d7040be140c25c667bd34cb6d7eefd42075"
EXPECTED_ARTIFACT_ZIP_SHA = "3727858b943df088af0d3aa71a2851461e8484712f6ec8ab92778fe5c3674b26"
EXPECTED_HEAD_SHA = "5e265cc30e45a7c570a213174350af574ccc3ab9"
EXPECTED_RUN_ID = 30741096878
EXPECTED_JOB_ID = 91478569336
EXPECTED_ARTIFACT_ID = 8831326437


def sha_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def sha_file(p: pathlib.Path) -> str:
    h=hashlib.sha256()
    with p.open('rb') as f:
        for c in iter(lambda:f.read(1024*1024),b''): h.update(c)
    return h.hexdigest()

def load_json(p: pathlib.Path) -> Any:
    return json.loads(p.read_text(encoding='utf-8'))

def dir_manifest(root: pathlib.Path) -> tuple[int,str]:
    rows=[]
    for p in sorted((x for x in root.rglob('*') if x.is_file()), key=lambda x:x.relative_to(root).as_posix().encode()):
        rel=p.relative_to(root).as_posix(); rows.append({"path":rel,"bytes":p.stat().st_size,"sha256":sha_file(p)})
    enc=json.dumps(rows,sort_keys=True,separators=(',',':')).encode()
    return len(rows), sha_bytes(enc)

class V:
    def __init__(self): self.rows=[]
    def check(self, cid:str, ok:bool, detail:Any=None):
        self.rows.append({"id":cid,"passed":bool(ok),"detail":detail})
    def require(self,cid:str,ok:bool,detail:Any=None): self.check(cid,ok,detail)
    def result(self):
        failed=[x for x in self.rows if not x['passed']]
        return {"status":"PASS" if not failed else "FAIL","checks":len(self.rows),"passed":len(self.rows)-len(failed),"failed":len(failed),"failedChecks":failed,"checksDetail":self.rows}

def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',required=True)
    ap.add_argument('--zip')
    ap.add_argument('--output')
    args=ap.parse_args()
    root=pathlib.Path(args.root).resolve(); v=V()
    if args.zip:
        zp=pathlib.Path(args.zip).resolve(); v.check('artifact-zip-exists',zp.is_file(),str(zp))
        if zp.is_file(): v.check('artifact-zip-sha256',sha_file(zp)==EXPECTED_ARTIFACT_ZIP_SHA,{"expected":EXPECTED_ARTIFACT_ZIP_SHA,"actual":sha_file(zp),"bytes":zp.stat().st_size})
    for rel in ['EVIDENCE_FILE_MANIFEST.json','evidence/CORPUS_MANIFEST.json','evidence/OFFICIAL_TOOL_EXECUTION_LEDGER.json','evidence/tool-identities.json']:
        v.check(f'required:{rel}',(root/rel).is_file(),rel)
    if any(not x['passed'] for x in v.rows):
        result=v.result(); print(json.dumps(result,indent=2)); return 1
    m=load_json(root/'EVIDENCE_FILE_MANIFEST.json')
    manifest_rows=m.get('files') if isinstance(m,dict) else None
    v.check('manifest-schema',isinstance(manifest_rows,list) and isinstance(m.get('fileCount'),int))
    manifest_map={x.get('path'):x for x in manifest_rows if isinstance(x,dict)}
    actual_files=sorted((x for x in (root/'evidence').rglob('*') if x.is_file()), key=lambda x:x.relative_to(root/'evidence').as_posix().encode())
    v.check('manifest-file-count',m['fileCount']==len(manifest_rows)==len(actual_files),{"declared":m['fileCount'],"rows":len(manifest_rows),"actual":len(actual_files)})
    v.check('manifest-unique-paths',len(manifest_map)==len(manifest_rows))
    missing=[]; extra=[]; bad=[]
    actual_map={p.relative_to(root/'evidence').as_posix():p for p in actual_files}
    for rel,row in manifest_map.items():
        p=actual_map.get(rel)
        if p is None: missing.append(rel); continue
        if p.stat().st_size!=row.get('bytes') or sha_file(p)!=row.get('sha256'): bad.append(rel)
    extra=sorted(set(actual_map)-set(manifest_map))
    v.check('manifest-content-complete',not missing and not extra and not bad,{"missing":missing[:20],"extra":extra[:20],"bad":bad[:20]})
    corpus=load_json(root/'evidence/CORPUS_MANIFEST.json')
    cases=corpus.get('cases',[])
    v.check('corpus-schema',corpus.get('schemaVersion')=='velmere.r44p4.official-tool-corpus.v1')
    v.check('corpus-50',corpus.get('caseCount')==50 and len(cases)==50)
    v.check('corpus-unique-case-ids',len({c.get('case_id') for c in cases})==50)
    v.check('corpus-unique-filenames',len({c.get('filename') for c in cases})==50)
    corpus_by={c['case_id']:c for c in cases}
    corpus_bad=[]
    for c in cases:
        if c.get('input_class')!='LOCAL_SYNTHETIC_BENCHMARK' or c.get('rights_basis')!='PROJECT_OWNED_FIXTURE_MIT': corpus_bad.append(c.get('case_id'))
        sp=root/'evidence/cases'/c['case_id']/'src/Case.sol'
        if not sp.is_file() or sha_file(sp)!=c.get('sha256'): corpus_bad.append(f"file:{c.get('case_id')}")
    v.check('corpus-source-and-rights-bindings',not corpus_bad,corpus_bad[:20])
    ids=load_json(root/'evidence/tool-identities.json')
    v.check('tool-identity-tools',sorted(ids)==sorted(EXPECTED_TOOLS),sorted(ids))
    identity_bad=[]
    for t in EXPECTED_TOOLS:
        x=ids.get(t,{})
        if x.get('requestedVersion')!=EXPECTED_VERSIONS[t] or x.get('versionMatched') is not True or x.get('versionExitCode')!=0 or x.get('executableSha256')!=EXPECTED_TOOL_HASHES[t]: identity_bad.append(t)
        if t in ('slither','semgrep') and x.get('interpreterSha256')!=EXPECTED_INTERPRETER_HASH: identity_bad.append(f'{t}:interpreter')
        if not SHA_RE.fullmatch(str(x.get('versionStdoutSha256',''))) or not SHA_RE.fullmatch(str(x.get('versionStderrSha256',''))): identity_bad.append(f'{t}:version_digest')
    v.check('tool-identities-pinned',not identity_bad,identity_bad)
    # Environment cross-checks where artifact carries independent files.
    solc_sha=(root/'evidence/environment/solc-binary-sha256.txt').read_text().split()[0]
    forge_sha=(root/'evidence/environment/forge-sha256.txt').read_text().split()[0]
    v.check('environment-solc-sha',solc_sha==EXPECTED_TOOL_HASHES['solc'],solc_sha)
    v.check('environment-forge-sha',forge_sha==EXPECTED_TOOL_HASHES['forge'],forge_sha)
    pip_freeze=(root/'evidence/environment/pip-freeze.txt').read_text(encoding='utf-8',errors='replace')
    v.check('environment-slither-version','slither-analyzer==0.11.5' in pip_freeze)
    v.check('environment-semgrep-version','semgrep==1.130.0' in pip_freeze)
    ledger=load_json(root/'evidence/OFFICIAL_TOOL_EXECUTION_LEDGER.json')
    rows=ledger.get('rows',[])
    v.check('ledger-schema',ledger.get('schemaVersion')=='velmere.r44p4.official-tool-ledger.v2')
    v.check('ledger-denominator',ledger.get('caseCount')==50 and ledger.get('toolCount')==4 and ledger.get('requiredExecutions')==200 and ledger.get('executed')==200 and len(rows)==200)
    v.check('ledger-unique-execution-keys',ledger.get('uniqueExecutionKeys')==200 and len({(r.get('tool'),r.get('caseId')) for r in rows})==200)
    v.check('ledger-official-completed',ledger.get('completedOfficialExecutions')==200 and ledger.get('successful')==200 and ledger.get('toolErrors')==0)
    v.check('ledger-no-real-customer-live-credit',ledger.get('realAuditCredit')==0 and ledger.get('customerCredit')==0 and ledger.get('liveCredit')==0)
    per_tool=Counter(r.get('tool') for r in rows)
    v.check('ledger-50-per-tool',all(per_tool[t]==50 for t in EXPECTED_TOOLS),dict(per_tool))
    expected_status_counts={
      'solc':Counter({'EXECUTED_SUCCESS':50}),
      'slither':Counter({'EXECUTED_FINDINGS':42,'EXECUTED_SUCCESS':8}),
      'semgrep':Counter({'EXECUTED_FINDINGS':16,'EXECUTED_SUCCESS':34}),
      'forge':Counter({'EXECUTED_SUCCESS':50}),
    }
    actual_status={t:Counter(r.get('terminalStatus') for r in rows if r.get('tool')==t) for t in EXPECTED_TOOLS}
    v.check('ledger-terminal-status-distribution',actual_status==expected_status_counts,{t:dict(c) for t,c in actual_status.items()})
    bad_rows=[]; bad_receipts=[]; bad_raw=[]; bad_outputs=[]; credit_violations=[]
    for r in rows:
        tool=r.get('tool'); cid=r.get('caseId'); key=f'{tool}-{cid}'
        c=corpus_by.get(cid)
        if tool not in EXPECTED_TOOLS or c is None or r.get('executionId')!=key or r.get('sourceFilename')!=c['filename'] or r.get('sourceSha256')!=c['sha256'] or r.get('inputClass')!='LOCAL_SYNTHETIC_BENCHMARK' or r.get('rightsBasis')!='PROJECT_OWNED_FIXTURE_MIT': bad_rows.append(key)
        if r.get('officialExecutionCredit') is not True or r.get('realAuditCredit') is not False or r.get('customerCredit') is not False or r.get('liveCredit') is not False or r.get('timedOut') is not False: credit_violations.append(key)
        ti=r.get('toolIdentity',{})
        if ti!=ids.get(tool): bad_rows.append(f'{key}:identity')
        rp=root/r.get('receiptPath','')
        if not rp.is_file() or sha_file(rp)!=r.get('receiptSha256'):
            bad_receipts.append(key)
        else:
            rr=load_json(rp)
            # The receipt on disk intentionally excludes its own path/hash fields.
            expected={k:v0 for k,v0 in r.items() if k not in ('receiptPath','receiptSha256')}
            if rr!=expected: bad_receipts.append(f'{key}:content')
        for s in ('stdout','stderr'):
            info=r.get(s,{})
            p=root/info.get('path','')
            if not p.is_file() or p.stat().st_size!=info.get('bytes') or sha_file(p)!=info.get('sha256'): bad_raw.append(f'{key}:{s}')
        for out in r.get('outputs',[]):
            p=root/out.get('path','')
            if out.get('type')=='file':
                if not p.is_file() or p.stat().st_size!=out.get('bytes') or sha_file(p)!=out.get('sha256'): bad_outputs.append(f'{key}:{out.get("path")}')
            elif out.get('type')=='directory':
                if not p.is_dir(): bad_outputs.append(f'{key}:{out.get("path")}')
                else:
                    items=[]
                    for f in sorted((x for x in p.rglob('*') if x.is_file()),key=lambda x:x.relative_to(p).as_posix().encode()):
                        items.append({'path':f.relative_to(p).as_posix(),'bytes':f.stat().st_size,'sha256':sha_file(f)})
                    enc=json.dumps(items,sort_keys=True,separators=(',',':')).encode()
                    if len(items)!=out.get('fileCount') or sha_bytes(enc)!=out.get('manifestSha256'): bad_outputs.append(f'{key}:{out.get("path")}:manifest')
            else: bad_outputs.append(f'{key}:unknown_output')
        # Tool-specific semantic completion checks.
        pr=r.get('parsedResult',{})
        if tool=='slither' and not (pr.get('jsonSuccess') is True and isinstance(pr.get('detectorCount'),int) and pr.get('error') is None): bad_rows.append(f'{key}:slither_semantics')
        if tool=='semgrep' and not (pr.get('errorCount')==0 and isinstance(pr.get('resultCount'),int)): bad_rows.append(f'{key}:semgrep_semantics')
        if tool in ('solc','forge') and not (isinstance(pr.get('artifactFileCount'),int) and pr.get('artifactFileCount')>=1): bad_rows.append(f'{key}:artifact_semantics')
    v.check('rows-source-tool-identity-valid',not bad_rows,bad_rows[:30])
    v.check('rows-credit-boundary-valid',not credit_violations,credit_violations[:30])
    v.check('receipts-byte-bound',not bad_receipts,bad_receipts[:30])
    v.check('raw-outputs-byte-bound',not bad_raw,bad_raw[:30])
    v.check('tool-output-artifacts-byte-bound',not bad_outputs,bad_outputs[:30])
    # Cross-check ledger summary exactly from rows.
    completed=sum(r.get('officialExecutionCredit') is True for r in rows)
    findings=sum(r.get('terminalStatus')=='EXECUTED_FINDINGS' for r in rows)
    zero=sum(r.get('exitCode')==0 for r in rows)
    v.check('ledger-summary-recomputed',completed==ledger.get('completedOfficialExecutions')==200 and findings==ledger.get('findingsExecutions')==58 and zero==ledger.get('rawZeroExitExecutions')==158,{"completed":completed,"findings":findings,"zeroExit":zero})
    result=v.result()
    result.update({
      'schemaVersion':'velmere.pass36.a102r44p4.independent-official-artifact-verification.v1',
      'artifactProvenance':{'repository':'Zombieland1234/velmere1','pullRequest':3,'headSha':EXPECTED_HEAD_SHA,'workflowRunId':EXPECTED_RUN_ID,'jobId':EXPECTED_JOB_ID,'artifactId':EXPECTED_ARTIFACT_ID,'artifactZipSha256':EXPECTED_ARTIFACT_ZIP_SHA},
      'evidence':{'fileCount':m['fileCount'],'manifestSha256':sha_file(root/'EVIDENCE_FILE_MANIFEST.json'),'corpusSha256':sha_file(root/'evidence/CORPUS_MANIFEST.json'),'ledgerSha256':sha_file(root/'evidence/OFFICIAL_TOOL_EXECUTION_LEDGER.json'),'toolIdentitiesSha256':sha_file(root/'evidence/tool-identities.json')},
      'denominators':{'cases':50,'tools':4,'executions':200,'officialExecutionCredit':200,'findingsExecutions':58,'realAuditCredit':0,'customerCredit':0,'liveCredit':0},
    })
    text=json.dumps(result,indent=2,sort_keys=True)+"\n"
    if args.output: pathlib.Path(args.output).write_text(text,encoding='utf-8')
    print(text,end='')
    return 0 if result['status']=='PASS' else 1

if __name__=='__main__': raise SystemExit(main())
