import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  ACCOUNT_DATA_EXPORT_PAYLOAD_SCHEMA,
  buildAccountDataExportDelivery,
  type AccountDataExportRecord,
} from "../../lib/account/account-data-export";
import {
  handleAccountDataExportGet,
  handleAccountDataExportPost,
  type AccountDataExportRouteDependencies,
} from "../../lib/server/lazy-route-modules/account--data-export";

const FIXED_NOW = new Date("2026-08-21T20:00:00.000Z");
const EXPORT_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_ID = "supabase:11111111-1111-4111-8111-111111111111";
const ACCOUNT_HASH = createHash("sha256")
  .update(`velmere-account-binding-v1:${ACCOUNT_ID}`, "utf8")
  .digest("hex");

const payloadText = JSON.stringify({
  schemaVersion: ACCOUNT_DATA_EXPORT_PAYLOAD_SCHEMA,
  exportId: EXPORT_ID,
  generatedAt: "2026-08-21T19:59:00.000Z",
  availableUntil: "2026-08-22T19:59:00.000Z",
  classification: "CUSTOMER_PRIVATE",
  scope: {
    schemaVersion: "velmere.account-data-export-scope.v1",
    technicalScopeComplete: true,
    legalDsrCompleteness: false,
    excluded: ["secrets", "raw operator notes", "binary artifact bytes"],
  },
  account: { accountId: ACCOUNT_ID, email: "owner@example.test" },
  data: { profile: null, community: { posts: [], comments: [] } },
});
const payloadSha256 = `sha256:${createHash("sha256").update(payloadText, "utf8").digest("hex")}`;

function record(overrides: Partial<AccountDataExportRecord> = {}): AccountDataExportRecord {
  return {
    schemaVersion: "velmere.account-data-export-record.v1",
    exportId: EXPORT_ID,
    accountId: ACCOUNT_ID,
    accountIdHash: ACCOUNT_HASH,
    idempotencyKeyHash: "a".repeat(64),
    payloadSchemaVersion: ACCOUNT_DATA_EXPORT_PAYLOAD_SCHEMA,
    payloadText,
    payloadSha256,
    byteLength: Buffer.byteLength(payloadText, "utf8"),
    generatedAt: "2026-08-21T19:59:00.000Z",
    expiresAt: "2026-08-22T19:59:00.000Z",
    createdAt: "2026-08-21T19:59:00.000Z",
    ...overrides,
  };
}

let requested = 0;
let read = 0;
let stored: AccountDataExportRecord | null = record();
const boundary = { accountId: ACCOUNT_ID, client: {} } as never;
const dependencies: AccountDataExportRouteDependencies = {
  resolveAccount: async () => ({
    accountId: ACCOUNT_ID,
    displayName: "Owner",
    handle: "@owner",
    email: "owner@example.test",
    provider: "email",
    sessionSource: "cookie",
  }),
  resolveBoundary: async () => boundary,
  applyRateLimit: async () => ({ ok: true } as const),
  requestExport: async () => {
    requested += 1;
    return record();
  },
  readExport: async () => {
    read += 1;
    return stored;
  },
  now: () => FIXED_NOW,
};

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

