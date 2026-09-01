#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
CONSUMERS=[
 'lib/server/market-integrity-route-modules/usability-guard.ts',
 'lib/server/market-integrity-route-modules/launch-bridge.ts',
 'lib/server/market-integrity-route-modules/review-deck.ts',
 'lib/server/market-integrity-route-modules/probe.ts',
 'lib/server/market-integrity-route-modules/analyze.ts',
 'lib/server/market-integrity-route-modules/evidence-workflow.ts',
 'lib/server/market-integrity-route-modules/chat.ts',
 'lib/server/market-integrity-route-modules/soc.ts',
 'lib/server/market-integrity-route-modules/orchestrator.ts',
 'lib/server/market-integrity-route-modules/workspace.ts',
 'lib/server/market-integrity-route-modules/assistant.ts',
 'lib/server/market-integrity-route-modules/interaction-stability.ts',
 'lib/server/market-integrity-route-modules/source-trust.ts',
 'lib/server/market-integrity-route-modules/report.ts',
 'lib/market-integrity/vlm-route-analysis.ts',
]
checks=[]
def check(ident, condition, detail=None):
    row={'id':ident,'status':'PASS' if condition else 'FAIL'}
    if detail is not None: row['detail']=detail
    checks.append(row)
    if not condition: raise AssertionError(f'{ident}: {detail!r}')

def sha(path:Path): return 'sha256:'+hashlib.sha256(path.read_bytes()).hexdigest()

ledger_path=ROOT/'lib/market-integrity/risk-ledger.ts'
ledger=ledger_path.read_text('utf-8')
shared=ledger[ledger.index('export async function getPersistentRiskHistoryEvents'):ledger.index('export async function getPersistentRiskHistory(')]
snapshots=ledger[ledger.index('export async function getPersistentRiskHistory('):ledger.index('export async function getRiskLedgerStatus')]
check('shared-reader:delegates-v2','getPersistentRiskHistoryResolution(clean, boundedLimit)' in shared)
check('shared-reader:no-legacy-rpc','velmere_read_risk_history_by_asset_v1' not in shared)
check('shared-reader:ambiguous-empty','resolution.resolution === "RESOLVED" ? resolution.events.slice(-boundedLimit) : []' in shared)
check('snapshot-reader:inherits-shared-reader','getPersistentRiskHistoryEvents(id, limit)' in snapshots)

for relative in CONSUMERS:
    path=ROOT/relative
    check(f'consumer:exists:{relative}',path.is_file())
    text=path.read_text('utf-8')
    check(f'consumer:imports-shared-reader:{relative}','getPersistentRiskHistory' in text and 'risk-ledger' in text)
    check(f'consumer:executes-shared-reader:{relative}','getPersistentRiskHistory(' in text)
    check(f'consumer:no-direct-legacy-rpc:{relative}','velmere_read_risk_history_by_asset_v1' not in text)

production_legacy=[]
for base in [ROOT/'lib',ROOT/'components',ROOT/'app']:
    if not base.exists(): continue
    for path in base.rglob('*'):
        if not path.is_file() or path.suffix not in {'.ts','.tsx','.js','.mjs'}: continue
        if 'velmere_read_risk_history_by_asset_v1' in path.read_text('utf-8',errors='replace'):
            production_legacy.append(path.relative_to(ROOT).as_posix())
check('production:no-direct-v1-rpc-reference',production_legacy==[],production_legacy)

failed=[row for row in checks if row['status']!='PASS']
receipt={
 'schemaVersion':'velmere.p93.cross-product-risk-history-propagation-static.v1',
 'generatedAt':'2026-08-20T14:00:00.000Z',
 'status':'FAIL' if failed else 'PASS_BOUNDED_STATIC_SHARED_READER_PROPAGATION',
 'checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},
 'consumers':{'total':len(CONSUMERS),'paths':CONSUMERS},
 'sourceHashes':{'ledger':sha(ledger_path),**{relative:sha(ROOT/relative) for relative in CONSUMERS}},
 'zeroFakeCredit':{'consumerRoutesExecuted':False,'providerNetworkExecuted':False,'browserRendered':False,'postgresqlExecuted':False,'customerFinal':'0/20'},
 'truthBoundary':'This static proof confirms that current Shield, Angel, report and related market-integrity consumers inherit the P93 canonical shared Risk History reader and contain no direct legacy OR-based RPC reference. Runtime behavior is proven only at the shared-reader boundary; these customer routes were not deployed or executed end to end.',
}
for relative in ['receipts/p93/P93_CROSS_PRODUCT_RISK_HISTORY_PROPAGATION_STATIC.json','artifacts/p93/P93_CROSS_PRODUCT_RISK_HISTORY_PROPAGATION_STATIC.json']:
    target=ROOT/relative; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'checks':receipt['checks'],'consumers':receipt['consumers']},indent=2,ensure_ascii=False))
