import fs from "node:fs";
import path from "node:path";
import {
  PASS36_A102R13_BROWSER_ERROR_REDACTION_ID,
  createBrowserErrorReference,
  publicBrowserFailureCode,
  reportBrowserBoundaryFailure,
} from "../../lib/security/browser-error-redaction";
import {
  PASS36_A102R13_OPERATIONAL_LOG_BOUNDARY_ID,
  buildOperationalLogRecord,
  operationalIdentifierHash,
  writeOperationalEvent,
} from "../../lib/security/operational-log-boundary";

const root = process.cwd();
let passed = 0;
const failures: string[] = [];
function check(name: string, condition: unknown) {
  if (condition) passed += 1;
  else failures.push(name);
}
function source(relative: string) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

check("browser-boundary-id", PASS36_A102R13_BROWSER_ERROR_REDACTION_ID.includes("a102r13"));
check("operational-boundary-id", PASS36_A102R13_OPERATIONAL_LOG_BOUNDARY_ID.includes("a102r13"));
check("safe-digest-retained", createBrowserErrorReference("safe_digest_123") === "safe_digest_123");
check("unsafe-digest-replaced", createBrowserErrorReference("bad\nsecret") !== "bad\nsecret");
check("allowed-public-code", publicBrowserFailureCode(new Error("payment_required"), ["payment_required"], "fallback") === "payment_required");
check("unknown-public-code-redacted", publicBrowserFailureCode(new Error("postgres://admin:secret@db/private"), ["payment_required"], "fallback") === "fallback");

const browserLogs: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => { browserLogs.push(args.map(String).join(" ")); };
const browserProjection = reportBrowserBoundaryFailure({
  event: "real_markets_table_render_failure",
  error: new Error("https://provider.example/private?token=secret customer@example.com component/path"),
  digest: "safe_reference_123",
});
console.error = originalConsoleError;
check("browser-projection-reference", browserProjection.reference === "safe_reference_123");
check("browser-one-log", browserLogs.length === 1);
check("browser-log-no-message", !browserLogs[0].includes("provider.example") && !browserLogs[0].includes("customer@example.com") && !browserLogs[0].includes("secret"));
check("browser-log-no-stack", !browserLogs[0].toLowerCase().includes("component/path") && !browserLogs[0].includes(" at "));
check("browser-log-declares-redaction", browserLogs[0].includes('"rawMessageIncluded":false') && browserLogs[0].includes('"componentStackIncluded":false'));

const rawSession = "cs_test_private_session_123";
const rawEmail = "private.customer@example.com";
const rawWallet = "0x1234567890abcdef1234567890abcdef12345678";
const record = buildOperationalLogRecord({
  level: "warn",
  system: "velmere.checkout.webhook",
  event: "checkout_session_completed",
  code: "durable_storage_missing",
  metrics: { persisted: false, count: 2, note: "bounded\u202esecret" },
  identifiers: { stripeSession: rawSession, customerEmail: rawEmail, wallet: rawWallet },
  error: Object.assign(new Error("postgres://admin:secret@db/private"), { code: "DB_CONN" }),
});
const recordText = JSON.stringify(record);
check("record-schema", record.schemaVersion === PASS36_A102R13_OPERATIONAL_LOG_BOUNDARY_ID);
check("record-hashes-session", record.identifierHashes.stripeSessionSha256 === operationalIdentifierHash("stripeSession", rawSession));
check("record-hashes-email", record.identifierHashes.customerEmailSha256 === operationalIdentifierHash("customerEmail", rawEmail));
check("record-hashes-wallet", record.identifierHashes.walletSha256 === operationalIdentifierHash("wallet", rawWallet));
check("record-no-raw-session", !recordText.includes(rawSession));
check("record-no-raw-email", !recordText.includes(rawEmail));
check("record-no-raw-wallet", !recordText.includes(rawWallet));
check("record-no-error-message", !recordText.includes("postgres") && !recordText.includes("secret@db"));
check("record-no-stack", record.stackIncluded === false && !(record as Record<string, unknown>).stack);
check("record-control-bidi-removed", !recordText.includes("\u202e"));
check("hash-label-bound", operationalIdentifierHash("session", "same") !== operationalIdentifierHash("account", "same"));

