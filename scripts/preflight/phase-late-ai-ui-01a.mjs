import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";


setGuardScope("pf.late-ai-ui.001");

// PASS206 AI Brain QA HUD WebGL trace guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const prototypeSource = read(
    "components/market-integrity/VlmBrainWebGLPrototype.tsx",
  );
  const cssSource = read("app/globals.css");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-renderer-contract.ts",
  );
  const deltaSource = read("lib/launch/master-build-progress-delta-pass206.ts");
  for (const needle of [
    "showMotionQaHud",
    "data-vlm-qa-motion",
    "onTelemetry={setWebglTelemetry}",
    "PASS206 marker: public VLM Brain hides QA/FPS/zoom HUD by default",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.001.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS206 marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainWebGLTelemetrySample",
    "telemetryWorstFrameMs",
    "PASS206 marker: WebGL prototype exports per-second telemetry",
  ]) {
    if (!prototypeSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.001.components-market-integrity-tokenriskmodalx-missing-lega.a002.components-market-integrity-vlmbrainwebglprototypex-miss")(
        `components/market-integrity/VlmBrainWebGLPrototype.tsx: missing PASS206 telemetry marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS206 — AI Brain production HUD polish",
    'data-vlm-qa-motion="false"',
    "display: none !important",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.001.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS206 CSS marker ${needle}`);
  }
  for (const needle of [
    "VLM_BRAIN_QA_HUD_FEATURE_GATE",
    "NEXT_PUBLIC_VLM_BRAIN_QA_HUD",
  ]) {
    if (!contractSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.001.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-market-integrity-vlm-brain-renderer-contract-missing")(
        `lib/market-integrity/vlm-brain-renderer-contract.ts: missing PASS206 contract marker ${needle}`,
      );
  }
  for (const needle of ["velmerePass206ProgressDeltas", "PASS206 marker"]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.001.components-market-integrity-tokenriskmodalx-missing-lega.a005.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass206.ts: missing PASS206 delta marker ${needle}`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.001.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-qa-hud-webgl-trace-guard-failed-value")(
    `PASS206 AI Brain QA HUD WebGL trace guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-ai-ui.002");

// guard script marker: verify-pass206-ai-brain-qa-hud-webgl-trace-safety.mjs
// PASS206

// PASS220 AI Brain release chain auditor guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const auditSource = read(
    "lib/market-integrity/vlm-brain-release-chain-auditor.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass220.ts");
  const reportSource = read(
    "docs/progress/PASS220_AI_BRAIN_RELEASE_CHAIN_AUDITOR.md",
  );
  for (const needle of [
    "buildVlmBrainReleaseChainAudit",
    "selectedTileReleaseChainAudit",
    'data-vlm-release-chain-audit="pass220"',
    "PASS220 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.002.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS220 release chain marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainReleaseChainAudit",
    "vlm-brain-release-chain-auditor-v1-pass220",
    "operator_release_chain_audit_preview",
    "PASS220_VLM_BRAIN_RELEASE_CHAIN_AUDITOR_CONTRACT",
    "publicExportReady: false",
    "pdfDownloadReady: false",
    "rawPayloadAllowed: false",
  ]) {
    if (!auditSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.002.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-release-chain-auditor-mis")(
        `lib/market-integrity/vlm-brain-release-chain-auditor.ts: missing PASS220 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS220 — AI Brain release chain audit",
    ".shield-vlm-release-chain-audit",
    "data-vlm-release-chain-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.002.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS220 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass220ProgressDeltas",
    "PASS220_AI_BRAIN_RELEASE_CHAIN_AUDITOR_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.002.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass220.ts: missing PASS220 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS220 — AI Brain Release Chain Auditor"))
    errors.pushWithId.bind(errors, "ai-ui.002.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-release-chain-auditor-md-m")(
      "docs/progress/PASS220_AI_BRAIN_RELEASE_CHAIN_AUDITOR.md: missing PASS220 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.002.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-release-chain-auditor-guard-failed-value")(
    `PASS220 AI Brain release chain auditor guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-ai-ui.003");

// guard script marker: verify-pass220-ai-brain-release-chain-auditor-safety.mjs
// PASS220

// PASS221 AI Brain source ledger UI preview guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-source-ledger-ui-preview.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass221.ts");
  for (const needle of [
    "buildVlmBrainSourceLedgerUiPreview",
    "selectedTileSourceLedgerUiPreview",
    'data-vlm-source-ledger-ui="pass221"',
    "PASS221 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.003.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS221 source ledger UI marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainSourceLedgerUiPreview",
    "vlm-brain-source-ledger-ui-preview-v1-pass221",
    "operator_source_ledger_preview",
    "publicLedgerReady: false",
    "rawPayloadAllowed: false",
    "browserTraceRequired: true",
    "PASS221_VLM_BRAIN_SOURCE_LEDGER_UI_PREVIEW_CONTRACT",
  ]) {
    if (!contractSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.003.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-source-ledger-ui-preview")(
        `lib/market-integrity/vlm-brain-source-ledger-ui-preview.ts: missing PASS221 contract marker ${needle}`,
      );
  }
  for (const needle of [
    ".shield-vlm-source-ledger-ui",
    "data-vlm-source-ledger-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.003.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS221 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass221ProgressDeltas",
    "PASS221_AI_BRAIN_SOURCE_LEDGER_UI_PREVIEW_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.003.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass221.ts: missing PASS221 delta marker ${needle}`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.003.components-market-integrity-tokenriskmodalx-missing-lega.a005.legacy-ai-brain-source-ledger-ui-preview-guard-failed-va")(
    `PASS221 AI Brain source ledger UI preview guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-ai-ui.004");

// guard script marker: verify-pass221-ai-brain-source-ledger-ui-preview-safety.mjs
// PASS221

// PASS222 AI Brain PDF preview manifest guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-pdf-preview-manifest.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass222.ts");
  for (const needle of [
    "buildVlmBrainPdfPreviewManifest",
    "selectedTilePdfPreviewManifest",
    'data-vlm-pdf-preview-manifest="pass222"',
    "PASS222 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.004.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS222 PDF preview marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainPdfPreviewManifest",
    "vlm-brain-pdf-preview-manifest-v1-pass222",
    "pdf_ready_html_preview_only",
    "binaryPdfReady: false",
    "rawPayloadAllowed: false",
    "redactionRequired: true",
    "PASS222_VLM_BRAIN_PDF_PREVIEW_MANIFEST_CONTRACT",
  ]) {
    if (!contractSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.004.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-pdf-preview-manifest-miss")(
        `lib/market-integrity/vlm-brain-pdf-preview-manifest.ts: missing PASS222 contract marker ${needle}`,
      );
  }
  for (const needle of [
    ".shield-vlm-pdf-preview-manifest",
    "data-vlm-pdf-preview-section",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.004.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS222 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass222ProgressDeltas",
    "PASS222_AI_BRAIN_PDF_PREVIEW_MANIFEST_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.004.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass222.ts: missing PASS222 delta marker ${needle}`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.004.components-market-integrity-tokenriskmodalx-missing-lega.a005.legacy-ai-brain-pdf-preview-manifest-guard-failed-value")(
    `PASS222 AI Brain PDF preview manifest guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-ai-ui.005");

// guard script marker: verify-pass222-ai-brain-pdf-preview-manifest-safety.mjs
// PASS222

// PASS223 AI Brain Lens Shield handoff guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-lens-shield-handoff.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass223.ts");
  for (const needle of [
    "buildVlmBrainLensShieldHandoff",
    "selectedTileLensShieldHandoff",
    'data-vlm-lens-shield-handoff="pass223"',
    "PASS223 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.005.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS223 Lens Shield marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainLensShieldHandoff",
    "vlm-brain-lens-shield-handoff-v1-pass223",
    "lens_to_shield_operator_preview",
    "publicRouteEnabled: false",
    "rawQueryPayloadAllowed: false",
    "PASS223_VLM_BRAIN_LENS_SHIELD_HANDOFF_CONTRACT",
  ]) {
    if (!contractSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.005.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-lens-shield-handoff-missi")(
        `lib/market-integrity/vlm-brain-lens-shield-handoff.ts: missing PASS223 contract marker ${needle}`,
      );
  }
  for (const needle of [
    ".shield-vlm-lens-shield-handoff",
    "data-vlm-lens-shield-route",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.005.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS223 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass223ProgressDeltas",
    "PASS223_AI_BRAIN_LENS_SHIELD_HANDOFF_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.005.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass223.ts: missing PASS223 delta marker ${needle}`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.005.components-market-integrity-tokenriskmodalx-missing-lega.a005.legacy-ai-brain-lens-shield-handoff-guard-failed-value")(
    `PASS223 AI Brain Lens Shield handoff guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-ai-ui.006");

// guard script marker: verify-pass223-ai-brain-lens-shield-handoff-safety.mjs
// PASS223

// PASS224 AI Brain release QA scorecard guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-release-qa-scorecard.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass224.ts");
  for (const needle of [
    "buildVlmBrainReleaseQaScorecard",
    "selectedTileReleaseQaScorecard",
    'data-vlm-release-qa-scorecard="pass224"',
    "PASS224 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.006.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS224 release QA marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainReleaseQaScorecard",
    "vlm-brain-release-qa-scorecard-v1-pass224",
    "operator_release_qa_preview",
    "publicReleaseReady: false",
    "binaryPdfReady: false",
    "rawPayloadAllowed: false",
    "browserQaRequired: true",
    "PASS224_VLM_BRAIN_RELEASE_QA_SCORECARD_CONTRACT",
  ]) {
    if (!contractSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.006.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-release-qa-scorecard-miss")(
        `lib/market-integrity/vlm-brain-release-qa-scorecard.ts: missing PASS224 contract marker ${needle}`,
      );
  }
  for (const needle of [
    ".shield-vlm-release-qa-scorecard",
    "data-vlm-release-qa-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.006.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS224 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass224ProgressDeltas",
    "PASS224_AI_BRAIN_RELEASE_QA_SCORECARD_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "ai-ui.006.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass224.ts: missing PASS224 delta marker ${needle}`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.006.components-market-integrity-tokenriskmodalx-missing-lega.a005.legacy-ai-brain-release-qa-scorecard-guard-failed-value")(
    `PASS224 AI Brain release QA scorecard guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-ai-ui.007");

// guard script marker: verify-pass224-ai-brain-release-qa-scorecard-safety.mjs
// PASS224

// PASS225-PASS232 AI Brain release readiness mega-branch guard hooks
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const pass225232Markers = [
    "buildVlmBrainReleaseBlockerResolver",
    "buildVlmBrainBrowserQaRunbook",
    "buildVlmBrainCustomerCopySanitizer",
    "buildVlmBrainPdfRouteContract",
    "buildVlmBrainLedgerPersistenceAdapterPlan",
    "buildVlmBrainLiveFeedAdapterMatrix",
    "buildVlmBrainWalletAccessGateMatrix",
    "buildVlmBrainLaunchReadinessDashboard",
    'data-vlm-launch-readiness-dashboard="pass232"',
  ];
  for (const marker of pass225232Markers)
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.007.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS225-PASS232 marker ${marker}.`,
      );
  if (
    !cssSource.includes(
      "PASS225–PASS232 — AI Brain release readiness mega-branch",
    )
  )
    errors.pushWithId.bind(errors, "ai-ui.007.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-legacy-release-readiness")(
      "app/globals.css: missing PASS225-PASS232 release readiness CSS marker.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.007.components-market-integrity-tokenriskmodalx-missing-lega.a003.legacy-legacy-release-readiness-guard-failed-value")(
    `PASS225-PASS232 release readiness guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-ai-ui.008");

// guard script markers: verify-pass225-ai-brain-release-blocker-resolver-safety.mjs verify-pass226-ai-brain-browser-qa-runbook-safety.mjs verify-pass227-ai-brain-customer-copy-sanitizer-safety.mjs verify-pass228-ai-brain-pdf-route-contract-safety.mjs verify-pass229-ai-brain-ledger-persistence-adapter-plan-safety.mjs verify-pass230-ai-brain-live-feed-adapter-matrix-safety.mjs verify-pass231-ai-brain-wallet-access-gate-matrix-safety.mjs verify-pass232-ai-brain-launch-readiness-dashboard-safety.mjs

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
      errors.pushWithId.bind(errors, "ai-ui.008.value-missing-legacy-legacy-contract-export-marker.a001.value-missing-legacy-legacy-contract-export-marker")(`${file}: missing PASS233-PASS242 contract export marker.`);
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
      errors.pushWithId.bind(errors, "ai-ui.008.value-missing-legacy-legacy-contract-export-marker.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS233-PASS242 marker ${marker}.`,
      );
  if (
    !cssSource.includes("PASS233–PASS242 — AI Brain mega branch control tower")
  )
    errors.pushWithId.bind(errors, "ai-ui.008.value-missing-legacy-legacy-contract-export-marker.a003.app-globals-css-missing-legacy-legacy-css-marker")("app/globals.css: missing PASS233-PASS242 CSS marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.008.value-missing-legacy-legacy-contract-export-marker.a004.legacy-legacy-ai-brain-mega-branch-guard-failed-value")(
    `PASS233-PASS242 AI Brain mega branch guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
