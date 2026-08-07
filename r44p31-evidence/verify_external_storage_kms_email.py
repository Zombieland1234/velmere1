#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,os,pathlib

R=os.environ['VELMERE_SOURCE_REVISION_ID']; M=os.environ['VELMERE_SOURCE_MANIFEST_SHA256']; A=os.environ['VELMERE_SOURCE_AGGREGATE_SHA256']
D=pathlib.Path(os.environ.get('VELMERE_EVIDENCE_DIR','evidence')).resolve(); C='EXTERNAL_CI_LOCALSTACK_STORAGE_KMS_EMAIL_ONLY'
IDS=['private-object','signed-url-short-lived','wrong-account-denied','kms-context-bound','ciphertext-at-rest','disposable-email-recipient','provider-delivery-not-inbox-proof','cleanup-success-path','cleanup-failure-path','secrets-redacted']
B={'revisionId':R,'sourceManifestSha256':M,'sourceAggregateSha256':A}; checks=[]
def add(i,o,d=None): checks.append({'id':i,'ok':bool(o),'detail':d})
def load(p): return json.loads(p.read_text(encoding='utf-8'))
def digest(b): return hashlib.sha256(b).hexdigest()
L=load(D/'R44P31_EXTERNAL_CI_STORAGE_KMS_EMAIL_LEDGER.json'); I=load(D/'R44P31_ARTIFACT_INDEX.json')
add('ledger',L.get('classification')==C and L.get('sourceBinding')==B and [L.get(x) for x in ['required','executed','passed','failed']]==[10,10,10,0] and L.get('requiredCaseIds')==IDS)
T=L.get('truthBoundary',{}); add('credits',all(T.get(k) is False for k in ['productionCredit','saleCredit','liveCredit','customerCredit','awsCredit','sesCredit']))
rows=[]
for n,cid in enumerate(IDS,1):
 p=D/'cases'/f'{n:02d}-{cid}.json'; r=load(p); rows.append(r); t=r.get('truthBoundary',{})
 add(f'case:{cid}',r.get('caseId')==cid and r.get('classification')==C and r.get('sourceBinding')==B and r.get('passed') is True and r.get('observedOutcome')=='PASS' and all(t.get(k) is False for k in ['productionCredit','saleCredit','liveCredit','customerCredit','externalProviderProductionCredit']))
F={r['caseId']:r['facts'] for r in rows}
add('semantic:private',F['private-object'].get('authorizedRead') is True and F['private-object'].get('invalidCredentialStatus') in [401,403,404] and all(F['private-object'].get('publicAccessBlock',{}).values()) and F['private-object'].get('unsignedRawHttpEnforcementCredit') is False and F['private-object'].get('creditBasis')=='SIGNED_CREDENTIAL_DENIAL_AND_PUBLIC_ACCESS_CONFIGURATION_ONLY' and F['private-object'].get('rawInvalidUrlStored') is False)
add('semantic:url',F['signed-url-short-lived'].get('expiresInSeconds')==5 and F['signed-url-short-lived'].get('immediateStatus')==200 and F['signed-url-short-lived'].get('expiredStatus')!=200 and F['signed-url-short-lived'].get('rawUrlStored') is False)
add('semantic:account',F['wrong-account-denied'].get('denied') is True and F['wrong-account-denied'].get('accountsDistinct') is True and F['wrong-account-denied'].get('ownerAccountHash')!=F['wrong-account-denied'].get('requestingAccountHash'))
add('semantic:kms',F['kms-context-bound'].get('correctContextDecrypt') is True and F['kms-context-bound'].get('wrongContextDenied') is True and F['kms-context-bound'].get('contextSha256')!=F['kms-context-bound'].get('wrongContextSha256'))
add('semantic:cipher',F['ciphertext-at-rest'].get('storedBytes',0)>0 and F['ciphertext-at-rest'].get('ciphertextDiffersFromPlaintext') is True and F['ciphertext-at-rest'].get('plaintextMarkerAbsent') is True and F['ciphertext-at-rest'].get('storedSha256')!=F['ciphertext-at-rest'].get('plaintextSha256'))
add('semantic:recipient',F['disposable-email-recipient'].get('smtpAccepted') is True and str(F['disposable-email-recipient'].get('recipient','')).endswith('@example.test') and F['disposable-email-recipient'].get('realCustomerAddress') is False)
add('semantic:inbox',F['provider-delivery-not-inbox-proof'].get('smtpProviderAccepted') is True and F['provider-delivery-not-inbox-proof'].get('providerAcceptanceAutomaticallyGrantsInboxProof') is False and F['provider-delivery-not-inbox-proof'].get('independentMailpitInboxObserved') is True)
add('semantic:cleanup-success',F['cleanup-success-path'].get('successObjectAbsent') is True and F['cleanup-success-path'].get('kmsKeyState')=='Disabled')
add('semantic:cleanup-failure',F['cleanup-failure-path'].get('intentionalFailureTriggered') is True and F['cleanup-failure-path'].get('failureObjectAbsent') is True)
add('semantic:redaction',F['secrets-redacted'].get('secretPatternHits')==0 and all(F['secrets-redacted'].get(k) is False for k in ['rawPresignedUrlStored','rawPlaintextStored','rawApplicationSecretStored']))
add('index-header',I.get('classification')==C and I.get('sourceBinding')==B)
seen=set()
for x in I.get('artifacts',[]):
 rel=str(x.get('path','')); p=(D/rel).resolve(); ok=D in p.parents and p.is_file() and rel not in seen and not rel.startswith('/') and '..' not in pathlib.PurePosixPath(rel).parts
 add(f'artifact:{rel}',ok and p.stat().st_size==x.get('byteLength') and digest(p.read_bytes())==x.get('sha256')); seen.add(rel)
add('all-cases-indexed',{f'cases/{i+1:02d}-{c}.json' for i,c in enumerate(IDS)}.issubset(seen))
fail=[x for x in checks if not x['ok']]; out={'schemaVersion':'velmere.pass36.a102r44p31.independent-external-storage-kms-email-verification.v1','status':'PASS' if not fail else 'FAIL','classification':C,'checks':len(checks),'passed':len(checks)-len(fail),'failed':len(fail),'failures':fail,'sourceBinding':B,'truthBoundary':{'productionCredit':False,'saleCredit':False,'liveCredit':False,'awsCredit':False,'sesCredit':False}}
(D.parent/'R44P31_INDEPENDENT_EXTERNAL_CI_VERIFICATION.json').write_text(json.dumps(out,indent=2,sort_keys=True)+'\n',encoding='utf-8'); print(json.dumps(out,sort_keys=True)); raise SystemExit(bool(fail))
