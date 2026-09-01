#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / "lib/security/audit-current-deployment-readonly-quorum-v2.ts"
LEGACY_MODULE = ROOT / "lib/security/audit-current-deployment-readonly-quorum.ts"
CLAIM = ROOT / "lib/security/audit-claim-ledger.ts"
ASSEMBLER = ROOT / "lib/security/audit-report-assembler.ts"
PROJECTION = ROOT / "lib/security/audit-report-customer-projection.ts"
PDF_SAFE = ROOT / "lib/security/pro-audit-pdf/customer-safe-renderer.ts"
HANDLER = ROOT / "lib/security/audit-watch-post-handler.ts"
RUNTIME = ROOT / "scripts/p82/test-p82-successful-quorum-integrity-runtime.mjs"
RECEIPT = ROOT / "receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_STATIC.json"

q = MODULE.read_text(encoding="utf-8")
legacy_q = LEGACY_MODULE.read_text(encoding="utf-8")
claim = CLAIM.read_text(encoding="utf-8")
assembler = ASSEMBLER.read_text(encoding="utf-8")
projection = PROJECTION.read_text(encoding="utf-8")
pdf_safe = PDF_SAFE.read_text(encoding="utf-8")
handler = HANDLER.read_text(encoding="utf-8")
runtime = RUNTIME.read_text(encoding="utf-8")

checks: list[dict[str, object]] = []

def ck(check_id: str, condition: bool, detail: object | None = None) -> None:
    checks.append({"id": check_id, "status": "PASS" if condition else "FAIL", **({"detail": detail} if detail is not None else {})})

# Explicit version boundary: P81 v1 stays frozen; current production uses P82 v2 only.
ck("p82_engine_id_is_versioned_v2", 'P82_CURRENT_DEPLOYMENT_READONLY_QUORUM_ID = "p82-current-deployment-readonly-quorum.v2"' in q)
ck("p82_input_schema_is_versioned_v2", 'schemaVersion: "velmere.p82.current-deployment-readonly-quorum-input.v2"' in q)
ck("p82_receipt_schema_is_versioned_v2", 'schemaVersion: "velmere.p82.current-deployment-readonly-quorum-receipt.v2"' in q)
ck("p82_legacy_p81_module_hash_frozen", hashlib.sha256(LEGACY_MODULE.read_bytes()).hexdigest() == "b57626a51dae911a277520cce849d5d3d2c63d1af79bf80059d278514386df06")
ck("p82_legacy_p81_engine_id_retained", 'P81_CURRENT_DEPLOYMENT_READONLY_QUORUM_ID = "p81-current-deployment-readonly-quorum.v1"' in legacy_q)
ck("p82_claim_ledger_imports_v2_module", 'from "./audit-current-deployment-readonly-quorum-v2"' in claim)
ck("p82_handler_imports_v2_module", 'from "@/lib/security/audit-current-deployment-readonly-quorum-v2"' in handler)
ck("p82_runtime_rejects_p81_with_v2_verifier", "p82_p81_receipt_rejected_by_p82_verifier" in runtime)
ck("p82_runtime_rejects_p81_in_production_claim_ledger", "p82_production_claim_ledger_rejects_legacy_p81_current_fact" in runtime)

# Canonical historical binding.
ck("p82_imports_canonical_record_lookup", "findP79HistoricalDeploymentGroundTruthRecord" in q)
ck("p82_imports_canonical_record_verifier", "verifyP79HistoricalDeploymentGroundTruthRecord" in q)
ck("p82_collector_requires_valid_canonical_record", "p82_canonical_historical_record_missing_or_invalid" in q)
ck("p82_collector_binds_record_id", "p82_historical_record_binding_mismatch" in q)
ck("p82_collector_binds_runtime_digest", "p82_historical_runtime_binding_mismatch" in q)
ck("p82_collector_binds_implementation", "p82_historical_implementation_binding_mismatch" in q)
ck("p82_collector_binds_forwarder", "p82_historical_forwarder_binding_mismatch" in q)
ck("p82_verifier_reloads_canonical_record", "const canonicalRecord = classificationIsConfigurationWithheld" in q)
ck("p82_verifier_checks_canonical_record_integrity", "verifyP79HistoricalDeploymentGroundTruthRecord(canonicalRecord)" in q)
ck("p82_verifier_checks_historical_record_id", "receipt.target.historicalRecordId !== canonicalRecord.recordId" in q)
ck("p82_verifier_recomputes_runtime_relation", "const expectedRuntimeRelation" in q)
ck("p82_verifier_recomputes_implementation_relation", "const expectedImplementationRelation" in q)

