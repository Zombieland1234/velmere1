import fs from "node:fs";
import {
  MAX_SYSTEM_CLIPBOARD_JSON_BYTES,
  buildAdminSupportClipboardSummary,
  buildPrivateAccountClipboardSummary,
  copyAdminSupportSummary,
  copyPrivateAccountArtifactSummary,
  serializeSafeSystemClipboardJson,
  writeSafeSystemClipboardJson,
} from "../../lib/security/browser-system-clipboard.ts";

const results: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail?: unknown) => results.push({ id, passed: Boolean(passed), detail });

const accountSource = fs.readFileSync("components/account/MarketActionReportsInboxClient.tsx", "utf8");
const adminSource = fs.readFileSync("components/admin/OrderAdminTimelineConsole.tsx", "utf8");
const boundarySource = fs.readFileSync("lib/security/browser-system-clipboard.ts", "utf8");

check("static:account-no-direct-clipboard", !accountSource.includes("navigator.clipboard"));
check("static:account-uses-safe-summary", (accountSource.match(/copyPrivateAccountArtifactSummary\(entry\)/gu) || []).length === 12);
check("static:admin-no-direct-clipboard", !adminSource.includes("navigator.clipboard"));
check("static:admin-uses-redacted-preview", adminSource.includes("supportClipboardPacket") && adminSource.includes("copyAdminSupportSummary(supportPacket)"));
check("static:no-legacy-copy-json-entry", !accountSource.includes("writeText(payload)"));
check("static:boundary-no-fallback-exec-command", !boundarySource.includes("execCommand") && !boundarySource.includes("document.createElement"));
check("static:secure-context-gate", boundarySource.includes("globalThis.isSecureContext"));
check("static:bounded-bytes", boundarySource.includes("MAX_SYSTEM_CLIPBOARD_JSON_BYTES"));
check("static:blocked-sensitive-key-gate", boundarySource.includes("system_clipboard_sensitive_key_detected"));
check("static:no-browser-persistence", !/localStorage|sessionStorage|indexedDB|caches\./u.test(boundarySource));

const privateInput = {
  schema: "velmere.pass4556.account-download-consumption-ledger.v1",
  source: "shield",
  symbol: "BTC",
  timeframe: "1d",
  status: "download-consumed",
  reviewGate: "operator-review-required",
  vaultPointer: "vault://account/private-row",
  packageId: "pkg-secret-001",
  pdfPointer: "pdf://private/report",
  deliveryId: "delivery-secret",
  releaseId: "release-secret",
  releasePointer: "release://private",
  customerReceiptId: "receipt-secret",
  customerRoute: "/account/private",
  downloadPointer: "download://private",
  downloadManifestId: "manifest-secret",
  downloadRoute: "/api/private/download",
  accessCapsuleId: "capsule-secret",
  accessRoute: "/api/private/access",
  accessTokenId: "token-secret",
  expiresAt: "2026-07-30T03:00:00.000Z",
  consumptionId: "consume-secret",
  consumedAt: "2026-07-30T02:00:00.000Z",
  downloadSessionId: "session-secret",
  downloadAuditHash: "a".repeat(64),
  closeoutId: "close-secret",
  sessionFinalizedHash: "b".repeat(64),
  attestationId: "attest-secret",
  publicProofPointer: "proof://private",
  archiveRoute: "/api/private/archive",
  publicIndexId: "index-secret",
  transparencyRoute: "/api/private/transparency",
  proofDigest: "c".repeat(64),
  digest: "d".repeat(64),
  checksum: "e".repeat(64),
  accountRoute: "/account",
  lanes: [
    { lane: "download", state: "ready", proof: "proof-secret" },
    { lane: "release", state: "blocked", proof: "another-secret" },
  ],
};
const privateSummary = buildPrivateAccountClipboardSummary(privateInput);
const privateText = serializeSafeSystemClipboardJson(privateSummary);
check("runtime:private-schema", privateSummary.schema === "velmere.browser.system-clipboard.private-account-summary.v1");
check("runtime:private-core-status-retained", privateSummary.source === "shield" && privateSummary.symbol === "BTC" && privateSummary.timeframe === "1d" && privateSummary.status === "download-consumed");
check("runtime:private-no-identifiers", privateSummary.identifiersIncluded === false && privateSummary.secretsIncluded === false && privateSummary.durableAuthority === false);
check("runtime:private-lane-proof-redacted", privateSummary.lanes.length === 2 && !privateText.includes("proof-secret") && !privateText.includes("another-secret"));
for (const secret of ["vault://account/private-row", "pkg-secret-001", "delivery-secret", "release-secret", "receipt-secret", "token-secret", "session-secret", "proof://private", "index-secret", "a".repeat(64)]) {
  check(`runtime:private-secret-removed:${secret.slice(0, 12)}`, !privateText.includes(secret));
}
check("runtime:private-no-sensitive-keys", !/"(?:vaultPointer|accessTokenId|downloadSessionId|digest|checksum|proofDigest)"\s*:/u.test(privateText), privateText);
check("runtime:private-byte-bound", new TextEncoder().encode(privateText).byteLength <= MAX_SYSTEM_CLIPBOARD_JSON_BYTES);

