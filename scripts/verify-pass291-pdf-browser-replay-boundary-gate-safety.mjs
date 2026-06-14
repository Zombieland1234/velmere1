import fs from "node:fs";

const modal = fs.readFileSync("components/market-integrity/TokenRiskModal.tsx", "utf8");
const gate = fs.readFileSync("lib/market-integrity/pdf-browser-replay-boundary-gate.ts", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const errors = [];

for (const needle of [
  "buildPdfBrowserReplayBoundaryGate",
  "serializePdfBrowserReplayBoundaryPacket",
  "Ghost Replay Seal",
  "right-edge drawer",
  "download callback",
  "No buy/sell prompt",
  "not a certificate",
  "not a certificate, legal opinion, safety verdict, financial advice or investment recommendation",
]) {
  if (!gate.includes(needle)) errors.push(`pdf-browser-replay-boundary-gate missing marker ${needle}`);
}

for (const needle of [
  "PASS291 guard compatibility",
  "buildPdfBrowserReplayBoundaryGate",
  "serializePdfBrowserReplayBoundaryPacket",
  "pdfBrowserReplayBoundaryGate",
  "downloadPdfBrowserReplayPacket",
  "data-pass291-pdf-browser-replay-boundary-gate",
  "download replay packet",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing PASS291 marker ${needle}`);
}

for (const needle of [
  "PASS291 — PDF/browser replay boundary gate",
  ".shield-pass291-replay-boundary",
  ".shield-pass291-replay-stage-grid",
  "data-pass291-replay-stage=\"operator_only\"",
  "Ghost Replay Seal keeps PDF forge behind right-edge scroll proof",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS291 CSS marker ${needle}`);
}

if (!modal.includes("downloadEvidenceManifest") || !modal.includes("downloadVelmereCybersecurityPdf")) {
  errors.push("PASS291 must keep previous runtime download callbacks defined");
}

if (!pkg.scripts?.["verify:pass291-pdf-browser-replay-boundary-gate"]?.includes("verify-pass291-pdf-browser-replay-boundary-gate-safety.mjs")) {
  errors.push("package.json missing verify:pass291-pdf-browser-replay-boundary-gate script");
}

if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass291-pdf-browser-replay-boundary-gate")) {
  errors.push("verify:shield-all missing PASS291 guard");
}

const forbidden = [
  "guaranteed profit",
  "buy signal",
  "sell signal",
  "risk-free",
  "scam confirmed",
  "fraud proven",
  "guaranteed safe",
];
const corpus = `${gate}\n${modal}`.toLowerCase();
for (const phrase of forbidden) {
  if (corpus.includes(phrase)) errors.push(`forbidden overclaim/dark-pattern phrase present: ${phrase}`);
}

if (errors.length) {
  console.error("PASS291 PDF/browser replay boundary gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS291 PDF/browser replay boundary gate safety passed.");
