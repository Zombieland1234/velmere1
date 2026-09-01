import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { issuePass4822LensSourceToken, verifyPass4822LensSourceToken } from "../../lib/search/lens-source-token.js";
import { normalizeClientSearchResult } from "../../lib/search/lens-client-normalizers.js";
import type { VelmereSearchResult } from "../../lib/search/intelligence-search-contract.js";

const env = {
  NODE_ENV: "production",
  VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT: "0123456789abcdef0123456789abcdef0123456789abcdef",
  VELMERE_LENS_SOURCE_TOKEN_KEY_ID: "methodology-test",
};
const result: VelmereSearchResult = {
  id: "btc",
  title: "Bitcoin",
  symbol: "BTC",
  category: "token",
  tone: "review",
  summary: "Source-bound test result.",
  whyItMatters: "Transport must preserve the exact signed result.",
  missingData: [],
  nextOperatorStep: "Review disclosed evidence.",
  sourceMode: "live",
  sourceConfidence: 80,
  shieldHref: "/en/market-integrity",
  sources: [{ id: "provider-a", label: "Provider A", mode: "live", freshness: "fresh", confidence: 80, note: "test" }],
  chips: ["source-bound"],
};

const issued = issuePass4822LensSourceToken({ result, locale: "en", env, nowMs: Date.UTC(2026, 7, 11, 12, 0, 0) });
assert.equal(issued.ok, true, "source-result token must issue with a valid signing key");
if (!issued.ok) throw new Error(issued.error);
const verified = verifyPass4822LensSourceToken({ token: issued.token, expectedLocale: "en", env, nowMs: Date.UTC(2026, 7, 11, 12, 1, 0) });
assert.equal(verified.ok, true, "issued source-result token must verify");
if (!verified.ok) throw new Error(verified.error);
assert.equal(verified.result.id, result.id);
assert.equal(verified.result.symbol, result.symbol);
assert.equal("lensSourceToken" in verified.result, false, "opaque token must not become report content");

const normalized = normalizeClientSearchResult({ ...result, lensSourceToken: issued.token, lensSourceTokenExpiresAt: issued.expiresAt });
assert.ok(normalized?.lensSourceToken, "client normalizer must retain server-signed source token");

const client = fs.readFileSync(path.join(process.cwd(), "components/search/VelmereIntelligenceSearchClient.tsx"), "utf8");
assert.equal(client.includes("const canonicalReportRequest = result.lensSourceToken"), true, "Lens client ignores the signed source result token");
assert.equal(client.includes("? { sourceToken: result.lensSourceToken }"), true, "Lens production preview does not send sourceToken transport");
assert.equal(client.includes("body: JSON.stringify(canonicalReportRequest)"), true, "Lens request still sends raw result unconditionally");

const route = fs.readFileSync(path.join(process.cwd(), "lib/server/search-route-modules/lens-report.ts"), "utf8");
assert.equal(route.includes("isPass4822LensSourceTokenRequest(rawPayload)"), true, "Lens server lacks signed source-token intake");
assert.equal(route.includes("unsignedFixtureMode && isCanonicalLensRequest(rawPayload)"), true, "unsigned raw result must stay explicit non-production fixture only");
assert.equal(route.includes('error: "signed_search_result_required"'), true, "production raw result is not fail-closed");

console.log("A102 Lens signed source-result transport regression: PASS");
