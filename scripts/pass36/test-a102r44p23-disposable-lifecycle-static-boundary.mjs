#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runtime = fs.readFileSync(path.join(ROOT, "lib/security/audit-disposable-customer-lifecycle.mjs"), "utf8");
const test = fs.readFileSync(path.join(ROOT, "scripts/pass36/test-a102r44p23-disposable-customer-lifecycle-e2e.mjs"), "utf8");
const checks = [];
const add = (id, ok) => checks.push({ id, ok: Boolean(ok) });

add("download-hmac-domain-separated", runtime.includes("velmere:r44p23:download:v1:"));
add("webhook-hmac-domain-separated", runtime.includes("velmere:r44p23:webhook:v1:"));
add("timing-safe-signatures", runtime.includes("crypto.timingSafeEqual"));
add("token-account-bound", runtime.includes("payload.accountHash !== auth.account.accountHash"));
add("token-job-bound", runtime.includes("payload.jobId"));
add("token-tier-bound", runtime.includes("payload.tier"));
add("token-report-version-bound", runtime.includes("payload.reportVersion"));
add("token-entitlement-revision-bound", runtime.includes("payload.entitlementRevision"));
add("token-expiry-enforced", runtime.includes("TOKEN_EXPIRED"));
add("token-replay-enforced", runtime.includes("TOKEN_REPLAYED"));
add("refund-revokes-issued-tokens", runtime.includes("revokeJobTokens"));
add("terminal-entitlements-guarded", runtime.includes("TERMINAL_ENTITLEMENT_CANNOT_REACTIVATE"));
add("payment-amount-guarded", runtime.includes("PAYMENT_AMOUNT_BINDING_INVALID"));
add("payment-currency-guarded", runtime.includes("expectedCurrency"));
add("webhook-event-idempotent", runtime.includes("webhooks") && runtime.includes("idempotentReplay"));
add("intake-idempotent", runtime.includes("idempotency/intake"));
add("worker-lock", runtime.includes("worker.lock"));
add("token-consume-lock", runtime.includes("token-consume.lock"));
add("account-delete-lock", runtime.includes("delete-account.lock"));
add("ledger-lock", runtime.includes("ledger.lock"));
add("private-root-0700", runtime.includes("0o700"));
add("private-files-0600", runtime.includes("0o600"));
add("atomic-rename-and-fsync", runtime.includes("fs.renameSync") && runtime.includes("fs.fsyncSync"));
add("ledger-hash-chain", runtime.includes("previousHash") && runtime.includes("eventHash"));
add("account-id-redacted-after-delete", runtime.includes("accountId: null"));
add("jobs-purged-after-delete", runtime.includes("fs.rmSync(full, { force: true })"));
add("artifacts-purged-after-delete", runtime.includes("fs.rmSync(artifactRoot, { recursive: true, force: true })"));
add("source-not-ledgered", test.includes("contract Pro { function risky() external {} }") && test.includes("scanForRawSensitive"));
add("tokens-not-ledgered", test.includes("tamperTokenResponse.json.token") && test.includes("scanForRawSensitive"));
add("wrong-account-tested", test.includes("33-wrong-account-download-denied"));
add("concurrent-consume-tested", test.includes("concurrent-token-exactly-once"));
add("refund-tested", test.includes("refund"));
add("session-expiry-tested", test.includes("47-expired-session-denied"));
add("account-delete-tested", test.includes("49-account-delete-success"));

const failed = checks.filter((row) => !row.ok);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p23.disposable-lifecycle-static-boundary.v1",
  status: failed.length ? "FAIL" : "PASS_R44P23_DISPOSABLE_LIFECYCLE_STATIC_BOUNDARY",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  rows: checks,
}, null, 2));
if (failed.length) process.exit(1);
