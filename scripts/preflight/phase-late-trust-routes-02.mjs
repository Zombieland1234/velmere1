import {  errors, packageScriptEvidenceSource, read } from "./context.mjs";
import { setGuardScope } from "./context.mjs";

setGuardScope("pf.late-trust-routes.008");
// guard script marker: verify-pass262-release-rehearsal-matrix-surface-locks-safety.mjs

// PASS263 AI Brain release candidate trust board guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const candidateSource = read(
    "lib/market-integrity/vlm-brain-pass263-release-candidate-trust-board.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass263-release-candidate-trust-board-v1",
    "PASS263_VLM_BRAIN_RELEASE_CANDIDATE_TRUST_BOARD_CONTRACT",
    "operator_release_candidate_trust_board",
    "candidateBoardActive: true",
    "operatorOnly: true",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releaseCutoverAllowed: false",
    "releasePromotionAllowed: false",
    "publicReadinessSealAllowed: false",
    "finalVerdictAllowed: false",
    "trustCuePublicReady: false",
    "copyPsychologySafe: true",
  ]) {
    if (!candidateSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.008.lib-market-integrity-vlm-brain-legacy-release-candidate.a001.lib-market-integrity-vlm-brain-legacy-release-candidate")(
        `lib/market-integrity/vlm-brain-pass263-release-candidate-trust-board.ts: missing PASS263 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass263ReleaseCandidateTrustBoard",
    "selectedTilePass263CandidateTrustBoard",
    'data-vlm-pass263-candidate-trust-board="true"',
    "data-vlm-pass263-candidate-lane",
    "data-vlm-pass263-trust-cue",
    "data-vlm-pass263-surface-lock",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.008.lib-market-integrity-vlm-brain-legacy-release-candidate.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS263 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS263 — AI Brain release candidate trust board",
    ".shield-vlm-pass263-candidate-trust-board",
    "data-vlm-pass263-candidate-lane",
    "PASS263 — Lens candidate trust board guide",
    ".vlcr-pass263-candidate-trust-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.008.lib-market-integrity-vlm-brain-legacy-release-candidate.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS263 marker ${marker}.`);
  }
  for (const marker of [
    "PASS263 Lens candidate trust board guide",
    "vlcr-pass263-candidate-trust-guide",
    "PASS263 candidate trust board",
    "PASS263 Candidate-Trust-Board",
    "trust cues",
    "Trust-Cues",
    "copy boundary",
    "Copy-Grenze",
    "proof gaps",
    "Proof-Gaps",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.008.lib-market-integrity-vlm-brain-legacy-release-candidate.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS263 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass263-release-candidate-trust-board-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "trust.008.lib-market-integrity-vlm-brain-legacy-release-candidate.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS263 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "trust.008.lib-market-integrity-vlm-brain-legacy-release-candidate.a006.legacy-ai-brain-release-candidate-trust-board-guard-fail")(
    `PASS263 AI Brain release candidate trust board guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.late-trust-routes.009");
// guard script marker: verify-pass263-release-candidate-trust-board-safety.mjs

// PASS264 AI Brain trust narrative guard dark-pattern firewall
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const narrativeSource = read(
    "lib/market-integrity/vlm-brain-pass264-trust-narrative-guard.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass264-trust-narrative-guard-v1",
    "PASS264_VLM_BRAIN_TRUST_NARRATIVE_GUARD_CONTRACT",
    "operator_trust_narrative_guard",
    "narrativeGuardActive: true",
    "trustPsychologySafe: true",
    "operatorOnly: true",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releaseCutoverAllowed: false",
    "releasePromotionAllowed: false",
    "publicReadinessSealAllowed: false",
    "finalVerdictAllowed: false",
    "publicBadgeAllowed: false",
    "urgencyCopyAllowed: false",
    "certaintyCopyAllowed: false",
    "accessShortcutAllowed: false",
    "darkPatternChecks",
  ]) {
    if (!narrativeSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.009.lib-market-integrity-vlm-brain-legacy-trust-narrative-gu.a001.lib-market-integrity-vlm-brain-legacy-trust-narrative-gu")(
        `lib/market-integrity/vlm-brain-pass264-trust-narrative-guard.ts: missing PASS264 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass264TrustNarrativeGuard",
    "selectedTilePass264TrustNarrativeGuard",
    'data-vlm-pass264-trust-narrative-guard="true"',
    "data-vlm-pass264-narrative-stage",
    "data-vlm-pass264-dark-pattern",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.009.lib-market-integrity-vlm-brain-legacy-trust-narrative-gu.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS264 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS264 — AI Brain trust narrative guard",
    ".shield-vlm-pass264-trust-narrative-guard",
    "data-vlm-pass264-narrative-stage",
    "PASS264 — Lens trust narrative guide",
    ".vlcr-pass264-trust-narrative-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.009.lib-market-integrity-vlm-brain-legacy-trust-narrative-gu.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS264 marker ${marker}.`);
  }
  for (const marker of [
    "PASS264 Lens trust narrative guide",
    "vlcr-pass264-trust-narrative-guide",
    "PASS264 trust narrative guard",
    "PASS264 Trust-Narrative-Guard",
    "context first",
    "Kontext zuerst",
    "evidence status",
    "Evidenzstatus",
    "dark-pattern firewall",
    "Dark-Pattern-Firewall",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.009.lib-market-integrity-vlm-brain-legacy-trust-narrative-gu.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS264 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass264-trust-narrative-guard-dark-pattern-firewall-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "trust.009.lib-market-integrity-vlm-brain-legacy-trust-narrative-gu.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS264 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "trust.009.lib-market-integrity-vlm-brain-legacy-trust-narrative-gu.a006.legacy-ai-brain-trust-narrative-guard-dark-pattern-firew")(
    `PASS264 AI Brain trust narrative guard dark-pattern firewall failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.late-trust-routes.010");
// guard script marker: verify-pass264-trust-narrative-guard-dark-pattern-firewall-safety.mjs

// PASS474 duplicate response-key / object-spread ordering guard
try {
  const spreadContracts = [
    {
      file: "app/api/market-integrity/ai-human-copy/route.ts",
      spread: "...copyEngine",
      property: "boundary:",
    },
    {
      file: "app/api/market-integrity/cross-asset/route.ts",
      spread: "...radar",
      property: "boundary:",
    },
    {
      file: "app/api/market-integrity/exchange-health/route.ts",
      spread: "...exchangeHealth",
      property: "boundary:",
    },
  ];

  for (const contract of spreadContracts) {
    const source = read(contract.file);
    const spreadIndex = source.indexOf(contract.spread);
    const propertyIndex = source.indexOf(contract.property);
    if (spreadIndex < 0 || propertyIndex < 0) {
      errors.pushWithId.bind(errors, "trust.010.value-missing-legacy-response-contract-marker.a001.value-missing-legacy-response-contract-marker")(
        `${contract.file}: missing PASS474 response contract marker.`,
      );
      continue;
    }
    if (propertyIndex < spreadIndex) {
      errors.pushWithId.bind(errors, "trust.010.value-missing-legacy-response-contract-marker.a002.value-value-must-be-declared-after-value-so-the-explicit")(
        `${contract.file}: ${contract.property.slice(0, -1)} must be declared after ${contract.spread} so the explicit API safety boundary wins without TS2783 duplicate-key failure.`,
      );
    }
  }
} catch (error) {
  errors.pushWithId.bind(errors, "trust.010.value-missing-legacy-response-contract-marker.a003.legacy-duplicate-response-key-guard-failed-value")(
    `PASS474 duplicate response-key guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
