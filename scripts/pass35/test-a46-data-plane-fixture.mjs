#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const root = process.cwd();
let mode = "valid";
const marketRow = {
  id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 50000, marketCap: 1000000000,
  observedAt: new Date().toISOString(), result: { score: 20, confidence: 80, dataSources: ["CoinGecko"] },
};
const browserResult = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", type: "crypto", sources: [], snapshot: { price: 50000 } };
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const json = (status, payload) => { response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); response.end(JSON.stringify(payload)); };
  if (url.pathname === "/api/market-integrity/markets") {
    if (mode === "invalid") return json(200, { mode: "live", source: "fixture demo placeholder", rows: [] });
    return json(200, { mode: "live", source: "CoinGecko signed live delivery", generatedAt: new Date().toISOString(), rows: Array.from({ length: 12 }, (_, index) => ({ ...marketRow, id: index === 0 ? "bitcoin" : `asset-${index}`, symbol: index === 0 ? "BTC" : `A${index}`, name: index === 0 ? "Bitcoin" : `Asset ${index}` })) });
  }
  if (url.pathname === "/api/market-integrity/search") return json(200, { mode: "live", suggestions: [marketRow] });
  if (url.pathname === "/api/market-integrity/klines") return json(200, { mode: "live", source: "Binance signed OHLC", generatedAt: new Date().toISOString(), candles: [{ timestamp: 1, open: 1, high: 2, low: 0.5, close: 1.5 }, { timestamp: 2, open: 1.5, high: 2.2, low: 1.2, close: 2 }] });
  if (url.pathname === "/api/market-integrity/investigator") return json(200, { mode: "live", investigator: { lanes: [{ id: "market", score: 10, status: "watch", nextStep: "verify" }] }, engine: { state: "ready" }, result: { symbol: "BTC", name: "Bitcoin", dataQuality: "live", metrics: {} }, generatedAt: new Date().toISOString() });
  if (url.pathname === "/api/search") return json(200, { ok: true, results: [browserResult] });
  if (url.pathname === "/api/search/lens-report" && url.searchParams.get("format") === "json") return json(200, { ok: true, report: { id: "report-1", title: "Bitcoin", sections: [] }, renderToken: "token-1" });
  if (url.pathname === "/api/search/lens-report") { response.writeHead(200, { "content-type": "application/pdf" }); response.end(Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(1200, 32)])); return; }
  if (url.pathname === "/api/market-integrity/market-intelligence") {
    let body = ""; for await (const chunk of request) body += chunk;
    const input = JSON.parse(body || "{}");
    if (input.depth === "pro") return json(403, { ok: false, error: "entitlement_required", assetKey: input.assetKey });
    return json(200, { ok: true, assetKey: input.assetKey, requestedAssetKey: input.assetKey, depth: "basic", surface: "shield", marketImpact: { state: "available" }, missingEvidence: [] });
  }
  json(404, { error: "not_found" });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;
function run() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/a46-data-plane-acceptance.mjs"], { cwd: root, env: { ...process.env, VELMERE_A46_BASE_URL: baseUrl }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status, signal) => resolve({ status, signal, stdout, stderr }));
  });
}
try {
  const valid = await run();
  assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);
  const validReport = JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass35/a46/PASS35_A46_DATA_PLANE_ACCEPTANCE.json"), "utf8"));
  assert.equal(validReport.summary.checks, 9);
  assert.equal(validReport.summary.failed, 0);
  mode = "invalid";
  const invalid = await run();
  assert.notEqual(invalid.status, 0, "invalid market fixture must fail closed");
  const invalidReport = JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass35/a46/PASS35_A46_DATA_PLANE_ACCEPTANCE.json"), "utf8"));
  assert(invalidReport.rows.some((row) => row.id === "markets" && row.ok === false));
  mode = "valid";
  const finalValid = await run();
  assert.equal(finalValid.status, 0, `${finalValid.stdout}\n${finalValid.stderr}`);
  console.log(JSON.stringify({ checks: 7, passed: 7, failed: 0 }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
