from __future__ import annotations
import hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
P64=pathlib.Path('/mnt/data/velmere_recover/p64_work')
P65=ROOT; OUT=ROOT/'artifacts/closure/p65'; W=OUT/'windows'
V16='67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9'
P64ZIP='4c15de60c644236f271d2000cd5063aa524b9860afc624a984acf9b610325abb'

def shab(b): return hashlib.sha256(b).hexdigest()
def sha(p): return shab(pathlib.Path(p).read_bytes())
def load(p): return json.loads(pathlib.Path(p).read_text(encoding='utf-8-sig'))
def write(name,obj):
 p=OUT/name; b=(json.dumps(obj,indent=2,sort_keys=True,ensure_ascii=False)+'\n').encode();p.write_bytes(b);return {'path':str(p.relative_to(ROOT)).replace('\\','/'),'bytes':len(b),'sha256':shab(b)}
def filemap(root): return {p.relative_to(root).as_posix():p for p in root.rglob('*') if p.is_file()}
# Parent preservation - exact current P64 handoff bytes remain untouched.
a=filemap(P64); b=filemap(P65); missing=sorted(set(a)-set(b)); changed=[]
for r in sorted(set(a)&set(b)):
 pa,pb=a[r],b[r]
 if pa.stat().st_size!=pb.stat().st_size or sha(pa)!=sha(pb): changed.append(r)
added=sorted(set(b)-set(a))
parent={
 'schemaVersion':'velmere.p65.parent-p64-byte-preservation.v1','generatedAt':'2026-08-16T15:15:00.000Z','parentRevision':'P64/V16','parentZipSha256':P64ZIP,
 'parentFileCount':len(a),'byteIdentical':len(a)-len(missing)-len(changed),'missingFiles':missing,'changedWithinParentScope':changed,'p65AddedFilesAtReceiptTime':len(added),
 'status':'PASS_ALL_P64_PARENT_FILES_BYTE_IDENTICAL' if not missing and not changed else 'FAIL_PARENT_PRESERVATION',
 'truthBoundary':'P65 adds source-rights/current-source decision controls and physical current-source receipts only; no P64 parent byte is modified.'}
parent_ref=write('P65_PARENT_P64_BYTE_PRESERVATION.json',parent)
if missing or changed: raise SystemExit('parent preservation failed')
# P46 exact identity is inherited because all P64 parent bytes are preserved.
p46prev=load(P64/'artifacts/closure/p64/P64_EXACT_P46_PROJECTION_RETENTION.json')
p46={
 'schemaVersion':'velmere.p65.exact-p46-projection-retention.v1','generatedAt':'2026-08-16T15:15:00.000Z','parentRevision':'P64/V16',
 'fileCount':p46prev['fileCount'],'payloadBytes':p46prev['payloadBytes'],'pathSetSha256':p46prev['pathSetSha256'],'sourceContentAggregateSha256':p46prev['sourceContentAggregateSha256'],
 'p65MutationsWithinP64ParentScope':0,'status':'PASS_EXACT_P46_PROJECTION_UNCHANGED_BY_P65_EVIDENCE_ONLY_ADDITIONS',
 'truthBoundary':'Exact 1597-file P46 projection is inherited through 7465/7465 P64 parent byte preservation. No new dual-build credit is claimed.'}
p46_ref=write('P65_EXACT_P46_PROJECTION_RETENTION.json',p46)
# Source change classification.
classification={
 'schemaVersion':'velmere.p65.source-change-classification.v1','generatedAt':'2026-08-16T15:15:00.000Z','revision':'P65/V16',
 'parentP64Files':len(a),'parentBytesChanged':0,'parentFilesMissing':0,
 'newControlRoots':['config/p65/','scripts/p65/','p65-windows/','.github/workflows/p65-current-free-legal-source-receipts.yml','artifacts/closure/p65/'],
 'customerFacingSourceMutationCount':0,'catalogMutationCount':0,'pricingMutationCount':0,'productionDataAdapterMutationCount':0,
 'changeClass':'EVIDENCE_POLICY_AND_CURRENT_SOURCE_RECEIPT_CONTROLS_ONLY',
 'status':'PASS_NO_P64_CUSTOMER_FACING_SOURCE_MUTATION',
 'truthBoundary':'P65 does not claim the new evidence policy as a production customer feature. It records source capability, current observations and fail-closed decisions.'}
class_ref=write('P65_SOURCE_CHANGE_CLASSIFICATION.json',classification)
# Current -> target -> gap for 17 real customer rows.
dec=load(OUT/'P65_CURRENT_SOURCE_DECISION_RECEIPTS.json')
by={x['productSku']:x for x in dec['customerRows']}
rows=[]
all_rows=['Audit Basic','Audit Pro','Audit Advanced','PDF Basic','PDF Pro','PDF Advanced','Browser Basic','Browser Pro','Browser Advanced','Shield','Shield Pro','Shield Map','Real Markets','Market Impact','Whale Watch','Angel','Risk Indicator']
for sku in all_rows:
 if sku in by:
  x=by[sku]; current=f"CURRENT_SOURCE_DECISION={x['decision']} / FINAL=WITHHELD"
  done='physical official-source/terms receipt + fail-closed current-source decision'
  nexta={'Audit Basic':'real customer contract/source/bytecode/tools/labels rights binding','Audit Pro':'same + matched Basic→Pro material delta','Audit Advanced':'same + matched Pro→Advanced delta + real human-review evidence','Real Markets':'lawful current cross-asset quote/history/corporate-actions/crypto provider set beyond ECB FX reference','Market Impact':'lawful current order-book/depth + multi-venue model evidence','Whale Watch':'lawful current chain/indexer + verified labels + finality/cluster ground truth'}[sku]
 else:
  current='P64_BASELINE_CAPTURE_ONLY / FINAL=WITHHELD'; done='P64 baseline preserved'; nexta='product-specific current source/right/freshness/output closure'
 rows.append({'productSku':sku,'current':current,'target':'100% INTERNAL_PRODUCT_CLOSURE for supported scope','gap':'OPEN' if sku not in by else 'DECISION_CLOSED_OUTPUT_OPEN','actionCompletedP65':done,'testResult':'PASS_BOUNDED_DECISION' if sku in by else 'UNCHANGED_BASELINE','nextAction':nexta})