# Negative control identity.
ck("p82_negative_control_differs_target", "p82_negative_control_must_differ_from_target" in q)
ck("p82_negative_control_differs_forwarder", "p82_negative_control_must_differ" in q)
ck("p82_negative_control_differs_implementation", "p82_negative_control_must_differ_from_implementation" in q)
ck("p82_negative_control_zero_forbidden", "p82_negative_control_zero_address_forbidden" in q)
ck("p82_verifier_rechecks_negative_control_target", "receipt.target.negativeControlAddress === receipt.target.address" in q)
ck("p82_verifier_rechecks_negative_control_forwarder", "receipt.target.negativeControlAddress === receipt.target.trustedForwarderAddress" in q)
ck("p82_verifier_rechecks_negative_control_implementation", "receipt.target.negativeControlAddress === canonicalRecord.deployment.implementationAddress" in q)

# Endpoint and address hardening.
ck("p82_https_request_used", 'from "node:https"' in q and "httpsRequest" in q)
ck("p82_public_endpoint_https_only", 'parsed.protocol !== "https:"' in q)
ck("p82_public_endpoint_dns_hostname_only", 'isIP(parsed.hostname) !== 0' in q)
ck("p82_public_endpoint_port_443_only", 'parsed.port !== "443"' in q)
ck("p82_endpoint_credentials_query_fragment_blocked", "parsed.username || parsed.password || parsed.search || parsed.hash" in q)
ck("p82_token_like_path_blocked", "p82_provider_url_path_unbounded_or_token_like" in q)
ck("p82_dns_addresses_normalized", "normalizeConnectedAddress(row.address)" in q)
ck("p82_dns_public_only", "addresses.some((address) => !isPublicIp(address))" in q)
ck("p82_dns_set_hashed", "resolvedAddressSetSha256 = sha256Digest(canonicalJson(addresses))" in q)
ck("p82_hostname_identity_hashed", "hostnameIdentitySha256" in q and "sha256Digest(parsed.hostname.toLowerCase())" in q)
ck("p82_ipv4_loopback_private_reserved", all(token in q for token in ["a === 10", "a === 127", "a === 100 && b >= 64", "a === 169 && b === 254", "a === 172 && b >= 16", "a === 192 && b === 168", "a >= 224"]))
ck("p82_ipv6_unique_local_link_local_multicast", all(token in q for token in ['normalized.startsWith("fc")', 'normalized.startsWith("fd")', '/^fe[89ab]/', 'normalized.startsWith("ff")']))
ck("p82_ipv6_documentation_benchmark_reserved", all(token in q for token in ['normalized.startsWith("2001:2:")', 'normalized.startsWith("2001:db8:")']))
ck("p82_ipv6_transition_tunnels_blocked", all(token in q for token in ['normalized.startsWith("2001:0:")', 'normalized.startsWith("2002:")', 'normalized.startsWith("64:ff9b:")']))
ck("p82_ipv4_mapped_ipv6_checked", "mappedIpv6ToIpv4" in q and "isPrivateOrReservedIpv4(mappedIpv4)" in q)

