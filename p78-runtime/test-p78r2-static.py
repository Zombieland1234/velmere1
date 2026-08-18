from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

P78R1_AGG = "ea3c19a193d44055e00c3ca952d279f15b4df1813f977789e6ebcea203870a08"
P78R1_PATHSET = "40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def need(condition: bool, label: str) -> None:
    if not condition:
        raise SystemExit(f"P78R2 static control failed:{label}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--receipt", required=True)
    args = ap.parse_args()

    root = Path(args.source_root)
    provider_path = root / "lib/security/audit-provider-runtime-client.ts"
    handler_path = root / "lib/security/audit-watch-post-handler.ts"
    parser_path = root / "lib/security/audit-permission-parser.ts"
    extraction_path = root / "lib/security/contract-source-abi-extraction.ts"
    provider = provider_path.read_text(encoding="utf-8")
    handler = handler_path.read_text(encoding="utf-8")
    parser = parser_path.read_text(encoding="utf-8")
    extraction = extraction_path.read_text(encoding="utf-8")
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))

    checks: list[str] = []
    def check(condition: bool, label: str) -> None:
        need(condition, label)
        checks.append(label)

    check("export type Pass2572VerifiedStaticEvidence" in provider, "provider_exports_private_static_evidence_type")
    check("export type Pass2572AuditProviderRuntimeExecution" in provider, "provider_exports_execution_envelope")
    check("report: Pass2572AuditProviderRuntimeReport" in provider, "execution_contains_public_report")
    check("verifiedStaticEvidence?: Pass2572VerifiedStaticEvidence" in provider, "execution_contains_optional_private_evidence")
    check("buildPass2572AuditProviderRuntimeExecution" in provider, "provider_exports_execution_builder")
    check("buildPass2572AuditProviderRuntimeReport" in provider, "legacy_public_report_builder_retained")
    check("const execution = await buildPass2572AuditProviderRuntimeExecution(input);" in provider, "legacy_builder_delegates_to_single_execution")
    check("return structuredClone(execution.report);" in provider, "legacy_builder_returns_report_only")
    check("const responseReceipt = receiptFromFetch(sourceResult, [identityResult]);" in provider, "static_evidence_uses_same_response_receipt")
    check("sourcePositive && identityMatched && responseReceipt?.bodyDigest" in provider, "private_evidence_requires_content_identity_digest")
    check("contractAddress: contractAddress.toLowerCase()" in provider, "private_evidence_contract_bound")
    check("provider: \"Etherscan V2\"" in provider, "private_evidence_provider_bound")
    check("observedAt: responseReceipt.observedAt" in provider, "private_evidence_observation_time_bound")
    check("responseDigest: responseReceipt.bodyDigest" in provider, "private_evidence_digest_bound")
    check("sourceText: sourceCode || undefined" in provider, "private_evidence_carries_source")
    check("abiText: usableAbi || undefined" in provider, "private_evidence_carries_abi")
    check("const explorer = explorerExecution.lane;" in provider, "public_report_uses_lane_only")
    check("const report: Pass2572AuditProviderRuntimeReport = {" in provider, "public_report_constructed_separately")
    report_type_start = provider.index("export type Pass2572AuditProviderRuntimeReport")
    report_type_end = provider.index("export type Pass2572VerifiedStaticEvidence", report_type_start)
    public_report_type = provider[report_type_start:report_type_end]
    check("sourceText" not in public_report_type and "abiText" not in public_report_type and "bytecodeText" not in public_report_type, "public_report_type_has_no_raw_static_payload")

    check('import { buildPass2572AuditProviderRuntimeExecution } from "@/lib/security/audit-provider-runtime-client";' in handler, "handler_uses_private_execution_builder")
    check("const pass2572AuditProviderRuntimeExecution = await buildPass2572AuditProviderRuntimeExecution({" in handler, "handler_builds_single_provider_execution")
    check("const pass2572AuditProviderRuntime = pass2572AuditProviderRuntimeExecution.report;" in handler, "handler_separates_public_report")
    check("const pass2572VerifiedStaticEvidence = pass2572AuditProviderRuntimeExecution.verifiedStaticEvidence ?? null;" in handler, "handler_separates_private_evidence")
    check(handler.count("verifiedStaticEvidence: pass2572VerifiedStaticEvidence") == 2, "handler_feeds_exactly_two_trusted_consumers")

    parser_idx = handler.index("const pass2576AuditPermissionParser = buildPass2576AuditPermissionParserReport({")
    parser_end = handler.index("const pass2577AuditLiquidityHolderLockRisk", parser_idx)
    check("verifiedStaticEvidence: pass2572VerifiedStaticEvidence" in handler[parser_idx:parser_end], "permission_parser_receives_private_evidence")
    extraction_idx = handler.index("const pass2583ContractSourceAbiExtraction = buildPass2583ContractSourceAbiExtractionReport({")
    extraction_end = handler.index("const pass2584HolderLiquidityDepthEvidence", extraction_idx)
    check("verifiedStaticEvidence: pass2572VerifiedStaticEvidence" in handler[extraction_idx:extraction_end], "source_extraction_receives_private_evidence")

    check("const evidence = input.verifiedStaticEvidence;" in parser, "permission_parser_keeps_trust_gate")
    check("evidence.contractAddress.toLowerCase() !== contractAddress.toLowerCase()" in parser, "permission_parser_exact_contract_guard")
    check("evidence.chain.trim().toLowerCase() !== chain.trim().toLowerCase()" in parser, "permission_parser_exact_chain_guard")
    check("responseDigest" in parser and "[a-fA-F0-9]{64}" in parser, "permission_parser_digest_guard")
    check("const evidence = input.verifiedStaticEvidence;" in extraction, "source_extraction_keeps_trust_gate")
    check("evidence.contractAddress.toLowerCase() !== contractAddress.toLowerCase()" in extraction, "source_extraction_exact_contract_guard")

    projection = manifest["projection"]
    check(projection["fileCount"] == 1601, "product_file_count_unchanged")
    check(projection["pathSetSha256"] == P78R1_PATHSET, "product_pathset_unchanged")
    check(projection["sourceContentAggregateSha256"] != P78R1_AGG, "product_aggregate_changed")
    changed = manifest.get("p78r2Delta", {}).get("changedBuildRelevantFiles", [])
    changed_paths = {item["path"] for item in changed}
    check(changed_paths == {
        "lib/security/audit-provider-runtime-client.ts",
        "lib/security/audit-watch-post-handler.ts",
    }, "exact_two_product_files_changed")

    rowmap = {row["path"]: row for row in manifest["files"]}
    for rel in changed_paths:
        data = (root / rel).read_bytes()
        check(rowmap[rel]["byteLength"] == len(data), f"manifest_bytes_match:{rel}")
        check(rowmap[rel]["sha256"] == sha256(data), f"manifest_sha_match:{rel}")

    result = {
        "schemaVersion": "velmere.p78r2.verified-static-evidence-handoff-static.v1",
        "status": "PASS",
        "checkCount": len(checks),
        "checks": checks,
        "projection": projection,
        "zeroFakeCredit": {
            "newVulnerabilityDetector": 0,
            "runtimeExploitability": 0,
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
