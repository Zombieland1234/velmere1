#!/usr/bin/env node
import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";

import { canonicalJson } from "../../lib/security/canonical-json.ts";
import { sha256Digest } from "../../lib/security/cryptographic-digest.ts";
import {
  P82_CURRENT_DEPLOYMENT_READONLY_QUORUM_ID,
  P82_IS_TRUSTED_FORWARDER_SELECTOR,
  P82_READONLY_RPC_METHODS,
  collectP82CurrentDeploymentReadonlyQuorum,
  verifyP82CurrentDeploymentReadonlyQuorumReceipt,
} from "../../lib/security/audit-current-deployment-readonly-quorum-v2.ts";
import {
  P81_CURRENT_DEPLOYMENT_READONLY_QUORUM_ID,
  collectP81CurrentDeploymentReadonlyQuorum,
  verifyP81CurrentDeploymentReadonlyQuorumReceipt,
} from "../../lib/security/audit-current-deployment-readonly-quorum.ts";
import { buildPass2574AuditClaimLedgerReport } from "../../lib/security/audit-claim-ledger.ts";
import { buildPass2578AuditReportAssemblerReport } from "../../lib/security/audit-report-assembler.ts";
import { projectAuditReportForCustomer } from "../../lib/security/audit-report-customer-projection.ts";
import { isCustomerSafeProAuditPdfLine } from "../../lib/security/pro-audit-pdf/customer-safe-renderer.ts";

const GENERATED_AT = "2026-08-19T22:30:00.000Z";
const TARGET = "0x0dabdc92af35615443412a336344c591faed3f90";
const IMPLEMENTATION = "0xae5be6d490c47c7417e91b7911d3a0ce3553438d";
const FORWARDER = "0x7c4717039b89d5859c4fbb85edb19a6e2ce61171";
const NEGATIVE = "0x0000000000000000000000000000000000000001";
const RUNTIME = "0x363d3d373d3d3d363d73ae5be6d490c47c7417e91b7911d3a0ce3553438d5af43d82803e903d91602b57fd5bf300";
const IMPLEMENTATION_CODE = `0x${"60016000556002600055".repeat(16)}`;
const SIGNING = { keyId: "p82-local-runtime", secret: "p82-local-runtime-signing-secret-0123456789abcdef" };
const BLOCK_HASH = `0x${"1".repeat(64)}`;
const PARENT_HASH = `0x${"2".repeat(64)}`;
const STATE_ROOT = `0x${"3".repeat(64)}`;
const BLOCK_TIMESTAMP = Math.floor(Date.parse(GENERATED_AT) / 1_000) - 60;
const HEADS = { p1: 40_000_100, p2: 40_000_099, p3: 40_000_101, p4: 40_000_100, p5: 40_000_100 };
const SNAPSHOT_BLOCK = Math.min(...Object.values(HEADS)) - 64;
const SNAPSHOT_TAG = `0x${SNAPSHOT_BLOCK.toString(16)}`;
const TRUE_BOOL = `0x${"0".repeat(63)}1`;
const FALSE_BOOL = `0x${"0".repeat(64)}`;

const checks = [];
function check(id, condition, detail = undefined) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P82 runtime check failed: ${id}${detail === undefined ? "" : ` (${JSON.stringify(detail)})`}`);
}

function clone(value) {
  return structuredClone(value);
}

function rights(status = "LOCAL_FIXTURE_ONLY", overrides = {}) {
  return {
    status,
    evidenceSha256: `sha256:${"a".repeat(64)}`,
    termsCheckedAt: "2026-08-01T00:00:00.000Z",
    reverifyBy: "2026-12-31T00:00:00.000Z",
    derivedUseAllowed: status !== "LOCAL_FIXTURE_ONLY" ? true : false,
    displayAllowed: status !== "LOCAL_FIXTURE_ONLY" ? true : false,
    attributionRequired: false,
    ...overrides,
  };
}

function provider(providerId, rpcUrl = `http://127.0.0.1:${18_540 + Number(providerId.slice(1))}/${providerId}`, providerRights = rights()) {
  return {
    providerId,
    operatorId: `operator-${providerId}`,
    providerFamily: `family-${providerId}`,
    correlationGroup: `correlation-${providerId}`,
    rpcUrl,
    rights: providerRights,
  };
}

function baseInput(executionClass = "LOCAL_DETERMINISTIC_FIXTURE") {
  return {
    schemaVersion: "velmere.p82.current-deployment-readonly-quorum-input.v2",
    executionClass,
    caseRef: "AUD-P82-DOMINOTT-READONLY-QUORUM",
    chainId: "56",
    chainName: "BSC",
    targetAddress: TARGET,
    trustedForwarderAddress: FORWARDER,
    negativeControlAddress: NEGATIVE,
    historicalBinding: {
      recordId: "p79-bsc-dominott-34141659",
      runtimeBytecodeSha256: sha256Digest(RUNTIME),
      implementationAddress: IMPLEMENTATION,
    },
    confirmationDepth: 64,
    maxHeadSkew: 8,
    minimumProviderCount: 3,
    providers: [provider("p1"), provider("p2"), provider("p3"), provider("p4")],
  };
}

function baseBehaviors() {
  return Object.fromEntries(Object.entries(HEADS).map(([id, head]) => [id, {
    chainId: "0x38",
    head,
    blockNumber: SNAPSHOT_BLOCK,
    blockHash: BLOCK_HASH,
    parentHash: PARENT_HASH,
    stateRoot: STATE_ROOT,
    timestamp: BLOCK_TIMESTAMP,
    runtimeCode: RUNTIME,
    implementationCode: IMPLEMENTATION_CODE,
    forwarderResult: TRUE_BOOL,
    negativeResult: FALSE_BOOL,
    throwMethods: new Set(),
    rpcErrorMethods: new Set(),
    wrongIdMethods: new Set(),
    invalidContentTypeMethods: new Set(),
    oversizeMethods: new Set(),
    contentEncodingMethods: new Set(),
    throwImplementationCode: false,
  }]));
}

function providerIdFromUrl(url) {
  const parsed = new URL(String(url));
  const pathId = parsed.pathname.split("/").filter(Boolean).at(-1);
  if (pathId && /^p[1-8]$/.test(pathId)) return pathId;
  const hostId = /^rpc([1-8])\./.exec(parsed.hostname)?.[1];
  if (hostId) return `p${hostId}`;
  throw new Error(`unknown_mock_provider:${parsed.hostname}${parsed.pathname}`);
}

function responseEnvelope(id, result, headers = {}) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}

