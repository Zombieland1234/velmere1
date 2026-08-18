from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

P77_AGG = "354ec7229eb61dd55cccdae90c4a94576967f1c3beb9bad67909d847ccf1e032"
P77_PATHSET = "40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def need(condition: bool, label: str) -> None:
    if not condition:
        raise SystemExit(f"P78R1 static control failed:{label}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--receipt", required=True)
    args = ap.parse_args()

    root = Path(args.source_root)
    handler_path = root / "lib/security/audit-watch-post-handler.ts"
    ledger_path = root / "lib/security/audit-claim-ledger.ts"
    handler = handler_path.read_text(encoding="utf-8")
    ledger = ledger_path.read_text(encoding="utf-8")
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))

    checks: list[str] = []
    def check(condition: bool, label: str) -> None:
        need(condition, label)
        checks.append(label)

    check('buildAuditAdjudicatedAuthorityEvidence' in handler, "handler_imports_authority_builder")
    check(handler.count('const pass5001AuditAdjudicatedAuthorityEvidence = await buildAuditAdjudicatedAuthorityEvidence({') == 1, "handler_builds_authority_once")
    check('chain: normalized.chain' in handler and 'contractAddress: customerContractAddress' in handler, "authority_target_bound_to_customer_input")
    check(handler.count('authorityEvidence: pass5001AuditAdjudicatedAuthorityEvidence') == 2, "authority_propagates_to_claim_and_customer_pipeline")

    build_idx = handler.index('const pass5001AuditAdjudicatedAuthorityEvidence = await buildAuditAdjudicatedAuthorityEvidence({')
    claim_idx = handler.index('const pass2574AuditClaimLedger = buildPass2574AuditClaimLedgerReport({')
    customer_idx = handler.index('const canonicalCustomerPipeline = buildPass4820AuditCustomerReportPipeline({')
    check(build_idx < claim_idx < customer_idx, "authority_built_before_claim_and_customer_delivery")

    claim_slice = handler[claim_idx:handler.index('const pass2575AuditSourceFreshness', claim_idx)]
    customer_slice = handler[customer_idx:handler.index('if (canonicalCustomerPipeline.customerReport.deliveryPolicy.visibleTier === null)', customer_idx)]
    check('authorityEvidence: pass5001AuditAdjudicatedAuthorityEvidence' in claim_slice, "claim_ledger_receives_authority")
    check('authorityEvidence: pass5001AuditAdjudicatedAuthorityEvidence' in customer_slice, "canonical_pipeline_receives_authority")

    check('Send to manual permissions/source parser before a strong verdict.' not in ledger, "legacy_manual_advanced_action_removed")
    check('Advanced queues claims that require manual permissions, liquidity, holder and source freshness verification.' not in ledger, "legacy_manual_advanced_rule_removed")
    check('Run the automated permissions/source parser and an independent evidence re-check before a strong verdict.' in ledger, "automated_advanced_action_present")
    check('Advanced automatically queues claims that require deeper permissions, liquidity, holder and source freshness verification; optional QA is non-gating.' in ledger, "automated_advanced_rule_present")
    check('verifyAuditAdjudicatedAuthorityEvidence' in ledger and 'authorityClaims' in ledger, "claim_ledger_still_verifies_authority")
    check('before making an exploitability claim' in ledger, "exploitability_boundary_retained")

    projection = manifest["projection"]
    check(projection["fileCount"] == 1601, "product_file_count_unchanged")
    check(projection["pathSetSha256"] == P77_PATHSET, "product_pathset_unchanged")
    check(projection["sourceContentAggregateSha256"] != P77_AGG, "product_aggregate_changed")
    changed = manifest.get("p78r1Delta", {}).get("changedBuildRelevantFiles", [])
    check({item["path"] for item in changed} == {
        "lib/security/audit-watch-post-handler.ts",
        "lib/security/audit-claim-ledger.ts",
    }, "exact_two_product_files_changed")

    rowmap = {row["path"]: row for row in manifest["files"]}
    for rel in ("lib/security/audit-watch-post-handler.ts", "lib/security/audit-claim-ledger.ts"):
        data = (root / rel).read_bytes()
        check(rowmap[rel]["byteLength"] == len(data), f"manifest_bytes_match:{rel}")
        check(rowmap[rel]["sha256"] == sha256(data), f"manifest_sha_match:{rel}")

    result = {
        "schemaVersion": "velmere.p78r1.audit-authority-customer-path-static.v1",
        "status": "PASS",
        "checks": checks,
        "projection": projection,
        "zeroFakeCredit": {
            "vulnerabilityExploitabilityGroundTruth": 0,
            "customerFinal": "0/20",
            "auditFinalPdf": "0/3",
            "rights": "2/203",
            "paidValue": "0/10",
            "saleEligible": "0/20",
            "live": False,
        },
    }
    out = Path(args.receipt)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
