import {  errors, packageScriptEvidenceSource, read } from "./context.mjs";
import { setGuardScope } from "./context.mjs";

setGuardScope("pf.late-ai-ui.011");
// guard script marker: verify-pass252-ai-brain-release-cockpit-safety.mjs

// PASS254 AI Brain release cockpit source-ledger handoff guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-release-cockpit-source-ledger-handoff.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-release-cockpit-source-ledger-handoff-v1-pass254",
    "PASS254_VLM_BRAIN_RELEASE_COCKPIT_SOURCE_LEDGER_HANDOFF_CONTRACT",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "browserQaRequired: true",
  ]) {
    if (!contractSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.011.lib-market-integrity-vlm-brain-release-cockpit-source-le.a001.lib-market-integrity-vlm-brain-release-cockpit-source-le")(
        `lib/market-integrity/vlm-brain-release-cockpit-source-ledger-handoff.ts: missing PASS254 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainReleaseCockpitSourceLedgerHandoff",
    "selectedTilePass254ReleaseHandoff",
    'data-vlm-pass254-release-handoff-safety="true"',
    "data-vlm-pass254-release-lane",
    "data-vlm-pass254-release-priority",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.011.lib-market-integrity-vlm-brain-release-cockpit-source-le.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS254 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS254 — AI Brain release cockpit source-ledger handoff safety",
    ".shield-vlm-pass254-handoff",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.011.lib-market-integrity-vlm-brain-release-cockpit-source-le.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS254 marker ${marker}.`);
  }
  for (const marker of [
    "PASS254 Lens handoff safety gates",
    "pewność źródeł",
    "Quellenvertrauen",
    "source confidence",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.011.lib-market-integrity-vlm-brain-release-cockpit-source-le.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS254 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass254-release-cockpit-source-ledger-handoff-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "ai-ui.011.lib-market-integrity-vlm-brain-release-cockpit-source-le.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS254 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.011.lib-market-integrity-vlm-brain-release-cockpit-source-le.a006.legacy-ai-brain-release-cockpit-source-ledger-handoff-gu")(
    `PASS254 AI Brain release cockpit source-ledger handoff guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.late-ai-ui.012");
// guard script marker: verify-pass254-release-cockpit-source-ledger-handoff-safety.mjs

// PASS255 AI Brain action router browser replay export freeze guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const actionRouterSource = read(
    "lib/market-integrity/vlm-brain-pass255-action-router.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass255-action-router-v1",
    "PASS255_VLM_BRAIN_ACTION_ROUTER_CONTRACT",
    "operator_action_router_browser_replay_export_freeze",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "exportFreeze: true",
    "walletSecretAllowed: false",
    "browserReplayRequired: true",
  ]) {
    if (!actionRouterSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.012.lib-market-integrity-vlm-brain-legacy-action-router-miss.a001.lib-market-integrity-vlm-brain-legacy-action-router-miss")(
        `lib/market-integrity/vlm-brain-pass255-action-router.ts: missing PASS255 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass255ActionRouter",
    "selectedTilePass255ActionRouter",
    'data-vlm-pass255-action-router="true"',
    "data-vlm-pass255-action-phase",
    "data-vlm-pass255-replay-artifact",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.012.lib-market-integrity-vlm-brain-legacy-action-router-miss.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS255 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS255 — AI Brain action router",
    ".shield-vlm-pass255-action-router",
    "data-vlm-pass255-action-phase",
    "PASS255 — Lens action-router guide",
    ".vlcr-pass255-action-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.012.lib-market-integrity-vlm-brain-legacy-action-router-miss.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS255 marker ${marker}.`);
  }
  for (const marker of [
    "PASS255 Lens action router guide",
    "vlcr-pass255-action-guide",
    "evidence intake",
    "Browser-Replay",
    "Velmère Report-Kapsel",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.012.lib-market-integrity-vlm-brain-legacy-action-router-miss.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS255 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass255-action-router-browser-replay-export-freeze-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "ai-ui.012.lib-market-integrity-vlm-brain-legacy-action-router-miss.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS255 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.012.lib-market-integrity-vlm-brain-legacy-action-router-miss.a006.legacy-ai-brain-action-router-browser-replay-export-free")(
    `PASS255 AI Brain action router browser replay export freeze guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
