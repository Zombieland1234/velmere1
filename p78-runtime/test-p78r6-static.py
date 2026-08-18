from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = {
    "fileCount": 1602,
    "payloadBytes": 21069277,
    "pathSetSha256": "214c0ad793a36a61c5290baeb104d2e671387df5c07e42862143861aa13ef66f",
    "sourceContentAggregateSha256": "530e81064adafe6b8c2f3a7d31f485c85b0e5f7977c371369b721e88a8558cfe",
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
            raise SystemExit(f"P78R6 static failed:{label}")
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

    rel = "lib/security/erc2771-multicall-source-detector.ts"
    raw = (root / rel).read_bytes()
    row = {item["path"]: item for item in manifest["files"]}[rel]
    check(row["byteLength"] == len(raw), "detector_manifest_bytes_match")
    check(row["sha256"] == sha256(raw), "detector_manifest_sha_match")
    detector = raw.decode("utf-8")

    check("type Erc2771ImportBinding = {" in detector, "import_binding_type_present")
    check('form: "plain" | "selective" | "namespace" | "legacy_namespace";' in detector, "all_supported_import_forms_enumerated")
    check('const OPENZEPPELIN_ERC2771_IMPORT_PATH = "@openzeppelin/contracts/metatx/ERC2771Context.sol" as const;' in detector, "exact_oz_path_constant")
    check("function parseOpenZeppelinErc2771ImportBindings(" in detector, "import_binding_parser_present")
    check("function boundOpenZeppelinErc2771Imports(" in detector, "bound_import_filter_present")
    check("stripSolidityComments(unit.content)" in detector, "comments_stripped_before_import_parse")
    check("localSymbol: match[1] ?? \"ERC2771Context\"" in detector, "selective_alias_local_symbol_derived")
    check("localSymbol: `${namespace[1]}.ERC2771Context`" in detector, "namespace_local_symbol_derived")
    check("localSymbol: `${legacyNamespace[1]}.ERC2771Context`" in detector, "legacy_namespace_local_symbol_derived")
    check("node.unitId === binding.unitId && node.bases.includes(binding.localSymbol)" in detector, "same_unit_exact_inheritance_symbol_binding_required")
    check("const boundImports = boundOpenZeppelinErc2771Imports(closure, units, correlation);" in detector, "authenticator_consumes_bound_imports")
    check("if (boundImports.length > 0)" in detector, "oz_auth_requires_bound_import")
    check('state: "verified_openzeppelin_import"' in detector, "bound_import_yields_verified_oz_state")
    check('state: "unverified_name_only"' in detector, "decoy_name_still_fail_closed_capable")

    check("(?:\\.[A-Za-z_][A-Za-z0-9_]*)?" in detector, "qualified_inheritance_base_parser_present")
    check("function selectTargetContract(" in detector, "r4_target_selector_preserved")
    check("function inheritanceClosure(" in detector, "r4_inheritance_closure_preserved")
    check("function erc2771ContextAuthenticity(" in detector, "r5_authenticator_preserved")
    check("verified_source_semantics" in detector, "r5_semantic_auth_fallback_preserved")
    check("isTrustedForwarder\\s*\\(\\s*msg\\s*\\.\\s*sender" in detector, "semantic_trusted_forwarder_gate_preserved")
    check('const authenticityBlocked = contextAuthenticity.state === "unverified_name_only";' in detector, "name_only_blocker_preserved")
    check('erc2771_context_authenticity_not_verified' in detector, "authenticity_blocker_preserved")
    check("evidenceRefs(correlatedUnits" in detector, "correlated_evidence_refs_preserved")

    report_start = detector.index("export type Pass5002Erc2771MulticallSourceDetectorReport = {")
    report_end = detector.index("\n};", report_start) + 3
    report_type = detector[report_start:report_end]
    check("sourceText" not in report_type and "abiText" not in report_type, "report_raw_source_free")
    check("contextAuthenticity:" in report_type and "correlation:" in report_type, "safe_correlation_auth_metadata_preserved")

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
    check(zero.get("auditFinalPdf") == "0/3", "zero_audit_pdf")
    check(zero.get("rights") == "2/203", "rights_unchanged")
    check(zero.get("paidValue") == "0/10", "zero_paid_value")
    check(zero.get("saleEligible") == "0/20", "zero_sale")
    check(zero.get("live") is False, "zero_live")

    receipt = {
        "schemaVersion": "velmere.p78r6.import-symbol-binding-static.v1",
        "status": "PASS",
        "checkCount": len(checks),
        "checks": checks,
        "projection": projection,
        "truthBoundary": "Static proof covers exact-path import parsing, local-symbol derivation, same-unit inheritance binding, preservation of R4/R5 fail-closed controls and zero promotion. Runtime behavior remains a separate gate.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
