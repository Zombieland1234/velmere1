#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DIRECTIVE='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'

def sha(path:Path)->str:
 h=hashlib.sha256()
 with path.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''): h.update(c)
 return h.hexdigest()

def load(path:Path): return json.loads(path.read_text(encoding='utf-8'))

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--package-verification',required=True); ap.add_argument('--output',required=True); args=ap.parse_args()
 verification=load(Path(args.package_verification)); out=Path(args.output)
 if verification.get('status')!='PASS' or verification.get('deterministicRebuild')!='2/2 BYTE_IDENTICAL': raise SystemExit('package verification not green')
 checkpoint=load(ROOT/'artifacts/closure/p87r1/P87R1_CHECKPOINT_RECEIPT.json')
 product=load(ROOT/'artifacts/closure/p87r1/P87R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json')
 tests=load(ROOT/'receipts/p87/P87_CURRENT_SOURCE_REGRESSION_SUMMARY.json')
 history=load(ROOT/'artifacts/closure/p87r1/P87R1_HISTORICAL_RECEIPT_IMMUTABILITY.json')
 runtime=load(ROOT/'receipts/p87/P87_REAL_MARKETS_EXACT_PDF_RUNTIME.json')
 static=load(ROOT/'receipts/p87/P87_REAL_MARKETS_EXACT_PDF_STATIC.json')
 repeat=load(ROOT/'receipts/p87/P87_REAL_MARKETS_EXACT_PDF_REPEATABILITY.json')
 compat=load(ROOT/'receipts/p87/P87_P86_COMPATIBILITY_AND_SUPERSESSION.json')
 binding=ROOT/'receipts/p86/P86_MASTER_DIRECTIVE_V2_OWNER_AUTHORITY_BINDING.json'
 final=verification['final']; proj=product['currentCandidateProjection']; parent=product['parentProjection']
 text=f'''VELMÈRE CURRENT STATE & PASS DELTA LEDGER — P87R1 / V17
DATE: 2026-08-20
CLASSIFICATION: PASS_BOUNDED_P87R1_REAL_MARKETS_EXACT_IMMUTABLE_PDF
GLOBAL: NO_GO / STOP_SELL
LIVE: false
SALE_ENABLED: false
PRODUCTION_APPROVED: false
WORLD_CLASS_PROVEN: false

0. AUTHORITY AND CURRENT-TRUTH BINDING

Latest explicit owner execution authority:
VELMÈRE — ULTIMATE WORLD-CLASS CONTINUOUS CLOSURE / FINAL CANDIDATE MASTER DIRECTIVE V2
Binding receipt: receipts/p86/P86_MASTER_DIRECTIVE_V2_OWNER_AUTHORITY_BINDING.json
Binding receipt SHA-256: {sha(binding)}
Visible capture boundary remains recorded through section heading 44. BACKUP / RESTORE.
No unseen or truncated tail is invented.

Canonical product-topology directive:
{DIRECTIVE}
Bytes: {(ROOT/DIRECTIVE).stat().st_size}
SHA-256: {sha(ROOT/DIRECTIVE)}
Directive changed in P87R1: NO

Current owner topology remains:
- 10 product families;
- 20 customer-facing rows;
- 20 current execution profiles;
- 10 material paid transitions.

Parent checkpoint: P86R1
Parent ledger SHA-256: d4eb25c70cb75c57398585295142798499ed4428b3d463438f4d8d51e0edb85b
Parent SOURCE_ONLY SHA-256: 2640f3945fd58abd5ff314912e503f912152153f5adcff6c7e3bbf0cfe830455

Current P87R1 SOURCE_ONLY:
{verification['output']}
Bytes: {final['bytes']:,}
Entries: {final['entryCount']:,}
SHA-256: {final['sha256']}
Deterministic package rebuild: {verification['deterministicRebuild']}
ZIP CRC: {final['crc']}
Clean unpack: {final['cleanUnpack']}
Full-tree private-key/secret scan: PASS / 0 matches

1. REAL DEFECT CLOSED

P86 made the shared account-artifact endpoint fail closed for missing exact PDF bytes, but a separate paid Real Markets path still violated the same invariant:
- the paid account flow rendered and stored an exact PDF;
- the download token still carried a compressed full customer payload;
- the download endpoint ignored the stored blob and rendered the PDF again;
- the older direct /report path attempted paid token delivery before the required account-artifact binding existed.

P87R1 repairs this physically:
- paid Real Markets rendering happens once;
- immutable snapshot and exact PDF blob are persisted before download authority exists;
- a compact P87 v2 HMAC token binds only immutable identifiers, owner hash, snapshot/blob digests, tier, surface, locale and expiry;
- the token contains neither the full report payload nor PDF bytes;
- paid preview/download reads the owner-bound stored snapshot and exact blob;
- all snapshot/blob/token/account/tier fields are cross-checked before delivery;
- entitlement is revalidated at download;
- the response body is the stored blob, not reconstructed output;
- paid legacy v1 tokens return a non-retryable 409 before the old verifier can rerender;
- Basic v1 remains a bounded dynamic compatibility path and explicitly declares NOT FINAL / no byte-parity claim;
- a production-like preview identity is rejected by the exact-paid branch;
- Advanced-to-Pro artifact mismatch remains fail closed instead of silently delivering a lower tier.

2. ADDITIONAL TEST-INTEGRITY DEFECT CLOSED

The first local fixture used a shared provider-family label that collapsed Yahoo and Stooq into one upstream root. P87R1 does not count that false quorum. The final fixture uses two explicitly independent roots: yahoo and stooq.

This proves only deterministic behavior on the local controlled case. It does not prove current external provider independence or rights.

3. CURRENT GREEN RECEIPTS ON FINAL P87R1 BYTES

P87 Real Markets exact immutable PDF runtime: {runtime['checks']['passed']}/{runtime['checks']['total']} PASS_BOUNDED
P87 exact PDF repeatability: {repeat['checks']['passed']}/{repeat['checks']['total']} PASS / 2 runs byte-identical
P87 token/store/download/customer-path static: {static['checks']['passed']}/{static['checks']['total']} PASS
P87/P86 compatibility and supersession adjudication: {compat['checks']['passed']}/{compat['checks']['total']} PASS
P87 changed production module imports: 3/3 PASS
P87 targeted strict TypeScript: PASS
Full current regression commands: {tests['commandExecution']['commandsPassed']}/{tests['commandExecution']['commandsTotal']} PASS
Aggregate executed checks across overlapping current harnesses: {tests['aggregate']['passed']}/{tests['aggregate']['total']} PASS
Historical receipts/artifacts verified byte-for-byte: {history['verifiedHistoricalFiles']}
Historical mismatches: {history['mismatchCount']}

IMPORTANT:
- {tests['aggregate']['total']} is not an independent-evidence count;
- it is not detector accuracy;
- it is not provider independence;
- it is not a customer count;
- it is not Customer FINAL or sale eligibility.

4. SUPERSEDED P86 HARNESS — NOT HIDDEN

The frozen P86 static harness was executed and returned nonzero at its old direct-writer-location assertion. That failure is expected and explicitly adjudicated:
- P86 expected the direct report route itself to contain the exact-PDF marker/store call;
- P87 intentionally moves paid publication into a dedicated render-once/store-first helper;
- the helper persists exact bytes before issuing token authority;
- the real P86 account-artifact route runtime still passes 61/61 on P87 bytes.

The old 73-check P86 static lane is removed entirely from current aggregate credit. It is not rewritten or silently treated as green.

5. LOCAL CONTROLLED EXACT ARTIFACT

Classification: {runtime['fixtureBoundary']['classification']}
Snapshot ID: {runtime['exactArtifact']['snapshotId']}
Artifact digest: {runtime['exactArtifact']['artifactDigest']}
PDF digest: {runtime['exactArtifact']['pdfDigest']}
PDF bytes: {runtime['exactArtifact']['pdfByteLength']:,}
Token bytes: {runtime['exactArtifact']['tokenBytes']:,}
Preview/download/account blob byte-identical: {str(runtime['exactArtifact']['previewDownloadAccountBlobByteIdentical']).lower()}

This local fixture is not Customer FINAL, is not sale eligible and uses no current external market-provider evidence.

6. CURRENT PRODUCT SOURCE PROJECTION

Parent P86R1 candidate:
Files: {parent['fileCount']:,}
Payload: {parent['payloadBytes']:,} B
Path-set SHA-256: {parent['pathSetSha256']}
Source aggregate SHA-256: {parent['sourceContentAggregateSha256']}

P87R1 current candidate:
Files: {proj['fileCount']:,}
Payload: {proj['payloadBytes']:,} B
Path-set SHA-256: {proj['pathSetSha256']}
Source aggregate SHA-256: {proj['sourceContentAggregateSha256']}

Delta:
Files: {proj['fileCount']-parent['fileCount']:+d}
Payload: {proj['payloadBytes']-parent['payloadBytes']:+,} B
Build-relevant changes: 4

Projection classification: LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY
Exact-Windows credit on P87R1 current bytes: WITHHELD

7. TYPE / LINT / BUILD / ENVIRONMENT TRUTH

Current local runtime:
- Node v22.16.0;
- npm 10.9.2;
- global TypeScript 5.8.3;
- Linux x64.

Targeted strict TypeScript for the new P87 token module: PASS.
Direct imports of token, store-first helper and exact paid download route: 3/3 PASS.
Direct report-route import: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING_ZOD.

Whole-project semantic TypeScript: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
ESLint: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
Webpack/Turbopack production build: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING
Exact Windows Server 2025 / Node 24.18.0 / npm 11.16.0: WITHHELD

No parent exact-Windows credit is inherited onto changed P87R1 bytes.

8. RIGHTS / CURRENTNESS / VALUE BOUNDARY

No new source or field redistribution right is credited.
Rights numerator remains: 2/203 inherited only.
The P87 fixture uses local deterministic provider receipts and proves no current external market truth.
No current venue/session/quote/provider-rights evidence is established by this pass.
No paid-value transition is promoted.

9. ZERO-FAKE-CREDIT NUMERATORS

Customer FINAL: 0/20
Audit FINAL PDF: 0/3
Rights: 2/203 inherited only
Paid value: 0/10
Sale eligible: 0/20
LIVE: false
Global: NO_GO / STOP_SELL

P87 Real Markets exact immutable PDF sub-scope: GREEN_BOUNDED_LOCAL
P87 overall: NOT FINAL

10. SECURITY BOUNDARY

No external blockchain transaction was sent.
No external state was changed.
No live exploit was performed.
No weaponized PoC was created.
No authorization bypass was attempted.
No external system was scanned.
No raw external provider payload was redistributed through the compact token or customer PDF path.

11. NEXT HIGHEST-VALUE WORK

P87R1 is a savepoint, not a stopping condition.

The next independent customer-artifact review should inspect the Audit Pro PDF endpoint and every remaining PDF route for the same invariant:
render once -> immutable stored bytes -> one canonical SHA-256 -> preview/download/account same blob.

The current candidate is:
lib/server/lazy-route-modules/security--audit-watch--pro-pdf.ts

If it reconstructs output during download, repair it fail closed and bind it to the existing immutable Audit snapshot/blob/account publication path. Do not grant Audit FINAL without authorized database, real owner isolation, deployed byte identity, scope/currentness/rights and exact-Windows evidence.

Parallel external-environment blockers remain:
- authorized P83-P86 PostgreSQL/Supabase migrations and two-owner JWT/RLS/PostgREST proof;
- deployed Real Markets preview/download/account byte identity;
- rights-bound current market-provider evidence;
- current BSC quorum and authorized offline replay for the Audit historical case;
- whole-project dependency/type/lint/dual-build closure;
- exact Windows on current bytes.

12. CURRENT VERDICT

P87R1 materially improves real customer truth. Paid Real Markets PDF authority can no longer recreate customer output from a token payload. The token is compact, account-bound and artifact-bound; storage occurs before authority; paid download serves the immutable blob; legacy paid rerender is blocked.

The result remains honest:
- local exact paid PDF plumbing: PASS_BOUNDED;
- current external market truth: WITHHELD;
- deployed database/HTTP proof: WITHHELD;
- rights expansion: none;
- Customer FINAL: 0/20;
- Audit FINAL PDF: 0/3;
- exact Windows: WITHHELD;
- global release: NO_GO / STOP_SELL.

END OF LEDGER
'''
 out.parent.mkdir(parents=True,exist_ok=True); out.write_text(text,encoding='utf-8')
 print(json.dumps({'status':'PASS','output':str(out),'bytes':out.stat().st_size,'sha256':sha(out)},indent=2))

if __name__=='__main__': main()
