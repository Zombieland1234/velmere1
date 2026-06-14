import { readFileSync } from "node:fs";

const checks = [];
function mustInclude(file, needle) {
  const body = readFileSync(file, "utf8");
  if (!body.includes(needle)) {
    throw new Error(`${file} is missing ${needle}`);
  }
  checks.push(`${file} -> ${needle}`);
}

function mustNotInclude(file, forbidden) {
  const body = readFileSync(file, "utf8").toLowerCase();
  for (const item of forbidden) {
    if (body.includes(item.toLowerCase())) {
      throw new Error(`${file} contains forbidden wording: ${item}`);
    }
  }
  checks.push(`${file} -> forbidden wording clean`);
}

try {
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "buildPrivacyRedactionEnvelopeGate(");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass282-privacy-redaction-envelope-gate");
  mustInclude("components/market-integrity/TokenRiskModal.tsx", "data-pass282-redaction-lane");
  mustInclude("lib/market-integrity/privacy-redaction-envelope-gate.ts", "velmere_privacy_redaction_envelope_gate_v1_pass282");
  mustInclude("lib/market-integrity/privacy-redaction-envelope-gate.ts", "Velvet Redaction Mirror");
  mustInclude("lib/market-integrity/privacy-redaction-envelope-gate.ts", "Private Redaction Seal");
  mustInclude("lib/market-integrity/privacy-redaction-envelope-gate.ts", "do not store raw search terms");
  mustInclude("lib/market-integrity/privacy-redaction-envelope-gate.ts", "no wallet/IP/customer PII");
  mustInclude("app/globals.css", "PASS282 — K05 privacy redaction envelope gate");
  mustInclude("app/globals.css", "shield-pass282-privacy-redaction-envelope");
  mustInclude("lib/launch/master-build-areas.ts", "PASS282 marker: Privacy redaction envelope gate active");
  mustInclude("lib/launch/project-progress.ts", "PASS282 marker: Privacy redaction envelope gate active");
  mustInclude("lib/launch/master-build-progress-delta-pass282.ts", "pass282PrivacyRedactionEnvelopeGateDelta");
  mustInclude("VELMERE_PASS282_PRIVACY_REDACTION_ENVELOPE_GATE_REPORT.md", "PASS282 — Privacy Redaction Envelope Gate");
  mustInclude("package.json", "verify:pass282-privacy-redaction-envelope-gate");
  mustInclude("package.json", "verify:pass281-storage-adapter-contract-gate");
  mustNotInclude("lib/market-integrity/privacy-redaction-envelope-gate.ts", [
    "guaranteed profit",
    "safe token",
    "no risk",
    "financial advice",
    "buy now",
    "sell now",
    "scam token",
    "fraud confirmed",
    "countdown pressure"
  ]);
} catch (error) {
  console.error("PASS282 privacy redaction envelope gate guard failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`PASS282 privacy redaction envelope gate guard passed (${checks.length} checks).`);
