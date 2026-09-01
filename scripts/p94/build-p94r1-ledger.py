#!/usr/bin/env python3
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load(relative: str) -> dict:
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package-verification", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    package_verification = json.loads(Path(args.package_verification).read_text(encoding="utf-8"))
    projection = load("artifacts/closure/p94r1/P94R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json")
    tests = load("artifacts/closure/p94r1/P94R1_TEST_AGGREGATE.json")
    source = load("artifacts/closure/p94r1/P94R1_SOURCE_CHANGE_MANIFEST.json")
    environment = load("artifacts/closure/p94r1/P94R1_ENVIRONMENT_TRUTH.json")
    final = package_verification["final"]
    current = projection["currentCandidateProjection"]
    parent = projection["parentProjection"]
    delta = projection["delta"]
    output = Path(args.output)
    text = f'''VELMÈRE CURRENT STATE & PASS DELTA LEDGER — P94R1 / V17
DATE: 2026-08-21
CLASSIFICATION: PASS_BOUNDED_P94R1_RISK_HISTORY_PUBLIC_ONLY_PAGINATION_TEMPORAL_TRUTH
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
Changed in P94R1: NO

Canonical Owner Directive V17:
VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt
SHA-256: de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05
Changed in P94R1: NO

Parent SOURCE_ONLY:
VELMERE_R44P46_V17_P93R1_RISK_HISTORY_CANONICAL_IDENTITY_NON_ENUMERATING_SHARED_READER_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip
Bytes: 217,111,320
Entries: 9,100
SHA-256: 7e4c70f14ff8648d37e87f5fd8781fa6c64b325607d91bb74d69b45d6b420eaf
Parent files byte-identical in final P94 diff: {source['parentFilesByteIdenticalInDiffScope']:,}
Declared modified parent files: {len(source['modifiedParentFiles'])}
Deleted parent files: 0
Unexpected parent changes: 0

1. PHYSICAL PRODUCT AND DATA-BOUNDARY CHANGES

P94R1 repairs truthful public Risk History pagination and temporal rendering without promoting deployment or FINAL.

Modified build-relevant production modules:
- components/market-integrity/RiskHistoryControl.tsx
- lib/market-integrity/risk-history-contract.ts
- lib/market-integrity/risk-history-customer-client.ts
- lib/market-integrity/risk-ledger.ts
- lib/server/market-integrity-route-modules/history.ts

Database closure-critical changes:
- lib/db/schema.sql
- supabase/migrations/20260821000001_p94_risk_history_public_only_pagination_temporal_window.sql

Implemented behavior:
- PUBLIC and customerPublishable events are selected before limit and cursor application;
- WITHHELD/private events cannot consume public page capacity or alter hasOlder;
- pages use an exclusive canonical ISO observedAt cursor and exact request binding;
- old-only unique aliases remain bound across older-page requests;
- unknown, ambiguous, private-only and exhausted windows normalize to the same public EMPTY state;
- trackingStartedAt is disclosed only after the earliest publishable observation has actually been reached;
- customer UI says visible/bounded history rather than claiming an unproven full history;
- older pages load only after an explicit customer action;
- page chains are strictly merged, deduplicated and capped at 5,000 visible events;
- reaching the client safety cap is disclosed rather than silently presented as complete;
- Risk History chart x positions use actual observation-time distance instead of event index spacing;
- schema.sql and the ordered migration now carry the same final RPC body and STABLE time semantics.

2. REAL DEFECTS FOUND AND REPAIRED

A. The dialog called a maximum 144-event response a full timeline even though no older-page truth existed.
B. The chart spaced observations uniformly by array index, so one hour and one year could appear equally distant.
C. The public route read an internal page and filtered WITHHELD events afterward; private rows could consume the limit and influence public pagination metadata.
D. An alias occurring only in an older event needed explicit request binding so later pages could not drift to another identity.
E. The ordered migration and lib/db/schema.sql diverged: the migration had the final request binding and STABLE behavior while schema.sql retained the earlier function body.
F. Unbounded automatic history loading would create response, memory and cost-amplification risk; the UI now uses deliberate bounded paging and a disclosed merged cap.
G. Historical v1 and pre-pagination ambient/harness contracts were preserved with zero credit instead of rewritten to appear current.

3. CURRENT GREEN EVIDENCE

P94 public-only pagination runtime: 62/62 PASS
P94 pagination/static/security/UI source proof: 111/111 PASS
P94 changed-module import/transpile reachability: 14/14 PASS
P94 targeted strict TypeScript: 4/4 PASS
P94 bounded command repeatability: 4/4 commands, each 2/2 byte-identical
P94 current-byte affected-scope regression: {tests['freshAffectedScopeRegressionChecksAcrossOverlappingHarnesses']}/308 overlapping checks PASS across 7/7 commands

The 308-check current-byte regression includes the four main P94 execution rows plus P91 event-contract and P93 durable/shared-reader compatibility. These rows overlap and must not be added again as independent evidence.
The unchanged P93 346-check affected scope remains inherited historical evidence only and is not counted as fresh P94 execution.

IMPORTANT: 308 is not an independent-evidence count, accuracy statistic, rendered Browser result, accessibility certification, real PostgreSQL proof or FINAL numerator.

4. FAILURE ADJUDICATION

Seven first failures or superseded contracts are preserved with zero credit and zero unadjudicated rows.

Material adjudications:
- initial runtime negative fixture passed a snapshot instead of a verified event: test fixture defect, full suite rerun;
- first requestBinding static assertion confused an internal function argument with a public response field: harness false positive;
- schema/migration parity failure exposed a real source divergence and was repaired in source rather than weakened in the test;
- requestBinding literal union widened during targeted TypeScript: real inference defect fixed at the parser boundary;
- P92/P93 ambient declarations predated P94 pagination: SUPERSEDED_NO_CREDIT;
- P91 ledger runtime expected the retired v1 reader: SUPERSEDED_NO_CREDIT, replaced by current P91 event and P93 v2 compatibility proofs.

No retry-until-green, partial nonzero run or rewritten historical harness received PASS credit.

5. PRODUCT SOURCE PROJECTION

Parent P93R1:
Files: {parent['fileCount']}
Payload: {parent['payloadBytes']} B
Path-set SHA-256: {parent['pathSetSha256']}
Source aggregate SHA-256: {parent['sourceContentAggregateSha256']}

P94R1 current candidate:
Files: {current['fileCount']}
Payload: {current['payloadBytes']} B
Path-set SHA-256: {current['pathSetSha256']}
Source aggregate SHA-256: {current['sourceContentAggregateSha256']}

Delta:
Files: {delta['fileCount']:+d}
Payload: {delta['payloadBytes']:+d} B
Build-relevant files changed: {delta['changedBuildRelevantFiles']}
Projection classification: LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY
Exact Windows credit: WITHHELD

6. DATABASE AND DEPLOYMENT TRUTH

New ordered migration source:
supabase/migrations/20260821000001_p94_risk_history_public_only_pagination_temporal_window.sql

Public service-role RPC contract:
velmere_read_public_risk_history_by_asset_v1

Source/static proof establishes public filtering before pagination, exclusive cursor progression, request binding, closed response envelopes and service-role-only execution. schema.sql contains the exact same final function body.

Authorized PostgreSQL/Supabase execution: NOT EXECUTED
Real RLS/service-role proof: WITHHELD
Multiple-page database readback: WITHHELD
Concurrent append/read proof: WITHHELD
Transaction rollback proof: WITHHELD
Backup/restore proof: WITHHELD
Deployed HTTP response/timing non-enumeration: WITHHELD

Schema or migration source is not deployed database evidence.

7. ENVIRONMENT TRUTH

Local runtime:
- {environment['local']['platform']}
- Node {environment['local']['node']}
- npm {environment['local']['npm']}
- Python {environment['local']['python']}

Current bounded passes:
- targeted strict TypeScript: 4/4 PASS_BOUNDED;
- changed-module import/transpile reachability: 14/14 PASS_BOUNDED;
- current affected scope: 308/308 PASS_BOUNDED;
- repeatability: 4/4 bounded commands, each 2/2 byte-identical.

Still WITHHELD:
- whole-project semantic TypeScript;
- ESLint zero-warning;
- Webpack production build;
- Turbopack production build;
- rendered Browser/WCAG/mobile/cross-browser runtime;
- authorized PostgreSQL/Supabase migration runtime;
- exact Windows Server 2025 / Node 24.18.0 / npm 11.16.0.

Closed ambient compilation and isolated transpilation do not substitute for the exact dependency graph, Browser, PostgreSQL or exact Windows.

8. CUSTOMER AND RELEASE NUMERATORS

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

P94 Risk History public-pagination/temporal-truth sub-scope: PASS_BOUNDED_LOCAL_SOURCE_NO_SOCKET
P94 overall: NOT FINAL

9. CURRENT SOURCE_ONLY

Name: {package_verification['output']}
Bytes: {final['bytes']:,}
Entries: {final['entryCount']:,}
SHA-256: {final['sha256']}
Deterministic rebuild: {package_verification['deterministicRebuild']}
CRC: PASS for both builds
Clean unpack: {final['cleanUnpack']}
Package manifest exact: true
Full private-key/secret scan: 0 matches
Unexpected current binary scan: 0 matches
ZIP ordering: lexicographic
ZIP fixed timestamp: 1980-01-01T00:00:00Z
Directory entries: 0
createSystem: 0

10. CURRENT WITHHELDS

- execution of P91, P93 and P94 migrations on authorized staging PostgreSQL/Supabase;
- actual service-role-only RPC, RLS, concurrency, rollback and restore;
- deployed public HTTP pagination and timing/non-enumeration;
- real customer-authorized asset input and current evidence;
- rendered load-older behavior, time chart, keyboard, screen reader, reduced motion, mobile and cross-browser journeys;
- deployed Risk Indicator end-to-end chain and immutable customer output;
- Audit provider rights/currentness and paid readiness;
- whole-project type/lint/build;
- exact Windows.

11. NEXT HIGHEST-VALUE WORK

Priority 1 — DATABASE / DEPLOYED HTTP:
Apply P91, P93 and P94 migrations on authorized staging. Prove exact canonical, old-only unique alias, ambiguous, empty, private-only and multiple public-page cases through service-role and public routes. Verify RLS, two identities, cursor progression, rollback, timing/non-enumeration and backup/restore.

Priority 2 — BROWSER / ACCESSIBILITY:
Install the exact dependency graph and execute Shield/Risk History on desktop and mobile. Verify deliberate older-page loading, time-proportional chart geometry, keyboard, screen reader, reduced motion, PL/EN/DE, Chrome, Edge, Firefox and WebKit.

Priority 3 — FIRST CUSTOMER FINAL:
Bind one deployed, customer-authorized Risk Indicator execution from current evidence through immutable customer output and final adjudication. Only then may Customer FINAL move 0/20 -> 1/20.

Priority 4 — INDEPENDENT WORKSTREAM:
If staging remains unavailable, continue another high-value security/rights/product workstream rather than retrying the unavailable environment.

12. CURRENT VERDICT

P94R1 closes a real customer-truth and privacy defect: the public API now paginates only publishable history, private rows cannot distort public capacity, page state is cursor/request bound, the UI no longer calls a bounded page a full history, and chart spacing reflects real time rather than array position.

The result remains honest:
- local public-pagination and temporal-truth boundary: PASS_BOUNDED;
- PostgreSQL migration runtime: WITHHELD;
- deployed HTTP pagination/non-enumeration: WITHHELD;
- rendered Browser/WCAG: WITHHELD;
- Risk Indicator FINAL: false;
- Customer FINAL: 0/20;
- Global: NO_GO / STOP_SELL.

No blockchain transaction, external state change, live exploit, weaponized PoC, authorization bypass or unauthorized scan was performed.

END OF LEDGER
'''
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(text, encoding="utf-8")
    print(json.dumps({"status": "PASS", "output": str(output), "bytes": output.stat().st_size, "sha256": sha(output), "sourceOnly": {"bytes": final["bytes"], "entries": final["entryCount"], "sha256": final["sha256"]}}, indent=2))


if __name__ == "__main__":
    main()
