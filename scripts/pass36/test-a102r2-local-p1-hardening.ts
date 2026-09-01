import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  PASS36_A89_TRUSTED_ACCOUNT_HEADER_BOUNDARY_ID,
  inspectTrustedAccountHeaderReadiness,
  resolveTrustedAccountHeader,
  signTrustedAccountHeaders,
  trustedAccountHeaderDependencies,
} from "../../lib/security/trusted-account-header-boundary.ts";
import { hashVelmereAccountBinding } from "../../lib/auth/account-session.ts";
import {
  projectAuditAccountMessageForCustomer,
} from "../../lib/server/lazy-route-modules/account--audit-messages.ts";
import type { AuditAccountMessageRecord } from "../../lib/account/audit-account-messages.ts";
import type { Pass2377DeliveryReceiptRecord } from "../../lib/security/delivery-receipt-ledger.ts";
import { inspectContactLegalIntakeReadiness } from "../../lib/legal/contact-legal-intake.ts";
import {
  issuePass4657AuditPdfDownloadToken,
  verifyPass4657AuditPdfDownloadToken,
} from "../../lib/security/audit-pdf-download-token.ts";

const failures: Array<{ id: string; detail?: unknown }> = [];
let assertions = 0;
function check(id: string, condition: unknown, detail?: unknown) {
  assertions += 1;
  if (!condition) failures.push({ id, detail });
}

const nowMs = Date.parse("2026-07-29T12:00:00.000Z");
const timestamp = Math.floor(nowMs / 1_000);
const secret = "a102r2-trusted-account-secret-32-bytes-minimum";
const env = {
  ...process.env,
  VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_CURRENT: secret,
  VELMERE_TRUSTED_ACCOUNT_HEADER_HMAC_SECRET_PREVIOUS: "",
};
const accountFields = {
  timestamp,
  accountId: "server:a102r2-account",
  email: "service@example.com",
  displayName: "A102R2 Service",
  handle: "@a102r2",
  provider: "server" as const,
  secret,
};
const alwaysConsume = {
  now: () => nowMs,
  consumeNonce: async () => true,
};

const getNonce = crypto.randomBytes(24).toString("base64url");
const getUrl =
  "https://velmere.example/api/account/customer-artifact?b=2&a=1";
const getHeaders = signTrustedAccountHeaders({
  requestUrl: getUrl,
  method: "GET",
  nonce: getNonce,
  ...accountFields,
});
const validGet = await resolveTrustedAccountHeader(
  new Request(getUrl, { method: "GET", headers: getHeaders }),
  env,
  alwaysConsume,
);
check("trusted-v2:valid-get", validGet?.accountId === accountFields.accountId);
check(
  "trusted-v2:version",
  PASS36_A89_TRUSTED_ACCOUNT_HEADER_BOUNDARY_ID.endsWith(".v2") &&
    getHeaders["x-velmere-account-auth-version"] === "v2",
);
check(
  "trusted-v2:query-order-canonical",
  Boolean(
    await resolveTrustedAccountHeader(
      new Request(
        "https://velmere.example/api/account/customer-artifact?a=1&b=2",
        { method: "GET", headers: getHeaders },
      ),
      env,
      alwaysConsume,
    ),
  ),
);
check(
  "trusted-v2:query-mutation-rejected",
  (await resolveTrustedAccountHeader(
    new Request(
      "https://velmere.example/api/account/customer-artifact?a=1&b=3",
      { method: "GET", headers: getHeaders },
    ),
    env,
    alwaysConsume,
  )) === null,
);

