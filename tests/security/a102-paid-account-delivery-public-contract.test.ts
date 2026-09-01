import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const server = fs.readFileSync(
  path.join(root, "lib/server/lazy-route-modules/account--audit-messages.ts"),
  "utf8",
);
const client = fs.readFileSync(
  path.join(root, "components/account/AuditAccountMessagesClient.tsx"),
  "utf8",
);

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

check(server.includes('"velmere.public-audit-account-messages.v2"'), "server must publish the pinned v2 account-message schema");
check(server.includes('"x-velmere-contract": PUBLIC_AUDIT_ACCOUNT_MESSAGES_SCHEMA'), "server must expose one semantic contract header");
check(!server.includes('"x-velmere-pass'), "server must not expose internal PASS headers");
check(!server.includes("source: result.source"), "GET must not expose storage source");
check(!server.includes("source: stored.source"), "POST must not expose storage source");
check(!server.includes("passId: PASS2360"), "public response must not expose internal delivery PASS id");
check(!server.includes("pass2363:"), "public response must not expose auth spine topology");
check(!server.includes("pass2369:"), "public response must not expose report-route topology");
check(!server.includes("pass2377:"), "public response must not expose receipt-ledger topology");
check(server.includes("integrityToken: receipt.checksum"), "public receipt must rename internal checksum to semantic integrity token");
check(server.includes("deliveryMode: deliveryModeFor(result.source)"), "public response must expose durable/ephemeral delivery semantics");
check(client.includes("readJsonResponseBounded<unknown>"), "client must parse account messages from unknown");
check(client.includes('raw.schemaVersion !== "velmere.public-audit-account-messages.v2"'), "client must pin the exact schema version");
check(client.includes("parsePublicAuditMessage"), "client must whitelist each public message");
check(!client.includes("operatorStatus"), "customer UI must not consume operator status");
check(!client.includes("auditQueueId"), "customer UI must not consume internal queue ids");
check(!client.includes("paymentEvidenceRefs"), "customer UI must not consume payment evidence references");
check(!/data-pass\d+/u.test(client), "customer account-message DOM must not expose numbered PASS topology");
check(!/PASS\d{3,}/u.test(client.replace(/PASS4808_MAX_PAID_AUDIT_PDF_BYTES/gu, "")), "customer copy must not expose internal PASS topology");
check(client.includes('data-audit-account-messages="customer-safe-v2"'), "customer UI must expose one semantic surface marker");

console.log(`Paid account delivery public contract: PASS (${assertions}/${assertions})`);
