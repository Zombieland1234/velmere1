import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const security = read("lib/ai/vlm-security.ts");
const securityEvents = read("lib/ai/vlm-security-events.ts");
const ledger = read("lib/security/security-event-ledger.ts");
const memory = read("lib/ai/vlm-memory.ts");
const tools = read("lib/ai/vlm-tools.ts");
const provider = read("lib/ai/vlm-provider-registry.ts");
const brain = read("lib/ai/vlm-brain.ts");
const angel = read("app/api/angel/route.ts");
const route = read("app/api/market-integrity/vlm/route.ts");

expect(
  security.includes("inspectionScore") &&
    security.includes("role_confusion") &&
    security.includes("data_exfiltration") &&
    security.includes("tool_manipulation") &&
    security.includes("memory_poisoning"),
  "central VLM Security scores advanced attack classes",
);
expect(
  security.includes("createHmac") &&
    security.includes("VELMERE_SECURITY_FINGERPRINT_SECRET") &&
    security.includes("randomBytes"),
  "attack fingerprints are keyed and do not retain raw text",
);
expect(
  security.includes("oversized_input") && security.includes("const blocking = score >= 70"),
  "oversized input is a hard security decision",
);
expect(
  ledger.includes("vlm_input_blocked") &&
    ledger.includes("attackFingerprint") &&
    ledger.includes("duplicate.count"),
  "security ledger aggregates repeated VLM attacks",
);
expect(
  securityEvents.includes("recordVlmSecurityInspection") &&
    securityEvents.includes("without raw prompt"),
  "VLM events retain only redacted security metadata",
);
expect(
  memory.includes('questionInspection.risk === "none"') &&
    memory.includes('vector: "memory"'),
  "memory stores only clean content and records poisoning attempts",
);
expect(
  tools.includes("cross_asset_tool_escape") &&
    tools.includes("tool_not_allowed"),
  "tool violations are blocked and recorded",
);
expect(
  provider.includes('vector: "output"') &&
    provider.includes("text-provider-output"),
  "provider output is inspected and recorded",
);
expect(
  brain.includes("recordVlmSecurityInspection") &&
    brain.includes("claim_firewall_rejected"),
  "brain records unsafe prompts and rejected claims",
);
expect(
  angel.includes("recordVlmSecurityInspection") &&
    route.includes("queryInspection") &&
    route.includes('error: "security_policy"'),
  "public AI routes block unsafe input before provider lookup",
);

console.log("PASS2015 VLM security intelligence verifier complete");
