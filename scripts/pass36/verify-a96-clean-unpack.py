#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, subprocess, sys, time

REV = "VELMERE_PASS36_A96R0_RLS_19_CASE_EXECUTABLE_REPLAY_AND_CUSTOMER_ARTIFACT_USER_CLIENT_BOUNDARY"
MANIFEST_REL = "_velmere/PASS36_A96R0_SOURCE_ONLY_MANIFEST.json"
MAX_OUTPUT = 32 * 1024 * 1024

def sha(data: bytes) -> str: return hashlib.sha256(data).hexdigest()
def canonical(value) -> bytes: return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8')
def safe_name(value: str) -> str: return ''.join(c if c.isalnum() or c in '-_.' else '_' for c in value)

def source_excluded(rel: str) -> bool:
    top=rel.split('/',1)[0]
    if top in {'.git','.velmere','.next','.turbo','_velmere','artifacts','coverage','node_modules','dist','out','.cache','cache'} or top.startswith('.next-'): return True
    segments=rel.split('/')
    base=rel.rsplit('/',1)[-1]
    if '__pycache__' in segments or base.endswith('.pyc'): return True
    if base=='.env' or base.startswith('.env.'): return True
    if base=='.eslintcache' or base.endswith('.tsbuildinfo'): return True
    if base.endswith('.log') and rel!='fixtures/pass35/a42/windows-global-json-crash.log': return True
    if base.endswith(('.db','.sqlite','.sqlite3')): return True
    return False

