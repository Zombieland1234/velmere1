import assert from "node:assert/strict";
import fs from "node:fs";

function source(file: string) {
  return fs.readFileSync(file, "utf8");
}

const brain = source(fs.existsSync("app/api/market-integrity/brain/route.ts") ? "app/api/market-integrity/brain/route.ts" : "lib/server/market-integrity-route-modules/brain.ts");
const brainEntitlement = brain.indexOf("await resolveAccess(");
const brainProvider = brain.indexOf("await resolveMarketResult(query)");
assert.ok(brainEntitlement >= 0 || brain.includes("resolveVlmPaidSurfaceAccess"), "legacy Brain must retain a server-side tier gate");
assert.ok(
  brainEntitlement >= 0 && brainProvider >= 0 ? brainEntitlement < brainProvider : true,
  "unpaid Pro/Advanced Brain requests must be denied before provider work",
);
assert.ok(
  brain.includes('withExpensiveRouteBudget(request, "legacy_brain_get"'),
  "legacy Brain provider work must have a concurrency budget",
);

const assistant = source(fs.existsSync("app/api/market-integrity/assistant/route.ts") ? "app/api/market-integrity/assistant/route.ts" : "lib/server/market-integrity-route-modules/assistant.ts");
const assistantPublication = assistant.indexOf('publication.evidenceState !== "verified"');
const assistantProjection = assistant.indexOf("buildAiRiskBotBrief(result, history)");
assert.ok(assistant.includes("rejectOversizedUrl(request, 2_048)"));
assert.ok(assistant.includes("await applyApiRateLimit(request"));
assert.ok(assistant.includes("inspectVlmText(searchParams.get(\"query\"), 180)"));
assert.ok(
  assistant.includes('withExpensiveRouteBudget(request, "legacy_assistant_get"'),
  "legacy Assistant provider work must have a concurrency budget",
);
assert.ok(assistantPublication >= 0);
assert.ok(
  assistantPublication < assistantProjection,
  "unverified provider data must be withheld before assistant/report projections",
);
assert.ok(assistant.includes("assistant: null"));
assert.ok(assistant.includes("evidenceReport: null"));

const probe = source(fs.existsSync("app/api/market-integrity/probe/route.ts") ? "app/api/market-integrity/probe/route.ts" : "lib/server/market-integrity-route-modules/probe.ts");
assert.ok(
  probe.includes('withExpensiveRouteBudget(request, "market_probe_get"'),
  "market probe provider fan-out must have a dedicated concurrency budget",
);

const tier180 = source(fs.existsSync("app/api/market-integrity/tier-180-output-matrix/route.ts") ? "app/api/market-integrity/tier-180-output-matrix/route.ts" : "lib/server/market-integrity-route-modules/tier-180-output-matrix.ts");
assert.ok(
  tier180.includes('withExpensiveRouteBudget(request, "tier_180_output_matrix_get"'),
  "tier-180 provider fan-out must have a dedicated concurrency budget",
);

console.log("PASS legacy Brain/Assistant cost, entitlement and publication boundaries");
