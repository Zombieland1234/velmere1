import {  errors, packageScriptEvidenceSource, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.customer-ai.008");

// guard script marker: verify-pass243-245-ai-brain-real-three-pass-safety.mjs

// PASS246-PASS251 AI Brain real six-pass guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const files = [
    "lib/market-integrity/vlm-brain-export-authorization-gate.ts",
    "lib/market-integrity/vlm-brain-browser-evidence-collector.ts",
    "lib/market-integrity/vlm-brain-adapter-readiness-scheduler.ts",
    "lib/market-integrity/vlm-brain-customer-brief-builder.ts",
    "lib/market-integrity/vlm-brain-wallet-session-policy.ts",
    "lib/market-integrity/vlm-brain-release-readiness-orchestrator.ts",
  ];
  for (const file of files) {
    const source = read(file);
    if (!source.includes("CONTRACT = true"))
      errors.pushWithId.bind(errors, "customer-ai.008.value-missing-legacy-legacy-contract-export-marker.a001.value-missing-legacy-legacy-contract-export-marker")(`${file}: missing PASS246-PASS251 contract export marker.`);
  }
  const markers = [
    "buildVlmBrainExportAuthorizationGate",
    "buildVlmBrainBrowserEvidenceCollector",
    "buildVlmBrainAdapterReadinessScheduler",
    "buildVlmBrainCustomerBriefBuilder",
    "buildVlmBrainWalletSessionPolicy",
    "buildVlmBrainReleaseReadinessOrchestrator",
    'data-vlm-export-authorization-gate="pass246"',
    'data-vlm-browser-evidence-collector="pass247"',
    'data-vlm-adapter-readiness-scheduler="pass248"',
    'data-vlm-customer-brief-builder="pass249"',
    'data-vlm-wallet-session-policy="pass250"',
    'data-vlm-release-readiness-orchestrator="pass251"',
  ];
  for (const marker of markers)
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.008.value-missing-legacy-legacy-contract-export-marker.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS246-PASS251 marker ${marker}.`,
      );
  if (!cssSource.includes("PASS246–PASS251 — AI Brain real six-pass"))
    errors.pushWithId.bind(errors, "customer-ai.008.value-missing-legacy-legacy-contract-export-marker.a003.app-globals-css-missing-legacy-legacy-css-marker")("app/globals.css: missing PASS246-PASS251 CSS marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.008.value-missing-legacy-legacy-contract-export-marker.a004.legacy-legacy-ai-brain-real-six-pass-guard-failed-value")(
    `PASS246-PASS251 AI Brain real six-pass guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.customer-ai.009");

// guard script marker: verify-pass246-251-ai-brain-real-six-pass-safety.mjs

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
      errors.pushWithId.bind(errors, "customer-ai.009.lib-market-integrity-vlm-brain-release-cockpit-source-le.a001.lib-market-integrity-vlm-brain-release-cockpit-source-le")(
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
      errors.pushWithId.bind(errors, "customer-ai.009.lib-market-integrity-vlm-brain-release-cockpit-source-le.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS254 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS254 — AI Brain release cockpit source-ledger handoff safety",
    ".shield-vlm-pass254-handoff",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.009.lib-market-integrity-vlm-brain-release-cockpit-source-le.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS254 marker ${marker}.`);
  }
  for (const marker of [
    "PASS254 Lens handoff safety gates",
    "pewność źródeł",
    "Quellenvertrauen",
    "source confidence",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "customer-ai.009.lib-market-integrity-vlm-brain-release-cockpit-source-le.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS254 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass254-release-cockpit-source-ledger-handoff-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "customer-ai.009.lib-market-integrity-vlm-brain-release-cockpit-source-le.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS254 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "customer-ai.009.lib-market-integrity-vlm-brain-release-cockpit-source-le.a006.legacy-ai-brain-release-cockpit-source-ledger-handoff-gu")(
    `PASS254 AI Brain release cockpit source-ledger handoff guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
