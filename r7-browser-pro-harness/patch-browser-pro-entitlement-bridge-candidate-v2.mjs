import fs from "node:fs";
import crypto from "node:crypto";

const root = process.argv[2];
if (!root) throw new Error("work_root_required");
const policyPath = `${root}/lib/commerce/vlm-advanced-only-access-policy.ts`;
const envPath = `${root}/ENV_PRODUCTION_READY.example`;
let text = fs.readFileSync(policyPath, "utf8");
const beforeSha = crypto.createHash("sha256").update(text).digest("hex");

function matchingClose(source, openIndex, openCharacter = "(", closeCharacter = ")") {
  let depth = 0, quote = null, escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") { quote = character; continue; }
    if (character === openCharacter) depth += 1;
    else if (character === closeCharacter && --depth === 0) return index;
  }
  return -1;
}

if (!text.includes('extractSupabaseUserAccessToken')) {
  const imports = [...text.matchAll(/^import .*;\r?$/gm)];
  const anchor = imports.at(-1);
  if (!anchor) throw new Error("policy_import_anchor_missing");
  const at = anchor.index + anchor[0].length;
  text = `${text.slice(0, at)}\nimport { extractSupabaseUserAccessToken } from "@/lib/db/supabase";${text.slice(at)}`;
}

let functionMatch = /export\s+(?:async\s+function|const)\s+resolveVlmAdvancedOnlyAccess\b/.exec(text);
if (!functionMatch) throw new Error("paid_policy_function_missing");
let functionStart = functionMatch.index;
let functionOpen = text.indexOf("{", functionStart);
let functionEnd = matchingClose(text, functionOpen, "{", "}");
if (functionOpen < 0 || functionEnd < 0) throw new Error("paid_policy_function_boundary_missing");
let functionText = text.slice(functionStart, functionEnd + 1);

const paidReturns = [...functionText.matchAll(/return\s+(\{[\s\S]{0,1800}?paidRequired\s*:\s*true[\s\S]{0,1800}?\});/g)];
if (!paidReturns.length) throw new Error("paid_success_return_not_found");
let selected = null;
for (const match of paidReturns.sort((a, b) => a[1].length - b[1].length)) {
  const object = match[1];
  const accessMode = /accessMode\s*:\s*["']([^"']+)["']/.exec(object)?.[1];
  const reason = /reason\s*:\s*["']([^"']+)["']/.exec(object)?.[1];
  const policy = /policy\s*:\s*([^,\n}]+)/.exec(object)?.[1]?.trim();
  if (accessMode && reason && policy && !/[;{}]/.test(policy)) { selected = { accessMode, reason, policy }; break; }
}
if (!selected) throw new Error("paid_success_shape_not_safely_derivable");

const helper = `async function resolveVelmereProductEntitlementBridge(args: {
  request: Request;
  productSlug: string;
  requiredTier: "pro" | "advanced";
}) {
  const bridgeUrl = String(process.env.VELMERE_PRODUCT_ENTITLEMENT_BRIDGE_URL ?? "").trim();
  const serverCapability = String(process.env.VELMERE_PRODUCT_ENTITLEMENT_SERVER_CAPABILITY ?? "").trim();
  const accessToken = extractSupabaseUserAccessToken(args.request)?.token ?? "";
  if (!bridgeUrl || !serverCapability || !accessToken) return null;
  let target: URL;
  try { target = new URL(bridgeUrl); } catch { throw new Error("product_entitlement_bridge_url_invalid"); }
  if (target.protocol !== "https:" || !target.hostname.endsWith(".supabase.co")) throw new Error("product_entitlement_bridge_origin_invalid");
  let response: Response;
  try {
    response = await fetch(target, {
      method: "POST",
      headers: {
        authorization: "Bearer " + accessToken,
        "x-velmere-entitlement-server-capability": serverCapability,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ schemaVersion: "velmere.product-entitlement-bridge-request.v1", action: "resolve", productSlug: args.productSlug, requiredTier: args.requiredTier }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
  } catch { throw new Error("product_entitlement_bridge_unavailable"); }
  const responseText = await response.text();
  let envelope: Record<string, unknown>;
  try { envelope = JSON.parse(responseText) as Record<string, unknown>; } catch { throw new Error("product_entitlement_bridge_invalid_json"); }
  if (!response.ok || envelope.ok !== true) {
    if ([401, 403].includes(response.status)) return false;
    throw new Error("product_entitlement_bridge_failed");
  }
  return envelope.allowed === true;
}

`;
text = `${text.slice(0, functionStart)}${helper}${text.slice(functionStart)}`;

functionMatch = /export\s+(?:async\s+function|const)\s+resolveVlmAdvancedOnlyAccess\b/.exec(text);
if (!functionMatch) throw new Error("paid_policy_function_lost_after_helper");
functionStart = functionMatch.index;
functionOpen = text.indexOf("{", functionStart);
functionEnd = matchingClose(text, functionOpen, "{", "}");
functionText = text.slice(functionStart, functionEnd + 1);
const contexts = [...functionText.matchAll(/const\s+context\s*=\s*normalizePaidContext\s*\(/g)];
if (!contexts.length) throw new Error("paid_context_anchor_missing");
const context = contexts.at(-1);
const open = functionStart + context.index + context[0].lastIndexOf("(");
const close = matchingClose(text, open, "(", ")");
const semicolon = text.indexOf(";", close);
if (close < 0 || semicolon < 0 || semicolon > functionEnd) throw new Error("paid_context_boundary_invalid");
const block = `

  const bridgeEntitlementAllowed = await resolveVelmereProductEntitlementBridge({ request: args.request, productSlug: "browser", requiredTier: depth });
  if (bridgeEntitlementAllowed === true) {
    return {
      ok: true,
      depth,
      paidRequired: true,
      accessMode: ${JSON.stringify(selected.accessMode)},
      policy: ${selected.policy},
      context,
      reason: ${JSON.stringify(selected.reason)},
    };
  }
`;
text = `${text.slice(0, semicolon + 1)}${block}${text.slice(semicolon + 1)}`;
fs.writeFileSync(policyPath, text, "utf8");
let env = fs.readFileSync(envPath, "utf8");
for (const key of ["VELMERE_PRODUCT_ENTITLEMENT_BRIDGE_URL", "VELMERE_PRODUCT_ENTITLEMENT_SERVER_CAPABILITY"]) if (!new RegExp(`^${key}=`, "m").test(env)) env += `${env.endsWith("\n") ? "" : "\n"}${key}=\n`;
fs.writeFileSync(envPath, env, "utf8");
console.log(JSON.stringify({ status: "PASS_BROWSER_PRO_ENTITLEMENT_BRIDGE_CANDIDATE_PATCHED_V2", beforeSha256: beforeSha, afterSha256: crypto.createHash("sha256").update(fs.readFileSync(policyPath)).digest("hex"), derivedAccessMode: selected.accessMode, derivedReason: selected.reason, derivedPolicyExpression: selected.policy, exactCurrentSourceBytesAtProductExecution: false, customerFinalCredit: false }, null, 2));
