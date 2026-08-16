from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

P66_FILE_COUNT=1597
P66_PAYLOAD=20956802
P66_PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'
P66_AGG='0778ac3f6ae71785495b8e6bbb228b30d8e3bb10ba73eb9de7d3da7f08a19cd3'
P68_PAYLOAD=20958924
P68_PATHSET=P66_PATHSET
P68_AGG='d4bddcf0df467142e022e59a0840c37695076be65acd6f29e5339e21a87c574c'
PATCHES={
'lib/security/audit-report-assembler.ts': {
  'beforeSha256':'1592120be048f1f96f08d971fe826376ccb97ab09999d1e4926d51ea21a84f71',
  'afterSha256':'f3b95f8d43d94ee6087b30a12814cbe78b6ed61bfe3dc186323fbc18af167438',
  'afterBytes':25026,
  'replacements':[
    ('      "Advanced queue only starts after server-side entitlement/payment proof",\n','      "Advanced remains automated-only: no human-review or operator-signoff claim may be introduced by a deeper tier",\n'),
    ('        slot: "advanced_manual_queue",\n','        slot: "advanced_automated_evidence_actions",\n'),
    ('        notes: "Do not expose full operator notes publicly; show only safe upgrade copy.",\n','        notes: "Expose only bounded automated evidence-resolution and retest actions; never imply human review or operator sign-off.",\n'),
    ('    (input.permissionParser?.summary.proRequired ?? 0) > 0 ? 1 : 0,\n','    0,\n'),
    ('    (input.liquidityHolderRisk?.summary.proRequired ?? 0) > 0 ? 1 : 0,\n','    0,\n'),
    ('      advancedAction: t(locale, "Odblokować brakujące klucze/provider fallback i powtórzyć runtime.", "Fehlende Keys/Fallbacks entsperren und Runtime wiederholen.", "Unlock missing keys/provider fallbacks and rerun runtime."),\n','      advancedAction: t(locale, "Przywrócić brakujące źródła/provider fallback i ponownie uruchomić evidence runtime.", "Fehlende Quellen/Provider-Fallbacks wiederherstellen und Evidence-Runtime erneut ausführen.", "Restore missing sources/provider fallbacks and rerun the evidence runtime."),\n'),
    ('      advancedAction: t(locale, "Przejść przez claimy partial/missing i wymusić second-source przed finalnym PDF.", "Partial/Missing Claims pruefen und Second-Source vor finalem PDF erzwingen.", "Review partial/missing claims and require second-source before final PDF."),\n','      advancedAction: t(locale, "Rozwiązać claimy partial/missing i związać drugi niezależny source przed finalnym PDF.", "Partial/Missing Claims auflösen und vor dem finalen PDF an eine zweite unabhängige Quelle binden.", "Resolve partial/missing claims and bind a second independent source before the final PDF."),\n'),
    ('      advancedAction: t(locale, "Odświeżyć stale/expired lane’y i nie podpisywać PDF na danych po TTL.", "Stale/Expired Lanes refreshen und PDF nicht nach TTL signieren.", "Refresh stale/expired lanes and do not sign a PDF on data past TTL."),\n','      advancedAction: t(locale, "Odświeżyć stale/expired lane’y i ponownie związać dowody przed artefaktem po TTL.", "Stale/Expired Lanes aktualisieren und die Evidenz nach TTL vor dem Artefakt erneut binden.", "Refresh stale/expired lanes and re-bind evidence before any artifact after TTL."),\n'),
    ('      advancedAction: t(locale, "Ręcznie sprawdzić owner/proxy/mint/freeze/blacklist/tax przed oceną końcową.", "Owner/Proxy/Mint/Freeze/Blacklist/Tax manuell vor Endbewertung pruefen.", "Manually verify owner/proxy/mint/freeze/blacklist/tax before final rating."),\n','      advancedAction: t(locale, "Odtworzyć owner/proxy/mint/freeze/blacklist/tax z source/ABI/bytecode i potwierdzić niezależnym evidence przed oceną końcową.", "Owner/Proxy/Mint/Freeze/Blacklist/Tax aus Source/ABI/Bytecode reproduzieren und vor der Endbewertung mit unabhängiger Evidenz bestätigen.", "Reproduce owner/proxy/mint/freeze/blacklist/tax from source/ABI/bytecode and confirm with independent evidence before the final rating."),\n'),
    ('      advancedAction: t(locale, "Manualnie zweryfikować top holders, LP custody, lock proof i deployer relation.", "Top Holders, LP Custody, Lock Proof und Deployer Relation manuell pruefen.", "Manually verify top holders, LP custody, lock proof and deployer relation."),\n','      advancedAction: t(locale, "Ponownie potwierdzić top holders, LP custody, lock proof i deployer relation na current source-bound evidence.", "Top Holders, LP Custody, Lock Proof und Deployer Relation anhand aktueller source-bound Evidenz erneut bestätigen.", "Revalidate top holders, LP custody, lock proof and deployer relation from current source-bound evidence."),\n'),
    ('  const advancedState = manualReview + blocked + missing > 0 ? "manual_review" : "ready";\n','  const advancedState = blocked > 0 ? "blocked" : missing > 0 ? "missing" : partial > 0 ? "partial" : "ready";\n'),
    ('      "PASS2578 składa wynik audytu z poprzednich silników w jeden kontrakt: Basic public, Pro PDF, Advanced manual queue.",\n      "PASS2578 baut aus den bisherigen Engines einen Audit-Vertrag: Basic public, Pro PDF, Advanced manual queue.",\n      "PASS2578 assembles prior engines into one audit contract: Basic public, Pro PDF, Advanced manual queue.",\n','      "PASS2578 składa wynik audytu w jeden kontrakt: Basic prescreen, Pro rozszerzony PDF, Advanced zautomatyzowany evidence/retest appendix bez human review.",\n      "PASS2578 baut das Audit in einen Vertrag: Basic Prescreen, erweitertes Pro-PDF und automatisierter Advanced Evidence/Retest-Anhang ohne Human Review.",\n      "PASS2578 assembles one audit contract: Basic prescreen, extended Pro PDF, and an automated Advanced evidence/retest appendix with no human review.",\n'),
    ('        `Advanced wymaga ${advancedQueue.length} działań manual review przed prywatnym werdyktem.`,\n        `Advanced braucht ${advancedQueue.length} Manual-Review Aktionen vor privatem Urteil.`,\n        `Advanced requires ${advancedQueue.length} manual-review actions before private verdict.`,\n','        `Advanced wymaga ${advancedQueue.length} zautomatyzowanych działań evidence-resolution/retest przed kompletnym werdyktem informacyjnym.`,\n        `Advanced benötigt ${advancedQueue.length} automatisierte Evidence-Resolution/Retest-Aktionen vor einem vollständigen informativen Urteil.`,\n        `Advanced requires ${advancedQueue.length} automated evidence-resolution/retest actions before a complete informational verdict.`,\n'),
  ],
},
'lib/security/audit-report-customer-projection.ts': {
  'beforeSha256':'606c4f19cd061970e3ce842ada10a29f5499b7629d2e359cfc3908f38a648bf1',
  'afterSha256':'35825487b6b5bbd90d3a1eeeb1a27a9c131d60fe5a8385509431e4a88c954b50',
  'afterBytes':5435,
  'replacements':[
    ('    advancedAction: safeLockedAction(locale),\n','    advancedAction: deliveredTier === "basic" ? safeLockedAction(locale) : clean(section.advancedAction),\n'),
    ('      advancedAction: safeLockedAction(report.locale),\n','      advancedAction: deliveredTier === "basic" ? safeLockedAction(report.locale) : clean(finding.advancedAction),\n'),
    ('  const advancedQueue: string[] = [];\n','  const advancedQueue: string[] = deliveredTier === "advanced"\n    ? report.advancedQueue.map((line) => clean(line, 900)).filter(Boolean).slice(0, 18)\n    : [];\n'),
    ('        .filter((slot) => slot.slot !== "advanced_manual_queue")\n','        .filter((slot) => deliveredTier === "advanced" || (slot.slot !== "advanced_manual_queue" && slot.slot !== "advanced_automated_evidence_actions"))\n'),
    ('    rule: "Customer projection never exposes Pro evidence to Basic and never exposes Advanced operator actions. Advanced is not for sale and human review is not included.",\n','    rule: "Customer projection never exposes Pro evidence to Basic and never exposes Advanced automated evidence actions below Advanced. Advanced remains not for sale and human review/operator sign-off are not included.",\n'),
  ],
},
'lib/security/audit-account-customer-snapshot.ts': {
  'beforeSha256':'650d2db723b2ad14f63a8468a331a902701fc3e65352d5905943de20f3588e58',
  'afterSha256':'3929e379b41a81c9fc38c68a517d861745a0220dc308069733e96d074a68f456',
  'afterBytes':17106,
  'replacements':[
    ('  const sections = unique(decisionSections.map((section) => `${section.title}: ${section.summary}`), 16);\n  const nextSteps = unique(decisionSections.flatMap((section) => section.actions), 16);\n','  const projectedFindings = pipeline.projection.report.topFindings.slice(0, 8);\n  const findingLines = projectedFindings.map((finding) => {\n    const detail = pipeline.deliveredTier === "basic" ? finding.publicLine : finding.proLine;\n    return `Finding [${finding.severity.toUpperCase()}] ${finding.title}: ${detail} | source=${finding.sourceFamily}`;\n  });\n  const findingActions = pipeline.deliveredTier === "basic"\n    ? []\n    : projectedFindings.map((finding) => `Finding action - ${finding.title}: ${finding.advancedAction}`);\n  const sourceTruthLines = [\n    `Source-bound provider receipts: ${pipeline.sourceTruth.providerReceiptCount}`,\n    `Content-bound current receipts: ${pipeline.sourceTruth.contentBoundProviderReceiptCount}`,\n    `Independent upstream roots: ${pipeline.sourceTruth.strictUpstreamRoots.length ? pipeline.sourceTruth.strictUpstreamRoots.join(", ") : "none"}`,\n  ];\n  const sections = unique([\n    ...decisionSections.map((section) => `${section.title}: ${section.summary}`),\n    ...findingLines,\n    ...sourceTruthLines,\n  ], 28);\n  const nextSteps = unique([...decisionSections.flatMap((section) => section.actions), ...findingActions], 24);\n'),
    ('    sections: unique([...sections, ...missingEvidence], 20),\n','    sections: unique([...sections, ...missingEvidence], 32),\n'),
  ],
},
'lib/server/security-route-modules/audit-report-assembler.ts': {
  'beforeSha256':'eae5402c2a99545549e5184270f88c18ee61739d3c9374d1152ddfdb87870e82',
  'afterSha256':'a2b3d3e9036a06de4213e309d49cea515e21aacc983280c2979ebaf341d07c1e',
  'afterBytes':11692,
  'replacements':[
    ('    customerBoundary: "The API returns only the allowed tier projection. Advanced is not for sale; legacy operator actions remain private and do not create customer entitlement or release proof.",\n','    customerBoundary: "The API returns only the allowed tier projection. Advanced is not for sale; deeper automated evidence/retest actions remain gated and do not create human-review, operator-signoff, certification, entitlement or release proof.",\n'),
  ],
},
}

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);a=ap.parse_args()
root=Path(a.source_root);manifest=json.loads(Path(a.manifest).read_text(encoding='utf-8'));proj=manifest.get('projection',{})
if (proj.get('fileCount'),proj.get('payloadBytes'),proj.get('pathSetSha256'),proj.get('sourceContentAggregateSha256'))!=(P66_FILE_COUNT,P66_PAYLOAD,P66_PATHSET,P66_AGG): raise SystemExit(f'P66 manifest preimage mismatch: {proj}')
rows={r['path']:r for r in manifest['files']};changed=[]
for rel,spec in PATCHES.items():
    p=root/rel;b=p.read_bytes();before=sha(b)
    if before!=spec['beforeSha256']: raise SystemExit(f'P68 source preimage mismatch {rel} {len(b)} {before}')
    s=b.decode('utf-8')
    for old,new in spec['replacements']:
        if s.count(old)!=1: raise SystemExit(f'P68 replacement preimage count mismatch {rel}: {s.count(old)}')
        s=s.replace(old,new,1)
    out=s.encode('utf-8')
    if len(out)!=spec['afterBytes'] or sha(out)!=spec['afterSha256']: raise SystemExit(f'P68 source output mismatch {rel} {len(out)} {sha(out)}')
    p.write_bytes(out);row=rows.get(rel)
    if not row or row['sha256']!=spec['beforeSha256']: raise SystemExit(f'P68 manifest row preimage mismatch {rel}')
    row['byteLength']=spec['afterBytes'];row['sha256']=spec['afterSha256'];changed.append({'path':rel,'beforeSha256':before,'afterSha256':spec['afterSha256'],'afterBytes':spec['afterBytes']})
