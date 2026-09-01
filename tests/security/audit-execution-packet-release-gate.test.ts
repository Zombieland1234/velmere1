import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { P82CurrentDeploymentReadonlyQuorumReceipt } from "@/lib/security/audit-current-deployment-readonly-quorum-v2";
import {
  buildAuditContractTargetHash,
  type AuditIntakeCaseRecord,
} from "@/lib/security/audit-intake-case-vault";
import { validateAuditExecutionReleaseSnapshotBinding } from "@/lib/security/pro-audit-pdf/render-pro-audit-pdf";
import {
  AUDIT_EXECUTION_PACKET_SCHEMA,
  buildAuditExecutionMatchedInputDigest,
  buildAuditExecutionPacketReleaseGate,
  buildAuditExecutionReleaseBindingDigest,
  buildAuditExecutionReleaseSnapshotBinding,
  buildAuditSourceCandidatesDigest,
  buildBasicAuditWorkerExecutionContract,
  sealAuditExecutionPacket,
  verifyAuditExecutionPacketSignature,
  type AuditExecutionPacketDraft,
} from "@/lib/security/audit-execution-packet-release-gate";

const digest = (char: string) => `sha256:${char.repeat(64)}`;
const address = (char: string) => `0x${char.repeat(40)}`;
const packetSigning = { keyId: "audit-execution-test-key", secret: "audit-execution-test-secret-0123456789abcdef" };

const p82Receipt = {
  schemaVersion: "velmere.p82.current-deployment-readonly-quorum-receipt.v2",
  engineId: "p82-current-deployment-readonly-quorum.v2",
  generatedAt: "2026-08-21T12:00:00.000Z",
  executionClass: "PUBLIC_READONLY_CURRENT",
  transportClass: "DEFAULT_NETWORK_STACK",
  caseRef: "AUD-CASE-PRO-01",
  target: { chainId: "56", chainName: "BSC", address: address("1") },
  snapshot: {
    blockNumber: 12_345_678,
    timestamp: Math.floor(Date.parse("2026-08-21T11:59:00.000Z") / 1_000),
  },
  deployment: {
    proxyKind: "EIP_1167_COMPATIBLE_MINIMAL_PROXY",
    implementationAddress: address("2"),
  },
  proof: {
    exactBlockConsensusProven: true,
    currentRuntimeStateProven: true,
    currentProxyImplementationProven: true,
    currentTrustedForwarderStateProven: true,
  },
  rights: { customerFactRightsEligible: true },
  classification: "PASS_EXACT_BLOCK_RUNTIME_PROXY_FORWARDER_QUORUM",
  customerCurrentRuntimeFactEligible: true,
  receiptDigest: digest("a"),
} as unknown as P82CurrentDeploymentReadonlyQuorumReceipt;

function record(tier: "basic" | "pro" | "advanced"): AuditIntakeCaseRecord {
  return {
    caseId: `case-${tier}`,
    caseRef: `AUD-CASE-${tier.toUpperCase()}-01`,
    requestId: `request-${tier}-01`,
    target: {
      kind: "contract",
      canonicalTarget: address("1"),
      displayLabel: "0x111111…111111",
      targetHash: buildAuditContractTargetHash("56", address("1")),
      chainId: "56",
      chainName: "BSC",
    },
    sourceCandidates: { githubUrl: "https://github.com/velmere/audit-fixture" },
    tier,
    locale: "en",
    status: tier === "basic" ? "queued_basic_prescreen" : "queued_paid_review",
    accountId: "account-audit-test",
    ...(tier === "basic" ? {} : {
      entitlementId: `entitlement-${tier}`,
      entitlementRequired: true,
      entitlementVerified: true,
    }),
    entitlementRequired: tier !== "basic",
    entitlementVerified: tier !== "basic",
    analysisStarted: tier !== "basic",
    createdAt: "2026-08-21T11:50:00.000Z",
    updatedAt: "2026-08-21T11:55:00.000Z",
    storageMode: "memory_runtime_only",
    durable: false,
  };
}

