import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const handoff = read("lib/market-integrity/pass468-browser-shield-orbit-handoff.ts");
const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/MarketIntegrityClient.tsx");
const orbit = read("components/market-integrity/ShieldMapClient.tsx");
const e2e = read("scripts/e2e-pass468-browser-shield-orbit.mjs");

function requireMarkers(source, markers, label) {
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length) throw new Error(`${label} missing: ${missing.join(", ")}`);
}

requireMarkers(
  handoff,
  [
    'version: "pass468-browser-shield-orbit-handoff-v1"',
    "trustedForDisplayOnly: true",
    "requiresFreshTargetScan: true",
    "window.sessionStorage.setItem",
    "packetChecksum(base)",
    "Date.now() > expiresAt",
    'handoff: "pass468"',
  ],
  "PASS468 handoff contract",
);

requireMarkers(
  browser,
  [
    'data-pass468-browser-shield-orbit-handoff="true"',
    "buildPass468HandoffPacket",
    "writePass468HandoffPacket",
    "window.location.assign",
    'data-testid="lens-shield-handoff"',
    'data-testid="lens-orbit-handoff"',
    'data-testid="lens-preview-shield-handoff"',
    'data-testid="lens-preview-orbit-handoff"',
    'data-testid={`lens-depth-${depth}`}',
    'data-testid="lens-preview-close"',
    "result: VelmereSearchResult",
  ],
  "Browser flow",
);

requireMarkers(
  shield,
  [
    "readPass468HandoffPacket",
    'handoffVersion === "pass468"',
    'data-pass468-shield-handoff="true"',
    'data-pass468-evidence-context="display-only"',
    "void scanToken(cleanRouteScan)",
  ],
  "Shield target",
);

requireMarkers(
  orbit,
  [
    "readPass468HandoffPacket",
    'handoffVersion !== "pass453" && handoffVersion !== "pass468"',
    'data-pass468-orbit-handoff="true"',
    'data-pass468-orbit-evidence-context="display-only"',
    "void runInvestigatorScan(null, requested)",
  ],
  "Orbit target",
);

requireMarkers(
  e2e,
  [
    "lens-depth-pro",
    "lens-preview-dialog",
    "lens-download-link",
    "lens-orbit-handoff",
    "requiresFreshTargetScan",
    "trustedForDisplayOnly",
  ],
  "PASS468 E2E",
);

for (const [file, source] of [
  ["pass468 handoff", handoff],
  ["Browser client", browser],
  ["Shield client", shield],
  ["Orbit client", orbit],
]) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
    fileName: file.endsWith("client") ? `${file}.tsx` : `${file}.ts`,
  });
  const errors = (result.diagnostics || []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length) {
    throw new Error(
      `${file} transpile errors: ${errors
        .map((error) => ts.flattenDiagnosticMessageText(error.messageText, " "))
        .join(" | ")}`,
    );
  }
}

const resultIndex = browser.indexOf('data-pass467-result-first-layout="true"');
const capsuleIndex = browser.indexOf("data-pass467-pdf-capsule-after-result");
if (resultIndex < 0 || capsuleIndex < 0 || resultIndex > capsuleIndex) {
  throw new Error("PASS468 regression: result no longer precedes PDF capsule");
}

if (/setResult\([^)]*handoffPacket/.test(shield) || /setInvestigatorResult\([^)]*handoffPacket/.test(orbit)) {
  throw new Error("PASS468 trust violation: display-only packet is injected as target analysis");
}

console.log("PASS468 Browser → PDF → Shield/Orbit handoff verified");

const transpiledHandoff = ts.transpileModule(handoff, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledHandoff).toString("base64")}`
);
const store = new Map();
globalThis.window = {
  sessionStorage: {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) ?? null;
    },
    removeItem(key) {
      store.delete(String(key));
    },
  },
};
const fixture = {
  id: "bitcoin",
  title: "Bitcoin",
  symbol: "BTC",
  category: "token",
  tone: "review",
  summary: "fixture",
  whyItMatters: "fixture",
  missingData: ["second venue"],
  nextOperatorStep: "fresh scan",
  sourceMode: "live_table",
  sourceConfidence: 74,
  shieldHref: "/market-integrity",
  sources: [
    {
      id: "fixture",
      label: "Provider fixture",
      mode: "table",
      freshness: "test",
      confidence: 74,
      note: "fixture",
    },
  ],
  chips: ["fixture"],
  marketSnapshot: {
    assetClass: "crypto",
    currency: "USD",
    price: 70000,
    marketCap: 1380000000000,
    volume24h: 32000000000,
    change24h: 1.4,
    venueComparisonState: "aligned",
  },
};
const packet = runtime.buildPass468HandoffPacket(fixture, "pro", "orbit");
if (!runtime.writePass468HandoffPacket(packet)) {
  throw new Error("PASS468 runtime failed to persist packet");
}
const restored = runtime.readPass468HandoffPacket(packet.payloadId);
if (
  restored?.query !== "BTC" ||
  restored.depth !== "pro" ||
  restored.target !== "orbit" ||
  restored.requiresFreshTargetScan !== true ||
  restored.trustedForDisplayOnly !== true
) {
  throw new Error("PASS468 runtime packet round-trip failed");
}
const href = runtime.buildPass468HandoffHref("pl", packet);
if (
  !href.startsWith("/pl/market-integrity/shield-map?") ||
  !href.includes("handoff=pass468") ||
  !href.includes(`packet=${packet.payloadId}`)
) {
  throw new Error("PASS468 runtime Orbit href failed");
}
const storageKey = `velmere:pass468:handoff:${packet.payloadId}`;
const tampered = JSON.parse(store.get(storageKey));
tampered.query = "ETH";
store.set(storageKey, JSON.stringify(tampered));
if (runtime.readPass468HandoffPacket(packet.payloadId) !== null) {
  throw new Error("PASS468 checksum did not reject a tampered packet");
}
const expired = runtime.buildPass468HandoffPacket(
  fixture,
  "advanced",
  "shield",
  new Date(Date.now() - 31 * 60 * 1000),
);
runtime.writePass468HandoffPacket(expired);
if (runtime.readPass468HandoffPacket(expired.payloadId) !== null) {
  throw new Error("PASS468 expired packet was accepted");
}
delete globalThis.window;

console.log("PASS468 handoff runtime semantics ok");
