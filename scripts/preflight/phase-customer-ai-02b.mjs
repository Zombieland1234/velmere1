import {  errors, packageScriptEvidenceSource, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.customer-ai.015");

// guard script marker: verify-pass265-evidence-language-ledger-consent-boundary-safety.mjs

// PASS266 AI Brain claim traceability matrix comprehension gate
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const claimSource = read(
    "lib/market-integrity/vlm-brain-pass266-claim-traceability-matrix.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass266-claim-traceability-matrix-v1",
    "PASS266_VLM_BRAIN_CLAIM_TRACEABILITY_MATRIX_CONTRACT",
    "operator_claim_traceability_matrix",
    "claimTraceabilityMatrixActive: true",
    "comprehensionGateActive: true",
    "evidenceAnchorRequired: true",
    "operatorOnly: true",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "publicClaimAllowed: false",
    "unmappedClaimAllowed: false",
    "releaseCutoverAllowed: false",
    "releasePromotionAllowed: false",
    "publicReadinessSealAllowed: false",
    "finalVerdictAllowed: false",
    "publicBadgeAllowed: false",
    "urgencyCopyAllowed: false",
    "certaintyCopyAllowed: false",
    "accessShortcutAllowed: false",
    "languagePreviewOnly: true",
    "claimReadingProtocol",
    "claimLanes",
    "comprehensionChecks",
  ]) {
    if (!claimSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.015.lib-market-integrity-vlm-brain-legacy-claim-traceability.a001.lib-market-integrity-vlm-brain-legacy-claim-traceability")(
        `lib/market-integrity/vlm-brain-pass266-claim-traceability-matrix.ts: missing PASS266 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass266ClaimTraceabilityMatrix",
    "selectedTilePass266ClaimTraceabilityMatrix",
    'data-vlm-pass266-claim-traceability-matrix="true"',
    "data-vlm-pass266-claim-lane",
    "data-vlm-pass266-comprehension-risk",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.015.lib-market-integrity-vlm-brain-legacy-claim-traceability.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS266 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS266 — AI Brain claim traceability matrix",
    ".shield-vlm-pass266-claim-traceability-matrix",
    "data-vlm-pass266-claim-lane",
    "PASS266 — Lens claim traceability guide",
    ".vlcr-pass266-claim-traceability-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.015.lib-market-integrity-vlm-brain-legacy-claim-traceability.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS266 marker ${marker}.`);
  }
  for (const marker of [
    "PASS266 Lens claim traceability guide",
    "vlcr-pass266-claim-traceability-guide",
    "PASS266 claim traceability matrix",
    "PASS266 Claim-Traceability-Matrix",
    "evidence anchor",
    "Evidence Anchor",
    "claim lane",
    "Claim-Lane",
    "comprehension gate",
    "Comprehension-Gate",
    "surface lock",
    "Surface-Lock",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.015.lib-market-integrity-vlm-brain-legacy-claim-traceability.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS266 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass266-claim-traceability-matrix-comprehension-gate-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "customer-ai.015.lib-market-integrity-vlm-brain-legacy-claim-traceability.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS266 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.015.lib-market-integrity-vlm-brain-legacy-claim-traceability.a006.legacy-ai-brain-claim-traceability-matrix-comprehension")(
    `PASS266 AI Brain claim traceability matrix comprehension gate failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.customer-ai.016");

// guard script marker: verify-pass266-claim-traceability-matrix-comprehension-gate-safety.mjs

// PASS267 Lens / Shield Map / VLM Brain UI screenshot hotfix guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const lensSource = read(
    "components/search/VelmereIntelligenceSearchClient.tsx",
  );
  const shieldMapSource = read(
    "components/market-integrity/ShieldMapClient.tsx",
  );
  for (const marker of [
    "data-vlm-brain-mode={mode}",
    "shield-vlm-detail-depth-note",
    "data-vlm-brain-depth-note={mode}",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.016.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS267 marker ${marker}.`,
      );
  }
  if (modalSource.includes("{tileSourceBadge}"))
    errors.pushWithId.bind(errors, "customer-ai.016.components-market-integrity-tokenriskmodalx-missing-lega.a002.components-market-integrity-tokenriskmodalx-legacy-sourc")(
      "components/market-integrity/TokenRiskModal.tsx: PASS267 source-live tile badge still renders over card data.",
    );
  for (const marker of [
    "PASS267 — user screenshot hotfix",
    ".shield-vlm-tile-deck .shield-vlm-source-badge",
    ".shield-vlm-static-stage .shield-vlm-source-badge",
    '.shield-vlm-detail-portal-root[data-vlm-brain-mode="basic"]',
    '.shield-vlm-detail-portal-root[data-vlm-brain-mode="pro"]',
    ".vis-token-suggest-panel",
    ".shield-map-token-suggest-panel",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.016.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS267 marker ${marker}.`);
  }
  for (const marker of [
    "PASS267 marker: Lens search suggestions mirror Shield-style token rows",
    "lensSuggestionSeeds",
    "vis-token-suggest-panel",
    "vis-suggestion-token-avatar",
    "selectSuggestion(item)",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.016.components-market-integrity-tokenriskmodalx-missing-lega.a004.components-search-velmereintelligencesearchclientx-missi")(
        `components/search/VelmereIntelligenceSearchClient.tsx: missing PASS267 marker ${marker}.`,
      );
  }
  for (const marker of [
    "createPortal",
    "function suggestionGlyph",
    "shield-map-unified-search-shell",
    "shield-map-token-suggest-panel",
    "shield-map-suggestion-avatar",
    "void runInvestigatorScan(null, item.symbol)",
  ]) {
    if (!shieldMapSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.016.components-market-integrity-tokenriskmodalx-missing-lega.a005.components-market-integrity-shieldmapclientx-missing-leg")(
        `components/market-integrity/ShieldMapClient.tsx: missing PASS267 marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass267-lens-shieldmap-brain-ui-hotfix-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "customer-ai.016.components-market-integrity-tokenriskmodalx-missing-lega.a006.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS267 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.016.components-market-integrity-tokenriskmodalx-missing-lega.a007.legacy-lens-shield-map-vlm-brain-ui-hotfix-guard-failed")(
    `PASS267 Lens / Shield Map / VLM Brain UI hotfix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