# Pinned transport, TLS identity and bounded body.
ck("p82_default_transport_does_not_use_global_fetch", "const fetchImpl = options.fetchImpl;" in q)
ck("p82_default_transport_calls_pinned_https", "return pinnedHttpsPost" in q)
ck("p82_prevalidated_address_set_used", "args.prepared.resolvedAddresses" in q and "allowedAddresses" in q)
ck("p82_pinned_address_required_public", "rpc_pinned_address_missing" in q and "isPublicIp(pinnedAddress)" in q)
ck("p82_lookup_callback_pins_address", "lookup: (_hostname, _options, callback) => callback(null, pinnedAddress" in q)
ck("p82_tls_servername_retains_hostname", "servername: args.prepared.parsed.hostname" in q)
ck("p82_agent_disabled", "agent: false" in q)
ck("p82_redirects_not_followed_by_https_request", "httpsRequest(args.prepared.parsed" in q and "redirect:" not in q[q.index("async function pinnedHttpsPost"):q.index("async function rpcHttpPost")])
ck("p82_remote_address_checked_after_tls", 'socket.once("secureConnect"' in q and "socket.remoteAddress" in q)
ck("p82_remote_address_must_be_prevalidated", "allowedAddresses.includes(connectedAddress)" in q)
ck("p82_connected_address_public_rechecked", "!isPublicIp(connectedAddress)" in q)
ck("p82_connected_address_only_hashed", "connectedAddressSha256 = sha256Digest(connectedAddress)" in q)
ck("p82_accept_encoding_identity", '"accept-encoding": "identity"' in q)
ck("p82_content_encoding_rejected", "rpc_content_encoding_invalid" in q)
ck("p82_declared_response_length_capped", "declaredLength > args.maxResponseBytes" in q)
ck("p82_streaming_response_length_capped", "total > args.maxResponseBytes" in q)
ck("p82_response_chunks_bounded_before_combine", q.index("total > args.maxResponseBytes") < q.index("combineChunks(chunks, total)"))
ck("p82_request_timeout_destroys_socket", "request.setTimeout(args.timeoutMs" in q and "request.destroy(error)" in q)
ck("p82_connected_address_required_before_resolve", "if (!connectedAddressSha256)" in q and "rpc_connected_address_not_prevalidated" in q)
ck("p82_receipt_marks_pinned_transport", 'transportBinding: "PINNED_PUBLIC_ADDRESS"' in q)
ck("p82_injected_transport_separately_marked", 'transportBinding: "INJECTED_TEST_TRANSPORT"' in q)

# Successful-subset diversity at every proof stage.
ck("p82_success_diversity_helper_exists", "function successfulStageDiversityBlockers" in q)
ck("p82_success_diversity_provider_count", 'requireCount(configs.length, "provider")' in q)
ck("p82_success_diversity_provider_id", '"provider_id"' in q)
ck("p82_success_diversity_operator", '"operator"' in q)
ck("p82_success_diversity_family", '"provider_family"' in q)
ck("p82_success_diversity_correlation", '"correlation_group"' in q)
ck("p82_success_diversity_endpoint", '"endpoint_identity"' in q)
ck("p82_success_diversity_public_hostname", '"public_hostname"' in q)
ck("p82_head_success_subset_checked", re.search(r"headDiversityBlockers\s*=\s*successfulStageDiversityBlockers\([\s\S]*?headSuccess", q) is not None)
ck("p82_snapshot_success_subset_checked", re.search(r"snapshotDiversityBlockers\s*=\s*successfulStageDiversityBlockers\([\s\S]*?snapshotSuccess", q) is not None)
ck("p82_implementation_success_subset_checked", re.search(r"implementationDiversityBlockers\s*=\s*successfulStageDiversityBlockers\([\s\S]*?implementationSuccess", q) is not None)
ck("p82_proxy_forwarder_success_subset_checked", re.search(r"proxyForwarderDiversityBlockers\s*=\s*successfulStageDiversityBlockers\([\s\S]*?proxySuccess", q) is not None)
ck("p82_stage_diversity_failure_withholds", q.count('classification: "WITHHELD_PROVIDER_QUORUM"') >= 5)
ck("p82_public_stage_requires_hostname_diversity", q.count('input.executionClass === "PUBLIC_READONLY_CURRENT"') >= 5)

