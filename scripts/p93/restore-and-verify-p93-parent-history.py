#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PARENT_ZIP=Path('/mnt/data/VELMERE_R44P46_V17_P92R1_RISK_HISTORY_CUSTOMER_HOVER_EXPAND_SAFE_UI_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip')
PARENT_MANIFEST=Path('/mnt/data/P92_PARENT_FILE_HASHES_BEFORE_P93.tsv')
INTENTIONAL_PARENT_CHANGES={
 'components/market-integrity/RiskHistoryControl.tsx',
 'lib/db/schema.sql',
 'lib/market-integrity/risk-history-contract.ts',
 'lib/market-integrity/risk-ledger.ts',
 'lib/server/market-integrity-route-modules/history.ts',
 'VELMERE_ACTIVE_PASS.txt',
}
ALLOWED_NEW_PREFIXES=('artifacts/p93/','receipts/p93/','scripts/p93/')
ALLOWED_NEW_EXACT={
 'supabase/migrations/20260820000007_p93_risk_history_canonical_identity_public_resolution.sql',
 'tsconfig.p93-risk-history-server-targeted.json',
 'P93R1_PACKAGE_BUILD_RECIPE.json',
}
def sha_bytes(data:bytes): return hashlib.sha256(data).hexdigest()
def sha(path:Path): return sha_bytes(path.read_bytes())
parents={}
for line in PARENT_MANIFEST.read_text('utf-8').splitlines():
    if not line.strip(): continue
    digest,path=line.split(None,1); parents[path.removeprefix('./')]=digest
with zipfile.ZipFile(PARENT_ZIP) as archive:
    entries={item.filename:archive.read(item) for item in archive.infolist() if not item.is_dir()}
if set(entries)!=set(parents):
    raise RuntimeError(f'parent_manifest_zip_path_mismatch:{len(entries)}:{len(parents)}')
restored=[]
for relative,expected in parents.items():
    path=ROOT/relative
    current=sha(path) if path.is_file() else None
    if relative in INTENTIONAL_PARENT_CHANGES: continue
    if current!=expected:
        path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(entries[relative]); restored.append(relative)
# Remove unexpected new files, but never touch declared P93 output/source.
unexpected_new=[]
for path in ROOT.rglob('*'):
    if not path.is_file(): continue
    relative=path.relative_to(ROOT).as_posix()
    if relative in parents: continue
    if relative in ALLOWED_NEW_EXACT or relative.startswith(ALLOWED_NEW_PREFIXES): continue
    unexpected_new.append(relative)
# Verify exact history and intentional deltas.
remaining=[]
verified=0
for relative,expected in parents.items():
    path=ROOT/relative
    if relative in INTENTIONAL_PARENT_CHANGES: continue
    actual=sha(path) if path.is_file() else None
    if actual!=expected: remaining.append({'path':relative,'expected':expected,'actual':actual})
    else: verified+=1
intentional=[]
for relative in sorted(INTENTIONAL_PARENT_CHANGES):
    path=ROOT/relative
    before=parents[relative]; after=sha(path)
    if before==after: raise RuntimeError(f'intentional_change_missing:{relative}')
    intentional.append({'path':relative,'beforeSha256':before,'afterSha256':after,'afterBytes':path.stat().st_size})
if remaining or unexpected_new:
    raise RuntimeError(json.dumps({'remaining':remaining,'unexpectedNew':unexpected_new},indent=2))
receipt={
 'schemaVersion':'velmere.p93.parent-history-immutability.v1',
 'generatedAt':'2026-08-20T14:00:00.000Z',
 'status':'PASS_BYTE_IDENTICAL_PARENT_HISTORY_EXCEPT_DECLARED_P93_DELTA',
 'parentSourceOnly':{'name':PARENT_ZIP.name,'bytes':PARENT_ZIP.stat().st_size,'sha256':sha(PARENT_ZIP),'entries':len(entries)},
 'parentFilesVerifiedByteIdentical':verified,
 'restoredAfterRegression':{'count':len(restored),'paths':sorted(restored)},
 'intentionalParentChanges':intentional,
 'allowedNewFiles':sorted([p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and p.relative_to(ROOT).as_posix() not in parents]),
 'unexpectedNewFiles':[],
 'finalDifferencesOutsideDeclaredP93Delta':0,
 'truthBoundary':'Historical P92 bytes were restored from the exact parent ZIP after current-byte regression. Only the six declared P93 production/schema/control files and new P93 receipts, harnesses, migration and targeted config remain outside parent identity.',
}
for relative in ['receipts/p93/P93_PARENT_HISTORY_IMMUTABILITY.json','artifacts/p93/P93_PARENT_HISTORY_IMMUTABILITY.json']:
    target=ROOT/relative; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'verified':verified,'restored':receipt['restoredAfterRegression'],'intentionalChanges':len(intentional),'unexpectedNew':0},indent=2))
