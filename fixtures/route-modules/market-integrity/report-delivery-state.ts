import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { resolveRequestAccount } from "@/lib/auth/account-session";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import { buildReportAccessDecision } from "@/lib/market-integrity/top1-entitlement-report-access";
import { buildPass2821CustomerDeliveryLedger } from "@/lib/market-integrity/top1-customer-delivery-ledger";
import {
  PASS2822_ACCOUNT_VAULT_TOKEN_ACCEPTANCE_GATES,
  buildPass2822AccountVaultTokenConsumptionGate,
} from "@/lib/market-integrity/top1-account-vault-token-consumption-gate";
import {
  PASS2823_ADVANCED_HUMAN_REVIEW_ACCEPTANCE_GATES,
  buildPass2823AdvancedHumanReviewGate,
} from "@/lib/market-integrity/top1-advanced-human-review-signoff-gate";
import {
  PASS2824_ADVANCED_REVIEW_REPLAY_AUDIT_ACCEPTANCE_GATES,
  buildPass2824AdvancedReviewReplayAuditGate,
} from "@/lib/market-integrity/top1-advanced-review-replay-audit-gate";
import {
  PASS2825_COMMUNITY_SOURCE_UPGRADE_ACCEPTANCE_GATES,
  buildPass2825CommunitySourceUpgradeModerationGate,
} from "@/lib/market-integrity/top1-community-source-upgrade-moderation-gate";
import {
  PASS2826_CUSTOMER_SAFE_NARRATIVE_ACCEPTANCE_GATES,
  buildPass2826CustomerSafeNarrativeGate,
} from "@/lib/market-integrity/top1-customer-safe-narrative-gate";
import {
  PASS2827_LAUNCH_READINESS_ACCEPTANCE_GATES,
  buildPass2827LaunchReadinessEvidenceGate,
} from "@/lib/market-integrity/top1-launch-readiness-evidence-gate";
import {
  PASS2828_EVIDENCE_ARTIFACT_HANDOFF_ACCEPTANCE_GATES,
  buildPass2828EvidenceArtifactHandoffGate,
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

function tierFromRequest(value: string | null): VelmereTier {
  const normalized = (value ?? "Basic").toLowerCase();
  if (normalized === "advanced") return "Advanced";
  if (normalized === "pro") return "Pro";
  return "Basic";
}

function tokenStatusFromRequest(value: string | null) {
  if (value === "issued" || value === "consumed" || value === "expired" || value === "revoked") return value;
  return null;
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("report-delivery-state");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const tier = tierFromRequest(url.searchParams.get("tier"));
  const account = await resolveRequestAccount(request);
  const accessContext = {
    tier: tier,
    accountId: account?.accountId ?? null,
    serverReceiptId: null,
    reportToken: null,
    payloadHash: null,
    manualReviewReceiptId: null,
    verification: {
      accountBound: Boolean(account),
      serverReceiptVerified: false,
      reportTokenVerified: false,
      payloadHashBound: false,
      manualReviewVerified: false,
      source: "diagnostic_only" as const,
    },
  };
  const decision = buildReportAccessDecision(accessContext);
  const sourceReceiptRoot = url.searchParams.get("sourceReceiptRoot") ?? "pending-source-root";
  const pdfCleanroomStatus = url.searchParams.get("pdfCleanroomStatus") ?? "prepared";
  const runtimeState = url.searchParams.get("runtimeState") ?? "degraded";
  const customerDeliveryLedger = buildPass2821CustomerDeliveryLedger({
    surface: "Report Delivery State",
    tier,
    paidEvidenceAllowed: decision.paidEvidenceAllowed,
    accountBound: Boolean(accessContext.accountId),
    serverReceiptPresent: Boolean(accessContext.serverReceiptId),
    oneTimeReportTokenPresent: Boolean(accessContext.reportToken),
    payloadHash: accessContext.payloadHash,
    sourceReceiptRoot,
    pdfCleanroomStatus,
    runtimeState,
    manualReviewReceiptPresent: Boolean(accessContext.manualReviewReceiptId),
    expiresInMinutes: tier === "Basic" ? 15 : tier === "Pro" ? 10 : 5,
  });
  const accountVaultTokenGate = buildPass2822AccountVaultTokenConsumptionGate({
    surface: "Report Delivery State",
    tier,
    accountBound: Boolean(accessContext.accountId),
    serverReceiptPresent: Boolean(accessContext.serverReceiptId),
    reportToken: accessContext.reportToken,
    reportTokenStatus: tokenStatusFromRequest(url.searchParams.get("tokenStatus")),
    payloadHash: accessContext.payloadHash,
    deliveredPayloadHash: url.searchParams.get("deliveredPayloadHash"),
    sourceReceiptRoot,
    customerDeliveryStatus: customerDeliveryLedger.status,
    pdfCleanroomStatus,
    runtimeState,
    issuedAt: url.searchParams.get("issuedAt"),
    consumedAt: url.searchParams.get("consumedAt"),
    revokedAt: url.searchParams.get("revokedAt"),
    expiresInMinutes: tier === "Basic" ? 15 : tier === "Pro" ? 10 : 5,
    replayCount: Number(url.searchParams.get("replayCount") ?? 0),
    resendRequested: url.searchParams.get("resend") === "1",
    chargebackOrRevoked: url.searchParams.get("chargeback") === "1",
  });


  const advancedHumanReviewGate = buildPass2823AdvancedHumanReviewGate({
    surface: "Report Delivery State",
    tier,
    paidEvidenceAllowed: decision.paidEvidenceAllowed,
    manualReviewReceiptId: accessContext.manualReviewReceiptId,
    operatorId: url.searchParams.get("operatorId") ?? request.headers.get("x-velmere-operator-id"),
    operatorSignature: url.searchParams.get("operatorSignature") ?? request.headers.get("x-velmere-operator-signature"),
    payloadHash: accessContext.payloadHash,
    sourceReceiptRoot,
    reviewPayloadHash: url.searchParams.get("reviewPayloadHash"),
    reviewerNote: url.searchParams.get("reviewerNote"),
    generatedAt: url.searchParams.get("issuedAt"),
    reviewedAt: url.searchParams.get("reviewedAt"),
    reviewRejected: url.searchParams.get("reviewRejected") === "1",
    runtimeState,
    tokenState: accountVaultTokenGate.tokenState,
    expiresInMinutes: 1440,
  });

  const advancedReviewReplayAuditGate = buildPass2824AdvancedReviewReplayAuditGate({
    surface: "Report Delivery State",
    tier,
    previousGate: advancedHumanReviewGate,
    paidEvidenceAllowed: decision.paidEvidenceAllowed,
    payloadHash: accessContext.payloadHash,
    deliveredPayloadHash: url.searchParams.get("deliveredPayloadHash") ?? request.headers.get("x-velmere-delivered-payload-hash"),
    reviewPayloadHash: url.searchParams.get("reviewPayloadHash"),
    sourceReceiptRoot,
    deliveredSourceReceiptRoot: url.searchParams.get("deliveredSourceReceiptRoot") ?? sourceReceiptRoot,
    reviewSourceReceiptRoot: url.searchParams.get("reviewSourceReceiptRoot"),
    operatorSignatureHash: advancedHumanReviewGate.operatorSignatureHash,
    operatorSignatureReplayHash: url.searchParams.get("operatorSignatureReplayHash") ?? request.headers.get("x-velmere-operator-signature-replay-hash"),
    reviewerNote: url.searchParams.get("reviewerNote"),
    signedReviewerNoteHash: url.searchParams.get("signedReviewerNoteHash"),
    replayReviewerNoteHash: url.searchParams.get("replayReviewerNoteHash"),
    replayAttemptCount: Number(url.searchParams.get("replayAttemptCount") ?? 0),
    tokenState: accountVaultTokenGate.tokenState,
    runtimeState,
  });

  const communitySourceUpgradeModerationGate = buildPass2825CommunitySourceUpgradeModerationGate({
    surface: "Report Delivery State",
    contentType: "api",
    title: "Delivery state community source boundary",
    body: url.searchParams.get("communityBody"),
    tags: [tier, "delivery", "square"],
    authorRole: "operator",
    accountBound: Boolean(accessContext.accountId),
    walletBound: false,
    firstPost: false,
    postsInWindow: 0,
    moderationState: url.searchParams.get("communityModerationState") === "approved" ? "approved" : "queued",
    unsafeLinkBlocked: url.searchParams.get("communityUnsafeLink") === "1",
    linkCount: Number(url.searchParams.get("communityLinkCount") ?? 0),
    requestedSourceUpgrade: url.searchParams.get("communitySourceUpgrade") === "1",
    sourceReceiptId: url.searchParams.get("communitySourceReceiptId"),
    moderatorId: url.searchParams.get("communityModeratorId"),
    payloadHash: accessContext.payloadHash,
    sourceReceiptRoot,
  });

  const customerSafeNarrativeGate = buildPass2826CustomerSafeNarrativeGate({
    surface: "Report Delivery State",
    tier,
    assetFamily: url.searchParams.get("family") ?? "unknown",
    locale: (url.searchParams.get("locale") === "pl" || url.searchParams.get("locale") === "de") ? (url.searchParams.get("locale") as "pl" | "de") : "en",
    narrativeText: url.searchParams.get("narrative") ?? "Delivery narrative is payload-bound, source-bound where available, paid-redacted where required, and not financial advice.",
    riskScorePresent: true,
    confidenceScorePresent: true,
    sourceFamilyCount: Number(url.searchParams.get("sourceFamilyCount") ?? 1),
    missingEvidenceCount: Number(url.searchParams.get("missingEvidenceCount") ?? 0),
    providerConflictCount: Number(url.searchParams.get("providerConflictCount") ?? 0),
    topDriversCount: Number(url.searchParams.get("topDriversCount") ?? 1),
    mitigatorsCount: Number(url.searchParams.get("mitigatorsCount") ?? 1),
    confidenceCapReason: "Delivery confidence follows token state, cleanroom status, source root and missing evidence.",
    paidEvidenceAllowed: decision.paidEvidenceAllowed,
    advancedReviewAllowed: advancedHumanReviewGate.decision === "operator_signed" && advancedReviewReplayAuditGate.releaseGate.status === "allow",
    sourceReceiptPresent: Boolean(sourceReceiptRoot),
    methodologyLinked: true,
    missingEvidenceShown: true,
    tierBoundaryShown: true,
    notAdviceShown: true,
    localePure: true,
  });

  const launchReadinessEvidenceGate = buildPass2827LaunchReadinessEvidenceGate({
    surface: "Report Access",
    tier,
    buildPassed: false,
    typecheckPassed: false,
    i18nPassed: true,
    verifierPassedCount: 8,
    verifierTotalCount: 10,
    liveProviderSmokePassed: false,
    screenshotQaPassed: false,
    mobileQaPassed: true,
    securityQaPassed: true,
    pdfParityPassed: Boolean(accessContext.payloadHash) && Boolean(sourceReceiptRoot),
    runtimeState,
    payloadHashPresent: Boolean(accessContext.payloadHash),
    sourceReceiptRootPresent: Boolean(sourceReceiptRoot),
    paidEvidenceRedacted: true,
    p0OpenCount: 1,
    p1OpenCount: 2,
  });

  const evidenceArtifactHandoffGate = buildPass2828EvidenceArtifactHandoffGate({
    surface: "Report Delivery State",
    tier,
    i18nArtifactId: "check-i18n-prepared-report-delivery-state",
    verifierArtifactId: "pass2828-verifier-prepared-report-delivery-state",
    buildStatus: "missing",
    typecheckStatus: "missing",
    liveProviderSmokeStatus: "prepared",
    screenshotStatus: "prepared",
    mobileScreenshotStatus: "prepared",
    securityScanStatus: "prepared",
    pdfParityStatus: accessContext.payloadHash ? "prepared" : "missing",
    payloadHash: accessContext.payloadHash,
    sourceReceiptRoot,
  });

  const releaseProofCollectorGate = buildPass2829ReleaseProofCollectorGate({
    surface: "Report Delivery State",
    tier,
    handoffGate: evidenceArtifactHandoffGate,
    payloadHash: accessContext.payloadHash,
    sourceReceiptRoot,
    sealedPacketRequested: url.searchParams.get("sealed") === "1" || url.searchParams.get("sealed") === "true",
  });

  const releasePacketSealGate = buildPass2830ReleasePacketSealGate({
    surface: "Report Delivery State",
    tier,
    collectorGate: releaseProofCollectorGate,
    payloadHash: accessContext.payloadHash,
    sourceReceiptRoot,
    requestedSeal: url.searchParams.get("seal") === "1" || url.searchParams.get("seal") === "true",
    revoked: url.searchParams.get("revoked") === "1" || url.searchParams.get("revoked") === "true",
    codeRefChanged: url.searchParams.get("codeRefChanged") === "1" || url.searchParams.get("codeRefChanged") === "true",
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2830,
      pass2829LegacyCompatibility: { pass: 2829, rule: "PASS2829 release proof collector remains present while PASS2830 adds seal state." },
      pass2828LegacyCompatibility: { pass: 2828, rule: "PASS2828 artifact handoff remains present while PASS2829 adds release proof packet collection." },
      pass2825LegacyCompatibility: { pass: 2825, rule: "PASS2825 Community/Square source-upgrade delivery diagnostics remain present while PASS2826 adds customer-safe narrative claim ledger." },
      pass2824LegacyCompatibility: { pass: 2824, rule: "PASS2824 replay/drift diagnostics remain present while PASS2825 adds Community/Square source-upgrade delivery boundary." },
      pass2823LegacyCompatibility: { pass: 2823, rule: "PASS2823 signoff diagnostics remain present while PASS2824 adds replay/drift audit." },
      pass2822LegacyCompatibility: { pass: 2822, rule: "PASS2822 token consumption diagnostics remain present while PASS2823 adds Advanced human-review signoff." },
      accessDecision: decision,
      customerDeliveryLedger,
      accountVaultTokenGate,
      advancedHumanReviewGate,
      advancedReviewReplayAuditGate,
      communitySourceUpgradeModerationGate,
      customerSafeNarrativeGate,
      launchReadinessEvidenceGate,
      pass2827LaunchReadinessAcceptanceGates: PASS2827_LAUNCH_READINESS_ACCEPTANCE_GATES,
      evidenceArtifactHandoffGate,
      pass2828EvidenceArtifactHandoffAcceptanceGates: PASS2828_EVIDENCE_ARTIFACT_HANDOFF_ACCEPTANCE_GATES,
      releaseProofCollectorGate,
      pass2829ReleaseProofCollectorAcceptanceGates: PASS2829_RELEASE_PROOF_COLLECTOR_ACCEPTANCE_GATES,
      releasePacketSealGate,
      pass2830ReleasePacketSealAcceptanceGates: PASS2830_RELEASE_PACKET_SEAL_ACCEPTANCE_GATES,
      acceptanceGates: [...PASS2822_ACCOUNT_VAULT_TOKEN_ACCEPTANCE_GATES, ...PASS2823_ADVANCED_HUMAN_REVIEW_ACCEPTANCE_GATES, ...PASS2824_ADVANCED_REVIEW_REPLAY_AUDIT_ACCEPTANCE_GATES, ...PASS2825_COMMUNITY_SOURCE_UPGRADE_ACCEPTANCE_GATES, ...PASS2826_CUSTOMER_SAFE_NARRATIVE_ACCEPTANCE_GATES, ...PASS2827_LAUNCH_READINESS_ACCEPTANCE_GATES, ...PASS2828_EVIDENCE_ARTIFACT_HANDOFF_ACCEPTANCE_GATES, ...PASS2829_RELEASE_PROOF_COLLECTOR_ACCEPTANCE_GATES, ...PASS2830_RELEASE_PACKET_SEAL_ACCEPTANCE_GATES],
      customerSafeCopy: "This endpoint models download/account/email/API delivery state. It never creates payment proof, never revives consumed/expired/revoked tokens, locks Advanced review until replay audit passes, treats Square/community content as metadata unless moderator source-upgrade receipt is payload-bound, and runs the customer-facing narrative through PASS2826 claim ledger, and blocks launch-ready/100% claims through PASS2827/2828 until build/typecheck/live-provider/screenshot/mobile/security/PDF parity artifacts are attached, fresh and sealed into a release proof packet.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
