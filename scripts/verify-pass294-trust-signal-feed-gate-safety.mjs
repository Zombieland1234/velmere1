import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "lib/market-integrity/trust-signal-feed-gate.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "app/globals.css",
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length) {
  throw new Error(`PASS294 missing files: ${missingFiles.join(", ")}`);
}

const moduleSource = readFileSync("lib/market-integrity/trust-signal-feed-gate.ts", "utf8");
const lensSource = readFileSync("components/search/VelmereIntelligenceSearchClient.tsx", "utf8");
const marketSource = readFileSync("components/market-integrity/MarketIntegrityClient.tsx", "utf8");
const mapSource = readFileSync("components/market-integrity/ShieldMapClient.tsx", "utf8");
const cssSource = readFileSync("app/globals.css", "utf8");
const packageSource = readFileSync("package.json", "utf8");

const markers = [
  [moduleSource, "PASS294_TRUST_SIGNAL_FEED_GATE"],
  [moduleSource, "velmere_trust_signal_feed_gate_v1_pass294"],
  [moduleSource, "transparent ranking layer"],
  [moduleSource, "no buy/sell command"],
  [lensSource, "buildTrustSignalFeedGate"],
  [lensSource, "data-pass294-trust-signal-feed=\"vlm-browser\""],
  [lensSource, "data-pass294-result-trust-pulse"],
  [marketSource, "data-pass294-trust-signal-feed=\"shield-terminal\""],
  [mapSource, "data-pass294-trust-signal-feed=\"shield-map\""],
  [cssSource, "PASS294 · Trust Signal Feed"],
  [cssSource, ".shield-pass294-trust-signal-feed"],
  [packageSource, "verify:pass294-trust-signal-feed-gate"],
];

const missingMarkers = markers.filter(([source, marker]) => !source.includes(marker)).map(([, marker]) => marker);
if (missingMarkers.length) {
  throw new Error(`PASS294 missing markers: ${missingMarkers.join(", ")}`);
}

const publicSurface = [lensSource, marketSource, mapSource].join("\n").toLowerCase();
const forbidden = [
  "guaranteed profit",
  "guaranteed safety",
  "buy now before",
  "last chance",
  "risk free",
  "100% safe",
  "this is financial advice",
  "make money fast",
];
const hits = forbidden.filter((phrase) => publicSurface.includes(phrase));
if (hits.length) {
  throw new Error(`PASS294 forbidden public wording: ${hits.join(", ")}`);
}

console.log("PASS294 Trust Signal Feed Gate safety check passed.");