# Partial implementation proof and customer promotion boundary.
ck("p82_implementation_success_explicit_subset", "const implementationSuccess = snapshotSuccess.filter" in q)
ck("p82_implementation_requires_minimum_count", "implementationSuccess.length >= input.minimumProviderCount" in q)
ck("p82_implementation_requires_diversity", "implementationDiversityBlockers.length === 0" in q)
ck("p82_implementation_consensus_required", "consensus(implementationSuccess.map" in q)
ck("p82_single_implementation_response_not_enough", "currentProxyImplementationProven: Boolean(implementationCode)" in q and "implementationSuccess.length >= input.minimumProviderCount" in q)
ck("p82_partial_proxy_customer_fact_false", re.search(r'classification: implementationCode[\s\S]*?customerCurrentRuntimeFactEligible: false', q) is not None)
ck("p82_nonproxy_customer_fact_false", re.search(r'PASS_EXACT_BLOCK_RUNTIME_QUORUM_PROXY_WITHHELD[\s\S]*?customerCurrentRuntimeFactEligible: false', q) is not None)
ck("p82_full_customer_fact_requires_forwarder_proof", "customerCurrentRuntimeFactEligible: publicDefaultExecution && rightsEligible && fullForwarderProof" in q)
ck("p82_full_trusted_forwarder_fact_requires_same", "customerTrustedForwarderFactEligible: publicDefaultExecution && rightsEligible && fullForwarderProof" in q)
ck("p82_verifier_derives_customer_eligibility", "const expectedCustomerFactEligibility = fullClassification" in q)
ck("p82_verifier_requires_exact_customer_eligibility", "receipt.customerCurrentRuntimeFactEligible !== expectedCustomerFactEligibility" in q and "receipt.customerTrustedForwarderFactEligible !== expectedCustomerFactEligibility" in q)

# Deterministic call context and read-only boundary.
ck("p82_forwarder_call_explicit_zero_from", q.count('from: "0x0000000000000000000000000000000000000000"') >= 2)
ck("p82_forwarder_call_exact_block", "P82_IS_TRUSTED_FORWARDER_SELECTOR" in q and "snapshotTag" in q)
ck("p82_negative_control_call_exact_block", "input.negativeControlAddress.toLowerCase()" in q)
ck("p82_only_read_methods_allowlisted", all(method in q for method in ["eth_chainId", "eth_blockNumber", "eth_getBlockByNumber", "eth_getCode", "eth_call"]))
ck("p82_transaction_methods_not_allowlisted", all(method not in q[q.index("export const P82_READONLY_RPC_METHODS"):q.index("] as const", q.index("export const P82_READONLY_RPC_METHODS"))] for method in ["eth_sendRawTransaction", "eth_sendTransaction", "personal_sign", "eth_sign"]))
ck("p82_forbidden_rpc_prefixes_enforced", "FORBIDDEN_RPC_PREFIXES.some" in q)
ck("p82_transaction_methods_used_false", "transactionMethodsUsed: false" in q)
ck("p82_exploitability_forced_false", "currentExploitabilityProven: false" in q)
ck("p82_replay_forced_false", "independentReplayProven: false" in q)
ck("p82_final_forced_false", "customerFinalEligible: false" in q and "auditFinalPdfEligible: false" in q)
ck("p82_risk_floor_null", "riskScoreFloor: null" in q)

