import {  errors, read } from "./context.mjs";
import { setGuardScope } from "./context.mjs";

setGuardScope("pf.market-risk.001");
try {
  const runtimeQaSource = read("lib/security/security-runtime-qa.ts");
  const releaseGateSource = read("lib/security/security-release-gate.ts");
  const runtimeQaRouteSource = read("app/api/security/runtime-qa/route.ts");
  const releaseGateRouteSource = read("app/api/security/release-gate/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const operationsRouteSource = read(
    "app/api/security/operations-checklist/route.ts",
  );
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const qaDocSource = read(
    "docs/security/SECURITY_RUNTIME_QA_RESULT_CAPTURE.md",
  );
  const releaseDocSource = read(
    "docs/security/SECURITY_RELEASE_GATE_DASHBOARD.md",
  );
  const matrixSource = read("VELMERE_PASS190_FULL_MASTER_PROGRESS_MATRIX.md");
  for (const needle of [
    "RuntimeQaCheck",
    "runtimeQaChecks",
    "buildSecurityRuntimeQaSnapshot",
    "admin-api-deny-by-default",
    "export-redaction",
    "release-gate-signoff",
  ]) {
    if (!runtimeQaSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a001.lib-security-security-runtime-qa-missing-legacy-runtime")(
        `lib/security/security-runtime-qa.ts: missing PASS190 runtime QA marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityReleaseGateItem",
    "buildSecurityReleaseGateSnapshot",
    "payment-webhook-review",
    "security_release_gate_dashboard",
  ]) {
    if (!releaseGateSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a002.lib-security-security-release-gate-missing-legacy-releas")(
        `lib/security/security-release-gate.ts: missing PASS190 release gate marker ${needle}.`,
      );
  }
  for (const source of [runtimeQaRouteSource, releaseGateRouteSource]) {
    for (const needle of [
      "applyApiAbuseShield",
      "verifySecurityAdminToken",
      "security:events",
      "securityAdminGate",
      "operator",
    ]) {
      if (!source.includes(needle))
        errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a003.legacy-gated-security-route-missing-value")(`PASS190 gated security route missing ${needle}.`);
    }
  }
  for (const needle of [
    "runtimeQa",
    "releaseGate",
    "buildSecurityRuntimeQaSnapshot",
    "buildSecurityReleaseGateSnapshot",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a004.app-api-security-readiness-route-missing-legacy-marker-v")(
        `app/api/security/readiness/route.ts: missing PASS190 marker ${needle}.`,
      );
    if (!exportRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a005.app-api-security-export-route-missing-legacy-marker-valu")(
        `app/api/security/export/route.ts: missing PASS190 marker ${needle}.`,
      );
    if (!operationsRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a006.app-api-security-operations-checklist-route-missing-lega")(
        `app/api/security/operations-checklist/route.ts: missing PASS190 marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildSecurityRuntimeQaSnapshot",
    "buildSecurityReleaseGateSnapshot",
    "/api/security/runtime-qa",
    "/api/security/release-gate",
    "releaseItems.map",
  ]) {
    if (!securityConsoleSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a007.components-admin-securityconsolepanelx-missing-legacy-co")(
        `components/admin/SecurityConsolePanel.tsx: missing PASS190 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "/api/security/export",
    "No raw IP",
    "Vercel firewall logs",
    "npm run verify:shield-all",
  ]) {
    if (!qaDocSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a008.docs-security-security-runtime-qa-result-capture-md-miss")(
        `docs/security/SECURITY_RUNTIME_QA_RESULT_CAPTURE.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Security Release Gate Dashboard",
    "Payment/webhook",
    "Vercel envs",
    "WAF",
  ]) {
    if (!releaseDocSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a009.docs-security-security-release-gate-dashboard-md-missing")(
        `docs/security/SECURITY_RELEASE_GATE_DASHBOARD.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Security release gate dashboard",
    "Security runtime QA result capture",
    "Payment/webhook security",
    "Source adapters / live feeds",
    "VLM AI risk brain",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a010.velmere-legacy-full-master-progress-matrix-md-missing-fu")(
        `VELMERE_PASS190_FULL_MASTER_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.001.lib-security-security-runtime-qa-missing-legacy-runtime.a011.legacy-runtime-qa-release-gate-guard-failed-value")(
    `PASS190 runtime QA/release gate guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.market-risk.002");
// guard script marker: verify-pass190-runtime-qa-release-gate-safety.mjs
// PASS190

// PASS189 security nav/footer integration + Vercel env/WAF/runtime QA checklist guard
try {
  const operationsChecklistSource = read(
    "lib/security/security-operations-checklist.ts",
  );
  const operationsPanelSource = read(
    "components/security/SecurityOperationsChecklistPanel.tsx",
  );
  const securityPageSource = read("components/security/SecurityTrustPage.tsx");
  const operationsApiSource = read(
    "app/api/security/operations-checklist/route.ts",
  );
  const navbarSource = read("components/Navbar.tsx");
  const footerSource = read("components/Footer.tsx");
  const cssSource = read("app/globals.css");
  const envDocSource = read("docs/security/VERCEL_ENV_SECURITY_CHECKLIST.md");
  const wafDocSource = read("docs/security/VERCEL_WAF_RULES_DRAFT.md");
  const qaDocSource = read("docs/security/SECURITY_RUNTIME_QA_CHECKLIST.md");
  const matrixSource = read("VELMERE_PASS189_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "securityChecklistItems",
    "wafRuleDrafts",
    "buildSecurityOperationsChecklistSnapshot",
    "VELMERE_SECURITY_ADMIN_TOKEN_SHA256",
    "runtime_qa",
  ]) {
    if (!operationsChecklistSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a001.lib-security-security-operations-checklist-missing-legac")(
        `lib/security/security-operations-checklist.ts: missing PASS189 checklist marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityOperationsChecklistPanel",
    "buildSecurityOperationsChecklistSnapshot",
    "WAF drafts",
  ]) {
    if (!operationsPanelSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a002.components-security-securityoperationschecklistpanelx-mi")(
        `components/security/SecurityOperationsChecklistPanel.tsx: missing PASS189 panel marker ${needle}.`,
      );
  }
  if (!securityPageSource.includes("data-pass318-security-public-note")) {
    for (const needle of [
      "SecurityOperationsChecklistPanel",
      "<SecurityOperationsChecklistPanel locale={safeLocale} />",
    ]) {
      if (!securityPageSource.includes(needle))
        errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a003.components-security-securitytrustpagex-missing-legacy-pa")(
          `components/security/SecurityTrustPage.tsx: missing PASS189 page marker ${needle}.`,
        );
    }
  }
  for (const needle of [
    "applyApiAbuseShield",
    "buildSecurityOperationsChecklistSnapshot",
    "buildSecurityReadinessSnapshot",
  ]) {
    if (!operationsApiSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a004.app-api-security-operations-checklist-route-missing-lega")(
        `app/api/security/operations-checklist/route.ts: missing PASS189 API marker ${needle}.`,
      );
  }
  for (const needle of [
    'security: "Security"',
    'security: "Sicherheit"',
    "labels.security",
    'href: "/security"',
  ]) {
    if (!navbarSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a005.components-navbarx-missing-legacy-security-nav-marker-va")(
        `components/Navbar.tsx: missing PASS189 security nav marker ${needle}.`,
      );
  }
  for (const needle of [
    '{ href: "/security", label: "Security" }',
    "Velmère Security means layered protection",
    "Security Velmère to warstwy ochrony",
    "Velmère Security bedeutet Schutzschichten",
  ]) {
    if (!footerSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a006.components-footerx-missing-legacy-footer-marker-value")(
        `components/Footer.tsx: missing PASS189 footer marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS189 · Security operations checklist",
    ".vso-shell",
    ".vso-card",
    ".vso-status",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a007.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS189 CSS marker ${needle}.`);
  }
  for (const needle of [
    "UPSTASH_REDIS_REST_URL",
    "VELMERE_SECURITY_ADMIN_TOKEN_SHA256",
    "GET /api/security/readiness",
  ]) {
    if (!envDocSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a008.docs-security-vercel-env-security-checklist-md-missing-m")(
        `docs/security/VERCEL_ENV_SECURITY_CHECKLIST.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Block scanner paths",
    "Rate-limit public API",
    "Protect admin/security exports",
  ]) {
    if (!wafDocSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a009.docs-security-vercel-waf-rules-draft-md-missing-marker-v")(
        `docs/security/VERCEL_WAF_RULES_DRAFT.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "/security",
    "/admin/security",
    "/api/security/export",
    "No raw IP",
  ]) {
    if (!qaDocSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a010.docs-security-security-runtime-qa-checklist-md-missing-m")(
        `docs/security/SECURITY_RUNTIME_QA_CHECKLIST.md: missing marker ${needle}.`,
      );
  }
  for (const needle of [
    "Security operations checklist",
    "Vercel env checklist",
    "Vercel WAF rules draft",
    "Security nav/footer integration",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a011.velmere-legacy-full-progress-matrix-md-missing-full-matr")(
        `VELMERE_PASS189_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.002.lib-security-security-operations-checklist-missing-legac.a012.legacy-security-nav-footer-vercel-waf-checklist-guard-fa")(
    `PASS189 security nav/footer/Vercel WAF checklist guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.market-risk.003");
// guard script marker: verify-pass189-security-nav-footer-vercel-waf-checklist-safety.mjs
// PASS189

// PASS188 security trust copy + public security page overclaim guard
try {
  const securityTrustCopySource = read("lib/security/security-trust-copy.ts");
  const securityTrustPageSource = read(
    "components/security/SecurityTrustPage.tsx",
  );
  const securityRouteSource = read("app/[locale]/security/page.tsx");
  const securityTrustApiSource = read("app/api/security/trust/route.ts");
  const cssSource = read("app/globals.css");
  const matrixSource = read("VELMERE_PASS188_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "securityTrustForbiddenClaims",
    "securityTrustPillars",
    "securityTrustRoadmap",
    "buildSecurityTrustSnapshot",
    "security-first",
  ]) {
    if (!securityTrustCopySource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.003.lib-security-security-trust-copy-missing-legacy-marker-v.a001.lib-security-security-trust-copy-missing-legacy-marker-v")(
        `lib/security/security-trust-copy.ts: missing PASS188 marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityTrustPage",
    "buildSecurityTrustSnapshot",
    "securityTrustPillars",
    "Production boundary",
  ]) {
    if (!securityTrustPageSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.003.lib-security-security-trust-copy-missing-legacy-marker-v.a002.components-security-securitytrustpagex-missing-legacy-pa")(
        `components/security/SecurityTrustPage.tsx: missing PASS188 page marker ${needle}.`,
      );
  }
  for (const needle of ["Velmère Security", "SecurityTrustPage", "metadata"]) {
    if (!securityRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.003.lib-security-security-trust-copy-missing-legacy-marker-v.a003.app-locale-security-pagex-missing-legacy-route-marker-va")(
        `app/[locale]/security/page.tsx: missing PASS188 route marker ${needle}.`,
      );
  }
  for (const needle of [
    "applyApiAbuseShield",
    "buildSecurityTrustSnapshot",
    "buildSecurityReadinessSnapshot",
    "security-trust",
  ]) {
    if (!securityTrustApiSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.003.lib-security-security-trust-copy-missing-legacy-marker-v.a004.app-api-security-trust-route-missing-legacy-api-marker-v")(
        `app/api/security/trust/route.ts: missing PASS188 API marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS188 · Velmère Security Trust public surface",
    ".vst-hero",
    ".vst-card",
    ".vst-roadmap",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.003.lib-security-security-trust-copy-missing-legacy-marker-v.a005.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS188 CSS marker ${needle}.`);
  }
  for (const needle of [
    "Security public trust page",
    "Security overclaim safety",
    "Brand trust / credibility",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.003.lib-security-security-trust-copy-missing-legacy-marker-v.a006.velmere-legacy-full-progress-matrix-md-missing-full-matr")(
        `VELMERE_PASS188_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
  const publicSecuritySurface =
    `${securityTrustPageSource}\n${securityRouteSource}\n${securityTrustApiSource}`.toLowerCase();
  for (const forbidden of [
    "najlepsze zabezpieczenia świata",
    "nie do zhakowania",
    "gwarantowane bezpieczeństwo",
    "100% secure",
    "unhackable",
    "hack proof",
    "world's best security",
    "best security in the world",
    "military-grade security",
    "bank-level guaranteed",
  ]) {
    if (publicSecuritySurface.includes(forbidden))
      errors.pushWithId.bind(errors, "market-risk.003.lib-security-security-trust-copy-missing-legacy-marker-v.a007.legacy-public-security-overclaim-remains-value")(`PASS188 public security overclaim remains: ${forbidden}.`);
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.003.lib-security-security-trust-copy-missing-legacy-marker-v.a008.legacy-security-trust-copy-public-page-guard-failed-valu")(
    `PASS188 security trust copy/public page guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.market-risk.004");
// guard script marker: verify-pass188-security-trust-copy-public-page-safety.mjs
// PASS188

// PASS187 durable security event append + admin read audit guard
try {
  const eventAppendSource = read(
    "lib/security/security-event-append-adapter.ts",
  );
  const adminAuditSource = read("lib/security/security-admin-audit.ts");
  const eventLedgerSource = read("lib/security/security-event-ledger.ts");
  const adminAuthSource = read("lib/security/security-admin-auth.ts");
  const eventStoreSource = read(
    "lib/security/security-event-store-contract.ts",
  );
  const adminAuditRouteSource = read("app/api/security/admin-audit/route.ts");
  const eventStoreRouteSource = read("app/api/security/event-store/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const matrixSource = read("VELMERE_PASS187_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "appendSecurityEventBestEffort",
    "buildSecurityEventAppendReadiness",
    "VELMERE_SECURITY_EVENT_UPSTASH_KEY",
    "LPUSH",
    "LTRIM",
    "safeRecord",
  ]) {
    if (!eventAppendSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a001.lib-security-security-event-append-adapter-missing-legac")(
        `lib/security/security-event-append-adapter.ts: missing PASS187 append marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityAdminAuditRecord",
    "recordSecurityAdminAudit",
    "buildSecurityAdminAuditSnapshot",
    "security_export_read",
    "security_event_read",
  ]) {
    if (!adminAuditSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a002.lib-security-security-admin-audit-missing-legacy-admin-a")(
        `lib/security/security-admin-audit.ts: missing PASS187 admin audit marker ${needle}.`,
      );
  }
  for (const needle of [
    "appendSecurityEventBestEffort",
    "appendAdapter",
    "durableStorageReady",
  ]) {
    if (!eventLedgerSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a003.lib-security-security-event-ledger-missing-legacy-ledger")(
        `lib/security/security-event-ledger.ts: missing PASS187 ledger append marker ${needle}.`,
      );
  }
  for (const needle of [
    "recordSecurityAdminAudit",
    "not_configured",
    "denied",
    "allowed",
  ]) {
    if (!adminAuthSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a004.lib-security-security-admin-auth-missing-legacy-auth-aud")(
        `lib/security/security-admin-auth.ts: missing PASS187 auth audit marker ${needle}.`,
      );
  }
  for (const needle of ["buildSecurityEventAppendReadiness", "appendAdapter"]) {
    if (!eventStoreSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a005.lib-security-security-event-store-contract-missing-legac")(
        `lib/security/security-event-store-contract.ts: missing PASS187 store append marker ${needle}.`,
      );
    if (!eventStoreRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a006.app-api-security-event-store-route-missing-legacy-store")(
        `app/api/security/event-store/route.ts: missing PASS187 store route marker ${needle}.`,
      );
  }
  for (const needle of [
    "verifySecurityAdminToken",
    "security:events",
    "buildSecurityAdminAuditSnapshot",
    "listSecurityAdminAuditEvents",
  ]) {
    if (!adminAuditRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a007.app-api-security-admin-audit-route-missing-legacy-admin")(
        `app/api/security/admin-audit/route.ts: missing PASS187 admin-audit route marker ${needle}.`,
      );
  }
  for (const needle of [
    "eventAppendAdapter",
    "securityAdminAudit",
    "buildSecurityEventAppendReadiness",
    "buildSecurityAdminAuditSnapshot",
  ]) {
    if (!exportRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a008.app-api-security-export-route-missing-legacy-export-mark")(
        `app/api/security/export/route.ts: missing PASS187 export marker ${needle}.`,
      );
    if (!readinessRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a009.app-api-security-readiness-route-missing-legacy-readines")(
        `app/api/security/readiness/route.ts: missing PASS187 readiness marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a010.app-api-security-abuse-shield-route-missing-legacy-abuse")(
        `app/api/security/abuse-shield/route.ts: missing PASS187 abuse marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildSecurityEventAppendReadiness",
    "buildSecurityAdminAuditSnapshot",
    "/api/security/admin-audit",
  ]) {
    if (!securityConsoleSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a011.components-admin-securityconsolepanelx-missing-legacy-co")(
        `components/admin/SecurityConsolePanel.tsx: missing PASS187 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "Security event append adapter",
    "Security admin audit",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a012.velmere-legacy-full-progress-matrix-md-missing-full-matr")(
        `VELMERE_PASS187_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.004.lib-security-security-event-append-adapter-missing-legac.a013.legacy-durable-security-event-append-admin-audit-guard-f")(
    `PASS187 durable security event append/admin audit guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
