#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a46-customer-data-plane-acceptance.json"), "utf8"));
const baseUrl = String(process.env.VELMERE_A46_BASE_URL ?? contract.baseUrl).replace(/\/$/u, "");
const outputRoot = path.join(root, "artifacts/pass35/a46");
fs.mkdirSync(outputRoot, { recursive: true });
const rows = [];
const timeoutMs = Number(process.env.VELMERE_A46_REQUEST_TIMEOUT_MS ?? contract.budgets.requestTimeoutMs);

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function replaceControlCharacters(value) {
  return Array.from(String(value ?? ""), (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127 ? " " : character;
  }).join("");
}
function cleanText(value, max = 240) { return replaceControlCharacters(value).replace(/[<>]/gu, " ").trim().slice(0, max); }
function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function finite(value) { return typeof value === "number" && Number.isFinite(value); }
function placeholderText(value) { return /\b(mock|demo|synthetic|fixture|placeholder|lorem ipsum)\b/iu.test(String(value ?? "")); }

async function readBounded(response, maximumBytes, kind = "json") {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("response_body_missing");
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel("a46_response_too_large").catch(() => {});
      throw new Error(`response_too_large:${total}>${maximumBytes}`);
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  if (kind === "bytes") return { bytes, total, sha256: sha256(bytes) };
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error("invalid_utf8"); }
  let json;
  try { json = JSON.parse(text); }
  catch (error) { throw new Error(`invalid_json:${error instanceof Error ? error.message : String(error)}`, { cause: error }); }
  return { json, total, sha256: sha256(bytes) };
}

