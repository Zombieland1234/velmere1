from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = {
    "fileCount": 1602,
    "payloadBytes": 21059203,
    "pathSetSha256": "214c0ad793a36a61c5290baeb104d2e671387df5c07e42862143861aa13ef66f",
    "sourceContentAggregateSha256": "6570f1ef462dcc2d84daf30576a84b2acc518d6ec16f6030b7f670280780b79f",
}
EXPECTED_CHANGED = {
    "lib/security/audit-provider-runtime-client.ts",
    "lib/security/erc2771-multicall-source-detector.ts",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", required=True)
    ap.add_argument("--parent-manifest", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--source-receipt", required=True)
    ap.add_argument("--receipt", required=True)
    args = ap.parse_args()

    root = Path(args.source_root)
    parent = json.loads(Path(args.parent_manifest).read_text(encoding="utf-8"))
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    patch = json.loads(Path(args.source_receipt).read_text(encoding="utf-8"))
    checks: list[str] = []

    def check(value: bool, label: str) -> None:
        if not value:
            raise SystemExit(f"P78R4 static failed:{label}")
        checks.append(label)

    for key, expected in PARENT.items():
        check(parent["projection"].get(key) == expected, f"parent_identity:{key}")

    projection = manifest["projection"]
    check(projection["fileCount"] == 1602, "file_count_unchanged")
    check(projection["pathSetSha256"] == PARENT["pathSetSha256"], "pathset_unchanged")
    check(projection["payloadBytes"] != PARENT["payloadBytes"], "payload_changed")
    check(projection["sourceContentAggregateSha256"] != PARENT["sourceContentAggregateSha256"], "aggregate_changed")
    changed = patch.get("changedFiles", [])
    check({row.get("path") for row in changed} == EXPECTED_CHANGED, "exact_two_changed_product_files")

    rows = {row["path"]: row for row in manifest["files"]}
    for rel in sorted(EXPECTED_CHANGED):
        raw = (root / rel).read_bytes()
        check(rel in rows, f"manifest_contains:{rel}")
        check(rows[rel]["byteLength"] == len(raw), f"manifest_bytes_match:{rel}")
        check(rows[rel]["sha256"] == sha256(raw), f"manifest_sha_match:{rel}")

    provider = (root / "lib/security/audit-provider-runtime-client.ts").read_text(encoding="utf-8")
    detector = (root / "lib/security/erc2771-multicall-source-detector.ts").read_text(encoding="utf-8")
    claim = (root / "lib/security/audit-claim-ledger.ts").read_text(encoding="utf-8")
    assembler = (root / "lib/security/audit-report-assembler.ts").read_text(encoding="utf-8")

    check("contractName?: string;" in provider, "private_evidence_has_contract_name")
    check("contractName: typeof first?.ContractName" in provider, "provider_carries_contract_name_from_same_response")
    check("responseDigest: responseReceipt.bodyDigest" in provider, "provider_contract_name_stays_digest_bound")
    check("sourcePositive && identityMatched && responseReceipt?.bodyDigest" in provider, "provider_exact_identity_gate_preserved")

    check('targetSelection: "etherscan_contract_name" | "single_concrete_contract" | "ambiguous_or_missing";' in detector, "detector_reports_target_selection")
    check("function extractContractNodes(" in detector, "contract_parser_present")
    check("function selectTargetContract(" in detector, "target_selector_present")
    check("function inheritanceClosure(" in detector, "inheritance_closure_present")
    check("const pattern = /\\b(abstract\\s+)?contract" in detector, "contract_declaration_parser_bounded")
    check("if (contractName)" in detector and "nodes.filter((node) => node.name === contractName)" in detector, "exact_contract_name_selection")
    check("const concrete = nodes.filter((node) => !node.abstract);" in detector, "single_concrete_fallback")
    check("if (concrete.length === 1)" in detector, "fallback_requires_exactly_one_concrete")
    check('blockers: ["verified_source_target_contract_ambiguous_or_missing"]' in detector, "ambiguous_target_fails_closed")
    check("const closure = inheritanceClosure(selection.node, nodes);" in detector, "signals_bound_to_inheritance_closure")
    check('const clean = closure.nodes.map((node) => node.text).join("\\n");' in detector, "no_global_unit_signal_join")
    check('closure.inheritedNames.has("ERC2771Context")' in detector, "meta_context_bound_to_target_inheritance")
    check("const correlatedUnits = units.filter((unit) => correlation.sourceUnitIds.includes(unit.id));" in detector, "evidence_refs_bound_to_correlated_units")
    check("evidenceRefs(correlatedUnits" in detector, "global_evidence_refs_removed")

    report_start = detector.index("export type Pass5002Erc2771MulticallSourceDetectorReport = {")
    report_end = detector.index("\n};", report_start) + 3
    report_type = detector[report_start:report_end]
    check("sourceText" not in report_type and "abiText" not in report_type, "correlation_report_still_raw_source_free")
    check("targetContractName?: string;" in report_type, "report_contains_safe_target_contract_name")
    check("analyzedContractNames: string[];" in report_type, "report_contains_bounded_contract_closure_names")
    check("sourceUnitIds: string[];" in report_type, "report_contains_bounded_source_unit_ids")

    check('adverseKind?: "deployment_identity" | "source_pattern";' in claim, "claim_integration_preserved")
    check("adverseRiskFloor:" not in claim[claim.index("const sourcePatternClaims"):claim.index("const authorityEvidence = input.authorityEvidence;")], "source_pattern_still_has_no_risk_floor")
    check("const riskFloorClaims = confirmedAdverseClaims.filter" in assembler, "assembler_risk_floor_isolation_preserved")
    check("const adverseRiskFloor = riskFloorClaims.length > 0" in assembler, "assembler_uses_numeric_risk_floor_subset")

    excluded = set(projection.get("excludedFromCredit", []))
    for item in ("runtime exploitability proof", "deployed bytecode equivalence", "formal detector accuracy", "Customer FINAL", "Audit FINAL PDF", "paid value", "sale eligibility", "LIVE"):
        check(item in excluded, f"withheld:{item}")
    zero = patch.get("zeroFakeCredit", {})
    check(zero.get("runtimeExploitability") == 0, "zero_runtime_exploitability")
    check(zero.get("formalDetectorAccuracy") == "WITHHELD", "zero_formal_accuracy")
    check(zero.get("customerFinal") == "0/20", "zero_customer_final")
    check(zero.get("saleEligible") == "0/20", "zero_sale")
    check(zero.get("live") is False, "zero_live")

    receipt = {
        "schemaVersion": "velmere.p78r4.target-contract-correlation-static.v1",
        "status": "PASS",
        "checkCount": len(checks),
        "checks": checks,
        "projection": projection,
        "truthBoundary": "Static proof covers target-selection/inheritance-correlation wiring and non-promotion boundaries. Runtime false-positive elimination and pinned vulnerable/fixed behavior remain separate runtime gates.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