const originalBody = JSON.stringify({ action: "store", value: 1 });
const bodyNonce = crypto.randomBytes(24).toString("base64url");
const bodyUrl = "https://velmere.example/api/account/customer-artifact";
const bodyHeaders = signTrustedAccountHeaders({
  requestUrl: bodyUrl,
  method: "POST",
  nonce: bodyNonce,
  body: originalBody,
  contentType: "application/json",
  ...accountFields,
});
const validBody = await resolveTrustedAccountHeader(
  new Request(bodyUrl, {
    method: "POST",
    headers: { ...bodyHeaders, "content-type": "application/json" },
    body: originalBody,
  }),
  env,
  alwaysConsume,
);
check("trusted-v2:valid-body", validBody?.accountId === accountFields.accountId);
check(
  "trusted-v2:body-mutation-rejected",
  (await resolveTrustedAccountHeader(
    new Request(bodyUrl, {
      method: "POST",
      headers: { ...bodyHeaders, "content-type": "application/json" },
      body: JSON.stringify({ action: "store", value: 2 }),
    }),
    env,
    alwaysConsume,
  )) === null,
);
check(
  "trusted-v2:content-type-mutation-rejected",
  (await resolveTrustedAccountHeader(
    new Request(bodyUrl, {
      method: "POST",
      headers: { ...bodyHeaders, "content-type": "text/plain" },
      body: originalBody,
    }),
    env,
    alwaysConsume,
  )) === null,
);
const legacyHeaders = { ...getHeaders } as Record<string, string>;
delete legacyHeaders["x-velmere-account-auth-version"];
delete legacyHeaders["x-velmere-account-body-sha256"];
delete legacyHeaders["x-velmere-account-content-type"];
check(
  "trusted-v2:legacy-envelope-rejected",
  (await resolveTrustedAccountHeader(
    new Request(getUrl, { method: "GET", headers: legacyHeaders }),
    env,
    alwaysConsume,
  )) === null,
);
const spoofedHeaders = signTrustedAccountHeaders({
  requestUrl: getUrl,
  method: "GET",
  nonce: crypto.randomBytes(24).toString("base64url"),
  ...accountFields,
  displayName: "safe\u00adevil",
});
check(
  "trusted-v2:unicode-display-spoof-rejected",
  (await resolveTrustedAccountHeader(
    new Request(getUrl, { method: "GET", headers: spoofedHeaders }),
    env,
    alwaysConsume,
  )) === null,
);
const nonceStorageKey = `a102r2:${crypto.randomBytes(16).toString("hex")}`;
const firstNonce = await trustedAccountHeaderDependencies.consumeNonce(
  nonceStorageKey,
);
const secondNonce = await trustedAccountHeaderDependencies.consumeNonce(
  nonceStorageKey,
);
check(
  "trusted-v2:atomic-single-use-memory-adapter",
  firstNonce === true && secondNonce === false,
  { firstNonce, secondNonce },
);
const readiness = inspectTrustedAccountHeaderReadiness(env);
check(
  "trusted-v2:readiness-contract",
  readiness.requestBinding.includes("canonicalQuery") &&
    readiness.requestBinding.includes("bodySha256") &&
    readiness.nonceStorage.includes("atomic"),
);

const migrationPath =
  "supabase/migrations/20260729000003_a102r2_salted_account_binding_rls.sql";
const migration = fs.readFileSync(migrationPath, "utf8");
const accountId = "supabase:12345678-1234-1234-1234-123456789012";
const expectedBindingHash = crypto
  .createHash("sha256")
  .update(`velmere-account-binding-v1:${accountId}`)
  .digest("hex");
check(
  "rls:salted-helper-exact-prefix",
  migration.includes(
    "'velmere-account-binding-v1:' || public.velmere_current_account_id()",
  ),
);
check(
  "rls:js-sql-algorithm-parity",
  hashVelmereAccountBinding(accountId) === expectedBindingHash,
);
const auditPdfTokenEnv = {
  ...process.env,
  VELMERE_AUDIT_PDF_TOKEN_SECRET_CURRENT:
    "a102r2-audit-pdf-token-secret-32-bytes-minimum",
  VELMERE_AUDIT_PDF_TOKEN_KEY_ID: "a102r2",
};
const issuedAuditPdfToken = issuePass4657AuditPdfDownloadToken({
  accountId,
  entitlementId: "entitlement-a102r2",
  reportId: "report-a102r2",
  reportVersionHash: `sha256:${"a".repeat(64)}`,
  nonce: "a102r2-nonce-1234567890abcdef",
  env: auditPdfTokenEnv,
  nowMs,
});
check(
  "rls:audit-pdf-writer-policy-salted-hash-parity",
  issuedAuditPdfToken.ok === true &&
    verifyPass4657AuditPdfDownloadToken({
      token: issuedAuditPdfToken.ok ? issuedAuditPdfToken.token : null,
      accountId,
      entitlementId: "entitlement-a102r2",
      expectedReportId: "report-a102r2",
      expectedReportVersionHash: `sha256:${"a".repeat(64)}`,
      env: auditPdfTokenEnv,
      nowMs,
    }).ok === true,
);
if (issuedAuditPdfToken.ok) {
  const payload = JSON.parse(
    Buffer.from(
      issuedAuditPdfToken.token
        .slice("vlm_pdf_".length)
        .split(".")[0],
      "base64url",
    ).toString("utf8"),
  ) as { accountIdHash?: string };
  check(
    "rls:audit-pdf-token-payload-salted-hash",
    payload.accountIdHash === expectedBindingHash,
    payload,
  );
}
check(
  "rls:salted-policies-four",
  (
    migration.match(
      /account_id_hash = public\.velmere_current_account_binding_hash\(\)/gu,
    ) ?? []
  ).length === 4,
);
check(
  "rls:legacy-plain-helper-retained",
  fs
    .readFileSync(
      "supabase/migrations/20260720000008_5007_pass22_owner_operator_rls_and_provider_evidence.sql",
      "utf8",
    )
    .includes("create or replace function public.velmere_current_account_hash()"),
);

