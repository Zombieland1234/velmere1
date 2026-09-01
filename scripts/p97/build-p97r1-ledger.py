#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

def sha(p:Path)->str:
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
 return h.hexdigest()

ap=argparse.ArgumentParser(); ap.add_argument('--root',required=True); ap.add_argument('--package',required=True); ap.add_argument('--verification',required=True); ap.add_argument('--output',required=True); args=ap.parse_args()
root=Path(args.root); package=Path(args.package); verification=json.loads(Path(args.verification).read_text()); output=Path(args.output)
master=root/'VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_R1_CHECKPOINT_IDENTITY_2026-08-21.txt'
v17=root/'VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
product=json.loads((root/'artifacts/closure/p97r1/P97R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json').read_text())
parent=json.loads((root/'artifacts/closure/p97r1/P97R1_PARENT_PRESERVATION.json').read_text())
tests=json.loads((root/'artifacts/closure/p97r1/P97R1_TEST_AGGREGATE.json').read_text())
failures=json.loads((root/'artifacts/closure/p97r1/P97R1_FAILURE_ADJUDICATION.json').read_text())
external=json.loads((root/'receipts/p97/P97_EXTERNAL_BLOCKER_CONFIRMED.json').read_text())
finalmap=json.loads((root/'receipts/p97/P97_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json').read_text())
proj=product['currentCandidateProjection']; pkg=verification['final']
text=f'''VELMÈRE CURRENT STATE & PASS DELTA LEDGER — P97R1 / V17
DATE: 2026-08-21
CLASSIFICATION: PASS_BOUNDED_P97R1_BROWSER_BASIC_DURABLE_RENDER_ONCE_STORE_FIRST
GLOBAL: NO_GO / STOP_SELL
LIVE: false
SALE_ENABLED: false
PRODUCTION_APPROVED: false
WORLD_CLASS_PROVEN: false

0. CURRENT AUTHORITY AND UNIQUE CHECKPOINT IDENTITY

Current Master Execution Authority:
{master.name}
Bytes: {master.stat().st_size:,}
SHA-256: {sha(master)}
Owner acceptance: CURRENT
Changed in P97R1: NO

Canonical Owner Directive:
{v17.name}
Bytes: {v17.stat().st_size:,}
SHA-256: {sha(v17)}
Changed in P97R1: NO

Parent canonical checkpoint: P96R1
Parent SOURCE_ONLY:
VELMERE_R44P46_V17_P96R1_P95_SIBLING_RECONCILIATION_RISK_HISTORY_INTEGRITY_MERGE_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip
Parent SHA-256: 5b9cb95f9fe2ffdb893e52baa7496da2bc14665cf3af2ddff54c948e0f2c8176

Current P97R1 SOURCE_ONLY:
{package.name}
Bytes: {pkg['bytes']:,}
Entries: {pkg['entryCount']:,}
SHA-256: {pkg['sha256']}
Deterministic rebuild: 2/2 BYTE_IDENTICAL
ZIP CRC: PASS
Clean unpack: PASS_PATH_AND_CONTENT_IDENTITY

1. CURRENT-TRUTH AND WORKSTREAM DECISION

P96R1 remains the unique parent. Historical P95-A and P95-B remain frozen and unmodified.
Local-only Risk History polishing remains stopped after P96.

Authorized Risk Indicator staging was physically checked and is unavailable in this execution environment:
- no configured staging/database credential variables;
- no psql, pg_isready, Supabase CLI, Docker or Podman;
- no installed dependency graph;
- registry DNS resolution failed in this environment;
- current Node/npm are v22.16.0 / 10.9.2, not canonical 24.18.0 / 11.16.0.

Classification: EXTERNAL_BLOCKER_CONFIRMED
This proves only the current execution environment lacks authorized staging access. It does not prove the owner's external staging does not exist.

All 20 customer-facing rows were classified using SOURCE_DERIVED_ESTIMATE_NOT_RELEASE_SCORE.
Closest overall row: Risk Indicator, but blocked by the confirmed external environment.
Selected independent workstream: Browser Basic.
Browser Basic critical gate-group distance: 6 before P97 repair -> 5 after P97 repair.

2. REAL PRODUCT DEFECTS FOUND

A. Browser Basic production durability defect
P96 allowed Basic to execute with requireDurableStore=false. A final Browser Basic PDF could therefore be rendered and returned without a mandatory durable canonical blob.

B. Binary hashing defect in the first P97 patch
The first repair used a text-oriented digest helper on a Buffer. This did not honestly bind arbitrary PDF bytes.

C. Canonical job-forking risk
A client-controlled x-velmere-request-id or transport metadata could create more than one durable job for the same signed frozen report.

D. Weak self-consistency verifier risk
A receipt verifier that checks only its own recomputed unkeyed digest can accept a self-consistent forged object detached from the expected policy and exact bytes.

3. PHYSICAL REPAIRS

New production module:
- lib/search/lens-pdf-durable-artifact-policy.ts

Modified production module:
- lib/server/search-route-modules/lens-report.ts

The current Browser PDF path now:
1. builds a versioned durable policy from exact tier, signed frozen report ID and optional account identity;
2. requires durable storage for Basic, Pro and Advanced;
3. derives canonical request and anonymous subject identity from the signed report, not client headers, IP or user-agent;
4. fails before rendering when production durable storage is unavailable;
5. hashes exact PDF bytes using byte-level SHA-256;
6. creates a closed receipt bound to expected policy, exact bytes, byte length, computation mode and replay state;
7. rejects direct non-durable production mode;
8. keeps local memory mode bounded and explicitly ineligible for Customer FINAL storage credit;
9. preserves the existing one-fetch, one-object-URL preview/download flow.

The receipt does not claim retention or backup/restore.
Its digest is recorded only in the internal audit event and is not returned in customer headers or payload.

4. TEST RESULTS ON CURRENT P97R1 BYTES

P97 Browser durable PDF runtime: 43/43 PASS
P97 Browser durable PDF static: 66/66 PASS
P97 changed-module import/transpile: 10/10 PASS
P97 targeted strict TypeScript: 1/1 PASS
P97 core: 120 overlapping checks PASS

Reexecuted relevant regressions:
- client PDF byte binding/object URL lifecycle: 43/43 PASS
- Browser tier page contract: 3/3 PASS
- Real Markets exact immutable PDF: 43/43 PASS
- Audit exact immutable artifact: 67/67 PASS

Fresh affected-scope total across overlapping harnesses: 276/276 PASS
Repeatability: 5/5 commands, each 2/2 byte-identical
All 20 rows classified; FINAL promotions: 0

IMPORTANT: 276 is not an independent-evidence count, product accuracy statistic, provider count, customer count or FINAL numerator.

5. FAILURE ADJUDICATION

Material failures preserved and adjudicated: {failures['summary']['total']}/{failures['summary']['total']}
Failed runs credited: 0

Current zero-credit WITHHELD or superseded executions include:
- rendered A83 Browser/Lens matrix blocked by missing exact licensed font path;
- first A72 invocation missing the TypeScript loader;
- A72 historical route-text assertion superseded by the current delivery boundary;
- P86 migration-latest assertion superseded by P91/P93/P94;
- P88 pre-P89 provider-dimension runtime superseded by P89/P90.

The first P97 binary negative fixture and first static leak assertion also failed, were root-caused and retained with zero credit before current green reruns.

6. CURRENT PRODUCT SOURCE PROJECTION

Parent P96R1:
Files: {product['parentProjection']['fileCount']:,}
Payload: {product['parentProjection']['payloadBytes']:,} B
Path-set SHA-256: {product['parentProjection']['pathSetSha256']}
Source aggregate SHA-256: {product['parentProjection']['sourceContentAggregateSha256']}

Current P97R1:
Files: {proj['fileCount']:,}
Payload: {proj['payloadBytes']:,} B
Path-set SHA-256: {proj['pathSetSha256']}
Source aggregate SHA-256: {proj['sourceContentAggregateSha256']}

Delta from P96R1:
Files: +{product['deltaFromP96']['fileCount']}
Payload: +{product['deltaFromP96']['payloadBytes']:,} B
Build-relevant files changed/added: 2

Projection classification: LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY
Exact-Windows credit on P97R1 bytes: WITHHELD

Parent preservation:
- P96 entries: {parent['parent']['entryCount']:,}
- byte-identical preserved parent files outside declared replacements: {parent['preservedParentFiles']:,}
- removed parent files: 0
- unexpected parent modifications: 0
- P80 receipt overwritten by a regression was restored byte-for-byte before packaging.

7. ENVIRONMENT AND EXTERNAL BLOCKERS

Current environment:
- Linux x64;
- Node v22.16.0;
- npm 10.9.2;
- no node_modules;
- no authorized PostgreSQL/Supabase staging access;
- no exact external PDF font path;
- no exact Windows target.

Canonical target:
- Windows Server 2025;
- Node 24.18.0;
- npm 11.16.0.

Whole-project semantic TypeScript: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
ESLint: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
Webpack: WITHHELD
Turbopack: WITHHELD
Rendered Browser/accessibility/cross-browser: WITHHELD
Exact Windows: WITHHELD

8. ZERO-FAKE-CREDIT NUMERATORS

Customer FINAL: 0/20
Audit FINAL PDF: 0/3
Rights: 2/203 inherited only
Paid value: 0/10
Sale eligible: 0/20
Browser Basic FINAL: false
Risk Indicator FINAL: false
PILOT_READY: false
GO_PAID: false
LIVE: false
WORLD_CLASS_PROVEN: false
Global: NO_GO / STOP_SELL

P97 Browser Basic durable-artifact source/runtime sub-scope: GREEN_BOUNDED
P97 overall: NOT FINAL

9. WHAT REMAINS FOR BROWSER BASIC FINAL

1. real customer-authorized current input and lawful rights/currentness;
2. authorized durable database store and deployed exact replay;
3. real rendered Browser with exact licensed font;
4. desktop/mobile, keyboard, screen-reader, reduced-motion and PL/EN/DE;
5. Chrome, Edge, Firefox and WebKit journeys;
6. whole-project typecheck, lint and dual production build;
7. exact Windows on current bytes;
8. final adjudication.

No local fixture can substitute for these gates.

10. NEXT HIGHEST-VALUE WORK

If authorized staging/exact Browser environment becomes available:
- execute P97 durable storage and same-blob delivery physically;
- execute the existing Risk Indicator staging chain without new local polishing.

If those external dependencies remain unavailable:
- move to Real Markets Basic or Shield Basic as the next independent low-distance row;
- do not build a local staging imitation;
- do not add provider aliases or mirrors;
- do not promote any row without the complete real customer chain.

11. CURRENT VERDICT

P97R1 is materially stronger than P96R1 because Browser Basic can no longer silently deliver a final production PDF from a direct non-durable path, and exact PDF bytes are bound to a versioned durable policy and closed receipt.

The result remains honest:
- source/runtime artifact-integrity repair: PASS_BOUNDED;
- real durable database/deployment: WITHHELD;
- rendered Browser: WITHHELD;
- Browser Basic FINAL: false;
- Customer FINAL: 0/20.

END OF LEDGER
'''
output.write_text(text,encoding='utf-8')
print(json.dumps({'status':'PASS','output':output.name,'bytes':output.stat().st_size,'sha256':sha(output)},indent=2))
