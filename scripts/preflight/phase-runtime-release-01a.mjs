import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";


setGuardScope("pf.runtime-release.001");

try {
  const searchPageSource = read("app/[locale]/search/page.tsx");
  const searchClientSource = read(
    "components/search/VelmereIntelligenceSearchClient.tsx",
  );
  const searchRouteSource = [
    read("app/api/search/route.ts"),
    read("lib/server/lazy-route-modules/search.ts"),
  ].join("\n");
  const searchOrchestratorSource = read("lib/search/search-route-orchestrator.ts");
  const searchResponsePolicySource = read("lib/search/search-route-response-policy.ts");
  const searchContractSource = read(
    "lib/search/intelligence-search-contract.ts",
  );
  for (const needle of [
    "VelmereIntelligenceSearchClient",
    "Velmère Intelligence Search",
  ]) {
    if (
      !searchPageSource.includes(needle) &&
      !searchClientSource.includes(needle)
    )
      errors.pushWithId.bind(errors, "release.001.search-page-client-missing-legacy-marker-value.a001.search-page-client-missing-legacy-marker-value")(`search page/client: missing PASS175 marker ${needle}.`);
  }
  for (const needle of [
    "VelmereSearchResult",
    "searchVelmereIntelligence",
    "shieldHref",
    "missingData",
    "nextOperatorStep",
  ]) {
    if (!searchContractSource.includes(needle))
      errors.pushWithId.bind(errors, "release.001.search-page-client-missing-legacy-marker-value.a002.lib-search-intelligence-search-contract-missing-legacy-m")(
        `lib/search/intelligence-search-contract.ts: missing PASS175 marker ${needle}.`,
      );
  }
  for (const adapterNeedle of ["handleSearchGet", "withExpensiveRouteBudget", "search_get"]) {
    if (!searchRouteSource.includes(adapterNeedle))
      errors.pushWithId.bind(errors, "release.001.search-page-client-missing-legacy-marker-value.a004.lib-search-orchestrator-missing-pass175-marker-value")(
        `app/api/search/route.ts: missing thin adapter marker ${adapterNeedle}.`,
      );
  }
  for (const needle of [
    "velmere_intelligence_search_preview",
    "sanitizeSearchInput",
  ]) {
    if (!searchOrchestratorSource.includes(needle))
      errors.pushWithId.bind(errors, "release.001.search-page-client-missing-legacy-marker-value.a003.app-api-search-route-missing-legacy-safety-marker-value")(
        `lib/search/search-route-orchestrator.ts: missing PASS175 orchestration marker ${needle}.`,
      );
  }
  if (!searchResponsePolicySource.includes("no-store"))
    errors.pushWithId.bind(errors, "release.001.search-page-client-missing-legacy-marker-value.a005.lib-search-response-policy-missing-no-store-value")(
      "lib/search/search-route-response-policy.ts: missing PASS175 response safety marker no-store.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "release.001.search-page-client-missing-legacy-marker-value.a006.legacy-intelligence-search-guard-failed-value")(
    `PASS175 intelligence search guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.002");

// guard script marker: verify-pass175-intelligence-search-safety.mjs
// PASS175

// PASS174 source cache + snapshot ledger guard
try {
  const runtimeSource = read("lib/market-integrity/source-adapter-runtime.ts");
  const routeSource = read("app/api/market-integrity/source-snapshot/route.ts");
  const pageSource = read("app/[locale]/market-integrity/page.tsx");
  for (const needle of [
    "SourceAdapterEnvelope",
    "redactSourcePayload",
    "getSourceCacheDecision",
    "createDemoSourceSnapshotBundle",
  ]) {
    if (!runtimeSource.includes(needle))
      errors.pushWithId.bind(errors, "release.002.lib-market-integrity-source-adapter-runtime-missing-lega.a001.lib-market-integrity-source-adapter-runtime-missing-lega")(
        `lib/market-integrity/source-adapter-runtime.ts: missing PASS174 marker ${needle}.`,
      );
  }
  for (const needle of [
    "source_snapshot_preview_only",
    "storageWritePerformed: false",
    "no-store",
  ]) {
    if (!routeSource.includes(needle))
      errors.pushWithId.bind(errors, "release.002.lib-market-integrity-source-adapter-runtime-missing-lega.a002.app-api-market-integrity-source-snapshot-route-missing-l")(
        `app/api/market-integrity/source-snapshot/route.ts: missing PASS174 safety marker ${needle}.`,
      );
  }
  if (!pageSource.includes("SourceSnapshotLedgerPanel") && !pageSource.includes("ShieldRealMarketsParityClient"))
    errors.pushWithId.bind(errors, "release.002.lib-market-integrity-source-adapter-runtime-missing-lega.a003.app-locale-market-integrity-pagex-missing-current-shield")(
      "app/[locale]/market-integrity/page.tsx: missing current Shield parity surface or PASS174 ledger panel.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "release.002.lib-market-integrity-source-adapter-runtime-missing-lega.a004.legacy-source-cache-snapshot-guard-failed-value")(
    `PASS174 source cache/snapshot guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.003");

// guard script marker: verify-pass174-source-cache-snapshot-ledger-safety.mjs
// PASS174

// PASS173 real browser QA + market source readiness guard
try {
  const contractSource = read(
    "lib/market-integrity/live-source-adapter-contract.ts",
  );
  const marketPageSource = read("app/[locale]/market-integrity/page.tsx");
  const routeSource = read(
    "app/api/market-integrity/source-readiness/route.ts",
  );
  for (const needle of [
    "marketIntegritySourceFreshnessRules",
    "targetTtlSeconds",
    "staleAfterSeconds",
    "mustNeverClaim",
  ]) {
    if (!contractSource.includes(needle))
      errors.pushWithId.bind(errors, "release.003.lib-market-integrity-live-source-adapter-contract-missin.a001.lib-market-integrity-live-source-adapter-contract-missin")(
        `lib/market-integrity/live-source-adapter-contract.ts: missing PASS173 marker ${needle}.`,
      );
  }
  if (!marketPageSource.includes("ShieldRealMarketsParityClient")) {
    for (const needle of [
      "MarketIntegritySourceReadinessPanel",
      "RealBrowserQaPanel",
    ]) {
      if (!marketPageSource.includes(needle))
        errors.pushWithId.bind(errors, "release.003.lib-market-integrity-live-source-adapter-contract-missin.a002.app-locale-market-integrity-pagex-missing-legacy-panel-v")(
          `app/[locale]/market-integrity/page.tsx: missing PASS173 panel ${needle}.`,
        );
    }
  }
  for (const needle of [
    "source_readiness_preview_only",
    "storageWritePerformed",
    "no-store",
  ]) {
    if (!routeSource.includes(needle))
      errors.pushWithId.bind(errors, "release.003.lib-market-integrity-live-source-adapter-contract-missin.a003.app-api-market-integrity-source-readiness-route-missing")(
        `app/api/market-integrity/source-readiness/route.ts: missing PASS173 safety marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.003.lib-market-integrity-live-source-adapter-contract-missin.a004.legacy-browser-source-readiness-guard-failed-value")(
    `PASS173 browser/source readiness guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.004");

// guard script marker: verify-pass173-browser-source-readiness-safety.mjs
// PASS173

// PASS172 board density + renderer contract guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const rendererContract = read("lib/launch/vlm-brain-renderer-contract.ts");
  for (const needle of [
    "boardDensity",
    "shield-vlm-static-density-${boardDensity}",
    "sparsePositions",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "release.004.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS172 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS172 · evidence board sparse/focused density polish",
    ".shield-vlm-static-density-sparse",
    ".shield-vlm-static-density-focused",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "release.004.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS172 CSS marker ${needle}.`);
  }
  for (const needle of [
    "dom_orbit_360",
    "dom_evidence_board",
    "webgl_prototype",
    "getVlmBrainRendererSummary",
  ]) {
    if (!rendererContract.includes(needle))
      errors.pushWithId.bind(errors, "release.004.components-market-integrity-tokenriskmodalx-missing-lega.a003.lib-launch-vlm-brain-renderer-contract-missing-renderer")(
        `lib/launch/vlm-brain-renderer-contract.ts: missing renderer contract marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.004.components-market-integrity-tokenriskmodalx-missing-lega.a004.legacy-board-density-renderer-guard-failed-value")(
    `PASS172 board density/renderer guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.005");

// guard script marker: verify-vlm-brain-board-density-renderer-contract-safety.mjs

// PASS171 evidence board focus + WebGL prototype lane guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const webglSource = read(
    "components/market-integrity/VlmBrainWebGLPrototype.tsx",
  );
  for (const needle of [
    "shield-vlm-board-mode",
    "staticBoardRingName",
    "shield-vlm-static-map-rings",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "release.005.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS171 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS171 · evidence board focus polish",
    ".shield-vlm-board-mode .shield-vlm-dom-core",
    ".shield-vlm-static-map-ring-a",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "release.005.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS171 CSS marker ${needle}.`);
  }
  for (const needle of [
    "PASS171 WebGL-ready lane",
    'canvas.getContext("webgl"',
    'data-webgl-prototype="vlm-brain"',
  ]) {
    if (!webglSource.includes(needle))
      errors.pushWithId.bind(errors, "release.005.components-market-integrity-tokenriskmodalx-missing-lega.a003.components-market-integrity-vlmbrainwebglprototypex-miss")(
        `components/market-integrity/VlmBrainWebGLPrototype.tsx: missing PASS171 WebGL marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.005.components-market-integrity-tokenriskmodalx-missing-lega.a004.legacy-board-webgl-guard-failed-value")(
    `PASS171 board/WebGL guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.006");

// guard script marker: verify-vlm-brain-board-focus-webgl-lane-safety.mjs

// PASS170 unified orbit/board production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  for (const needle of [
    'const allowedMotionPresets = useMemo<MotionPreset[]>(() => ["orbit", "static"], []);',
    'const [motionPreset, setMotionPreset] = useState<MotionPreset>("orbit");',
    "shield-vlm-static-stage",
    "staticBoardTileStyle",
    "supportsOrbit360 = true",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "release.006.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS170 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS170 · unified Orbit 360 + full-screen evidence board",
    ".shield-vlm-static-stage",
    ".shield-vlm-static-card",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "release.006.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS170 CSS marker ${needle}.`);
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.006.components-market-integrity-tokenriskmodalx-missing-lega.a003.legacy-unified-orbit-board-guard-failed-value")(
    `PASS170 unified orbit/board guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.007");

// Evidence report production guard
try {
  const evidenceSource = read("lib/market-integrity/evidence-report.ts");
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  for (const needle of [
    "buildShieldEvidenceReportDraft",
    "sourceLedger",
    "missingDataAppendix",
    "redactionRules",
    "draft_only",
  ]) {
    if (!evidenceSource.includes(needle))
      errors.pushWithId.bind(errors, "release.007.lib-market-integrity-evidence-report-missing-value.a001.lib-market-integrity-evidence-report-missing-value")(
        `lib/market-integrity/evidence-report.ts: missing ${needle}.`,
      );
  }
  const unifiedEvidenceDetails =
    modalSource.includes("buildShieldEvidenceReportDraft(result, operatorCaseFile)") &&
    modalSource.includes("evidenceReportDraft") &&
    modalSource.includes("detailsSlot=");
  if (!modalSource.includes("buildShieldEvidenceReportDraft(result, operatorCaseFile)")) {
    errors.pushWithId.bind(errors, "release.007.lib-market-integrity-evidence-report-missing-value.a002.components-market-integrity-tokenriskmodalx-missing-evid")(
      "components/market-integrity/TokenRiskModal.tsx: missing evidence report UI buildShieldEvidenceReportDraft(result, operatorCaseFile).",
    );
  }
  if (!unifiedEvidenceDetails) {
    for (const needle of ["evidenceReportDraft.exportStatus", "shield-evidence-draft"]) {
      if (!modalSource.includes(needle))
        errors.pushWithId.bind(errors, "release.007.lib-market-integrity-evidence-report-missing-value.a003.components-market-integrity-tokenriskmodalx-missing-evid")(
          `components/market-integrity/TokenRiskModal.tsx: missing evidence report UI ${needle}.`,
        );
    }
  }
  if (!cssSource.includes("PASS129 — evidence draft source ledger")) {
    errors.pushWithId.bind(errors, "release.007.lib-market-integrity-evidence-report-missing-value.a004.app-globals-css-missing-legacy-evidence-draft-css")("app/globals.css: missing PASS129 evidence draft CSS.");
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.007.lib-market-integrity-evidence-report-missing-value.a005.evidence-report-production-guard-failed-value")(
    `Evidence report production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.008");

// Operator casefile production guard
try {
  const casefileSource = read("lib/market-integrity/operator-casefile.ts");
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  for (const needle of [
    "buildShieldOperatorCaseFile",
    "ShieldOperatorCaseFile",
    "osintQueries",
    "operatorChecklist",
  ]) {
    if (!casefileSource.includes(needle))
      errors.pushWithId.bind(errors, "release.008.lib-market-integrity-operator-casefile-missing-value.a001.lib-market-integrity-operator-casefile-missing-value")(
        `lib/market-integrity/operator-casefile.ts: missing ${needle}.`,
      );
  }
  const unifiedCasefileDetails =
    modalSource.includes("UnifiedAssetModalShell") &&
    modalSource.includes("operatorCaseFile.primaryNextAction") &&
    modalSource.includes("detailsSlot=");
  for (const needle of [
    "buildShieldOperatorCaseFile(result)",
    "operatorCaseFile.primaryNextAction",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "release.008.lib-market-integrity-operator-casefile-missing-value.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS126 marker ${needle}.`,
      );
  }
  if (!unifiedCasefileDetails) {
    for (const needle of ["shield-operator-casefile", "shield-vlm-orbital-shell"]) {
      if (!modalSource.includes(needle))
        errors.pushWithId.bind(errors, "release.008.lib-market-integrity-operator-casefile-missing-value.a003.components-market-integrity-tokenriskmodalx-missing-lega")(
          `components/market-integrity/TokenRiskModal.tsx: missing PASS126 marker ${needle}.`,
        );
    }
  }
  for (const needle of [
    "PASS126 — operator casefile",
    ".shield-operator-casefile",
    ".shield-vlm-orbital-shell",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "release.008.lib-market-integrity-operator-casefile-missing-value.a004.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS126 CSS marker ${needle}.`);
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.008.lib-market-integrity-operator-casefile-missing-value.a005.operator-casefile-production-guard-failed-value")(
    `Operator casefile production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.009");

// VLM motion governor production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  for (const needle of [
    "type MotionPreset",
    "motionPreset",
    "renderHeavyCanvas",
    "shield-vlm-motion-toggle-mini",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "release.009.components-market-integrity-tokenriskmodalx-missing-vlm.a001.components-market-integrity-tokenriskmodalx-missing-vlm")(
        `components/market-integrity/TokenRiskModal.tsx: missing VLM motion governor marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS128 — VLM motion governor",
    "PASS148 — VLM brain cleanup",
    ".shield-vlm-motion-governor",
    ".shield-token-search-suggest-panel",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "release.009.components-market-integrity-tokenriskmodalx-missing-vlm.a002.app-globals-css-missing-vlm-motion-governor-css-marker-v")(
        `app/globals.css: missing VLM motion governor CSS marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.009.components-market-integrity-tokenriskmodalx-missing-vlm.a003.vlm-motion-governor-production-guard-failed-value")(
    `VLM motion governor production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.010");

// VLM organic motion production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const unifiedDepthDockRunsBrain =
    modalSource.includes("UnifiedAnalysisDepthDock") &&
    modalSource.includes("onSelect={runVlmAiSequence}") &&
    modalSource.includes('value: "pro"');
  for (const needle of [
    "isInvestigationMode",
    "advancedOrbitalSlots",
    "setOrbitTick",
    "shield-vlm-brain-chip",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "release.010.components-market-integrity-tokenriskmodalx-missing-vlm.a001.components-market-integrity-tokenriskmodalx-missing-vlm")(
        `components/market-integrity/TokenRiskModal.tsx: missing VLM spherical motion marker ${needle}.`,
      );
  }
  if (!unifiedDepthDockRunsBrain && !modalSource.includes(`runVlmAiSequence("pro")`)) {
    errors.pushWithId.bind(errors, "release.010.components-market-integrity-tokenriskmodalx-missing-vlm.a002.components-market-integrity-tokenriskmodalx-missing-vlm")(
      `components/market-integrity/TokenRiskModal.tsx: missing VLM spherical motion marker runVlmAiSequence("pro") or unified depth dock replacement.`,
    );
  }
  for (const needle of [
    "PASS125 — real VLM spherical orbit layer",
    "PASS127 — clean chart surface",
    "perspective: 2100px",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "release.010.components-market-integrity-tokenriskmodalx-missing-vlm.a003.app-globals-css-missing-vlm-spherical-motion-css-marker")(
        `app/globals.css: missing VLM spherical motion CSS marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.010.components-market-integrity-tokenriskmodalx-missing-vlm.a004.vlm-organic-motion-production-guard-failed-value")(
    `VLM organic motion production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.011");

// Shield runtime UI production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const modalBody = modalSource.slice(
    modalSource.indexOf("export default function TokenRiskModal"),
  );
  const shieldMapSource = read(
    "components/market-integrity/ShieldMapClient.tsx",
  );
  const marketSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const cssSource = read("app/globals.css");

  if (
    modalBody.includes("{ui.controlKicker}") &&
    !modalBody.includes("const ui = useMemo(() =>")
  ) {
    errors.pushWithId.bind(errors, "release.011.components-market-integrity-tokenriskmodalx-ui-control-c.a001.components-market-integrity-tokenriskmodalx-ui-control-c")(
      "components/market-integrity/TokenRiskModal.tsx: ui control copy must exist in TokenRiskModal scope.",
    );
  }
  for (const needle of [
    "investigatorSuggestRef",
    "closeOnOutsidePointer",
    'role="listbox"',
  ]) {
    if (!shieldMapSource.includes(needle))
      errors.pushWithId.bind(errors, "release.011.components-market-integrity-tokenriskmodalx-ui-control-c.a002.components-market-integrity-shieldmapclientx-missing-sug")(
        `components/market-integrity/ShieldMapClient.tsx: missing suggestion outside-click marker ${needle}.`,
      );
  }
  if (
    shieldMapSource.includes(
      "onBlur={() => window.setTimeout(() => setSuggestionsOpen(false)",
    )
  ) {
    errors.pushWithId.bind(errors, "release.011.components-market-integrity-tokenriskmodalx-ui-control-c.a003.components-market-integrity-shieldmapclientx-suggestions")(
      "components/market-integrity/ShieldMapClient.tsx: suggestions must not rely on blur timeout.",
    );
  }
  if (
    !marketSource.includes("shield-token-search-suggest-panel") ||
    !marketSource.includes("z-[10000]")
  ) {
    errors.pushWithId.bind(errors, "release.011.components-market-integrity-tokenriskmodalx-ui-control-c.a004.components-market-integrity-marketintegrityclientx-searc")(
      "components/market-integrity/MarketIntegrityClient.tsx: search suggestions must use high overlay layer.",
    );
  }
  for (const needle of [
    "overflow: visible",
    "z-index: 10000",
    "shield-token-search-suggest-panel",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "release.011.components-market-integrity-tokenriskmodalx-ui-control-c.a005.app-globals-css-missing-shield-suggestion-overlay-css-va")(
        `app/globals.css: missing Shield suggestion overlay CSS ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.011.components-market-integrity-tokenriskmodalx-ui-control-c.a006.shield-runtime-ui-production-guard-failed-value")(
    `Shield runtime UI production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
