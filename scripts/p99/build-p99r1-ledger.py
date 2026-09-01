#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=Path('/mnt/data/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P99R1_V17_2026-08-21.txt')
ZIP=Path('/mnt/data/VELMERE_R44P46_V17_P99R1_REAL_MARKETS_BASIC_FIELD_RIGHTS_SEMANTIC_REFERENCE_FAIL_CLOSED_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip')
VERIFY=Path('/mnt/data/P99R1_PACKAGE_VERIFICATION.json')
MASTER=Path('/mnt/data/VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_R1_CHECKPOINT_IDENTITY_2026-08-21.txt')
V17=Path('/mnt/data/VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt')
PARENT=Path('/mnt/data/VELMERE_R44P46_V17_P98R1_EXACT_PAID_TIER_DELIVERY_NO_IMPLICIT_DOWNGRADE_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip')
PARENT_LEDGER=Path('/mnt/data/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P98R1_V17_2026-08-21.txt')
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
 return h.hexdigest()
pv=json.loads(VERIFY.read_text());prod=json.loads((ROOT/'artifacts/closure/p99r1/P99R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json').read_text());tests=json.loads((ROOT/'artifacts/closure/p99r1/P99R1_TEST_AGGREGATE.json').read_text());fails=json.loads((ROOT/'receipts/p99/P99_FAILURE_ADJUDICATION.json').read_text());identity=json.loads((ROOT/'artifacts/closure/p99r1/P99R1_TREE_IDENTITY_EXCLUDING_SELF.json').read_text());manifest=identity['packageContentManifest'];cur=prod['currentCandidateProjection'];par=prod['parentProjection']
with zipfile.ZipFile(ZIP) as z: entries=len(z.infolist())
text=f'''VELMÈRE CURRENT STATE & PASS DELTA LEDGER — P99R1 / V17
DATE: 2026-08-21
CLASSIFICATION: PASS_BOUNDED_P99R1_REAL_MARKETS_BASIC_FIELD_RIGHTS_SEMANTIC_REFERENCE_FAIL_CLOSED
GLOBAL: NO_GO / STOP_SELL
LIVE: false
SALE_ENABLED: false
PRODUCTION_APPROVED: false
WORLD_CLASS_PROVEN: false

0. CURRENT AUTHORITY AND UNIQUE PARENT

Current Master Execution Authority:
{MASTER.name}
Bytes: {MASTER.stat().st_size:,}
SHA-256: {sha(MASTER)}
Owner status: CURRENT
Changed in P99R1: NO

Canonical Owner Directive:
{V17.name}
Bytes: {V17.stat().st_size:,}
SHA-256: {sha(V17)}
Changed in P99R1: NO

Parent canonical checkpoint: P98R1
Parent SOURCE_ONLY: {PARENT.name}
Bytes: {PARENT.stat().st_size:,}
SHA-256: {sha(PARENT)}
Parent ledger: {PARENT_LEDGER.name}
Parent ledger SHA-256: {sha(PARENT_LEDGER)}

Current P99R1 SOURCE_ONLY: {ZIP.name}
Bytes: {ZIP.stat().st_size:,}
Entries: {entries:,}
SHA-256: {sha(ZIP)}
Deterministic rebuild: {pv['deterministicRebuild']}
ZIP CRC: PASS
Clean unpack: {pv['final']['cleanUnpack']}

Unique checkpoint identity: PASS
P98R1 is the only direct canonical parent. Historical P95 siblings remain frozen through P96 and are not modified.

1. WORKSTREAM DECISION

Authorized PostgreSQL/Supabase staging and the exact dependency/Windows environment remain unavailable in this execution environment. This remains EXTERNAL_BLOCKER_CONFIRMED for the staging-dependent chain only.

No local-only Risk History polishing was performed.
All 20 customer-facing rows were reclassified. Real Markets Basic was selected as the next independent low-distance row because its current customer route had a real rights and semantic-truth defect.

2. REAL PRODUCT DEFECTS FOUND

A. Unverified provider rights could still reach customer delivery
The current rights sources classify CoinGecko and Binance as unverified for public display, commercial use and redistribution. The markets route could nevertheless call those providers and return customer rows.

B. HTTP/provider success could be mislabeled as live market truth
Aggregated multi-venue reference data could be labeled mode/freshness live even though it was not a venue quote, executable quote or independently proven current market price.

C. Local deterministic reference rows were reachable from the customer route
When external lanes failed, the route could expose local development reference rows. A fixture/reference is not customer market truth.

D. Missing field-level semantic and rights contract
The 23 required Basic fields did not all carry one explicit contract for semantic class, unit/currency, venue scope, maximum age, currentness and execution eligibility.

E. Type-declaration reachability defect
The existing .mjs rights gate had only a sibling .d.ts. Bundler TypeScript resolution required a matching .d.mts declaration.

3. PHYSICAL REPAIRS

New production/config files:
- config/p99/real-markets-basic-field-rights-currentness-registry.json
- lib/market-integrity/real-markets-basic-field-policy.ts
- lib/compliance/provider-delivery-rights-gate.d.mts

Modified production files:
- lib/market-integrity/market-row-delivery-gate.ts
- lib/server/market-integrity-route-modules/markets.ts

Current behavior:
1. the exact field registry and official rights matrix are verified before customer delivery;
2. unverified rights return a minimal 503 WITHHELD response before provider, durable cache or fallback execution;
3. no market rows, provider topology, internal blocker graph or receipt roots are exposed in the WITHHELD payload;
4. the local development reference fallback is removed from the customer route;
5. each of 23 fields has an explicit semantic/currentness/unit/venue/execution contract;
6. price is aggregated reference data, not a live, venue-specific or executable quote;
7. market-row evidence and public projections carry those semantics;
8. the verifier reconstructs the complete expected decision and rejects recomputed-digest mutations;
9. no Risk History product file changed.

4. CURRENT-BYTE TEST RESULTS

P99 rights/semantic runtime: 52/52 PASS
P99 static/source/security: 81/81 PASS
P99 targeted strict TypeScript: 1/1 PASS_BOUNDED
P99 changed-module reachability:
- new policy import: PASS
- exact source transpile: 3/3 PASS
- market-row gate import: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
- customer markets route import: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
P99 selected current-byte regressions:
- P98 exact paid-tier runtime/static: 123/123 PASS
- P87 Real Markets exact-PDF runtime: 43/43 PASS
- P97 Browser durable-PDF runtime: 43/43 PASS
- Binance fallback normalization contract: 8/8 PASS

Affected-scope aggregate: {tests['overlappingChecks']['passed']}/{tests['overlappingChecks']['total']} passed, {tests['overlappingChecks']['withheld']} WITHHELD, 0 failed.
Repeatability: 4/4 commands, each 2/2 byte-identical receipt.

IMPORTANT: {tests['overlappingChecks']['passed']} is an overlapping check count. It is not independent evidence, provider count, customer count, accuracy, full-project regression or FINAL numerator.

5. FAILURE ADJUDICATION

Preserved/adjudicated groups: {fails['summary']['total']}
Credited as PASS: 0

Included:
- the parent rights/live-label/local-reference product defect;
- route and market-gate imports blocked by missing zod;
- the first wrong global TypeScript path;
- the .mjs/.d.mts declaration-resolution defect;
- the historical P36 local-reference harness frozen to its old active-pass identity;
- the historical P6 market-gate runtime blocked by missing zod;
- the P87 current-byte receipt overwrite, copied to P99 scope and restored byte-for-byte in frozen history.

No retry-until-green, nonzero run, superseded harness or environment failure received PASS credit.

6. PRODUCT SOURCE PROJECTION

Parent P98R1:
Files: {par['fileCount']:,}
Payload: {par['payloadBytes']:,} B
Path-set SHA-256: {par['pathSetSha256']}
Source aggregate SHA-256: {par['sourceContentAggregateSha256']}

Current P99R1:
Files: {cur['fileCount']:,}
Payload: {cur['payloadBytes']:,} B
Path-set SHA-256: {cur['pathSetSha256']}
Source aggregate SHA-256: {cur['sourceContentAggregateSha256']}

Delta from P98R1:
Files: {cur['fileCount']-par['fileCount']:+d}
Payload: {cur['payloadBytes']-par['payloadBytes']:+,} B
Build-relevant files changed/added: {len(prod['changedBuildRelevantFiles'])}

Projection classification: LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY
Exact-Windows credit on P99R1 bytes: WITHHELD

7. PACKAGE AND TREE IDENTITY

Complete SOURCE_ONLY tree identity excluding only its self-referential identity receipt:
Files: {identity['fileCount']:,}
Payload: {identity['payloadBytes']:,} B
Path-set SHA-256: {identity['pathSetSha256']}
Source-content aggregate SHA-256: {identity['sourceContentAggregateSha256']}
Full package count including identity receipt: {identity['fullPackageFileCountIncludingThisIdentityFile']:,}

Package content manifest:
Rows: {manifest['listedFiles']:,}
Bytes: {manifest['bytes']:,}
SHA-256: {manifest['sha256']}
Exact verification: PASS

ZIP ordering: lexicographic
ZIP timestamp: 1980-01-01T00:00:00Z
Directory entries: 0
ZIP createSystem: 0
Secret/private-key scan: 0 matches
Unexpected P99 binary scan: 0 matches

8. ENVIRONMENT TRUTH

Current environment:
- Linux x64;
- Node v22.16.0;
- npm 10.9.2;
- global TypeScript 5.8.3;
- no node_modules;
- zod unavailable;
- no authorized PostgreSQL/Supabase credentials/tooling.

Canonical target:
- Windows Server 2025;
- Node 24.18.0;
- npm 11.16.0.

Whole-project semantic TypeScript: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
ESLint: WITHHELD
Webpack: WITHHELD
Turbopack: WITHHELD
Rendered Browser/accessibility/cross-browser: WITHHELD
Exact Windows: WITHHELD

9. ZERO-FAKE-CREDIT NUMERATORS

Customer FINAL: 0/20
Audit FINAL PDF: 0/3
Rights: 2/203 inherited only
Paid value: 0/10
Sale eligible: 0/20
Real Markets Basic FINAL: false
Real Markets Pro FINAL: false
Real Markets Advanced FINAL: false
PILOT_READY: false
GO_PAID: false
LIVE: false
WORLD_CLASS_PROVEN: false
Global: NO_GO / STOP_SELL

P99 field-rights/semantic fail-closed sub-scope: GREEN_BOUNDED
P99 overall: NOT FINAL

10. WHAT REMAINS FOR REAL MARKETS BASIC FINAL

1. lawful field-level public display, derived-use, cache, retention and export rights;
2. real customer-authorized current market input;
3. provider/venue/session timestamps and freshness proof;
4. correct conflict/outage/stale behavior on the real route;
5. deployed durable customer output and account/authorization boundaries where applicable;
6. rendered desktop/mobile Browser, accessibility and PL/EN/DE;
7. whole-project TypeScript, lint and dual builds;
8. exact Windows on current bytes;
9. final adjudication.

Until rights are approved, the correct customer result is WITHHELD, not a fabricated market table.

11. NEXT HIGHEST-VALUE WORK

If authorized staging/exact engineering becomes available, execute the existing Risk Indicator and Browser Basic chains physically.
If Real Markets rights become available, run the exact P99 preflight and real customer route without weakening semantic classes.
While both remain blocked, continue to Shield Basic real-current evidence, rights, risk-logic and customer fail-closed behavior as the next independent workstream.

12. CURRENT VERDICT

P99R1 is materially stronger because Real Markets Basic no longer treats a reachable public endpoint or HTTP success as commercial permission or live market truth. The route fails closed before provider execution and each customer field now has an explicit semantic contract.

The result remains honest:
- source-level field rights/currentness gate: PASS_BOUNDED;
- customer provider execution: WITHHELD;
- rights approval: WITHHELD;
- real current fields: WITHHELD;
- rendered/deployed customer route: WITHHELD;
- Real Markets Basic FINAL: false;
- Customer FINAL: 0/20.

END OF LEDGER
'''
OUT.write_text(text,encoding='utf-8')
print(json.dumps({'file':OUT.name,'bytes':OUT.stat().st_size,'sha256':sha(OUT)},indent=2))