function draft(tier: "basic" | "pro" | "advanced"): AuditExecutionPacketDraft {
  const caseRecord = record(tier);
  const scope = {
    chainId: "56",
    contractAddressOrTarget: address("1"),
    snapshotBlock: 12_345_678,
    sourceCommit: "c".repeat(40),
    sourceBundleSha256: digest("c"),
    sourceCandidatesSha256: buildAuditSourceCandidatesDigest(caseRecord.sourceCandidates),
    compiler: {
      family: "solc",
      version: "0.8.24",
      settingsSha256: digest("d"),
      artifactSha256: digest("e"),
    },
    proxy: {
      kind: "EIP_1167_COMPATIBLE_MINIMAL_PROXY" as const,
      implementationAddress: address("2"),
      bindingSha256: digest("f"),
    },
    included: ["contracts/Vault.sol", "proxy implementation", "privileged roles"],
    excluded: ["frontend", "off-chain relayer availability"],
    methodology: {
      id: "velmere-audit-methodology",
      version: "1.0.0",
      controls: ["source-identity", "compiler-binding", "static-analysis", "retest"],
      evidenceRootSha256: digest("1"),
    },
  };
  const caseBinding = {
    caseRef: caseRecord.caseRef,
    requestId: caseRecord.requestId,
    tier,
    targetKind: "contract" as const,
    targetHash: caseRecord.target.targetHash,
  };
  const canonicalInputSha256 = buildAuditExecutionMatchedInputDigest({
    caseBinding,
    scope,
    currentDeploymentReceiptDigest: p82Receipt.receiptDigest,
  });
  return {
    schemaVersion: AUDIT_EXECUTION_PACKET_SCHEMA,
    generatedAt: p82Receipt.generatedAt,
    caseBinding,
    scope,
    currentDeployment: {
      schemaVersion: "velmere.audit-execution-current-deployment-binding.v1",
      receiptDigest: p82Receipt.receiptDigest,
      receipt: tier === "pro"
        ? structuredClone(p82Receipt)
        : { ...structuredClone(p82Receipt), caseRef: caseRecord.caseRef },
    },
    remediation: {
      state: "RETESTED_CLOSED",
      findingSetSha256: digest("2"),
      originalSourceSha256: digest("3"),
      remediatedSourceSha256: digest("4"),
      retestReceiptRootSha256: digest("5"),
      openFindingCount: 0,
      closedFindingCount: 2,
    },
    matchedInputTierValue: {
      canonicalInputSha256,
      outputs: {
        basicSha256: digest("6"),
        proSha256: digest("7"),
        advancedSha256: tier === "advanced" ? digest("8") : null,
      },
      comparisons: tier === "advanced"
        ? [
            { from: "basic", to: "pro", receiptSha256: digest("9"), addedEvidenceFamilies: ["static"], addedMaterialFields: ["compiler"], addedScenarios: ["proxy"] },
            { from: "pro", to: "advanced", receiptSha256: digest("0"), addedEvidenceFamilies: ["runtime"], addedMaterialFields: ["retest"], addedScenarios: ["remediation"] },
          ]
        : [{ from: "basic", to: "pro", receiptSha256: digest("9"), addedEvidenceFamilies: ["static"], addedMaterialFields: ["compiler"], addedScenarios: ["proxy"] }],
      benchmark: {
        receiptSha256: digest("a"),
        corpusSha256: digest("b"),
        evidenceClass: "CASE_BOUND_INTERNAL",
        matchedInputCaseCount: 1,
        developmentValidationHoldoutSeparated: true,
        failureReportingComplete: true,
        cherryPickingExcluded: true,
      },
    },
  };
}

function evaluate(
  packet: unknown,
  tier: "basic" | "pro" | "advanced" = "pro",
  now = "2026-08-21T12:05:00.000Z",
  currentDeploymentReceiptValid = true,
) {
  return buildAuditExecutionPacketReleaseGate({
    packet,
    record: record(tier),
    expectedTier: tier,
    now: new Date(now),
    dependencies: {
      verifyPacketSignature: (value) => verifyAuditExecutionPacketSignature(value, packetSigning),
      verifyCurrentDeploymentReceipt: () => currentDeploymentReceiptValid,
    },
  });
}

