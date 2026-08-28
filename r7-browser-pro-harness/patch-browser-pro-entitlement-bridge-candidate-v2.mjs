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

if (!text.includes('extractSupabaseUserAccessToken')) {
  const imports = [...text.matchAll(/^import .*;\r?$/gm)];
  const anchor = imports.at(-1);
  if (!anchor) throw new Error("policy_import_anchor_missing");
  const at = anchor.index + anchor[0].length;
  text = `${text.slice(0, at)}\nimport { extractSupabaseUserAccessToken } from "@/lib/db/supabase";${text.slice(at)}`;
}

// A bridge-backed entitlement is still server-side authority, but it is not the
// legacy VlmPaidAccountEntitlementVerdict record. Make the success union truthful
// rather than fabricating a Stripe/legacy entitlement record just to satisfy TS.
if (!text.includes('entitlementSource?: "legacy_server_ledger" | "product_entitlement_bridge";')) {
  text = replaceExactly(
    text,
    '      entitlement: Extract<VlmPaidAccountEntitlementVerdict, { ok: true }>;\n      reason: "paid_entitlement_verified";',
    '      entitlement?: Extract<VlmPaidAccountEntitlementVerdict, { ok: true }>;\n      entitlementSource?: "legacy_server_ledger" | "product_entitlement_bridge";\n      reason: "paid_entitlement_verified";',
    "paid_success_union",
  );
}

if (!text.includes("async function resolveVelmereBrowserProEntitlementBridge")) {
  const functionAnchor = 'export async function resolveVlmAdvancedOnlyAccess(args: {';
  if (!text.includes(functionAnchor)) throw new Error("paid_policy_function_missing");
  const helper = `async function resolveVelmereBrowserProEntitlementBridge(args: {\n  request: Request;\n}) {\n  const bridgeUrl = String(process.env.VELMERE_PRODUCT_ENTITLEMENT_BRIDGE_URL ?? \"\").trim();\n  const serverCapability = String(process.env.VELMERE_PRODUCT_ENTITLEMENT_SERVER_CAPABILITY ?? \"\").trim();\n  const accessToken = extractSupabaseUserAccessToken(args.request)?.token ?? \"\";\n  if (!bridgeUrl || !serverCapability || !accessToken) return null;\n  let target: URL;\n  try { target = new URL(bridgeUrl); } catch { throw new Error(\"product_entitlement_bridge_url_invalid\"); }\n  if (target.protocol !== \"https:\" || !target.hostname.endsWith(\".supabase.co\")) throw new Error(\"product_entitlement_bridge_origin_invalid\");\n  let response: Response;\n  try {\n    response = await fetch(target, {\n      method: \"POST\",\n      headers: {\n        authorization: \"Bearer \" + accessToken,\n        \"x-velmere-entitlement-server-capability\": serverCapability,\n        \"content-type\": \"application/json\",\n        accept: \"application/json\",\n      },\n      body: JSON.stringify({\n        schemaVersion: \"velmere.product-entitlement-bridge-request.v1\",\n        action: \"resolve\",\n        productSlug: \"browser\",\n        requiredTier: \"pro\",\n      }),\n      cache: \"no-store\",\n      redirect: \"error\",\n      signal: AbortSignal.timeout(8_000),\n    });\n  } catch { throw new Error(\"product_entitlement_bridge_unavailable\"); }\n  const responseText = await response.text();\n  let envelope: Record<string, unknown>;\n  try { envelope = JSON.parse(responseText) as Record<string, unknown>; } catch { throw new Error(\"product_entitlement_bridge_invalid_json\"); }\n  if (!response.ok || envelope.ok !== true) {\n    if ([401, 403].includes(response.status)) return false;\n    throw new Error(\"product_entitlement_bridge_failed\");\n  }\n  return envelope.allowed === true;\n}\n\n`;
  text = text.replace(functionAnchor, `${helper}${functionAnchor}`);
}

if (!text.includes('entitlementSource: "product_entitlement_bridge"')) {
  const anchor = '  const skuTruth = getVlmCurrentSkuTruth(paidDepth, args.locale);\n\n';
  const block = `  const skuTruth = getVlmCurrentSkuTruth(paidDepth, args.locale);\n\n  // Candidate lane is intentionally Browser Pro only. Basic stays free and never\n  // calls the paid bridge; other products and Advanced continue through their\n  // existing fail-closed authorities.\n  if (args.surface === \"browser\" && paidDepth === \"pro\") {\n    const bridgeEntitlementAllowed = await resolveVelmereBrowserProEntitlementBridge({ request: args.request });\n    if (bridgeEntitlementAllowed === true) {\n      return {\n        ok: true,\n        depth: paidDepth,\n        paidRequired: true,\n        accessMode: paidMode,\n        policy,\n        context,\n        entitlementSource: \"product_entitlement_bridge\",\n        reason: \"paid_entitlement_verified\",\n      };\n    }\n  }\n\n`;
  text = replaceExactly(text, anchor, block, "browser_pro_bridge_insertion");
}

fs.writeFileSync(policyPath, text, "utf8");
let env = fs.readFileSync(envPath, "utf8");
for (const key of ["VELMERE_PRODUCT_ENTITLEMENT_BRIDGE_URL", "VELMERE_PRODUCT_ENTITLEMENT_SERVER_CAPABILITY"]) {
  if (!new RegExp(`^${key}=`, "m").test(env)) env += `${env.endsWith("\n") ? "" : "\n"}${key}=\n`;
}
fs.writeFileSync(envPath, env, "utf8");

const after = fs.readFileSync(policyPath);
console.log(JSON.stringify({
  status: "PASS_BROWSER_PRO_ENTITLEMENT_BRIDGE_CANDIDATE_PATCHED_V2",
  beforeSha256: beforeSha,
  afterSha256: crypto.createHash("sha256").update(after).digest("hex"),
  scope: "browser_pro_only",
  basicBridgeCall: false,
  crossProductEntitlementAllowed: false,
  advancedPolicyChanged: false,
  fabricatedLegacyEntitlementRecord: false,
  exactCurrentSourceBytesAtProductExecution: false,
  customerFinalCredit: false,
  paidValueFinalCredit: false
}, null, 2));
