#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
parent=json.loads((ROOT/'receipts/p98/P98_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json').read_text())
parent['schemaVersion']='velmere.p99.current-20-row-final-distance-map.v1'
parent['generatedAt']='2026-08-21T14:45:00.000Z'
parent['status']='PASS_ALL_20_ROWS_RECLASSIFIED_NO_FINAL_PROMOTION'
parent['priorityDecision']={
 'closestOverall':'risk-indicator','closestOverallBlocker':'EXTERNAL_BLOCKER_CONFIRMED',
 'closestUnblockedByConfirmedStaging':'browser-basic',
 'selectedIndependentRow':'real-markets-basic',
 'selectionReason':'Authorized staging and exact engineering remain unavailable. P99 therefore selected the closest independent row whose customer route had a real rights and semantic-truth defect: Real Markets Basic.',
 'p99Effect':'CoinGecko/Binance customer delivery is blocked before provider, cache and fallback execution while rights remain unverified. All required Basic fields now have explicit reference/currentness/unit/venue/execution contracts. FINAL distance remains unchanged because no rights approval, real current field execution, deployed route, rendered Browser or exact engineering proof exists.'
}
for row in parent['rows']:
 row['selectedIndependentWorkstream']=row['productId']=='real-markets-basic'
 if row['productId']=='real-markets-basic':
  row['evidenceReferences']=list(dict.fromkeys(row.get('evidenceReferences',[])+['P99 field-level rights/currentness registry and pre-network fail-closed route policy']))
  row['p99SourceIntegrityRepair']='PASS_BOUNDED_RIGHTS_PRECHECK_REFERENCE_SEMANTICS_NO_CUSTOMER_DELIVERY'
parent['p99Repair']={
 'affectedRows':['real-markets-basic'],
 'providerIdsObservedInBlockedParent':['coingecko','binance'],
 'providerNetworkBlockedBeforeCall':True,
 'localReferenceCustomerFallbackRemoved':True,
 'priceSemanticClass':'reference',
 'liveClaimed':False,
 'executableQuoteClaimed':False,
 'customerFinalPromotions':0,'paidValuePromotions':0,'saleEligiblePromotions':0,'riskHistoryFilesChanged':0,
}
parent['numerators']={'customerFinal':'0/20','auditFinalPdf':'0/3','saleEligible':'0/20','paidValue':'0/10'}
parent['truthBoundary']='All 20 canonical rows remain classified on P99 source. The Real Markets Basic source path is now fail-closed on current rights truth and explicit field semantics, but real rights/currentness/data/deployment/render/build gates remain open. Gate-group counts are prioritization estimates, not release scores.'
raw=json.dumps(parent,indent=2,ensure_ascii=False)+'\n'
for rel in ['receipts/p99/P99_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json','artifacts/p99/P99_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json']:
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(raw,encoding='utf-8')
print(json.dumps({'status':parent['status'],'rows':len(parent['rows']),'selected':'real-markets-basic','customerFinal':'0/20'},indent=2))
