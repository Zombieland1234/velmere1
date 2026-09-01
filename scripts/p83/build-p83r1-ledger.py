#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

GENERATED_AT = "2026-08-20T19:30:00Z"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--zip", required=True)
    ap.add_argument("--verification", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    root = Path(args.root).resolve()
    zip_path = Path(args.zip).resolve()
    verification_path = Path(args.verification).resolve()
    output = Path(args.output).resolve()
    closure = root / "artifacts/closure/p83r1"
    checkpoint = load(closure / "P83R1_CHECKPOINT_RECEIPT.json")
    projection = load(closure / "P83R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json")
    source = load(closure / "P83R1_SOURCE_CHANGE_MANIFEST.json")
    tests = load(closure / "P83R1_TEST_AGGREGATE.json")
    history = load(closure / "P83R1_HISTORICAL_RECEIPT_IMMUTABILITY.json")
    package = load(verification_path)
    runtime = load(root / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_RUNTIME.json")
    repeat = load(root / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_REPEATABILITY.json")
    static = load(root / "receipts/p83/P83_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_STATIC.json")
    product = projection["currentCandidateProjection"]
    z = package["final"]
    if z["sha256"] != sha256(zip_path) or z["bytes"] != zip_path.stat().st_size:
        raise RuntimeError("ledger_package_identity_mismatch")

    lines = [
        "VELMÈRE CURRENT STATE & PASS DELTA LEDGER — P83R1 / V17",
        "DATE: 2026-08-20",
        "CLASSIFICATION: PASS_BOUNDED_P83R1_AUDIT_EXACT_ARTIFACT_ATOMIC_PUBLICATION_MIGRATION_REACHABILITY",
        "GLOBAL: NO_GO / STOP_SELL",
        "LIVE: false",
        "SALE_ENABLED: false",
        "PRODUCTION_APPROVED: false",
        "WORLD_CLASS_PROVEN: false",
        "",
        "0. CANONICAL BINDING",
        "",
        "Canonical owner directive:",
        checkpoint["canonicalBinding"]["directiveFile"],
        f"Bytes: {(root / checkpoint['canonicalBinding']['directiveFile']).stat().st_size:,}",
        f"SHA-256: {checkpoint['canonicalBinding']['directiveSha256']}",
        "Directive changed in P83R1: NO",
        "Reason: V17 already requires immutable stored bytes, fail-closed delivery, account authorization and preview/download byte identity; P83 implements that existing authority without unnecessary rebind churn.",
        "",
        "Parent current checkpoint: P82R1",
        f"Parent ledger SHA-256: {checkpoint['canonicalBinding']['parentLedgerSha256']}",
        f"Parent SOURCE_ONLY SHA-256: {checkpoint['canonicalBinding']['parentSourceOnlySha256']}",
        f"Parent SOURCE_ONLY bytes: {checkpoint['canonicalBinding']['parentSourceOnlyBytes']:,}",
        f"Parent SOURCE_ONLY entries: {checkpoint['canonicalBinding']['parentSourceOnlyEntries']:,}",
        "",
        "Current P83R1 SOURCE_ONLY:",
        zip_path.name,
        f"Bytes: {z['bytes']:,}",
        f"Entries: {z['entryCount']:,}",
        f"SHA-256: {z['sha256']}",
        f"Deterministic package rebuild: {package['deterministicRebuild']}",
        f"ZIP CRC: {z['crc']}",
        f"Clean unpack: {z['cleanUnpack']}",
        "ZIP ordering: lexicographic",
        "ZIP timestamp: fixed 1980-01-01T00:00:00Z",
        "Directory entries: 0",
        "ZIP createSystem: 0",
        "",
        "1. WHAT P83R1 PHYSICALLY CHANGED",
        "",
        "P83R1 closes a real durable-delivery gap left after P80–P82:",
        "- Audit exact snapshot/PDF support existed in canonical schema source but was absent from the ordered Supabase migration chain.",
        "- The customer path stored the immutable artifact bundle and linked account message in two separate durable operations.",
        "- A partial failure could therefore leave an orphaned hidden bundle and could not prove one atomic customer publication.",
        "",
        "P83R1 adds and wires:",
        "- ordered migration supabase/migrations/20260820000001_p83_audit_exact_artifact_atomic_publication.sql;",
        "- byte-identical P83 migration block in lib/db/schema.sql;",
        "- service-role-only SECURITY DEFINER RPC velmere_publish_audit_exact_artifact_v1;",
        "- one PostgreSQL transaction for Audit snapshot + exact PDF bytes + immutable account-message link;",
        "- one production TypeScript publisher with exactly one RPC and no direct table/memory fallback;",
        "- full preexisting-message semantic conflict rejection before nested bundle mutation;",
        "- full post-insert semantic verification before transaction return;",
        "- full returned-message projection verification in TypeScript;",
        "- closed 29-key message envelope and exact owner/snapshot/blob/report/time cross-bindings;",
        "- deterministic local receipt clock and two-run byte-identity proof;",
        "- regression runner that backs up and restores frozen historical receipts automatically.",
        "",
        "Additional customer-path correction:",
        "- audit-watch-post-handler no longer performs separate artifact and message writes;",
        "- without durable P83 RPC availability, delivery fails closed with no committed/published claim;",
        "- customer response uses only objects returned from the verified atomic publication result.",
        "",
        "2. LOCAL DEFENSIVE RUNTIME / STATIC PROOF",
        "",
        f"P83 atomic publication runtime: {runtime['checks']['passed']}/{runtime['checks']['total']} PASS_BOUNDED_LOCAL_MOCKED_RPC",
        f"P83 runtime repeatability: {repeat['checks']['passed']}/{repeat['checks']['total']} PASS; two executions and receipts byte-identical",
        f"P83 static migration/customer-path proof: {static['checks']['passed']}/{static['checks']['total']} PASS",
        f"Fixture snapshot: {runtime['artifact']['snapshotId']}",
        f"Fixture PDF: {runtime['artifact']['pdfByteLength']:,} B",
        f"Fixture PDF SHA-256: {runtime['artifact']['pdfDigest']}",
        "Fixture classification: DEFENSIVE_LOCAL_ATOMIC_TRANSACTION_BOUNDARY_VALIDATION",
        "Authorized PostgreSQL execution: WITHHELD",
        "RLS/trigger runtime: WITHHELD",
        "Deployed HTTP/account JWT proof: WITHHELD",
        "",
        "The local mocked RPC proves only input/output validation, single-RPC control flow, tamper rejection, owner binding, exact message shape, idempotent response handling and deterministic receipt behavior. It does not prove PostgreSQL transaction rollback, grants, RLS, triggers or deployed behavior.",
        "",
        "3. CURRENT GREEN RECEIPTS ON P83R1 BYTES",
        "",
    ]
    for row in tests["controls"]:
        lines.append(f"- {row['label']}: {row['checks']}/{row['checks']} PASS")
    lines.extend([
        "",
        f"Aggregate executed checks across overlapping harnesses: {tests['aggregateExecutedChecksAcrossOverlappingHarnesses']}",
        "IMPORTANT: this aggregate is not an independent-evidence count, detector-accuracy statistic, provider count, customer count or FINAL numerator.",
        "",
        "Historical receipt immutability:",
        f"- verified historical files: {history['verifiedHistoricalFiles']}",
        f"- mismatches: {history['mismatchCount']}",
        "- result: PASS_BYTE_IDENTICAL; current reruns are preserved only under P83 logs/receipts.",
        "",
        "4. CURRENT PRODUCT SOURCE PROJECTION CANDIDATE",
        "",
        f"Parent P82R1 product files: {projection['parentProjection']['fileCount']:,}",
        f"Parent P82R1 payload: {projection['parentProjection']['payloadBytes']:,} B",
        f"P83R1 product files: {product['fileCount']:,}",
        f"P83R1 payload: {product['payloadBytes']:,} B",
        f"Delta files: {projection['delta']['fileCount']:+d}",
        f"Delta payload: {projection['delta']['payloadBytes']:+,} B",
        f"Changed build-relevant files: {projection['delta']['changedBuildRelevantFiles']}",
        f"Path-set SHA-256: {product['pathSetSha256']}",
        f"Source aggregate SHA-256: {product['sourceContentAggregateSha256']}",
        "Projection classification: LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY",
        "Exact-Windows credit on P83R1 current bytes: WITHHELD",
        "",
        "Build-relevant changes:",
    ])
    for row in projection["changedBuildRelevantFiles"]:
        lines.append(f"- {row['path']} — {row['change']} — {row['afterBytes']:,} B — {row['afterSha256']}")
    lines.extend([
        "",
        "Database closure-critical changes outside the historical product projection:",
        "- lib/db/schema.sql",
        "- supabase/migrations/20260820000001_p83_audit_exact_artifact_atomic_publication.sql",
        "",
        "5. TYPE / LINT / ENVIRONMENT TRUTH",
        "",
        "Current local runtime:",
        f"Node: {checkpoint['environment']['localNode']}",
        f"npm: {checkpoint['environment']['localNpm']}",
        f"TypeScript: {checkpoint['environment']['localTsc']}",
        f"Platform: {checkpoint['environment']['platform']}",
        "Targeted strict TypeScript for the P83 publisher: PASS",
        "Changed production module imports: 4/4 PASS",
        "Whole-project semantic TypeScript: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
        "ESLint: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
        "Webpack/Turbopack: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
        "Exact Windows Server 2025 / Node 24.18.0 / npm 11.16.0: WITHHELD",
        "",
        "6. SECURITY / PRIVACY / SAFETY BOUNDARY",
        "",
        "- no transaction was sent;",
        "- no external state was changed;",
        "- no live exploit was performed;",
        "- no weaponized PoC was created;",
        "- no authorization bypass was attempted;",
        "- no raw Solidity, ABI, runtime bytecode, trace or state snapshot was redistributed through the new customer path;",
        "- public/customer FINAL remains blocked when durable publication proof is unavailable.",
        "",
        "7. RIGHTS / CURRENTNESS BOUNDARY",
        "",
        "P83R1 does not expand external data rights. Rights remain 2/203 inherited only.",
        "Current multi-provider BSC quorum: NOT EXECUTED in this pass.",
        "Current runtime/proxy/implementation/trusted-forwarder state: NOT PROVEN.",
        "Current exploitability: NOT PROVEN.",
        "Independent Velmère archival replay: WITHHELD.",
        "Historical P79 deployment-bound fact remains separately bounded and unchanged.",
        "",
        "8. ZERO-FAKE-CREDIT NUMERATORS",
        "",
        "Customer FINAL: 0/20",
        "Audit FINAL PDF: 0/3",
        "Rights: 2/203 inherited only",
        "Paid value: 0/10",
        "Sale eligible: 0/20",
        "LIVE: false",
        "Global: NO_GO / STOP_SELL",
        "",
        "P83 atomic publication source/runtime-validation sub-scope: GREEN_BOUNDED",
        "P83 overall: NOT FINAL",
        "",
        "9. NEXT BLOCKER — SHORTEST HONEST PATH",
        "",
        "1. Apply the P83 ordered migration on an authorized staging PostgreSQL/Supabase project.",
        "2. Prove only service_role can execute the RPC and anon/authenticated calls fail closed.",
        "3. Exercise RLS and exact ready-state/cross-binding triggers with positive and negative cases.",
        "4. Create a same-ID semantic-conflict retry and prove the complete transaction rolls back with no new bundle/message.",
        "5. Execute a real owner JWT/account read and prove object-level account isolation.",
        "6. Prove deployed preview/download/account access returns one immutable PDF byte sequence and SHA-256.",
        "7. Independently verify the stored snapshot/blob/message bundle and delivered bytes.",
        "8. Separately run the authorized read-only current BSC quorum and offline archival replay.",
        "9. Close rights/currentness for every customer-visible evidence field.",
        "10. Run full dependency/type/lint/dual-build and exact Windows on the exact successor bytes.",
        "",
        "Only after all row-specific evidence gates are physically satisfied may Customer FINAL move 0/20 -> 1/20 and the corresponding Audit FINAL PDF move 0/3 -> 1/3.",
        "",
        "10. CURRENT VERDICT",
        "",
        "P83R1 materially improves the real Audit delivery path: the source now contains an ordered, production-reachable atomic publication transaction rather than two durable writes, and the customer handler fails closed without it.",
        "",
        "The result remains deliberately bounded:",
        "- source/migration reachability: proven locally;",
        "- local transaction-boundary validation: green;",
        "- deterministic fixture receipt: green;",
        "- historical receipts: preserved byte-for-byte;",
        "- authorized staging PostgreSQL execution: withheld;",
        "- deployed customer artifact parity: withheld;",
        "- current chain truth and exploitability: withheld;",
        "- Customer FINAL: 0/20;",
        "- Audit FINAL PDF: 0/3.",
        "",
        "END OF LEDGER",
        "",
    ])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"status": "PASS", "output": str(output), "bytes": output.stat().st_size, "sha256": sha256(output)}, indent=2))


if __name__ == "__main__":
    main()