const adminInput = {
  orderDraftId: "order-private-123",
  caseId: "case-private-456",
  latestEvent: "manual_fulfilment_required",
  latestStatus: "review",
  nextExpectedEvents: ["operator_review", "fulfilment"],
  receiptIds: { checkout: "checkout-secret", stock: "stock-secret", provider: "provider-secret" },
  reasonCodes: ["inventory_review", "provider_delay"],
  productIds: ["product-private-1", "product-private-2"],
  providerIds: ["provider-private-1"],
};
const adminSummary = buildAdminSupportClipboardSummary(adminInput);
const adminText = serializeSafeSystemClipboardJson(adminSummary);
check("runtime:admin-schema", adminSummary.schema === "velmere.browser.system-clipboard.admin-support-summary.v1");
check("runtime:admin-status-retained", adminSummary.latestEvent === "manual_fulfilment_required" && adminSummary.latestStatus === "review");
check("runtime:admin-counts-only", adminSummary.productCount === 2 && adminSummary.providerCount === 1 && adminSummary.receiptCount === 3);
check("runtime:admin-identifiers-removed", !["order-private-123", "case-private-456", "checkout-secret", "product-private-1", "provider-private-1"].some((value) => adminText.includes(value)), adminText);
check("runtime:admin-no-sensitive-keys", !/"(?:orderDraftId|caseId|receiptIds|productIds|providerIds)"\s*:/u.test(adminText), adminText);

const writes: string[] = [];
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { clipboard: { writeText: async (value: string) => { writes.push(value); } } },
});
Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
check("runtime:copy-private-success", await copyPrivateAccountArtifactSummary(privateInput));
check("runtime:copy-admin-success", await copyAdminSupportSummary(adminInput));
check("runtime:two-writes", writes.length === 2, writes.length);
check("runtime:writes-are-redacted", !writes.join("\n").includes("token-secret") && !writes.join("\n").includes("order-private-123"));

Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: false });
const beforeInsecure = writes.length;
check("runtime:insecure-context-blocked", !(await writeSafeSystemClipboardJson(privateSummary)) && writes.length === beforeInsecure);

Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
let injectionBlocked = false;
try {
  serializeSafeSystemClipboardJson({ ...privateSummary, vaultPointer: "should-never-serialize" } as never);
} catch (error) {
  injectionBlocked = error instanceof Error && error.message === "system_clipboard_sensitive_key_detected";
}
check("runtime:sensitive-key-injection-blocked", injectionBlocked);
let overflowBlocked = false;
try {
  serializeSafeSystemClipboardJson({ ...privateSummary, warning: "x".repeat(MAX_SYSTEM_CLIPBOARD_JSON_BYTES + 1) });
} catch (error) {
  overflowBlocked = error instanceof Error && error.message === "system_clipboard_payload_out_of_bounds";
}
check("runtime:overflow-blocked", overflowBlocked);

const failed = results.filter((row) => !row.passed);
console.log(JSON.stringify({
  status: failed.length
    ? "FAIL_A102R9_SYSTEM_CLIPBOARD_PRIVATE_EXPORT_BOUNDARY"
    : "PASS_A102R9_SYSTEM_CLIPBOARD_PRIVATE_ACCOUNT_AND_ADMIN_EXPORT_REDACTION_NO_PROMOTION",
  assertions: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
  truth: {
    privateAccountIdentifiersCopiedToSystemClipboard: false,
    downloadSessionOrAccessAuthorityCopiedToSystemClipboard: false,
    adminOrderCaseReceiptIdentifiersCopiedToSystemClipboard: false,
    browserClipboardPersistenceControlledByVelmere: false,
    realBrowserClipboardMatrixExecuted: false,
    liveCredit: false,
    saleCredit: false,
  },
}, null, 2));
if (failed.length) process.exitCode = 1;