const proPacket = sealAuditExecutionPacket(draft("pro"), packetSigning);
const pro = evaluate(proPacket);
assert.equal(pro.decision, "ALLOW_COMPLETE");
assert.equal(pro.completionAllowed, true);
assert.equal(pro.persistAllowed, true);
assert.deepEqual(pro.blockers, []);
const basicPacket = sealAuditExecutionPacket(draft("basic"), packetSigning);
const basic = evaluate(basicPacket, "basic");
assert.equal(basic.decision, "ALLOW_COMPLETE");
assert.deepEqual(basic.blockers, []);
assert.equal(validateAuditExecutionReleaseSnapshotBinding(buildAuditExecutionReleaseSnapshotBinding(basic), "basic").expectedTier, "basic");
const proReleaseBinding = buildAuditExecutionReleaseSnapshotBinding(pro);
assert.deepEqual(proReleaseBinding, {
  schemaVersion: "velmere.audit-execution-release-gate.v1",
  decision: "ALLOW_COMPLETE",
  completionAllowed: true,
  persistAllowed: true,
  expectedTier: "pro",
  caseRef: record("pro").caseRef,
  packetDigest: pro.packetDigest,
  currentDeploymentReceiptDigest: pro.currentDeploymentReceiptDigest,
  matchedInputDigest: pro.matchedInputDigest,
  releaseBindingDigest: pro.releaseBindingDigest,
});
assert.deepEqual(validateAuditExecutionReleaseSnapshotBinding(proReleaseBinding, "pro"), proReleaseBinding);
assert.throws(
  () => validateAuditExecutionReleaseSnapshotBinding({ ...proReleaseBinding, packetDigest: digest("f") }, "pro"),
  /audit_execution_release_binding_digest_mismatch/u,
);
const longCaseRef = `AUD-${"L".repeat(120)}`;
const longCaseBinding = {
  ...proReleaseBinding,
  caseRef: longCaseRef,
  releaseBindingDigest: buildAuditExecutionReleaseBindingDigest({
    expectedTier: "pro",
    caseRef: longCaseRef,
    packetDigest: proReleaseBinding.packetDigest,
    currentDeploymentReceiptDigest: proReleaseBinding.currentDeploymentReceiptDigest,
    matchedInputDigest: proReleaseBinding.matchedInputDigest,
    completionAllowed: true,
    blockers: [],
  }),
};
assert.equal(validateAuditExecutionReleaseSnapshotBinding(longCaseBinding, "pro").caseRef, longCaseRef);

const advancedPacket = sealAuditExecutionPacket(draft("advanced"), packetSigning);
const advanced = evaluate(advancedPacket, "advanced");
assert.equal(advanced.decision, "ALLOW_COMPLETE");
assert.equal(advanced.completionAllowed, true);

const missingPacket = evaluate(null);
assert.equal(missingPacket.completionAllowed, false);
assert.equal(missingPacket.persistAllowed, false);
assert.ok(missingPacket.blockers.includes("audit_execution_packet_schema_invalid"));
assert.ok(missingPacket.blockers.includes("audit_execution_packet_signature_invalid"));

const invalidP82 = evaluate(proPacket, "pro", "2026-08-21T12:05:00.000Z", false);
assert.equal(invalidP82.completionAllowed, false);
assert.ok(invalidP82.blockers.includes("audit_execution_p82_receipt_invalid"));

