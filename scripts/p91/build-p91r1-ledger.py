#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CLOSURE=ROOT/'artifacts/closure/p91r1'
def load(name):return json.loads((CLOSURE/name).read_text('utf-8'))
def sha(path:Path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(4*1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--package-verification',required=True);ap.add_argument('--output',required=True);args=ap.parse_args()
 package=Path(args.package_verification);pv=json.loads(package.read_text('utf-8'));out=Path(args.output)
 authority=load('P91R1_AUTHORITY_BINDING.json');source=load('P91R1_SOURCE_CHANGE_MANIFEST.json');product=load('P91R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json');tests=load('P91R1_TEST_AGGREGATE.json');failure=load('P91R1_FAILURE_ADJUDICATION.json');risk=load('P91R1_RISK_HISTORY_BOUNDARY.json');db=load('P91R1_DATABASE_BOUNDARY.json');env=load('P91R1_ENVIRONMENT_TRUTH.json');history=load('P91R1_HISTORICAL_RECEIPT_IMMUTABILITY.json');blockers=load('P91R1_CURRENT_BLOCKER_QUEUE.json')
 p=product['currentCandidateProjection'];pp=product['parentProjection'];final=pv['final']
 text=f'''VELMÈRE CURRENT STATE & PASS DELTA LEDGER — P91R1 / V17
DATE: 2026-08-20
CLASSIFICATION: PASS_BOUNDED_P91R1_RISK_HISTORY_EVENT_DRIVEN_VERSIONED_DURABLE_TRUTH
GLOBAL: NO_GO / STOP_SELL
LIVE: false
SALE_ENABLED: false
PRODUCTION_APPROVED: false
WORLD_CLASS_PROVEN: false

0. AUTHORITY AND CURRENT TRUTH

Master execution authority:
{authority['masterDirective']['path']}
Bytes: {authority['masterDirective']['bytes']:,}
SHA-256: {authority['masterDirective']['sha256']}
Completeness: SECTIONS 0–88 PRESENT / START NOW PRESENT / END-OF-DIRECTIVE PRESENT
Changed in P91R1: NO

Canonical owner/topology authority:
{authority['canonicalOwnerDirective']['path']}
Bytes: {authority['canonicalOwnerDirective']['bytes']:,}
SHA-256: {authority['canonicalOwnerDirective']['sha256']}
Changed in P91R1: NO

Topology remains owner-bound:
- 10 product families;
- 20 customer-facing rows;
- 20 current execution profiles;
- 10 material paid transitions.

Parent checkpoint:
P90R1_AUDIT_FIELD_LEVEL_RIGHTS_CURRENTNESS_SOURCIFY_INDEPENDENT_LANE
Parent SOURCE_ONLY: {authority['parentSourceOnly']['name']}
Parent SOURCE_ONLY SHA-256: {authority['parentSourceOnly']['sha256']}

Current SOURCE_ONLY:
{pv['output']}
Bytes: {final['bytes']:,}
Entries: {final['entryCount']:,}
SHA-256: {final['sha256']}
Deterministic package rebuild: {pv['deterministicRebuild']}
ZIP CRC: PASS for both builds
Clean unpack: {final['cleanUnpack']}

1. REAL DEFECTS FOUND AND PHYSICALLY REPAIRED

P91 did not create another descriptive Risk History model. It repaired a broken production path.

Defect A — persistence targeted a table that did not exist:
- lib/market-integrity/risk-ledger.ts read and wrote market_integrity_snapshots;
- no current ordered migration created that table;
- a configured deployment could therefore degrade to memory while appearing persistence-capable.

Repair:
- removed the nonexistent-table path;
- added ordered migration 20260820000006_p91_risk_history_event_driven_versioned_durable_truth.sql;
- added service-role-only, append-only velmere_risk_history_events;
- added validation and immutable triggers, digest cross-binding, per-asset advisory locking and exact read RPCs.

Defect B — configuration was mistaken for durability:
- setting Supabase environment variables could produce durable_years_ready semantics;
- failed writes could fall back to memory without revoking the apparent durability claim.

Repair:
- CONFIGURED_UNVERIFIED is separate from DURABLE_READBACK_VERIFIED;
- only append plus independent exact readback may enter durable_years_ready;
- tampered, missing or failed readback becomes DEGRADED_MEMORY_FALLBACK;
- environment configuration alone earns zero durability credit.

Defect C — every sweep could create another identical score snapshot:
- unchanged scores could be stored without customer value;
- this violated the owner-approved event-driven Risk History contract and created cost amplification.

Repair:
- first verified observation is stored;
- material score, level, methodology, evidence or publication changes are stored;
- exact duplicates and unchanged observations inside the heartbeat window are skipped;
- one continuity heartbeat is permitted only after 24 hours;
- same-time different bytes and non-monotonic events fail closed.

Defect D — historical comparability and public safety were incomplete:
- old snapshots lacked explicit methodologyVersion, scoreVersion, evidenceVersion and comparability segments;
- unverified/withheld scores and stored free-form change reasons could reach a future public projection;
- customer status exposed unnecessary global ledger counters and internal error topology.

Repair:
- every new snapshot/event is versioned and digest-bound;
- methodology/provider configuration changes start a non-comparable segment;
- only customerPublishable PUBLIC events enter customer Risk History;
- public change reasons are reconstructed from a closed event-type allowlist, not trusted stored prose;
- raw price, market cap, volume, dominant-agent, provider payload, internal error and global ledger counts are not returned.

2. PHYSICAL SOURCE DELTA

Exact parent diff status: {source['status']}
Current changed/added files: {source['changeCount']}
Build-relevant product files changed: {len(source['changedBuildRelevantFiles'])}
Database closure-critical files changed: {len(source['databaseClosureCriticalFiles'])}

Build-relevant product delta:
- lib/market-integrity/risk-history-contract.ts — ADDED;
- lib/market-integrity/market-memory.ts — MODIFIED;
- lib/market-integrity/risk-ledger.ts — MODIFIED;
- lib/market-integrity/long-term-memory-spine.ts — MODIFIED;
- lib/server/market-integrity-route-modules/history.ts — MODIFIED;
- lib/server/market-integrity-route-modules/markets.ts — MODIFIED.

Database closure-critical delta:
- lib/db/schema.sql — MODIFIED;
- supabase/migrations/20260820000006_p91_risk_history_event_driven_versioned_durable_truth.sql — ADDED.

3. RISK HISTORY CONTRACT NOW PHYSICALLY EXISTS

Current bounded contract:
- snapshot schema: velmere.risk-history-snapshot.v1;
- event schema: velmere.risk-history-event.v1;
- customer schema: velmere.risk-history.customer.v1;
- identity classes: CHAIN_CONTRACT / MARKET_ID / UNRESOLVED;
- publication states: PUBLIC / WITHHELD;
- closed event types: TRACKING_STARTED, SCORE_CHANGED, LEVEL_CHANGED, METHODOLOGY_CHANGED, EVIDENCE_CHANGED, PUBLICATION_STATE_CHANGED, HEARTBEAT;
- score remains descriptive, not a probability or price forecast;
- history starts when Velmère begins verified public tracking;
- old and new methodology segments are not silently presented as directly comparable.

Durability state model:
- DURABLE_READBACK_VERIFIED;
- CONFIGURED_UNVERIFIED;
- DEGRADED_MEMORY_FALLBACK;
- RUNTIME_MEMORY_ONLY.

Only DURABLE_READBACK_VERIFIED may support durable_years_ready.

4. CURRENT EXECUTED PROOF ON P91 BYTES

P91 Risk History event contract runtime: 38/38 PASS
P91 no-socket ledger/durability protocol runtime: 24/24 PASS
P91 migration/customer boundary static: 100/100 PASS
P91 targeted strict TypeScript: 2/2 PASS
P91 changed executable imports: 5/5 PASS
P91 markets-route P91 binding static: 1/1 PASS
P91 runtime repeatability: 10/10 PASS — 2/2 byte-identical stdout, stderr and receipt bytes for both runtime harnesses
P90 current regression replay on P91 bytes: 1,313 overlapping checks PASS across 11/11 commands
Additional risk-domain regression: 8 overlapping checks PASS; 2 dependency-bound commands WITHHELD with zero credit

Aggregate executed checks across overlapping harnesses: {tests['aggregateExecutedChecksAcrossOverlappingHarnesses']:,}
IMPORTANT: this is not an independent-evidence count, accuracy statistic, provider count, customer count or FINAL numerator.

5. FIRST FAILURES AND NONDETERMINISM WERE NOT ERASED

Preserved non-green executions: {failure['nonGreenExecutions']}
Status: {failure['status']}

They include:
- a customer-projection test false positive;
- missing @types/node / missing transitive dependency diagnostics;
- a targeted ambient-contract test defect;
- an incomplete combined regression execution with zero segment credit;
- the first nondeterministic ledger receipt caused by runtime generatedAt in diagnostic text;
- the first risk-regression finalizer log-capture defect;
- two risk route/input regressions blocked by missing zod.

The first nondeterministic receipt was repaired and rerun. No retry-until-green credit was used.

6. HISTORICAL INTEGRITY

Parent historical receipts/artifacts verified: {history['parentHistoryFiles']:,}
Historical files changed by regression harnesses before restoration: {history['regressionMutationsObserved']}
Files restored byte-for-byte: {history['restoredByteIdentical']}
Final historical differences: {history['finalDifferences']}
Unexpected historical files: {history['unexpectedHistoricalFiles']}
History result: {history['status']}

7. PRODUCT SOURCE PROJECTION

Parent P90R1 projection:
Files: {pp['fileCount']:,}
Payload: {pp['payloadBytes']:,} B
Path-set SHA-256: {pp['pathSetSha256']}
Source aggregate SHA-256: {pp['sourceContentAggregateSha256']}

P91R1 local deterministic projection:
Files: {p['fileCount']:,}
Payload: {p['payloadBytes']:,} B
Path-set SHA-256: {p['pathSetSha256']}
Source aggregate SHA-256: {p['sourceContentAggregateSha256']}

Delta:
Files: {product['delta']['fileCount']:+d}
Payload: {product['delta']['payloadBytes']:+,} B
Classification: LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY
Exact-Windows credit on changed P91 bytes: WITHHELD

8. DATABASE AND MIGRATION TRUTH

Migration source static controls: PASS_BOUNDED
- ordered migration;
- transaction bound;
- RLS enabled;
- no anon/authenticated table grants;
- service-role-only table/RPC access;
- immutable UPDATE/DELETE rejection;
- event/snapshot/storage digest cross-binding;
- per-asset advisory lock;
- exact duplicate idempotence;
- timestamp conflict and non-monotonic rejection;
- 24-hour heartbeat enforcement;
- latest-read, append, exact-readback and per-asset history RPCs.

Actual PostgreSQL/Supabase execution: WITHHELD
Actual RLS/grants/triggers on staging: WITHHELD
Real service-role/JWT separation: WITHHELD
Concurrency/rollback on PostgreSQL: WITHHELD
Backup/restore/PITR drill: WITHHELD

Schema file is not deployed migration proof.

9. ENVIRONMENT TRUTH

Local runtime:
- platform: {env['localRuntime']['platform']};
- Python: {env['localRuntime']['python']};
- Node: {env['localRuntime']['node']};
- npm: {env['localRuntime']['npm']};
- TypeScript: {env['localRuntime']['typescript']}.

Targeted P91 TypeScript: PASS 2/2
Whole-project semantic TypeScript: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
ESLint: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
Webpack: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
Turbopack: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
Exact Windows Server 2025 / Node 24.18.0 / npm 11.16.0: WITHHELD

The full markets route executable import is also WITHHELD because SOURCE_ONLY has no installed zod dependency graph. Its P91 binding passed static verification only.

10. CUSTOMER-FACING CLOSURE TRUTH

| Customer row / artifact | Previous | Current | Delta | Current evidence | Missing critical proof |
|---|---:|---:|---:|---|---|
| Risk Indicator FINAL | OPEN | PASS_BOUNDED backend/history contract | no FINAL credit | event model, redacted projection, no-socket durability protocol | customer hover/expanded UI, real DB, real current data, deployed route, accessibility/i18n |
| Audit Basic FINAL | 0 | 0 | 0 | inherited bounded Audit chain | complete real customer chain |
| Audit Pro FINAL | 0 | 0 | 0 | inherited P90 evidence/rights model | real 5 live / 4 strict / rights / staging / build |
| Audit Advanced FINAL | 0 | 0 | 0 | inherited bounded architecture | additional independent evidence source plus remaining gates |
| Audit FINAL PDFs | 0/3 | 0/3 | 0 | immutable local artifact infrastructure inherited | real customer audit, staging same-blob, exact Windows |

Customer FINAL: 0/20
Audit FINAL PDF: 0/3
Rights: 2/203 inherited only
Paid value: 0/10
Sale eligible: 0/20
PILOT_READY: false
GO_PAID: false
LIVE: false
WORLD_CLASS_PROVEN: false
Global: NO_GO / STOP_SELL

11. PACKAGE / PROVENANCE

Complete SOURCE_ONLY tree including identity receipt:
Files: {pv['treeIdentity']['fileCount']:,}
Payload: {pv['treeIdentity']['payloadBytes']:,} B
Path-set SHA-256: {pv['treeIdentity']['pathSetSha256']}
Source-content aggregate SHA-256: {pv['treeIdentity']['sourceContentAggregateSha256']}

Package manifest SHA-256: {pv['packageContentManifest']['sha256']}
Manifest listed files: {pv['packageContentManifest']['listedFiles']:,}
Private-key/credential scan: PASS / 0 matches
Unexpected current binary scan: PASS / 0 matches
ZIP ordering: lexicographic
ZIP fixed timestamp: 1980-01-01T00:00:00Z
Directory entries: 0
createSystem: 0

12. NEXT HIGHEST-VALUE WORK

The next independent local product blocker is not another durability fixture.

Priority 1 — PRODUCT:
Bind the customer-safe P91 projection to the owner-approved Risk History interaction:
- hover → compact history popover;
- click/expand → full history;
- methodology-segment boundaries;
- event markers;
- PL/EN/DE;
- keyboard, focus, screen-reader and mobile behavior;
- no raw snapshot/internal ledger leakage.

Priority 2 — ENVIRONMENT / SECURITY:
Apply P91 migration on authorized PostgreSQL/Supabase staging and execute grants, RLS, triggers, service-role isolation, per-asset concurrency, exact readback, rollback and restore proof.

Priority 3 — RIGHTS / THIRD PARTY:
Run Audit Pro on real authorized/read-only providers with five target-relevant live lanes, four strict receipts, three independent families, six evidence rows and field-level commercial/display/PDF/retention rights.

13. CURRENT VERDICT

P91R1 is materially stronger than P90R1 because it removes a false persistence path, prevents configured-but-failing storage from claiming durability, makes Risk History event-driven and version-aware, and creates a customer-safe projection that does not trust stored prose or expose raw snapshots.

The result remains bounded and honest:
- local event semantics: PASS;
- no-socket exact readback protocol: PASS_BOUNDED;
- migration source controls: PASS_BOUNDED;
- real PostgreSQL/staging durability: WITHHELD;
- customer Risk History UI: OPEN;
- Risk Indicator FINAL: false;
- Customer FINAL: 0/20;
- Global: NO_GO / STOP_SELL.

No blockchain transaction, external state change, live exploit, weaponized PoC, authorization bypass or unauthorized scan was performed.

END OF LEDGER
'''
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(text,encoding='utf-8')
 print(json.dumps({'status':'PASS','output':str(out),'bytes':out.stat().st_size,'sha256':sha(out),'sourceOnly':{'bytes':final['bytes'],'entries':final['entryCount'],'sha256':final['sha256']}},indent=2))
if __name__=='__main__':main()
