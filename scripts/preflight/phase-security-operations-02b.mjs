import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.security-operations.027");

// Admin audit write API production guard
try {
  const adminAuditWriteContract = read(
    "lib/launch/admin-audit-write-contract.ts",
  );
  const customerSafeExportBoundary = read(
    "lib/launch/customer-safe-export-boundary.ts",
  );
  const adminAuditRoute = read("app/api/admin/audit-events/route.ts");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "adminAuditWriteRouteMatrix",
    "createAdminAuditWritePreview",
    "ADMIN_AUDIT_WRITE_ENABLED",
  ]) {
    if (!adminAuditWriteContract.includes(needle))
      errors.pushWithId.bind(errors, "security.027.lib-launch-admin-audit-write-contract-missing-audit-writ.a001.lib-launch-admin-audit-write-contract-missing-audit-writ")(
        `lib/launch/admin-audit-write-contract.ts: missing audit write marker ${needle}.`,
      );
  }
  for (const needle of [
    "customerSafeExportBoundaryMatrix",
    "createCustomerSafeExportPreview",
    "Approval gate",
  ]) {
    if (!customerSafeExportBoundary.includes(needle))
      errors.pushWithId.bind(errors, "security.027.lib-launch-admin-audit-write-contract-missing-audit-writ.a002.lib-launch-customer-safe-export-boundary-missing-custome")(
        `lib/launch/customer-safe-export-boundary.ts: missing customer-safe export marker ${needle}.`,
      );
  }
  for (const needle of [
    "createAdminAuditWritePreview",
    "storageWritePerformed: false",
    "locked-contract-preview",
  ]) {
    if (!adminAuditRoute.includes(needle))
      errors.pushWithId.bind(errors, "security.027.lib-launch-admin-audit-write-contract-missing-audit-writ.a003.app-api-admin-audit-events-route-missing-locked-route-ma")(
        `app/api/admin/audit-events/route.ts: missing locked route marker ${needle}.`,
      );
  }
  for (const needle of [
    "AdminAuditWriteApiPanel",
    "CustomerSafeExportBoundaryPanel",
  ]) {
    if (!adminPage.includes(needle))
      errors.pushWithId.bind(errors, "security.027.lib-launch-admin-audit-write-contract-missing-audit-writ.a004.app-locale-admin-import-products-pagex-missing-value")(
        `app/[locale]/admin/import-products/page.tsx: missing ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.027.lib-launch-admin-audit-write-contract-missing-audit-writ.a005.admin-audit-write-api-production-guard-failed-value")(
    `Admin audit write API production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.028");

// Admin auth session/idempotency production guard
try {
  const adminAuthSession = read("lib/launch/admin-auth-session-guard.ts");
  const adminIdempotency = read("lib/launch/admin-idempotency-store.ts");
  const adminAuditWriteContract = read(
    "lib/launch/admin-audit-write-contract.ts",
  );
  const adminAuditRoute = read("app/api/admin/audit-events/route.ts");
  const adminPage = read("app/[locale]/admin/import-products/page.tsx");
  for (const needle of [
    "adminAuthSessionMatrix",
    "getAdminSessionPreviewFromEnv",
    "requireAdminScope",
    "product:active_publish",
  ]) {
    if (!adminAuthSession.includes(needle))
      errors.pushWithId.bind(errors, "security.028.lib-launch-admin-auth-session-guard-missing-auth-session.a001.lib-launch-admin-auth-session-guard-missing-auth-session")(
        `lib/launch/admin-auth-session-guard.ts: missing auth session marker ${needle}.`,
      );
  }
  for (const needle of [
    "adminIdempotencyStoreMatrix",
    "createAdminIdempotencyPreview",
    "Duplicate response policy",
  ]) {
    if (!adminIdempotency.includes(needle))
      errors.pushWithId.bind(errors, "security.028.lib-launch-admin-auth-session-guard-missing-auth-session.a002.lib-launch-admin-idempotency-store-missing-idempotency-m")(
        `lib/launch/admin-idempotency-store.ts: missing idempotency marker ${needle}.`,
      );
  }
  for (const needle of [
    "sessionPreview",
    "permissionPreview",
    "idempotencyPreview",
  ]) {
    if (!adminAuditWriteContract.includes(needle))
      errors.pushWithId.bind(errors, "security.028.lib-launch-admin-auth-session-guard-missing-auth-session.a003.lib-launch-admin-audit-write-contract-missing-legacy-aud")(
        `lib/launch/admin-audit-write-contract.ts: missing PASS147 audit write marker ${needle}.`,
      );
  }
  if (!adminAuditRoute.includes("sessionPreview"))
    errors.pushWithId.bind(errors, "security.028.lib-launch-admin-auth-session-guard-missing-auth-session.a004.app-api-admin-audit-events-route-sessionpreview-missing")("app/api/admin/audit-events/route.ts: sessionPreview missing.");
  for (const needle of [
    "AdminAuthSessionGuardPanel",
    "AdminIdempotencyStorePanel",
  ]) {
    if (!adminPage.includes(needle))
      errors.pushWithId.bind(errors, "security.028.lib-launch-admin-auth-session-guard-missing-auth-session.a005.app-locale-admin-import-products-pagex-missing-value")(
        `app/[locale]/admin/import-products/page.tsx: missing ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.028.lib-launch-admin-auth-session-guard-missing-auth-session.a006.admin-auth-session-idempotency-production-guard-failed-v")(
    `Admin auth session/idempotency production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.security-operations.029");

// VLM brain orbit cleanup production guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const marketClientSource = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const cssSource = read("app/globals.css");
  for (const needle of [
    "PASS149 hard guard: Orbit 360 belongs only to Advanced",
    "allowedMotionPresets",
    "selectedTileEvidenceCopy",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "security.029.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS148 VLM brain marker ${needle}.`,
      );
  }
  if (
    modalSource.includes('(["orbit", "lite", "static"]') ||
    modalSource.includes("ui.motionLite")
  ) {
    errors.pushWithId.bind(errors, "security.029.components-market-integrity-tokenriskmodalx-missing-lega.a002.components-market-integrity-tokenriskmodalx-lite-motion")(
      "components/market-integrity/TokenRiskModal.tsx: Lite motion UI must stay removed.",
    );
  }
  for (const needle of [
    "shield-suggestion-token-avatar",
    "localLookup",
    "shield-token-search-suggest-row",
  ]) {
    if (!marketClientSource.includes(needle))
      errors.pushWithId.bind(errors, "security.029.components-market-integrity-tokenriskmodalx-missing-lega.a003.components-market-integrity-marketintegrityclientx-missi")(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS148 search suggestion marker ${needle}.`,
      );
  }
  if (!cssSource.includes("PASS148 — VLM brain cleanup"))
    errors.pushWithId.bind(errors, "security.029.components-market-integrity-tokenriskmodalx-missing-lega.a004.app-globals-css-missing-legacy-vlm-brain-cleanup-css")("app/globals.css: missing PASS148 VLM brain cleanup CSS.");
} catch (error) {
  errors.pushWithId.bind(errors, "security.029.components-market-integrity-tokenriskmodalx-missing-lega.a005.vlm-brain-orbit-cleanup-production-guard-failed-value")(
    `VLM brain orbit cleanup production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
