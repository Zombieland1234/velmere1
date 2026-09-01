import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.late-ai-ui.009");

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
      errors.pushWithId.bind(errors, "ai-ui.009.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
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
      errors.pushWithId.bind(errors, "ai-ui.009.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-release-triage-board-miss")(
        `lib/market-integrity/vlm-brain-release-triage-board.ts: missing marker ${marker}.`,
      );
  for (const marker of [
    "PASS244_VLM_BRAIN_OPERATOR_HANDOFF_VAULT_CONTRACT",
    "sourceSnapshotWriteReady: false",
    "caseTimelineWriteReady: false",
    "rawPayloadAllowed: false",
  ])
    if (!vaultSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.009.components-market-integrity-tokenriskmodalx-missing-lega.a003.lib-market-integrity-vlm-brain-operator-handoff-vault-mi")(
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
      errors.pushWithId.bind(errors, "ai-ui.009.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-market-integrity-vlm-brain-browser-replay-script-mis")(
        `lib/market-integrity/vlm-brain-browser-replay-script.ts: missing marker ${marker}.`,
      );
  if (
    !cssSource.includes(
      "PASS243–PASS245 — AI Brain real three-pass release triage",
    )
  )
    errors.pushWithId.bind(errors, "ai-ui.009.components-market-integrity-tokenriskmodalx-missing-lega.a005.app-globals-css-missing-legacy-legacy-real-three-pass-cs")(
      "app/globals.css: missing PASS243-PASS245 real three-pass CSS marker.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.009.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-legacy-real-three-pass-guard-failed-value")(
    `PASS243-PASS245 real three-pass guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-ai-ui.010");

// guard script marker: verify-pass243-245-ai-brain-real-three-pass-safety.mjs

// PASS252 AI Brain release cockpit guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const cockpitSource = read(
    "lib/market-integrity/vlm-brain-release-cockpit.ts",
  );
  for (const marker of [
    "vlm-brain-release-cockpit-v1-pass252",
    "operator_release_control_center",
    "PASS252_VLM_BRAIN_RELEASE_COCKPIT_CONTRACT",
    "customerExportAllowed: false",
    "binaryPdfAllowed: false",
    "rawPayloadAllowed: false",
    "browserQaRequired: true",
  ]) {
    if (!cockpitSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.010.lib-market-integrity-vlm-brain-release-cockpit-missing-l.a001.lib-market-integrity-vlm-brain-release-cockpit-missing-l")(
        `lib/market-integrity/vlm-brain-release-cockpit.ts: missing PASS252 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainReleaseCockpit",
    "selectedTileReleaseCockpit",
    'data-vlm-release-cockpit="pass252"',
    "data-vlm-release-cockpit-decision",
    "data-vlm-release-cockpit-lane",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "ai-ui.010.lib-market-integrity-vlm-brain-release-cockpit-missing-l.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS252 marker ${marker}.`,
      );
  }
  if (!cssSource.includes("PASS252 — AI Brain release cockpit"))
    errors.pushWithId.bind(errors, "ai-ui.010.lib-market-integrity-vlm-brain-release-cockpit-missing-l.a003.app-globals-css-missing-legacy-release-cockpit-css-marke")("app/globals.css: missing PASS252 release cockpit CSS marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "ai-ui.010.lib-market-integrity-vlm-brain-release-cockpit-missing-l.a004.legacy-ai-brain-release-cockpit-guard-failed-value")(
    `PASS252 AI Brain release cockpit guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
