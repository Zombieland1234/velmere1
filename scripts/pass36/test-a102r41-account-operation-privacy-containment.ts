#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GET, POST } from "../../app/api/market-integrity/account-operations/[operation]/route.ts";

const operations = [
  "entitlement-account-vault-retrieval-contract",
  "entitlement-admin-override-dual-control-lock",
  "entitlement-artifact-watermark-share-lock",
  "entitlement-evidence-export-dispute-lock",
  "entitlement-incident-response-disclosure-lock",
  "entitlement-retention-erasure-lock",
  "entitlement-revocation-chargeback-lock",
  "entitlement-session-device-anomaly-lock",
] as const;
const sentinel = "REQ-PRIVATE-8F9D-RECEIPT-CHECKSUM";
const checks: Array<{ id: string; pass: boolean; detail?: unknown }> = [];
const check = (id: string, condition: unknown, detail?: unknown) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, `${id}:${JSON.stringify(detail ?? null)}`);
};

let providerCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  providerCalls += 1;
  throw new Error("provider_call_forbidden_in_containment_test");
}) as typeof fetch;
try {
  for (const operation of operations) {
    const response = await GET(
      new Request(`https://velmere.example/api/market-integrity/account-operations/${operation}?query=${sentinel}&receiptId=${sentinel}&checksum=${sentinel}`),
      { params: Promise.resolve({ operation }) },
    );
    const payload = await response.json() as Record<string, unknown>;
    check(`${operation}:get_405_before_provider`, response.status === 405, response.status);
    check(`${operation}:no_store_no_referrer`, response.headers.get("cache-control") === "no-store" && response.headers.get("referrer-policy") === "no-referrer", Object.fromEntries(response.headers));
    check(`${operation}:fixed_fail_closed_body`, payload.error === "server_owned_account_evidence_workflow_required" && payload.authorityCredit === false && payload.paidAccessAllowed === false, payload);
    check(`${operation}:sentinel_not_reflected`, !JSON.stringify(payload).includes(sentinel), payload);
  }
} finally {
  globalThis.fetch = originalFetch;
}
check("all_sensitive_gets_execute_zero_provider_calls", providerCalls === 0, providerCalls);

const previousNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "production";
try {
  const response = await POST(
    new Request(`https://velmere.example/api/market-integrity/account-operations/${operations[0]}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId: sentinel, receiptId: sentinel, operatorApproval: sentinel }),
    }),
    { params: Promise.resolve({ operation: operations[0] }) },
  );
  const body = await response.text();
  check("post_requires_same_origin_before_account_lookup", response.status === 403, response.status);
  check("post_does_not_reflect_client_proof_fields", !body.includes(sentinel), body);
} finally {
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
}

const redirects = readFileSync("lib/security/account-operation-redirects.mjs", "utf8");
const accountUi = readFileSync("components/account/AuditAccountMessagesClient.tsx", "utf8");
const routeSource = readFileSync("app/api/market-integrity/account-operations/[operation]/route.ts", "utf8");
for (const operation of operations) {
  check(`${operation}:legacy_redirect_removed`, !redirects.includes(`/api/market-integrity/${operation}`));
  check(`${operation}:ui_url_builder_removed`, !accountUi.includes(`/api/market-integrity/${operation}?`));
}
check("all_eight_ui_links_replaced_by_locks", (accountUi.match(/server-owned-evidence-workflow-required/gu) ?? []).length === 8);
check("dispatcher_denies_before_dynamic_handler_call", routeSource.indexOf("SERVER_OWNED_EVIDENCE_OPERATIONS.has(operation)") < routeSource.indexOf("handler = await OPERATION_LOADERS[operation]()"));
check("dispatcher_get_error_is_fixed_not_raw_exception", routeSource.includes("server_owned_account_evidence_workflow_required") && routeSource.includes('"referrer-policy": "no-referrer"'));
check("server_post_is_explicitly_non_credit", routeSource.includes("durable_server_owned_account_evidence_workflow_not_implemented") && routeSource.includes("authorityCredit: false") && routeSource.includes("paidAccessAllowed: false"));

const failed = checks.filter((row) => !row.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a102r41.account-operation-privacy-containment-test.v1",
  revisionId: "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT",
  sensitiveOperationDenominator: operations.length,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  durableServerOwnedWorkflowsImplemented: 0,
  authorityCredit: false,
  live: false,
  saleEnabled: false,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
