import {  errors, packageScriptEvidenceSource, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";


setGuardScope("pf.late-trust-routes.001");

try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const runbookSource = read(
    "lib/market-integrity/vlm-brain-pass256-evidence-runbook.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass256-evidence-runbook-v1",
    "PASS256_VLM_BRAIN_EVIDENCE_RUNBOOK_CONTRACT",
    "operator_evidence_runbook_browser_replay_quarantine",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "browserReplayRequired: true",
    "replayEvidenceAttached: false",
    "exportQuarantine: true",
  ]) {
    if (!runbookSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.001.lib-market-integrity-vlm-brain-legacy-evidence-runbook-m.a001.lib-market-integrity-vlm-brain-legacy-evidence-runbook-m")(
        `lib/market-integrity/vlm-brain-pass256-evidence-runbook.ts: missing PASS256 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass256EvidenceRunbook",
    "selectedTilePass256EvidenceRunbook",
    'data-vlm-pass256-evidence-runbook="true"',
    "data-vlm-pass256-queue-state",
    "data-vlm-pass256-replay-state",
    "data-vlm-pass256-freeze-cell",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.001.lib-market-integrity-vlm-brain-legacy-evidence-runbook-m.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS256 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS256 — AI Brain evidence runbook",
    ".shield-vlm-pass256-evidence-runbook",
    "data-vlm-pass256-queue-state",
    "PASS256 — Lens evidence runbook guide",
    ".vlcr-pass256-runbook-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.001.lib-market-integrity-vlm-brain-legacy-evidence-runbook-m.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS256 marker ${marker}.`);
  }
  for (const marker of [
    "PASS256 Lens evidence runbook guide",
    "vlcr-pass256-runbook-guide",
    "PASS256 evidence runbook",
    "PASS256 Evidence-Runbook",
    "export quarantine",
    "Export-Quarantäne",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.001.lib-market-integrity-vlm-brain-legacy-evidence-runbook-m.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS256 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass256-evidence-runbook-export-quarantine-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "trust.001.lib-market-integrity-vlm-brain-legacy-evidence-runbook-m.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS256 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "trust.001.lib-market-integrity-vlm-brain-legacy-evidence-runbook-m.a006.legacy-ai-brain-evidence-runbook-export-quarantine-guard")(
    `PASS256 AI Brain evidence runbook export quarantine guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-trust-routes.002");

// guard script marker: verify-pass256-evidence-runbook-export-quarantine-safety.mjs

// PASS257 AI Brain evidence SLA timeline exception firewall guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const timelineSource = read(
    "lib/market-integrity/vlm-brain-pass257-evidence-sla-timeline.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass257-evidence-sla-timeline-v1",
    "PASS257_VLM_BRAIN_EVIDENCE_SLA_TIMELINE_CONTRACT",
    "operator_evidence_sla_timeline_exception_firewall",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "exceptionOverrideAllowed: false",
    "releaseFreezeActive: true",
  ]) {
    if (!timelineSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.002.lib-market-integrity-vlm-brain-legacy-evidence-sla-timel.a001.lib-market-integrity-vlm-brain-legacy-evidence-sla-timel")(
        `lib/market-integrity/vlm-brain-pass257-evidence-sla-timeline.ts: missing PASS257 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass257EvidenceSlaTimeline",
    "selectedTilePass257EvidenceSlaTimeline",
    'data-vlm-pass257-evidence-sla-timeline="true"',
    "data-vlm-pass257-sla-tier",
    "data-vlm-pass257-exception-firewall",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.002.lib-market-integrity-vlm-brain-legacy-evidence-sla-timel.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS257 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS257 — AI Brain evidence SLA timeline",
    ".shield-vlm-pass257-evidence-sla",
    "data-vlm-pass257-sla-tier",
    "PASS257 — Lens evidence SLA timeline guide",
    ".vlcr-pass257-sla-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.002.lib-market-integrity-vlm-brain-legacy-evidence-sla-timel.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS257 marker ${marker}.`);
  }
  for (const marker of [
    "PASS257 Lens evidence SLA timeline guide",
    "vlcr-pass257-sla-guide",
    "PASS257 evidence SLA timeline",
    "PASS257 Evidence-SLA-Timeline",
    "exception firewall",
    "Exception-Firewall",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.002.lib-market-integrity-vlm-brain-legacy-evidence-sla-timel.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS257 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass257-evidence-sla-timeline-exception-firewall-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "trust.002.lib-market-integrity-vlm-brain-legacy-evidence-sla-timel.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS257 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "trust.002.lib-market-integrity-vlm-brain-legacy-evidence-sla-timel.a006.legacy-ai-brain-evidence-sla-timeline-exception-firewall")(
    `PASS257 AI Brain evidence SLA timeline exception firewall guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-trust-routes.003");

// guard script marker: verify-pass257-evidence-sla-timeline-exception-firewall-safety.mjs

// PASS258 AI Brain proof receipt lock browser trace pack guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const receiptLockSource = read(
    "lib/market-integrity/vlm-brain-pass258-proof-receipt-lock.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass258-proof-receipt-lock-v1",
    "PASS258_VLM_BRAIN_PROOF_RECEIPT_LOCK_CONTRACT",
    "operator_proof_receipt_lock_browser_trace_pack",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releaseReceiptSigned: false",
    "browserTraceAttached: false",
    "durableSnapshotAttached: false",
    "redactionManifestAttached: false",
    "proofReceiptLockActive: true",
  ]) {
    if (!receiptLockSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.003.lib-market-integrity-vlm-brain-legacy-proof-receipt-lock.a001.lib-market-integrity-vlm-brain-legacy-proof-receipt-lock")(
        `lib/market-integrity/vlm-brain-pass258-proof-receipt-lock.ts: missing PASS258 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass258ProofReceiptLock",
    "selectedTilePass258ProofReceiptLock",
    'data-vlm-pass258-proof-receipt-lock="true"',
    "data-vlm-pass258-proof-receipt",
    "data-vlm-pass258-signoff-state",
    "data-vlm-pass258-browser-trace",
    "data-vlm-pass258-release-lock",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.003.lib-market-integrity-vlm-brain-legacy-proof-receipt-lock.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS258 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS258 — AI Brain proof receipt lock",
    ".shield-vlm-pass258-proof-receipt-lock",
    "data-vlm-pass258-proof-receipt",
    "PASS258 — Lens proof receipt lock guide",
    ".vlcr-pass258-receipt-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.003.lib-market-integrity-vlm-brain-legacy-proof-receipt-lock.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS258 marker ${marker}.`);
  }
  for (const marker of [
    "PASS258 Lens proof receipt lock guide",
    "vlcr-pass258-receipt-guide",
    "PASS258 proof receipt lock",
    "PASS258 Proof-Receipt-Lock",
    "browser trace pack",
    "Browser-Trace-Pack",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.003.lib-market-integrity-vlm-brain-legacy-proof-receipt-lock.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS258 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass258-proof-receipt-lock-browser-trace-pack-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "trust.003.lib-market-integrity-vlm-brain-legacy-proof-receipt-lock.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS258 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "trust.003.lib-market-integrity-vlm-brain-legacy-proof-receipt-lock.a006.legacy-ai-brain-proof-receipt-lock-browser-trace-pack-gu")(
    `PASS258 AI Brain proof receipt lock browser trace pack guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-trust-routes.004");

// guard script marker: verify-pass258-proof-receipt-lock-browser-trace-pack-safety.mjs

// PASS259 AI Brain attestation ledger release freeze guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const ledgerSource = read(
    "lib/market-integrity/vlm-brain-pass259-attestation-ledger.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass259-attestation-ledger-v1",
    "PASS259_VLM_BRAIN_ATTESTATION_LEDGER_CONTRACT",
    "operator_attestation_ledger_release_freeze",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releasePromotionAllowed: false",
    "attestationLedgerActive: true",
    "sourceAttestationReady: false",
    "browserAttestationReady: false",
    "storageAttestationReady: false",
    "redactionAttestationReady: false",
  ]) {
    if (!ledgerSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.004.lib-market-integrity-vlm-brain-legacy-attestation-ledger.a001.lib-market-integrity-vlm-brain-legacy-attestation-ledger")(
        `lib/market-integrity/vlm-brain-pass259-attestation-ledger.ts: missing PASS259 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass259AttestationLedger",
    "selectedTilePass259AttestationLedger",
    'data-vlm-pass259-attestation-ledger="true"',
    "data-vlm-pass259-attestation-state",
    "data-vlm-pass259-freeze-state",
    "data-vlm-pass259-check-state",
    "data-vlm-pass259-trace-state",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.004.lib-market-integrity-vlm-brain-legacy-attestation-ledger.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS259 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS259 — AI Brain attestation ledger",
    ".shield-vlm-pass259-attestation-ledger",
    "data-vlm-pass259-attestation-state",
    "PASS259 — Lens attestation ledger guide",
    ".vlcr-pass259-attestation-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.004.lib-market-integrity-vlm-brain-legacy-attestation-ledger.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS259 marker ${marker}.`);
  }
  for (const marker of [
    "PASS259 Lens attestation ledger guide",
    "vlcr-pass259-attestation-guide",
    "PASS259 attestation ledger",
    "PASS259 Attestation-Ledger",
    "promotion checklist",
    "Promotion-Checklist",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.004.lib-market-integrity-vlm-brain-legacy-attestation-ledger.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS259 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass259-attestation-ledger-release-freeze-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "trust.004.lib-market-integrity-vlm-brain-legacy-attestation-ledger.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS259 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "trust.004.lib-market-integrity-vlm-brain-legacy-attestation-ledger.a006.legacy-ai-brain-attestation-ledger-release-freeze-guard")(
    `PASS259 AI Brain attestation ledger release freeze guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-trust-routes.005");

// guard script marker: verify-pass259-attestation-ledger-release-freeze-safety.mjs

// PASS260 AI Brain release promotion firewall review packet guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const firewallSource = read(
    "lib/market-integrity/vlm-brain-pass260-release-promotion-firewall.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass260-release-promotion-firewall-v1",
    "PASS260_VLM_BRAIN_RELEASE_PROMOTION_FIREWALL_CONTRACT",
    "operator_release_promotion_firewall_review_packet",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releasePromotionAllowed: false",
    "publicReleaseBadgeAllowed: false",
    "finalVerdictAllowed: false",
    "reviewPacketReady: false",
    "promotionFirewallActive: true",
  ]) {
    if (!firewallSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.005.lib-market-integrity-vlm-brain-legacy-release-promotion.a001.lib-market-integrity-vlm-brain-legacy-release-promotion")(
        `lib/market-integrity/vlm-brain-pass260-release-promotion-firewall.ts: missing PASS260 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass260ReleasePromotionFirewall",
    "selectedTilePass260PromotionFirewall",
    'data-vlm-pass260-promotion-firewall="true"',
    "data-vlm-pass260-promotion-lane",
    "data-vlm-pass260-review-packet",
    "data-vlm-pass260-customer-freeze",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.005.lib-market-integrity-vlm-brain-legacy-release-promotion.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS260 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS260 — AI Brain release promotion firewall",
    ".shield-vlm-pass260-promotion-firewall",
    "data-vlm-pass260-promotion-lane",
    "PASS260 — Lens promotion firewall guide",
    ".vlcr-pass260-promotion-firewall-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.005.lib-market-integrity-vlm-brain-legacy-release-promotion.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS260 marker ${marker}.`);
  }
  for (const marker of [
    "PASS260 Lens promotion firewall guide",
    "vlcr-pass260-promotion-firewall-guide",
    "PASS260 promotion firewall",
    "PASS260 Promotion-Firewall",
    "release badge lock",
    "Release-Badge-Lock",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.005.lib-market-integrity-vlm-brain-legacy-release-promotion.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS260 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass260-release-promotion-firewall-review-packet-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "trust.005.lib-market-integrity-vlm-brain-legacy-release-promotion.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS260 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "trust.005.lib-market-integrity-vlm-brain-legacy-release-promotion.a006.legacy-ai-brain-release-promotion-firewall-review-packet")(
    `PASS260 AI Brain release promotion firewall review packet guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.late-trust-routes.006");

// guard script marker: verify-pass260-release-promotion-firewall-review-packet-safety.mjs

// PASS261 AI Brain release cutover control rollback vault guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const cutoverSource = read(
    "lib/market-integrity/vlm-brain-pass261-release-cutover-control.ts",
  );
  const lensSource = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "vlm-brain-pass261-release-cutover-control-v1",
    "PASS261_VLM_BRAIN_RELEASE_CUTOVER_CONTROL_CONTRACT",
    "operator_release_cutover_control_rollback_vault",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "releasePromotionAllowed: false",
    "releaseCutoverAllowed: false",
    "publicReadinessSealAllowed: false",
    "finalVerdictAllowed: false",
    "rollbackVaultRequired: true",
    "cutoverControlActive: true",
  ]) {
    if (!cutoverSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.006.lib-market-integrity-vlm-brain-legacy-release-cutover-co.a001.lib-market-integrity-vlm-brain-legacy-release-cutover-co")(
        `lib/market-integrity/vlm-brain-pass261-release-cutover-control.ts: missing PASS261 marker ${marker}.`,
      );
  }
  for (const marker of [
    "buildVlmBrainPass261ReleaseCutoverControl",
    "selectedTilePass261CutoverControl",
    'data-vlm-pass261-cutover-control="true"',
    "data-vlm-pass261-cutover-lane",
    "data-vlm-pass261-rollback-state",
    "data-vlm-pass261-readiness-seal",
  ]) {
    if (!modalSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.006.lib-market-integrity-vlm-brain-legacy-release-cutover-co.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS261 marker ${marker}.`,
      );
  }
  for (const marker of [
    "PASS261 — AI Brain release cutover control",
    ".shield-vlm-pass261-cutover-control",
    "data-vlm-pass261-cutover-lane",
    "PASS261 — Lens cutover control guide",
    ".vlcr-pass261-cutover-control-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.006.lib-market-integrity-vlm-brain-legacy-release-cutover-co.a003.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS261 marker ${marker}.`);
  }
  for (const marker of [
    "PASS261 Lens cutover control guide",
    "vlcr-pass261-cutover-control-guide",
    "PASS261 cutover control",
    "PASS261 Cutover-Control",
    "rollback vault",
    "Rollback-Vault",
    "readiness seals",
    "Readiness-Seals",
  ]) {
    if (!lensSource.includes(marker))
      errors.pushWithId.bind(errors, "trust.006.lib-market-integrity-vlm-brain-legacy-release-cutover-co.a004.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS261 Lens marker ${marker}.`,
      );
  }
  if (
    !packageScriptEvidenceSource.includes(
      "verify-pass261-release-cutover-control-rollback-vault-safety.mjs",
    )
  )
    errors.pushWithId.bind(errors, "trust.006.lib-market-integrity-vlm-brain-legacy-release-cutover-co.a005.packageon-missing-legacy-guard-script-marker")("package.json: missing PASS261 guard script marker.");
} catch (error) {
  errors.pushWithId.bind(errors, "trust.006.lib-market-integrity-vlm-brain-legacy-release-cutover-co.a006.legacy-ai-brain-release-cutover-control-rollback-vault-g")(
    `PASS261 AI Brain release cutover control rollback vault guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
