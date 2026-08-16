from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

TARGET='lib/security/pro-audit-pdf/render-pro-audit-pdf.ts'
BEFORE_SHA='a56db4cd454878c84516efa6bbc07f51d0d8f995b7311e58e35a77d4993a20a9'
AFTER_SHA='9e1f16f519dd5166fdacdb070dea6aa39dd6d7f7688e7aee065f069e18311530'
AFTER_BYTES=46990
EXPECTED_FILE_COUNT=1597
EXPECTED_PAYLOAD=20953477
EXPECTED_PATHSET='b8d9b3c275e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
EXPECTED_AGG='e643dfcc3bc08d5bac89f97aab4cabbaff7d23b36f2ef04d147d9eec609a97d0'

REPL=[
('type PaidAuditTier = Extract<AuditTierId, "pro" | "advanced">;\ntype Locale = "pl" | "en" | "de";', 'type PaidAuditTier = Extract<AuditTierId, "pro" | "advanced">;\ntype AuditPdfTier = AuditTierId;\ntype Locale = "pl" | "en" | "de";'),
('  tier?: PaidAuditTier;\n};\n\ntype ValidatedAuditPdfRenderInput = Omit<ProAuditPdfRenderInput, "tier"> & { tier: PaidAuditTier };', '  tier?: AuditPdfTier;\n};\n\ntype ValidatedAuditPdfRenderInput = Omit<ProAuditPdfRenderInput, "tier"> & { tier: AuditPdfTier };'),
('  tier: PaidAuditTier;\n  generatedAt: string;', '  tier: AuditPdfTier;\n  generatedAt: string;'),
('  const tier = input.tier === "advanced" ? "advanced" : "pro";', '  const tier = input.tier === "basic" || input.tier === "advanced" ? input.tier : "pro";'),
('export function assertProAuditPdfPaidCompleteness(snapshot: ProAuditPdfSnapshot) {\n  const minimumUpstreams', 'export function assertProAuditPdfPaidCompleteness(snapshot: ProAuditPdfSnapshot) {\n  if (snapshot.tier === "basic") return;\n  const minimumUpstreams'),
('  const tier = input.tier === "pro" || input.tier === "advanced" ? input.tier : null;', '  const tier = input.tier === "basic" || input.tier === "pro" || input.tier === "advanced" ? input.tier : null;'),
('function localizedCopy(locale: Locale, tier: PaidAuditTier) {', 'function localizedCopy(locale: Locale, tier: AuditPdfTier) {'),
('    title: `VELMÈRE ${tier === "advanced" ? "ADVANCED" : "PRO"} AUDYT`,\n    subtitle: tier === "advanced" ? "Rozszerzony automatyczny raport informacyjny" : "Rozszerzony automatyczny raport dowodowy",', '    title: `VELMÈRE ${tier === "advanced" ? "ADVANCED" : tier === "pro" ? "PRO" : "BASIC"} AUDYT`,\n    subtitle: tier === "advanced" ? "Rozszerzony automatyczny raport informacyjny" : tier === "pro" ? "Rozszerzony automatyczny raport dowodowy" : "Automatyczny raport wstępnego audytu",'),
('    title: `VELMÈRE ${tier === "advanced" ? "ADVANCED" : "PRO"} AUDIT`,\n    subtitle: tier === "advanced" ? "Erweiterter automatisierter Informationsbericht" : "Erweiterter automatisierter Evidenzbericht",', '    title: `VELMÈRE ${tier === "advanced" ? "ADVANCED" : tier === "pro" ? "PRO" : "BASIC"} AUDIT`,\n    subtitle: tier === "advanced" ? "Erweiterter automatisierter Informationsbericht" : tier === "pro" ? "Erweiterter automatisierter Evidenzbericht" : "Automatisierter Audit-Vorprüfbericht",'),
('    title: `VELMERE ${tier === "advanced" ? "ADVANCED" : "PRO"} AUDIT`,\n    subtitle: tier === "advanced" ? "Extended automated informational report" : "Extended automated evidence report",', '    title: `VELMERE ${tier === "advanced" ? "ADVANCED" : tier === "pro" ? "PRO" : "BASIC"} AUDIT`,\n    subtitle: tier === "advanced" ? "Extended automated informational report" : tier === "pro" ? "Extended automated evidence report" : "Automated audit prescreen report",'),
('    footer: `${snapshot.tier.toUpperCase()} automated informational analysis | Not manually QA-checked, independently certified or guaranteed safe`,', '    footer: snapshot.tier === "basic"\n      ? "BASIC automated informational prescreen | Not independently certified or guaranteed safe"\n      : `${snapshot.tier.toUpperCase()} automated informational analysis | Not manually QA-checked, independently certified or guaranteed safe`,'),
('    `Paid evidence readiness: ${tier === "advanced" ? (advancedReady ? "ready for automated advanced delivery checks" : "blocked pending evidence") : (proReady ? "ready" : "blocked pending evidence")}`,', '    tier === "basic"\n      ? "Basic evidence boundary: informational prescreen; missing or unavailable evidence remains explicit."\n      : `Paid evidence readiness: ${tier === "advanced" ? (advancedReady ? "ready for automated advanced delivery checks" : "blocked pending evidence") : (proReady ? "ready" : "blocked pending evidence")}`,'),
]

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()

