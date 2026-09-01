import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  PASS4395_DURABLE_IDEMPOTENCY_BOUNDARY,
  type Pass4395DurableIdempotencyReserveInput,
  type Pass4395DurableIdempotencyReserveResult,
} from "../../lib/security/durable-idempotency-store";
import {
  issueSecurityOperatorAssertion,
  verifySecurityOperatorAssertion,
  type SecurityOperatorAssertionConsumeVerdict,
} from "../../lib/security/security-operator-assertion";
import {
  PASS6_MANUAL_REVIEW_APPROVER_PATH,
  PASS6_MANUAL_REVIEW_APPROVER_SCOPE,
  PASS6_MANUAL_REVIEW_PRIMARY_PATH,
  PASS6_MANUAL_REVIEW_PRIMARY_SCOPE,
  issuePass6ManualReviewAuthorityReceipt,
  pass6ManualReviewAuthorityMatchesAdvancedRelease,
  verifyAndConsumePass6ManualReviewAuthorityReceipt,
  verifyPass6ManualReviewAuthorityReceipt,
  type Pass6ManualReviewAction,
  type Pass6ManualReviewAuthorityReceipt,
  type Pass6ManualReviewBoundClaims,
  type Pass6ManualReviewKeyRing,
} from "../../lib/reporting/pass6-manual-review-authority";
import type { AdvancedAuditReleaseEnvelope } from "../../lib/security/advanced-audit-release-envelope";

const OPERATOR_SECRET = "operator-assertion-secret-32-bytes-minimum-2026";
const CURRENT_KEY = { keyId: "manual-review-current-2026-07", secret: "manual-review-current-secret-32-bytes-minimum-2026" };
const NEXT_KEY = { keyId: "manual-review-next-2026-08", secret: "manual-review-next-secret-32-bytes-minimum-2026" };
const KEY_RING: Pass6ManualReviewKeyRing = { current: CURRENT_KEY };
const ISSUED_AT = "2026-07-18T12:00:00.000Z";
const EXPIRES_AT = "2026-07-18T13:00:00.000Z";

let checks = 0;
let sequence = 0;

function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  checks += 1;
  console.log(`PASS ${checks}: ${message}`);
}

function hash(value: string) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function claimsFor(suffix: string): Pass6ManualReviewBoundClaims {
  return {
    caseId: `AUD-CASE-${suffix}`,
    accountHash: hash(`account:${suffix}`),
    tier: "advanced",
    packetDigest: hash(`packet:${suffix}`),
    sourceReceiptRoot: hash(`sources:${suffix}`),
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
    nonce: `manual-review-receipt-nonce-${suffix}-abcdef123456`,
  };
}

function actionFor(claims: Pass6ManualReviewBoundClaims, action: Pass6ManualReviewAction["action"]): Pass6ManualReviewAction {
  return {
    schemaVersion: "pass6-advanced-manual-review-action-v1",
    action,
    decision: "approve",
    ...claims,
  };
}

function assertionRequest(args: {
  path: string;
  role: "primary_reviewer" | "independent_approver";
  scope: string;
  operatorId: string;
  action: Pass6ManualReviewAction;
  mfa?: "totp" | "webauthn";
  nonce: string;
}) {
  const issued = issueSecurityOperatorAssertion({
    secret: OPERATOR_SECRET,
    operatorId: args.operatorId,
    role: args.role,
    scopes: [args.scope],
    mfa: args.mfa ?? "webauthn",
    request: { method: "POST", path: args.path, body: args.action },
    nonce: args.nonce,
    issuedAt: ISSUED_AT,
    expiresInSeconds: 600,
  });
  return new Request(`https://velmere.test${args.path}`, {
    method: "POST",
    headers: {
      "x-velmere-security-operator-assertion": issued.assertion,
      "x-velmere-security-operator-signature": issued.signature,
    },
  });
}

