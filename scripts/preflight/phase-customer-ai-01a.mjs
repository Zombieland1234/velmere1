import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";


setGuardScope("pf.customer-ai.001");

try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const packetSource = read(
    "lib/market-integrity/vlm-brain-release-review-packet.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass215.ts");
  const reportSource = read(
    "docs/progress/PASS215_AI_BRAIN_RELEASE_REVIEW_PACKET.md",
  );
  for (const needle of [
    "buildVlmBrainReleaseReviewPacket",
    "selectedTileReleaseReviewPacket",
    'data-vlm-release-review-packet="pass215"',
    "PASS215 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.001.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS215 release packet marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainReleaseReviewPacket",
    "vlm-brain-release-review-packet-v1-pass215",
    "operator_release_packet_preview",
    "PASS215_VLM_BRAIN_RELEASE_REVIEW_PACKET_CONTRACT",
  ]) {
    if (!packetSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.001.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-release-review-packet-mis")(
        `lib/market-integrity/vlm-brain-release-review-packet.ts: missing PASS215 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS215 — AI Brain release review packet",
    ".shield-vlm-release-review-packet",
    "data-vlm-release-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.001.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-release-packet-css-marker")(
        `app/globals.css: missing PASS215 release packet CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass215ProgressDeltas",
    "PASS215_AI_BRAIN_RELEASE_REVIEW_PACKET_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.001.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass215.ts: missing PASS215 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS215 — AI Brain Release Review Packet"))
    errors.pushWithId.bind(errors, "customer-ai.001.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-release-review-packet-md-m")(
      "docs/progress/PASS215_AI_BRAIN_RELEASE_REVIEW_PACKET.md: missing PASS215 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.001.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-release-review-packet-guard-failed-value")(
    `PASS215 AI Brain release review packet guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.customer-ai.002");

// guard script marker: verify-pass215-ai-brain-release-review-packet-safety.mjs
// PASS215

// PASS216 AI Brain source truth spine guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const spineSource = read(
    "lib/market-integrity/vlm-brain-source-truth-spine.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass216.ts");
  const reportSource = read(
    "docs/progress/PASS216_AI_BRAIN_SOURCE_TRUTH_SPINE.md",
  );
  for (const needle of [
    "buildVlmBrainSourceTruthSpine",
    "selectedTileSourceTruthSpine",
    'data-vlm-source-truth-spine="pass216"',
    "PASS216 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.002.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS216 source truth spine marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainSourceTruthSpine",
    "vlm-brain-source-truth-spine-v1-pass216",
    "operator_truth_spine_preview",
    "PASS216_VLM_BRAIN_SOURCE_TRUTH_SPINE_CONTRACT",
  ]) {
    if (!spineSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.002.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-source-truth-spine-missin")(
        `lib/market-integrity/vlm-brain-source-truth-spine.ts: missing PASS216 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS216 — AI Brain source truth spine",
    ".shield-vlm-source-truth-spine",
    "data-vlm-source-truth-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.002.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS216 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass216ProgressDeltas",
    "PASS216_AI_BRAIN_SOURCE_TRUTH_SPINE_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.002.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass216.ts: missing PASS216 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS216 — AI Brain Source Truth Spine"))
    errors.pushWithId.bind(errors, "customer-ai.002.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-source-truth-spine-md-miss")(
      "docs/progress/PASS216_AI_BRAIN_SOURCE_TRUTH_SPINE.md: missing PASS216 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.002.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-source-truth-spine-guard-failed-value")(
    `PASS216 AI Brain source truth spine guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.customer-ai.003");

// guard script marker: verify-pass216-ai-brain-source-truth-spine-safety.mjs
// PASS216

// PASS217 AI Brain live adapter freshness guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const freshnessSource = read(
    "lib/market-integrity/vlm-brain-live-adapter-freshness.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass217.ts");
  const reportSource = read(
    "docs/progress/PASS217_AI_BRAIN_LIVE_ADAPTER_FRESHNESS.md",
  );
  for (const needle of [
    "buildVlmBrainLiveAdapterFreshnessMesh",
    "selectedTileLiveAdapterFreshnessMesh",
    'data-vlm-live-adapter-freshness="pass217"',
    "PASS217 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.003.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS217 live adapter freshness marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainLiveAdapterFreshnessMesh",
    "vlm-brain-live-adapter-freshness-v1-pass217",
    "operator_adapter_freshness_preview",
    "PASS217_VLM_BRAIN_LIVE_ADAPTER_FRESHNESS_CONTRACT",
  ]) {
    if (!freshnessSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.003.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-live-adapter-freshness-mi")(
        `lib/market-integrity/vlm-brain-live-adapter-freshness.ts: missing PASS217 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS217 — AI Brain live adapter freshness",
    ".shield-vlm-live-adapter-freshness",
    "data-vlm-live-adapter-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.003.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS217 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass217ProgressDeltas",
    "PASS217_AI_BRAIN_LIVE_ADAPTER_FRESHNESS_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.003.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass217.ts: missing PASS217 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS217 — AI Brain Live Adapter Freshness Mesh"))
    errors.pushWithId.bind(errors, "customer-ai.003.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-live-adapter-freshness-md")(
      "docs/progress/PASS217_AI_BRAIN_LIVE_ADAPTER_FRESHNESS.md: missing PASS217 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.003.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-live-adapter-freshness-guard-failed-valu")(
    `PASS217 AI Brain live adapter freshness guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.customer-ai.004");

// guard script marker: verify-pass217-ai-brain-live-adapter-freshness-safety.mjs
// PASS217

// PASS218 AI Brain source policy gate guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const policySource = read(
    "lib/market-integrity/vlm-brain-source-policy-gate.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass218.ts");
  const reportSource = read(
    "docs/progress/PASS218_AI_BRAIN_SOURCE_POLICY_GATE.md",
  );
  for (const needle of [
    "buildVlmBrainSourcePolicyGate",
    "selectedTileSourcePolicyGate",
    'data-vlm-source-policy-gate="pass218"',
    "PASS218 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.004.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS218 source policy marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainSourcePolicyGate",
    "vlm-brain-source-policy-gate-v1-pass218",
    "operator_source_policy_preview",
    "PASS218_VLM_BRAIN_SOURCE_POLICY_GATE_CONTRACT",
  ]) {
    if (!policySource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.004.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-source-policy-gate-missin")(
        `lib/market-integrity/vlm-brain-source-policy-gate.ts: missing PASS218 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS218 — AI Brain source policy gate",
    ".shield-vlm-source-policy-gate",
    "data-vlm-source-policy-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.004.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS218 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass218ProgressDeltas",
    "PASS218_AI_BRAIN_SOURCE_POLICY_GATE_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.004.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass218.ts: missing PASS218 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS218 — AI Brain Source Policy Gate"))
    errors.pushWithId.bind(errors, "customer-ai.004.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-source-policy-gate-md-miss")(
      "docs/progress/PASS218_AI_BRAIN_SOURCE_POLICY_GATE.md: missing PASS218 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.004.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-source-policy-gate-guard-failed-value")(
    `PASS218 AI Brain source policy gate guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.customer-ai.005");

// guard script marker: verify-pass218-ai-brain-source-policy-gate-safety.mjs
// PASS218

// PASS219 AI Brain durable snapshot plan guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const planSource = read(
    "lib/market-integrity/vlm-brain-durable-snapshot-plan.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass219.ts");
  const reportSource = read(
    "docs/progress/PASS219_AI_BRAIN_DURABLE_SNAPSHOT_PLAN.md",
  );
  for (const needle of [
    "buildVlmBrainDurableSnapshotPlan",
    "selectedTileDurableSnapshotPlan",
    'data-vlm-durable-snapshot-plan="pass219"',
    "PASS219 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.005.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS219 durable snapshot marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainDurableSnapshotPlan",
    "vlm-brain-durable-snapshot-plan-v1-pass219",
    "operator_durable_write_preview",
    "PASS219_VLM_BRAIN_DURABLE_SNAPSHOT_PLAN_CONTRACT",
  ]) {
    if (!planSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.005.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-durable-snapshot-plan-mis")(
        `lib/market-integrity/vlm-brain-durable-snapshot-plan.ts: missing PASS219 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS219 — AI Brain durable snapshot plan",
    ".shield-vlm-durable-snapshot-plan",
    "data-vlm-durable-snapshot-write",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.005.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS219 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass219ProgressDeltas",
    "PASS219_AI_BRAIN_DURABLE_SNAPSHOT_PLAN_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "customer-ai.005.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass219.ts: missing PASS219 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS219 — AI Brain Durable Snapshot Plan"))
    errors.pushWithId.bind(errors, "customer-ai.005.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-durable-snapshot-plan-md-m")(
      "docs/progress/PASS219_AI_BRAIN_DURABLE_SNAPSHOT_PLAN.md: missing PASS219 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.005.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-durable-snapshot-plan-guard-failed-value")(
    `PASS219 AI Brain durable snapshot plan guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.customer-ai.006");

// guard script marker: verify-pass219-ai-brain-durable-snapshot-plan-safety.mjs
// PASS219

// PASS233-PASS242 AI Brain mega branch guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const contractFiles = [
    "lib/market-integrity/vlm-brain-qa-trace-bundle.ts",
    "lib/market-integrity/vlm-brain-adapter-orchestration-plan.ts",
    "lib/market-integrity/vlm-brain-access-copy-firewall.ts",
    "lib/market-integrity/vlm-brain-pdf-storage-redaction-bridge.ts",
    "lib/market-integrity/vlm-brain-missing-data-escalation-queue.ts",
    "lib/market-integrity/vlm-brain-renderer-comparison-plan.ts",
    "lib/market-integrity/vlm-brain-governance-policy-memo.ts",
    "lib/market-integrity/vlm-brain-audit-trail-index.ts",
    "lib/market-integrity/vlm-brain-customer-readiness-preflight.ts",
    "lib/market-integrity/vlm-brain-mega-branch-control-tower.ts",
  ];
  for (const file of contractFiles) {
    const source = read(file);
    if (!source.includes("CONTRACT = true"))
      errors.pushWithId.bind(errors, "customer-ai.006.value-missing-legacy-legacy-contract-export-marker.a001.value-missing-legacy-legacy-contract-export-marker")(`${file}: missing PASS233-PASS242 contract export marker.`);
  }
  const markers = [
    "buildVlmBrainQaTraceBundle",
    "buildVlmBrainAdapterOrchestrationPlan",
    "buildVlmBrainAccessCopyFirewall",
    "buildVlmBrainPdfStorageRedactionBridge",
    "buildVlmBrainMissingDataEscalationQueue",
    "buildVlmBrainRendererComparisonPlan",
    "buildVlmBrainGovernancePolicyMemo",
    "buildVlmBrainAuditTrailIndex",
    "buildVlmBrainCustomerReadinessPreflight",
    "buildVlmBrainMegaBranchControlTower",
    'data-vlm-mega-branch-control-tower="pass242"',
  ];
  for (const marker of markers)
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.006.value-missing-legacy-legacy-contract-export-marker.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS233-PASS242 marker ${marker}.`,
      );
  if (
    !cssSource.includes("PASS233–PASS242 — AI Brain mega branch control tower")
  )
    errors.pushWithId.bind(errors, "customer-ai.006.value-missing-legacy-legacy-contract-export-marker.a003.app-globals-css-missing-legacy-legacy-css-marker")("app/globals.css: missing PASS233-PASS242 CSS marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.006.value-missing-legacy-legacy-contract-export-marker.a004.legacy-legacy-ai-brain-mega-branch-guard-failed-value")(
    `PASS233-PASS242 AI Brain mega branch guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.customer-ai.007");

// guard script markers: verify-pass233-ai-brain-mega-branch-safety.mjs verify-pass234-ai-brain-mega-branch-safety.mjs verify-pass235-ai-brain-mega-branch-safety.mjs verify-pass236-ai-brain-mega-branch-safety.mjs verify-pass237-ai-brain-mega-branch-safety.mjs verify-pass238-ai-brain-mega-branch-safety.mjs verify-pass239-ai-brain-mega-branch-safety.mjs verify-pass240-ai-brain-mega-branch-safety.mjs verify-pass241-ai-brain-mega-branch-safety.mjs verify-pass242-ai-brain-mega-branch-safety.mjs

// PASS243-PASS245 AI Brain real three-pass guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const triageSource = read(
    "lib/market-integrity/vlm-brain-release-triage-board.ts",
  );
  const vaultSource = read(
    "lib/market-integrity/vlm-brain-operator-handoff-vault.ts",
  );
  const replaySource = read(
    "lib/market-integrity/vlm-brain-browser-replay-script.ts",
  );
  const markers = [
    "buildVlmBrainReleaseTriageBoard",
    "buildVlmBrainOperatorHandoffVault",
    "buildVlmBrainBrowserReplayScript",
    'data-vlm-release-triage-board="pass243"',
    'data-vlm-operator-handoff-vault="pass244"',
    'data-vlm-browser-replay-script="pass245"',
  ];
  for (const marker of markers)
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.007.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS243-PASS245 marker ${marker}.`,
      );
  for (const marker of [
    "PASS243_VLM_BRAIN_RELEASE_TRIAGE_BOARD_CONTRACT",
    "customerExportReady: false",
    "binaryPdfReady: false",
    "walletAccessReady: false",
    "rawPayloadAllowed: false",
  ])
    if (!triageSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.007.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-release-triage-board-miss")(
        `lib/market-integrity/vlm-brain-release-triage-board.ts: missing marker ${marker}.`,
      );
  for (const marker of [
    "PASS244_VLM_BRAIN_OPERATOR_HANDOFF_VAULT_CONTRACT",
    "sourceSnapshotWriteReady: false",
    "caseTimelineWriteReady: false",
    "rawPayloadAllowed: false",
  ])
    if (!vaultSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.007.components-market-integrity-tokenriskmodalx-missing-lega.a003.lib-market-integrity-vlm-brain-operator-handoff-vault-mi")(
        `lib/market-integrity/vlm-brain-operator-handoff-vault.ts: missing marker ${marker}.`,
      );
  for (const marker of [
    "PASS245_VLM_BRAIN_BROWSER_REPLAY_SCRIPT_CONTRACT",
    "manual_vercel_browser_replay_required",
    "qaHudRequired: true",
    "customerExportReady: false",
    "binaryPdfReady: false",
  ])
    if (!replaySource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.007.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-market-integrity-vlm-brain-browser-replay-script-mis")(
        `lib/market-integrity/vlm-brain-browser-replay-script.ts: missing marker ${marker}.`,
      );
  if (
    !cssSource.includes(
      "PASS243–PASS245 — AI Brain real three-pass release triage",
    )
  )
    errors.pushWithId.bind(errors, "customer-ai.007.components-market-integrity-tokenriskmodalx-missing-lega.a005.app-globals-css-missing-legacy-legacy-real-three-pass-cs")(
      "app/globals.css: missing PASS243-PASS245 real three-pass CSS marker.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.007.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-legacy-real-three-pass-guard-failed-value")(
    `PASS243-PASS245 real three-pass guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