async function main() {
  const beforeUnauthenticated = requested;
  const unauthenticated = await handleAccountDataExportPost(new Request("https://velmere.test/api/account/data-export", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://velmere.test" },
    body: JSON.stringify({ idempotencyKey: "export-request-1234567890" }),
  }), { ...dependencies, resolveAccount: async () => null });
  check(unauthenticated.status === 401, "an authenticated account session is required");
  check(requested === beforeUnauthenticated, "unauthenticated requests must not reach storage");

  const post = await handleAccountDataExportPost(new Request("https://velmere.test/api/account/data-export", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://velmere.test" },
    body: JSON.stringify({ idempotencyKey: "export-request-1234567890" }),
  }), dependencies);
  const postBody = await post.json() as Record<string, unknown>;
  check(post.status === 201, "authenticated owner request must create a durable export snapshot");
  check(requested === 1, "valid request must reach storage exactly once");
  check(postBody.schemaVersion === "velmere.public-account-data-export.v1", "public response must pin its schema");
  check(postBody.exportId === EXPORT_ID, "public response must return the opaque export id");
  check(postBody.payloadSha256 === payloadSha256, "public response must bind the exact stored bytes digest");
  check(!("accountId" in postBody), "public metadata must not echo the internal account id");
  check(!("payloadText" in postBody), "public metadata must not inline private export bytes");

  const beforeInvalid = requested;
  const invalidPost = await handleAccountDataExportPost(new Request("https://velmere.test/api/account/data-export", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://velmere.test" },
    body: JSON.stringify({ idempotencyKey: "export-request-1234567890", accountId: "victim" }),
  }), dependencies);
  check(invalidPost.status === 400, "mass-assignment keys must fail closed");
  check(requested === beforeInvalid, "invalid request must not reach durable storage");

  const metadata = await handleAccountDataExportGet(new Request(
    `https://velmere.test/api/account/data-export?id=${EXPORT_ID}&disposition=metadata`,
  ), dependencies);
  const metadataBody = await metadata.json() as Record<string, unknown>;
  check(metadata.status === 200, "owner must be able to read export metadata");
  check(metadataBody.payloadSha256 === payloadSha256, "metadata must bind exact bytes");
  check(!("payloadText" in metadataBody), "metadata must not inline export content");
  check(read === 1, "metadata must perform one owner-scoped read");

  const preview = await handleAccountDataExportGet(new Request(
    `https://velmere.test/api/account/data-export?id=${EXPORT_ID}&disposition=preview`,
  ), dependencies);
  const download = await handleAccountDataExportGet(new Request(
    `https://velmere.test/api/account/data-export?id=${EXPORT_ID}&disposition=download`,
  ), dependencies);
  const previewBytes = Buffer.from(await preview.arrayBuffer());
  const downloadBytes = Buffer.from(await download.arrayBuffer());
  check(preview.status === 200 && download.status === 200, "preview and download must both serve the stored artifact");
  check(previewBytes.equals(downloadBytes), "preview and download must be exact same bytes");
  check(previewBytes.toString("utf8") === payloadText, "delivery must not rerender or reserialize the stored JSON");
  check(preview.headers.get("x-velmere-account-export-sha256") === payloadSha256, "preview must expose verified digest");
  check(download.headers.get("x-velmere-account-export-sha256") === payloadSha256, "download must expose verified digest");
  check(preview.headers.get("x-velmere-preview-download-parity") === "byte-identical", "route must declare exact parity");
  check(preview.headers.get("content-disposition")?.startsWith("inline;") === true, "preview must be inline");
  check(download.headers.get("content-disposition")?.startsWith("attachment;") === true, "download must be an attachment");
  check(preview.headers.get("cache-control")?.includes("no-store") === true, "private export must never be cached");

  const directDelivery = buildAccountDataExportDelivery(record(), "attachment");
  check(Buffer.from(directDelivery.bytes).toString("utf8") === payloadText, "delivery builder must verify and preserve stored text bytes");

  stored = null;
  const missing = await handleAccountDataExportGet(new Request(
    `https://velmere.test/api/account/data-export?id=${EXPORT_ID}&disposition=download`,
  ), dependencies);
  const missingBody = await missing.json() as Record<string, unknown>;
  check(missing.status === 404 && missingBody.error === "account_export_not_available", "missing and cross-account RLS rows must be non-enumerable");

  stored = record({ payloadText: `${payloadText} ` });
  const tampered = await handleAccountDataExportGet(new Request(
    `https://velmere.test/api/account/data-export?id=${EXPORT_ID}&disposition=download`,
  ), dependencies);
  const tamperedBody = await tampered.json() as Record<string, unknown>;
  check(tampered.status === 409, "tampered stored bytes must fail closed");
  check(tamperedBody.error === "account_export_integrity_unavailable", "integrity errors must be PII-safe");
  check(!JSON.stringify(tamperedBody).includes("owner@example.test"), "errors must not leak PII");

  stored = record({ expiresAt: "2026-08-21T19:59:59.000Z" });
  const expired = await handleAccountDataExportGet(new Request(
    `https://velmere.test/api/account/data-export?id=${EXPORT_ID}&disposition=download`,
  ), dependencies);
  check(expired.status === 404, "expired exports must be indistinguishable from unavailable rows");

  const badId = await handleAccountDataExportGet(new Request(
    "https://velmere.test/api/account/data-export?id=../../victim&disposition=download",
  ), dependencies);
  check(badId.status === 400, "non-UUID export ids must fail before storage");

  const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260821000004_v4_account_data_export_same_blob_rls.sql"), "utf8");
  check(migration.includes("velmere_account_data_exports"), "migration must create a durable export table");
  check(migration.includes("public.velmere_current_account_id()"), "RLS and RPC must bind the current account");
  check(migration.includes("public.velmere_current_account_binding_hash()"), "RLS must bind the salted account digest");
  check(migration.includes("account_id = public.velmere_current_account_id()"), "owner policy must compare exact account id");
  check(migration.includes("account_id_hash = public.velmere_current_account_binding_hash()"), "owner policy must compare exact binding digest");
  check(migration.includes("unique (account_id_hash, idempotency_key_hash)"), "idempotent replay must be durable and account-scoped");
  check(migration.includes("octet_length(payload_text) = payload_byte_length"), "database must bind exact UTF-8 byte length");
  check(migration.includes("encode(digest(convert_to(payload_text, 'utf8'), 'sha256'), 'hex')"), "database must bind exact UTF-8 digest");
  check(migration.includes("revoke all on table public.velmere_account_data_exports from public, anon, authenticated"), "direct mutation/read grants must start closed");
  check(migration.includes("grant select on table public.velmere_account_data_exports to authenticated"), "authenticated owner reads must be RLS-governed");
  check(migration.includes("legalDsrCompleteness"), "payload must not self-claim legal DSAR completeness");
  check(!migration.includes("contact_email = lower"), "export ownership must never fall back to mutable email equality");

  const client = fs.readFileSync(path.join(process.cwd(), "components/account/AccountDataExportPanel.tsx"), "utf8");
  const exportModule = fs.readFileSync(path.join(process.cwd(), "lib/account/account-data-export.ts"), "utf8");
  const dashboard = fs.readFileSync(path.join(process.cwd(), "components/dashboard/DashboardClient.tsx"), "utf8");
  check(exportModule.includes(".abortSignal(AbortSignal.timeout(ACCOUNT_DATA_EXPORT_READ_DEADLINE_MS))"), "owner read must have an explicit bounded deadline");
  check(client.includes('credentials: "same-origin"'), "customer UI must send only same-origin account credentials");
  check(client.includes("pendingIdempotencyKey.current"), "uncertain UI retries must retain the durable idempotency key");
  check(client.includes('aria-live="polite"'), "export status must be announced accessibly");
  check(client.includes("legalDsrCompleteness"), "customer UI must preserve the legal-completeness truth boundary");
  check(dashboard.includes("<AccountDataExportPanel />"), "account security surface must expose the real export workflow");

  console.log(`V4 account data export boundary: PASS (${assertions}/${assertions})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