function durableAssertionConsumer() {
  return async (args: Parameters<typeof verifySecurityOperatorAssertion>[0]): Promise<SecurityOperatorAssertionConsumeVerdict> => {
    const verified = verifySecurityOperatorAssertion(args);
    if (!verified.ok) return verified;
    return {
      ...verified,
      replayProtection: {
        storageMode: "supabase_durable",
        durable: true,
        nonceKeyHash: hash(`operator:${verified.payload.operatorId}:${verified.payload.nonce}`),
      },
    };
  };
}

async function issueFixture(options?: {
  keyRing?: Pass6ManualReviewKeyRing;
  sameReviewer?: boolean;
  approverMfa?: "totp" | "webauthn";
  wrongApproverAction?: boolean;
  durableAssertions?: boolean;
}) {
  sequence += 1;
  const suffix = String(sequence).padStart(4, "0");
  const claims = claimsFor(suffix);
  const primaryAction = actionFor(claims, "primary_review");
  const correctApproverAction = actionFor(claims, "independent_approval");
  const approverAction = options?.wrongApproverAction
    ? { ...correctApproverAction, packetDigest: hash("wrong-packet") }
    : correctApproverAction;
  const primaryOperator = `reviewer-primary-${suffix}`;
  const approverOperator = options?.sameReviewer ? primaryOperator : `reviewer-approver-${suffix}`;
  const primaryRequest = assertionRequest({
    path: PASS6_MANUAL_REVIEW_PRIMARY_PATH,
    role: "primary_reviewer",
    scope: PASS6_MANUAL_REVIEW_PRIMARY_SCOPE,
    operatorId: primaryOperator,
    action: primaryAction,
    nonce: `primary-assertion-nonce-${suffix}-abcdef`,
  });
  const approverRequest = assertionRequest({
    path: PASS6_MANUAL_REVIEW_APPROVER_PATH,
    role: "independent_approver",
    scope: PASS6_MANUAL_REVIEW_APPROVER_SCOPE,
    operatorId: approverOperator,
    action: approverAction,
    mfa: options?.approverMfa,
    nonce: `approver-assertion-nonce-${suffix}-abcdef`,
  });
  const receipt = await issuePass6ManualReviewAuthorityReceipt({
    claims,
    primaryAssertionRequest: primaryRequest,
    approverAssertionRequest: approverRequest,
    operatorAssertionSecret: OPERATOR_SECRET,
    signingKeyRing: options?.keyRing ?? KEY_RING,
    now: ISSUED_AT,
    dependencies: options?.durableAssertions ? { consumeAssertion: durableAssertionConsumer() } : undefined,
  });
  return { receipt, claims };
}

function expectedFor(claims: Pass6ManualReviewBoundClaims) {
  return {
    caseId: claims.caseId,
    accountHash: claims.accountHash,
    tier: "advanced" as const,
    packetDigest: claims.packetDigest,
    sourceReceiptRoot: claims.sourceReceiptRoot,
  };
}

function cloneReceipt(receipt: Pass6ManualReviewAuthorityReceipt) {
  return JSON.parse(JSON.stringify(receipt)) as Pass6ManualReviewAuthorityReceipt;
}

function durableReserveFactory() {
  const seen = new Set<string>();
  return async (input: Pass4395DurableIdempotencyReserveInput): Promise<Pass4395DurableIdempotencyReserveResult> => {
    const duplicate = seen.has(input.keyHash);
    seen.add(input.keyHash);
    return {
      passId: "PASS4395_DURABLE_IDEMPOTENCY_RECEIPT",
      ok: !duplicate,
      duplicate,
      storageMode: "supabase_durable",
      durable: true,
      failClosed: true,
      keyHash: input.keyHash,
      valueHash: input.valueHash,
      ttlSeconds: input.ttlSeconds ?? 86_400,
      provider: "supabase",
      boundary: PASS4395_DURABLE_IDEMPOTENCY_BOUNDARY,
    };
  };
}

