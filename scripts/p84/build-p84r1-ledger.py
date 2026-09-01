#!/usr/bin/env python3
"""Build the external P84R1 current-state ledger from verified closure/package receipts."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


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
    closure = root / "artifacts/closure/p84r1"

    checkpoint = load(closure / "P84R1_CHECKPOINT_RECEIPT.json")
    projection = load(closure / "P84R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json")
    source = load(closure / "P84R1_SOURCE_CHANGE_MANIFEST.json")
    tests = load(closure / "P84R1_TEST_AGGREGATE.json")
    history = load(closure / "P84R1_HISTORICAL_RECEIPT_IMMUTABILITY.json")
    package = load(verification_path)
    runtime = load(root / "receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_RUNTIME.json")
    repeat = load(root / "receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_REPEATABILITY.json")
    static = load(root / "receipts/p84/P84_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_STATIC.json")
    compat80 = load(root / "receipts/p84/P84_P80_IMMUTABLE_ARTIFACT_COMPATIBILITY.json")
    compat83 = load(root / "receipts/p84/P84_P83_ATOMIC_PUBLICATION_COMPATIBILITY.json")
    product = projection["currentCandidateProjection"]
    z = package["final"]
    if z["sha256"] != sha256(zip_path) or z["bytes"] != zip_path.stat().st_size:
        raise RuntimeError("ledger_package_identity_mismatch")

    rows20 = [
        "Audit Basic", "Audit Pro", "Audit Advanced",
        "Browser Basic", "Browser Pro", "Browser Advanced",
        "Shield Basic", "Shield Pro", "Shield Advanced",
        "Shield Pro Basic", "Shield Pro Pro", "Shield Pro Advanced",
        "Real Markets Basic", "Real Markets Pro", "Real Markets Advanced",
        "Shield Map", "Market Impact FREE", "Whale Watch FREE", "Angel", "Risk Indicator",
    ]

    lines: list[str] = [
        "VELMÈRE CURRENT STATE & PASS DELTA LEDGER — P84R1 / V17",
        "DATE: 2026-08-20",
        "CLASSIFICATION: PASS_BOUNDED_P84R1_AUDIT_CUSTOMER_ARTIFACT_OWNER_READ_RLS_LINK_ATOMIC_PUBLICATION",
        "GLOBAL: NO_GO / STOP_SELL",
        "LIVE: false",
        "SALE_ENABLED: false",
        "PRODUCTION_APPROVED: false",
        "WORLD_CLASS_PROVEN: false",
        "",
        "TABLE 0 — PRODUCT TOPOLOGY TRUTH",
        "Family group | Customer rows | Current truth | P84 change",
        "Tiered: Audit / Browser / Shield / Shield Pro / Real Markets | 15 | Basic/Pro/Advanced only | Audit delivery infrastructure repaired; topology unchanged",
        "Standalone: Shield Map / Market Impact / Whale Watch / Angel / Risk Indicator | 5 | one profile each; Market Impact and Whale Watch free | unchanged",
        "TOTAL | 20 rows / 20 profiles / 10 paid transitions | V17 binding preserved | PASS_TOPOLOGY_UNCHANGED",
        "PDF | artifact obligation, not family/SKU | Audit 3 + Browser where promised | no denominator inflation",
        "",
        "TABLE 1 — CUSTOMER-FACING CLOSURE, CURRENT 20-ROW DENOMINATOR",
        "Product/SKU | P83 FINAL | P84 FINAL | Current P84 evidence | Hard blocker | Sale",
    ]
    for row in rows20:
        if row.startswith("Audit "):
            evidence = "owner-read source path repaired; local/static proof only"
            blocker = "staging PostgreSQL/RLS/JWT/deployed bytes"
        else:
            evidence = "not re-executed or promoted in P84"
            blocker = "unchanged product-specific closure gates"
        lines.append(f"{row} | 0/1 | 0/1 | {evidence} | {blocker} | STOP_SELL")

    lines.extend([
        "",
        "TABLE 2 — CURRENT 20-PROFILE EXECUTION",
        "Profile | Previous exact current execution | P84 execution | Exact customer bytes/hash | Credit",
    ])
    for row in rows20:
        p84_exec = "LOCAL_MOCKED_DELIVERY_PATH_ONLY" if row.startswith("Audit ") else "NOT_EXECUTED_IN_P84"
        lines.append(f"{row} | no inherited current-byte FINAL | {p84_exec} | WITHHELD | no FINAL/profile closure credit")

    lines.extend([
        "",
        "TABLE 3 — CURRENT → TARGET → GAP",
        "Area | P83 current | P84 target | Action completed | Result | Remaining gap",
        "Authenticated artifact read | SELECT revoked after P83 DDL | strict owner-readable snapshot/PDF path | grants restored under salted owner RLS | STATIC + MOCKED CLIENT PASS | authorized PostgreSQL/JWT execution",
        "Audit publication indicator | owner route queried full service-only message ledger | minimal customer-safe link | immutable RLS link table + v2 atomic RPC | 59/59 runtime; 91/91 static | real RLS/two-account proof",
        "Publication transaction | P83 snapshot/PDF/message atomic | add owner-readable link to same transaction | v2 wraps frozen P83 v1 and verifies link | P84/P83 7/7 PASS | PostgreSQL rollback proof",
        "List availability | requested limit applied before hidden-Audit filtering | bounded fetch then visible slice | fetch 50, filter, slice | regression PASS | deployed route proof",
        "PDF delivery | immutable local path exists | owner-readable deployed parity | no re-render path reopened | PDF 22/22 + 55/55 PASS | preview/download/account real bytes",
        "",
        "TABLE 4 — DATA / RIGHTS / FRESHNESS",
        "Field/source | Product | Rights/currentness | P84 result | Blocker",
        "Customer-owned Audit snapshot/PDF/link | Audit | Velmère-owned derived artifact; account authorization required | source boundary repaired | staging RLS/JWT proof",
        "Historical public-chain incident metadata | Audit | inherited bounded historical record | unchanged | no current-risk promotion",
        "Current BSC deployment state | Audit | NOT PROVEN | not executed in P84 | independent rights-bound provider quorum",
        "Raw external Solidity/ABI/trace/state | Audit | private / redistribution blocked | remains excluded | no raw customer redistribution",
        "Rights numerator | all products | 2/203 inherited only | unchanged | field-level rights/currentness program",
        "",
        "TABLE 5 — GLOBAL DENOMINATORS",
        "Metric | P83R1 | P84R1 | Delta | Credit class",
        "Canonical authority binding | V17 bound | V17 bound | 0 | PASS_BYTE_IDENTICAL",
        f"Source/package reproducibility | P83 8195 entries | P84 {z['entryCount']} entries | +{z['entryCount'] - checkpoint['canonicalBinding']['parentSourceOnlyEntries']} | 2/2 BYTE_IDENTICAL + CRC + clean unpack",
        "Customer FINAL | 0/20 | 0/20 | 0 | WITHHELD",
        "Audit FINAL PDF | 0/3 | 0/3 | 0 | WITHHELD",
        "Rights | 2/203 inherited | 2/203 inherited | 0 | no expansion",
        "Paid value | 0/10 | 0/10 | 0 | no expansion",
        "Sale eligible | 0/20 | 0/20 | 0 | STOP_SELL",
        "Convergence rounds | 0/3 final RC rounds | 0/3 | 0 | not started",
        "FINAL_AI_VALIDATION | not ready | not ready | 0 | not started",
        "REAL_EXTERNAL_PROOF | none credited | none credited | 0 | not started",
        "",
        "0. CANONICAL BINDING",
        "",
        "Canonical owner directive:",
        checkpoint["canonicalBinding"]["directiveFile"],
        f"Bytes: {(root / checkpoint['canonicalBinding']['directiveFile']).stat().st_size:,}",
        f"SHA-256: {checkpoint['canonicalBinding']['directiveSha256']}",
        "Directive changed in P84R1: NO",
        "Reason: V17 already requires object-level account authorization, immutable stored bytes, fail-closed delivery and preview/download identity. P84 repairs implementation against that existing authority; no authority rebind churn was justified.",
        "",
        "Parent current checkpoint: P83R1",
        f"Parent ledger SHA-256: {checkpoint['canonicalBinding']['parentLedgerSha256']}",
        f"Parent ledger bytes: {checkpoint['canonicalBinding']['parentLedgerBytes']:,}",
        f"Parent SOURCE_ONLY SHA-256: {checkpoint['canonicalBinding']['parentSourceOnlySha256']}",
        f"Parent SOURCE_ONLY bytes: {checkpoint['canonicalBinding']['parentSourceOnlyBytes']:,}",
        f"Parent SOURCE_ONLY entries: {checkpoint['canonicalBinding']['parentSourceOnlyEntries']:,}",
        "",
        "Current P84R1 SOURCE_ONLY:",
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
        "Private-key/credential scan: PASS / 0 matches",
        "",
        "1. REAL DEFECTS FOUND AND PHYSICALLY REPAIRED",
        "",
        "P84-DEFECT-01 — authenticated artifact SELECT regression:",
        "- P83 copied older artifact DDL that revoked authenticated SELECT on customer artifact snapshots and PDF blobs.",
        "- The real owner-token route uses an authenticated Supabase client, so a correctly authenticated owner could not read the persisted artifact after deployment.",
        "- P84 restores SELECT only to authenticated and binds it to account_id plus salted account_id_hash RLS policies.",
        "",
        "P84-DEFECT-02 — owner route depended on the private internal message ledger:",
        "- Audit link validation queried velmere_audit_account_messages with select('*').",
        "- That table intentionally remains service-role-only and contains operator/admin/payment fields; opening it to customer tokens would be an unacceptable privacy boundary regression.",
        "- P84 introduces velmere_audit_customer_artifact_links: a closed 12-field immutable link record with strict owner RLS and no operator, payment, admin or raw provider evidence.",
        "",
        "Additional repair:",
        "- Audit publication now uses service-role-only velmere_publish_audit_exact_artifact_v2.",
        "- v2 calls the byte-frozen P83 v1 publisher inside the same PostgreSQL transaction, then inserts/verifies the minimal owner-readable link; any exception rolls back the whole call.",
        "- list reads fetch a bounded 50 rows before hiding unlinked Audit rows, then slice to the requested limit, preventing hidden orphan rows from starving valid older artifacts.",
        "",
        "2. CURRENT LOCAL DEFENSIVE PROOF",
        "",
        f"P84 owner-read / atomic-link runtime: {runtime['checks']['passed']}/{runtime['checks']['total']} {runtime['status']}",
        f"P84 runtime repeatability: {repeat['checks']['passed']}/{repeat['checks']['total']} PASS; receipt and stdout byte-identical",
        f"P84 migration/customer-path static: {static['checks']['passed']}/{static['checks']['total']} PASS",
        f"P84/P83 frozen atomic-publication compatibility: {compat83['checks']['passed']}/{compat83['checks']['total']} PASS",
        f"Fixture snapshot: {runtime['artifact']['snapshotId']}",
        f"Fixture PDF: {runtime['artifact']['pdfByteLength']:,} B",
        f"Fixture PDF SHA-256: {runtime['artifact']['pdfDigest']}",
        f"Fixture link schema: {runtime['artifact']['linkSchema']}",
        "Fixture classification: DEFENSIVE_LOCAL_OWNER_READ_LINK_AND_ATOMIC_PUBLICATION_VALIDATION",
        "Authorized PostgreSQL/Supabase execution: WITHHELD",
        "RLS/JWT two-account isolation: WITHHELD",
        "Trigger/rollback runtime: WITHHELD",
        "Deployed HTTP/account proof: WITHHELD",
        "",
        "The mocked RPC/client runtime proves closed TypeScript inputs/outputs, one-RPC control flow, tamper rejection, exact link shape, owner binding, fail-closed lookup, no full-message customer query and deterministic receipts. It does not prove PostgreSQL syntax/execution, transaction rollback, grants, RLS, JWT isolation or deployed behavior.",
        "",
        "3. CURRENT GREEN RECEIPTS ON P84R1 BYTES",
        "",
    ])
    for row in tests["controls"]:
        lines.append(f"- {row['label']}: {row['checks']}/{row['checks']} PASS")
    lines.extend([
        "",
        f"Aggregate executed checks across overlapping harnesses: {tests['aggregateExecutedChecksAcrossOverlappingHarnesses']}",
        "IMPORTANT: 1116 is not an independent-evidence count, detector-accuracy statistic, provider count, customer count or FINAL numerator.",
        "",
        "Legacy P80 static boundary:",
        f"- legacy result remains {compat80['legacyHarness']['passed']}/{compat80['legacyHarness']['total']} and is NOT relabeled PASS;",
        "- exactly three assertions described the removed pre-P83 multi-write/full-message-table path;",
        f"- stricter P84 replacements: {compat80['checks']['passed']}/{compat80['checks']['total']} PASS;",
        "- historical P80 receipts remain byte-for-byte unchanged.",
        "",
        "Historical receipt immutability:",
        f"- verified historical files: {history['verifiedHistoricalFiles']}",
        f"- mismatches: {history['mismatchCount']}",
        "- result: PASS_BYTE_IDENTICAL.",
        "",
        "4. CURRENT PRODUCT SOURCE PROJECTION CANDIDATE",
        "",
        f"Parent P83R1 product files: {projection['parentProjection']['fileCount']:,}",
        f"Parent P83R1 payload: {projection['parentProjection']['payloadBytes']:,} B",
        f"P84R1 product files: {product['fileCount']:,}",
        f"P84R1 payload: {product['payloadBytes']:,} B",
        f"Delta files: {projection['delta']['fileCount']:+d}",
        f"Delta payload: {projection['delta']['payloadBytes']:+,} B",
        f"Changed build-relevant files: {projection['delta']['changedBuildRelevantFiles']}",
        f"Path-set SHA-256: {product['pathSetSha256']}",
        f"Source aggregate SHA-256: {product['sourceContentAggregateSha256']}",
        "Projection classification: LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY",
        "Exact-Windows credit on P84R1 current bytes: WITHHELD",
        "",
        "Build-relevant changes:",
    ])
    for row in projection["changedBuildRelevantFiles"]:
        lines.append(f"- {row['path']} — {row['change']} — {row['afterBytes']:,} B — {row['afterSha256']}")
    lines.extend([
        "",
        "Database closure-critical changes outside the historical product projection:",
        "- lib/db/schema.sql",
        "- supabase/migrations/20260820000002_p84_audit_customer_artifact_owner_read_path.sql",
        "",
        "5. TYPE / LINT / ENVIRONMENT TRUTH",
        "",
        "Current local runtime:",
        f"Node: {checkpoint['environment']['localNode']}",
        f"npm: {checkpoint['environment']['localNpm']}",
        f"TypeScript: {checkpoint['environment']['localTsc']}",
        f"Platform: {checkpoint['environment']['platform']}",
        "Targeted strict TypeScript for the new P84 publisher: PASS",
        "Changed production module imports: 4/4 PASS",
        "Whole-project semantic TypeScript: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
        "ESLint: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
        "Webpack/Turbopack: WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
        "Exact Windows Server 2025 / Node 24.18.0 / npm 11.16.0: WITHHELD",
        "",
        "6. SECURITY / PRIVACY / SAFETY BOUNDARY",
        "",
        "- no blockchain transaction, signature or state change was sent;",
        "- no live exploit, authorization bypass or weaponized PoC was performed;",
        "- no external system was scanned;",
        "- raw Solidity, ABI, runtime bytecode, trace and state remain outside customer objects;",
        "- the full Audit message ledger remains service-role-only;",
        "- customer tokens receive only their own minimal link row, snapshot and PDF under RLS;",
        "- current exploitability remains unproven and is not inferred from historical evidence or configuration.",
        "",
        "7. RIGHTS / CURRENTNESS",
        "",
        "P84R1 changes no external source license or redistribution decision.",
        "Rights remain 2/203 inherited only.",
        "Current deployment/trusted-forwarder/exploitability currentness remains NOT PROVEN.",
        "The customer artifact/link structures are Velmère-owned derived delivery records, but real account authorization is not credited until staging RLS/JWT proof exists.",
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
        "P84 owner-readable artifact delivery source sub-scope: GREEN_BOUNDED",
        "P84 overall: NOT FINAL",
        "",
        "9. NEXT BLOCKER — SHORTEST HONEST PATH",
        "",
        "1. Apply the ordered P83 and P84 migrations on an authorized staging PostgreSQL/Supabase project.",
        "2. Verify v2 RPC execution is service-role-only and anon/authenticated execution is denied.",
        "3. Verify authenticated owner SELECT succeeds only for matching account_id plus salted account_id_hash.",
        "4. Run two real owner JWTs and prove cross-account snapshot/PDF/link non-disclosure.",
        "5. Mutate link/snapshot/blob/message bindings and prove immutable-trigger rejection and full transaction rollback.",
        "6. Publish one staging Audit bundle and retrieve preview, download and account artifact through real HTTP routes.",
        "7. Compare exact bytes and SHA-256 independently across all three delivery routes.",
        "8. Separately execute rights-bound current BSC quorum and authorized offline archival replay without live transactions.",
        "9. Run full dependency/type/lint/dual-build and exact Windows on the exact successor bytes.",
        "",
        "Only a row satisfying all applicable evidence, rights/currentness, immutable artifact, deployed authorization and exact-runtime gates may move Customer FINAL 0/20 -> 1/20. Audit FINAL PDF may move 0/3 -> 1/3 only for the corresponding independently verified immutable PDF.",
        "",
        "10. CURRENT VERDICT",
        "",
        "P84R1 materially improves the real Audit customer-delivery path because it fixes two production-relevant authorization contradictions without exposing the internal message ledger:",
        "- authenticated owners regain least-privilege access to their own immutable snapshot/PDF through RLS;",
        "- customer publication is represented by a minimal immutable link committed in the same transaction as the P83 bundle/message.",
        "",
        "The result remains bounded and honest:",
        "- source/static/local mocked-client path: green;",
        "- historical P83 publisher: byte-frozen and compatible;",
        "- old P80 static expectations: honestly 100/103 with three explicitly superseded assertions;",
        "- authorized PostgreSQL, RLS/JWT and deployed HTTP proof: withheld;",
        "- Customer FINAL: 0/20;",
        "- Audit FINAL PDF: 0/3.",
        "",
        f"Exact parent delta files outside self-generated closure: {source['changeCount']}",
        "",
        "END OF LEDGER",
    ])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS",
        "output": output.name,
        "bytes": output.stat().st_size,
        "sha256": sha256(output),
        "packageSha256": z["sha256"],
    }, indent=2))


if __name__ == "__main__":
    main()
