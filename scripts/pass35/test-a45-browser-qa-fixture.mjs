#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildA45DeterministicQaFixture,
  createA45QaFixtureUsage,
  generateA45QaFixture,
  installA45QaFixtureRoutes,
  loadA45QaFixture,
} from "./a45-browser-qa-fixture.mjs";
import { verifyA60BrowserFixtureEvidenceDenominatorMigration } from "../pass36/verify-a102r41-a60-browser-fixture-evidence-denominator-migration.mjs";

const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const expectReject = (id, action, marker) => {
  try {
    action();
    check(id, false, "did_not_reject");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(id, message.includes(marker), message);
  }
};

const rootA = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a45-fixture-a-"));
const rootB = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a45-fixture-b-"));
const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a45-fixture-outside-"));
try {
  const relativePath = "artifacts/pass35/a45/A45_DETERMINISTIC_LOCAL_REFERENCE_QA_FIXTURE.json";
  const generatedA = generateA45QaFixture(rootA, relativePath);
  const generatedB = generateA45QaFixture(rootB, relativePath);
  const bytesA = fs.readFileSync(generatedA.absolutePath);
  const bytesB = fs.readFileSync(generatedB.absolutePath);
  check("generator-created", generatedA.created === true && fs.existsSync(generatedA.absolutePath), generatedA);
  check("generator-path-inside-artifacts", generatedA.relativePath === relativePath, generatedA.relativePath);
  check("generator-digest-bound", /^[a-f0-9]{64}$/u.test(generatedA.sha256) && generatedA.byteLength === bytesA.length, generatedA);
  check("generator-byte-identical-2-of-2", bytesA.equals(bytesB) && generatedA.sha256 === generatedB.sha256, { first: generatedA.sha256, second: generatedB.sha256 });

  const loaded = loadA45QaFixture(rootA, relativePath);
  check("fixture-loaded", Boolean(loaded), loaded?.relativePath);
  check("fixture-relative-path", loaded?.relativePath === relativePath, loaded?.relativePath);
  check("fixture-load-digest", loaded?.sha256 === generatedA.sha256, { loaded: loaded?.sha256, generated: generatedA.sha256 });
  const usage = createA45QaFixtureUsage(loaded, generatedA);
  check("usage-no-live-sale-credit", usage.liveProven === false && usage.saleEnabled === false, usage);
  check("usage-no-provider-storage-data-credit", usage.providerCredit === false && usage.durableStorageCredit === false && usage.realDataCredit === false, usage);

  const handlers = [];
  const context = { async route(pattern, handler) { handlers.push({ pattern, handler }); } };
  await installA45QaFixtureRoutes(context, loaded, usage);
  const handlerMap = new Map(handlers.map((row) => [row.pattern, row.handler]));
  check("handler-denominator-10", handlers.length === 10 && handlerMap.size === 10, handlers.map((row) => row.pattern));
  check("handler-markets-retained", handlerMap.has("**/api/market-integrity/markets?*"));
  check("handler-klines-retained", handlerMap.has("**/api/market-integrity/klines?*"));
  check("handler-market-intelligence-retained", handlerMap.has("**/api/market-integrity/market-intelligence"));
  check("handler-auth-session-added", handlerMap.has("**/api/auth/session"));
  check("handler-profile-added", handlerMap.has("**/api/profile"));
  check("handler-real-markets-catalog-added", handlerMap.has("**/api/market-integrity/real-markets/catalog"));
  check("handler-real-markets-added", handlerMap.has("**/api/market-integrity/real-markets?*"));
  check("handler-asset-logo-added", handlerMap.has("**/api/market-integrity/asset-logo?*"));
  check("handler-brand-icon-added", handlerMap.has("**/api/market-integrity/brand-icon?*"));
  check("handler-icon-added", handlerMap.has("**/api/market-integrity/icon?*"));

  async function execute(pattern, url, method = "GET", postData = null) {
    const calls = { continued: 0, fulfilled: [] };
    const handler = handlerMap.get(pattern);
    if (!handler) return { ...calls, handlerMissing: true };
    const route = {
      request() { return { method: () => method, url: () => url, postData: () => postData }; },
      async continue() { calls.continued += 1; },
      async fulfill(value) { calls.fulfilled.push(value); },
    };
    await handler(route);
    return calls;
  }
  const requestFamilyCases = [
    { id: "authSession", pattern: "**/api/auth/session", url: "http://127.0.0.1:4176/api/auth/session", method: "GET" },
    { id: "profile", pattern: "**/api/profile", url: "http://127.0.0.1:4176/api/profile", method: "GET" },
    { id: "markets", pattern: "**/api/market-integrity/markets?*", url: "http://127.0.0.1:4176/api/market-integrity/markets?page=1", method: "GET" },
    { id: "klines", pattern: "**/api/market-integrity/klines?*", url: "http://127.0.0.1:4176/api/market-integrity/klines?range=7d", method: "GET" },
    { id: "marketIntelligence", pattern: "**/api/market-integrity/market-intelligence", url: "http://127.0.0.1:4176/api/market-integrity/market-intelligence", method: "POST", postData: JSON.stringify({ assetKey: "BTC", depth: "basic", surface: "shield" }) },
    { id: "realMarketsCatalog", pattern: "**/api/market-integrity/real-markets/catalog", url: "http://127.0.0.1:4176/api/market-integrity/real-markets/catalog", method: "GET" },
    { id: "realMarkets", pattern: "**/api/market-integrity/real-markets?*", url: "http://127.0.0.1:4176/api/market-integrity/real-markets?symbols=AAPL&range=1h", method: "GET" },
    { id: "assetLogo", pattern: "**/api/market-integrity/asset-logo?*", url: "http://127.0.0.1:4176/api/market-integrity/asset-logo?symbol=BTC", method: "GET" },
    { id: "brandIcon", pattern: "**/api/market-integrity/brand-icon?*", url: "http://127.0.0.1:4176/api/market-integrity/brand-icon?symbol=BTC", method: "GET" },
    { id: "icon", pattern: "**/api/market-integrity/icon?*", url: "http://127.0.0.1:4176/api/market-integrity/icon?symbol=BTC", method: "GET" },
  ];
  const requestFamilyRows = [];
  for (const familyCase of requestFamilyCases) {
    for (const key of Object.keys(usage.requests)) usage.requests[key] = 0;
    const calls = await execute(familyCase.pattern, familyCase.url, familyCase.method, familyCase.postData ?? null);
    const incremented = Object.entries(usage.requests).filter(([, count]) => count !== 0);
    requestFamilyRows.push({
      id: familyCase.id,
      passed: calls.handlerMissing !== true && calls.continued === 0 && calls.fulfilled.length === 1
        && incremented.length === 1 && incremented[0][0] === familyCase.id && incremented[0][1] === 1,
      incremented,
      handlerMissing: calls.handlerMissing === true,
    });
  }
  const requestFamilyIds = requestFamilyRows.map((row) => row.id);
  check("handler-request-family-ground-truth-10", requestFamilyRows.length === 10 && new Set(requestFamilyIds).size === 10
    && requestFamilyIds.join("\n") === Object.keys(usage.requests).join("\n")
    && requestFamilyRows.every((row) => row.passed), requestFamilyRows);
  const authCall = await execute("**/api/auth/session", "http://127.0.0.1:4176/api/auth/session");
  const authPayload = JSON.parse(authCall.fulfilled[0]?.body ?? "null");
  check("auth-response-anonymous-no-credit", authCall.fulfilled[0]?.status === 200 && authPayload.authenticated === false && authPayload.session === null, authPayload);
  const catalogCall = await execute("**/api/market-integrity/real-markets/catalog", "http://127.0.0.1:4176/api/market-integrity/real-markets/catalog");
  const catalogPayload = JSON.parse(catalogCall.fulfilled[0]?.body ?? "null");
  check("catalog-response-reference-no-rights-credit", catalogCall.fulfilled[0]?.status === 200 && catalogPayload.ok === true && catalogPayload.liveDataIncluded === false && catalogPayload.commercialRightsVerified === false, catalogPayload);
  const quoteCall = await execute("**/api/market-integrity/real-markets?*", "http://127.0.0.1:4176/api/market-integrity/real-markets?symbols=AAPL,SPY&range=1h");
  const quotePayload = JSON.parse(quoteCall.fulfilled[0]?.body ?? "null");
  check("quote-response-unavailable-no-invented-candles", quoteCall.fulfilled[0]?.status === 200 && quotePayload.quotes?.length === 2 && quotePayload.quotes.every((row) => row.state === "unavailable" && row.sourceTimestamp === null && row.currentPrice === null && row.candles.length === 0), quotePayload);

  expectReject("outside-path-rejected", () => loadA45QaFixture(rootA, path.join(rootA, "..", "outside.json")), "path_must_be_inside_artifacts");
  const unsafePath = path.join(rootA, "artifacts", "unsafe.json");
  fs.writeFileSync(unsafePath, `${JSON.stringify({ ...buildA45DeterministicQaFixture(), liveProven: true })}\n`, "utf8");
  expectReject("live-claim-rejected", () => loadA45QaFixture(rootA, "artifacts/unsafe.json"), "truth_boundary_invalid");
  expectReject("generator-no-clobber", () => generateA45QaFixture(rootA, relativePath), "EEXIST");

  const outsideFixturePath = path.join(outsideRoot, "fixture.json");
  fs.writeFileSync(outsideFixturePath, bytesA);
  const junctionPath = path.join(rootA, "artifacts", "fixture-junction");
  fs.symlinkSync(outsideRoot, junctionPath, process.platform === "win32" ? "junction" : "dir");
  const outsideBefore = fs.readdirSync(outsideRoot).sort().join("\n");
  let loadRejected = false;
  let generationRejected = false;
  try { loadA45QaFixture(rootA, "artifacts/fixture-junction/fixture.json"); } catch (error) { loadRejected = String(error).includes("reparse_component_forbidden"); }
  try { generateA45QaFixture(rootA, "artifacts/fixture-junction/generated.json"); } catch (error) { generationRejected = String(error).includes("reparse_component_forbidden"); }
  check("reparse-component-rejected", loadRejected && generationRejected && fs.readdirSync(outsideRoot).sort().join("\n") === outsideBefore && !fs.existsSync(path.join(outsideRoot, "generated.json")), { loadRejected, generationRejected });
} finally {
  fs.rmSync(rootA, { recursive: true, force: true });
  fs.rmSync(rootB, { recursive: true, force: true });
  fs.rmSync(outsideRoot, { recursive: true, force: true });
}

const denominatorMigration = verifyA60BrowserFixtureEvidenceDenominatorMigration(process.cwd());
check("denominator-migration", denominatorMigration.checks === 38 && denominatorMigration.passed === 38 && denominatorMigration.failed === 0 && denominatorMigration.verifierDenominatorBefore === 520 && denominatorMigration.verifierDenominatorAfter === 584, denominatorMigration);

const failures = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a102r41.a45-browser-qa-fixture-test.v1",
  status: failures.length === 0 ? "PASS_A102R41_A45_DETERMINISTIC_QA_FIXTURE_NO_LIVE_PROVIDER_OR_SALE_CREDIT" : "FAIL_A102R41_A45_DETERMINISTIC_QA_FIXTURE",
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  failures,
  live: false,
  saleEnabled: false,
  providerCredit: false,
  durableStorageCredit: false,
  realDataCredit: false,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
