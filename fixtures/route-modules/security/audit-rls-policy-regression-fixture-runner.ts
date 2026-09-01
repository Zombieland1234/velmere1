import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { sanitizePublicAuditEnvelope } from "@/lib/security/public-private-route-lockdown";
import { buildPass2625RuntimeEvidenceTestPackReport } from "@/lib/security/runtime-evidence-test-pack";
import { buildPass2626RuntimeReplayArtifactCollectorReport } from "@/lib/security/runtime-replay-artifact-collector";
import { buildPass2627RuntimeReplayArtifactStorageAdapterReport } from "@/lib/security/runtime-replay-artifact-storage-adapter";
import { buildPass2628SupabaseReleaseEvidenceBoardMigrationRlsGateReport } from "@/lib/security/supabase-release-evidence-board-migration-rls-gate";
import {
  buildPass2629SupabaseRlsPolicyRegressionFixtureRunnerReport,
  PASS2629_SUPABASE_RLS_POLICY_REGRESSION_FIXTURE_RUNNER_ID,
  type Pass2629FixtureObserved,
} from "@/lib/security/supabase-rls-policy-regression-fixture-runner";

export const dynamic = "force-dynamic";

function flag(value: string | null, fallback = false) {
  if (value === "1" || value === "true" || value === "yes") return true;
  if (value === "0" || value === "false" || value === "no") return false;
  return fallback;
}