const operationalLogs: string[] = [];
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => { operationalLogs.push(args.map(String).join(" ")); };
writeOperationalEvent({
  level: "warn",
  system: "velmere.test",
  event: "safe_failure",
  code: "test_only",
  identifiers: { token: "sk_live_DO_NOT_LOG_123456789" },
  error: new Error("do not log me"),
});
console.warn = originalWarn;
check("operational-one-log", operationalLogs.length === 1);
check("operational-log-no-secret", !operationalLogs[0].includes("sk_live") && !operationalLogs[0].includes("do not log me"));
check("operational-log-hash-present", /[a-f0-9]{64}/.test(operationalLogs[0]));

const globalError = source("app/[locale]/error.tsx");
const realMarkets = source("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const overlay = source("components/ui/OverlayPrimitives.tsx");
const cart = source("components/CartProvider.tsx");
const checkout = source("components/checkout/VelmereCheckoutFlowClient.tsx");
const checkoutSuccess = source("components/checkout/VlmServiceCheckoutSuccessClient.tsx");
const orderService = source("lib/db/order-service.ts");
const entitlement = source("lib/commerce/vlm-entitlement-ledger.ts");
const angel = source("lib/market-integrity/angel-provider-gateway.ts");

check("global-error-central-boundary", globalError.includes("reportBrowserBoundaryFailure") && !globalError.includes('console.error("Velmere view recovery"'));
check("global-error-reference-only", globalError.includes("{t.detail}: {reference}") && !globalError.includes("{error.message}"));
check("real-markets-no-raw-message-render", !realMarkets.includes("this.state.message") && realMarkets.includes("this.state.reference"));
check("real-markets-no-component-stack-log", !realMarkets.includes("componentStack: info.componentStack") && realMarkets.includes("reportBrowserBoundaryFailure"));
check("overlay-no-raw-error-log", !overlay.includes('console.error(\n        "Velmere overlay render failed"') && overlay.includes("reportBrowserBoundaryFailure"));
check("cart-no-raw-console", !cart.includes("console.warn(") && cart.includes("reportBrowserBoundaryFailure"));
check("checkout-no-raw-error-message-ui", !checkout.includes('body: error instanceof Error ? error.message') && checkout.includes("publicBrowserFailureCode"));
check("checkout-success-no-raw-interpolation", !checkoutSuccess.includes("Verification error: ${clean}") && checkoutSuccess.includes("publicBrowserFailureCode"));
check("order-central-log", orderService.includes("writeOperationalEvent") && !orderService.includes("stripeSessionId: input.session.id"));
check("order-no-partial-wallet-log", !orderService.includes("slice(0, 6)") && !orderService.includes("productIds:"));
check("entitlement-central-log", entitlement.includes("writeOperationalEvent") && !entitlement.includes("console.info(") && entitlement.includes("stripeSession: record.stripeSessionId"));
check("angel-central-log", angel.includes("writeOperationalEvent") && !angel.includes('console.warn("[angel-provider]'));

const consoleSinks: string[] = [];
for (const base of ["app", "components", "lib"]) {
  const stack = [path.join(root, base)];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (/\.(?:ts|tsx|js|mjs)$/u.test(entry.name)) {
        const relative = path.relative(root, absolute).replaceAll("\\", "/");
        const text = fs.readFileSync(absolute, "utf8");
        if (/console\.(?:log|info|warn|error|debug)\s*\(/u.test(text)) consoleSinks.push(relative);
      }
    }
  }
}
const allowedSinks = [
  "lib/security/api-error-envelope.ts",
  "lib/security/browser-error-redaction.ts",
  "lib/security/operational-log-boundary.ts",
];
check("central-console-sink-denominator", consoleSinks.sort().join("|") === allowedSinks.sort().join("|"));

const result = {
  status: failures.length ? "FAIL_A102R13_OPERATIONAL_LOG_CLIENT_ERROR_REDACTION" : "PASS_A102R13_OPERATIONAL_LOG_CLIENT_ERROR_REDACTION_LOCAL_ONLY",
  boundaryIds: [PASS36_A102R13_BROWSER_ERROR_REDACTION_ID, PASS36_A102R13_OPERATIONAL_LOG_BOUNDARY_ID],
  passed,
  failed: failures.length,
  failures,
  consoleSinks: consoleSinks.sort(),
  truth: {
    rawBrowserErrorMessageLogged: false,
    rawComponentStackLogged: false,
    rawPaymentIdentifiersLogged: false,
    rawProviderErrorLogged: false,
    operationalIdentifiersHashed: true,
    realBrowserConsoleMatrixProven: false,
    productionLogPipelineProven: false,
    legalDpoApproved: false,
    liveProven: false,
    saleEnabled: false,
  },
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