def patch_source(root:Path):
    p=root/TARGET
    b=p.read_bytes()
    if sha(b)!=BEFORE_SHA: raise SystemExit(f'before hash mismatch {sha(b)}')
    s=b.decode('utf-8')
    for old,new in REPL:
        n=s.count(old)
        if n!=1: raise SystemExit(f'replacement count {n} for {old[:80]!r}')
        s=s.replace(old,new)
    out=s.encode('utf-8')
    if len(out)!=AFTER_BYTES or sha(out)!=AFTER_SHA: raise SystemExit(f'after identity mismatch bytes={len(out)} sha={sha(out)}')
    p.write_bytes(out)

def patch_manifest(src:Path,dst:Path):
    m=json.loads(src.read_text(encoding='utf-8'))
    rows=m['files']
    target=[r for r in rows if r['path']==TARGET]
    if len(target)!=1: raise SystemExit('target manifest row missing/duplicate')
    r=target[0]
    if r['byteLength']!=46347 or r['sha256']!=BEFORE_SHA: raise SystemExit('manifest target before mismatch')
    r['byteLength']=AFTER_BYTES; r['sha256']=AFTER_SHA
    p=m['projection']; p['payloadBytes']=EXPECTED_PAYLOAD; p['sourceContentAggregateSha256']=EXPECTED_AGG
    m['schemaVersion']='velmere.p66.exact-current-build-relevant-projection.v1'
    m['classification']='CURRENT_SOURCE_EXACT_BUILD_RELEVANT_PROJECTION_WITH_P66_AUDIT_PDF_DELTA_NOT_FULL_SOURCE'
    m['p66Delta']={'path':TARGET,'beforeSha256':BEFORE_SHA,'afterSha256':AFTER_SHA,'afterByteLength':AFTER_BYTES,'ownerTopologyChange':'Audit Basic/Pro/Advanced customer-facing PDF artifact support; PDF is not a standalone product family'}
    m['truthBoundary']='P66 exact Windows engineering proof for the 1597-file build-relevant projection with one customer-output source delta. No final customer, current-data, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'
    if len(rows)!=EXPECTED_FILE_COUNT: raise SystemExit('file count mismatch')
    pathset=hashlib.sha256('\n'.join(x['path'] for x in rows).encode()).hexdigest()
    agg=hashlib.sha256(); payload=0
    for x in rows:
        payload+=x['byteLength']; agg.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
    if pathset!=EXPECTED_PATHSET or payload!=EXPECTED_PAYLOAD or agg.hexdigest()!=EXPECTED_AGG: raise SystemExit(f'manifest aggregate mismatch {pathset} {payload} {agg.hexdigest()}')
    dst.parent.mkdir(parents=True,exist_ok=True)
    dst.write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')

ap=argparse.ArgumentParser(); ap.add_argument('--source-root',required=True); ap.add_argument('--manifest',required=True); ap.add_argument('--output-manifest',required=True)
a=ap.parse_args(); root=Path(a.source_root); patch_source(root); patch_manifest(Path(a.manifest),Path(a.output_manifest))
print(json.dumps({'status':'PASS_P66_PATCH_AND_MANIFEST','target':TARGET,'sha256':AFTER_SHA,'bytes':AFTER_BYTES,'fileCount':EXPECTED_FILE_COUNT,'payloadBytes':EXPECTED_PAYLOAD,'pathSetSha256':EXPECTED_PATHSET,'aggregateSha256':EXPECTED_AGG},indent=2))