const privateCanary = "PRIVATE_CANARY_A102R2";
const record = {
  id: "message-a102r2",
  title: "Customer title",
  body: "Customer-safe body",
  status: "ready",
  packageLabel: "Basic Audit",
  requestId: "request-a102r2",
  createdAt: "2026-07-29T12:00:00.000Z",
  eta: "ready",
  accountRoute: "/en/account?tab=messages",
  nextSteps: ["Read the customer-safe report"],
  accountId: `${privateCanary}:account`,
  contactEmail: `${privateCanary}@example.com`,
  locale: "en",
  reviewLevel: "basic_review",
  projectName: "Customer project",
  contractAddress: "0x0000000000000000000000000000000000000001",
  publicReportRoute: "/en/security/audits/customer-report/message-a102r2",
  adminRoute: `/${privateCanary}/admin`,
  exportRoute: `/${privateCanary}/export`,
  pdfRoute: "/api/customer-safe.pdf",
  deliveryChannel: "account",
  deliveryStatus: "ready_for_download",
  operatorStatus: "delivered",
  operatorNote: privateCanary,
  actionLog: [
    {
      id: privateCanary,
      action: "mark_ready",
      at: "2026-07-29T12:00:00.000Z",
      operatorId: privateCanary,
      nextStatus: "customer_safe_ready",
      customerSafe: false,
    },
  ],
  source: "memory",
  updatedAt: "2026-07-29T12:00:00.000Z",
  auditQueueId: privateCanary,
  auditCaseRef: privateCanary,
  paymentEvidenceRefs: [privateCanary],
} as unknown as AuditAccountMessageRecord;
const receipt = {
  receiptId: "receipt-a102r2",
  passId: "pass2377-final-delivery-immutable-receipt-ledger",
  status: "delivered",
  locale: "en",
  deliveredAt: "2026-07-29T12:00:00.000Z",
  createdAt: "2026-07-29T12:00:00.000Z",
  operatorId: privateCanary,
  messageId: privateCanary,
  requestId: privateCanary,
  auditQueueId: privateCanary,
  accountMessageId: privateCanary,
  accountId: privateCanary,
  reportId: privateCanary,
  customerSafeReportStatus: "delivered",
  gateSnapshot: {
    passId: privateCanary,
    canDeliver: true,
    endpointPingFresh: true,
    routeHealthAllowed: true,
    zeroBlockedWarnings: true,
    zeroStaleWarnings: true,
    blockedWarningCount: 0,
    staleWarningCount: 0,
    focusKey: privateCanary,
  },
  customerSafeLinks: {
    accountRoute: "/en/account?tab=messages",
    customerReportRoute: "/en/customer-report",
    safePdfPacketRoute: "/api/customer-safe.pdf",
    adminReplayBoardRoute: `/${privateCanary}/admin-replay`,
  },
  checksum: "vlmrcpt_publicchecksum",
  safeBoundary: privateCanary,
  source: "memory",
} as Pass2377DeliveryReceiptRecord;
const customerProjection = projectAuditAccountMessageForCustomer({
  ...record,
  deliveryReceipt: receipt,
});
const customerJson = JSON.stringify(customerProjection);
check(
  "customer-dto:private-canary-absent",
  !customerJson.includes(privateCanary),
);
for (const forbiddenKey of [
  "accountId",
  "contactEmail",
  "adminRoute",
  "exportRoute",
  "auditQueueId",
  "auditCaseRef",
  "paymentEvidenceRefs",
  "operatorStatus",
  "operatorNote",
  "operatorId",
  "actionLog",
  "gateSnapshot",
  "adminReplayBoardRoute",
  "safeBoundary",
  "source",
]) {
  check(
    `customer-dto:key-absent:${forbiddenKey}`,
    !customerJson.includes(`"${forbiddenKey}"`),
  );
}
check(
  "customer-dto:public-receipt-fields-retained",
  customerProjection.deliveryReceipt?.receiptId === receipt.receiptId &&
    customerProjection.deliveryReceipt?.checksum === receipt.checksum,
);