async function main() {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  delete process.env.NODE_ENV;
  delete process.env.VERCEL_ENV;
  try {
    const fixture = await issueFixture();
    const expected = expectedFor(fixture.claims);
    const verified = verifyPass6ManualReviewAuthorityReceipt({ receipt: fixture.receipt, keyRing: KEY_RING, expected, now: ISSUED_AT });
    ok(verified.ok && verified.keySlot === "current", "valid dual-control receipt verifies with the current HMAC key");
    ok(fixture.receipt.reviewers.length === 2
      && fixture.receipt.reviewers[0].role === "primary_reviewer"
      && fixture.receipt.reviewers[1].role === "independent_approver", "receipt contains exactly the two ordered authority roles");
    ok(fixture.receipt.reviewers.every((reviewer) => reviewer.mfa === "webauthn"), "both reviewers are backed by phishing-resistant WebAuthn assertions");
    ok(fixture.receipt.reviewers[0].operatorPseudonym !== fixture.receipt.reviewers[1].operatorPseudonym, "primary and independent reviewers are distinct principals");

    const rotated = verifyPass6ManualReviewAuthorityReceipt({
      receipt: fixture.receipt,
      keyRing: { current: NEXT_KEY, previous: CURRENT_KEY },
      expected,
      now: ISSUED_AT,
    });
    ok(rotated.ok && rotated.keySlot === "previous", "current-plus-previous key rotation verifies an unexpired previous-key receipt");

    const tampered = cloneReceipt(fixture.receipt);
    tampered.packetDigest = hash("attacker-packet");
    const tamperedVerdict = verifyPass6ManualReviewAuthorityReceipt({ receipt: tampered, keyRing: KEY_RING, expected, now: ISSUED_AT });
    ok(!tamperedVerdict.ok && tamperedVerdict.blockers.includes("manual_review_signature_mismatch"), "packet tampering invalidates the server signature");
    ok(tamperedVerdict.blockers.includes("manual_review_primary_action_binding_mismatch")
      && tamperedVerdict.blockers.includes("manual_review_approval_action_binding_mismatch"), "packet tampering also breaks both reviewer action bindings");

    const singleReviewer = cloneReceipt(fixture.receipt);
    singleReviewer.reviewers = [singleReviewer.reviewers[0]] as unknown as Pass6ManualReviewAuthorityReceipt["reviewers"];
    const singleVerdict = verifyPass6ManualReviewAuthorityReceipt({ receipt: singleReviewer, keyRing: KEY_RING, expected, now: ISSUED_AT });
    ok(!singleVerdict.ok && singleVerdict.blockers.includes("manual_review_reviewer_count_invalid"), "a single-reviewer receipt fails closed");

    let reserveCalls = 0;
    const wrongCase = await verifyAndConsumePass6ManualReviewAuthorityReceipt({
      receipt: fixture.receipt,
      keyRing: KEY_RING,
      expected: { ...expected, caseId: "AUD-WRONG-CASE" },
      now: ISSUED_AT,
      dependencies: {
        reserveNonce: async (input) => {
          reserveCalls += 1;
          return durableReserveFactory()(input);
        },
      },
    });
    ok(!wrongCase.ok && wrongCase.blockers.includes("manual_review_case_binding_mismatch"), "wrong-case reuse is rejected by exact expected binding");
    ok(reserveCalls === 0, "an invalid binding is rejected before nonce-store mutation");

    const reserveNonce = durableReserveFactory();
    const firstConsume = await verifyAndConsumePass6ManualReviewAuthorityReceipt({
      receipt: fixture.receipt,
      keyRing: KEY_RING,
      expected,
      now: ISSUED_AT,
      dependencies: { reserveNonce },
    });
    const replayConsume = await verifyAndConsumePass6ManualReviewAuthorityReceipt({
      receipt: fixture.receipt,
      keyRing: KEY_RING,
      expected,
      now: ISSUED_AT,
      dependencies: { reserveNonce },
    });
    ok(firstConsume.ok && firstConsume.consumed && firstConsume.replayProtection?.durable === true, "first release transition atomically consumes the receipt nonce in a durable adapter");
    ok(!replayConsume.ok && replayConsume.blockers.includes("manual_review_receipt_replayed"), "replaying the same signed manual-review receipt is rejected");

    const expired = verifyPass6ManualReviewAuthorityReceipt({
      receipt: fixture.receipt,
      keyRing: KEY_RING,
      expected,
      now: "2026-07-18T13:00:00.000Z",
    });
    ok(!expired.ok && expired.blockers.includes("manual_review_expired"), "expiry is inclusive and fails closed");

    const missingKey = verifyPass6ManualReviewAuthorityReceipt({ receipt: fixture.receipt, keyRing: null, expected, now: ISSUED_AT });
    ok(!missingKey.ok && missingKey.blockers.includes("manual_review_signing_key_unavailable"), "verification fails closed when the signing key is not configured");

    await assert.rejects(
      () => issueFixture({ keyRing: { current: { keyId: "short-key", secret: "too-short" } } }),
      /manual_review_current_key_too_short/,
    );
    ok(true, "issuer rejects HMAC keys shorter than 32 bytes");

    await assert.rejects(() => issueFixture({ sameReviewer: true }), /manual_review_distinct_reviewers_required/);
    ok(true, "one operator cannot self-assert both dual-control roles");

    await assert.rejects(() => issueFixture({ approverMfa: "totp" }), /phishing_resistant_mfa_required/);
    ok(true, "TOTP-only approval cannot satisfy Advanced manual-review authority");

    await assert.rejects(() => issueFixture({ wrongApproverAction: true }), /body_binding_mismatch/);
    ok(true, "an approver assertion over a different packet cannot authorize the receipt");

    const durableFixture = await issueFixture({ durableAssertions: true });
    process.env.NODE_ENV = "production";
    const productionVerified = verifyPass6ManualReviewAuthorityReceipt({
      receipt: fixture.receipt,
      keyRing: KEY_RING,
      expected,
      now: ISSUED_AT,
    });
    ok(!productionVerified.ok && productionVerified.blockers.includes("manual_review_operator_nonce_durable_store_required"), "production rejects receipts whose reviewer assertion nonces were only memory-protected");
    const productionDurableAssertions = verifyPass6ManualReviewAuthorityReceipt({
      receipt: durableFixture.receipt,
      keyRing: KEY_RING,
      expected: expectedFor(durableFixture.claims),
      now: ISSUED_AT,
    });
    ok(productionDurableAssertions.ok, "production accepts the cryptographic receipt only when both reviewer assertions record durable replay protection");
    const productionPreviousOnly = verifyPass6ManualReviewAuthorityReceipt({
      receipt: durableFixture.receipt,
      keyRing: { previous: CURRENT_KEY },
      expected: expectedFor(durableFixture.claims),
      now: ISSUED_AT,
    });
    ok(!productionPreviousOnly.ok && productionPreviousOnly.blockers.includes("manual_review_current_key_missing"), "production rejects previous-key-only recovery mode");
    delete process.env.NODE_ENV;

    const release = {
      caseRef: fixture.receipt.caseId,
      accountRefHash: fixture.receipt.accountHash,
      tier: "advanced",
      payloadHash: fixture.receipt.packetDigest,
      sourceReceiptRoot: fixture.receipt.sourceReceiptRoot,
      review: { receiptId: fixture.receipt.receiptId },
    } as unknown as AdvancedAuditReleaseEnvelope;
    const releaseBinding = pass6ManualReviewAuthorityMatchesAdvancedRelease(fixture.receipt, release);
    ok(releaseBinding.ok, "manual-review authority binds exactly into the existing Advanced release envelope");
    const wrongReleaseBinding = pass6ManualReviewAuthorityMatchesAdvancedRelease(fixture.receipt, { ...release, payloadHash: hash("wrong-release") });
    ok(!wrongReleaseBinding.ok && wrongReleaseBinding.blockers.includes("manual_review_release_packet_mismatch"), "Advanced release cannot substitute a different packet under the receipt");

    console.log(`\nPASS6 manual-review authority P0: ${checks}/${checks} checks passed.`);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
