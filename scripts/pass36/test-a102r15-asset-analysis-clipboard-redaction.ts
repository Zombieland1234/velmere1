import fs from "node:fs";
import path from "node:path";
import {
  buildAssetAnalysisClipboardSummary,
  serializeSafeSystemClipboardJson,
  writeSafeSystemClipboardJson,
} from "../../lib/security/browser-system-clipboard";

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

const hostile = {
  schema: "velmere.pass4545.asset-action-export-manifest.v1",
  symbol: "BTC\u202e",
  name: "Private analyst name",
  timeframe: "1D",
  activeAction: "source-watch",
  state: "report-export-ready",
  handoff: "report-export-ready",
  sourceState: "remote-ohlc",
  sourceLabel: "Private provider account 123",
  sourceTimeLabel: "2026-07-30T09:00:00.000Z",
  observedAt: "2026-07-30T09:00:00.000Z",
  generatedAt: "2026-07-30T09:00:01.000Z",
  packetId: "packet-secret-123",
  receiptId: "receipt-secret-123",
  latestReceiptId: "receipt-secret-456",
  proofDigest: "a".repeat(64),
  checksum: "b".repeat(64),
  route: "/pl/account/private?token=secret",
  token: "secret-token",
  email: "customer@example.com",
  sourceClaims: ["provider-current", "rights-approved"],
  readyCount: 7.9,
  reviewCount: -4,
  replayCount: 12,
  risk: "87 critical",
  commandSurface: { state: "command-ready", packetId: "nested-secret" },
  decisionQueue: { state: "review-required", receiptId: "nested-receipt" },
};

const summary = buildAssetAnalysisClipboardSummary(hostile);
const text = serializeSafeSystemClipboardJson(summary);
check("schema", summary.schema === "velmere.browser.system-clipboard.asset-analysis-summary.v1");
check("symbol-clean", summary.symbol === "BTC");
check("timeframe", summary.timeframe === "1D");
check("action", summary.action === "source-watch");
check("state", summary.state === "report-export-ready");
check("source-state", summary.sourceState === "remote-ohlc");
check("ready-bounded", summary.readyCount === 7);
check("review-negative-zero", summary.reviewCount === 0);
check("item-count", summary.itemCount === 12);
check("risk-band", summary.riskBand === "critical");
check("redacted-boundary", summary.clipboardBoundary === "redacted-summary-only");
check("no-identifiers-flag", summary.identifiersIncluded === false);
check("no-timestamps-flag", summary.timestampsIncluded === false);
check("no-source-claims-flag", summary.sourceClaimsIncluded === false);
check("no-secrets-flag", summary.secretsIncluded === false);
check("no-authority", summary.durableAuthority === false);
check("text-no-name", !text.includes("Private analyst"));
check("text-no-provider", !text.includes("Private provider"));
check("text-no-time", !text.includes("2026-07-30"));
check("text-no-packet", !text.includes("packet-secret"));
check("text-no-receipt", !text.includes("receipt-secret"));
check("text-no-hash-a", !text.includes("a".repeat(64)));
check("text-no-hash-b", !text.includes("b".repeat(64)));
check("text-no-route", !text.includes("/pl/account"));
check("text-no-token", !text.includes("secret-token"));
check("text-no-email", !text.includes("customer@example.com"));
check("text-no-claims", !text.includes("rights-approved"));
check("warning-external", text.includes("System clipboard is external to Velmere"));
check("payload-small", new TextEncoder().encode(text).byteLength < 4096);

for (const key of [
  "packetId", "receiptId", "latestReceiptId", "sourceLabel", "sourceTimeLabel",
  "observedAt", "generatedAt", "sourceClaims", "proofDigest", "checksum",
]) {
  let rejected = false;
  try {
    serializeSafeSystemClipboardJson({ ...summary, [key]: "forbidden" } as typeof summary);
  } catch (error) {
    rejected = String(error).includes("system_clipboard_sensitive_key_detected");
  }
  check(`blocked-key-${key}`, rejected);
}

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalSecureContext = Object.getOwnPropertyDescriptor(globalThis, "isSecureContext");
let writes = 0;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { clipboard: { writeText: async (value: string) => { writes += 1; check("write-redacted", value === text); } } },
});
Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
check("secure-write", await writeSafeSystemClipboardJson(summary) === true);
check("secure-one-write", writes === 1);
Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: false });
check("insecure-blocked", await writeSafeSystemClipboardJson(summary) === false);
check("insecure-no-write", writes === 1);
if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
else Reflect.deleteProperty(globalThis, "navigator");
if (originalSecureContext) Object.defineProperty(globalThis, "isSecureContext", originalSecureContext);
else Reflect.deleteProperty(globalThis, "isSecureContext");

const modalSource = source("components/market-integrity/AssetDetailModal.tsx");
const clipboardSource = source("lib/security/browser-system-clipboard.ts");
check("modal-imports-boundary", modalSource.includes("copyAssetAnalysisSummary"));
check("modal-no-direct-clipboard", !modalSource.includes("navigator.clipboard"));
check("modal-no-full-manifest-event", !modalSource.includes("velmere:pass4545-asset-export-manifest"));
check("modal-redacted-event", modalSource.includes("velmere:pass4545-asset-export-summary"));
check("modal-no-packet-json-copy", !modalSource.includes("writeText(JSON.stringify(packet"));
check("central-single-json-sink", (clipboardSource.match(/navigator\.clipboard\.writeText/gu) ?? []).length === 1);
check("blocked-packet-id-policy", clipboardSource.includes("packetId"));
check("blocked-receipt-id-policy", clipboardSource.includes("latestReceiptId"));
check("blocked-source-time-policy", clipboardSource.includes("sourceTimeLabel"));
check("blocked-source-claims-policy", clipboardSource.includes("sourceClaims"));

const output = {
  status: failures.length
    ? "FAIL_A102R15_ASSET_ANALYSIS_CLIPBOARD_REDACTION_BOUNDARY"
    : "PASS_A102R15_ASSET_ANALYSIS_CLIPBOARD_REDACTION_BOUNDARY_LOCAL_ONLY",
  assertions: passed + failures.length,
  passed,
  failed: failures.length,
  failures,
  truth: {
    fullPacketClipboardAllowed: false,
    receiptOrPacketIdentifiersIncluded: false,
    sourceLabelsOrTimestampsIncluded: false,
    sourceClaimsIncluded: false,
    secureContextRequired: true,
    durableAuthority: false,
    realBrowserMatrixProven: false,
    stagingProven: false,
    liveProven: false,
    saleEnabled: false,
  },
};
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exitCode = 1;
