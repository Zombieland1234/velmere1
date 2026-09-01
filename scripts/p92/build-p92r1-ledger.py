#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def sha(p:Path):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
 return h.hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--package-verification',required=True);ap.add_argument('--output',required=True);args=ap.parse_args();pv=json.loads(Path(args.package_verification).read_text());out=Path(args.output)
 proj=json.loads((ROOT/'artifacts/closure/p92r1/P92R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json').read_text())
 tests=json.loads((ROOT/'artifacts/closure/p92r1/P92R1_TEST_AGGREGATE.json').read_text())
 source=json.loads((ROOT/'artifacts/closure/p92r1/P92R1_SOURCE_CHANGE_MANIFEST.json').read_text())
 final=pv['final'];cur=proj['currentCandidateProjection'];parent=proj['parentProjection'];delta=proj['delta']
 text=f'''VELMÈRE CURRENT STATE & PASS DELTA LEDGER — P92R1 / V17
DATE: 2026-08-20
CLASSIFICATION: PASS_BOUNDED_P92R1_RISK_HISTORY_CUSTOMER_HOVER_EXPAND_SAFE_UI
GLOBAL: NO_GO / STOP_SELL
LIVE: false
SALE_ENABLED: false
PRODUCTION_APPROVED: false
WORLD_CLASS_PROVEN: false

0. AUTHORITY AND PARENT

Master Directive V2 COMPLETE:
VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt
SHA-256: 9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53
Sections 0-88: PRESENT
START NOW + END-OF-DIRECTIVE: PRESENT
Changed in P92R1: NO

Canonical Owner Directive V17:
VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt
SHA-256: de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05
Changed in P92R1: NO

Parent SOURCE_ONLY:
VELMERE_R44P46_V17_P91R1_RISK_HISTORY_EVENT_DRIVEN_VERSIONED_DURABLE_TRUTH_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip
Bytes: 216,468,688
SHA-256: 045f52c70d82cc8f057b4a1dc554a14c29ded4b7647f6abfa135963d2b77e064
Parent history verified: 1,883 files / 0 final differences

1. PHYSICAL PRODUCT CHANGES

P92R1 binds the owner-approved Risk History interaction to the customer market table without promoting Risk Indicator FINAL.

New production modules:
- lib/market-integrity/risk-history-customer-client.ts
- components/market-integrity/RiskHistoryControl.tsx

Modified production modules:
- components/market-integrity/ShieldRealMarketsParityClient.tsx
- components/market-integrity/CrossAssetCollapseRadarPanel.tsx

Implemented behavior:
- strict same-origin no-store customer client;
- bounded 512 KiB JSON and maximum 144 events;
- exact closed response schema and anti-extra-field validation;
- compact hover/focus history popover;
- click/tap expanded accessible dialog;
- Escape, focus trap, focus return, outside close and body-scroll lock;
- mobile history action separated from the primary asset action, with no nested buttons;
- history remains available when the current score is WITHHELD;
- scores use /100 and are explicitly not probabilities;
- methodology/comparability segments, tracking start and closed event markers;
- PL/EN/DE and explicit UTC;
- no raw snapshots, stored free-form reasons, provider topology, receipts or internal ledger errors rendered;
- explicit modal identity for Velmère Shield and Velmère Real Markets.

2. REAL DEFECTS FOUND AND REPAIRED

A. The desktop Risk cell was text only and had no owner-approved hover/expand history path.
B. The mobile asset card was one large button, so inserting a history button would have created invalid nested interactive controls.
C. An old-source assumption would have hidden valid historical observations whenever the current score was unavailable.
D. Shared asset modals for Shield and Real Markets lacked explicit product labels.
E. Several first-pass harness expectations were wrong or stale; no dead source was added merely to satisfy them.
F. Three orchestration attempts stalled after complete partial work; all incomplete runs received zero credit and the final proof was reconstructed from closed current logs.

3. CURRENT GREEN EVIDENCE

P92 customer client runtime: 48/48 PASS
P92 customer UI static/security/accessibility source proof: 83/83 PASS
P92 changed-module import/transpile reachability: 11/11 PASS
P92 targeted strict TypeScript: 2/2 PASS
P92 bounded repeatability: 16/16 PASS / 2 of 2 byte-identical
P92 current-byte parent regression: 1,501 overlapping checks PASS

Aggregate executed checks across overlapping harnesses: {tests['aggregateExecutedChecksAcrossOverlappingHarnesses']}
IMPORTANT: this is not an independent-evidence count, Browser result, accessibility certification, accuracy statistic or FINAL numerator.

4. FAILURE ADJUDICATION

All first FAIL, historical incompatibility and incomplete orchestration logs are preserved with zero credit.
- initial TypeScript config root defect: repaired;
- initial TSX ambient declaration defect: repaired;
- two static-harness false positives: corrected without adding dead code;
- historical active-pass and three-tab UI harnesses: SUPERSEDED_NO_CREDIT;
- missing shared modal product identity: real defect repaired;
- incomplete monolithic/descriptor-hang runners: zero credit, bounded segments independently completed.

5. PRODUCT SOURCE PROJECTION

Parent P91R1:
Files: {parent['fileCount']}
Payload: {parent['payloadBytes']} B
Path-set SHA-256: {parent['pathSetSha256']}
Source aggregate SHA-256: {parent['sourceContentAggregateSha256']}

P92R1 current candidate:
Files: {cur['fileCount']}
Payload: {cur['payloadBytes']} B
Path-set SHA-256: {cur['pathSetSha256']}
Source aggregate SHA-256: {cur['sourceContentAggregateSha256']}

Delta:
Files: {delta['fileCount']:+d}
Payload: {delta['payloadBytes']:+d} B
Build-relevant files changed: {delta['changedBuildRelevantFiles']}
Projection classification: LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY
Exact Windows credit: WITHHELD

6. ENVIRONMENT TRUTH

Local runtime remains Linux / Node v22.16.0 / npm 10.9.2 without the installed React/Next dependency graph.
- pure customer client semantic TypeScript: PASS_BOUNDED;
- TSX closed-ambient strict TypeScript: PASS_BOUNDED;
- whole-project semantic TypeScript: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING;
- ESLint: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING;
- Webpack/Turbopack: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING;
- rendered Browser/WCAG/mobile/cross-browser runtime: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING;
- exact Windows Server 2025 / Node 24.18.0 / npm 11.16.0: WITHHELD.

Closed ambient compilation and isolated transpilation do not substitute for the real dependency graph or Browser.

7. CUSTOMER AND RELEASE NUMERATORS

Customer FINAL: 0/20
Audit FINAL PDF: 0/3
Rights: 2/203 inherited only
Paid value: 0/10
Sale eligible: 0/20
Risk Indicator FINAL: false
PILOT_READY: false
GO_PAID: false
LIVE: false
WORLD_CLASS_PROVEN: false
Global: NO_GO / STOP_SELL

P92 Risk History customer UI sub-scope: PASS_BOUNDED_LOCAL_SOURCE_AND_CLIENT
P92 overall: NOT FINAL

8. CURRENT WITHHELDS

- rendered Browser and real accessibility runtime;
- real HTTP customer route and real customer-authorized input;
- mobile-device and cross-browser journeys;
- authorized PostgreSQL/Supabase P91 migration, RLS, service-role isolation and exact readback;
- backup/restore drill and real long-term durability;
- deployed Risk Indicator end-to-end customer chain;
- real Audit provider rights and currentness;
- whole-project type/lint/build;
- exact Windows.

9. CURRENT SOURCE_ONLY

Name: {pv['output']}
Bytes: {final['bytes']:,}
Entries: {final['entryCount']:,}
SHA-256: {final['sha256']}
Deterministic rebuild: {pv['deterministicRebuild']}
CRC: PASS for both builds
Clean unpack: {final['cleanUnpack']}
Package manifest exact: true
Full private-key/secret scan: 0 matches
Unexpected current binary scan: 0 matches
ZIP ordering: lexicographic
ZIP fixed timestamp: 1980-01-01T00:00:00Z
Directory entries: 0
createSystem: 0

10. NEXT HIGHEST-VALUE WORK

Priority 1 — ENVIRONMENT / CUSTOMER EXECUTION:
Install the exact dependency graph and execute the real Shield/Risk History route in Browser on desktop and mobile with keyboard, screen reader, reduced motion, PL/EN/DE and cross-browser coverage.

Priority 2 — DATABASE / DURABILITY:
Apply the inherited P91 migration on authorized staging PostgreSQL/Supabase and prove service-role writes, RLS, concurrent append, exact readback, rollback and restore.

Priority 3 — CUSTOMER FINAL:
Bind deployed Risk History to the Risk Indicator customer row, owner/account authorization and final immutable customer output. Only the physically complete row may move Customer FINAL 0/20 -> 1/20.

Priority 4 — AUDIT RIGHTS:
Execute the real Audit Pro lane model with five target-relevant live lanes, four strict receipts, three independent families, six evidence rows and field-level commercial/display/PDF/retention rights.

11. CURRENT VERDICT

P92R1 materially advances the owner-approved Risk History requirement. It adds a customer-safe, version-aware hover/focus/expand interaction and repairs mobile interaction and modal identity boundaries without exposing raw evidence or manufacturing a current score.

The result remains honest:
- local customer client and UI source boundary: PASS_BOUNDED;
- rendered Browser/WCAG: WITHHELD;
- deployed Risk History: WITHHELD;
- Risk Indicator FINAL: false;
- Customer FINAL: 0/20;
- Global: NO_GO / STOP_SELL.

No blockchain transaction, external state change, live exploit, weaponized PoC, authorization bypass or unauthorized scan was performed.

END OF LEDGER
'''
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(text,encoding='utf-8')
 print(json.dumps({'status':'PASS','output':str(out),'bytes':out.stat().st_size,'sha256':sha(out),'sourceOnly':{'bytes':final['bytes'],'entries':final['entryCount'],'sha256':final['sha256']}},indent=2))
if __name__=='__main__':main()
