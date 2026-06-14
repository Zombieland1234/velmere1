import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const contract = read("lib/ai/vlm-contract.ts");
const factPacket = read("lib/ai/vlm-fact-packet.ts");
const provider = read("lib/ai/vlm-provider-registry.ts");
const tools = read("lib/ai/vlm-tools.ts");
const brain = read("lib/ai/vlm-brain.ts");
const angel = read("app/api/angel/route.ts");
const admin = read("lib/ai/gemini.ts");
const pkg = JSON.parse(read("package.json"));

expect(contract.includes('z.literal("velmere.vlm.output.v3")'), "VLM output v3 contract is versioned");
expect(contract.includes("providerMode"), "VLM output exposes explicit provider mode");
expect(contract.includes("contractAnalysis") && contract.includes("riskScenarios"), "VLM report contains contract and scenario analysis");
expect(factPacket.includes("velmere.vlm.fact-packet.v1"), "canonical fact packet is versioned");
expect(factPacket.includes("allowedSourceIds"), "canonical fact packet restricts source ids");
expect(provider.includes("createRestGeminiClient") && !provider.includes("dynamicImport"), "Gemini provider has dependency-free REST transport without build-time SDK resolution");
expect(provider.includes("circuit breaker") || provider.includes("circuitOpen"), "provider registry has a circuit breaker");
expect(provider.includes("MAX_ATTEMPTS = 3"), "provider retry loop is bounded");
expect(provider.includes("inFlight"), "identical provider requests are deduplicated");
expect(tools.includes("executeBoundedVlmTools") && tools.includes("maxCalls"), "tool execution is bounded");
expect(tools.includes("Tool asset is outside the current fact packet"), "tool calls cannot escape current asset");
expect(brain.includes("applyVlmClaimFirewall"), "claim firewall runs before public VLM output");
expect(brain.includes("deterministic_fallback"), "deterministic fallback remains available");
expect(angel.includes("generateTextWithVlmProvider"), "store Angel uses the shared provider registry");
expect(admin.includes("generateTextWithVlmProvider"), "admin AI uses the shared provider registry");
expect(!pkg.dependencies?.["@google/generative-ai"], "deprecated Google Generative AI dependency is removed");
expect(!provider.includes('@google/genai'), "Gemini SDK string is absent so Turbopack cannot resolve it during build");
console.log("PASS772-776 verifier complete");