async function requestJson(id, pathname, options = {}) {
  const startedAt = Date.now();
  const url = `${baseUrl}${pathname}`;
  let response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      ...options,
      headers: { accept: "application/json", ...(options.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) throw new Error(`unexpected_content_type:${contentType || "missing"}`);
    const parsed = await readBounded(response, contract.budgets.maximumJsonBytes, "json");
    return { id, url, status: response.status, durationMs: Date.now() - startedAt, contentType, ...parsed };
  } catch (error) {
    return { id, url, status: response?.status ?? null, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
  }
}

async function requestPdf(id, pathname, options = {}) {
  const startedAt = Date.now();
  const url = `${baseUrl}${pathname}`;
  let response;
  try {
    response = await fetch(url, { cache: "no-store", redirect: "manual", ...options, signal: AbortSignal.timeout(timeoutMs) });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/pdf")) throw new Error(`unexpected_content_type:${contentType || "missing"}`);
    const parsed = await readBounded(response, contract.budgets.maximumPdfBytes, "bytes");
    return { id, url, status: response.status, durationMs: Date.now() - startedAt, contentType, ...parsed };
  } catch (error) {
    return { id, url, status: response?.status ?? null, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
  }
}

function add(id, severity, ok, detail) {
  const row = { id, severity, ok: Boolean(ok), detail };
  rows.push(row);
  process.stdout.write(`[a46-data] ${row.ok ? "PASS" : "FAIL"} ${id}${detail?.state ? ` · ${detail.state}` : ""}\n`);
  return row;
}

const marketsResponse = await requestJson("markets", "/api/market-integrity/markets?page=1&perPage=100&tier=basic");
const marketsPayload = marketsResponse.json;
const marketRows = isObject(marketsPayload) && Array.isArray(marketsPayload.rows) ? marketsPayload.rows : [];
const marketIds = marketRows.map((row) => cleanText(row?.id || row?.symbol, 120)).filter(Boolean);
const uniqueMarketIds = new Set(marketIds);
const marketsOk = marketsResponse.status === 200
  && isObject(marketsPayload)
  && ["live", "stale", "partial"].includes(marketsPayload.mode)
  && marketRows.length >= contract.budgets.minimumMarketRows
  && uniqueMarketIds.size === marketRows.length
  && !placeholderText(marketsPayload.source);
add("markets", "hard", marketsOk, {
  status: marketsResponse.status,
  state: isObject(marketsPayload) ? marketsPayload.mode : "invalid",
  rowCount: marketRows.length,
  uniqueRows: uniqueMarketIds.size,
  source: isObject(marketsPayload) ? cleanText(marketsPayload.source) : null,
  generatedAt: isObject(marketsPayload) ? marketsPayload.generatedAt ?? null : null,
  error: marketsResponse.error ?? (isObject(marketsPayload) ? marketsPayload.error ?? null : "payload_not_object"),
  bytes: marketsResponse.total ?? null,
});

const selected = marketRows.find((row) => String(row?.symbol ?? "").toUpperCase() === "BTC") ?? marketRows[0] ?? null;
const selectedIdentity = selected ? {
  id: cleanText(selected.id || selected.symbol, 120),
  symbol: cleanText(selected.symbol, 24).toUpperCase(),
  name: cleanText(selected.name, 120),
} : null;

const shieldSearch = await requestJson("shield-search", `/api/market-integrity/search?query=${encodeURIComponent(selectedIdentity?.symbol || "btc")}`);
const shieldSearchPayload = shieldSearch.json;
const suggestions = isObject(shieldSearchPayload) && Array.isArray(shieldSearchPayload.suggestions) ? shieldSearchPayload.suggestions : [];
add("shield-search", "hard", shieldSearch.status === 200 && isObject(shieldSearchPayload) && shieldSearchPayload.mode === "live" && suggestions.length > 0, {
  status: shieldSearch.status,
  state: isObject(shieldSearchPayload) ? shieldSearchPayload.mode : "invalid",
  suggestionCount: suggestions.length,
  error: shieldSearch.error ?? (isObject(shieldSearchPayload) ? shieldSearchPayload.error ?? null : "payload_not_object"),
});

let klines = { status: null, json: null, error: "market_identity_unavailable" };
if (selectedIdentity?.id && selectedIdentity.symbol) {
  const params = new URLSearchParams({ symbol: selectedIdentity.symbol, assetClass: "crypto", marketId: selectedIdentity.id, quote: "USD", range: "15m" });
  klines = await requestJson("klines", `/api/market-integrity/klines?${params.toString()}`);
}
const klinesPayload = klines.json;
const candles = isObject(klinesPayload) && Array.isArray(klinesPayload.candles) ? klinesPayload.candles : [];
const validCandles = candles.filter((candle) => isObject(candle) && finite(candle.timestamp) && finite(candle.open) && finite(candle.high) && finite(candle.low) && finite(candle.close));
add("klines", "hard", klines.status === 200 && isObject(klinesPayload) && ["live", "stale"].includes(klinesPayload.mode) && validCandles.length >= contract.budgets.minimumKlineCandles, {
  status: klines.status,
  state: isObject(klinesPayload) ? klinesPayload.mode : "invalid",
  candleCount: validCandles.length,
  source: isObject(klinesPayload) ? cleanText(klinesPayload.source) : null,
  error: klines.error ?? (isObject(klinesPayload) ? klinesPayload.error ?? null : "payload_not_object"),
});

let investigator = { status: null, json: null, error: "market_identity_unavailable" };
if (selectedIdentity?.symbol) investigator = await requestJson("shield-map-investigator", `/api/market-integrity/investigator?query=${encodeURIComponent(selectedIdentity.symbol)}&locale=pl`);
const investigatorPayload = investigator.json;
add("shield-map-investigator", "hard", investigator.status === 200 && isObject(investigatorPayload) && investigatorPayload.mode === "live" && isObject(investigatorPayload.investigator) && isObject(investigatorPayload.result), {
  status: investigator.status,
  state: isObject(investigatorPayload) ? investigatorPayload.mode : "invalid",
  laneCount: isObject(investigatorPayload?.investigator) && Array.isArray(investigatorPayload.investigator.lanes) ? investigatorPayload.investigator.lanes.length : 0,
  error: investigator.error ?? (isObject(investigatorPayload) ? investigatorPayload.error ?? null : "payload_not_object"),
});

const browserSearch = await requestJson("browser-search", "/api/search?q=bitcoin&mode=all&locale=pl&intent=suggest");
const browserPayload = browserSearch.json;
const browserResults = isObject(browserPayload) && Array.isArray(browserPayload.results)
  ? browserPayload.results
  : isObject(browserPayload?.data) && Array.isArray(browserPayload.data.results) ? browserPayload.data.results : [];
const browserOkFlag = isObject(browserPayload) ? browserPayload.ok !== false : false;
add("browser-search", "hard", browserSearch.status === 200 && browserOkFlag && browserResults.length >= contract.budgets.minimumBrowserResults, {
  status: browserSearch.status,
  state: browserOkFlag ? "available" : "error",
  resultCount: browserResults.length,
  error: browserSearch.error ?? (isObject(browserPayload) ? browserPayload.error ?? null : "payload_not_object"),
});

const lensResult = browserResults[0] ?? null;
let lensJson = { status: null, json: null, error: "browser_result_unavailable" };
if (lensResult) {
  lensJson = await requestJson("lens-report-json", "/api/search/lens-report?tier=basic&format=json", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ result: lensResult, locale: "pl", depth: "basic" }),
  });
}
const lensPayload = lensJson.json;
const lensReport = isObject(lensPayload) && isObject(lensPayload.report) ? lensPayload.report : null;
add("lens-report-json", "hard", lensJson.status === 200 && isObject(lensPayload) && lensPayload.ok === true && Boolean(lensReport), {
  status: lensJson.status,
  state: isObject(lensPayload) && lensPayload.ok === true ? "canonical-report" : "error",
  renderToken: isObject(lensPayload) && typeof lensPayload.renderToken === "string" ? "present" : "absent",
  error: lensJson.error ?? (isObject(lensPayload) ? lensPayload.error ?? null : "payload_not_object"),
});

