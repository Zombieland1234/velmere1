import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import { buildPass2828EvidenceArtifactHandoffGate, type Pass2828ArtifactStatus } from "@/lib/market-integrity/top1-evidence-artifact-handoff-gate";
import { buildPass2829ReleaseProofCollectorGate } from "@/lib/market-integrity/top1-release-proof-collector-gate";
import { buildPass2830ReleasePacketSealGate } from "@/lib/market-integrity/top1-release-packet-seal-gate";
import { buildPass2831SealDriftMonitorGate } from "@/lib/market-integrity/top1-seal-drift-monitor-gate";
import { buildPass2832ProductionCanaryRollbackGate } from "@/lib/market-integrity/top1-production-canary-rollback-gate";
import {
  PASS2833_INCIDENT_DISCLOSURE_RESPONSE_ACCEPTANCE_GATES,
  buildPass2833IncidentDisclosureResponseGate,
} from "@/lib/market-integrity/top1-incident-disclosure-response-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tierFrom(value: string | null): VelmereTier {
  const normalized = (value ?? "Basic").toLowerCase();
  if (normalized === "advanced") return "Advanced";
  if (normalized === "pro") return "Pro";
  return "Basic";
}

function bool(value: string | null) {
  return value === "1" || value === "true" || value === "passed" || value === "fresh";
}

function statusFrom(value: string | null): Pass2828ArtifactStatus | undefined {
  if (value === "missing" || value === "prepared" || value === "attached" || value === "failed" || value === "stale") return value;
  return undefined;
}

