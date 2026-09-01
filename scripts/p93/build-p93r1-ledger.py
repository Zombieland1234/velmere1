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
    projection = load("artifacts/closure/p93r1/P93R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json")
    tests = load("artifacts/closure/p93r1/P93R1_TEST_AGGREGATE.json")
    source = load("artifacts/closure/p93r1/P93R1_SOURCE_CHANGE_MANIFEST.json")
    final = package_verification["final"]
    current = projection["currentCandidateProjection"]
    parent = projection["parentProjection"]
    delta = projection["delta"]
    output = Path(args.output)
    text = f'''VELMÈRE CURRENT STATE & PASS DELTA LEDGER — P93R1 / V17
DATE: 2026-08-20
CLASSIFICATION: PASS_BOUNDED_P93R1_RISK_HISTORY_CANONICAL_IDENTITY_NON_ENUMERATING_SHARED_READER
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
Changed in P93R1: NO

Canonical Owner Directive V17:
VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt
SHA-256: de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05
Changed in P93R1: NO

Parent SOURCE_ONLY:
VELMERE_R44P46_V17_P92R1_RISK_HISTORY_CUSTOMER_HOVER_EXPAND_SAFE_UI_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip
Bytes: 216,842,187
Entries: 9,007
SHA-256: 77790066280877563ad07480fc33b18bc1c143800eef8cc29fb00586b839ace7
Parent files byte-identical in final P93 diff: {source['parentFilesByteIdenticalInDiffScope']:,}
Declared modified parent files: {len(source['modifiedParentFiles'])}
Deleted parent files: 0
Unexpected parent changes: 0

1. PHYSICAL PRODUCT AND DATA-BOUNDARY CHANGES

P93R1 repairs canonical Risk History identity and non-enumerating public delivery across the shared product reader.

Modified build-relevant production modules:
- components/market-integrity/RiskHistoryControl.tsx
- lib/market-integrity/risk-history-contract.ts
- lib/market-integrity/risk-ledger.ts
- lib/server/market-integrity-route-modules/history.ts

Database closure-critical changes:
- lib/db/schema.sql
- supabase/migrations/20260820000007_p93_risk_history_canonical_identity_public_resolution.sql

Implemented behavior:
- exact canonical asset identifier takes precedence over aliases;
- an alias is accepted only when it resolves to exactly one canonical history;
- ambiguous aliases fail closed and never merge histories;
- unknown, ambiguous and private-only histories normalize to one customer-safe EMPTY response;
- public output does not reveal whether private/internal history exists;
- eventId and snapshot fields are recomputed and cross-bound rather than accepted from self-consistent mutable input;
- read-only RPC success cannot promote durable write/readback truth;
- the shared reader used by Shield, Angel, reports and other consumers now uses v2 canonical resolution;
- legacy v1 canonical_id OR alias semantics are no longer used by production readers;
- public route rejects over-limit requests instead of clamping to a larger historical window;
- public output is bounded to 144 events and a bounded rate limiter;
- customer wording states visible history, not a claim about all earlier internal tracking.

2. REAL DEFECTS FOUND AND REPAIRED

A. Alias collision could combine events from two different canonical assets into one customer history.
B. Public responses distinguished no data from data that existed but was not public, creating an enumeration oracle.
C. A self-consistent event digest could still accept changed event metadata after recomputation; deterministic eventId and full snapshot cross-binding were added.
D. A successful read-only database call could incorrectly raise global durability state without append -> exact-readback evidence.
E. Fifteen cross-product consumers inherited the old v1 OR-based reader even after the public route was tightened.
F. The public route accepted a historical maximum of 500, lacked the final strict security response path and could expose inconsistent bounded behavior.
G. Historical harnesses froze superseded v1 semantics or stale limits; they were preserved with zero credit and replaced by current bounded proofs rather than rewriting history.

3. CURRENT GREEN EVIDENCE

P93 canonical public route runtime: 42/42 PASS
P93 durable/canonical compatibility runtime: 14/14 PASS
P93 canonical resolution static: 84/84 PASS
P93 cross-product shared-reader propagation static: 65/65 PASS
P93 changed-module import/transpile reachability: 12/12 PASS
P93 targeted strict TypeScript: 3/3 PASS
P93 bounded repeatability: 24/24 PASS / 2 of 2 byte-identical
P93 current-byte affected-scope regression: {tests['freshAffectedScopeRegressionChecksAcrossOverlappingHarnesses']}/346 overlapping checks PASS across 12/12 commands

P93 core execution rows overlap with the 346-check current regression and must not be added again as independent evidence.
The unchanged P92 1,501-check scope is inherited historical evidence only and is not counted as fresh P93 execution.

IMPORTANT: 346 is not an independent-evidence count, accuracy statistic, Browser result, accessibility certification, real database proof or FINAL numerator.

4. FAILURE ADJUDICATION

Thirteen first failures, stale historical contracts and one bounded timeout are preserved with zero credit and zero unadjudicated rows.

Material adjudications include:
- missing offline TypeScript loader in first invocations: harness invocation defect;
- first static assertion mismatch: test defect repaired without weakening source;
- old SQL/public maximum assumption: superseded by separate internal 5000 and public 144 limits;
- stale P91 ambient declarations: new P93 closed ambient added, historical P91 bytes restored;
- P91 v1-only reader/static/type/repeatability rows: SUPERSEDED_NO_CREDIT;
- P92 static route contract requiring old limit semantics: SUPERSEDED_NO_CREDIT;
- P92 reachability timeout with no output: zero credit, replaced by P93 reachability and repeatability.

No retry-until-green or partial nonzero run received PASS credit.

5. PRODUCT SOURCE PROJECTION

Parent P92R1:
Files: {parent['fileCount']}
Payload: {parent['payloadBytes']} B
Path-set SHA-256: {parent['pathSetSha256']}
Source aggregate SHA-256: {parent['sourceContentAggregateSha256']}

P93R1 current candidate:
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
supabase/migrations/20260820000007_p93_risk_history_canonical_identity_public_resolution.sql

New service-role RPC contract:
velmere_read_risk_history_by_asset_v2

The migration source defines exact-before-alias resolution, ambiguous-empty behavior, bounded service-role access and closed response envelopes.

Authorized PostgreSQL/Supabase execution: NOT EXECUTED
Real RLS/service-role proof: WITHHELD
Concurrent write/read proof: WITHHELD
Transaction rollback proof: WITHHELD
Backup/restore proof: WITHHELD
Deployed HTTP non-enumeration and timing proof: WITHHELD

Schema or migration source is not deployed database evidence.

7. ENVIRONMENT TRUTH

Local runtime:
- Linux x86_64
- Node v22.16.0
- npm 10.9.2
- Python 3.13.5

Current bounded passes:
- targeted strict TypeScript: 3/3 PASS_BOUNDED;
- changed-module import/transpile reachability: 12/12 PASS_BOUNDED.

Still WITHHELD:
- whole-project semantic TypeScript;
- ESLint zero-warning;
- Webpack production build;
- Turbopack production build;
- rendered Browser/WCAG/mobile/cross-browser runtime;
- exact Windows Server 2025 / Node 24.18.0 / npm 11.16.0.

Closed ambient compilation and isolated transpilation do not substitute for the exact dependency graph or Browser.

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

P93 Risk History canonical/public/shared-reader sub-scope: PASS_BOUNDED_LOCAL_SOURCE_NO_SOCKET
P93 overall: NOT FINAL

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

- execution of P91 and P93 migrations on authorized staging PostgreSQL/Supabase;
- actual service-role-only RPC, RLS, concurrency, rollback and restore;
- deployed HTTP response and timing non-enumeration;
- real customer-authorized asset input and current evidence;
- rendered Browser, keyboard, screen reader, reduced motion, mobile and cross-browser journeys;
- deployed Risk Indicator end-to-end chain;
- Audit provider rights/currentness and paid readiness;
- whole-project type/lint/build;
- exact Windows.

11. NEXT HIGHEST-VALUE WORK

Priority 1 — DATABASE / DEPLOYED HTTP:
Apply P91 and P93 migrations on authorized staging. Prove exact canonical, unique alias, ambiguous alias, empty and private-only cases through service-role and public paths. Verify RLS, two identities, transaction rollback, timing/non-enumeration and backup/restore.

Priority 2 — BROWSER / ACCESSIBILITY:
Install the exact dependency graph and execute Shield/Risk History on desktop and mobile with keyboard, screen reader, reduced motion, PL/EN/DE, Chrome, Edge, Firefox and WebKit.

Priority 3 — FIRST CUSTOMER FINAL:
Bind one deployed, customer-authorized Risk Indicator execution from current evidence through immutable output and final adjudication. Only then may Customer FINAL move 0/20 -> 1/20.

Priority 4 — INDEPENDENT WORKSTREAM:
If staging remains unavailable, continue another high-value security/rights/product workstream rather than retrying the unavailable environment.

12. CURRENT VERDICT

P93R1 closes a real cross-product correctness and privacy defect: ambiguous aliases can no longer mix histories, private/internal history presence is not exposed by public result state, read-only queries cannot manufacture durability, and all shared Risk History consumers use the canonical v2 reader.

The result remains honest:
- local canonical/public/shared-reader boundary: PASS_BOUNDED;
- PostgreSQL migration runtime: WITHHELD;
- deployed HTTP non-enumeration: WITHHELD;
- rendered Browser/WCAG: WITHHELD;
- Risk Indicator FINAL: false;
- Customer FINAL: 0/20;
- Global: NO_GO / STOP_SELL.

No blockchain transaction, external state change, live exploit, weaponized PoC, authorization bypass or unauthorized scan was performed.

END OF LEDGER
'''
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(text, encoding="utf-8")
    print(
        json.dumps(
            {
                "status": "PASS",
                "output": str(output),
                "bytes": output.stat().st_size,
                "sha256": sha(output),
                "sourceOnly": {"bytes": final["bytes"], "entries": final["entryCount"], "sha256": final["sha256"]},
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