let lensPdf = { status: null, error: "canonical_report_unavailable" };
if (lensReport) {
  const pdfBody = isObject(lensPayload) && typeof lensPayload.renderToken === "string" && lensPayload.renderToken
    ? { renderToken: lensPayload.renderToken }
    : lensReport;
  lensPdf = await requestPdf("lens-report-pdf", "/api/search/lens-report?tier=basic", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/pdf" },
    body: JSON.stringify(pdfBody),
  });
}
add("lens-report-pdf", "hard", lensPdf.status === 200 && lensPdf.total >= contract.budgets.minimumPdfBytes && lensPdf.bytes?.subarray(0, 5).toString("ascii") === "%PDF-", {
  status: lensPdf.status,
  state: lensPdf.status === 200 ? "pdf" : "error",
  bytes: lensPdf.total ?? null,
  sha256: lensPdf.sha256 ?? null,
  error: lensPdf.error ?? null,
});

async function intelligenceCheck(depth) {
  if (!selectedIdentity) return { status: null, json: null, error: "market_identity_unavailable" };
  return requestJson(`market-intelligence-${depth}`, "/api/market-integrity/market-intelligence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetKey: selectedIdentity.id || selectedIdentity.symbol, depth, locale: "pl", surface: "shield", evidenceMode: "server_owned" }),
  });
}
for (const depth of ["basic", "pro"]) {
  const response = await intelligenceCheck(depth);
  const payload = response.json;
  const truthfulStatus = [200, 403, 424].includes(response.status);
  const explicitState = isObject(payload) && (payload.ok === false || payload.marketImpact || payload.whaleWatch || payload.error || payload.blockers || payload.missingEvidence);
  add(`market-intelligence-${depth}`, "truth-boundary", truthfulStatus && Boolean(explicitState), {
    status: response.status,
    state: response.status === 200 ? "available" : response.status === 403 ? "entitlement-blocked" : response.status === 424 ? "evidence-withheld" : "error",
    assetKey: isObject(payload) ? payload.assetKey ?? payload.requestedAssetKey ?? null : null,
    error: response.error ?? (isObject(payload) ? payload.error ?? null : "payload_not_object"),
  });
}

const hardFailures = rows.filter((row) => row.severity === "hard" && !row.ok);
const truthFailures = rows.filter((row) => row.severity === "truth-boundary" && !row.ok);
const report = {
  schemaVersion: "velmere.pass35.a46.data-plane-acceptance.v1",
  revisionId: contract.revisionId,
  generatedAt: new Date().toISOString(),
  baseUrl,
  selectedIdentity,
  truthBoundary: contract.truthBoundary,
  summary: { checks: rows.length, passed: rows.filter((row) => row.ok).length, failed: rows.filter((row) => !row.ok).length, hardFailed: hardFailures.length, truthBoundaryFailed: truthFailures.length },
  rows,
};
fs.writeFileSync(path.join(outputRoot, "PASS35_A46_DATA_PLANE_ACCEPTANCE.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary, null, 2));
if (hardFailures.length || truthFailures.length) process.exitCode = 1;
