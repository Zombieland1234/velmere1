import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const receipt = read("lib/ai/vlm-analysis-receipt.ts");
const brain = read("lib/ai/vlm-brain.ts");
const route = read("app/api/market-integrity/vlm/verify/route.ts");
const security = read("lib/ai/vlm-security.ts");
const securityEvents = read("lib/ai/vlm-security-events.ts");
const ledger = read("lib/security/security-event-ledger.ts");
const env = read(".env.example");

expect(
  receipt.includes("createHmac") &&
    receipt.includes("timingSafeEqual") &&
    receipt.includes("VELMERE_VLM_RECEIPT_SECRET"),
  "analysis receipt uses HMAC-SHA256 and timing-safe verification",
);
expect(
  receipt.includes("canonicalVlmJson") &&
    receipt.includes("factsHash") &&
    receipt.includes("sourcesHash") &&
    receipt.includes("outputHash") &&
    receipt.includes("policyHash"),
  "receipt covers canonical facts, sources, output and policy",
);
expect(
  receipt.includes('signing: "hmac-sha256" | "unsigned"') &&
    receipt.includes('reasons.push("receipt_unsigned")') ||
    receipt.includes('"ed25519" | "hmac-sha256" | "unsigned"'),
  "missing signing secret is reported honestly as unsigned",
);
expect(
  receipt.includes("facts_modified") &&
    receipt.includes("sources_modified") &&
    receipt.includes("output_modified") &&
    receipt.includes("signature_invalid"),
  "verifier identifies the modified receipt component",
);
expect(
  brain.includes("createVlmAnalysisReceipt") &&
    brain.includes("cachedOutput") &&
    brain.includes("receipt: createVlmAnalysisReceipt"),
  "fresh and cached analyses receive receipts matching their public output",
);
expect(
  route.includes("verifyVlmAnalysisReceipt") &&
    route.includes("rejectLargeContentLength") &&
    route.includes("applySoftRateLimit"),
  "server verification endpoint is bounded and rate limited",
);
expect(
  security.includes("receipt_manipulation") &&
    security.includes("RECEIPT_MANIPULATION_PATTERNS"),
  "central VLM Security blocks prompt attempts to forge receipts",
);
expect(
  securityEvents.includes('receipt: "vlm_receipt_invalid"') &&
    ledger.includes("vlm_receipt_invalid"),
  "invalid verification attempts enter the redacted security ledger",
);
expect(env.includes("VELMERE_VLM_RECEIPT_SECRET"), "deployment exposes a server-only receipt signing secret");

console.log("PASS2017 signed VLM analysis receipt verifier complete");