const contactReadiness = inspectContactLegalIntakeReadiness();
check(
  "contact:intake-blocked-with-empty-legal-profile",
  contactReadiness.ready === false &&
    contactReadiness.blockers.includes("privacy_policy_not_approved") &&
    contactReadiness.blockers.includes("legal_review_not_approved"),
);
const contactRoute = fs.readFileSync("app/api/contact/message/route.ts", "utf8");
check(
  "contact:legal-gate-before-body-parse",
  contactRoute.indexOf("if (!legalReadiness.ready)") <
    contactRoute.indexOf("const parsedForm = await readBoundedFormDataBody"),
);
const layout = fs.readFileSync("app/[locale]/layout.tsx", "utf8");
check(
  "contact:global-pii-widget-unmounted",
  !layout.includes("FloatingMailWidget"),
);

const trustPage = fs.readFileSync("app/[locale]/trust-center/page.tsx", "utf8");
check(
  "trust-center:zero-green-implementation-icons",
  !trustPage.includes("CheckCircle2"),
);
check(
  "trust-center:twenty-blocked-not-published",
  trustPage.includes('data-publication-status="NOT_PUBLISHED"') &&
    trustPage.includes("publicSectionsImplemented"),
);
check(
  "trust-center:noindex-until-external-proof",
  trustPage.includes("index: false") &&
    trustPage.includes("noarchive: true"),
);

const passed = failures.length === 0;
const receiptOutput = {
  schemaVersion: "velmere.pass36.a102r2.local-p1-hardening-receipt.v1",
  revisionId:
    "VELMERE_PASS36_A102R2_LOCAL_SECURITY_PRIVACY_BEHAVIORAL_AND_TRUTH_BOUNDARY_HARDENING",
  parentRevisionId:
    "VELMERE_PASS36_A102R1_OUT_OF_TIME_REPEATED_SLO_VENDOR_EXIT_OBSERVATION_INDEPENDENT_WITNESS_AND_FROZEN_SOURCE_DIVERSITY_TRUTH_BOUNDARY",
  generatedAt: new Date().toISOString(),
  status: passed
    ? "PASS_A102R2_LOCAL_P1_HARDENING_NO_PROMOTION"
    : "FAIL_A102R2_LOCAL_P1_HARDENING",
  assertions,
  failed: failures.length,
  failures,
  coverage: {
    trustedAccountV2BodyQueryContentTypeBinding: true,
    atomicNonceReservationLocalBehavior: true,
    saltedRlsPolicyRepairStaticAndAlgorithmParity: true,
    customerDtoRecursiveCanaryRedaction: true,
    contactLegalGateBeforePiiParse: true,
    trustCenterZeroGreenNoindex: true,
  },
  externalCredit: {
    stagingRlsTwoUser: false,
    realIdpWebAuthn: false,
    providerRights: false,
    legalDpo: false,
    independentAssurance: false,
    customerCohorts: false,
  },
  promotion: {
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  },
  truthBoundary:
    "This receipt proves local handler/source behavior and static SQL algorithm parity only. The SQL migration, durable nonce adapter, RLS owner isolation, IdP/WebAuthn, legal review and privacy controls still require real staging/external execution.",
};
const outputDir =
  process.env.VELMERE_A102R2_OUTPUT_DIR ??
  path.resolve("artifacts/pass36/a102r2");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(
  outputDir,
  "PASS36_A102R2_LOCAL_P1_HARDENING_RECEIPT.json",
);
fs.writeFileSync(outputPath, `${JSON.stringify(receiptOutput, null, 2)}\n`);
process.stdout.write(
  `${JSON.stringify({
    status: receiptOutput.status,
    assertions,
    failed: failures.length,
    outputPath,
  })}\n`,
);
if (!passed) process.exitCode = 1;