def verify_manifest(root: pathlib.Path):
    path=root/MANIFEST_REL
    manifest=json.loads(path.read_text(encoding='utf-8'))
    core=dict(manifest); declared=core.pop('manifestSha256',None)
    checks=[]
    checks.append(('manifest_self_hash', declared==sha(canonical(core)), {'declared':declared,'actual':sha(canonical(core))}))
    checks.append(('manifest_revision',manifest.get('revisionId')==REV,manifest.get('revisionId')))
    checks.append(('manifest_action_required',manifest.get('checkpointClass')=='ACTION_REQUIRED_NON_PASS' and manifest.get('completedThrough')==89,None))
    checks.append(('manifest_no_promotion',manifest.get('a90ToA96PassCredit') is False and manifest.get('exactReleaseCredit') is False and manifest.get('globalDecision')=='NO_GO' and manifest.get('live') is False and manifest.get('saleEnabled') is False and manifest.get('productionApproved') is False and manifest.get('worldClassProven') is False,None))
    entries=manifest.get('entries') if isinstance(manifest.get('entries'),list) else []
    rows=[]; failures=[]
    for entry in entries:
        rel=entry.get('path'); p=root/rel
        if not isinstance(rel,str) or rel.startswith('/') or '\\' in rel or any(seg in ('','.','..') for seg in rel.split('/')):
            failures.append({'path':rel,'reason':'unsafe_path'}); continue
        if not p.is_file() or p.is_symlink(): failures.append({'path':rel,'reason':'missing_or_not_regular'}); continue
        data=p.read_bytes(); mode=0o100755 if os.stat(p).st_mode & 0o111 else 0o100644
        actual={'path':rel,'byteLength':len(data),'sha256':sha(data),'mode':mode}; rows.append(actual)
        if actual != entry: failures.append({'path':rel,'reason':'metadata_or_bytes_mismatch','declared':entry,'actual':actual})
    actual_paths={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and not p.is_symlink() and p.relative_to(root).as_posix()!=MANIFEST_REL and not source_excluded(p.relative_to(root).as_posix())}
    declared_paths={e.get('path') for e in entries if isinstance(e,dict)}
    unexpected=sorted(actual_paths-declared_paths); missing=sorted(declared_paths-actual_paths)
    checks.append(('manifest_entries_exact',not failures,failures[:30]))
    checks.append(('manifest_exact_path_set',not unexpected and not missing,{'unexpected':unexpected[:30],'missing':missing[:30]}))
    rows.sort(key=lambda r:r['path'])
    pathset=sha('\n'.join(r['path'] for r in rows).encode())
    aggregate=sha('\n'.join(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\0{r['mode']}" for r in rows).encode())
    checks.append(('manifest_count',manifest.get('fileCount')==len(rows),{'declared':manifest.get('fileCount'),'actual':len(rows)}))
    checks.append(('manifest_bytes',manifest.get('byteLength')==sum(r['byteLength'] for r in rows),None))
    checks.append(('manifest_pathset',manifest.get('pathSetSha256')==pathset,None))
    checks.append(('manifest_aggregate',manifest.get('aggregateSha256')==aggregate,None))
    return manifest, checks

def run_step(root: pathlib.Path, receipt_dir: pathlib.Path, index: int, step: dict):
    start=time.monotonic(); env={'PATH':os.environ.get('PATH',''),'LANG':'C.UTF-8','LC_ALL':'C.UTF-8','TZ':'UTC','CI':'1','NO_COLOR':'1','NODE_ENV':'test','VELMERE_A96_CLEAN_UNPACK':'1','VELMERE_A95_NO_WRITE':'1'}
    result={'index':index,'id':step['id'],'command':step['cmd'],'timeoutSeconds':step.get('timeout',300)}
    try:
        cp=subprocess.run(step['cmd'],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=step.get('timeout',300),check=False)
        stdout=cp.stdout[:MAX_OUTPUT]; stderr=cp.stderr[:MAX_OUTPUT]
        result.update({'exitCode':cp.returncode,'timedOut':False,'stdoutTruncated':len(cp.stdout)>MAX_OUTPUT,'stderrTruncated':len(cp.stderr)>MAX_OUTPUT})
    except subprocess.TimeoutExpired as exc:
        stdout=(exc.stdout or b'')[:MAX_OUTPUT]; stderr=(exc.stderr or b'')[:MAX_OUTPUT]
        result.update({'exitCode':None,'timedOut':True,'stdoutTruncated':False,'stderrTruncated':False})
    stdout_path=receipt_dir/f"{index:02d}-{safe_name(step['id'])}.stdout.log"; stderr_path=receipt_dir/f"{index:02d}-{safe_name(step['id'])}.stderr.log"
    stdout_path.write_bytes(stdout); stderr_path.write_bytes(stderr)
    result.update({'elapsedMs':int((time.monotonic()-start)*1000),'stdoutBytes':len(stdout),'stderrBytes':len(stderr),'stdoutSha256':sha(stdout),'stderrSha256':sha(stderr),'stdoutLog':stdout_path.name,'stderrLog':stderr_path.name})
    expected=step.get('expectedStatus'); parsed=None
    try: parsed=json.loads(stdout.decode('utf-8').strip())
    except Exception: parsed=None
    result['parsedStatus']=parsed.get('status') if isinstance(parsed,dict) else None
    passed=result['exitCode']==0 and not result['timedOut'] and not result['stdoutTruncated'] and not result['stderrTruncated']
    if expected is not None: passed=passed and result['parsedStatus']==expected
    if step.get('a58'):
        passed=passed and isinstance(parsed,dict) and str(parsed.get('status','')).startswith('PASS') and parsed.get('summary',{}).get('blockingFailed')==0 and parsed.get('promotionAllowed') is False and parsed.get('saleEnabled') is False and parsed.get('liveProven') is False
    result['passed']=bool(passed)
    return result

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--receipt-dir',required=True); args=ap.parse_args()
    root=pathlib.Path.cwd().resolve(); receipt_dir=pathlib.Path(args.receipt_dir).resolve(); receipt_dir.mkdir(parents=True,exist_ok=True)
    manifest,before_checks=verify_manifest(root)
    steps=[
      {'id':'a58_release_integrity_literal_first_child','cmd':['node','scripts/pass36/verify-a58-release-integrity.mjs'],'expectedStatus':'PASS_RELEASE_INTEGRITY_NO_PROMOTION','a58':True,'timeout':420},
      {'id':'a96_authority_descendant','cmd':['node','scripts/pass36/verify-a96-action-required-authority.mjs'],'expectedStatus':'PASS_A96_ACTION_REQUIRED_AUTHORITY_NO_RLS_STAGING_CREDIT','timeout':360},
      {'id':'a96_rls_local_implementation','cmd':['node','scripts/pass36/verify-a96-rls-tenant-isolation.mjs'],'timeout':360},
      {'id':'a95_staging_subject_admission_historical_precondition','cmd':['node','scripts/pass36/verify-a95-staging-subject-admission.mjs'],'timeout':240},
      {'id':'route_ast_static_replay','cmd':['node','scripts/pass15/verify-route-export-ast-registry.mjs'],'expectedStatus':'PASS_ROUTE_EXPORT_AST_REGISTRY_STATIC_REPLAY_NO_REPARSE_CREDIT','timeout':180},
      {'id':'route_dispatch_full_denominator','cmd':['node','scripts/pass15/verify-route-dispatch-consolidation.mjs','--output',str(receipt_dir/'route-dispatch-verification.json')],'timeout':240},
      {'id':'lazy_route_shells','cmd':['node','scripts/pass15/verify-lazy-route-shells.mjs'],'timeout':180},
      {'id':'cross_surface_value_verifier','cmd':['node','scripts/pass36/verify-a94r2-cross-surface-value-truth.mjs'],'expectedStatus':'PASS_LOCAL_CROSS_SURFACE_VALUE_TRUTH_NO_PAID_OR_REAL_CREDIT','timeout':180},
      {'id':'retained_pdf_summary','cmd':['node','scripts/pass36/verify-a94r2-retained-pdf-summary.mjs'],'expectedStatus':'PASS_A94R2_RETAINED_PDF_SUMMARY_SYNTHETIC_ONLY_NO_SALE_CREDIT','timeout':120},
      {'id':'product_tier_contract','cmd':['node','scripts/pass35/test-product-tier-content-contract.mjs'],'timeout':240},
      {'id':'zero_budget_contract','cmd':['node','scripts/pass35/test-zero-budget-functional-roadmap.mjs'],'timeout':240},
      {'id':'source_integrity_audit','cmd':['node','scripts/a44-source-integrity-audit.mjs'],'timeout':600},
    ]
    results=[]
    for i,step in enumerate(steps,1):
        results.append(run_step(root,receipt_dir,i,step))
        if not results[-1]['passed']: break
    _,after_checks=verify_manifest(root)
    checks=[{'id':f'before:{i}','passed':ok,'detail':detail} for i,ok,detail in before_checks]+[{'id':f'after:{i}','passed':ok,'detail':detail} for i,ok,detail in after_checks]
    checks.append({'id':'a58_is_literal_first_child','passed':bool(results) and results[0]['id']=='a58_release_integrity_literal_first_child','detail':results[0]['id'] if results else None})
    checks.append({'id':'all_child_steps_passed','passed':len(results)==len(steps) and all(r['passed'] for r in results),'detail':{'executed':len(results),'required':len(steps),'failed':[r['id'] for r in results if not r['passed']]}})
    failures=[c for c in checks if not c['passed']]
    status='ACTION_REQUIRED_EXTERNAL_AND_EXACT_RELEASE_CLOSURE' if not failures else 'FAIL_A96R0_CLEAN_UNPACK_LOCAL_CONTRACT'
    receipt={'schemaVersion':'velmere.pass36.a96r0.clean-unpack-verification.v1','revisionId':REV,'status':status,'localContractPassed':not failures,'a58LiteralFirstChild':bool(results) and results[0]['id']=='a58_release_integrity_literal_first_child','sourceArchiveManifestSha256':manifest.get('manifestSha256'),'checks':len(checks),'passed':len(checks)-len(failures),'failed':len(failures),'failures':failures,'steps':results,'notExecutedOrNotCredited':[
      {'gate':'official_node_npm_archive_provenance','status':'NOT_PROVEN'},
      {'gate':'lockfile_dependency_cas','status':'0_OF_827_VERIFIED_IN_THIS_HANDOFF'},
      {'gate':'exact_playwright_chromium','status':'NOT_PROVEN'},
      {'gate':'exact_typecheck_lint_webpack_turbopack_next_start_playwright','status':'NOT_REEXECUTED_OR_CREDITED_BY_CLEAN_CONTROLLER'},
      {'gate':'a77r1_a80r1_exact_release','status':'NOT_EXECUTED'},
      {'gate':'staging_real_data_rights_legal_customer_assurance','status':'BLOCKED_EXTERNAL'},
    ],'globalDecision':'NO_GO','live':False,'saleEnabled':False,'productionApproved':False,'worldClassProven':False}
    out=receipt_dir/'PASS36_A96R0_CLEAN_UNPACK_RECEIPT.json'; out.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps(receipt,indent=2,ensure_ascii=False))
    return 0 if not failures else 1
if __name__=='__main__': raise SystemExit(main())
