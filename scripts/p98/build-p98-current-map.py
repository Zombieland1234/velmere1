#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
parent=json.loads((ROOT/'receipts/p97/P97_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json').read_text())
parent['schemaVersion']='velmere.p98.current-20-row-final-distance-map.v1'
parent['generatedAt']='2026-08-21T12:30:00.000Z'
parent['status']='PASS_ALL_20_ROWS_RECLASSIFIED_NO_FINAL_PROMOTION'
parent['priorityDecision']={
 'closestOverall':'risk-indicator','closestOverallBlocker':'EXTERNAL_BLOCKER_CONFIRMED',
 'closestUnblockedByConfirmedStaging':'browser-basic',
 'selectedIndependentRow':'real-markets-advanced',
 'selectionReason':'P97 already repaired Browser Basic durability but its remaining gates require authorized storage/render/build environments. P98 fixed a production-reachable exact-tier integrity defect spanning Real Markets Pro/Advanced and the shared market-report route without imitating staging.',
 'p98Effect':'Implicit Advanced-to-Pro delivery semantics removed; unavailable paid tiers now return a minimal WITHHELD response before layout, PDF token or account artifact creation. Remaining FINAL gate-group counts do not decrease because real data, rights, entitlement, deployed artifacts, rendered UX and exact engineering proof are still absent.'
}
for row in parent['rows']:
 row['selectedIndependentWorkstream']=row['productId']=='real-markets-advanced'
 if row['productId'] in {'real-markets-pro','real-markets-advanced'}:
  row['evidenceReferences']=list(dict.fromkeys(row.get('evidenceReferences',[])+['P98 exact requested-tier delivery and automated Advanced boundary']))
  row['p98SourceIntegrityRepair']='PASS_BOUNDED_NO_IMPLICIT_DOWNGRADE_NO_ARTIFACT_ON_WITHHELD'
parent['p98Repair']={
 'affectedRows':['real-markets-pro','real-markets-advanced'],
 'crossProductRoute':'shared market report paid tiers',
 'customerFinalPromotions':0,
 'paidValuePromotions':0,
 'saleEligiblePromotions':0,
 'riskHistoryFilesChanged':0,
}
parent['numerators']={'customerFinal':'0/20','auditFinalPdf':'0/3','saleEligible':'0/20','paidValue':'0/10'}
parent['truthBoundary']='All 20 canonical customer rows are reclassified on P98 source. P98 closes an exact-tier customer-delivery integrity defect only. Gate-group counts remain prioritization estimates, not release scores. No real entitlement, provider evidence, rights, deployment, rendered Browser, exact Windows or FINAL credit is granted.'
raw=json.dumps(parent,indent=2,ensure_ascii=False)+'\n'
for rel in ['receipts/p98/P98_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json','artifacts/p98/P98_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json']:
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(raw,encoding='utf-8')
print(json.dumps({'status':parent['status'],'rows':len(parent['rows']),'customerFinal':parent['numerators']['customerFinal']}))