const signingEnvironmentKeys = [
  "VELMERE_AUDIT_EXECUTION_PACKET_KEY_ID_CURRENT",
  "VELMERE_AUDIT_EXECUTION_PACKET_SECRET_CURRENT",
  "VELMERE_AUDIT_EXECUTION_PACKET_KEY_ID_PREVIOUS",
  "VELMERE_AUDIT_EXECUTION_PACKET_SECRET_PREVIOUS",
  "VELMERE_CURRENT_DEPLOYMENT_QUORUM_KEY_ID_CURRENT",
  "VELMERE_CURRENT_DEPLOYMENT_QUORUM_SECRET_CURRENT",
  "VELMERE_CURRENT_DEPLOYMENT_QUORUM_KEY_ID_PREVIOUS",
  "VELMERE_CURRENT_DEPLOYMENT_QUORUM_SECRET_PREVIOUS",
] as const;
const savedSigningEnvironment = new Map(signingEnvironmentKeys.map((key) => [key, process.env[key]]));
try {
  signingEnvironmentKeys.forEach((key) => delete process.env[key]);
  const credentiallessProductionGate = buildAuditExecutionPacketReleaseGate({
    packet: proPacket,
    record: record("pro"),
    expectedTier: "pro",
    now: new Date("2026-08-21T12:05:00.000Z"),
  });
  assert.equal(credentiallessProductionGate.completionAllowed, false);
  assert.equal(credentiallessProductionGate.persistAllowed, false);
  assert.ok(credentiallessProductionGate.blockers.includes("audit_execution_packet_signature_invalid"));
  assert.ok(credentiallessProductionGate.blockers.includes("audit_execution_p82_receipt_invalid"));
} finally {
  savedSigningEnvironment.forEach((value, key) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
}

const wrongP82CaseDraft = draft("pro");
wrongP82CaseDraft.currentDeployment.receipt = { ...p82Receipt, caseRef: "AUD-CASE-OTHER-01" };
const wrongP82Case = evaluate(sealAuditExecutionPacket(wrongP82CaseDraft, packetSigning));
assert.equal(wrongP82Case.completionAllowed, false);
assert.ok(wrongP82Case.blockers.includes("audit_execution_case_ref_p82_mismatch"));

const wrongP82NetworkDraft = draft("pro");
wrongP82NetworkDraft.currentDeployment.receipt = {
  ...p82Receipt,
  target: { ...p82Receipt.target, chainName: "Ethereum" as "BSC" },
};
const wrongP82Network = evaluate(sealAuditExecutionPacket(wrongP82NetworkDraft, packetSigning));
assert.equal(wrongP82Network.completionAllowed, false);
assert.ok(wrongP82Network.blockers.includes("audit_execution_network_identity_p82_invalid"));

assert.notEqual(
  buildAuditContractTargetHash("1", address("1")),
  buildAuditContractTargetHash("56", address("1")),
  "the same address on Ethereum and BSC must never share target identity",
);
const legacyRecord = record("pro");
legacyRecord.target = {
  kind: "contract",
  canonicalTarget: address("1"),
  displayLabel: "legacy address-only case",
  targetHash: digest("b"),
};
const legacyChainGate = buildAuditExecutionPacketReleaseGate({
  packet: proPacket,
  record: legacyRecord,
  expectedTier: "pro",
  now: new Date("2026-08-21T12:05:00.000Z"),
  dependencies: {
    verifyPacketSignature: (value) => verifyAuditExecutionPacketSignature(value, packetSigning),
    verifyCurrentDeploymentReceipt: () => true,
  },
});
assert.equal(legacyChainGate.completionAllowed, false);
assert.ok(legacyChainGate.blockers.includes("audit_execution_target_chain_revalidation_required"));

const tampered = structuredClone(proPacket);
tampered.scope.snapshotBlock += 1;
const tamperedResult = evaluate(tampered);
assert.equal(tamperedResult.completionAllowed, false);
assert.ok(tamperedResult.blockers.includes("audit_execution_packet_signature_invalid"));

const missingScopeDraft = draft("pro");
missingScopeDraft.scope.included = [];
const missingScope = evaluate(sealAuditExecutionPacket(missingScopeDraft, packetSigning));
assert.equal(missingScope.completionAllowed, false);
assert.ok(missingScope.blockers.includes("audit_execution_scope_included_missing"));

const missingFieldCases: Array<{
  blocker: string;
  mutate: (value: AuditExecutionPacketDraft) => void;
}> = [
  {
    blocker: "audit_execution_source_identity_missing",
    mutate: (value) => {
      value.scope.sourceCommit = null;
      value.scope.sourceBundleSha256 = null;
    },
  },
  {
    blocker: "audit_execution_compiler_binding_invalid",
    mutate: (value) => { value.scope.compiler.version = ""; },
  },
  {
    blocker: "audit_execution_proxy_binding_invalid",
    mutate: (value) => { value.scope.proxy.implementationAddress = null; },
  },
  {
    blocker: "audit_execution_scope_excluded_missing",
    mutate: (value) => { value.scope.excluded = []; },
  },
  {
    blocker: "audit_execution_methodology_binding_invalid",
    mutate: (value) => { value.scope.methodology.controls = []; },
  },
];
for (const row of missingFieldCases) {
  const missingFieldDraft = draft("pro");
  row.mutate(missingFieldDraft);
  const result = evaluate(sealAuditExecutionPacket(missingFieldDraft, packetSigning));
  assert.equal(result.completionAllowed, false, row.blocker);
  assert.ok(result.blockers.includes(row.blocker), row.blocker);
}

const wrongMatchedInputDraft = draft("pro");
wrongMatchedInputDraft.matchedInputTierValue.canonicalInputSha256 = digest("f");
const wrongMatchedInput = evaluate(sealAuditExecutionPacket(wrongMatchedInputDraft, packetSigning));
assert.equal(wrongMatchedInput.completionAllowed, false);
assert.ok(wrongMatchedInput.blockers.includes("audit_execution_matched_input_digest_mismatch"));

const proWithAdvancedComparisonDraft = draft("pro");
proWithAdvancedComparisonDraft.matchedInputTierValue.comparisons.push({
  from: "pro",
  to: "advanced",
  receiptSha256: digest("0"),
  addedEvidenceFamilies: ["runtime"],
  addedMaterialFields: ["retest"],
  addedScenarios: ["remediation"],
});
const proWithAdvancedComparison = evaluate(sealAuditExecutionPacket(proWithAdvancedComparisonDraft, packetSigning));
assert.equal(proWithAdvancedComparison.completionAllowed, false);
assert.ok(proWithAdvancedComparison.blockers.includes("audit_execution_non_advanced_packet_contains_advanced_comparison"));

const stale = evaluate(proPacket, "pro", "2026-08-21T13:00:01.000Z");
assert.equal(stale.completionAllowed, false);
assert.ok(stale.blockers.includes("audit_execution_current_deployment_receipt_stale"));

const staleSnapshotDraft = draft("pro");
staleSnapshotDraft.currentDeployment.receipt.snapshot.timestamp = Math.floor(
  Date.parse("2026-08-21T11:49:59.000Z") / 1_000,
);
const staleSnapshot = evaluate(sealAuditExecutionPacket(staleSnapshotDraft, packetSigning));
assert.equal(staleSnapshot.completionAllowed, false);
assert.ok(staleSnapshot.blockers.includes("audit_execution_current_deployment_snapshot_stale"));

const futureSnapshotDraft = draft("pro");
futureSnapshotDraft.currentDeployment.receipt.snapshot.timestamp = Math.floor(
  Date.parse("2026-08-21T12:06:01.000Z") / 1_000,
);
const futureSnapshot = evaluate(sealAuditExecutionPacket(futureSnapshotDraft, packetSigning));
assert.equal(futureSnapshot.completionAllowed, false);
assert.ok(futureSnapshot.blockers.includes("audit_execution_current_deployment_snapshot_from_future"));

const openFindingDraft = draft("pro");
openFindingDraft.remediation.state = "OPEN_FINDINGS";
openFindingDraft.remediation.openFindingCount = 1;
const openFinding = evaluate(sealAuditExecutionPacket(openFindingDraft, packetSigning));
assert.equal(openFinding.completionAllowed, false);
assert.ok(openFinding.blockers.includes("audit_execution_remediation_not_closed"));

const noFindingsDraft = draft("pro");
noFindingsDraft.remediation = {
  state: "NO_FINDINGS",
  findingSetSha256: digest("2"),
  originalSourceSha256: null,
  remediatedSourceSha256: null,
  retestReceiptRootSha256: null,
  openFindingCount: 0,
  closedFindingCount: 0,
};
const noFindings = evaluate(sealAuditExecutionPacket(noFindingsDraft, packetSigning));
assert.equal(noFindings.completionAllowed, true);

const syntheticBenchmarkDraft = draft("pro");
syntheticBenchmarkDraft.matchedInputTierValue.benchmark.evidenceClass = "LOCAL_SYNTHETIC";
const syntheticBenchmark = evaluate(sealAuditExecutionPacket(syntheticBenchmarkDraft, packetSigning));
assert.equal(syntheticBenchmark.completionAllowed, false);
assert.ok(syntheticBenchmark.blockers.includes("audit_execution_case_bound_benchmark_required"));

const p82MismatchDraft = draft("pro");
p82MismatchDraft.scope.snapshotBlock += 1;
p82MismatchDraft.matchedInputTierValue.canonicalInputSha256 = buildAuditExecutionMatchedInputDigest({
  caseBinding: p82MismatchDraft.caseBinding,
  scope: p82MismatchDraft.scope,
  currentDeploymentReceiptDigest: p82MismatchDraft.currentDeployment.receiptDigest,
});
const p82Mismatch = evaluate(sealAuditExecutionPacket(p82MismatchDraft, packetSigning));
assert.equal(p82Mismatch.completionAllowed, false);
assert.ok(p82Mismatch.blockers.includes("audit_execution_snapshot_block_p82_mismatch"));

const basicContract = buildBasicAuditWorkerExecutionContract(record("basic"));
assert.equal(basicContract.claimAllowed, true);
assert.equal(basicContract.settleAllowed, true);
assert.equal(basicContract.persistAllowed, true);
assert.equal(basicContract.reason, null);
assert.throws(() => buildBasicAuditWorkerExecutionContract(record("pro")), /basic_audit_worker_contract_tier_mismatch/u);

for (const route of [
  "lib/server/lazy-route-modules/security--audit-review--pro--settle.ts",
  "lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts",
]) {
  const source = readFileSync(route, "utf8");
  const gateIndex = source.indexOf("auditExecutionRelease = buildAuditExecutionPacketReleaseGate");
  const renderIndex = source.indexOf("const exactPdfArtifact = await buildProAuditPdfSnapshotArtifact");
  const persistIndex = source.indexOf("const persisted = await persistAuditReportSnapshot");
  const completeIndex = source.indexOf("const completed = await complete");
  assert.ok(gateIndex >= 0, `${route}: shared audit execution gate is missing`);
  assert.ok(renderIndex > gateIndex, `${route}: render must occur after the release gate`);
  assert.ok(persistIndex > gateIndex, `${route}: non-durable persist must occur after the release gate`);
  assert.ok(completeIndex > gateIndex, `${route}: durable persist/complete must occur after the release gate`);
  assert.match(source, /executionReleaseBinding,/u, `${route}: immutable PDF snapshot release binding is missing`);
  assert.match(source, /audit_execution_packet_withheld/u, `${route}: failed packet must fail closed`);
}

const basicSettleSource = readFileSync("lib/server/lazy-route-modules/security--audit-review--basic--settle.ts", "utf8");
const basicGateIndex = basicSettleSource.indexOf("auditExecutionRelease = buildAuditExecutionPacketReleaseGate");
const basicPreflightIndex = basicSettleSource.indexOf("const protectedBuild = await executeAfterBasicAuditWorkerLeasePreflight");
const basicRenderIndex = basicSettleSource.indexOf("execute: () => buildProAuditPdfSnapshotArtifact({");
const basicCompleteIndex = basicSettleSource.indexOf("await completeBasicAuditWorkerLeaseWithExactPdf");
assert.ok(basicGateIndex >= 0);
assert.ok(basicPreflightIndex > basicGateIndex);
assert.ok(basicRenderIndex > basicPreflightIndex);
assert.ok(basicCompleteIndex > basicRenderIndex);
assert.match(basicSettleSource, /executionReleaseBinding,/u);
assert.match(basicSettleSource, /audit_execution_packet_withheld/u);

const pdfSource = readFileSync("lib/security/pro-audit-pdf/render-pro-audit-pdf.ts", "utf8");
assert.match(pdfSource, /auditExecutionRelease\?: AuditExecutionReleaseSnapshotBinding/u);
assert.match(pdfSource, /Execution release binding: \$\{auditExecutionRelease\.releaseBindingDigest\}/u);

console.log("Audit execution packet release gate: PASS");
