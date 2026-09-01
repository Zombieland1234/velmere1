import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildVelmereAccountCookie,
  buildVelmereAccountSession,
  hashVelmereAccountBinding,
} from "../../lib/auth/account-session";
import {
  upsertVlmPaidEntitlementFromDemoReceipt,
  verifyVlmPaidAccountEntitlement,
} from "../../lib/commerce/vlm-entitlement-ledger";
import { resolveVlmAdvancedOnlyAccess } from "../../lib/commerce/vlm-advanced-only-access-policy";

const ROOT = process.cwd();
let assertions = 0;
function check(condition: unknown, message: string) {
  assertions += 1;
  assert.ok(condition, message);
}
function cookiePair(setCookie: string) {
  return setCookie.split(";", 1)[0] ?? "";
}

async function main() {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  process.env.NODE_ENV = "test";
  process.env.VERCEL_ENV = "preview";
  try {
    const accountSession = buildVelmereAccountSession({ provider: "preview", displayName: "Paid Test" });
    const accountIdHash = hashVelmereAccountBinding(accountSession.accountId);
    const context = {
      surface: "shield" as const,
      locale: "en" as const,
      assetId: "BTC",
      symbol: "BTC",
      depth: "pro" as const,
      returnPath: "/en/shield",
      accountIdHash,
    };
    const created = await upsertVlmPaidEntitlementFromDemoReceipt({
      sessionId: `vlm_demo_vlm_pro_analysis_single_${Date.now().toString(36)}`,
      productId: "vlm_pro_analysis_single",
      context,
    });
    check(created.ok, "demo receipt must create a server-side memory entitlement in non-production");

    const exact = await verifyVlmPaidAccountEntitlement({
      productId: "vlm_pro_analysis_single",
      context,
    });
    check(exact.ok, "exact account and context must resolve the server entitlement");
    check(exact.ok && exact.ledgerMode === "memory", "local proof must remain explicitly memory-ledger only");

    const wrongAccount = await verifyVlmPaidAccountEntitlement({
      productId: "vlm_pro_analysis_single",
      context: { ...context, accountIdHash: "f".repeat(64) },
    });
    check(!wrongAccount.ok, "a different account binding must not reuse the entitlement");
    const wrongAsset = await verifyVlmPaidAccountEntitlement({
      productId: "vlm_pro_analysis_single",
      context: { ...context, assetId: "ETH", symbol: "ETH" },
    });
    check(!wrongAsset.ok, "a different paid context must not reuse the entitlement");

    const signedCookie = cookiePair(buildVelmereAccountCookie(accountSession));
    const positiveRequest = new Request("https://preview.velmere.test/api/market-integrity/vlm", {
      headers: {
        cookie: signedCookie,
        "x-velmere-paid-access": "attacker-controlled-browser-marker",
        authorization: "Bearer attacker-controlled-browser-token",
      },
    });
    const positive = await resolveVlmAdvancedOnlyAccess({
      request: positiveRequest,
      purpose: "analysis",
      depth: "pro",
      surface: "shield",
      locale: "en",
      assetId: "BTC",
      symbol: "BTC",
      returnPath: "/en/shield",
    });
    check(positive.ok, "signed account session plus exact ledger entitlement must authorize paid depth");
    check(positive.ok && positive.reason === "paid_entitlement_verified", "authorization reason must be server entitlement verification");

    const spoofOnly = await resolveVlmAdvancedOnlyAccess({
      request: new Request("https://preview.velmere.test/api/market-integrity/vlm", {
        headers: {
          "x-velmere-paid-access": "attacker-controlled-browser-marker",
          authorization: "Bearer attacker-controlled-browser-token",
        },
      }),
      purpose: "analysis",
      depth: "pro",
      surface: "shield",
      locale: "en",
      assetId: "BTC",
      symbol: "BTC",
      returnPath: "/en/shield",
    });
    check(!spoofOnly.ok && spoofOnly.reason === "invitation_only_beta_account_required", "browser headers without a signed account session must fail closed");

    const clientSource = fs.readFileSync(path.join(ROOT, "lib/commerce/vlm-paid-access-client.ts"), "utf8");
    check(!clientSource.includes("window.sessionStorage.setItem") && !clientSource.includes("window.sessionStorage.getItem"), "pending checkout, receipt and context values must remain memory-only and never be persisted in browser storage");
    check(!clientSource.includes("window.localStorage.setItem"), "paid browser code must never persist a bearer token in localStorage");
    check(clientSource.includes("LEGACY_PAID_ACCESS_PREFIX"), "legacy persistent paid-access keys must be purged");
    check(clientSource.includes("server-account-entitlement"), "client may retain only a non-secret server-entitlement marker");

    const policySource = fs.readFileSync(path.join(ROOT, "lib/commerce/vlm-advanced-only-access-policy.ts"), "utf8");
    check(policySource.includes("verifyVlmPaidAccountEntitlement"), "paid policy must resolve the account-bound server ledger");
    check(!policySource.includes('request.headers.get("x-velmere-paid-access")'), "paid policy must not trust a browser paid-access header");
    check(!policySource.includes('request.headers.get("authorization")'), "paid policy must not treat browser bearer authorization as entitlement");

    const surfaceGuardSource = fs.readFileSync(path.join(ROOT, "lib/commerce/vlm-paid-surface-guard.ts"), "utf8");
    check(!surfaceGuardSource.includes('request.headers.get("x-velmere-paid-access")'), "audit paid surface guard must not read the browser token header");
    check(surfaceGuardSource.includes("resolveRequestAccount"), "audit paid surface guard must require the account session");

    const verifyHandlerSource = fs.readFileSync(path.join(ROOT, "lib/server/vlm-service-verify-handler.ts"), "utf8");
    check(!verifyHandlerSource.includes("createVlmPaidAccessToken"), "checkout verify must not mint a browser bearer token");
    check(!verifyHandlerSource.includes("accessToken: token.token"), "checkout verify response must not expose a browser bearer token");
    check(verifyHandlerSource.includes("browserBearerTokenIssued: false"), "receipt truth must explicitly record that no browser bearer token was issued");

    const reportSource = fs.readFileSync(path.join(ROOT, "lib/server/market-integrity-route-modules/report.ts"), "utf8");
    const realMarketsSource = fs.readFileSync(path.join(ROOT, "lib/market-integrity/real-markets-route-orchestrator.ts"), "utf8");
    check(!reportSource.includes('request.headers.get("x-velmere-paid-access")'), "market report access evidence must derive from the entitlement, not a browser header");
    check(!realMarketsSource.includes('request.headers.get("x-velmere-paid-access")'), "Real Markets paid access evidence must derive from the entitlement, not a browser header");

    const successClientSource = fs.readFileSync(path.join(ROOT, "components/checkout/VlmServiceCheckoutSuccessClient.tsx"), "utf8");
    check(!successClientSource.includes("payload.accessToken"), "checkout success must accept only a verified ledger record, not a returned bearer token");
    const clientPaidHeaderSources = [
      "components/market-integrity/AssetDetailModal.tsx",
      "components/market-integrity/asset-detail/paid-access.ts",
      "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
      "components/search/VelmereIntelligenceSearchClient.tsx",
    ].map((relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
    check(clientPaidHeaderSources.every((source) => !source.includes('"x-velmere-paid-access"')), "browser clients must not transmit a paid bearer or marker header");
    const auditWatchHelperSource = fs.readFileSync(path.join(ROOT, "lib/security/audit-watch-server-helpers.ts"), "utf8");
    check(!auditWatchHelperSource.includes("readPass4420PaidToken"), "unused browser-paid-token reader must be removed from the audit helper boundary");
    check(successClientSource.includes('payload.entitlement.ledgerMode !== "durable"'), "checkout success must require a durable or explicitly local memory ledger mode");
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalVercelEnv;
  }

  console.log(JSON.stringify({
    status: "PASS_A102R5_SERVER_ACCOUNT_ENTITLEMENT_NO_BROWSER_BEARER_PERSISTENCE",
    assertions,
    browserBearerTokenIssued: false,
    localStoragePaidTokenAuthority: false,
    browserHeaderEntitlementAuthority: false,
    serverAccountLedgerRequired: true,
    exactContextBindingRequired: true,
    realPaymentCredit: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
