import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const root = process.cwd();
const nativeRequire = createRequire(import.meta.url);
let ts;
try {
  ts = nativeRequire("typescript");
} catch {
  ts = nativeRequire("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}
const cache = new Map();

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function resolveTs(request, parent) {
  if (request.startsWith("@/")) return path.join(root, request.slice(2)) + ".ts";
  if (request.startsWith(".")) return path.resolve(path.dirname(parent), request) + (path.extname(request) ? "" : ".ts");
  return null;
}

function loadTs(relative) {
  const absolute = path.isAbsolute(relative) ? relative : path.join(root, relative);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = fs.readFileSync(absolute, "utf8");
  const output = ts.transpileModule(source, {
    fileName: absolute,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: true,
    },
  });
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${relative}: ${errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n")}`);
  const module = { exports: {} };
  cache.set(absolute, module);
  const localRequire = (request) => {
    const resolved = resolveTs(request, absolute);
    return resolved ? loadTs(resolved) : nativeRequire(request);
  };
  vm.runInThisContext(`(function(require,module,exports,__filename,__dirname){${output.outputText}\n})`, { filename: absolute })(
    localRequire,
    module,
    module.exports,
    absolute,
    path.dirname(absolute),
  );
  return module.exports;
}

const pass632 = loadTs("lib/security/pass632-production-rate-limit-adapter.ts");
const pass633 = loadTs("lib/security/pass633-audit-event-schema.ts");
const pass634 = loadTs("lib/security/pass634-wallet-consent-boundary.ts");
const pass635 = loadTs("lib/security/pass635-export-redaction-policy.ts");
const pass636 = loadTs("lib/security/pass636-provider-failure-drills.ts");

const boundary = pass632.buildPass632Boundary({
  route: "/api/market-integrity/analyze?query=secret",
  provider: "coingecko",
  user: "user@example.com",
  client: "203.0.113.2:Chrome",
});
assert(boundary.key.startsWith("r_"), "PASS632 boundary must use hashed dimensions");
assert(!boundary.key.includes("user@example.com"), "PASS632 boundary cannot expose user identifiers");
assert(!boundary.key.includes("203.0.113.2"), "PASS632 boundary cannot expose raw client identifiers");
const windowA = pass632.buildPass632FixedWindow({ key: boundary.key, nowMs: 120_000, windowMs: 60_000 });
const windowB = pass632.buildPass632FixedWindow({ key: boundary.key, nowMs: 179_999, windowMs: 60_000 });
const windowC = pass632.buildPass632FixedWindow({ key: boundary.key, nowMs: 180_000, windowMs: 60_000 });
assert.equal(windowA.bucketKey, windowB.bucketKey, "PASS632 requests in one window must share a bucket");
assert.notEqual(windowB.bucketKey, windowC.bucketKey, "PASS632 next window must rotate the bucket");
assert.equal(pass632.pass632DeterministicJitterMs("same", 500), pass632.pass632DeterministicJitterMs("same", 500), "PASS632 jitter must be deterministic");
assert(pass632.buildPass632RecoveryDelay({ key: boundary.key, consecutiveFailures: 3 }) > pass632.buildPass632RecoveryDelay({ key: boundary.key, consecutiveFailures: 0 }), "PASS632 recovery delay must back off");
const headers = pass632.buildPass632RateLimitHeaders({ limit: 30, remaining: 0, resetAt: Date.now() + 10_000, retryAfterSeconds: 10, mode: "upstash_rest", degraded: false });
assert.equal(headers["retry-after"], "10", "PASS632 must emit Retry-After");
assert.equal(headers["x-ratelimit-limit"], "30", "PASS632 must emit limit metadata");

const audit = pass633.buildPass633AuditEvent({
  route: "/api/market-integrity/analyze?query=ETH",
  method: "GET",
  actorFingerprint: "fp_private_actor",
  providerIds: ["coingecko-market"],
  sourceIds: ["S01"],
  claimIds: ["C01"],
  decision: "analysis_review",
  modelVersion: "brain-v1",
  promptSchemaVersion: "query-v1",
  prompt: "private system prompt body",
  exportId: "export-01",
  generatedAt: "2026-06-09T12:00:00.000Z",
});
assert(audit.stages.some((stage) => stage.stage === "request"), "PASS633 request stage missing");
assert(audit.stages.some((stage) => stage.stage === "provider"), "PASS633 provider stage missing");
assert(audit.stages.some((stage) => stage.stage === "claim"), "PASS633 claim stage missing");
assert(audit.stages.some((stage) => stage.stage === "decision"), "PASS633 decision stage missing");
assert(audit.stages.some((stage) => stage.stage === "export"), "PASS633 export stage missing");
assert(audit.promptDigest && !JSON.stringify(audit).includes("private system prompt body"), "PASS633 must digest rather than expose prompts");
assert(!("actorFingerprint" in audit.publicReceipt), "PASS633 public receipt cannot expose actor fingerprint");

const readOnly = pass634.buildPass634WalletConsentBoundary({ action: "connect_read_only" });
assert.equal(readOnly.state, "read_only", "PASS634 connect must remain read-only");
assert.equal(readOnly.requiresSignature, false, "PASS634 read-only connect cannot request signature");
assert.equal(readOnly.requiresTransaction, false, "PASS634 read-only connect cannot request transaction");
const exactApproval = pass634.buildPass634WalletConsentBoundary({
  action: "approve_token",
  chainId: 1,
  contract: "0x1111111111111111111111111111111111111111",
  spender: "0x2222222222222222222222222222222222222222",
  approvalAmount: "1000000",
});
assert.equal(exactApproval.state, "review", "PASS634 exact approval should require explicit review");
const unlimited = pass634.buildPass634WalletConsentBoundary({
  action: "approve_token",
  chainId: 1,
  contract: "0x1111111111111111111111111111111111111111",
  spender: "0x2222222222222222222222222222222222222222",
  approvalAmount: "max",
});
assert.equal(unlimited.state, "blocked", "PASS634 unlimited approval must be blocked");
assert(unlimited.blockers.includes("unlimited_approval_forbidden"), "PASS634 unlimited approval blocker missing");
const secretRequest = pass634.buildPass634WalletConsentBoundary({ action: "sign_message", requestText: "Enter your seed phrase" });
assert.equal(secretRequest.state, "blocked", "PASS634 recovery material request must be blocked");

const safeCopyLeaks = pass635.detectPass635Leaks({ note: "Velmère never asks for seed phrases or private keys." });
assert.equal(safeCopyLeaks.length, 0, "PASS635 safety copy cannot be a false-positive leak");
const redacted = pass635.applyPass635ExportRedaction({
  surface: "security_export",
  generatedAt: "2026-06-09T12:00:00.000Z",
  payload: {
    apiKey: "very-secret-value-123456",
    authorization: "Bearer abcdefghijklmnopqrstuvwxyz",
    userEmail: "person@example.com",
    nested: { prompt: "hidden prompt", result: "safe" },
  },
});
const serializedRedacted = JSON.stringify(redacted.payload);
assert.equal(redacted.receipt.state, "clean", "PASS635 redacted output must be clean");
assert(redacted.receipt.removedPaths.includes("apiKey"), "PASS635 API key path must be removed");
assert(redacted.receipt.removedPaths.includes("authorization"), "PASS635 authorization path must be removed");
assert(redacted.receipt.removedPaths.includes("nested.prompt"), "PASS635 prompt path must be removed");
assert(redacted.receipt.maskedPaths.includes("userEmail"), "PASS635 email path must be masked");
assert(!serializedRedacted.includes("very-secret-value"), "PASS635 secret value leaked");
assert(!serializedRedacted.includes("person@example.com"), "PASS635 email value leaked");
assert(pass635.detectPass635Leaks({ authorizationHeader: "Bearer abcdefghijklmnopqrstuvwxyz" }).includes("bearer_token"), "PASS635 bearer leak detection missing");

const lensReportModule = loadTs("lib/search/lens-report.ts");
const integratedReport = lensReportModule.buildLensReport(
  {
    id: "apple",
    title: "Apple Inc.",
    symbol: "AAPL",
    category: "market",
    tone: "review",
    summary: "Source-bound Apple market snapshot.",
    whyItMatters: "Provider freshness and filing context bound the readout.",
    missingData: ["latest filing source"],
    nextOperatorStep: "Attach a current filing receipt.",
    sourceMode: "live",
    sourceConfidence: 82,
    shieldHref: "/market-integrity?asset=apple",
    sources: [
      { id: "aapl-primary", label: "Primary quote", mode: "live", freshness: "2026-06-09T09:59:30.000Z", confidence: 88, note: "provider timestamp" },
      { id: "aapl-secondary", label: "Secondary quote", mode: "live", freshness: "2026-06-09T09:59:00.000Z", confidence: 82, note: "provider timestamp" },
    ],
    chips: ["stock", "filing"],
    marketSnapshot: {
      assetClass: "stock",
      currency: "USD",
      price: 200,
      observedAt: "2026-06-09T09:59:30.000Z",
      venueReferencePrice: 200,
      venueSecondaryPrice: 205,
      venueComparisonState: "divergent",
      venueConfidenceCap: 38,
      fundamentalFilingDate: "2026-05-01",
      fundamentalConfidenceCap: 60,
    },
  },
  "en",
  "pro",
  "2026-06-09T10:00:00.000Z",
);
const reportRedaction = pass635.applyPass635ExportRedaction({
  surface: "pdf",
  payload: integratedReport,
  generatedAt: "2026-06-09T10:00:00.000Z",
});
assert.equal(reportRedaction.receipt.state, "clean", "PASS635 real Lens report must pass leak detection");
assert.equal(reportRedaction.receipt.removedPaths.length, 0, `PASS635 real Lens report unexpectedly contains private paths: ${reportRedaction.receipt.removedPaths.join(", ")}`);
assert.equal(reportRedaction.receipt.maskedPaths.length, 0, `PASS635 real Lens report unexpectedly contains identifiers requiring masking: ${reportRedaction.receipt.maskedPaths.join(", ")}`);

const matrix = pass636.buildPass636FailureDrillMatrix("provider-a");
assert.equal(matrix.drills.length, 7, "PASS636 must cover seven production failure modes");
assert.equal(matrix.passed, true, "PASS636 drills must keep UI functional and facts bounded");
assert(matrix.drills.every((drill) => drill.mayConfirmCurrentFact === false), "PASS636 fallback cannot confirm current facts");
assert.equal(pass636.runPass636FailureDrill("provider-a", "bad_timestamp").sourceState, "stale", "PASS636 invalid timestamps must become stale");
assert.equal(pass636.runPass636FailureDrill("provider-a", "malformed_json").sourceState, "offline", "PASS636 malformed JSON must be rejected");

const durable = read("lib/security/durable-rate-limit.ts");
for (const marker of ["buildPass632FixedWindow", "upstashCooldownUntil", "upstashProbeLockUntil", "buildDurableRateLimitHeaders", "fixedWindowBuckets"]) {
  assert(durable.includes(marker), `PASS632 durable limiter missing ${marker}`);
}
const abuse = read("lib/security/api-abuse-shield.ts");
assert(abuse.includes("buildPass632Boundary"), "PASS632 abuse shield must use hashed route/provider/user/client boundary");
assert(abuse.includes("buildDurableRateLimitHeaders"), "PASS632 abuse shield must return rate-limit headers");

const analyzeRoute = read("app/api/market-integrity/analyze/route.ts");
for (const marker of ["recordPass633AuditEvent", "runPass636FailureDrill", "degraded_live", "auditReceipt", "abuseShieldResponseHeaders"]) {
  assert(analyzeRoute.includes(marker), `PASS633/636 analyze route missing ${marker}`);
}
const securityExport = read("app/api/security/export/route.ts");
for (const marker of ["applyPass635ExportRedaction", "redactionReceipt", "auditReceipt", "providerFailureDrills", "x-velmere-redaction-receipt"]) {
  assert(securityExport.includes(marker), `PASS633/635/636 security export missing ${marker}`);
}
const pdfRoute = read("app/api/search/lens-report/route.ts");
for (const marker of ["velmere-lens-pdf", "pdf_redaction_required", "pdf_redaction_leak", "recordPass633AuditEvent", "x-velmere-audit-trace", "buildDurableRateLimitHeaders"]) {
  assert(pdfRoute.includes(marker), `PASS632/633/635 PDF route missing ${marker}`);
}
const walletUi = read("components/wallet/WalletConnectOptions.tsx");
for (const marker of ["buildPass634WalletConsentBoundary", "data-pass634-wallet-consent-boundary", "noSignature", "noTransaction", "noApproval"]) {
  assert(walletUi.includes(marker), `PASS634 wallet UI missing ${marker}`);
}

console.log("PASS632–636 security runtime release verified");