function observed(value: string | null): Pass2629FixtureObserved | undefined {
  if (value === "allow" || value === "deny" || value === "not_executed") return value;
  return undefined;
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("audit-rls-policy-regression-fixture-runner");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "en";
  const previewRunId = url.searchParams.get("previewRunId") ?? url.searchParams.get("reportId");
  const runtimeE2eExecuted = flag(url.searchParams.get("runtimeE2eExecuted"), false);
  const productionMode = flag(url.searchParams.get("productionMode"), process.env.NODE_ENV === "production");
  const supabaseConfigured = flag(url.searchParams.get("supabaseConfigured"), Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY));
  const fixturesExecuted = flag(url.searchParams.get("fixturesExecuted"), false);

  const runtimeEvidenceTestPack = buildPass2625RuntimeEvidenceTestPackReport({
    locale,
    proPdfCanStream: flag(url.searchParams.get("proPdfCanStream"), false),
    proPdfMissingClaims: ["reportId", "accountId", "entitlementId", "reportVersionHash", "oneTimeDownloadToken"],
    proPdfReplayBlocked: flag(url.searchParams.get("proPdfReplayBlocked"), true),
    refundRevocationReady: flag(url.searchParams.get("refundRevocationReady"), true),
    webhookIdempotencyReady: flag(url.searchParams.get("webhookIdempotencyReady"), true),
    webhookQuarantineReady: flag(url.searchParams.get("webhookQuarantineReady"), true),
    deadLetterReady: flag(url.searchParams.get("deadLetterReady"), true),
    supabaseProductionLockReady: flag(url.searchParams.get("supabaseProductionLockReady"), true),
    memoryFallbackBlockedInProduction: flag(url.searchParams.get("memoryFallbackBlockedInProduction"), true),
    accountOwnerScoped: flag(url.searchParams.get("accountOwnerScoped"), true),
    publicApiSanitized: flag(url.searchParams.get("publicApiSanitized"), true),
    operatorRoutesRequireAdmin: flag(url.searchParams.get("operatorRoutesRequireAdmin"), true),
    pdfLeakGuardReady: flag(url.searchParams.get("pdfLeakGuardReady"), true),
    runtimeE2eExecuted,
  });

  const runtimeReplayArtifactCollector = buildPass2626RuntimeReplayArtifactCollectorReport({
    locale,
    runtimeEvidenceTestPack,
    runtimeE2eExecuted,
    previewRunId,
    proPdfMissingClaimsArtifactAttached: flag(url.searchParams.get("proPdfMissingClaimsArtifactAttached"), fixturesExecuted),
    proPdfConsumedTokenArtifactAttached: flag(url.searchParams.get("proPdfConsumedTokenArtifactAttached"), fixturesExecuted),
    stripeDuplicateWebhookArtifactAttached: flag(url.searchParams.get("stripeDuplicateWebhookArtifactAttached"), fixturesExecuted),
    stripeRefundRevocationArtifactAttached: flag(url.searchParams.get("stripeRefundRevocationArtifactAttached"), fixturesExecuted),
    stripeInvalidSignatureArtifactAttached: flag(url.searchParams.get("stripeInvalidSignatureArtifactAttached"), fixturesExecuted),
    supabaseProductionLockArtifactAttached: flag(url.searchParams.get("supabaseProductionLockArtifactAttached"), fixturesExecuted),
    accountOwnerMismatchArtifactAttached: flag(url.searchParams.get("accountOwnerMismatchArtifactAttached"), fixturesExecuted),
    publicApiLeakScanArtifactAttached: flag(url.searchParams.get("publicApiLeakScanArtifactAttached"), fixturesExecuted),
    pdfLeakScanArtifactAttached: flag(url.searchParams.get("pdfLeakScanArtifactAttached"), fixturesExecuted),
    operatorAuthArtifactAttached: flag(url.searchParams.get("operatorAuthArtifactAttached"), fixturesExecuted),
    preflightArtifactAttached: flag(url.searchParams.get("preflightArtifactAttached"), true),
    i18nArtifactAttached: flag(url.searchParams.get("i18nArtifactAttached"), true),
    releaseBoardStored: flag(url.searchParams.get("releaseBoardStored"), fixturesExecuted),
  });

  const storageAdapter = buildPass2627RuntimeReplayArtifactStorageAdapterReport({
    locale,
    runtimeReplayArtifactCollector,
    previewRunId,
    productionMode,
    supabaseConfigured,
    releaseBoardStored: flag(url.searchParams.get("releaseBoardStored"), fixturesExecuted),
    appendOnlyLedgerReady: flag(url.searchParams.get("appendOnlyLedgerReady"), true),
    immutableHashVerified: flag(url.searchParams.get("immutableHashVerified"), fixturesExecuted),
    artifactPointersStored: flag(url.searchParams.get("artifactPointersStored"), fixturesExecuted),
    storageOwnerScoped: flag(url.searchParams.get("storageOwnerScoped"), true),
    noMemoryFallbackInProduction: flag(url.searchParams.get("noMemoryFallbackInProduction"), !productionMode || supabaseConfigured),
    customerPublicStatusStored: flag(url.searchParams.get("customerPublicStatusStored"), fixturesExecuted),
    operatorPrivateRefsStored: flag(url.searchParams.get("operatorPrivateRefsStored"), fixturesExecuted),
    releasePacketSealed: flag(url.searchParams.get("releasePacketSealed"), fixturesExecuted),
    releaseBoardVersion: url.searchParams.get("releaseBoardVersion"),
  });

  const rlsGate = buildPass2628SupabaseReleaseEvidenceBoardMigrationRlsGateReport({
    locale,
    storageAdapter,
    productionMode,
    supabaseConfigured,
    migrationPresent: flag(url.searchParams.get("migrationPresent"), true),
    rlsEnabled: flag(url.searchParams.get("rlsEnabled"), true),
    insertOnlyPolicyReady: flag(url.searchParams.get("insertOnlyPolicyReady"), true),
    updateDeleteDenied: flag(url.searchParams.get("updateDeleteDenied"), true),
    ownerSelectPolicyReady: flag(url.searchParams.get("ownerSelectPolicyReady"), true),
    adminServiceRolePolicyReady: flag(url.searchParams.get("adminServiceRolePolicyReady"), true),
    privateRefsOperatorOnly: flag(url.searchParams.get("privateRefsOperatorOnly"), true),
    noRawPayloadColumns: flag(url.searchParams.get("noRawPayloadColumns"), true),
    releaseBoardHashUnique: flag(url.searchParams.get("releaseBoardHashUnique"), true),
    artifactPointerRedactionReady: flag(url.searchParams.get("artifactPointerRedactionReady"), true),
    immutableSealPolicyReady: flag(url.searchParams.get("immutableSealPolicyReady"), storageAdapter.summary.canPersistReleaseBoard),
  });

  const report = buildPass2629SupabaseRlsPolicyRegressionFixtureRunnerReport({
    locale,
    rlsGate,
    fixturesExecuted,
    ownerSelectObserved: observed(url.searchParams.get("ownerSelectObserved")),
    otherOwnerSelectObserved: observed(url.searchParams.get("otherOwnerSelectObserved")),
    anonSelectObserved: observed(url.searchParams.get("anonSelectObserved")),
    serviceInsertObserved: observed(url.searchParams.get("serviceInsertObserved")),
    ownerInsertObserved: observed(url.searchParams.get("ownerInsertObserved")),
    updateObserved: observed(url.searchParams.get("updateObserved")),
    deleteObserved: observed(url.searchParams.get("deleteObserved")),
    operatorPrivateRefSelectObserved: observed(url.searchParams.get("operatorPrivateRefSelectObserved")),
    ownerPrivateRefSelectObserved: observed(url.searchParams.get("ownerPrivateRefSelectObserved")),
    servicePrivateRefInsertObserved: observed(url.searchParams.get("servicePrivateRefInsertObserved")),
    anonPrivateRefSelectObserved: observed(url.searchParams.get("anonPrivateRefSelectObserved")),
    operatorBoardSelectObserved: observed(url.searchParams.get("operatorBoardSelectObserved")),
  });

  return NextResponse.json(sanitizePublicAuditEnvelope({
    ok: report.customerResponse.ok,
    surface: "audit-rls-policy-regression-fixture-runner",
    pass2629SupabaseRlsPolicyRegressionFixtureRunner: report,
  }, "pass2629-rls-policy-fixture-runner"), {
    status: report.httpStatus,
    headers: {
      "cache-control": "no-store",
      "x-velmere-pass2629-rls-policy-fixture-runner": PASS2629_SUPABASE_RLS_POLICY_REGRESSION_FIXTURE_RUNNER_ID,
      "x-velmere-rls-fixture-readiness": String(report.summary.regressionReadiness),
      "x-velmere-rls-fixtures-executed": String(report.summary.fixturesExecuted),
      "x-velmere-rls-expected-deny-rows": String(report.summary.expectedDenyRows),
      "x-velmere-rls-private-ref-readiness": String(report.summary.privateRefReadiness),
      "x-velmere-rls-negative-control-readiness": String(report.summary.negativeControlReadiness),
    },
  });
}
