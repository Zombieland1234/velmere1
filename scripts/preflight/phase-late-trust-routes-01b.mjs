import {  errors, packageScriptEvidenceSource, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.late-trust-routes.007");

// guard script marker: verify-pass261-release-cutover-control-rollback-vault-safety.mjs

// PASS262 AI Brain release rehearsal matrix surface locks guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const rehearsalSource = read(
    "lib/market-integrity/vlm-brain-pass262-release-rehearsal-matrix.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass262-release-rehearsal-matrix-v1",
    "PASS262_VLM_BRAIN_RELEASE_REHEARSAL_MATRIX_CONTRACT",
    "operator_release_rehearsal_matrix_dry_run",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releaseCutoverAllowed: false",
    "releasePromotionAllowed: false",
    "publicReadinessSealAllowed: false",
    "rehearsalPromotionAllowed: false",
    "finalVerdictAllowed: false",
    "rollbackDrillRequired: true",
    "dryRunOnly: true",
  ]) {
    if (!rehearsalSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.007.lib-market-integrity-vlm-brain-legacy-release-rehearsal.a001.lib-market-integrity-vlm-brain-legacy-release-rehearsal")(
        `lib/market-integrity/vlm-brain-pass262-release-rehearsal-matrix.ts: missing PASS262 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass262ReleaseRehearsalMatrix",
    "selectedTilePass262ReleaseRehearsalMatrix",
    'data-vlm-pass262-release-rehearsal="true"',
    "data-vlm-pass262-rehearsal-lane",
    "data-vlm-pass262-signoff-state",
    "data-vlm-pass262-surface-lock",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.007.lib-market-integrity-vlm-brain-legacy-release-rehearsal.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS262 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS262 — AI Brain release rehearsal matrix",
    ".shield-vlm-pass262-release-rehearsal",
    "data-vlm-pass262-rehearsal-lane",
    "PASS262 — Lens release rehearsal guide",
    ".vlcr-pass262-release-rehearsal-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.007.lib-market-integrity-vlm-brain-legacy-release-rehearsal.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS262 marker ${marker}.`);
  }
  for (const marker of [
    "PASS262 Lens release rehearsal guide",
    "vlcr-pass262-release-rehearsal-guide",
    "PASS262 release rehearsal",
    "PASS262 Release-Rehearsal",
    "dry-run evidence",
    "Dry-Run-Evidenz",
    "rollback drill",
    "Rollback-Drill",
    "surface locks",
    "Surface-Locks",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.007.lib-market-integrity-vlm-brain-legacy-release-rehearsal.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS262 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass262-release-rehearsal-matrix-surface-locks-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "trust.007.lib-market-integrity-vlm-brain-legacy-release-rehearsal.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS262 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "trust.007.lib-market-integrity-vlm-brain-legacy-release-rehearsal.a006.legacy-ai-brain-release-rehearsal-matrix-surface-locks-g")(
    `PASS262 AI Brain release rehearsal matrix surface locks guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
