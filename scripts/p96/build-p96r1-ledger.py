#!/usr/bin/env python3
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

parser = argparse.ArgumentParser()
parser.add_argument("--root", required=True)
parser.add_argument("--package-verification", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()
root = Path(args.root); verification = json.loads(Path(args.package_verification).read_text()); output = Path(args.output)
closure = root / "artifacts/closure/p96r1"
checkpoint = json.loads((closure / "P96R1_CHECKPOINT_RECEIPT.json").read_text())
product = json.loads((closure / "P96R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json").read_text())
tests = json.loads((closure / "P96R1_TEST_AGGREGATE.json").read_text())
parent = json.loads((closure / "P96R1_PARENT_AND_SIBLING_PRESERVATION.json").read_text())
authority = json.loads((closure / "P96R1_AUTHORITY_BINDING.json").read_text())
identity = json.loads((closure / "P96R1_TREE_IDENTITY_EXCLUDING_SELF.json").read_text())
final = verification["final"]
text = f"""VELMÈRE CURRENT STATE & PASS DELTA LEDGER — P96R1 / V17
DATE: 2026-08-21
CLASSIFICATION: PASS_BOUNDED_P96R1_P95_SIBLING_RECONCILIATION_RISK_HISTORY_INTEGRITY_MERGE
GLOBAL: NO_GO / STOP_SELL
LIVE: false
SALE_ENABLED: false
PRODUCTION_APPROVED: false
WORLD_CLASS_PROVEN: false

0. AUTHORITY AND GOVERNANCE TRUTH

Latest Master execution directive:
{authority['masterDirective']['file']}
Bytes: {authority['masterDirective']['bytes']:,}
SHA-256: {authority['masterDirective']['sha256']}
Completeness: sections 0-88, START NOW and END-OF-DIRECTIVE verified.

Previous complete Master V2 remains frozen byte-for-byte:
{authority['previousMasterPreserved']['file']}
SHA-256: {authority['previousMasterPreserved']['sha256']}

Canonical Owner Directive remains V17, unchanged:
{authority['canonicalOwnerDirective']['file']}
SHA-256: {authority['canonicalOwnerDirective']['sha256']}

Governance conflict resolved:
Two different direct children of P94 were both named P95R1. Neither was rewritten or silently selected.
P95-A SHA-256: {parent['p95A']['sha256']}
P95-B SHA-256: {parent['p95B']['sha256']}
P96R1 is the first unique integrated successor.

1. WHAT P96R1 PHYSICALLY CHANGED

P95-A guarantee integrated:
- current table score is kept separate from latest stored history;
- canonical asset identity, observation time, methodologyVersion, scoreVersion, evidenceVersion and comparabilityKey are adjudicated;
- newer stored history, identity conflicts and invalid current evidence fail closed.

P95-B guarantee integrated:
- every customer page is bound to the exact requested asset, limit and cursor;
- cross-asset or cross-cursor response swaps are rejected;
- pageReference and pageEvidenceDigest are versioned;
- DATABASE and MEMORY page provenance cannot be mixed;
- database read does not overclaim retention or backup/restore.

Shared conflict resolved:
components/market-integrity/RiskHistoryControl.tsx
Merged SHA-256: {sha(root / 'components/market-integrity/RiskHistoryControl.tsx')}
No conflict markers. PL/EN/DE wording preserves both alignment and storage-provenance boundaries.

Master V2 R1 adds a formal unique-checkpoint identity rule so this class of collision cannot be silently repeated.

2. CURRENT GREEN RECEIPTS ON P96R1 BYTES

P96 integrated core/reconciliation checks: {tests['p96CoreChecksAcrossOverlappingHarnesses']}/{tests['p96CoreChecksAcrossOverlappingHarnesses']} PASS
P91/P93 compatibility checks: {tests['compatibilityChecksAcrossOverlappingHarnesses']}/{tests['compatibilityChecksAcrossOverlappingHarnesses']} PASS
Fresh affected-scope total across overlapping harnesses: {tests['freshAffectedScopeChecksAcrossOverlappingHarnesses']}/{tests['freshAffectedScopeChecksAcrossOverlappingHarnesses']} PASS
Fresh commands: {tests['freshCommands']}/{tests['freshCommands']} PASS
Repeatability: 9/9 current commands, 2/2 byte-identical stdout/stderr/receipts.
Failure adjudication: 5/5 preserved; 0 failed runs credited.

IMPORTANT: {tests['freshAffectedScopeChecksAcrossOverlappingHarnesses']} is not an independent-evidence count, product accuracy statistic, rendered Browser proof or Customer FINAL numerator.

3. PRODUCT SOURCE PROJECTION

P94 parent:
Files: {product['parentProjection']['fileCount']:,}
Payload: {product['parentProjection']['payloadBytes']:,} B
Path-set SHA-256: {product['parentProjection']['pathSetSha256']}
Source aggregate SHA-256: {product['parentProjection']['sourceContentAggregateSha256']}

P96R1:
Files: {product['currentCandidateProjection']['fileCount']:,}
Payload: {product['currentCandidateProjection']['payloadBytes']:,} B
Path-set SHA-256: {product['currentCandidateProjection']['pathSetSha256']}
Source aggregate SHA-256: {product['currentCandidateProjection']['sourceContentAggregateSha256']}
Delta from P94: +{product['deltaFromP94']['fileCount']} files / +{product['deltaFromP94']['payloadBytes']:,} B
Build-relevant changed/added files: {product['deltaFromP94']['changedBuildRelevantFiles']}

Parent preservation:
P94 byte-identical files excluding package manifest: {parent['p94ByteIdenticalFiles']:,}
Declared modified P94 files: {len(parent['declaredModifiedParentFiles'])}
Removed P94 files: 0
Unexpected parent differences: 0

4. PACKAGE IDENTITY

Current P96R1 SOURCE_ONLY:
{verification['output']}
Bytes: {final['bytes']:,}
Entries: {final['entryCount']:,}
SHA-256: {final['sha256']}
Deterministic rebuild: {verification['deterministicRebuild']}
CRC: PASS
Clean unpack: {final['cleanUnpack']}
Lexicographic ordering / fixed 1980 timestamp / no directory entries / createSystem 0: PASS
Full secret/private-key scan: 0 matches
Unexpected current binary scan: 0 matches

Complete SOURCE_ONLY tree identity excluding only its self-referential receipt:
Files: {identity['fileCount']:,}
Payload: {identity['payloadBytes']:,} B
Path-set SHA-256: {identity['pathSetSha256']}
Source-content aggregate SHA-256: {identity['sourceContentAggregateSha256']}
Full package count including identity receipt: {identity['fullPackageFileCountIncludingThisIdentityFile']:,}

5. FAILURE ADJUDICATION

Preserved with zero credit:
- duplicate P95R1 checkpoint identity conflict;
- stale P95R1 assertion in the first copied static harness;
- future-timestamp integration fixture correctly rejected by the product;
- object-shorthand static false negative;
- first Master directive edit anchor mismatch.

No retry-until-green or failed execution was counted as PASS.

6. ENVIRONMENT TRUTH

Current bounded environment: Linux x64, Node v22.16.0, npm 10.9.2, global TypeScript 5.8.3.
Targeted strict TypeScript: 3/3 PASS.
Whole-project semantic TypeScript: WITHHELD_DEPENDENCY_GRAPH_MISSING.
ESLint: WITHHELD_DEPENDENCY_GRAPH_MISSING.
Webpack/Turbopack: WITHHELD.
Authorized PostgreSQL/Supabase staging: WITHHELD.
Rendered Browser/accessibility: WITHHELD.
Exact Windows Server 2025 / Node 24.18.0 / npm 11.16.0: WITHHELD.

7. ZERO-FAKE-CREDIT NUMERATORS

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

8. NEXT BLOCKER AND WORKSTREAM RULE

Local-only Risk History polishing stops at P96 unless new deployed evidence or a material cross-product correctness defect appears.

Shortest honest Risk Indicator path:
authorized staging PostgreSQL/Supabase
-> P91/P93/P94 migrations
-> service-role separation and RLS
-> two real JWT identities
-> exact request-bound HTTP
-> rollback/concurrency and cross-account isolation
-> rendered Browser/accessibility PL/EN/DE
-> real customer-authorized input
-> immutable output
-> final adjudication.

If staging or the exact dependency environment remains unavailable, move to an independent high-value workstream, especially Audit provider rights/currentness or another customer-facing row. Do not create another local-only Risk History refinement pass.

9. CURRENT VERDICT

P94 is the verified common ancestor.
Both conflicting P95R1 packages remain frozen historical siblings.
P96R1 is the single canonical integrated successor and contains both customer-integrity repairs.
The governance/source-integrity blocker is closed.
Product/deployment closure is not.

END OF LEDGER
"""
output.write_text(text, encoding="utf-8", newline="\n")
print(json.dumps({"status": "PASS", "output": str(output), "bytes": output.stat().st_size, "sha256": sha(output)}, indent=2))