ordered=manifest['files'];payload=sum(int(r['byteLength']) for r in ordered);pathset=hashlib.sha256('\n'.join(r['path'] for r in ordered).encode()).hexdigest();agg=hashlib.sha256()
for r in ordered: agg.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
aggregate=agg.hexdigest()
if (len(ordered),payload,pathset,aggregate)!=(P66_FILE_COUNT,P68_PAYLOAD,P68_PATHSET,P68_AGG): raise SystemExit(f'P68 projection identity mismatch {len(ordered)} {payload} {pathset} {aggregate}')
manifest['projection']['payloadBytes']=payload;manifest['projection']['pathSetSha256']=pathset;manifest['projection']['sourceContentAggregateSha256']=aggregate
manifest['p68Delta']={'classification':'OWNER_AUDIT_CUSTOMER_ARTIFACT_TRUTH_NO_RELEASE_PROMOTION','changedBuildRelevantFiles':changed,'customerFinalOutputCredit':0,'auditFinalCustomerPdfCredit':0,'rightsCredit':0,'saleCredit':0,'live':False,'truthBoundary':'P68 corrects active Audit customer artifact semantics, binds findings/remediation/source-currentness into immutable customer snapshots, and removes positive manual-review semantics from the active assembler. No fixture or source change promotes a real customer output, rights clearance, paid value, sale, LIVE or WORLD_CLASS readiness.'}
Path(a.output_manifest).write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'schemaVersion':'velmere.p68.audit-customer-truth-projection-patch.v2','status':'PASS','changedFiles':changed,'fileCount':len(ordered),'payloadBytes':payload,'pathSetSha256':pathset,'aggregateSha256':aggregate,'customerFinalOutputCredit':0,'auditFinalCustomerPdfCredit':0,'rightsCredit':0,'saleCredit':0,'live':False,'truthBoundary':manifest['p68Delta']['truthBoundary']},indent=2))
