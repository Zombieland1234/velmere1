import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import {
  PASS2828_EVIDENCE_ARTIFACT_HANDOFF_ACCEPTANCE_GATES,
  buildPass2828EvidenceArtifactHandoffGate,
  type Pass2828ArtifactStatus,
} from "@/lib/market-integrity/top1-evidence-artifact-handoff-gate";
import {
  PASS2829_RELEASE_PROOF_COLLECTOR_ACCEPTANCE_GATES,
  buildPass2829ReleaseProofCollectorGate,
} from "@/lib/market-integrity/top1-release-proof-collector-gate";
import {
  PASS2830_RELEASE_PACKET_SEAL_ACCEPTANCE_GATES,
  buildPass2830ReleasePacketSealGate,
} from "@/lib/market-integrity/top1-release-packet-seal-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tierFrom(value: string | null): VelmereTier {
  const normalized = (value ?? "Basic").toLowerCase();
  if (normalized === "advanced") return "Advanced";
  if (normalized === "pro") return "Pro";
  return "Basic";
}

function statusFrom(value: string | null): Pass2828ArtifactStatus | undefined {
  if (
    value === "missing" ||
    value === "prepared" ||
    value === "attached" ||
    value === "failed" ||
    value === "stale"
  ) {
    return value;
  }
  return undefined;
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("evidence-artifact-state");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const gate = buildPass2828EvidenceArtifactHandoffGate({
    surface: url.searchParams.get("surface") ?? "VLM Brain",
    tier: tierFrom(url.searchParams.get("tier")),
    buildArtifactId: url.searchParams.get("buildArtifactId"),
    typecheckArtifactId: url.searchParams.get("typecheckArtifactId"),
    i18nArtifactId: url.searchParams.get("i18nArtifactId"),
    verifierArtifactId: url.searchParams.get("verifierArtifactId") ?? "pass2828-verifier-prepared",
    liveProviderSmokeArtifactId: url.searchParams.get("liveProviderSmokeArtifactId"),
    screenshotPackArtifactId: url.searchParams.get("screenshotPackArtifactId"),
    mobileScreenshotPackArtifactId: url.searchParams.get("mobileScreenshotPackArtifactId"),
    securityScanArtifactId: url.searchParams.get("securityScanArtifactId"),
    pdfParityPacketArtifactId: url.searchParams.get("pdfParityPacketArtifactId"),
    buildStatus: statusFrom(url.searchParams.get("buildStatus")),
    typecheckStatus: statusFrom(url.searchParams.get("typecheckStatus")),
    i18nStatus: statusFrom(url.searchParams.get("i18nStatus")),
    verifierStatus: statusFrom(url.searchParams.get("verifierStatus")),
    liveProviderSmokeStatus: statusFrom(url.searchParams.get("liveProviderSmokeStatus")),
    screenshotStatus: statusFrom(url.searchParams.get("screenshotStatus")),
    mobileScreenshotStatus: statusFrom(url.searchParams.get("mobileScreenshotStatus")),
    securityScanStatus: statusFrom(url.searchParams.get("securityScanStatus")),
    pdfParityStatus: statusFrom(url.searchParams.get("pdfParityStatus")),
    payloadHash: url.searchParams.get("payloadHash"),
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot"),
  });

  const releaseProofCollectorGate = buildPass2829ReleaseProofCollectorGate({
    surface: url.searchParams.get("surface") ?? "VLM Brain",
    tier: tierFrom(url.searchParams.get("tier")),
    handoffGate: gate,
    payloadHash: url.searchParams.get("payloadHash"),
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot"),
    sealedPacketRequested: url.searchParams.get("sealed") === "1" || url.searchParams.get("sealed") === "true",
  });

  const releasePacketSealGate = buildPass2830ReleasePacketSealGate({
    surface: url.searchParams.get("surface") ?? "VLM Brain",
    tier: tierFrom(url.searchParams.get("tier")),
    collectorGate: releaseProofCollectorGate,
    payloadHash: url.searchParams.get("payloadHash"),
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot"),
    requestedSeal: url.searchParams.get("seal") === "1" || url.searchParams.get("seal") === "true",
    revoked: url.searchParams.get("revoked") === "1" || url.searchParams.get("revoked") === "true",
    codeRefChanged: url.searchParams.get("codeRefChanged") === "1" || url.searchParams.get("codeRefChanged") === "true",
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2830,
      pass2829LegacyCompatibility: { pass: 2829, rule: "PASS2829 release proof collector remains present while PASS2830 adds seal state." },
      pass2828LegacyCompatibility: { pass: 2828, rule: "PASS2828 artifact handoff remains present while PASS2829 classifies proof freshness and sealed packet state." },
      gate,
      releaseProofCollectorGate,
      releasePacketSealGate,
      acceptanceGates: [...PASS2828_EVIDENCE_ARTIFACT_HANDOFF_ACCEPTANCE_GATES, ...PASS2829_RELEASE_PROOF_COLLECTOR_ACCEPTANCE_GATES, ...PASS2830_RELEASE_PACKET_SEAL_ACCEPTANCE_GATES],
      customerSafeCopy:
        "This endpoint is an evidence handoff + release proof collector. It cannot make launch-ready or 100% claims unless artifact IDs for build, typecheck, live provider smoke, screenshots, mobile QA, security QA and PDF parity are attached, fresh and sealed into the release proof packet.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
