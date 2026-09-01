import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  fetchSameOriginWithDeadline,
  isSafeSameOriginRelativeRequest,
} from "../../lib/network/fetch-with-deadline.ts";
import {
  withPass4825BrokeredEgressTestTransport,
} from "../../lib/network/brokered-egress.ts";
import {
  getSupabaseServiceRestConfig,
  supabaseServiceRestRequest,
} from "../../lib/db/supabase-service-rest.ts";

const REVISION = "VELMERE_PASS36_A67R0_NETWORK_EGRESS_CREDENTIAL_AND_SAME_ORIGIN_TRUST_BOUNDARY_HARDENING";
const checks = [];
const check = (id, condition, detail = null) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, id);
};
const expectReject = async (id, fn, marker) => {
  try {
    await fn();
    check(id, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(id, message.includes(marker), message.slice(0, 120));
  }
};

check("same_origin_root_path_allowed", isSafeSameOriginRelativeRequest("/api/auth/session"));
check("same_origin_query_allowed", isSafeSameOriginRelativeRequest("/api/search?q=btc"));
check("same_origin_scheme_relative_rejected", !isSafeSameOriginRelativeRequest("//attacker.example/x"));
check("same_origin_absolute_https_rejected", !isSafeSameOriginRelativeRequest("https://attacker.example/x"));
check("same_origin_backslash_rejected", !isSafeSameOriginRelativeRequest("/api\\evil"));
check("same_origin_control_rejected", !isSafeSameOriginRelativeRequest("/api/x\nheader"));
check("same_origin_url_object_rejected", !isSafeSameOriginRelativeRequest(new URL("https://example.com")));

const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (input, init = {}) => {
  calls.push({ input: String(input), redirect: init.redirect ?? null, method: init.method ?? "GET" });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
};
try {
  const response = await fetchSameOriginWithDeadline("/api/a67-test", { method: "POST", body: "{}" }, { timeoutMs: 1_000, operation: "a67_test" });
  check("same_origin_wrapper_executes_relative", response.ok && calls.length === 1);
  check("same_origin_wrapper_forces_redirect_error", calls[0]?.redirect === "error");
  check("same_origin_wrapper_preserves_method", calls[0]?.method === "POST");
  await expectReject("same_origin_wrapper_rejects_external_before_fetch", () => fetchSameOriginWithDeadline("https://attacker.example/x"), "same_origin_relative_request_required");
  check("external_rejection_makes_no_network_call", calls.length === 1);
  await expectReject("same_origin_wrapper_rejects_redirect_override", () => fetchSameOriginWithDeadline("/api/x", { redirect: "follow" }), "same_origin_redirect_policy_must_be_error");
  check("redirect_override_makes_no_network_call", calls.length === 1);
} finally {
  globalThis.fetch = originalFetch;
}

const previousEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
try {
  process.env.SUPABASE_URL = "https://a67-project.supabase.co";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "a67_service_role_key_" + "x".repeat(40);
  const config = getSupabaseServiceRestConfig();
  check("supabase_config_is_origin_only", config?.baseUrl === "https://a67-project.supabase.co");
  let observed = null;
  const response = await withPass4825BrokeredEgressTestTransport(async (target, init, context) => {
    const headers = new Headers(init.headers);
    observed = {
      target: target.toString(),
      method: init.method,
      redirect: init.redirect,
      apikey: headers.has("apikey"),
      authorization: headers.has("authorization"),
      operation: context.operation,
      maxRequestBytes: context.maxRequestBytes,
      maxResponseBytes: context.maxResponseBytes,
    };
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  }, () => supabaseServiceRestRequest("/velmere_a67?select=id", { method: "GET" }, 1_500));
  check("supabase_brokered_request_returns_response", response?.ok === true);
  check("supabase_broker_target_exact", observed?.target === "https://a67-project.supabase.co/rest/v1/velmere_a67?select=id", observed);
  check("supabase_service_headers_bound", observed?.apikey === true && observed?.authorization === true);
  check("supabase_operation_bound", String(observed?.operation).includes("configured_origin:supabase:supabase_service_rest"));
  check("supabase_request_budget_bound", observed?.maxRequestBytes === 1_048_576);
  check("supabase_response_budget_bound", observed?.maxResponseBytes === 8_388_608);

  process.env.SUPABASE_URL = "https://a67-project.supabase.co/credential-path";
  check("supabase_config_path_rejected", getSupabaseServiceRestConfig() === null);
  process.env.SUPABASE_URL = "https://user:pass@a67-project.supabase.co";
  check("supabase_config_url_credentials_rejected", getSupabaseServiceRestConfig() === null);
  process.env.SUPABASE_URL = "http://a67-project.supabase.co";
  process.env.NODE_ENV = "production";
  check("supabase_production_http_rejected", getSupabaseServiceRestConfig() === null);
} finally {
  for (const [name, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
  delete process.env.NODE_ENV;
}

const source = (file) => readFileSync(file, "utf8");
const deadlineSource = source("lib/network/fetch-with-deadline.ts");
const brokerSource = source("lib/network/brokered-egress.ts");
const safeSource = source("lib/network/safe-egress.ts");
const supabaseSource = source("lib/db/supabase-service-rest.ts");
const activeRealMarketsSource = source("lib/market-integrity/pass4413-cross-asset-runtime-normalizers.ts");
const currentRealMarketsSource = source("lib/market-integrity/cross-asset-runtime-normalizers.ts");
const adminSource = source("app/[locale]/admin/import-products/page.tsx");
const angelSource = source("lib/market-integrity/angel-provider-gateway.ts");

check("deadline_primitive_defines_same_origin_wrapper", deadlineSource.includes("fetchSameOriginWithDeadline") && deadlineSource.includes("same_origin_relative_request_required"));
check("deadline_primitive_rejects_redirect_follow", deadlineSource.includes("same_origin_redirect_policy_must_be_error") && deadlineSource.includes('redirect: "error"'));
check("supabase_adapter_uses_configured_origin_broker", supabaseSource.includes("brokeredConfiguredOriginFetch") && !/\bfetch\s*\(/.test(supabaseSource));
check("supabase_adapter_bounds_request_and_response", supabaseSource.includes("maxRequestBytes: 1_048_576") && supabaseSource.includes("maxResponseBytes: 8_388_608"));
check("active_real_markets_uses_same_origin_wrapper", activeRealMarketsSource.includes("fetchSameOriginWithDeadline") && !/\bfetch\s*\(/.test(activeRealMarketsSource));
check("current_real_markets_uses_same_origin_wrapper", currentRealMarketsSource.includes("fetchSameOriginWithDeadline") && !/\bfetch\s*\(/.test(currentRealMarketsSource));
check("admin_import_uses_same_origin_wrapper", adminSource.includes("fetchSameOriginWithDeadline") && !/\bfetch\s*\(/.test(adminSource));
check("angel_local_uses_deadline_primitive", angelSource.includes("fetchWithDeadline(endpoint") && !/await\s+fetch\s*\(/.test(angelSource));
check("angel_remote_retains_safe_egress", angelSource.includes("safeEgressFetch(endpoint"));
check("safe_egress_retains_dns_and_socket_pinning", safeSource.includes("validateSafeEgressDnsAddresses") && safeSource.includes("lookup: pinnedLookup") && safeSource.includes("rejectUnauthorized: true"));
check("brokered_configured_origin_retains_policy", brokerSource.includes("configuredOriginPolicy") && brokerSource.includes("dispatchBrokeredTransport(targetUrl, init, policy)"));

const rawFetchFiles = execFileSync("bash", ["-lc", String.raw`rg -l --glob '!node_modules/**' --glob '!artifacts/**' --glob '!_velmere/**' '(globalThis\.)?fetch\s*\(|global\.fetch\s*\(' app lib | sort`], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
check("single_raw_fetch_primitive_inventory", rawFetchFiles.length === 1 && rawFetchFiles[0] === "lib/network/fetch-with-deadline.ts", rawFetchFiles);

const failed = checks.filter((entry) => !entry.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a67.network-egress-trust-boundary-test.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
