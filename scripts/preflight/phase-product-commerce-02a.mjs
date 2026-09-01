import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";


setGuardScope("pf.product-commerce.013");

// guard script marker: verify-pass195-home-locale-runtime-hotfix-safety.mjs
// PASS195

// PASS194 Orbit 360 modal cleanup + Lens descriptive cards guard
try {
  const tokenRiskModalSource = read(
    "components/market-integrity/TokenRiskModal.tsx",
  );
  const marketClientSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const lensRouterSource = read(
    "components/search/VelmereLensCommandRouter.tsx",
  );
  const cssSource = read("app/globals.css");
  const matrixSource = read("VELMERE_PASS194_FULL_MASTER_PROGRESS_MATRIX.md");
  const unifiedSourceSpineReplacement =
    tokenRiskModalSource.includes("UnifiedAssetModalShell") &&
    tokenRiskModalSource.includes("detailsSlot=") &&
    tokenRiskModalSource.includes("sourceContract.aggregateState");
  for (const needle of [
    'data-chart-gesture-surface="pan-pinch-wheel"',
    "setChartZoom",
    "Evidence Board hidden for now",
    'setActiveCommand("deck")',
    "shield-vlm-detail-panel-popup",
    "shield-mode-guide-popup",
  ]) {
    if (!tokenRiskModalSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.013.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS194 modal marker ${needle}.`,
      );
  }
  if (!unifiedSourceSpineReplacement && !tokenRiskModalSource.includes("shield-source-spine-panel hidden")) {
    errors.pushWithId.bind(errors, "commerce.013.components-market-integrity-tokenriskmodalx-missing-lega.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
      "components/market-integrity/TokenRiskModal.tsx: missing PASS194 modal marker shield-source-spine-panel hidden or unified source-state details replacement.",
    );
  }
  for (const needle of [
    "PASS194 · full-screen Orbit 360 hotfix",
    ".shield-vlm-detail-panel-popup",
    ".shield-mode-guide-popup",
    ".shield-vlm-motion-toggle-mini button:not(.is-active)",
    ".vlcr-action-row",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.013.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS194 CSS marker ${needle}.`);
  }
  for (const needle of [
    "id?: string",
    "name?: string",
    "knownTokenLogo(symbol, id, name)",
    "<TokenAvatar image={item.image} symbol={item.symbol} id={item.id} name={item.name} />",
  ]) {
    if (!marketClientSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.013.components-market-integrity-tokenriskmodalx-missing-lega.a004.components-market-integrity-marketintegrityclientx-missi")(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS194 logo marker ${needle}.`,
      );
  }
  for (const needle of [
    "Lens cards are descriptive only",
    "Wyszukiwarka Velmère zbiera token",
    "Kapsuła raportu Velmère",
  ]) {
    if (!lensRouterSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.013.components-market-integrity-tokenriskmodalx-missing-lega.a005.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS194 Lens marker ${needle}.`,
      );
  }
  if (
    lensRouterSource.includes("<Link href={route.href}") ||
    lensRouterSource.includes("<a href={route.reportHref}")
  )
    errors.pushWithId.bind(errors, "commerce.013.components-market-integrity-tokenriskmodalx-missing-lega.a006.components-search-velmerelenscommandrouterx-legacy-lens")(
      "components/search/VelmereLensCommandRouter.tsx: PASS194 Lens cards still render action buttons.",
    );
  for (const needle of [
    "Token chart drag UX",
    "Token modal mode info popup",
    "VLM mode return-to-chart",
    "Selected tile popup readability",
    "Lens card clutter",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.013.components-market-integrity-tokenriskmodalx-missing-lega.a007.velmere-legacy-full-master-progress-matrix-md-missing-fu")(
        `VELMERE_PASS194_FULL_MASTER_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.013.components-market-integrity-tokenriskmodalx-missing-lega.a008.legacy-orbit360-modal-lens-polish-guard-failed-value")(
    `PASS194 Orbit360/modal/Lens polish guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.014");

// guard script marker: verify-pass194-orbit360-modal-lens-polish-safety.mjs
// PASS194

// PASS193 VLM/Lens/security runtime hotfix guard
try {
  const securityTrustPageSource = read(
    "components/security/SecurityTrustPage.tsx",
  );
  const tokenRiskModalSource = read(
    "components/market-integrity/TokenRiskModal.tsx",
  );
  const marketClientSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const lensRouterSource = read(
    "components/search/VelmereLensCommandRouter.tsx",
  );
  const lensRouteMapSource = read("lib/search/velmere-lens-route-map.ts");
  const lensReportRouteSource = read("app/api/search/lens-report/route.ts");
  const cssSource = read("app/globals.css");
  const matrixSource = read("VELMERE_PASS193_FULL_MASTER_PROGRESS_MATRIX.md");
  if (!securityTrustPageSource.includes("data-pass318-security-public-note")) {
    for (const needle of [
      "import SecurityOperationsChecklistPanel",
      "<SecurityOperationsChecklistPanel locale={safeLocale} />",
    ]) {
      if (!securityTrustPageSource.includes(needle))
        errors.pushWithId.bind(errors, "commerce.014.components-security-securitytrustpagex-missing-legacy-ru.a001.components-security-securitytrustpagex-missing-legacy-ru")(
          `components/security/SecurityTrustPage.tsx: missing PASS193 runtime import marker ${needle}.`,
        );
    }
  }
  for (const needle of [
    "orbitZoom",
    "handleOrbitWheel",
    "shield-vlm-zoom-controls",
    "--vlm-static-transform",
    "translate(-8%, -50%)",
    "translate(-92%, -50%)",
  ]) {
    if (!tokenRiskModalSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.014.components-security-securitytrustpagex-missing-legacy-ru.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS193 VLM marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS193 · VLM Brain viewport expansion",
    ".shield-vlm-zoom-controls",
    ".shield-vlm-static-stage",
    ".vlcr-report-preview",
    ".shield-token-search-suggest-panel",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.014.components-security-securitytrustpagex-missing-legacy-ru.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS193 CSS marker ${needle}.`);
  }
  for (const needle of [
    "solana",
    "bonk",
    "shield-suggestion-token-avatar",
    "token suggestions · logo aware",
  ]) {
    if (!marketClientSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.014.components-security-securitytrustpagex-missing-legacy-ru.a004.components-market-integrity-marketintegrityclientx-missi")(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS193 logo marker ${needle}.`,
      );
  }
  for (const needle of [
    "reportHref",
    "reportTitle",
    "mode=shield",
    "mode=contract",
    "source_ledger",
  ]) {
    if (!lensRouteMapSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.014.components-security-securitytrustpagex-missing-legacy-ru.a005.lib-search-velmere-lens-route-map-missing-legacy-route-r")(
        `lib/search/velmere-lens-route-map.ts: missing PASS193 route/report marker ${needle}.`,
      );
  }
  for (const needle of [
    "vlcr-action-row",
    "vlcr-report-preview",
    "c.previewBody",
    "route.reportHref",
  ]) {
    if (!lensRouterSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.014.components-security-securitytrustpagex-missing-legacy-ru.a006.components-search-velmerelenscommandrouterx-missing-lega")(
        `components/search/VelmereLensCommandRouter.tsx: missing PASS193 report UI marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmere-lens",
    "PDF-ready evidence note",
    "content-disposition",
    "not a safety certificate",
    "escapeHtml",
  ]) {
    if (!lensReportRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.014.components-security-securitytrustpagex-missing-legacy-ru.a007.app-api-search-lens-report-route-missing-legacy-report-r")(
        `app/api/search/lens-report/route.ts: missing PASS193 report route marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityOperationsChecklistPanel runtime hotfix",
    "VLM Brain window containment",
    "Evidence Board split lanes",
    "Velmère Lens report preview",
    "Search suggestions logo fallback",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.014.components-security-securitytrustpagex-missing-legacy-ru.a008.velmere-legacy-full-master-progress-matrix-md-missing-le")(
        `VELMERE_PASS193_FULL_MASTER_PROGRESS_MATRIX.md: missing PASS193 full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.014.components-security-securitytrustpagex-missing-legacy-ru.a009.legacy-vlm-lens-security-hotfix-guard-failed-value")(
    `PASS193 VLM/Lens/security hotfix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.product-commerce.015");

// guard script marker: verify-pass193-vlm-lens-security-hotfix-safety.mjs
// PASS193

// PASS192 payment runtime evidence capture + Stripe webhook replay QA ledger guard
try {
  const paymentEvidenceSource = read(
    "lib/security/payment-runtime-evidence.ts",
  );
  const stripeReplaySource = read("lib/security/stripe-webhook-replay-qa.ts");
  const evidenceRouteSource = read(
    "app/api/security/payment-runtime-evidence/route.ts",
  );
  const replayRouteSource = read(
    "app/api/security/stripe-webhook-replay-qa/route.ts",
  );
  const paymentReviewSource = read("lib/security/payment-webhook-security.ts");
  const releaseGateSource = read("lib/security/security-release-gate.ts");
  const runtimeQaSource = read("lib/security/security-runtime-qa.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const operationsRouteSource = read(
    "app/api/security/operations-checklist/route.ts",
  );
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const evidenceDocSource = read(
    "docs/security/PAYMENT_RUNTIME_EVIDENCE_CAPTURE.md",
  );
  const replayDocSource = read(
    "docs/security/STRIPE_WEBHOOK_REPLAY_QA_LEDGER.md",
  );
  const matrixSource = read("VELMERE_PASS192_FULL_MASTER_PROGRESS_MATRIX.md");
  for (const needle of [
    "PaymentRuntimeEvidenceRecord",
    "recordPaymentRuntimeEvidence",
    "buildPaymentRuntimeEvidenceSnapshot",
    "cleanText",
    "redacted-card-like",
  ]) {
    if (!paymentEvidenceSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a001.lib-security-payment-runtime-evidence-missing-legacy-evi")(
        `lib/security/payment-runtime-evidence.ts: missing PASS192 evidence marker ${needle}.`,
      );
  }
  for (const needle of [
    "stripeWebhookReplayScenarios",
    "recordStripeWebhookReplayEvidence",
    "buildStripeWebhookReplayQaSnapshot",
    "duplicate-replay",
    "unsupported-signed-event",
  ]) {
    if (!stripeReplaySource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a002.lib-security-stripe-webhook-replay-qa-missing-legacy-rep")(
        `lib/security/stripe-webhook-replay-qa.ts: missing PASS192 replay marker ${needle}.`,
      );
  }
  for (const source of [evidenceRouteSource, replayRouteSource]) {
    for (const needle of [
      "applyApiAbuseShield",
      "verifySecurityAdminToken",
      "security:events",
      "payloadTooLarge",
      "POST",
      "GET",
    ]) {
      if (!source.includes(needle))
        errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a003.legacy-admin-gated-payment-evidence-replay-route-missing")(
          `PASS192 admin-gated payment evidence/replay route missing ${needle}.`,
        );
    }
  }
  for (const needle of [
    "buildPaymentRuntimeEvidenceSnapshot",
    "buildStripeWebhookReplayQaSnapshot",
    "runtimeEvidence",
    "replayQa",
  ]) {
    if (!paymentReviewSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a004.lib-security-payment-webhook-security-missing-legacy-mar")(
        `lib/security/payment-webhook-security.ts: missing PASS192 marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentRuntimeEvidenceSnapshot",
    "buildStripeWebhookReplayQaSnapshot",
    "paymentRuntimeEvidence",
    "stripeWebhookReplayQa",
    "paymentEvidenceProgress",
  ]) {
    if (!releaseGateSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a005.lib-security-security-release-gate-missing-legacy-marker")(
        `lib/security/security-release-gate.ts: missing PASS192 marker ${needle}.`,
      );
  }
  for (const needle of [
    "payment-runtime-evidence-api",
    "stripe-webhook-replay-qa-ledger",
    "paymentRuntimeEvidence",
    "stripeWebhookReplayQa",
  ]) {
    if (!runtimeQaSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a006.lib-security-security-runtime-qa-missing-legacy-marker-v")(
        `lib/security/security-runtime-qa.ts: missing PASS192 marker ${needle}.`,
      );
  }
  for (const needle of [
    "paymentRuntimeEvidence",
    "stripeWebhookReplayQa",
    "buildPaymentRuntimeEvidenceSnapshot",
    "buildStripeWebhookReplayQaSnapshot",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a007.app-api-security-readiness-route-missing-legacy-marker-v")(
        `app/api/security/readiness/route.ts: missing PASS192 marker ${needle}.`,
      );
    if (!exportRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a008.app-api-security-export-route-missing-legacy-marker-valu")(
        `app/api/security/export/route.ts: missing PASS192 marker ${needle}.`,
      );
    if (!operationsRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a009.app-api-security-operations-checklist-route-missing-lega")(
        `app/api/security/operations-checklist/route.ts: missing PASS192 marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a010.app-api-security-abuse-shield-route-missing-legacy-marke")(
        `app/api/security/abuse-shield/route.ts: missing PASS192 marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildPaymentRuntimeEvidenceSnapshot",
    "buildStripeWebhookReplayQaSnapshot",
    "/api/security/payment-runtime-evidence",
    "/api/security/stripe-webhook-replay-qa",
  ]) {
    if (!securityConsoleSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a011.components-admin-securityconsolepanelx-missing-legacy-co")(
        `components/admin/SecurityConsolePanel.tsx: missing PASS192 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "Payment Runtime Evidence Capture",
    "No raw",
    "safe POST payload",
  ]) {
    if (!evidenceDocSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a012.docs-security-payment-runtime-evidence-capture-md-missin")(
        `docs/security/PAYMENT_RUNTIME_EVIDENCE_CAPTURE.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Stripe Webhook Replay QA Ledger",
    "Duplicate webhook replay",
    "Unsupported signed event",
  ]) {
    if (!replayDocSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a013.docs-security-stripe-webhook-replay-qa-ledger-md-missing")(
        `docs/security/STRIPE_WEBHOOK_REPLAY_QA_LEDGER.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Payment runtime evidence capture",
    "Stripe webhook replay QA ledger",
    "Payment/webhook security",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a014.velmere-legacy-full-master-progress-matrix-md-missing-fu")(
        `VELMERE_PASS192_FULL_MASTER_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "commerce.015.lib-security-payment-runtime-evidence-missing-legacy-evi.a015.legacy-payment-runtime-evidence-replay-qa-guard-failed-v")(
    `PASS192 payment runtime evidence/replay QA guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