# Verifier diversity and transport binding.
ck("p82_verifier_recomputes_all_configured_diversity", all(token in q for token in ["providerDiversity.operatorCount !== new Set", "providerDiversity.familyCount !== new Set", "providerDiversity.correlationGroupCount !== new Set", "providerDiversity.endpointIdentityCount !== new Set", "providerDiversity.publicHostnameCount !== new Set"]))
ck("p82_verifier_filters_successful_rows", 'receipt.providers.filter((row) => row.technicalStatus === "PASS")' in q)
ck("p82_verifier_successful_operator_diversity", "new Set(successful.map((row) => row.operatorId)).size" in q)
ck("p82_verifier_successful_family_diversity", "new Set(successful.map((row) => row.providerFamily)).size" in q)
ck("p82_verifier_successful_correlation_diversity", "new Set(successful.map((row) => row.correlationGroup)).size" in q)
ck("p82_verifier_successful_endpoint_diversity", "new Set(successful.map((row) => row.endpointIdentitySha256)).size" in q)
ck("p82_verifier_successful_hostname_diversity", "new Set(successful.map((row) => row.hostnameIdentitySha256)" in q)
ck("p82_verifier_public_pass_requires_pinned_transport", 'row.technicalStatus === "PASS" && (row.transportBinding !== "PINNED_PUBLIC_ADDRESS"' in q)
ck("p82_verifier_injected_cannot_claim_current", 'receipt.transportClass === "INJECTED_TEST_TRANSPORT"' in q and "receipt.customerCurrentRuntimeFactEligible" in q)
ck("p82_verifier_rejects_mixed_transport_classes", 'row.transportBinding === "INJECTED_TEST_TRANSPORT"' in q and 'row.transportBinding === "PINNED_PUBLIC_ADDRESS"' in q)
ck("p82_verifier_rechecks_receipt_hmac", "safeEqual(receipt.signature.hmacSha256" in q)
ck("p82_verifier_rechecks_canonical_digest", "receipt.receiptDigest !== sha256Digest(canonicalJson(unsignedReceipt(receipt)))" in q)
ck("p82_verifier_forbids_raw_endpoint_fields", '"rpcUrl", "endpointUrl"' in q)
ck("p82_verifier_forbids_raw_bytecode_fields", '"runtimeBytecode", "implementationBytecode"' in q)
ck("p82_verifier_forbids_raw_payload_fields", '"rawResponse", "rawPayload"' in q)
ck("p82_verifier_forbids_secrets", '"privateKey", "secret"' in q)

# Customer path and privacy regression remains reachable.
ck("p82_claim_ledger_imports_receipt_verifier", "verifyP82CurrentDeploymentReadonlyQuorumReceiptFromEnvironment" in claim or "verifyP82CurrentDeploymentReadonlyQuorumReceipt" in claim)
ck("p82_claim_ledger_current_config_kind", "current_deployment_configuration" in claim)
ck("p82_claim_ledger_current_fact_requires_eligibility", "customerCurrentRuntimeFactEligible" in claim and "customerTrustedForwarderFactEligible" in claim)
ck("p82_assembler_preserves_current_chain_finding", "findingFromCurrentConfigurationClaim" in assembler and "sourceFamily: claim.sourceFamily" in assembler)
ck("p82_projection_preserves_current_chain_finding", "current-chain:" in projection)
ck("p82_pdf_has_closed_current_evidence_allowlist", "currentDeployment=" in pdf_safe and "currentExploitabilityProven=false" in pdf_safe and "independentReplay=false" in pdf_safe)
ck("p82_handler_collects_server_side_quorum", "collectP82CurrentDeploymentReadonlyQuorumFromEnvironment" in handler)
ck("p82_runtime_covers_correlated_head", "p82_successful_head_subset_requires_operator_diversity" in runtime)
ck("p82_runtime_covers_correlated_snapshot", "p82_successful_snapshot_subset_requires_diversity" in runtime)
ck("p82_runtime_covers_correlated_proxy", "p82_successful_proxy_forwarder_subset_requires_diversity" in runtime)
ck("p82_runtime_covers_single_implementation", "p82_single_implementation_response_cannot_prove_proxy" in runtime)
ck("p82_runtime_covers_canonical_rewrite", "p82_verifier_rejects_resigned_historical_record_rewrite" in runtime)
ck("p82_runtime_covers_unpinned_transport", "p82_verifier_rejects_unpinned_successful_public_transport" in runtime)

failed = [row["id"] for row in checks if row["status"] == "FAIL"]
result = {
    "schemaVersion": "velmere.p82.successful-quorum-integrity-static.v1",
    "status": "PASS" if not failed else "FAIL",
    "checkCount": len(checks),
    "passed": len(checks) - len(failed),
    "failed": failed,
    "checks": checks,
    "safetyBoundary": {
        "liveExternalRpcExecuted": False,
        "transactionMethodsUsed": False,
        "currentBscStateProven": False,
        "customerFinal": "0/20",
        "auditFinalPdf": "0/3",
    },
}
RECEIPT.parent.mkdir(parents=True, exist_ok=True)
RECEIPT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({k: result[k] for k in ["status", "checkCount", "passed", "failed"]}, indent=2))
raise SystemExit(0 if not failed else 1)
