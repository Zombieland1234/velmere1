import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const serverPath = path.join(root, "lib/server/market-integrity-route-modules/market-intelligence.ts");
const clientPath = path.join(root, "components/market-integrity/AssetIntelligenceTabs.tsx");
const server = fs.readFileSync(serverPath, "utf8");
const client = fs.readFileSync(clientPath, "utf8");

const preflightStart = server.indexOf("export function evaluateMarketIntelligencePublicationPreflight");
const handlerPreflight = server.indexOf("const publicationPreflight = evaluateMarketIntelligencePublicationPreflight();");
const computeImpact = server.indexOf("const marketImpact = buildMarketImpactAnalysis(");
assert.ok(preflightStart >= 0, "publication preflight must exist");
assert.ok(handlerPreflight > preflightStart, "active handler must invoke publication preflight");
assert.ok(computeImpact > handlerPreflight, "publication authority must be checked before Market Impact computation/output");

const preflightBody = server.slice(preflightStart, server.indexOf("type MarketIntelligencePayload", preflightStart));
assert.match(preflightBody, /authorized:\s*false/);
assert.match(preflightBody, /mode:\s*"withheld"/);
assert.match(preflightBody, /evidenceState:\s*"withheld"/);
assert.match(preflightBody, /scorePublished:\s*false/);
assert.match(preflightBody, /pass4993_signed_field_projection_not_attached/);
assert.match(preflightBody, /provider_rights_runtime_authority_not_verified/);

const withheldReturnStart = server.indexOf("return securityJson({", handlerPreflight);
const withheldReturnEnd = server.indexOf("status: 424", withheldReturnStart);
assert.ok(withheldReturnStart >= 0 && withheldReturnEnd > withheldReturnStart);
const withheldReturn = server.slice(withheldReturnStart, withheldReturnEnd + 120);
assert.match(withheldReturn, /market_intelligence_publication_not_ready/);
assert.match(withheldReturn, /liveClaimed:\s*false/);
assert.match(withheldReturn, /score:\s*null/);
assert.doesNotMatch(withheldReturn, /\n\s*marketImpact\s*:/, "withheld response must not publish Market Impact payload");
assert.doesNotMatch(withheldReturn, /\n\s*whaleWatch\s*:/, "withheld response must not publish Whale Watch payload");

// Current active customer surface is Basic-only and rejects anything without verified publication authority.
assert.match(client, /const depth = "basic" as const/);
assert.match(client, /value\.publication\?\.mode !== "live"/);
assert.match(client, /value\.publication\.evidenceState !== "verified"/);
assert.match(client, /value\.publication\.liveClaimed !== true/);
assert.match(client, /value\.publication\.blockers\?\.length/);
assert.match(client, /requestedModule === "market-impact"\s*\? !value\.marketImpact/);
assert.match(client, /!value\.whaleWatch \|\| value\.whaleWatch\.withheld === true \|\| value\.whaleWatch\.available === false/);

console.log("A102 Market Impact / Whale Watch current customer output: WITHHELD PASS");
