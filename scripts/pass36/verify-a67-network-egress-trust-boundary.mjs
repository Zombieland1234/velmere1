import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });
const REVISION = "VELMERE_PASS36_A67R0_NETWORK_EGRESS_CREDENTIAL_AND_SAME_ORIGIN_TRUST_BOUNDARY_HARDENING";
const PARENT = "VELMERE_PASS36_A66R0_AUDIT_TOOL_EXECUTION_TRUST_BOUNDARY_HARDENING";

const policy = json("config/pass36/a67-network-egress-trust-boundary.json");
const state = json("config/pass36/a67-current-state.json");
const receipt = json("config/pass36/a67-network-egress-trust-boundary-test-receipt.json");
const current = json("config/pass35/current-revision.json");
const packageJson = json("package.json");
const activePass = read("VELMERE_ACTIVE_PASS.txt").trim();
const deadline = read("lib/network/fetch-with-deadline.ts");
const broker = read("lib/network/brokered-egress.ts");
const safe = read("lib/network/safe-egress.ts");
const supabase = read("lib/db/supabase-service-rest.ts");
const activeRealMarkets = read("lib/market-integrity/pass4413-cross-asset-runtime-normalizers.ts");
const currentRealMarkets = read("lib/market-integrity/cross-asset-runtime-normalizers.ts");
const admin = read("app/[locale]/admin/import-products/page.tsx");
const angel = read("lib/market-integrity/angel-provider-gateway.ts");

check("revision:policy", policy.revisionId === REVISION);
check("revision:state", state.revisionId === REVISION);
check("revision:parent", policy.parentRevisionId === PARENT && state.parentRevisionId === PARENT);
check("revision:current", current.sourceRevisionId === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("revision:active-pass", activePass === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("current:a67-field", current.networkEgressTrustBoundaryRevisionId === REVISION && current.networkEgressTrustBoundaryImplemented === true);
check("current:a66-retained", current.auditToolExecutionTrustBoundaryRevisionId === PARENT && current.auditToolExecutionTrustBoundaryImplemented === true);
check("policy:single-raw-fetch", policy.requirements?.singleRawFetchPrimitiveBelowAppAndLib === true && policy.requirements?.rawFetchPrimitivePath === "lib/network/fetch-with-deadline.ts");
check("policy:same-origin", policy.requirements?.sameOriginRequestsRequireRootRelativePath === true && policy.requirements?.sameOriginRedirectsRejected === true);
check("policy:supabase-broker", policy.requirements?.supabaseServiceRoleUsesPinnedConfiguredOriginBroker === true);
check("policy:budgets", policy.requirements?.supabaseRequestMaximumBytes === 1_048_576 && policy.requirements?.supabaseResponseMaximumBytes === 8_388_608);
check("deadline:same-origin-helper", deadline.includes("isSafeSameOriginRelativeRequest") && deadline.includes("fetchSameOriginWithDeadline"));
check("deadline:root-relative", deadline.includes('input.startsWith("/")') && deadline.includes('!input.startsWith("//")'));
check("deadline:control-backslash", deadline.includes('!input.includes("\\\\")') && deadline.includes("\\u007f"));
check("deadline:redirect-error", deadline.includes("same_origin_redirect_policy_must_be_error") && deadline.includes('redirect: "error"'));
check("supabase:brokered", supabase.includes("brokeredConfiguredOriginFetch") && !/\bfetch\s*\(/.test(supabase));
check("supabase:origin-only", supabase.includes("parsed.username") && supabase.includes("parsed.password") && supabase.includes("parsed.port") && supabase.includes("return parsed.origin"));
check("supabase:service-headers", supabase.includes('headers.set("apikey"') && supabase.includes('headers.set("authorization"'));
check("supabase:request-budget", supabase.includes("maxRequestBytes: 1_048_576"));
check("supabase:response-budget", supabase.includes("maxResponseBytes: 8_388_608"));
check("supabase:no-store-manual", supabase.includes('cache: "no-store"') && supabase.includes('redirect: "manual"'));
check("real-markets:active-same-origin", activeRealMarkets.includes("fetchSameOriginWithDeadline") && !/\bfetch\s*\(/.test(activeRealMarkets));
check("real-markets:current-same-origin", currentRealMarkets.includes("fetchSameOriginWithDeadline") && !/\bfetch\s*\(/.test(currentRealMarkets));
check("admin:same-origin", admin.includes("fetchSameOriginWithDeadline") && !/\bfetch\s*\(/.test(admin));
check("admin:bounded-timeout", admin.includes('operation: "admin_product_import"') && admin.includes('operation: "admin_product_brain_review"'));
check("angel:local-deadline", angel.includes("fetchWithDeadline(endpoint") && angel.includes("angel_local_loopback_provider"));
check("angel:remote-safe-egress", angel.includes("safeEgressFetch(endpoint") && angel.includes("angelRemoteAllowedHosts"));
check("safe-egress:dns-public", safe.includes("validateSafeEgressDnsAddresses") && safe.includes("egress_private_ip_rejected"));
check("safe-egress:socket-pinned", safe.includes("lookup: pinnedLookup") && safe.includes("servername: target.url.hostname"));
check("safe-egress:tls", safe.includes("rejectUnauthorized: true"));
check("safe-egress:bounded-response", safe.includes("enforceSafeEgressResponseLimit") && safe.includes("egress_response_too_large"));
check("broker:configured-origin", broker.includes("configuredOriginPolicy") && broker.includes("brokeredConfiguredOriginFetch"));
check("broker:test-transport-policy", broker.includes("resolveSafeEgressTarget(input, policy") && broker.includes("enforceSafeEgressResponseLimit(response"));
check("test:all-pass", receipt.total === 36 && receipt.passed === 36 && receipt.failed === 0);
for (const id of [
  "same_origin_wrapper_rejects_external_before_fetch",
  "same_origin_wrapper_rejects_redirect_override",
  "supabase_brokered_request_returns_response",
  "supabase_service_headers_bound",
  "supabase_config_path_rejected",
  "single_raw_fetch_primitive_inventory",
]) check(`test:${id}`, receipt.checks?.some((row) => row.id === id && row.pass === true));
const rawFetchFiles = execFileSync("bash", ["-lc", String.raw`rg -l --glob '!node_modules/**' --glob '!artifacts/**' --glob '!_velmere/**' '(globalThis\.)?fetch\s*\(|global\.fetch\s*\(' app lib | sort`], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
check("inventory:single-raw-fetch", rawFetchFiles.length === 1 && rawFetchFiles[0] === "lib/network/fetch-with-deadline.ts", rawFetchFiles);
check("package:test-script", packageJson.scripts?.["test:pass36:a67"] === "node --experimental-strip-types scripts/pass36/test-a67-network-egress-trust-boundary.mjs");
check("package:verify-script", packageJson.scripts?.["verify:pass36:a67"] === "node scripts/pass36/verify-a67-network-egress-trust-boundary.mjs");
check("truth:no-real-network-credit", state.realSupabaseRequestExecuted === false && state.realProviderNetworkExecuted === false);
check("truth:no-release-credit", state.exactFinalByteBuildExecuted === false && state.criticalOfflineGatePassed === false && state.realStagingExecuted === false && state.saleEnabled === false && state.liveProven === false);

const failed = checks.filter((entry) => !entry.pass);
const output = {
  schemaVersion: "velmere.pass36.a67.network-egress-trust-boundary-verification.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
