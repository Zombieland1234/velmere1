import fs from "node:fs";
import crypto from "node:crypto";

const root = process.argv[2];
if (!root) throw new Error("work_root_required");
const policyPath = `${root}/lib/commerce/vlm-advanced-only-access-policy.ts`;
const envPath = `${root}/ENV_PRODUCTION_READY.example`;
let text = fs.readFileSync(policyPath, "utf8");
const beforeSha = crypto.createHash("sha256").update(text).digest("hex");

function replaceExactly(source, oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}_anchor_mismatch:${count}`);
  return source.replace(oldText, newText);
}

// The shared Browser Pro candidate patch must run first. It establishes the
// customer-identity extraction and the truthful bridge-backed success union.
if (!text.includes('extractSupabaseUserAccessToken')) throw new Error("browser_advanced_shared_identity_import_missing");
if (!text.includes('entitlementSource?: "legacy_server_ledger" | "product_entitlement_bridge";')) {
  throw new Error("browser_advanced_truthful_entitlement_union_missing");
}

if (!text.includes("async function resolveVelmereBrowserAdvancedCandidateEntitlementBridge")) {
  const anchor = 'export async function resolveVlmAdvancedOnlyAccess(args: {';
  if (!text.includes(anchor)) throw new Error("browser_advanced_policy_function_missing");
  const helper = `async function resolveVelmereBrowserAdvancedCandidateEntitlementBridge(args: {\n  request: Request;\n}) {\n  const bridgeUrl = String(process.env.VELMERE_PRODUCT_ENTITLEMENT_BRIDGE_URL ?? \"\").trim();\n  const serverCapability = String(process.env.VELMERE_PRODUCT_ENTITLEMENT_SERVER_CAPABILITY ?? \"\").trim();\n  const accessToken = extractSupabaseUserAccessToken(args.request)?.token ?? \"\";\n  if (!bridgeUrl || !serverCapability || !accessToken) return null;\n  let target: URL;\n  try { target = new URL(bridgeUrl); } catch { throw new Error(\"product_entitlement_bridge_url_invalid\"); }\n  if (target.protocol !== \"https:\" || !target.hostname.endsWith(\".supabase.co\")) throw new Error(\"product_entitlement_bridge_origin_invalid\");\n  let response: Response;\n  try {\n    response = await fetch(target, {\n      method: \"POST\",\n      headers: {\n        authorization: \"Bearer \" + accessToken,\n        \"x-velmere-entitlement-server-capability\": serverCapability,\n        \"content-type\": \"application/json\",\n        accept: \"application/json\",\n      },\n      body: JSON.stringify({\n        schemaVersion: \"velmere.product-entitlement-bridge-request.v1\",\n        action: \"resolve\",\n        productSlug: \"browser\",\n        requiredTier: \"advanced\",\n      }),\n      cache: \"no-store\",\n      redirect: \"error\",\n      signal: AbortSignal.timeout(8_000),\n    });\n  } catch { throw new Error(\"product_entitlement_bridge_unavailable\"); }\n  const responseText = await response.text();\n  let envelope: Record<string, unknown>;\n  try { envelope = JSON.parse(responseText) as Record<string, unknown>; } catch { throw new Error(\"product_entitlement_bridge_invalid_json\"); }\n  if (!response.ok || envelope.ok !== true) {\n    if ([401, 403].includes(response.status)) return false;\n    throw new Error(\"product_entitlement_bridge_failed\");\n  }\n  return envelope.allowed === true;\n}\n\n`;
  text = text.replace(anchor, `${helper}${anchor}`);
}

if (!text.includes('entitlementSource: "product_entitlement_bridge",\n        reason: "paid_entitlement_verified",\n        candidateLane: "browser_advanced_hosted_only"')) {
  const anchor = '  if (paidDepth === "advanced" || skuTruth.decision === "NOT_FOR_SALE") {';
  const block = `  // Hosted candidate only: this does NOT change public SKU truth. The lane is\n  // available exclusively when the Windows evidence workflow sets the explicit\n  // candidate flag. Production/current-source promotion needs a separate truth\n  // change plus exact-current proof before any FINAL credit.\n  if (\n    args.surface === \"browser\"\n    && paidDepth === \"advanced\"\n    && process.env.VELMERE_BROWSER_ADVANCED_CANDIDATE === \"true\"\n  ) {\n    const bridgeEntitlementAllowed = await resolveVelmereBrowserAdvancedCandidateEntitlementBridge({ request: args.request });\n    if (bridgeEntitlementAllowed === true) {\n      return {\n        ok: true,\n        depth: paidDepth,\n        paidRequired: true,\n        accessMode: paidMode,\n        policy,\n        context,\n        entitlementSource: \"product_entitlement_bridge\",\n        reason: \"paid_entitlement_verified\",\n        candidateLane: \"browser_advanced_hosted_only\",\n      } as VlmAccessGateVerdict & { candidateLane: \"browser_advanced_hosted_only\" };\n    }\n  }\n\n  if (paidDepth === \"advanced\" || skuTruth.decision === \"NOT_FOR_SALE\") {`;
  text = replaceExactly(text, anchor, block, "browser_advanced_candidate_insertion");
}

fs.writeFileSync(policyPath, text, "utf8");
let env = fs.readFileSync(envPath, "utf8");
if (!/^VELMERE_BROWSER_ADVANCED_CANDIDATE=/m.test(env)) {
  env += `${env.endsWith("\n") ? "" : "\n"}VELMERE_BROWSER_ADVANCED_CANDIDATE=false\n`;
}
fs.writeFileSync(envPath, env, "utf8");

console.log(JSON.stringify({
  status: "PASS_BROWSER_ADVANCED_ENTITLEMENT_CANDIDATE_PATCHED_V1",
  beforeSha256: beforeSha,
  afterSha256: crypto.createHash("sha256").update(fs.readFileSync(policyPath)).digest("hex"),
  scope: "browser_advanced_hosted_candidate_only",
  publicSkuTruthChanged: false,
  productionAdvancedUnlocked: false,
  crossProductEntitlementAllowed: false,
  exactCurrentSourceBytesAtProductExecution: false,
  customerFinalCredit: false,
  paidValueFinalCredit: false
}, null, 2));
