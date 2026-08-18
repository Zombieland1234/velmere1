from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = {
    "fileCount": 1602,
    "payloadBytes": 21065534,
    "pathSetSha256": "214c0ad793a36a61c5290baeb104d2e671387df5c07e42862143861aa13ef66f",
    "sourceContentAggregateSha256": "280fa6aa59b39e52c695951664664d525d12ab46124becd8c1ac1ff3539d6432",
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
            raise SystemExit(f"P78R5 static failed:{label}")
        checks.append(label)

    for key, expected in PARENT.items():
        check(parent["projection"].get(key) == expected, f"parent_identity:{key}")
    projection = manifest["projection"]
    check(projection["fileCount"] == PARENT["fileCount"], "file_count_unchanged")
    check(projection["pathSetSha256"] == PARENT["pathSetSha256"], "pathset_unchanged")
    check(projection["payloadBytes"] != PARENT["payloadBytes"], "payload_changed")
    check(projection["sourceContentAggregateSha256"] != PARENT["sourceContentAggregateSha256"], "aggregate_changed")

    changed = patch.get("changedFiles", [])
    check(len(changed) == 1, "exact_one_product_file_changed")
    check(changed[0].get("path") == "lib/security/erc2771-multicall-source-detector.ts", "only_detector_changed")
    detector_path = root / "lib/security/erc2771-multicall-source-detector.ts"
    detector_raw = detector_path.read_bytes()
    rows = {row["path"]: row for row in manifest["files"]}
    detector_row = rows["lib/security/erc2771-multicall-source-detector.ts"]
    check(detector_row["byteLength"] == len(detector_raw), "detector_manifest_bytes_match")
    check(detector_row["sha256"] == sha256(detector_raw), "detector_manifest_sha_match")
    detector = detector_raw.decode("utf-8")

    check('state: "verified_openzeppelin_import" | "verified_source_semantics" | "unverified_name_only" | "not_present";' in detector, "report_authenticity_state_present")
    check("function stripSolidityComments(" in detector, "comment_only_stripper_present")
    check("function hasOpenZeppelinErc2771Import(" in detector, "openzeppelin_import_authenticator_present")
    check("function erc2771ContextAuthenticity(" in detector, "context_authenticator_present")
    check("@openzeppelin\\/contracts\\/metatx\\/ERC2771Context\\.sol" in detector, "exact_openzeppelin_metatx_path_required")
    check("(?:^|[\\r\\n])\\s*import" in detector, "import_match_line_anchored")
    check("correlatedIds.has(unit.id)" in detector, "import_authentication_scoped_to_correlated_units")
    check('closure.inheritedNames.has("ERC2771Context")' in detector, "context_name_must_be_in_target_inheritance")
    check('node.name === "ERC2771Context"' in detector, "semantic_context_body_scoped_by_name")
    check("isTrustedForwarder\\s*\\(\\s*msg\\s*\\.\\s*sender" in detector, "trusted_forwarder_semantics_required")
    check("calldataload\\s*\\(" in detector, "sender_suffix_calldataload_signal")
    check("calldatasize\\s*\\(" in detector, "sender_suffix_calldatasize_signal")
    check("_contextSuffixLength\\s*\\(" in detector, "openzeppelin_v5_suffix_signal")
    check('return { state: "unverified_name_only"' in detector, "name_only_has_explicit_unverified_state")
    check('const authenticErc2771Context = contextAuthenticity.state === "verified_openzeppelin_import" || contextAuthenticity.state === "verified_source_semantics";' in detector, "meta_signal_requires_verified_authenticity")
    check("const metaContext = authenticErc2771Context" in detector, "meta_context_gated_by_authenticity")
    check('const authenticityBlocked = contextAuthenticity.state === "unverified_name_only";' in detector, "unverified_name_sets_blocker_state")
    check('authenticityBlocked\n    ? "blocked"' in detector, "unverified_name_fails_closed")
    check('blockers: authenticityBlocked ? ["erc2771_context_authenticity_not_verified"] : []' in detector, "authenticity_blocker_exposed")

    # Preserve the R4 target/inheritance precision repair.
    check("function selectTargetContract(" in detector, "r4_target_selector_preserved")
    check("function inheritanceClosure(" in detector, "r4_inheritance_closure_preserved")
    check('const clean = closure.nodes.map((node) => node.text).join("\\n");' in detector, "r4_no_global_unit_join_preserved")
    check("evidenceRefs(correlatedUnits" in detector, "r4_correlated_evidence_refs_preserved")
    check('verified_source_target_contract_ambiguous_or_missing' in detector, "r4_ambiguous_target_fail_closed_preserved")

    # Report remains raw-source-free and non-promotional.
    report_start = detector.index("export type Pass5002Erc2771MulticallSourceDetectorReport = {")
    report_end = detector.index("\n};", report_start) + 3
    report_type = detector[report_start:report_end]
    check("sourceText" not in report_type and "abiText" not in report_type, "report_still_raw_source_free")
    check("contextAuthenticity:" in report_type, "safe_authenticity_metadata_in_report")
    check("runtime_exploit_reproduction_not_executed" in detector, "runtime_exploit_blocker_preserved")
    check("deployed_runtime_bytecode_equivalence_not_proven" in detector, "bytecode_equivalence_blocker_preserved")
    check("This detector can confirm a verified-source pattern only." in detector, "truth_boundary_preserved")

    excluded = set(projection.get("excludedFromCredit", []))
    for item in ("runtime exploitability proof", "deployed bytecode equivalence", "formal detector accuracy", "Customer FINAL", "Audit FINAL PDF", "paid value", "sale eligibility", "LIVE"):
        check(item in excluded, f"withheld:{item}")
    zero = patch.get("zeroFakeCredit", {})
    check(zero.get("runtimeExploitability") == 0, "zero_runtime_exploitability")
    check(zero.get("deployedBytecodeEquivalence") == 0, "zero_deployed_bytecode_equivalence")
    check(zero.get("formalDetectorAccuracy") == "WITHHELD", "zero_formal_accuracy")
    check(zero.get("customerFinal") == "0/20", "zero_customer_final")
    check(zero.get("auditFinalPdf") == "0/3", "zero_audit_final_pdf")
    check(zero.get("rights") == "2/203", "rights_unchanged")
    check(zero.get("paidValue") == "0/10", "zero_paid_value")
    check(zero.get("saleEligible") == "0/20", "zero_sale")
    check(zero.get("live") is False, "zero_live")

    receipt = {
        "schemaVersion": "velmere.p78r5.erc2771-context-authenticity-static.v1",
        "status": "PASS",
        "checkCount": len(checks),
        "checks": checks,
        "projection": projection,
        "truthBoundary": "Static proof covers authenticity-gate wiring, preservation of R4 target correlation and explicit non-promotion boundaries. Runtime removal of the measured false positive and pinned historical pair behavior are separate gates.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