gap={'schemaVersion':'velmere.p65.current-target-gap.v1','revision':'P65/V16','generatedAt':'2026-08-16T15:15:00.000Z','customerRows':rows,
 'global':{'customerSourceDecisionReceipts':'6/17','customerFinalOutputs':'0/17','profileSourceDecisionReceipts':'12/33','profileFinalOutputs':'0/33','targetFieldAdjudication':'74/74 target slice','legalSourceFieldsPassed':'0/176','paidDeltas':'0/6','saleEligible':'0/17'},
 'truthBoundary':'Decision coverage is not product closure. Remaining gaps stay explicit.'}
gap_ref=write('P65_CURRENT_TARGET_GAP.json',gap)
# Source identity binds preserved parent plus current evidence receipts.
source_identity={
 'schemaVersion':'velmere.p65.current-source-identity.v1','generatedAt':'2026-08-16T15:15:00.000Z','revision':'P65/V16','parentRevision':'P64/V16','parentZipSha256':P64ZIP,
 'parentBytePreservation':parent_ref,'exactP46Retention':p46_ref,'sourceChangeClassification':class_ref,
 'customerFacingSourceMutationCount':0,'currentSourceReceiptControlsAdded':True,
 'status':'PASS_P64_SOURCE_BYTES_PRESERVED_P65_CONTROL_ADDITIONS_BOUND',
 'truthBoundary':'P65 current identity preserves all P64 bytes and binds new evidence-only control files. Package-level identity is frozen separately by the P65 package manifest.'}
source_ref=write('P65_SOURCE_IDENTITY.json',source_identity)
# Current authority.
receipt_files=['P65_CURRENT_SOURCE_REVIEW_MATRIX.json','P65_CURRENT_SOURCE_DECISION_RECEIPTS.json','P65_CURRENT_OBSERVATION_SUMMARY.json','P65_TARGET_FIELD_ADJUDICATION.json','P65_CURRENT_SOURCE_VERIFIER.json','P65_INDEPENDENT_CURRENT_SOURCE_VERIFIER.json','windows/P65_CURRENT_OFFICIAL_SOURCE_FETCH_RECEIPT.json','windows/P65_CURRENT_OFFICIAL_SOURCE_NORMALIZED.json','windows/P65_EXACT_WINDOWS_CURRENT_SOURCE_RECEIPT.json','P65_CURRENT_TARGET_GAP.json','P65_PARENT_P64_BYTE_PRESERVATION.json','P65_EXACT_P46_PROJECTION_RETENTION.json','P65_SOURCE_IDENTITY.json']
binds=[]
for rel in receipt_files:
 p=OUT/rel; binds.append({'path':'artifacts/closure/p65/'+rel.replace('\\','/'),'bytes':p.stat().st_size,'sha256':sha(p)})
auth={
 'schemaVersion':'velmere.p65.current-authority.v1','revision':'P65/V16','generatedAt':'2026-08-16T15:15:00.000Z',
 'ownerDirective':{'name':'VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt','sha256':V16,'status':'CURRENT_BOUND_UNCHANGED'},
 'parent':{'revision':'P64/V16','zipSha256':P64ZIP,'preservation':f"{parent['byteIdentical']}/{parent['parentFileCount']} byte-identical"},
 'currentReceiptBindings':binds,
 'currentReceiptCredit':{'targetFieldsAdjudicated':'74/74 P65 target slice DECISION_ONLY','customerRowsCurrentSourceDecisionReceipt':'6/17','internalProfilesCurrentSourceDecisionReceipt':'12/33','currentOfficialDataEndpointsFetched':'3','boundedEngineeringSourceRightsDecisions':'5 source classes'},
 'withheld':{'customerFinalOutputs':'0/17','profileFinalOutputs':'0/33','legalSourceFieldsPassed':'0/176','materialPaidDeltas':'0/6','saleEligible':'0/17'},
 'release':{'global':'NO_GO','goInternal':False,'pilotReady':False,'goPaidRows':'0/17','live':False,'worldClassProven':False},
 'status':'CURRENT_BOUND_P65_CURRENT_SOURCE_DECISIONS_NO_FINAL_PROMOTION',
 'truthBoundary':'P65 closes source/fallback decision receipts only for the selected 4-family slice. It does not promote final outputs, legal-field credit, value, sale, LIVE or WORLD_CLASS.'}
auth_ref=write('P65_CURRENT_AUTHORITY.json',auth)
print(json.dumps({'parentPreserved':f"{parent['byteIdentical']}/{parent['parentFileCount']}",'addedAtReceipt':len(added),'p46':p46['fileCount'],'gapRows':len(rows),'authorityBindings':len(binds)},indent=2))