function numberFrom(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("incident-disclosure-response");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const tier = tierFrom(url.searchParams.get("tier"));
  const surface = url.searchParams.get("surface") ?? "VLM Brain";
  const handoffGate = buildPass2828EvidenceArtifactHandoffGate({
    surface,
    tier,
    buildArtifactId: url.searchParams.get("buildArtifactId"),
    typecheckArtifactId: url.searchParams.get("typecheckArtifactId"),
    i18nArtifactId: url.searchParams.get("i18nArtifactId"),
    verifierArtifactId: url.searchParams.get("verifierArtifactId") ?? "pass2833-verifier-prepared",
    liveProviderSmokeArtifactId: url.searchParams.get("liveProviderSmokeArtifactId"),
    screenshotPackArtifactId: url.searchParams.get("screenshotPackArtifactId"),
    mobileScreenshotPackArtifactId: url.searchParams.get("mobileScreenshotPackArtifactId"),
    securityScanArtifactId: url.searchParams.get("securityScanArtifactId"),
    pdfParityPacketArtifactId: url.searchParams.get("pdfParityPacketArtifactId"),
    buildStatus: statusFrom(url.searchParams.get("buildStatus")) ?? "missing",
    typecheckStatus: statusFrom(url.searchParams.get("typecheckStatus")) ?? "missing",
    i18nStatus: statusFrom(url.searchParams.get("i18nStatus")) ?? "prepared",
    verifierStatus: statusFrom(url.searchParams.get("verifierStatus")) ?? "prepared",
    liveProviderSmokeStatus: statusFrom(url.searchParams.get("liveProviderSmokeStatus")) ?? "prepared",
    screenshotStatus: statusFrom(url.searchParams.get("screenshotStatus")) ?? "prepared",
    mobileScreenshotStatus: statusFrom(url.searchParams.get("mobileScreenshotStatus")) ?? "prepared",
    securityScanStatus: statusFrom(url.searchParams.get("securityScanStatus")) ?? "prepared",
    pdfParityStatus: statusFrom(url.searchParams.get("pdfParityStatus")) ?? "prepared",
    payloadHash: url.searchParams.get("payloadHash"),
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot"),
  });

  const collectorGate = buildPass2829ReleaseProofCollectorGate({
    surface,
    tier,
    handoffGate,
    payloadHash: url.searchParams.get("payloadHash"),
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot"),
    sealedPacketRequested: bool(url.searchParams.get("sealed")),
  });

  const sealGate = buildPass2830ReleasePacketSealGate({
    surface,
    tier,
    collectorGate,
    payloadHash: url.searchParams.get("payloadHash"),
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot"),
    requestedSeal: bool(url.searchParams.get("seal")),
    revoked: bool(url.searchParams.get("revoked")),
    codeRefChanged: bool(url.searchParams.get("codeRefChanged")),
  });

  const driftGate = buildPass2831SealDriftMonitorGate({
    surface,
    tier,
    releasePacketSealGate: sealGate,
    lastReplayAt: url.searchParams.get("lastReplayAt"),
    latestHeartbeatAt: url.searchParams.get("latestHeartbeatAt"),
    heartbeatCount: numberFrom(url.searchParams.get("heartbeatCount"), 0),
    failedHeartbeatCount: numberFrom(url.searchParams.get("failedHeartbeatCount"), 0),
    payloadHashChanged: bool(url.searchParams.get("payloadHashChanged")),
    sourceReceiptRootChanged: bool(url.searchParams.get("sourceReceiptRootChanged")),
    codeRefChanged: bool(url.searchParams.get("codeRefChanged")),
    providerRegistryChanged: bool(url.searchParams.get("providerRegistryChanged")),
    pdfRendererChanged: bool(url.searchParams.get("pdfRendererChanged")),
    securityPolicyChanged: bool(url.searchParams.get("securityPolicyChanged")),
    entitlementPolicyChanged: bool(url.searchParams.get("entitlementPolicyChanged")),
    chartRendererChanged: bool(url.searchParams.get("chartRendererChanged")),
    mobileSurfaceChanged: bool(url.searchParams.get("mobileSurfaceChanged")),
    liveProviderSmokeFresh: bool(url.searchParams.get("liveProviderSmokeFresh")),
    pdfParityFresh: bool(url.searchParams.get("pdfParityFresh")),
    securityScanFresh: bool(url.searchParams.get("securityScanFresh")),
    mobileQaFresh: bool(url.searchParams.get("mobileQaFresh")),
  });

  const canaryGate = buildPass2832ProductionCanaryRollbackGate({
    surface,
    tier,
    sealDriftMonitorGate: driftGate,
    trafficPercent: numberFrom(url.searchParams.get("trafficPercent"), 0),
    minimumObservationMinutes: numberFrom(url.searchParams.get("minimumObservationMinutes"), 45),
    observedMinutes: numberFrom(url.searchParams.get("observedMinutes"), 0),
    errorRatePercent: numberFrom(url.searchParams.get("errorRatePercent"), 0),
    p95LatencyMs: numberFrom(url.searchParams.get("p95LatencyMs"), 0),
    providerFailureRatePercent: numberFrom(url.searchParams.get("providerFailureRatePercent"), 0),
    pdfMismatchCount: numberFrom(url.searchParams.get("pdfMismatchCount"), 0),
    entitlementErrorCount: numberFrom(url.searchParams.get("entitlementErrorCount"), 0),
    chartSkeletonSpike: bool(url.searchParams.get("chartSkeletonSpike")),
    customerDeliveryFailureCount: numberFrom(url.searchParams.get("customerDeliveryFailureCount"), 0),
    rollbackSwitchAvailable: bool(url.searchParams.get("rollbackSwitchAvailable")),
    rollbackExecuted: bool(url.searchParams.get("rollbackExecuted")),
  });

  const pass2833IncidentDisclosureResponseGate = buildPass2833IncidentDisclosureResponseGate({
    surface,
    tier,
    productionCanaryRollbackGate: canaryGate,
    incidentDetected: bool(url.searchParams.get("incidentDetected")),
    dataLeakSuspected: bool(url.searchParams.get("dataLeakSuspected")),
    paidEvidenceAffected: bool(url.searchParams.get("paidEvidenceAffected")),
    customerImpactCount: numberFrom(url.searchParams.get("customerImpactCount"), 0),
    p0SecurityEventCount: numberFrom(url.searchParams.get("p0SecurityEventCount"), 0),
    providerOutageMinutes: numberFrom(url.searchParams.get("providerOutageMinutes"), 0),
    publicStatusPageUpdated: bool(url.searchParams.get("publicStatusPageUpdated")),
    customerNoticeDrafted: bool(url.searchParams.get("customerNoticeDrafted")),
    customerNoticeSent: bool(url.searchParams.get("customerNoticeSent")),
    supportQueueReady: bool(url.searchParams.get("supportQueueReady")),
    affectedAccountsRedacted: url.searchParams.get("affectedAccountsRedacted") !== "false",
    postmortemDueHours: numberFrom(url.searchParams.get("postmortemDueHours"), 72),
    postmortemCompleted: bool(url.searchParams.get("postmortemCompleted")),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2833,
      pass2832LegacyCompatibility: { pass: 2832, rule: "PASS2832 production canary rollback remains present while PASS2833 adds incident disclosure/customer support/postmortem boundary." },
      canaryGate,
      pass2833IncidentDisclosureResponseGate,
      pass2833IncidentDisclosureAcceptanceGates: PASS2833_INCIDENT_DISCLOSURE_RESPONSE_ACCEPTANCE_GATES,
      customerSafeCopy: "Incident disclosure is a safety gate. Rollback does not erase customer impact; paid delivery and launch-ready copy stay frozen until notice, support, redaction and postmortem proof clear.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
