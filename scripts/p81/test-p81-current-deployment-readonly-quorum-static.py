#!/usr/bin/env python3
"""P81 defensive static control-plane proof.

This validates current-source wiring, read-only RPC restrictions, fail-closed
consensus, customer propagation, and PDF redaction boundaries. It grants no
live-RPC, current-state, exploitability, replay, rights, exact-Windows,
Customer FINAL, or Audit FINAL PDF credit.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = {
    "quorum": ROOT / "lib/security/audit-current-deployment-readonly-quorum.ts",
    "claim": ROOT / "lib/security/audit-claim-ledger.ts",
    "assembler": ROOT / "lib/security/audit-report-assembler.ts",
    "projection": ROOT / "lib/security/audit-report-customer-projection.ts",
    "renderer": ROOT / "lib/security/pro-audit-pdf/customer-safe-renderer.ts",
    "pdf": ROOT / "lib/security/pro-audit-pdf/render-pro-audit-pdf.ts",
    "handler": ROOT / "lib/security/audit-watch-post-handler.ts",
    "runtime": ROOT / "scripts/p81/test-p81-current-deployment-readonly-quorum-runtime.mjs",
    "runtime_receipt": ROOT / "receipts/p81/P81_CURRENT_DEPLOYMENT_READONLY_QUORUM_RUNTIME.json",
    "fixture_receipt": ROOT / "artifacts/p81/P81_LOCAL_READONLY_QUORUM_FIXTURE_RECEIPT.json",
}
texts = {
    key: path.read_text(encoding="utf-8")
    for key, path in FILES.items()
    if path.suffix not in {".json"}
}
checks: list[dict[str, object]] = []


def ck(check_id: str, condition: bool, detail: object | None = None) -> None:
    row: dict[str, object] = {"id": check_id, "status": "PASS" if condition else "FAIL"}
    if detail is not None:
        row["detail"] = detail
    checks.append(row)


for key, path in FILES.items():
    ck(f"p81_file_exists_{key}", path.exists(), str(path.relative_to(ROOT)))

q = texts["quorum"]
claim = texts["claim"]
assembler = texts["assembler"]
projection = texts["projection"]
renderer = texts["renderer"]
pdf = texts["pdf"]
handler = texts["handler"]
runtime = texts["runtime"]

# Exact scope and read-only allowlist.
ck("p81_engine_id_declared", 'p81-current-deployment-readonly-quorum.v1' in q)
ck("p81_input_schema_declared", 'velmere.p81.current-deployment-readonly-quorum-input.v1' in q)
ck("p81_receipt_schema_declared", 'velmere.p81.current-deployment-readonly-quorum-receipt.v1' in q)
ck("p81_execution_classes_separated", '"LOCAL_DETERMINISTIC_FIXTURE" | "PUBLIC_READONLY_CURRENT"' in q)
ck("p81_transport_classes_separated", '"DEFAULT_NETWORK_STACK" | "INJECTED_TEST_TRANSPORT"' in q)
ck("p81_exact_selector_bound", 'P81_IS_TRUSTED_FORWARDER_SELECTOR = "0x572b6c05"' in q)
for method in ["eth_chainId", "eth_blockNumber", "eth_getBlockByNumber", "eth_getCode", "eth_call"]:
    ck(f"p81_allowlist_has_{method.lower()}", f'"{method}"' in q)
allowlist_match = re.search(r"P81_READONLY_RPC_METHODS\s*=\s*\[(.*?)\]\s*as const", q, re.S)
allowlist_body = allowlist_match.group(1) if allowlist_match else ""
ck("p81_allowlist_exact_count_five", len(re.findall(r'"eth_[A-Za-z]+"', allowlist_body)) == 5, allowlist_body)
ck("p81_forbidden_rpc_prefixes_declared", all(token in q for token in ['"eth_send"', '"personal_"', '"admin_"', '"debug_"', '"trace_"', '"txpool_"']))
ck("p81_rpc_call_requires_allowlist", 'if (!P81_READONLY_RPC_METHODS.includes(args.method)) throw new Error("rpc_method_not_allowlisted")' in q)
ck("p81_rpc_call_rejects_privileged_prefix", 'rpc_transaction_or_privileged_method_forbidden' in q)
ck("p81_policy_transaction_methods_false", 'transactionMethodsUsed: false' in q)
ck("p81_policy_arbitrary_method_false", 'arbitraryRpcMethodAccepted: false' in q)
ck("p81_policy_customer_endpoint_false", 'customerSuppliedEndpointAccepted: false' in q)
ck("p81_truth_boundary_disclaims_exploitability", 'It never proves exploitability' in q)
ck("p81_truth_boundary_disclaims_final", 'grants Customer FINAL/Audit FINAL PDF' in q)
ck("p81_risk_floor_fixed_null", 'riskScoreFloor: null' in q)
ck("p81_customer_final_type_fixed_false", 'customerFinalEligible: false' in q)
ck("p81_pdf_final_type_fixed_false", 'auditFinalPdfEligible: false' in q)
ck("p81_promotion_type_fixed_false", 'promotionAllowed: false' in q)
ck("p81_exploitability_type_fixed_false", 'currentExploitabilityProven: false' in q)
ck("p81_independent_replay_type_fixed_false", 'independentReplayProven: false' in q)

# Input identity, bounds and negative control.
ck("p81_chain_identity_locked_bsc_56", 'input?.chainId === "56" && input?.chainName === "BSC"' in q)
ck("p81_target_address_validated", 'p81_target_address_invalid' in q)
ck("p81_forwarder_address_validated", 'p81_trusted_forwarder_address_invalid' in q)
ck("p81_negative_control_address_validated", 'p81_negative_control_address_invalid' in q)
ck("p81_negative_control_must_differ", 'p81_negative_control_must_differ' in q)
ck("p81_historical_record_id_validated", 'p81_historical_record_id_invalid' in q)
ck("p81_historical_runtime_digest_validated", 'p81_historical_runtime_digest_invalid' in q)
ck("p81_historical_implementation_validated", 'p81_historical_implementation_invalid' in q)
ck("p81_confirmation_depth_bounded", 'input.confirmationDepth >= 15 && input.confirmationDepth <= 2_048' in q)
ck("p81_head_skew_bounded", 'input.maxHeadSkew >= 0 && input.maxHeadSkew <= 32' in q)
ck("p81_provider_count_three_to_seven", 'const MAX_PROVIDER_COUNT = 7' in q and 'const MIN_PROVIDER_COUNT = 3' in q)
ck("p81_signing_configuration_validated", 'p81_signing_configuration_invalid' in q)
ck("p81_provider_id_validated", 'p81_provider_id_invalid' in q)
ck("p81_operator_id_validated", 'p81_provider_operator_invalid' in q)
ck("p81_family_id_validated", 'p81_provider_family_invalid' in q)
ck("p81_correlation_id_validated", 'p81_provider_correlation_invalid' in q)
ck("p81_duplicate_provider_rejected", 'p81_duplicate_provider_id' in q)
ck("p81_operator_diversity_required", 'p81_insufficient_operator_diversity' in q)
ck("p81_family_diversity_required", 'p81_insufficient_provider_family_diversity' in q)
ck("p81_correlation_diversity_required", 'p81_insufficient_correlation_group_diversity' in q)
ck("p81_independence_not_overclaimed", 'DECLARED_CONFIGURATION_DIVERSITY_NOT_NETWORK_INDEPENDENCE_PROOF' in q)

# URL/SSRF/DNS restrictions.
ck("p81_url_parser_used", 'parsed = new URL(provider.rpcUrl)' in q)
ck("p81_url_credentials_query_fragment_blocked", 'parsed.username || parsed.password || parsed.search || parsed.hash' in q)
ck("p81_url_secret_blocker_code", 'p81_provider_url_secret_or_query_forbidden' in q)
ck("p81_url_path_length_bounded", 'parsed.pathname.length > 160' in q)
ck("p81_url_segment_length_bounded", 'part.length > 96' in q)
ck("p81_token_like_path_blocked", 'p81_provider_url_path_unbounded_or_token_like' in q)
ck("p81_fixture_requires_loopback", 'p81_fixture_endpoint_must_be_loopback' in q)
ck("p81_public_requires_https", 'p81_current_endpoint_requires_public_https' in q)
ck("p81_public_rejects_loopback", 'parsed.protocol !== "https:" || loopback' in q)
ck("p81_dns_all_records_resolved", 'dnsLookup(hostname, { all: true, verbatim: true })' in q)
ck("p81_dns_resolution_failure_blocked", 'p81_provider_dns_resolution_failed' in q)
ck("p81_nonpublic_dns_blocked", 'p81_provider_dns_non_public_address' in q)
ck("p81_ipv4_private_reserved_filter", 'isPrivateOrReservedIpv4' in q)
ck("p81_ipv6_private_reserved_filter", 'isPrivateOrReservedIpv6' in q)
ck("p81_public_ip_gate", 'addresses.some((address) => !isPublicIp(address))' in q)
ck("p81_dns_set_hashed_not_returned_raw", 'resolvedAddressSetSha256 = sha256Digest(canonicalJson(addresses))' in q)
ck("p81_endpoint_identity_hashed", 'endpointIdentitySha256: sha256Digest(endpointIdentity(parsed))' in q)
ck("p81_duplicate_endpoint_rejected", 'p81_duplicate_endpoint_identity' in q)
ck("p81_public_hostname_diversity_required", 'p81_insufficient_public_hostname_diversity' in q)

# Network hardening and response integrity.
ck("p81_rpc_post_only", 'method: "POST"' in q)
ck("p81_rpc_json_accept", 'accept: "application/json"' in q)
ck("p81_rpc_json_content_type", '"content-type": "application/json"' in q)
ck("p81_rpc_defensive_purpose_header", 'x-velmere-purpose' in q and 'defensive-read-only-current-deployment-validation' in q)
ck("p81_redirects_error", 'redirect: "error"' in q)
ck("p81_cache_no_store", 'cache: "no-store"' in q)
ck("p81_abort_timeout", 'new AbortController()' in q and 'setTimeout(() => controller.abort()' in q)
ck("p81_http_failure_rejected", 'rpc_http_failure' in q)
ck("p81_declared_length_bounded", 'declaredLength > args.maxResponseBytes' in q)
ck("p81_actual_body_bounded", 'buffer.byteLength > args.maxResponseBytes' in q)
ck("p81_content_type_validated", 'rpc_content_type_invalid' in q)
ck("p81_invalid_json_rejected", 'rpc_json_invalid' in q)
ck("p81_envelope_validated", 'rpc_envelope_invalid' in q)
ck("p81_jsonrpc_id_bound", 'body.id !== id' in q)
ck("p81_jsonrpc_error_rejected", 'Object.prototype.hasOwnProperty.call(body, "error")' in q)
ck("p81_request_digest_recorded", 'requestSha256: sha256Bytes(requestBody)' in q)
ck("p81_response_digest_recorded", 'responseSha256' in q and 'sha256Bytes(buffer)' in q)
ck("p81_raw_response_root_derived", 'rawResponseRootSha256' in q and 'providerRawRoot' in q)
ck("p81_request_root_derived", 'requestRootSha256' in q and 'providerRequestRoot' in q)
ck("p81_raw_network_error_messages_not_exposed", 'rpcFailureCode' in q and 'p81_${stage}_transport_failed' in q)

# Exact-block consensus and proxy/configuration proof.
ck("p81_chain_id_read_first", 'method: "eth_chainId"' in q)
ck("p81_head_read", 'method: "eth_blockNumber"' in q)
ck("p81_snapshot_uses_min_head_minus_depth", 'const snapshotBlock = headMin - input.confirmationDepth' in q)
ck("p81_head_semantic_conflict_fails_closed", 'p81_semantic_head_conflict' in q)
ck("p81_insufficient_head_quorum_withheld", 'p81_insufficient_head_quorum' in q)
ck("p81_head_skew_exceeded_withheld", 'p81_head_skew_exceeded' in q)
ck("p81_exact_block_header_read", 'method: "eth_getBlockByNumber"' in q)
ck("p81_exact_block_number_checked", 'number !== snapshotBlock' in q)
ck("p81_block_hash_required", 'normalizeHash32(block?.hash)' in q)
ck("p81_parent_hash_required", 'normalizeHash32(block?.parentHash)' in q)
ck("p81_state_root_required", 'normalizeHash32(block?.stateRoot)' in q)
ck("p81_block_timestamp_required", 'quantityToSafeNumber(block?.timestamp)' in q)
ck("p81_target_code_exact_block", 'params: [input.targetAddress.toLowerCase(), snapshotTag]' in q)
ck("p81_snapshot_semantic_conflict_fails_closed", 'p81_semantic_snapshot_conflict' in q)
ck("p81_insufficient_snapshot_quorum_withheld", 'p81_insufficient_snapshot_quorum' in q)
ck("p81_block_runtime_consensus_required", 'blockConsensus.conflict || runtimeConsensus.conflict' in q)
ck("p81_eip1167_extraction_reused", 'extractP79Eip1167Implementation(runtimeCode)' in q)
ck("p81_nonproxy_runtime_withholds_proxy", 'PASS_EXACT_BLOCK_RUNTIME_QUORUM_PROXY_WITHHELD' in q)
ck("p81_implementation_code_exact_block", 'params: [implementationAddress, snapshotTag]' in q)
ck("p81_forwarder_call_exact_block", 'P81_IS_TRUSTED_FORWARDER_SELECTOR, input.trustedForwarderAddress' in q and 'snapshotTag' in q)
ck("p81_negative_control_call_exact_block", 'P81_IS_TRUSTED_FORWARDER_SELECTOR, input.negativeControlAddress' in q)
ck("p81_bool_parser_requires_32_bytes", 'if (!/^0x[a-f0-9]{64}$/.test(text)) return null' in q)
ck("p81_bool_parser_accepts_only_zero_or_one", 'return false' in q and 'return true' in q and 'return null' in q)
ck("p81_proxy_semantic_conflict_fails_closed", 'p81_semantic_proxy_or_forwarder_conflict' in q)
ck("p81_proxy_quorum_required", 'p81_insufficient_forwarder_state_quorum' in q)
ck("p81_implementation_consensus_required", 'implementationConsensus.conflict' in q)
ck("p81_forwarder_consensus_required", 'forwarderConsensus.conflict' in q)
ck("p81_negative_consensus_required", 'negativeConsensus.conflict' in q)
ck("p81_unexpected_negative_control_withholds_forwarder", 'p81_negative_control_unexpected_active' in q)
ck("p81_current_runtime_only_default_public", 'input.executionClass === "PUBLIC_READONLY_CURRENT" && transportClass === "DEFAULT_NETWORK_STACK"' in q)
ck("p81_current_fact_requires_rights", 'publicDefaultExecution && rightsEligible' in q)

# Rights, redaction, signing, and verifier fail-closed behavior.
ck("p81_rights_status_field_level", all(token in q for token in ['termsCheckedAt', 'reverifyBy', 'derivedUseAllowed', 'displayAllowed', 'attributionRequired']))
ck("p81_rights_current_checked", 'Date.parse(reverify) >= now.getTime()' in q)
ck("p81_eligible_rights_allowlist", all(token in q for token in ['PUBLIC_DOMAIN', 'OPEN_COMMERCIAL_ALLOWED', 'PUBLIC_REUSE_ALLOWED', 'DERIVED_USE_ONLY_ALLOWED', 'ALLOWED_WITH_ATTRIBUTION']))
ck("p81_ambiguous_rights_not_eligible", 'AMBIGUOUS_BLOCKED' in q and 'RIGHTS_ELIGIBLE' in q)
ck("p81_raw_provider_payload_false", 'rawProviderPayloadRedistributed: false' in q)
ck("p81_raw_runtime_false", 'rawRuntimeBytecodeRedistributed: false' in q)
ck("p81_raw_implementation_false", 'rawImplementationBytecodeRedistributed: false' in q)
ck("p81_hmac_sha256_used", 'createHmac("sha256", secret)' in q)
ck("p81_timing_safe_compare_used", 'timingSafeEqual(a, b)' in q)
ck("p81_signing_secret_minimum_32", 'String(signing?.secret ?? "").length >= 32' in q)
ck("p81_receipt_digest_canonical", 'sha256Digest(canonicalJson(body))' in q)
ck("p81_signature_covers_receipt_digest", 'hmacDigest(signing.secret, receiptDigest)' in q)
ck("p81_verifier_recomputes_digest", 'receipt.receiptDigest !== sha256Digest(canonicalJson(unsignedReceipt(receipt)))' in q)
ck("p81_verifier_checks_hmac", 'safeEqual(receipt.signature.hmacSha256, hmacDigest(signing.secret, receipt.receiptDigest))' in q)
ck("p81_verifier_rejects_raw_endpoint_fields", '"rpcUrl", "endpointUrl"' in q)
ck("p81_verifier_rejects_raw_bytecode_fields", '"runtimeBytecode", "implementationBytecode"' in q)
ck("p81_verifier_rejects_secrets", '"privateKey", "secret"' in q)
ck("p81_verifier_rejects_long_raw_hex", '/^0x[a-f0-9]{130,}$/i.test(value)' in q)
ck("p81_verifier_forces_no_exploitability", 'receipt.proof.currentExploitabilityProven !== false' in q)
ck("p81_verifier_forces_no_independent_replay", 'receipt.proof.independentReplayProven !== false' in q)
ck("p81_verifier_forces_no_final", 'receipt.customerFinalEligible !== false' in q and 'receipt.auditFinalPdfEligible !== false' in q)
ck("p81_verifier_forces_null_risk_floor", 'receipt.riskScoreFloor !== null' in q)
ck("p81_verifier_blocks_fixture_promotion", 'receipt.executionClass === "LOCAL_DETERMINISTIC_FIXTURE"' in q and 'receipt.customerCurrentRuntimeFactEligible' in q)
ck("p81_verifier_blocks_injected_transport_promotion", 'receipt.transportClass === "INJECTED_TEST_TRANSPORT"' in q)
ck("p81_verifier_requires_public_https_rows", 'row.endpointClass !== "PUBLIC_HTTPS" || !row.resolvedAddressSetSha256' in q)
ck("p81_verifier_requires_negative_control", 'receipt.trustedForwarder.negativeControlState !== "INACTIVE"' in q)
ck("p81_key_rotation_current_present", 'VELMERE_CURRENT_DEPLOYMENT_QUORUM_KEY_ID_CURRENT' in q and 'VELMERE_CURRENT_DEPLOYMENT_QUORUM_SECRET_CURRENT' in q)
ck("p81_key_rotation_previous_present", 'VELMERE_CURRENT_DEPLOYMENT_QUORUM_KEY_ID_PREVIOUS' in q and 'VELMERE_CURRENT_DEPLOYMENT_QUORUM_SECRET_PREVIOUS' in q)

# Server-only environment wiring and target binding.
ck("p81_env_feature_flag_required", 'VELMERE_CURRENT_DEPLOYMENT_QUORUM_ENABLED !== "true"' in q)
ck("p81_env_chain_allowlist", '["bsc", "bnb", "bnb-smart-chain", "binance-smart-chain", "56"]' in q)
ck("p81_env_target_must_match_p79_record", 'findP79HistoricalDeploymentGroundTruthRecord({ chain: "bsc", contractAddress: targetAddress })' in q)
ck("p81_env_provider_json_bounded", 'raw.length > 32_768' in q)
ck("p81_env_provider_config_json", 'VELMERE_BSC_CURRENT_RPC_QUORUM_CONFIG_JSON' in q)
ck("p81_env_confirmation_depth", 'VELMERE_BSC_CURRENT_RPC_CONFIRMATION_DEPTH' in q)
ck("p81_env_head_skew", 'VELMERE_BSC_CURRENT_RPC_MAX_HEAD_SKEW' in q)
ck("p81_env_minimum_providers", 'VELMERE_BSC_CURRENT_RPC_MINIMUM_PROVIDERS' in q)
ck("p81_handler_imports_collector", 'collectP81CurrentDeploymentReadonlyQuorumFromEnvironment' in handler)
ck("p81_handler_starts_server_configured_promise", 'const pass81CurrentDeploymentQuorumPromise = collectP81CurrentDeploymentReadonlyQuorumFromEnvironment({' in handler)
ck("p81_handler_uses_normalized_chain_address", 'chain: normalized.chain' in handler and 'contractAddress: normalized.contractAddress' in handler)
ck("p81_handler_awaits_quorum", 'pass81CurrentDeploymentQuorum' in handler and 'await Promise.all' in handler)
ck("p81_handler_passes_private_receipt_to_claim_ledger", 'currentDeploymentQuorumEvidence: pass81CurrentDeploymentQuorum' in handler)
ck("p81_handler_comment_endpoint_not_customer", 'Endpoints are never' in handler and 'accepted from the customer payload' in handler)
ck("p81_handler_comment_receipt_not_returned", 'private receipt is not returned' in handler)
ck("p81_handler_no_rpc_url_input_field", 'rpcUrl' not in handler)

# Claim -> finding -> projection -> PDF propagation.
ck("p81_claim_imports_verifier", 'verifyP81CurrentDeploymentReadonlyQuorumReceiptFromEnvironment' in claim)
ck("p81_claim_input_accepts_quorum_receipt", 'currentDeploymentQuorumEvidence?: P81CurrentDeploymentReadonlyQuorumReceipt | null' in claim)
ck("p81_claim_requires_hmac_environment_verification", 'verifyP81CurrentDeploymentReadonlyQuorumReceiptFromEnvironment(currentDeploymentQuorumEvidence)' in claim)
ck("p81_claim_requires_current_runtime_eligibility", 'currentDeploymentQuorumEvidence.customerCurrentRuntimeFactEligible' in claim)
ck("p81_claim_requires_forwarder_eligibility", 'currentDeploymentQuorumEvidence.customerTrustedForwarderFactEligible' in claim)
ck("p81_claim_requires_exact_block_proof", 'currentDeploymentQuorumEvidence.proof.currentRuntimeStateProven' in claim)
ck("p81_claim_requires_proxy_proof", 'currentDeploymentQuorumEvidence.proof.currentProxyImplementationProven' in claim)
ck("p81_claim_requires_forwarder_proof", 'currentDeploymentQuorumEvidence.proof.currentTrustedForwarderStateProven' in claim)
ck("p81_claim_requires_block_hash_state_root", 'currentDeploymentQuorumEvidence.snapshot.blockHash' in claim and 'currentDeploymentQuorumEvidence.snapshot.stateRoot' in claim)
ck("p81_claim_requires_runtime_and_implementation_digests", 'runtimeBytecodeSha256' in claim and 'implementationBytecodeSha256' in claim)
ck("p81_claim_requires_negative_control_inactive", 'negativeControlState === "INACTIVE"' in claim)
ck("p81_claim_is_neutral_finding_kind", 'findingKind?: "current_deployment_configuration"' in claim)
ck("p81_claim_source_family_current_chain", 'current-chain:exact-block-readonly-quorum' in claim)
ck("p81_claim_customer_boundary_no_exploitability", 'This does not prove current exploitability.' in claim)
ck("p81_claim_pdf_row_complete", all(token in claim for token in ['currentDeployment=', 'snapshotBlock=', 'blockHash=', 'stateRoot=', 'runtimeSha256=', 'implementationSha256=', 'trustedForwarderState=', 'negativeControl=INACTIVE', 'currentExploitabilityProven=false', 'independentReplay=false']))
ck("p81_claim_has_no_adverse_kind_assignment", 'findingKind: "current_deployment_configuration"' in claim and 'adverseKind:' not in claim[claim.find('id: `p81-current-deployment'):claim.find('const sourceContextIntegrity')])
ck("p81_claim_has_no_risk_floor_assignment", 'adverseRiskFloor:' not in claim[claim.find('id: `p81-current-deployment'):claim.find('const sourceContextIntegrity')])
ck("p81_claim_evidence_refs_digest_bound", all(token in claim for token in ['currentDeploymentQuorumEvidence.receiptDigest', 'currentDeploymentQuorumEvidence.snapshot.blockHash', 'currentDeploymentQuorumEvidence.snapshot.stateRoot']))
ck("p81_claim_ordered_before_source_pattern", '...currentDeploymentQuorumClaims, ...sourceContextClaims' in claim)
ck("p81_assembler_recognizes_current_configuration", 'findingKind === "current_deployment_configuration"' in assembler)
ck("p81_assembler_current_finding_info", 'severity: "info"' in assembler[assembler.find('function findingFromCurrentConfigurationClaim'):assembler.find('function visualContract')])
ck("p81_assembler_current_finding_title", 'Current deployment configuration · exact-block quorum' in assembler)
ck("p81_assembler_current_before_permission_findings", '[...adverseFindings, ...currentConfigurationFindings, ...permissionFindings' in assembler)
ck("p81_assembler_risk_floor_only_from_adverse", 'confirmedRiskFloorClaims' in assembler and 'findingKind' not in assembler[assembler.find('const confirmedRiskFloorClaims'):assembler.find('const confirmedHistoricalClaims')])
ck("p81_projection_retains_current_chain_finding", 'finding.sourceFamily.startsWith("current-chain:") && visibleIds.has("claim-ledger")' in projection)
ck("p81_projection_basic_hides_pro_line", 'deliveredTier === "basic" ? clean(finding.publicLine) : clean(finding.proLine)' in projection)
ck("p81_renderer_closed_current_allowlist", 'PUBLIC_CURRENT_DEPLOYMENT_QUORUM_LINE' in renderer)
ck("p81_renderer_allowlist_requires_negative_control", 'negativeControl=INACTIVE' in renderer)
ck("p81_renderer_allowlist_requires_no_exploitability", 'currentExploitabilityProven=false; independentReplay=false' in renderer)
ck("p81_renderer_only_bypasses_address_filter_for_closed_row", 'hasClosedCurrentDeploymentQuorum' in renderer and 'EVM_ADDRESS_PATTERN' in renderer)
ck("p81_pdf_sanitizer_closed_current_allowlist", 'currentDeployment=0x' in pdf and 'negativeControl=INACTIVE' in pdf)
ck("p81_pdf_sanitizer_freeform_falls_to_masking", 'return maskCustomerFacingPii(line)' in pdf)

# Runtime regression proof shape and zero-fake-credit assertions.
for token in [
    'p81_one_transport_failure_tolerated_with_three_quorum',
    'p81_two_transport_failures_withhold_quorum',
    'p81_chain_semantic_outlier_fails_closed',
    'p81_head_skew_fails_closed',
    'p81_runtime_conflict_fails_closed',
    'p81_negative_control_provider_conflict_fails_closed',
    'p81_public_current_rejects_private_dns_resolution',
    'p81_injected_transport_can_never_earn_current_fact',
    'p81_claim_ledger_current_configuration_claim_present',
    'p81_projection_preserves_current_configuration_finding',
    'p81_claim_ledger_rejects_local_fixture_as_current_fact',
    'p81_pdf_safety_rejects_truncated_current_quorum_row',
]:
    ck(f"p81_runtime_contains_{token}", token in runtime)
ck("p81_runtime_marks_synthetic_propagation_only", 'Synthetic propagation-only proof' in runtime and 'never earns product or FINAL credit' in runtime)
ck("p81_runtime_no_live_external_rpc_claim", 'liveExternalRpcExecuted: false' in runtime)
ck("p81_runtime_zero_customer_final", 'customerFinal: "0/20"' in runtime)
ck("p81_runtime_zero_pdf_final", 'auditFinalPdf: "0/3"' in runtime)
ck("p81_runtime_current_exploitability_false", 'currentExploitabilityProven: false' in runtime)
ck("p81_runtime_independent_replay_false", 'independentReplayProven: false' in runtime)

runtime_receipt: dict[str, object] = {}
fixture_receipt: dict[str, object] = {}
try:
    runtime_receipt = json.loads(FILES["runtime_receipt"].read_text(encoding="utf-8"))
except Exception:
    runtime_receipt = {}
try:
    fixture_receipt = json.loads(FILES["fixture_receipt"].read_text(encoding="utf-8"))
except Exception:
    fixture_receipt = {}
ck("p81_runtime_receipt_pass_bounded", runtime_receipt.get("status") == "PASS_BOUNDED_LOCAL_DETERMINISTIC_CONTROL_PLANE")
ck("p81_runtime_receipt_133_checks", runtime_receipt.get("checkCount") == 133 and len(runtime_receipt.get("checks", [])) == 133)
ck("p81_runtime_receipt_all_pass", all(row.get("status") == "PASS" for row in runtime_receipt.get("checks", [])))
safety = runtime_receipt.get("safetyBoundary", {}) if isinstance(runtime_receipt, dict) else {}
ck("p81_runtime_receipt_no_transactions", safety.get("transactionMethodsUsed") is False)
ck("p81_runtime_receipt_no_live_rpc", safety.get("liveExternalRpcExecuted") is False)
ck("p81_runtime_receipt_no_current_fact_credit", safety.get("customerCurrentFactCredit") is False)
ck("p81_runtime_receipt_no_exploitability", safety.get("currentExploitabilityProven") is False)
ck("p81_runtime_receipt_no_replay", safety.get("independentReplayProven") is False)
ck("p81_runtime_receipt_zero_final", safety.get("customerFinal") == "0/20" and safety.get("auditFinalPdf") == "0/3")
ck("p81_fixture_receipt_local_execution", fixture_receipt.get("executionClass") == "LOCAL_DETERMINISTIC_FIXTURE")
ck("p81_fixture_receipt_injected_transport", fixture_receipt.get("transportClass") == "INJECTED_TEST_TRANSPORT")
ck("p81_fixture_receipt_no_current_fact", fixture_receipt.get("customerCurrentRuntimeFactEligible") is False and fixture_receipt.get("customerTrustedForwarderFactEligible") is False)
ck("p81_fixture_receipt_no_final", fixture_receipt.get("customerFinalEligible") is False and fixture_receipt.get("auditFinalPdfEligible") is False)
ck("p81_fixture_receipt_no_risk_floor", fixture_receipt.get("riskScoreFloor") is None)
ck("p81_fixture_receipt_no_raw_payload_rights", ((fixture_receipt.get("rights") or {}).get("rawProviderPayloadRedistributed") is False and (fixture_receipt.get("rights") or {}).get("rawRuntimeBytecodeRedistributed") is False))

failed = [row for row in checks if row["status"] == "FAIL"]
receipt = {
    "schemaVersion": "velmere.p81.current-deployment-readonly-quorum-static.v1",
    "status": "FAIL" if failed else "PASS",
    "classification": "DEFENSIVE_CURRENT_SOURCE_CONTROL_PLANE_SHAPE_ONLY",
    "checkCount": len(checks),
    "checks": checks,
    "zeroFakeCredit": {
        "liveExternalRpcExecution": "WITHHELD",
        "currentDeploymentState": "WITHHELD",
        "currentTrustedForwarderState": "WITHHELD",
        "currentExploitability": "WITHHELD",
        "independentReplay": "WITHHELD",
        "sourceRights": "WITHHELD",
        "exactWindows": "WITHHELD",
        "customerFinal": "0/20",
        "auditFinalPdf": "0/3",
        "note": "Static source-shape proof only. It does not establish current BSC state, exploitability, provider independence, rights/currentness, exact Windows, Customer FINAL, or Audit FINAL PDF.",
    },
}
out = ROOT / "receipts/p81/P81_CURRENT_DEPLOYMENT_READONLY_QUORUM_STATIC.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({
    "status": receipt["status"],
    "checkCount": len(checks),
    "passed": len(checks) - len(failed),
    "failed": [row["id"] for row in failed],
}, indent=2, ensure_ascii=False))
raise SystemExit(1 if failed else 0)
