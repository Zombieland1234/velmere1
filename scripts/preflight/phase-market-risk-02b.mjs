import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.market-risk.009");

// guard script marker: verify-pass183-durable-rate-limit-abuse-shield-safety.mjs
// PASS183

// PASS182 security hardening guard
try {
  const nextConfigSource = read("next.config.mjs");
  const securityHeadersSource = read("lib/security/http-security.mjs");
  const apiGuardSource = read("lib/security/api-guard.ts");
  const readinessRouteSource = read("app/api/security/readiness/route.ts");
  const marketSearchRouteSource = read(
    "app/api/market-integrity/search/route.ts",
  );
  const marketAnalyzeRouteSource = read(
    "app/api/market-integrity/analyze/route.ts",
  );
  const iconRouteSource = read("app/api/market-integrity/icon/route.ts");
  for (const needle of [
    "buildSecurityHeaders",
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "Cross-Origin-Opener-Policy",
    "Permissions-Policy",
  ]) {
    if (
      !securityHeadersSource.includes(needle) &&
      !nextConfigSource.includes(needle)
    )
      errors.pushWithId.bind(errors, "market-risk.009.legacy-security-header-marker-missing-value.a001.legacy-security-header-marker-missing-value")(`PASS182 security header marker missing: ${needle}.`);
  }
  if (!nextConfigSource.includes("buildSecurityHeaders({ isDev, includeContentSecurityPolicy: false })"))
    errors.pushWithId.bind(errors, "market-risk.009.legacy-security-header-marker-missing-value.a002.next-config-legacy-centralized-security-headers-not-wire")(
      "next.config.mjs: PASS182 centralized non-CSP security headers not wired.",
    );
  for (const needle of [
    "securityJson",
    "applySoftRateLimit",
    "sanitizeBoundedParam",
    "rejectOversizedUrl",
  ]) {
    if (!apiGuardSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.009.legacy-security-header-marker-missing-value.a003.lib-security-api-guard-missing-legacy-marker-value")(
        `lib/security/api-guard.ts: missing PASS182 marker ${needle}.`,
      );
    const wrappedByPass183 =
      needle !== "securityJson" &&
      marketSearchRouteSource.includes("applyApiAbuseShield") &&
      marketAnalyzeRouteSource.includes("applyApiAbuseShield") &&
      read("lib/security/api-abuse-shield.ts").includes(needle);
    if (!wrappedByPass183) {
      if (!marketSearchRouteSource.includes(needle))
        errors.pushWithId.bind(errors, "market-risk.009.legacy-security-header-marker-missing-value.a004.app-api-market-integrity-search-route-missing-legacy-gua")(
          `app/api/market-integrity/search/route.ts: missing PASS182 guard ${needle}.`,
        );
      if (!marketAnalyzeRouteSource.includes(needle))
        errors.pushWithId.bind(errors, "market-risk.009.legacy-security-header-marker-missing-value.a005.app-api-market-integrity-analyze-route-missing-legacy-gu")(
          `app/api/market-integrity/analyze/route.ts: missing PASS182 guard ${needle}.`,
        );
    }
  }
  for (const needle of [
    "buildSecurityReadinessSnapshot",
    "security_headers_api_guard_preview",
    "no-store",
  ]) {
    if (
      !readinessRouteSource.includes(needle) &&
      !read("lib/security/security-readiness.ts").includes(needle)
    )
      errors.pushWithId.bind(errors, "market-risk.009.legacy-security-header-marker-missing-value.a006.app-api-security-readiness-route-missing-legacy-readines")(
        `app/api/security/readiness/route.ts: missing PASS182 readiness marker ${needle}.`,
      );
  }
  for (const needle of [
    'url.protocol !== "https:"',
    "url.username",
    "url.password",
    "url.port",
    'contentType.toLowerCase().startsWith("image/")',
    "body.byteLength > 600_000",
  ]) {
    if (!iconRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.009.legacy-security-header-marker-missing-value.a007.app-api-market-integrity-icon-route-missing-legacy-icon")(
        `app/api/market-integrity/icon/route.ts: missing PASS182 icon proxy hardening marker ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.009.legacy-security-header-marker-missing-value.a008.legacy-security-hardening-guard-failed-value")(
    `PASS182 security hardening guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.market-risk.010");

// guard script marker: verify-pass182-security-hardening-safety.mjs
// PASS182

// PASS180 Contract Lens + OSINT Queue foundations guard
try {
  const contractLensSource = read(
    "lib/market-integrity/contract-lens-contract.ts",
  );
  const osintQueueSource = read("lib/market-integrity/osint-queue-contract.ts");
  const contractRouteSource = read(
    "app/api/market-integrity/contract-lens/route.ts",
  );
  const osintRouteSource = read(
    "app/api/market-integrity/osint-queue/route.ts",
  );
  const marketPageSource = read("app/[locale]/market-integrity/page.tsx");
  for (const needle of [
    "ContractLensSignalId",
    "owner_control",
    "proxy_upgrade",
    "createContractLensPreview",
  ]) {
    if (!contractLensSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.010.lib-market-integrity-contract-lens-contract-missing-lega.a001.lib-market-integrity-contract-lens-contract-missing-lega")(
        `lib/market-integrity/contract-lens-contract.ts: missing PASS180 marker ${needle}.`,
      );
  }
  for (const needle of [
    "OsintQueueItem",
    "blockedClaims",
    "createOsintQueuePreview",
    "safe paraphrase",
  ]) {
    if (!osintQueueSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.010.lib-market-integrity-contract-lens-contract-missing-lega.a002.lib-market-integrity-osint-queue-contract-missing-legacy")(
        `lib/market-integrity/osint-queue-contract.ts: missing PASS180 marker ${needle}.`,
      );
  }
  for (const needle of [
    "contract_lens_preview_only",
    "externalFetchPerformed: false",
    "server-only analyzer output",
  ]) {
    if (!contractRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.010.lib-market-integrity-contract-lens-contract-missing-lega.a003.app-api-market-integrity-contract-lens-route-missing-leg")(
        `app/api/market-integrity/contract-lens/route.ts: missing PASS180 route marker ${needle}.`,
      );
  }
  for (const needle of [
    "osint_queue_preview_only",
    "externalFetchPerformed: false",
    "safe paraphrase",
  ]) {
    if (!osintRouteSource.includes(needle))
      errors.pushWithId.bind(errors, "market-risk.010.lib-market-integrity-contract-lens-contract-missing-lega.a004.app-api-market-integrity-osint-queue-route-missing-legac")(
        `app/api/market-integrity/osint-queue/route.ts: missing PASS180 route marker ${needle}.`,
      );
  }
  const usesCurrentShieldParitySurface = marketPageSource.includes("ShieldRealMarketsParityClient");
  if (!usesCurrentShieldParitySurface) {
    for (const needle of ["ContractLensPanel", "OsintQueuePanel"]) {
      if (!marketPageSource.includes(needle))
        errors.pushWithId.bind(errors, "market-risk.010.lib-market-integrity-contract-lens-contract-missing-lega.a005.app-locale-market-integrity-pagex-missing-legacy-panel-v")(
          `app/[locale]/market-integrity/page.tsx: missing PASS180 panel ${needle}.`,
        );
    }
  }
} catch (error) {
  errors.pushWithId.bind(errors, "market-risk.010.lib-market-integrity-contract-lens-contract-missing-lega.a006.legacy-contract-lens-osint-queue-guard-failed-value")(
    `PASS180 Contract Lens / OSINT Queue guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
