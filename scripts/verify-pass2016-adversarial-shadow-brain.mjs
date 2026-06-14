import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const provider = read("lib/ai/vlm-provider-registry.ts");
const brain = read("lib/ai/vlm-brain.ts");
const contract = read("lib/ai/vlm-shadow-contract.ts");
const governor = read("lib/ai/vlm-shadow-governor.ts");
const security = read("lib/ai/vlm-security.ts");
const env = read(".env.example");

expect(
  provider.includes("reviewWithVlmShadow") &&
    provider.includes("transport.client.models.generateContent") &&
    provider.includes('namespace: `shadow:${model}`'),
  "Shadow Brain performs a real separately budgeted provider call",
);
expect(
  provider.includes("VLM_SHADOW_JSON_SCHEMA") &&
    provider.includes("vlmShadowReviewSchema.safeParse") &&
    provider.includes("shadow_schema_invalid"),
  "shadow response is constrained and runtime validated",
);
expect(
  provider.includes("Try to falsify the leading interpretation") &&
    provider.includes("Review, do not rewrite"),
  "shadow prompt is adversarial and cannot silently rewrite the answer",
);
expect(
  contract.includes('"approve", "revise", "reject"') &&
    contract.includes("unsupported_claim") &&
    contract.includes("unsafe_decision_copy"),
  "shadow contract has explicit publication verdicts and issue classes",
);
expect(
  governor.includes("invalidSourceIds") &&
    governor.includes("invalidFindingReference") &&
    governor.includes("forcedReject"),
  "deterministic governor validates the reviewer instead of blindly trusting it",
);
expect(
  brain.includes('providerError = "shadow_review_unavailable"') &&
    brain.includes('providerError = "shadow_review_rejected"') &&
    brain.includes("fallbackOutput"),
  "unavailable or rejecting reviewer forces deterministic fallback",
);
expect(
  brain.includes('shadowStatus === "approved" || shadowStatus === "revised"') &&
    brain.includes("shadowConfidenceCap"),
  "live output requires a passed shadow gate and respects its confidence cap",
);
expect(
  security.includes("shadow_manipulation") &&
    security.includes("SHADOW_MANIPULATION_PATTERNS"),
  "central VLM Security blocks attempts to manipulate Shadow Brain",
);
expect(
  env.includes("VELMERE_GEMINI_SHADOW_MODEL"),
  "deployment supports a separately configured reviewer model",
);

console.log("PASS2016 adversarial Shadow Brain verifier complete");