function makeFetch(behaviors, calls) {
  return async (input, init = {}) => {
    const providerId = providerIdFromUrl(input);
    const behavior = behaviors[providerId];
    const request = JSON.parse(String(init.body ?? "{}"));
    calls.push({ providerId, url: String(input), method: request.method, params: request.params, redirect: init.redirect, cache: init.cache });
    const requestAddress = String(request.params?.[0] ?? "").toLowerCase();
    if (request.method === "eth_getCode" && requestAddress === IMPLEMENTATION && behavior.throwImplementationCode) {
      throw new Error("simulated implementation transport failure with https://secret.invalid/token");
    }
    if (behavior.throwMethods.has(request.method)) throw new Error("simulated transport failure with https://secret.invalid/token");
    if (behavior.oversizeMethods.has(request.method)) {
      return responseEnvelope(request.id, `0x${"ab".repeat(200_000)}`);
    }
    if (behavior.invalidContentTypeMethods.has(request.method)) {
      return new Response("not-json", { status: 200, headers: { "content-type": "text/plain" } });
    }
    if (behavior.rpcErrorMethods.has(request.method)) {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { code: -32000, message: "execution reverted" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    const responseId = behavior.wrongIdMethods.has(request.method) ? `${request.id}-wrong` : request.id;
    let result;
    if (request.method === "eth_chainId") result = behavior.chainId;
    else if (request.method === "eth_blockNumber") result = `0x${behavior.head.toString(16)}`;
    else if (request.method === "eth_getBlockByNumber") {
      result = {
        number: `0x${behavior.blockNumber.toString(16)}`,
        hash: behavior.blockHash,
        parentHash: behavior.parentHash,
        stateRoot: behavior.stateRoot,
        timestamp: `0x${behavior.timestamp.toString(16)}`,
      };
    } else if (request.method === "eth_getCode") {
      const address = String(request.params?.[0] ?? "").toLowerCase();
      result = address === TARGET ? behavior.runtimeCode : address === IMPLEMENTATION ? behavior.implementationCode : "0x";
    } else if (request.method === "eth_call") {
      const data = String(request.params?.[0]?.data ?? "").toLowerCase();
      const argument = `0x${data.slice(-40)}`;
      result = argument === FORWARDER ? behavior.forwarderResult : argument === NEGATIVE ? behavior.negativeResult : FALSE_BOOL;
    } else throw new Error(`unexpected_method:${request.method}`);
    return responseEnvelope(
      responseId,
      result,
      behavior.contentEncodingMethods.has(request.method) ? { "content-encoding": "gzip" } : {},
    );
  };
}

async function execute(input = baseInput(), mutateBehaviors = () => {}, extraOptions = {}) {
  const behaviors = baseBehaviors();
  mutateBehaviors(behaviors);
  const calls = [];
  const receipt = await collectP82CurrentDeploymentReadonlyQuorum(input, {
    fetchImpl: makeFetch(behaviors, calls),
    resolveHostImpl: async (hostname) => {
      const match = /^rpc([1-8])\./.exec(hostname);
      const suffix = match ? Number(match[1]) : 9;
      return [{ address: `93.184.216.${suffix}`, family: 4 }];
    },
    timeoutMs: 1_500,
    maxResponseBytes: 256 * 1024,
    now: () => new Date(GENERATED_AT),
    signing: SIGNING,
    ...extraOptions,
  });
  return { receipt, calls, behaviors };
}

function resign(receipt, mutate) {
  const next = clone(receipt);
  mutate(next);
  delete next.receiptDigest;
  delete next.signature;
  next.receiptDigest = sha256Digest(canonicalJson(next));
  next.signature = {
    keyId: SIGNING.keyId,
    hmacSha256: `hmac-sha256:${createHmac("sha256", SIGNING.secret).update(next.receiptDigest).digest("hex")}`,
  };
  return next;
}

async function main() {
  const positive = await execute();
  const receipt = positive.receipt;

  // Version boundary: the frozen P81 v1 engine remains independently verifiable, but
  // production customer propagation accepts only P82 v2 receipts after this migration.
  const legacyInput = baseInput();
  legacyInput.schemaVersion = "velmere.p81.current-deployment-readonly-quorum-input.v1";
  const legacyBehaviors = baseBehaviors();
  const legacyCalls = [];
  const legacyReceipt = await collectP81CurrentDeploymentReadonlyQuorum(legacyInput, {
    fetchImpl: makeFetch(legacyBehaviors, legacyCalls),
    resolveHostImpl: async () => [{ address: "93.184.216.1", family: 4 }],
    timeoutMs: 1_500,
    maxResponseBytes: 256 * 1024,
    now: () => new Date(GENERATED_AT),
    signing: SIGNING,
  });
  check("p82_frozen_p81_engine_id_retained", legacyReceipt.engineId === P81_CURRENT_DEPLOYMENT_READONLY_QUORUM_ID);
  check("p82_frozen_p81_receipt_still_verifies_with_p81_verifier", verifyP81CurrentDeploymentReadonlyQuorumReceipt(legacyReceipt, SIGNING));
  check("p82_p81_receipt_rejected_by_p82_verifier", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(legacyReceipt, SIGNING));
  process.env.VELMERE_CURRENT_DEPLOYMENT_QUORUM_KEY_ID_CURRENT = SIGNING.keyId;
  process.env.VELMERE_CURRENT_DEPLOYMENT_QUORUM_SECRET_CURRENT = SIGNING.secret;
  const legacyClaimLedger = buildPass2574AuditClaimLedgerReport({
    chain: "bsc",
    contractAddress: TARGET,
    locale: "en",
    currentDeploymentQuorumEvidence: legacyReceipt,
  });
  check("p82_production_claim_ledger_rejects_legacy_p81_current_fact", !legacyClaimLedger.claims.some((claim) => claim.findingKind === "current_deployment_configuration"));
  check("p82_engine_id", receipt.engineId === P82_CURRENT_DEPLOYMENT_READONLY_QUORUM_ID);
  check("p82_positive_receipt_verifies", verifyP82CurrentDeploymentReadonlyQuorumReceipt(receipt, SIGNING));
  check("p82_positive_full_technical_classification", receipt.classification === "PASS_EXACT_BLOCK_RUNTIME_PROXY_FORWARDER_QUORUM", { classification: receipt.classification, blockers: receipt.blockers });
  check("p82_positive_exact_block_consensus", receipt.proof.exactBlockConsensusProven);
  check("p82_positive_runtime_proven", receipt.proof.currentRuntimeStateProven);
  check("p82_positive_proxy_proven", receipt.proof.currentProxyImplementationProven);
  check("p82_positive_forwarder_state_proven", receipt.proof.currentTrustedForwarderStateProven);
  check("p82_positive_current_exploitability_not_proven", receipt.proof.currentExploitabilityProven === false);
  check("p82_positive_independent_replay_not_proven", receipt.proof.independentReplayProven === false);
  check("p82_positive_customer_final_false", receipt.customerFinalEligible === false && receipt.auditFinalPdfEligible === false && receipt.promotionAllowed === false);
  check("p82_positive_no_risk_floor", receipt.riskScoreFloor === null);
  check("p82_positive_snapshot_block_exact", receipt.snapshot.blockNumber === SNAPSHOT_BLOCK, receipt.snapshot.blockNumber);
  check("p82_positive_snapshot_hash_exact", receipt.snapshot.blockHash === BLOCK_HASH);
  check("p82_positive_state_root_exact", receipt.snapshot.stateRoot === STATE_ROOT);
  check("p82_positive_head_skew", receipt.snapshot.headSkew === 2, receipt.snapshot.headSkew);
  check("p82_positive_runtime_digest", receipt.deployment.runtimeBytecodeSha256 === sha256Digest(RUNTIME));
  check("p82_positive_historical_runtime_match", receipt.deployment.historicalRuntimeRelation === "MATCHES_PINNED_HISTORICAL_RUNTIME");
  check("p82_positive_proxy_kind", receipt.deployment.proxyKind === "EIP_1167_COMPATIBLE_MINIMAL_PROXY");
  check("p82_positive_implementation_exact", receipt.deployment.implementationAddress === IMPLEMENTATION);
  check("p82_positive_implementation_digest", receipt.deployment.implementationBytecodeSha256 === sha256Digest(IMPLEMENTATION_CODE));
  check("p82_positive_historical_implementation_match", receipt.deployment.historicalImplementationRelation === "MATCHES_PINNED_HISTORICAL_IMPLEMENTATION");
  check("p82_positive_forwarder_active", receipt.trustedForwarder.state === "ACTIVE");
  check("p82_positive_negative_control_inactive", receipt.trustedForwarder.negativeControlState === "INACTIVE");
  check("p82_positive_selector_exact", receipt.trustedForwarder.selector === P82_IS_TRUSTED_FORWARDER_SELECTOR);
  check("p82_positive_methods_exact", canonicalJson([...receipt.rpc.methods].sort()) === canonicalJson([...P82_READONLY_RPC_METHODS].sort()), receipt.rpc.methods);
  check("p82_positive_method_count", receipt.rpc.methodCount === 28, receipt.rpc.methodCount);
  check("p82_positive_all_four_provider_rows", receipt.providers.length === 4 && receipt.providers.every((row) => row.technicalStatus === "PASS"));
  check("p82_positive_declared_diversity", receipt.providerDiversity.operatorCount === 4 && receipt.providerDiversity.familyCount === 4 && receipt.providerDiversity.correlationGroupCount === 4);
  check("p82_positive_independence_not_overclaimed", receipt.providerDiversity.independenceBoundary === "DECLARED_CONFIGURATION_DIVERSITY_NOT_NETWORK_INDEPENDENCE_PROOF");
  check("p82_positive_fixture_not_customer_current_fact", !receipt.customerCurrentRuntimeFactEligible && !receipt.customerTrustedForwarderFactEligible);
  check("p82_positive_fixture_rights_not_eligible", !receipt.rights.customerFactRightsEligible);
  check("p82_positive_no_raw_redistribution", !receipt.rights.rawProviderPayloadRedistributed && !receipt.rights.rawRuntimeBytecodeRedistributed && !receipt.rights.rawImplementationBytecodeRedistributed);
  const serialized = JSON.stringify(receipt);
  check("p82_positive_no_rpc_url_in_receipt", !serialized.includes("rpcUrl") && !serialized.includes("127.0.0.1"));
  check("p82_positive_no_raw_target_runtime_in_receipt", !serialized.includes(RUNTIME));
  check("p82_positive_no_raw_implementation_runtime_in_receipt", !serialized.includes(IMPLEMENTATION_CODE));
  check("p82_positive_raw_response_root_bound", /^sha256:[a-f0-9]{64}$/.test(receipt.rpc.rawResponseRootSha256 ?? ""));
  check("p82_positive_request_root_bound", /^sha256:[a-f0-9]{64}$/.test(receipt.rpc.requestRootSha256 ?? ""));
  check("p82_positive_exact_block_used_for_all_state_calls", positive.calls.filter((row) => ["eth_getBlockByNumber", "eth_getCode", "eth_call"].includes(row.method)).every((row) => row.params.at(-1) === SNAPSHOT_TAG || (row.method === "eth_getBlockByNumber" && row.params[0] === SNAPSHOT_TAG)), positive.calls);
  check("p82_positive_redirects_forbidden", positive.calls.every((row) => row.redirect === "error"));
  check("p82_positive_cache_disabled", positive.calls.every((row) => row.cache === "no-store"));
  check("p82_positive_no_transaction_methods", positive.calls.every((row) => !String(row.method).startsWith("eth_send") && !String(row.method).startsWith("personal_") && !String(row.method).startsWith("debug_") && !String(row.method).startsWith("trace_")));
  const callRows = positive.calls.filter((row) => row.method === "eth_call");
  check("p82_positive_call_selector_and_abi_width", callRows.length === 8 && callRows.every((row) => {
    const data = String(row.params?.[0]?.data ?? "");
    return data.startsWith(P82_IS_TRUSTED_FORWARDER_SELECTOR) && data.length === 74;
  }));

  const tamperedHash = clone(receipt);
  tamperedHash.snapshot.blockHash = `0x${"9".repeat(64)}`;
  check("p82_tampered_receipt_digest_rejected", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(tamperedHash, SIGNING));
  const resignedHashWithoutHmac = clone(tamperedHash);
  delete resignedHashWithoutHmac.receiptDigest;
  delete resignedHashWithoutHmac.signature;
  resignedHashWithoutHmac.receiptDigest = sha256Digest(canonicalJson(resignedHashWithoutHmac));
  resignedHashWithoutHmac.signature = receipt.signature;
  check("p82_recomputed_digest_without_hmac_rejected", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(resignedHashWithoutHmac, SIGNING));
  check("p82_wrong_secret_rejected", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(receipt, { keyId: SIGNING.keyId, secret: `${SIGNING.secret}-wrong` }));
  check("p82_wrong_key_id_rejected", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(receipt, { keyId: "other-key", secret: SIGNING.secret }));
  check("p82_raw_endpoint_field_rejected_even_resigned", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(resign(receipt, (row) => { row.providers[0].rpcUrl = "https://secret.invalid/token"; }), SIGNING));
  check("p82_raw_runtime_field_rejected_even_resigned", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(resign(receipt, (row) => { row.deployment.runtimeBytecode = RUNTIME; }), SIGNING));
  check("p82_long_raw_hex_rejected_even_resigned", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(resign(receipt, (row) => { row.blockers.push(`0x${"aa".repeat(80)}`); }), SIGNING));
  check("p82_exploitability_promotion_rejected_even_resigned", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(resign(receipt, (row) => { row.proof.currentExploitabilityProven = true; }), SIGNING));
  check("p82_customer_final_promotion_rejected_even_resigned", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(resign(receipt, (row) => { row.customerFinalEligible = true; }), SIGNING));
  check("p82_fixture_customer_fact_promotion_rejected_even_resigned", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(resign(receipt, (row) => { row.customerCurrentRuntimeFactEligible = true; }), SIGNING));
  check("p82_transaction_method_injection_rejected_even_resigned", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(resign(receipt, (row) => { row.rpc.methods.push("eth_sendRawTransaction"); }), SIGNING));
  check("p82_negative_control_proof_removal_rejected_even_resigned", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(resign(receipt, (row) => { row.trustedForwarder.negativeControlState = "WITHHELD"; }), SIGNING));

  const staleTimestamp = Math.floor(Date.parse(GENERATED_AT) / 1_000) - (15 * 60 + 1);
  const staleUnanimous = await execute(baseInput(), (behaviors) => {
    Object.values(behaviors).forEach((behavior) => { behavior.timestamp = staleTimestamp; });
  });
  check("p82_unanimous_stale_snapshot_fails_closed", staleUnanimous.receipt.classification === "WITHHELD_PROVIDER_QUORUM"
    && staleUnanimous.receipt.blockers.includes("p82_current_deployment_snapshot_stale")
    && !staleUnanimous.receipt.proof.exactBlockConsensusProven, staleUnanimous.receipt);
  const futureTimestamp = Math.floor(Date.parse(GENERATED_AT) / 1_000) + 61;
  const futureUnanimous = await execute(baseInput(), (behaviors) => {
    Object.values(behaviors).forEach((behavior) => { behavior.timestamp = futureTimestamp; });
  });
  check("p82_unanimous_future_snapshot_fails_closed", futureUnanimous.receipt.classification === "WITHHELD_PROVIDER_QUORUM"
    && futureUnanimous.receipt.blockers.includes("p82_current_deployment_snapshot_from_future")
    && !futureUnanimous.receipt.proof.exactBlockConsensusProven, futureUnanimous.receipt);
  const mixedFreshStale = await execute(baseInput(), (behaviors) => {
    behaviors.p3.timestamp = staleTimestamp;
    behaviors.p4.timestamp = staleTimestamp;
  });
  check("p82_mixed_fresh_stale_snapshot_conflict_fails_closed", mixedFreshStale.receipt.classification === "WITHHELD_PROVIDER_CONFLICT"
    && !mixedFreshStale.receipt.proof.exactBlockConsensusProven, mixedFreshStale.receipt);
  const generatedAtSpoof = resign(receipt, (row) => {
    row.generatedAt = new Date(Date.parse(GENERATED_AT) + 16 * 60 * 1_000).toISOString();
  });
  check("p82_resigned_generated_at_spoof_rejected", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(generatedAtSpoof, SIGNING));
  const resignedFutureSnapshot = resign(receipt, (row) => {
    row.snapshot.timestamp = futureTimestamp;
    row.snapshot.timestampIso = new Date(futureTimestamp * 1_000).toISOString();
  });
  check("p82_resigned_future_snapshot_rejected", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(resignedFutureSnapshot, SIGNING));

  const oneTransportFailure = await execute(baseInput(), (behaviors) => behaviors.p4.throwMethods.add("eth_getBlockByNumber"));
  check("p82_one_transport_failure_tolerated_with_three_quorum", oneTransportFailure.receipt.classification === "PASS_EXACT_BLOCK_RUNTIME_PROXY_FORWARDER_QUORUM");
  check("p82_one_transport_failure_marks_provider_failed", oneTransportFailure.receipt.providers.filter((row) => row.technicalStatus === "FAILED").length === 1);
  check("p82_one_transport_failure_no_endpoint_leak", !JSON.stringify(oneTransportFailure.receipt).includes("secret.invalid"));
  check("p82_one_transport_failure_receipt_verifies", verifyP82CurrentDeploymentReadonlyQuorumReceipt(oneTransportFailure.receipt, SIGNING));

  const twoTransportFailures = await execute(baseInput(), (behaviors) => {
    behaviors.p3.throwMethods.add("eth_getBlockByNumber");
    behaviors.p4.throwMethods.add("eth_getBlockByNumber");
  });
  check("p82_two_transport_failures_withhold_quorum", twoTransportFailures.receipt.classification === "WITHHELD_PROVIDER_QUORUM");
  check("p82_two_transport_failures_no_runtime_proof", !twoTransportFailures.receipt.proof.currentRuntimeStateProven);

  const wrongChain = await execute(baseInput(), (behaviors) => { behaviors.p4.chainId = "0x1"; });
  check("p82_chain_semantic_outlier_fails_closed", wrongChain.receipt.classification === "WITHHELD_PROVIDER_CONFLICT");
  check("p82_chain_semantic_outlier_not_discarded", wrongChain.receipt.blockers.includes("p82_semantic_head_conflict"));

  const headSkew = await execute(baseInput(), (behaviors) => { behaviors.p4.head += 100; });
  check("p82_head_skew_fails_closed", headSkew.receipt.classification === "WITHHELD_PROVIDER_CONFLICT" && headSkew.receipt.blockers.includes("p82_head_skew_exceeded"));

  const blockHashConflict = await execute(baseInput(), (behaviors) => { behaviors.p4.blockHash = `0x${"4".repeat(64)}`; });
  check("p82_block_hash_conflict_fails_closed", blockHashConflict.receipt.classification === "WITHHELD_PROVIDER_CONFLICT");
  const stateRootConflict = await execute(baseInput(), (behaviors) => { behaviors.p4.stateRoot = `0x${"5".repeat(64)}`; });
  check("p82_state_root_conflict_fails_closed", stateRootConflict.receipt.classification === "WITHHELD_PROVIDER_CONFLICT");
  const blockNumberMismatch = await execute(baseInput(), (behaviors) => { behaviors.p4.blockNumber += 1; });
  check("p82_exact_block_number_mismatch_fails_closed", blockNumberMismatch.receipt.classification === "WITHHELD_PROVIDER_CONFLICT");
  const runtimeConflict = await execute(baseInput(), (behaviors) => { behaviors.p4.runtimeCode = RUNTIME.replace(/00$/, "01"); });
  check("p82_runtime_conflict_fails_closed", runtimeConflict.receipt.classification === "WITHHELD_PROVIDER_CONFLICT");

  const malformedProxy = await execute(baseInput(), (behaviors) => Object.values(behaviors).forEach((row) => { row.runtimeCode = "0x6001600055"; }));
  check("p82_non_proxy_runtime_still_exactly_proven", malformedProxy.receipt.proof.currentRuntimeStateProven);
  check("p82_non_proxy_runtime_withholds_proxy", malformedProxy.receipt.classification === "PASS_EXACT_BLOCK_RUNTIME_QUORUM_PROXY_WITHHELD" && !malformedProxy.receipt.proof.currentProxyImplementationProven);
  check("p82_non_proxy_runtime_never_promotes_exploitability", malformedProxy.receipt.proof.currentExploitabilityProven === false && malformedProxy.receipt.customerFinalEligible === false);

  const implementationConflict = await execute(baseInput(), (behaviors) => { behaviors.p4.implementationCode = "0x6002600055"; });
  check("p82_implementation_conflict_fails_closed", implementationConflict.receipt.classification === "WITHHELD_PROVIDER_CONFLICT");
  const implementationMissing = await execute(baseInput(), (behaviors) => { behaviors.p4.implementationCode = "0x"; });
  check("p82_missing_implementation_provider_fails_closed", implementationMissing.receipt.classification === "WITHHELD_PROVIDER_CONFLICT");

  const forwarderInactive = await execute(baseInput(), (behaviors) => Object.values(behaviors).forEach((row) => { row.forwarderResult = FALSE_BOOL; }));
  check("p82_forwarder_inactive_is_valid_current_config_fact_class", forwarderInactive.receipt.classification === "PASS_EXACT_BLOCK_RUNTIME_PROXY_FORWARDER_QUORUM");
  check("p82_forwarder_inactive_state_exact", forwarderInactive.receipt.trustedForwarder.state === "INACTIVE" && forwarderInactive.receipt.proof.currentTrustedForwarderStateProven);
  check("p82_forwarder_inactive_no_safety_promotion", forwarderInactive.receipt.riskScoreFloor === null && forwarderInactive.receipt.proof.currentExploitabilityProven === false);

  const forwarderConflict = await execute(baseInput(), (behaviors) => { behaviors.p4.forwarderResult = FALSE_BOOL; });
  check("p82_forwarder_state_conflict_fails_closed", forwarderConflict.receipt.classification === "WITHHELD_PROVIDER_CONFLICT");
  const negativeUnexpected = await execute(baseInput(), (behaviors) => Object.values(behaviors).forEach((row) => { row.negativeResult = TRUE_BOOL; }));
  check("p82_negative_control_unexpected_active_withholds_forwarder", negativeUnexpected.receipt.classification === "PASS_EXACT_BLOCK_RUNTIME_PROXY_QUORUM_FORWARDER_WITHHELD");
  check("p82_negative_control_unexpected_active_not_state_proven", !negativeUnexpected.receipt.proof.currentTrustedForwarderStateProven && negativeUnexpected.receipt.trustedForwarder.state === "WITHHELD");
  const negativeConflict = await execute(baseInput(), (behaviors) => { behaviors.p4.negativeResult = TRUE_BOOL; });
  check("p82_negative_control_provider_conflict_fails_closed", negativeConflict.receipt.classification === "WITHHELD_PROVIDER_CONFLICT");
  const noncanonicalBool = await execute(baseInput(), (behaviors) => { behaviors.p4.forwarderResult = `0x${"0".repeat(62)}02`; });
  check("p82_noncanonical_bool_fails_closed", noncanonicalBool.receipt.classification === "WITHHELD_PROVIDER_CONFLICT");

  const rpcErrorTolerated = await execute(baseInput(), (behaviors) => behaviors.p4.rpcErrorMethods.add("eth_call"));
  check("p82_one_rpc_call_error_tolerated_only_as_failed_provider", rpcErrorTolerated.receipt.classification === "PASS_EXACT_BLOCK_RUNTIME_PROXY_FORWARDER_QUORUM" && rpcErrorTolerated.receipt.providers.find((row) => row.providerId === "p4")?.technicalStatus === "FAILED");
  const wrongIdTolerated = await execute(baseInput(), (behaviors) => behaviors.p4.wrongIdMethods.add("eth_getCode"));
  check("p82_wrong_jsonrpc_id_never_accepted_as_observation", wrongIdTolerated.receipt.providers.find((row) => row.providerId === "p4")?.technicalStatus === "FAILED");
  const invalidContentType = await execute(baseInput(), (behaviors) => behaviors.p4.invalidContentTypeMethods.add("eth_getCode"));
  check("p82_invalid_content_type_never_accepted", invalidContentType.receipt.providers.find((row) => row.providerId === "p4")?.technicalStatus === "FAILED");
  const oversized = await execute(baseInput(), (behaviors) => behaviors.p4.oversizeMethods.add("eth_getCode"));
  check("p82_oversized_rpc_response_never_accepted", oversized.receipt.providers.find((row) => row.providerId === "p4")?.technicalStatus === "FAILED");

  const duplicateProviderInput = baseInput();
  duplicateProviderInput.providers[1].providerId = duplicateProviderInput.providers[0].providerId;
  const duplicateProvider = await execute(duplicateProviderInput);
  check("p82_duplicate_provider_id_configuration_withheld", duplicateProvider.receipt.classification === "WITHHELD_CONFIGURATION" && duplicateProvider.receipt.blockers.includes("p82_duplicate_provider_id"));
  check("p82_duplicate_provider_failure_receipt_still_signed", verifyP82CurrentDeploymentReadonlyQuorumReceipt(duplicateProvider.receipt, SIGNING));

  const duplicateOperatorInput = baseInput();
  duplicateOperatorInput.providers[1].operatorId = duplicateOperatorInput.providers[0].operatorId;
  duplicateOperatorInput.providers[2].operatorId = duplicateOperatorInput.providers[0].operatorId;
  const duplicateOperator = await execute(duplicateOperatorInput);
  check("p82_insufficient_operator_diversity_withheld", duplicateOperator.receipt.classification === "WITHHELD_CONFIGURATION");
  const duplicateCorrelationInput = baseInput();
  duplicateCorrelationInput.providers[1].correlationGroup = duplicateCorrelationInput.providers[0].correlationGroup;
  duplicateCorrelationInput.providers[2].correlationGroup = duplicateCorrelationInput.providers[0].correlationGroup;
  const duplicateCorrelation = await execute(duplicateCorrelationInput);
  check("p82_insufficient_correlation_diversity_withheld", duplicateCorrelation.receipt.classification === "WITHHELD_CONFIGURATION");
  const duplicateEndpointInput = baseInput();
  duplicateEndpointInput.providers[1].rpcUrl = duplicateEndpointInput.providers[0].rpcUrl;
  const duplicateEndpoint = await execute(duplicateEndpointInput);
  check("p82_duplicate_endpoint_identity_withheld", duplicateEndpoint.receipt.classification === "WITHHELD_CONFIGURATION" && duplicateEndpoint.receipt.blockers.includes("p82_duplicate_endpoint_identity"));

  const credentialInput = baseInput();
  credentialInput.providers[0].rpcUrl = "http://user:password@127.0.0.1:18541/p1";
  const credentialBlocked = await execute(credentialInput);
  check("p82_endpoint_credentials_blocked", credentialBlocked.receipt.classification === "WITHHELD_CONFIGURATION");
  const queryInput = baseInput();
  queryInput.providers[0].rpcUrl = "http://127.0.0.1:18541/p1?apiKey=secret";
  const queryBlocked = await execute(queryInput);
  check("p82_endpoint_query_secret_blocked", queryBlocked.receipt.classification === "WITHHELD_CONFIGURATION");
  const tokenPathInput = baseInput();
  tokenPathInput.providers[0].rpcUrl = `http://127.0.0.1:18541/${"a".repeat(64)}`;
  const tokenPathBlocked = await execute(tokenPathInput);
  check("p82_endpoint_token_like_path_blocked", tokenPathBlocked.receipt.classification === "WITHHELD_CONFIGURATION");

  const publicInput = baseInput("PUBLIC_READONLY_CURRENT");
  publicInput.providers = [1, 2, 3, 4].map((index) => provider(`p${index}`, `https://rpc${index}.example.invalid/p${index}`, rights("DERIVED_USE_ONLY_ALLOWED")));
  const publicInjected = await execute(publicInput);
  check("p82_public_https_mock_technical_path_executes", publicInjected.receipt.classification === "PASS_EXACT_BLOCK_RUNTIME_PROXY_FORWARDER_QUORUM");
  check("p82_public_https_endpoint_class_bound", publicInjected.receipt.providers.every((row) => row.endpointClass === "PUBLIC_HTTPS" && /^sha256:[a-f0-9]{64}$/.test(row.resolvedAddressSetSha256 ?? "")));
  check("p82_injected_transport_can_never_earn_current_fact", !publicInjected.receipt.customerCurrentRuntimeFactEligible && !publicInjected.receipt.customerTrustedForwarderFactEligible);
  check("p82_public_mock_rights_technically_eligible", publicInjected.receipt.rights.customerFactRightsEligible);
  check("p82_public_mock_receipt_verifies", verifyP82CurrentDeploymentReadonlyQuorumReceipt(publicInjected.receipt, SIGNING));

  // Synthetic propagation-only proof: the technical public fixture is re-signed with the
  // DEFAULT_NETWORK_STACK/current-fact flags so downstream gates can be exercised. This is
  // never written as a live/current receipt and never earns product or FINAL credit.
  process.env.VELMERE_CURRENT_DEPLOYMENT_QUORUM_KEY_ID_CURRENT = SIGNING.keyId;
  process.env.VELMERE_CURRENT_DEPLOYMENT_QUORUM_SECRET_CURRENT = SIGNING.secret;
  const currentShapedPropagationReceipt = resign(publicInjected.receipt, (row) => {
    row.transportClass = "DEFAULT_NETWORK_STACK";
    row.providers.forEach((providerRow, index) => {
      providerRow.transportBinding = "PINNED_PUBLIC_ADDRESS";
      providerRow.connectedAddressSha256 = sha256Digest(`93.184.216.${index + 1}`);
    });
    row.customerCurrentRuntimeFactEligible = true;
    row.customerTrustedForwarderFactEligible = true;
  });
  check("p82_synthetic_current_shaped_receipt_verifies", verifyP82CurrentDeploymentReadonlyQuorumReceipt(currentShapedPropagationReceipt, SIGNING));
  const propagationClaimLedger = buildPass2574AuditClaimLedgerReport({
    chain: "bsc",
    contractAddress: TARGET,
    locale: "en",
    currentDeploymentQuorumEvidence: currentShapedPropagationReceipt,
  });
  const currentClaim = propagationClaimLedger.claims.find((claim) => claim.findingKind === "current_deployment_configuration");
  check("p82_claim_ledger_current_configuration_claim_present", Boolean(currentClaim));
  check("p82_claim_ledger_current_configuration_confirmed", currentClaim?.grade === "confirmed");
  check("p82_claim_ledger_current_configuration_fact_safe", currentClaim?.canShowAsFact === true);
  check("p82_claim_ledger_current_configuration_neutral", currentClaim?.adverseKind === undefined && currentClaim?.adverseRiskFloor === undefined && currentClaim?.adverseSeverity === undefined);
  check("p82_claim_ledger_current_configuration_boundary", /does not prove current exploitability/i.test(currentClaim?.customerLine ?? ""));
  check("p82_claim_ledger_current_configuration_exact_block", currentClaim?.proPdfLine.includes(`snapshotBlock=${SNAPSHOT_BLOCK}`));
  check("p82_claim_ledger_current_configuration_exact_hashes", currentClaim?.proPdfLine.includes(`blockHash=${BLOCK_HASH}`) && currentClaim?.proPdfLine.includes(`stateRoot=${STATE_ROOT}`));
  check("p82_claim_ledger_current_configuration_proxy_and_forwarder", currentClaim?.proPdfLine.includes(`implementation=${IMPLEMENTATION}`) && currentClaim?.proPdfLine.includes(`trustedForwarder=${FORWARDER}`));
  check("p82_claim_ledger_current_configuration_no_exploit_promotion", currentClaim?.proPdfLine.endsWith("currentExploitabilityProven=false; independentReplay=false"));
  check("p82_pdf_safety_accepts_closed_current_quorum_row", isCustomerSafeProAuditPdfLine(currentClaim?.proPdfLine ?? ""));
  check("p82_pdf_safety_rejects_truncated_current_quorum_row", !isCustomerSafeProAuditPdfLine(`currentDeployment=${TARGET}; snapshotBlock=${SNAPSHOT_BLOCK}; blockHash=${BLOCK_HASH}`));
  check("p82_pdf_safety_rejects_freeform_current_address", !isCustomerSafeProAuditPdfLine(`Current proxy implementation ${IMPLEMENTATION}`));
  check("p82_pdf_safety_rejects_freeform_current_block_hash", !isCustomerSafeProAuditPdfLine(`Current block hash ${BLOCK_HASH}`));

  const propagationAssembler = buildPass2578AuditReportAssemblerReport({
    chain: "bsc",
    contractAddress: TARGET,
    locale: "en",
    claimLedger: propagationClaimLedger,
  });
  const currentFinding = propagationAssembler.topFindings.find((finding) => finding.sourceFamily === "current-chain:exact-block-readonly-quorum");
  check("p82_assembler_current_configuration_finding_present", Boolean(currentFinding));
  check("p82_assembler_current_configuration_neutral_info", currentFinding?.severity === "info");
  check("p82_assembler_current_configuration_boundary", /does not prove current exploitability/i.test(currentFinding?.publicLine ?? ""));
  check("p82_assembler_current_configuration_pdf_line_preserved", currentFinding?.proLine === currentClaim?.proPdfLine);
  check("p82_assembler_current_configuration_no_risk_floor", propagationAssembler.finalVerdict.riskScore === null, propagationAssembler.finalVerdict.riskScore);

  const proProjection = projectAuditReportForCustomer({
    report: propagationAssembler,
    requestedTier: "pro",
    deliveredTier: "pro",
    manualReviewVerified: false,
  });
  const projectedCurrentFinding = proProjection.report.topFindings.find((finding) => finding.sourceFamily === "current-chain:exact-block-readonly-quorum");
  check("p82_projection_preserves_current_configuration_finding", Boolean(projectedCurrentFinding));
  check("p82_projection_preserves_current_configuration_pdf_line", projectedCurrentFinding?.proLine === currentClaim?.proPdfLine);
  check("p82_projection_preserves_current_exploitability_boundary", /does not prove current exploitability/i.test(projectedCurrentFinding?.publicLine ?? ""));
  const basicProjection = projectAuditReportForCustomer({
    report: propagationAssembler,
    requestedTier: "basic",
    deliveredTier: "basic",
    manualReviewVerified: false,
  });
  const basicCurrentFinding = basicProjection.report.topFindings.find((finding) => finding.sourceFamily === "current-chain:exact-block-readonly-quorum");
  check("p82_basic_projection_preserves_public_current_fact", Boolean(basicCurrentFinding));
  check("p82_basic_projection_hides_pro_evidence_line", basicCurrentFinding?.proLine === basicCurrentFinding?.publicLine);
  check("p82_public_propagation_excludes_raw_runtime", !JSON.stringify({ propagationClaimLedger, propagationAssembler, proProjection, basicProjection }).includes(RUNTIME));
  check("p82_public_propagation_excludes_rpc_endpoints", !JSON.stringify({ propagationClaimLedger, propagationAssembler, proProjection, basicProjection }).includes("example.invalid"));

  const tamperedPropagationReceipt = clone(currentShapedPropagationReceipt);
  tamperedPropagationReceipt.snapshot.blockHash = `0x${"9".repeat(64)}`;
  const tamperedClaimLedger = buildPass2574AuditClaimLedgerReport({
    chain: "bsc",
    contractAddress: TARGET,
    locale: "en",
    currentDeploymentQuorumEvidence: tamperedPropagationReceipt,
  });
  check("p82_claim_ledger_rejects_tampered_current_receipt", !tamperedClaimLedger.claims.some((claim) => claim.findingKind === "current_deployment_configuration"));
  const fixtureClaimLedger = buildPass2574AuditClaimLedgerReport({
    chain: "bsc",
    contractAddress: TARGET,
    locale: "en",
    currentDeploymentQuorumEvidence: receipt,
  });
  check("p82_claim_ledger_rejects_local_fixture_as_current_fact", !fixtureClaimLedger.claims.some((claim) => claim.findingKind === "current_deployment_configuration"));
  const incompleteCurrentReceipt = resign(currentShapedPropagationReceipt, (row) => {
    row.trustedForwarder.negativeControlState = "WITHHELD";
    row.proof.currentTrustedForwarderStateProven = false;
    row.customerTrustedForwarderFactEligible = false;
    row.classification = "PASS_EXACT_BLOCK_RUNTIME_QUORUM_PROXY_WITHHELD";
  });
  const incompleteClaimLedger = buildPass2574AuditClaimLedgerReport({
    chain: "bsc",
    contractAddress: TARGET,
    locale: "en",
    currentDeploymentQuorumEvidence: incompleteCurrentReceipt,
  });
  check("p82_claim_ledger_requires_complete_forwarder_and_negative_control", !incompleteClaimLedger.claims.some((claim) => claim.findingKind === "current_deployment_configuration"));

  const publicHttpInput = clone(publicInput);
  publicHttpInput.providers[0].rpcUrl = "http://rpc1.example.invalid/p1";
  const publicHttp = await execute(publicHttpInput);
  check("p82_public_current_requires_https", publicHttp.receipt.classification === "WITHHELD_CONFIGURATION");
  const publicLoopbackInput = clone(publicInput);
  publicLoopbackInput.providers[0].rpcUrl = "https://127.0.0.1/p1";
  const publicLoopback = await execute(publicLoopbackInput);
  check("p82_public_current_rejects_loopback", publicLoopback.receipt.classification === "WITHHELD_CONFIGURATION");
  const publicPrivateDns = await execute(publicInput, () => {}, { resolveHostImpl: async () => [{ address: "10.0.0.7", family: 4 }] });
  check("p82_public_current_rejects_private_dns_resolution", publicPrivateDns.receipt.classification === "WITHHELD_CONFIGURATION");
  const publicDuplicateHostInput = clone(publicInput);
  publicDuplicateHostInput.providers = publicDuplicateHostInput.providers.map((row, index) => ({ ...row, rpcUrl: `https://same.example.invalid/p${index + 1}` }));
  const publicDuplicateHost = await execute(publicDuplicateHostInput);
  check("p82_public_current_requires_hostname_diversity", publicDuplicateHost.receipt.classification === "WITHHELD_CONFIGURATION");
  const ambiguousRightsInput = clone(publicInput);
  ambiguousRightsInput.providers[0].rights = rights("AMBIGUOUS_BLOCKED", { derivedUseAllowed: false, displayAllowed: false });
  const ambiguousRights = await execute(ambiguousRightsInput);
  check("p82_ambiguous_rights_do_not_block_technical_quorum", ambiguousRights.receipt.classification === "PASS_EXACT_BLOCK_RUNTIME_PROXY_FORWARDER_QUORUM");
  check("p82_ambiguous_rights_block_customer_fact", !ambiguousRights.receipt.rights.customerFactRightsEligible && !ambiguousRights.receipt.customerCurrentRuntimeFactEligible);
  const expiredRightsInput = clone(publicInput);
  expiredRightsInput.providers[0].rights.reverifyBy = "2026-08-18T00:00:00.000Z";
  const expiredRights = await execute(expiredRightsInput);
  check("p82_expired_rights_block_customer_fact", !expiredRights.receipt.rights.allConfiguredProvidersCurrent && !expiredRights.receipt.rights.customerFactRightsEligible);


  // P82 integrity hardening: canonical historical binding cannot be caller-rewritten.
  const forgedRecordInput = baseInput();
  forgedRecordInput.historicalBinding.recordId = "p79-forged-record";
  const forgedRecord = await execute(forgedRecordInput);
  check("p82_forged_historical_record_binding_withheld", forgedRecord.receipt.classification === "WITHHELD_CONFIGURATION" && forgedRecord.receipt.blockers.includes("p82_historical_record_binding_mismatch"));
  check("p82_forged_historical_record_failure_receipt_verifies", verifyP82CurrentDeploymentReadonlyQuorumReceipt(forgedRecord.receipt, SIGNING));

  const forgedRuntimeBindingInput = baseInput();
  forgedRuntimeBindingInput.historicalBinding.runtimeBytecodeSha256 = `sha256:${"b".repeat(64)}`;
  const forgedRuntimeBinding = await execute(forgedRuntimeBindingInput);
  check("p82_forged_historical_runtime_binding_withheld", forgedRuntimeBinding.receipt.classification === "WITHHELD_CONFIGURATION" && forgedRuntimeBinding.receipt.blockers.includes("p82_historical_runtime_binding_mismatch"));

  const forgedImplementationBindingInput = baseInput();
  forgedImplementationBindingInput.historicalBinding.implementationAddress = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const forgedImplementationBinding = await execute(forgedImplementationBindingInput);
  check("p82_forged_historical_implementation_binding_withheld", forgedImplementationBinding.receipt.classification === "WITHHELD_CONFIGURATION" && forgedImplementationBinding.receipt.blockers.includes("p82_historical_implementation_binding_mismatch"));

  const forgedForwarderInput = baseInput();
  forgedForwarderInput.trustedForwarderAddress = "0xcccccccccccccccccccccccccccccccccccccccc";
  const forgedForwarder = await execute(forgedForwarderInput);
  check("p82_forged_historical_forwarder_binding_withheld", forgedForwarder.receipt.classification === "WITHHELD_CONFIGURATION" && forgedForwarder.receipt.blockers.includes("p82_historical_forwarder_binding_mismatch"));

  const negativeTargetInput = baseInput();
  negativeTargetInput.negativeControlAddress = TARGET;
  const negativeTarget = await execute(negativeTargetInput);
  check("p82_negative_control_target_forbidden", negativeTarget.receipt.classification === "WITHHELD_CONFIGURATION" && negativeTarget.receipt.blockers.includes("p82_negative_control_must_differ_from_target"));

  const negativeImplementationInput = baseInput();
  negativeImplementationInput.negativeControlAddress = IMPLEMENTATION;
  const negativeImplementation = await execute(negativeImplementationInput);
  check("p82_negative_control_implementation_forbidden", negativeImplementation.receipt.classification === "WITHHELD_CONFIGURATION" && negativeImplementation.receipt.blockers.includes("p82_negative_control_must_differ_from_implementation"));

  const negativeZeroInput = baseInput();
  negativeZeroInput.negativeControlAddress = "0x0000000000000000000000000000000000000000";
  const negativeZero = await execute(negativeZeroInput);
  check("p82_zero_negative_control_forbidden", negativeZero.receipt.classification === "WITHHELD_CONFIGURATION" && negativeZero.receipt.blockers.includes("p82_negative_control_zero_address_forbidden"));

  function fiveProviderPublicInput({ correlatedFirstThree = false } = {}) {
    const input = baseInput("PUBLIC_READONLY_CURRENT");
    input.providers = [1, 2, 3, 4, 5].map((index) => provider(`p${index}`, `https://rpc${index}.example.invalid/p${index}`, rights("DERIVED_USE_ONLY_ALLOWED")));
    if (correlatedFirstThree) {
      input.providers.slice(0, 3).forEach((row) => {
        row.operatorId = "operator-shared";
        row.providerFamily = "family-shared";
        row.correlationGroup = "correlation-shared";
      });
    }
    return input;
  }

  const correlatedHead = await execute(fiveProviderPublicInput({ correlatedFirstThree: true }), (behaviors) => {
    behaviors.p4.throwMethods.add("eth_blockNumber");
    behaviors.p5.throwMethods.add("eth_blockNumber");
  });
  check("p82_successful_head_subset_requires_operator_diversity", correlatedHead.receipt.classification === "WITHHELD_PROVIDER_QUORUM" && correlatedHead.receipt.blockers.includes("p82_head_successful_operator_diversity_insufficient"));
  check("p82_successful_head_subset_requires_family_diversity", correlatedHead.receipt.blockers.includes("p82_head_successful_provider_family_diversity_insufficient"));
  check("p82_successful_head_subset_requires_correlation_diversity", correlatedHead.receipt.blockers.includes("p82_head_successful_correlation_group_diversity_insufficient"));

  const correlatedSnapshot = await execute(fiveProviderPublicInput({ correlatedFirstThree: true }), (behaviors) => {
    behaviors.p4.throwMethods.add("eth_getBlockByNumber");
    behaviors.p5.throwMethods.add("eth_getBlockByNumber");
  });
  check("p82_successful_snapshot_subset_requires_diversity", correlatedSnapshot.receipt.classification === "WITHHELD_PROVIDER_QUORUM" && correlatedSnapshot.receipt.blockers.includes("p82_snapshot_successful_operator_diversity_insufficient"));

  const correlatedProxy = await execute(fiveProviderPublicInput({ correlatedFirstThree: true }), (behaviors) => {
    behaviors.p4.throwMethods.add("eth_call");
    behaviors.p5.throwMethods.add("eth_call");
  });
  check("p82_successful_proxy_forwarder_subset_requires_diversity", correlatedProxy.receipt.classification === "WITHHELD_PROVIDER_QUORUM" && correlatedProxy.receipt.blockers.includes("p82_proxy_forwarder_successful_operator_diversity_insufficient"));
  check("p82_correlated_proxy_subset_never_customer_visible", !correlatedProxy.receipt.customerCurrentRuntimeFactEligible && !correlatedProxy.receipt.customerTrustedForwarderFactEligible);

  const correlatedImplementation = await execute(fiveProviderPublicInput({ correlatedFirstThree: true }), (behaviors) => {
    behaviors.p3.throwMethods.add("eth_call");
    behaviors.p4.throwImplementationCode = true;
    behaviors.p5.throwImplementationCode = true;
  });
  check("p82_successful_implementation_subset_requires_diversity", correlatedImplementation.receipt.classification === "WITHHELD_PROVIDER_QUORUM" && correlatedImplementation.receipt.blockers.includes("p82_implementation_successful_operator_diversity_insufficient"));
  check("p82_correlated_implementation_subset_not_proven", !correlatedImplementation.receipt.proof.currentProxyImplementationProven);

  const singleImplementation = await execute(baseInput(), (behaviors) => {
    behaviors.p2.throwImplementationCode = true;
    behaviors.p3.throwImplementationCode = true;
    behaviors.p4.throwImplementationCode = true;
  });
  check("p82_single_implementation_response_cannot_prove_proxy", !singleImplementation.receipt.proof.currentProxyImplementationProven && singleImplementation.receipt.classification === "WITHHELD_PROVIDER_QUORUM");

  const implementationQuorumForwarderWithheld = await execute(baseInput(), (behaviors) => {
    behaviors.p3.throwMethods.add("eth_call");
    behaviors.p4.throwMethods.add("eth_call");
  });
  check("p82_independent_implementation_quorum_can_be_retained_internally", implementationQuorumForwarderWithheld.receipt.classification === "PASS_EXACT_BLOCK_RUNTIME_PROXY_QUORUM_FORWARDER_WITHHELD" && implementationQuorumForwarderWithheld.receipt.proof.currentProxyImplementationProven);
  check("p82_partial_implementation_proof_never_customer_fact", !implementationQuorumForwarderWithheld.receipt.customerCurrentRuntimeFactEligible && !implementationQuorumForwarderWithheld.receipt.customerTrustedForwarderFactEligible);

  const explicitCaller = await execute();
  check("p82_eth_call_has_explicit_zero_caller_context", explicitCaller.calls.filter((row) => row.method === "eth_call").every((row) => row.params?.[0]?.from === "0x0000000000000000000000000000000000000000"));

  const encodedResponses = await execute(baseInput(), (behaviors) => {
    Object.values(behaviors).forEach((row) => row.contentEncodingMethods.add("eth_getBlockByNumber"));
  });
  check("p82_non_identity_content_encoding_fails_closed", encodedResponses.receipt.classification === "WITHHELD_PROVIDER_QUORUM" && encodedResponses.receipt.providers.every((row) => row.blockerCodes.includes("p82_snapshot_rpc_content_encoding_invalid")));

  const publicPortInput = fiveProviderPublicInput();
  publicPortInput.providers[0].rpcUrl = "https://rpc1.example.invalid:8443/p1";
  const publicPort = await execute(publicPortInput);
  check("p82_public_custom_port_rejected", publicPort.receipt.classification === "WITHHELD_CONFIGURATION" && publicPort.receipt.blockers.some((code) => code.startsWith("p82_current_endpoint_requires_dns_hostname_https_443")));

  const publicIpLiteralInput = fiveProviderPublicInput();
  publicIpLiteralInput.providers[0].rpcUrl = "https://93.184.216.1/p1";
  const publicIpLiteral = await execute(publicIpLiteralInput);
  check("p82_public_ip_literal_endpoint_rejected", publicIpLiteral.receipt.classification === "WITHHELD_CONFIGURATION" && publicIpLiteral.receipt.blockers.some((code) => code.startsWith("p82_current_endpoint_requires_dns_hostname_https_443")));

  const fivePublic = await execute(fiveProviderPublicInput());
  const fiveCurrentShaped = resign(fivePublic.receipt, (row) => {
    row.transportClass = "DEFAULT_NETWORK_STACK";
    row.providers.forEach((providerRow, index) => {
      providerRow.transportBinding = "PINNED_PUBLIC_ADDRESS";
      providerRow.connectedAddressSha256 = sha256Digest(`93.184.216.${index + 1}`);
    });
    row.customerCurrentRuntimeFactEligible = true;
    row.customerTrustedForwarderFactEligible = true;
  });
  check("p82_synthetic_pinned_current_shape_verifies_for_verifier_tests", verifyP82CurrentDeploymentReadonlyQuorumReceipt(fiveCurrentShaped, SIGNING));

  const collapsedSuccessfulSubset = resign(fiveCurrentShaped, (row) => {
    row.providers.slice(0, 3).forEach((providerRow) => {
      providerRow.operatorId = "operator-shared";
      providerRow.providerFamily = "family-shared";
      providerRow.correlationGroup = "correlation-shared";
    });
    row.providers.slice(3).forEach((providerRow) => {
      providerRow.technicalStatus = "FAILED";
      providerRow.blockerCodes = ["p82_test_failed_provider"];
    });
    row.providerDiversity.operatorCount = 3;
    row.providerDiversity.familyCount = 3;
    row.providerDiversity.correlationGroupCount = 3;
  });
  check("p82_verifier_rejects_resigned_correlated_successful_subset", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(collapsedSuccessfulSubset, SIGNING));

  const unpinnedSuccessfulTransport = resign(fiveCurrentShaped, (row) => {
    row.providers[0].transportBinding = "NOT_ESTABLISHED";
    row.providers[0].connectedAddressSha256 = null;
  });
  check("p82_verifier_rejects_unpinned_successful_public_transport", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(unpinnedSuccessfulTransport, SIGNING));

  const rewrittenHistoricalRecord = resign(fiveCurrentShaped, (row) => {
    row.target.historicalRecordId = "p79-rewritten-record";
  });
  check("p82_verifier_rejects_resigned_historical_record_rewrite", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(rewrittenHistoricalRecord, SIGNING));

  const rewrittenRuntimeRelation = resign(fiveCurrentShaped, (row) => {
    row.deployment.historicalRuntimeRelation = row.deployment.historicalRuntimeRelation === "MATCHES_PINNED_HISTORICAL_RUNTIME"
      ? "DIFFERS_FROM_PINNED_HISTORICAL_RUNTIME"
      : "MATCHES_PINNED_HISTORICAL_RUNTIME";
  });
  check("p82_verifier_rejects_resigned_runtime_relation_rewrite", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(rewrittenRuntimeRelation, SIGNING));

  const rewrittenImplementationRelation = resign(fiveCurrentShaped, (row) => {
    row.deployment.historicalImplementationRelation = row.deployment.historicalImplementationRelation === "MATCHES_PINNED_HISTORICAL_IMPLEMENTATION"
      ? "DIFFERS_FROM_PINNED_HISTORICAL_IMPLEMENTATION"
      : "MATCHES_PINNED_HISTORICAL_IMPLEMENTATION";
  });
  check("p82_verifier_rejects_resigned_implementation_relation_rewrite", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(rewrittenImplementationRelation, SIGNING));

  const partialPromoted = resign(fiveCurrentShaped, (row) => {
    row.classification = "PASS_EXACT_BLOCK_RUNTIME_PROXY_QUORUM_FORWARDER_WITHHELD";
    row.proof.currentTrustedForwarderStateProven = false;
    row.trustedForwarder.state = "WITHHELD";
    row.customerCurrentRuntimeFactEligible = true;
    row.customerTrustedForwarderFactEligible = false;
  });
  check("p82_verifier_rejects_customer_fact_from_partial_classification", !verifyP82CurrentDeploymentReadonlyQuorumReceipt(partialPromoted, SIGNING));

  await mkdir("receipts/p82", { recursive: true });
  await mkdir("artifacts/p82", { recursive: true });
  const artifactReceipt = {
    schemaVersion: "velmere.p82.successful-quorum-integrity-runtime.v1",
    generatedAt: GENERATED_AT,
    status: "PASS_BOUNDED_P82_SUCCESSFUL_SUBSET_DIVERSITY_AND_PINNED_TRANSPORT",
    checkCount: checks.length,
    checks,
    exactFixture: {
      classification: receipt.classification,
      executionClass: receipt.executionClass,
      transportClass: receipt.transportClass,
      snapshotBlock: receipt.snapshot.blockNumber,
      snapshotBlockHash: receipt.snapshot.blockHash,
      runtimeBytecodeSha256: receipt.deployment.runtimeBytecodeSha256,
      implementationAddress: receipt.deployment.implementationAddress,
      implementationBytecodeSha256: receipt.deployment.implementationBytecodeSha256,
      trustedForwarderState: receipt.trustedForwarder.state,
      negativeControlState: receipt.trustedForwarder.negativeControlState,
      methodCount: receipt.rpc.methodCount,
      receiptDigest: receipt.receiptDigest,
      receiptSignatureKeyId: receipt.signature.keyId,
    },
    safetyBoundary: {
      transactionMethodsUsed: false,
      liveExternalRpcExecuted: false,
      customerCurrentFactCredit: false,
      currentExploitabilityProven: false,
      independentReplayProven: false,
      customerFinal: "0/20",
      auditFinalPdf: "0/3",
      rule: "This deterministic runtime validates P82 successful-subset diversity, canonical historical binding, partial-proof fail-closed behavior and pinned-transport receipt rules only. It does not prove current BSC state and cannot be promoted as a live/current customer fact.",
    },
  };
  await writeFile("artifacts/p82/P82_LOCAL_READONLY_QUORUM_HARDENING_FIXTURE_RECEIPT.json", `${JSON.stringify(receipt, null, 2)}\n`);
  await writeFile("receipts/p82/P82_SUCCESSFUL_QUORUM_INTEGRITY_RUNTIME.json", `${JSON.stringify(artifactReceipt, null, 2)}\n`);
  console.log(`P82 successful-quorum integrity runtime: PASS (${checks.length}/${checks.length})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
