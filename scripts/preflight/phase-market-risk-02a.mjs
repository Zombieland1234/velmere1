import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";


setGuardScope("pf.market-risk.005");

// guard script marker: verify-pass187-durable-event-append-admin-audit-safety.mjs
// PASS187

// PASS186 security admin auth gate + event store contract guard
try {
  const securityAdminAuthSource = read("lib/security/security-admin-auth.ts");
  const eventStoreContractSource = read(
    "lib/security/security-event-store-contract.ts",
  );
  const lockedPanelSource = read(
    "components/admin/SecurityConsoleLockedPanel.tsx",
  );
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const adminSecurityPageSource = read("app/[locale]/admin/security/page.tsx");
  const eventsRouteSource = read("app/api/security/events/route.ts");
  const alertsRouteSource = read("app/api/security/alerts/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const eventStoreRouteSource = read("app/api/security/event-store/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const matrixSource = read("VELMERE_PASS186_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "verifySecurityAdminToken",
    "VELMERE_SECURITY_ADMIN_TOKEN_SHA256",
    "x-velmere-security-admin-token",
    "timingSafeEqual",
    "security_admin_token_required",
    "consoleVisible",
  ]) {
    if (!securityAdminAuthSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a001.lib-security-security-admin-auth-missing-legacy-admin-au")(
        `lib/security/security-admin-auth.ts: missing PASS186 admin auth marker ${needle}.`,
      );
  }
  for (const needle of [
    "securityEventStoreContract",
    "buildSecurityEventStoreSnapshot",
    "durable-append-contract",
    "retention-policy",
  ]) {
    if (!eventStoreContractSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a002.lib-security-security-event-store-contract-missing-legac")(
        `lib/security/security-event-store-contract.ts: missing PASS186 store marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityConsoleLockedPanel",
    "buildSecurityAdminGateReadiness",
  ]) {
    if (!lockedPanelSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a003.components-admin-securityconsolelockedpanelx-missing-leg")(
        `components/admin/SecurityConsoleLockedPanel.tsx: missing PASS186 locked marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildSecurityAdminGateReadiness",
    "buildSecurityEventStoreSnapshot",
    "/api/security/event-store",
  ]) {
    if (!securityConsoleSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a004.components-admin-securityconsolepanelx-missing-legacy-co")(
        `components/admin/SecurityConsolePanel.tsx: missing PASS186 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityConsoleLockedPanel",
    "buildSecurityAdminGateReadiness",
    "!gate.consoleVisible",
  ]) {
    if (!adminSecurityPageSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a005.app-locale-admin-security-pagex-missing-legacy-route-gat")(
        `app/[locale]/admin/security/page.tsx: missing PASS186 route gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "verifySecurityAdminToken",
    "security:events",
    "applyApiAbuseShield",
  ]) {
    if (!eventsRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a006.app-api-security-events-route-missing-legacy-api-gate-ma")(
        `app/api/security/events/route.ts: missing PASS186 API gate marker ${needle}.`,
      );
    if (!eventStoreRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a007.app-api-security-event-store-route-missing-legacy-event")(
        `app/api/security/event-store/route.ts: missing PASS186 event-store gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "verifySecurityAdminToken",
    "security:alerts",
    "applyApiAbuseShield",
  ]) {
    if (!alertsRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a008.app-api-security-alerts-route-missing-legacy-alerts-gate")(
        `app/api/security/alerts/route.ts: missing PASS186 alerts gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "verifySecurityAdminToken",
    "security:export",
    "applyApiAbuseShield",
  ]) {
    if (!exportRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a009.app-api-security-export-route-missing-legacy-export-gate")(
        `app/api/security/export/route.ts: missing PASS186 export gate marker ${needle}.`,
      );
  }
  for (const needle of [
    "securityAdminGate",
    "buildSecurityAdminGateReadiness",
    "eventStore",
    "buildSecurityEventStoreSnapshot",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a010.app-api-security-readiness-route-missing-legacy-marker-v")(
        `app/api/security/readiness/route.ts: missing PASS186 marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a011.app-api-security-abuse-shield-route-missing-legacy-marke")(
        `app/api/security/abuse-shield/route.ts: missing PASS186 marker ${needle}.`,
      );
  }
  for (const needle of [
    "Security admin API gate",
    "Security event store contract",
    "Security locked-state UX",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a012.velmere-legacy-full-progress-matrix-md-missing-full-matr")(
        `VELMERE_PASS186_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.005.lib-security-security-admin-auth-missing-legacy-admin-au.a013.legacy-security-admin-auth-event-store-guard-failed-valu")(
    `PASS186 security admin auth/event store guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.market-risk.006");

// guard script marker: verify-pass186-admin-auth-event-store-contract-safety.mjs
// PASS186

// PASS185 admin security console + alert rules + Vercel sweep guard
try {
  const securityAlertRulesSource = read("lib/security/security-alert-rules.ts");
  const securityConsoleSource = read(
    "components/admin/SecurityConsolePanel.tsx",
  );
  const adminSecurityPageSource = read("app/[locale]/admin/security/page.tsx");
  const alertsRouteSource = read("app/api/security/alerts/route.ts");
  const exportRouteSource = read("app/api/security/export/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const matrixSource = read("VELMERE_PASS185_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "SecurityAlertRule",
    "evaluateSecurityAlertRules",
    "buildSecurityAlertSnapshot",
    "waf_not_configured",
  ]) {
    if (!securityAlertRulesSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.006.lib-security-security-alert-rules-missing-legacy-alert-m.a001.lib-security-security-alert-rules-missing-legacy-alert-m")(
        `lib/security/security-alert-rules.ts: missing PASS185 alert marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityConsolePanel",
    "buildSecurityAlertSnapshot",
    "buildSecurityEventLedgerSnapshot",
    "asc-shell",
  ]) {
    if (
      !securityConsoleSource.includes(needle) &&
      !read("app/globals.css").includes(needle)
    )
      errors.pushWithId.bind(errors, "market-risk.006.lib-security-security-alert-rules-missing-legacy-alert-m.a002.components-admin-securityconsolepanelx-missing-legacy-co")(
        `components/admin/SecurityConsolePanel.tsx: missing PASS185 console marker ${needle}.`,
      );
  }
  for (const needle of [
    "Velmère Admin Security Console",
    "robots",
    "index: false",
    "SecurityConsolePanel",
  ]) {
    if (!adminSecurityPageSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.006.lib-security-security-alert-rules-missing-legacy-alert-m.a003.app-locale-admin-security-pagex-missing-legacy-admin-rou")(
        `app/[locale]/admin/security/page.tsx: missing PASS185 admin route marker ${needle}.`,
      );
  }
  for (const needle of [
    "applyApiAbuseShield",
    "buildSecurityAlertSnapshot",
    "securityJson",
  ]) {
    if (!alertsRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.006.lib-security-security-alert-rules-missing-legacy-alert-m.a004.app-api-security-alerts-route-missing-legacy-alerts-mark")(
        `app/api/security/alerts/route.ts: missing PASS185 alerts marker ${needle}.`,
      );
  }
  for (const needle of [
    "security_export_safe_preview",
    "buildSecurityAlertSnapshot",
    "buildSecurityEventLedgerSnapshot",
    "no raw IP addresses",
    "content-disposition",
  ]) {
    if (!exportRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.006.lib-security-security-alert-rules-missing-legacy-alert-m.a005.app-api-security-export-route-missing-legacy-export-mark")(
        `app/api/security/export/route.ts: missing PASS185 export marker ${needle}.`,
      );
  }
  for (const needle of ["alertRules", "buildSecurityAlertSnapshot"]) {
    if (!readinessRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.006.lib-security-security-alert-rules-missing-legacy-alert-m.a006.app-api-security-readiness-route-missing-legacy-alert-ma")(
        `app/api/security/readiness/route.ts: missing PASS185 alert marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.006.lib-security-security-alert-rules-missing-legacy-alert-m.a007.app-api-security-abuse-shield-route-missing-legacy-alert")(
        `app/api/security/abuse-shield/route.ts: missing PASS185 alert marker ${needle}.`,
      );
  }
  for (const needle of [
    "Vercel potential error sweep",
    "Admin security console",
    "Security alert rules",
    "Security safe export",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.006.lib-security-security-alert-rules-missing-legacy-alert-m.a008.velmere-legacy-full-progress-matrix-md-missing-full-matr")(
        `VELMERE_PASS185_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.006.lib-security-security-alert-rules-missing-legacy-alert-m.a009.legacy-admin-security-console-vercel-sweep-guard-failed")(
    `PASS185 admin security console / Vercel sweep guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.market-risk.007");

// guard script marker: verify-pass185-admin-security-console-vercel-sweep-safety.mjs
// PASS185

// PASS184 Upstash REST adapter + security event ledger guard
try {
  const durableRateLimitSource = read("lib/security/durable-rate-limit.ts");
  const securityEventLedgerSource = read(
    "lib/security/security-event-ledger.ts",
  );
  const apiAbuseShieldSource = read("lib/security/api-abuse-shield.ts");
  const securityEventsRouteSource = read("app/api/security/events/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const matrixSource = read("VELMERE_PASS184_FULL_PROGRESS_MATRIX.md");
  for (const needle of [
    "upstash_rest",
    "upstash_fallback_memory",
    "/pipeline",
    "UPSTASH_REDIS_REST_URL",
    "providerError",
    "upstashRestAdapter",
  ]) {
    if (!durableRateLimitSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.007.lib-security-durable-rate-limit-missing-legacy-upstash-m.a001.lib-security-durable-rate-limit-missing-legacy-upstash-m")(
        `lib/security/durable-rate-limit.ts: missing PASS184 Upstash marker ${needle}.`,
      );
  }
  for (const needle of [
    "SecurityEventRecord",
    "recordSecurityEvent",
    "buildSecurityEventLedgerSnapshot",
    "clientFingerprint",
    "in_memory_security_event_ledger",
  ]) {
    if (!securityEventLedgerSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.007.lib-security-durable-rate-limit-missing-legacy-upstash-m.a002.lib-security-security-event-ledger-missing-legacy-ledger")(
        `lib/security/security-event-ledger.ts: missing PASS184 ledger marker ${needle}.`,
      );
  }
  for (const needle of [
    "recordSecurityEvent",
    "abuse_blocked",
    "rate_limited",
    "suspicious_allowed",
    "provider_fallback",
  ]) {
    if (!apiAbuseShieldSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.007.lib-security-durable-rate-limit-missing-legacy-upstash-m.a003.lib-security-api-abuse-shield-missing-legacy-event-marke")(
        `lib/security/api-abuse-shield.ts: missing PASS184 event marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildSecurityEventLedgerSnapshot",
    "listSecurityEvents",
    "filtered",
  ]) {
    if (!securityEventsRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.007.lib-security-durable-rate-limit-missing-legacy-upstash-m.a004.app-api-security-events-route-missing-legacy-events-rout")(
        `app/api/security/events/route.ts: missing PASS184 events route marker ${needle}.`,
      );
  }
  for (const needle of [
    "securityEventLedger",
    "buildSecurityEventLedgerSnapshot",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.007.lib-security-durable-rate-limit-missing-legacy-upstash-m.a005.app-api-security-readiness-route-missing-legacy-ledger-m")(
        `app/api/security/readiness/route.ts: missing PASS184 ledger marker ${needle}.`,
      );
    if (!abuseRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.007.lib-security-durable-rate-limit-missing-legacy-upstash-m.a006.app-api-security-abuse-shield-route-missing-legacy-ledge")(
        `app/api/security/abuse-shield/route.ts: missing PASS184 ledger marker ${needle}.`,
      );
  }
  for (const needle of [
    "Upstash/Redis adapter",
    "Security event ledger",
    "Monitoring / alerting readiness",
    "Całość launch-ready",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.007.lib-security-durable-rate-limit-missing-legacy-upstash-m.a007.velmere-legacy-full-progress-matrix-md-missing-full-matr")(
        `VELMERE_PASS184_FULL_PROGRESS_MATRIX.md: missing full matrix area ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.007.lib-security-durable-rate-limit-missing-legacy-upstash-m.a008.legacy-upstash-security-event-ledger-guard-failed-value")(
    `PASS184 Upstash/security event ledger guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.market-risk.008");

// guard script marker: verify-pass184-upstash-security-event-ledger-safety.mjs
// PASS184

// PASS183 durable rate-limit + API abuse shield guard
try {
  const durableRateLimitSource = read("lib/security/durable-rate-limit.ts");
  const apiAbuseShieldSource = read("lib/security/api-abuse-shield.ts");
  const abuseRouteSource = read("app/api/security/abuse-shield/route.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const marketSearchRouteSource = read(
    "app/api/market-integrity/search/route.ts",
  );
  const marketAnalyzeRouteSource = read(
    "app/api/market-integrity/analyze/route.ts",
  );
  const iconRouteSource = read("app/api/market-integrity/icon/route.ts");
  for (const needle of [
    "applyDurableRateLimit",
    "buildDurableRateLimitReadiness",
    "UPSTASH_REDIS_REST_URL",
    "memoryFallback",
  ]) {
    if (!durableRateLimitSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.008.lib-security-durable-rate-limit-missing-legacy-marker-va.a001.lib-security-durable-rate-limit-missing-legacy-marker-va")(
        `lib/security/durable-rate-limit.ts: missing PASS183 marker ${needle}.`,
      );
  }
  for (const needle of [
    "applyApiAbuseShield",
    "evaluateAbuseSignals",
    "scanner_like_user_agent",
    "abuse_shield_blocked",
    "abuseShieldResponseMeta",
  ]) {
    if (!apiAbuseShieldSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.008.lib-security-durable-rate-limit-missing-legacy-marker-va.a002.lib-security-api-abuse-shield-missing-legacy-marker-valu")(
        `lib/security/api-abuse-shield.ts: missing PASS183 marker ${needle}.`,
      );
  }
  for (const needle of [
    "api_abuse_shield_preview",
    "buildDurableRateLimitReadiness",
    "distributed rate-limit store",
  ]) {
    if (!abuseRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.008.lib-security-durable-rate-limit-missing-legacy-marker-va.a003.app-api-security-abuse-shield-route-missing-legacy-marke")(
        `app/api/security/abuse-shield/route.ts: missing PASS183 marker ${needle}.`,
      );
  }
  for (const needle of ["applyApiAbuseShield", "abuseShieldResponseMeta"]) {
    if (!marketSearchRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.008.lib-security-durable-rate-limit-missing-legacy-marker-va.a004.app-api-market-integrity-search-route-missing-legacy-abu")(
        `app/api/market-integrity/search/route.ts: missing PASS183 abuse shield marker ${needle}.`,
      );
    if (!marketAnalyzeRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.008.lib-security-durable-rate-limit-missing-legacy-marker-va.a005.app-api-market-integrity-analyze-route-missing-legacy-ab")(
        `app/api/market-integrity/analyze/route.ts: missing PASS183 abuse shield marker ${needle}.`,
      );
  }
  for (const needle of [
    "applyApiAbuseShield",
    "token-icon-proxy",
    "safeEgressFetch",
  ]) {
    if (!iconRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.008.lib-security-durable-rate-limit-missing-legacy-marker-va.a006.app-api-market-integrity-icon-route-missing-legacy-icon")(
        `app/api/market-integrity/icon/route.ts: missing PASS183 icon shield marker ${needle}.`,
      );
  }
  for (const needle of [
    "buildDurableRateLimitReadiness",
    "abuseShieldResponseMeta",
  ]) {
    if (!readinessRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.008.lib-security-durable-rate-limit-missing-legacy-marker-va.a007.app-api-security-readiness-route-missing-legacy-readines")(
        `app/api/security/readiness/route.ts: missing PASS183 readiness marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.008.lib-security-durable-rate-limit-missing-legacy-marker-va.a008.legacy-durable-rate-limit-api-abuse-shield-guard-failed")(
    `PASS183 durable rate-limit / API abuse shield guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
