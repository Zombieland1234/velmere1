import fs from "node:fs";
import crypto from "node:crypto";

const root = process.argv[2];
if (!root) throw new Error("work_root_required");
const lensPath = `${root}/lib/server/search-route-modules/lens-report.ts`;
const storePath = `${root}/lib/reporting/account-customer-artifact-store.ts`;

function replaceOnce(text, oldValue, newValue, label) {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) throw new Error(`${label}_anchor_count_${count}`);
  return text.replace(oldValue, newValue);
}

let lens = fs.readFileSync(lensPath, "utf8");
lens = replaceOnce(
  lens,
  `import { hasSecurityCookieCandidate } from "@/lib/security/cookie-session-boundary";\n`,
  `import { hasSecurityCookieCandidate } from "@/lib/security/cookie-session-boundary";\nimport { extractSupabaseUserAccessToken } from "@/lib/db/supabase";\n`,
  "lens_import",
);
lens = replaceOnce(
  lens,
  `  const pass2177OriginGuard = assertPass2177SameOriginRequest(request, {\n    allowMissingOrigin: true,\n  });\n  if (pass2177OriginGuard) return pass2177OriginGuard;\n\n  const contentLength = Number(request.headers.get("content-length") ?? 0);\n`,
  `  const pass2177OriginGuard = assertPass2177SameOriginRequest(request, {\n    allowMissingOrigin: true,\n  });\n  if (pass2177OriginGuard) return pass2177OriginGuard;\n\n  // Preserve an unread copy for body-bound trusted account verification and\n  // bearer extraction after the Lens payload parser consumes the original.\n  const accountResolutionRequest = request.clone();\n\n  const contentLength = Number(request.headers.get("content-length") ?? 0);\n`,
  "lens_clone",
);
lens = replaceOnce(
  lens,
  `  const durableAccount = await resolveRequestAccount(request);`,
  `  const durableAccount = await resolveRequestAccount(accountResolutionRequest);`,
  "lens_account_resolution",
);
lens = replaceOnce(
  lens,
  `        pdfBytes: pdf,\n      });`,
  `        pdfBytes: pdf,\n        userAccessToken: extractSupabaseUserAccessToken(accountResolutionRequest)?.token ?? undefined,\n      });`,
  "lens_store_token",
);
fs.writeFileSync(lensPath, lens, "utf8");

let store = fs.readFileSync(storePath, "utf8");
store = replaceOnce(
  store,
  `  pdfBytes: Uint8Array;\n  client?: SupabaseClient | null;\n}) {`,
  `  pdfBytes: Uint8Array;\n  client?: SupabaseClient | null;\n  userAccessToken?: string;\n}) {`,
  "store_signature",
);
store = replaceOnce(
  store,
  `    return { ...verified, source: "supabase" as const };\n  }\n\n  assertDurableStorage();\n`,
  `    return { ...verified, source: "supabase" as const };\n  }\n\n  const bridgeUrl = String(process.env.VELMERE_ACCOUNT_ARTIFACT_WRITE_BRIDGE_URL ?? "").trim();\n  const serverCapability = String(process.env.VELMERE_BROWSER_SERVER_CAPABILITY ?? "").trim();\n  const userAccessToken = String(args.userAccessToken ?? "").trim();\n  if (bridgeUrl && serverCapability && userAccessToken) {\n    const target = new URL(bridgeUrl);\n    if (target.protocol !== "https:" || !target.hostname.endsWith(".supabase.co")) {\n      throw new Error("account_customer_artifact_bridge_origin_invalid");\n    }\n    const body = JSON.stringify({\n      schemaVersion: "velmere.r7.browser-artifact-write-bridge-request.v1",\n      accountId: args.accountId,\n      snapshot: args.snapshot,\n      payloadCanonical: canonicalJson(args.snapshot.payload),\n      blob: {\n        schemaVersion: proposed.schemaVersion,\n        blobId: proposed.blobId,\n        snapshotId: proposed.snapshotId,\n        accountIdHash: proposed.accountIdHash,\n        surface: proposed.surface,\n        reportId: proposed.reportId,\n        artifactDigest: proposed.artifactDigest,\n        pdfDigest: proposed.pdfDigest,\n        pdfByteLength: proposed.pdfByteLength,\n        mimeType: proposed.mimeType,\n        createdAt: proposed.createdAt,\n        recordDigest: proposed.recordDigest,\n      },\n      pdfBase64: Buffer.from(proposed.pdfBytes).toString("base64"),\n    });\n    const response = await fetch(target, {\n      method: "POST",\n      headers: {\n        authorization: "Bearer " + userAccessToken,\n        "x-velmere-browser-server-capability": serverCapability,\n        "content-type": "application/json",\n        accept: "application/json",\n      },\n      body,\n      cache: "no-store",\n      redirect: "error",\n      signal: AbortSignal.timeout(8_000),\n    });\n    const responseText = await response.text();\n    let envelope;\n    try { envelope = JSON.parse(responseText); } catch { throw new Error("account_customer_artifact_bridge_invalid_json"); }\n    if (!response.ok || envelope?.ok !== true || envelope?.schemaVersion !== "velmere.r7.browser-artifact-write-bridge-response.v1") {\n      throw new Error("account_customer_artifact_bridge_failed:" + response.status + ":" + String(envelope?.error ?? "unknown"));\n    }\n    const verified = parsePass4824AccountCustomerArtifactPdfBundleRpcResponse({\n      payload: envelope.data,\n      accountId: args.accountId,\n      expectedSnapshot: args.snapshot,\n      proposedBlob: proposed,\n    });\n    return { ...verified, source: "supabase" as const, transport: "authenticated_edge_bridge" as const };\n  }\n\n  assertDurableStorage();\n`,
  "store_bridge",
);
fs.writeFileSync(storePath, store, "utf8");

const sha = (path) => crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
console.log(JSON.stringify({
  status: "PASS_BROWSER_ZERO_VERCEL_DURABLE_BRIDGE_FIX_APPLIED_CANDIDATE_ONLY",
  files: {
    lens: { path: lensPath, sha256: sha(lensPath) },
    store: { path: storePath, sha256: sha(storePath) },
  },
  currentSourceModified: false,
  customerFinalCredit: false,
}, null, 2));
