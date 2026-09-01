import { readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { arr, hash, num, obj, safeName, saveGz, saveJson, text } from "./eval-utils";

async function main() {
Object.assign(process.env, {
  NODE_ENV: "development",
  VELMERE_LOCAL_PAID_TIER_DEMO_UNLOCK: "true",
  NEXT_PUBLIC_VELMERE_QA_UNLOCK_ADVANCED_PDF: "1",
  VELMERE_LOCAL_PAID_ACCESS_DEMO: "true",
  VELMERE_REQUIRE_PAID_ENTITLEMENT_LEDGER: "false",
});

const ROOT = process.cwd();
const splitTsv = async (file: string, columns: number) =>
  (await readFile(`${ROOT}/evaluation/${file}`, "utf8"))
    .split(/\r?\n/)
    .map((line) => line.split("\t"))
    .filter((row) => row.length === columns && row.every(Boolean));

const timeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label}_timeout_${ms}ms`)), ms)),
  ]);

const marketRoute = await import("@/lib/server/market-integrity-route-modules/vlm");
const searchRoute = await import("../app/api/search/route.ts");
const pdfRoute = await import("@/lib/server/search-route-modules/lens-report");
const auditRoute = await import("@/lib/server/security-route-modules/audit-watch");
const { buildPass4420AdvancedPaidContext } = await import("../lib/security/audit-watch-server-helpers.ts");
const { upsertVlmPaidEntitlementFromDemoReceipt } = await import("../lib/commerce/vlm-entitlement-ledger.ts");
const { createVlmPaidAccessToken } = await import("../lib/commerce/vlm-paid-access-server.ts");

await rm(`${ROOT}/evaluation/raw`, { recursive: true, force: true });
await rm(`${ROOT}/evaluation/summaries`, { recursive: true, force: true });
await rm(`${ROOT}/evaluation/pdfs`, { recursive: true, force: true });
await mkdir(`${ROOT}/evaluation/raw/vlm`, { recursive: true });
await mkdir(`${ROOT}/evaluation/raw/pdf`, { recursive: true });
await mkdir(`${ROOT}/evaluation/raw/audit`, { recursive: true });
await mkdir(`${ROOT}/evaluation/summaries`, { recursive: true });
await mkdir(`${ROOT}/evaluation/pdfs`, { recursive: true });

let completed = 0;
const failures: Array<{ kind: string; id: string; error: string }> = [];
const progress = (kind: string, id: string, status: number, error = "") => {
  completed += 1;
  console.log(`[${completed}/120] ${kind} ${id} status=${status}${error ? ` error=${error}` : ""}`);
};

for (const [category, query, name, depth] of await splitTsv("vlm-cases.tsv", 4)) {
  const surface = category === "shield" ? "shield" : "real_markets";
  const stem = `${category}-${safeName(query)}-${depth}`;
  const started = Date.now();
  let status = 0;
  let payload: Record<string, unknown> | null;
  let error = "";
  try {
    const res = await timeout(
      marketRoute.POST(new Request("http://localhost/api/market-integrity/vlm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, locale: "en", depth, surface, prompt: `${name} · pass4640 regression` }),
      })),
      30_000,
      `vlm_${stem}`,
    );
    status = res.status;
    payload = obj(await res.json());
  } catch (caught) {
    error = String(caught);
    payload = { error };
    failures.push({ kind: "vlm", id: stem, error });
  }
  const result = obj(payload?.result);
  const token = obj(result.token);
  const kernel = obj(payload?.kernel);
  const ai = obj(payload?.ai);
  const aiOutput = obj(ai.output);
  const readiness = obj(payload?.analysisReadiness);
  const summary = {
    category,
    query,
    name,
    depth,
    status,
    latencyMs: Date.now() - started,
    error,
    responseBytes: Buffer.byteLength(JSON.stringify(payload)),
    requestedSurface: surface,
    sourceMode: text(payload?.sourceMode),
    resolvedSymbol: text(token.symbol),
    resolvedName: text(token.name),
    assetClass: text(token.assetClass),
    score: typeof result.score === "number" ? result.score : null,
    customerVerdict: text(payload?.customerVerdict),
    analysisDataStatus: text(readiness.dataStatus),
    resultConfidence: num(result.confidence),
    resultSourceCount: arr(result.dataSources).length,
    kernelSurface: text(kernel.surface),
    kernelStatus: text(kernel.status),
    kernelConfidence: num(kernel.confidence),
    kernelSourceCount: num(kernel.sourceCount),
    aiVerdict: text(aiOutput.verdict),
    aiConfidence: num(aiOutput.confidence),
    aiFindingsCount: arr(aiOutput.findings).length,
    aiMissingDataCount: arr(aiOutput.missingData).length,
    customerNarrative: text(payload?.customerNarrative),
    rawPath: `evaluation/raw/vlm/${stem}.json.gz`,
  };
  await saveGz(summary.rawPath, payload);
  await saveJson(`evaluation/summaries/${stem}.json`, summary);
  progress("vlm", stem, status, error);
}

for (const [query, name, depth] of await splitTsv("pdf-pending.tsv", 3)) {
  const stem = `pdf-${safeName(query)}-${depth}`;
  const started = Date.now();
  let searchStatus = 0;
  let jsonStatus = 0;
  let pdfStatus = 0;
  let result: Record<string, unknown> | null = null;
  let report: Record<string, unknown> | null = null;
  let jsonPayload: Record<string, unknown> | null = null;
  let pdfBytes = Buffer.alloc(0);
  let error = "";
  try {
    const searchRes = await timeout(
      searchRoute.GET(new Request(`http://localhost/api/search?q=${encodeURIComponent(query)}&mode=all&locale=en&intent=detail`)),
      30_000,
      `pdf_search_${stem}`,
    );
    searchStatus = searchRes.status;
    const searchJson = obj(await searchRes.json());
    const firstResult = arr(searchJson.results)[0];
    result = firstResult && typeof firstResult === "object" && !Array.isArray(firstResult)
      ? firstResult as Record<string, unknown>
      : null;
    const jsonRes = await timeout(
      pdfRoute.POST(new Request(`http://localhost/api/search/lens-report?tier=${depth}&format=json`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ result, locale: "en", depth }),
      })),
      30_000,
      `pdf_json_${stem}`,
    );
    jsonStatus = jsonRes.status;
    jsonPayload = obj(await jsonRes.json());
    const reportValue = jsonPayload.report;
    report = reportValue && typeof reportValue === "object" && !Array.isArray(reportValue)
      ? reportValue as Record<string, unknown>
      : null;
    if (report) {
      const pdfRes = await timeout(
        pdfRoute.POST(new Request(`http://localhost/api/search/lens-report?tier=${depth}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(report),
        })),
        30_000,
        `pdf_binary_${stem}`,
      );
      pdfStatus = pdfRes.status;
      pdfBytes = Buffer.from(await pdfRes.arrayBuffer());
    }
  } catch (caught) {
    error = String(caught);
    failures.push({ kind: "pdf", id: stem, error });
  }
  if (pdfBytes.length) await writeFile(`evaluation/pdfs/${safeName(query)}-${depth}.pdf`, pdfBytes);
  const reportKernel = obj(report?.kernel);
  const manifest = obj(report?.pass610);
  const commercial = obj(jsonPayload?.commercialReadiness);
  const binaryPageCount = pdfBytes.length
    ? (pdfBytes.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length
    : 0;
  const summary = {
    category: "pdf",
    query,
    name,
    depth,
    searchStatus,
    jsonStatus,
    pdfStatus,
    jsonError: text(jsonPayload?.error),
    commercialDataStatus: text(commercial.dataStatus),
    commercialSellReady: commercial.sellReady === true,
    latencyMs: Date.now() - started,
    error,
    searchSymbol: text(result?.symbol),
    searchSourceCount: arr(result?.sources).length,
    reportSymbol: text(report?.symbol),
    kernelStatus: text(reportKernel.status),
    kernelConfidence: num(reportKernel.confidence),
    kernelSourceCount: num(reportKernel.sourceCount),
    reportSourceCount: arr(report?.sources).length,
    reportMissingCount: arr(report?.missingData).length,
    declaredPageCount: arr(manifest.pages).length,
    binaryPageCount,
    pdfBytes: pdfBytes.length,
    pdfHash: pdfBytes.length ? hash(pdfBytes) : "",
    rawPath: `evaluation/raw/pdf/${safeName(query)}-${depth}-report.json.gz`,
  };
  await saveGz(summary.rawPath, { jsonPayload, report });
  await saveJson(`evaluation/summaries/${stem}.json`, summary);
  progress("pdf", stem, jsonStatus || pdfStatus || searchStatus, error);
}

for (const [symbol, name, address, chain, rawDepth] of await splitTsv("audit-pending.tsv", 5)) {
  if (rawDepth !== "basic" && rawDepth !== "pro" && rawDepth !== "advanced") {
    throw new Error(`audit_depth_invalid:${rawDepth}`);
  }
  const depth = rawDepth;
  const reviewLevel = depth === "basic" ? "basic_review" : depth === "pro" ? "pro_review" : "advanced_review";
  const stem = `audit-${safeName(symbol)}-${depth}`;
  let token = "";
  let entitlementOk = depth === "basic";
  if (depth !== "basic") {
    const productId = depth === "pro" ? "vlm_pro_audit_review" : "vlm_advanced_audit_human_review";
    const context = buildPass4420AdvancedPaidContext({ locale: "en", depth, contractAddress: address, auditUrl: undefined, projectName: name });
    const sessionId = `vlm_demo_pass4640_${safeName(symbol)}_${depth}`;
    const entitlement = await upsertVlmPaidEntitlementFromDemoReceipt({ sessionId, productId, context });
    entitlementOk = entitlement.ok === true;
    const signed = createVlmPaidAccessToken({ productId, context, sessionId });
    if (signed.ok) token = signed.token;
  }
  const started = Date.now();
  let status = 0;
  let payload: Record<string, unknown> | null;
  let error = "";
  try {
    const res = await timeout(
      auditRoute.POST(new Request("http://localhost/api/security/audit-watch", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { "x-velmere-paid-access": token } : {}) },
        body: JSON.stringify({ projectName: name, contractAddress: address, chain, reviewLevel, locale: "en" }),
      })),
      30_000,
      `audit_${stem}`,
    );
    status = res.status;
    payload = obj(await res.json());
  } catch (caught) {
    error = String(caught);
    payload = { error };
    failures.push({ kind: "audit", id: stem, error });
  }
  const customer = obj(payload?.customerResult);
  const commercial = obj(payload?.commercialReadiness);
  const assessment = obj(payload?.assessment);
  const provider = obj(obj(payload?.pass2572AuditProviderRuntime).summary);
  const qa = obj(obj(payload?.pass2594AuditEvidenceQaReleaseGateMatrix).summary);
  const summary = {
    category: "audit",
    symbol,
    name,
    address,
    chain,
    depth,
    reviewLevel,
    status,
    latencyMs: Date.now() - started,
    error,
    responseBytes: Buffer.byteLength(JSON.stringify(payload)),
    entitlementOk,
    customerDataStatus: text(customer.dataStatus),
    customerRiskScore: typeof customer.riskScore === "number" ? customer.riskScore : null,
    customerConfidence: num(customer.confidence),
    commercialCheckoutAllowed: commercial.checkoutAllowed === true,
    commercialProSellReady: commercial.proSellReady === true,
    commercialAdvancedSellReady: commercial.advancedSellReady === true,
    commercialTopBlocker: text(commercial.topBlocker),
    assessmentVerdict: text(assessment.verdict),
    assessmentConfidenceCap: num(assessment.confidenceCap),
    providerCoverage: text(provider.liveProviderCoverage),
    providerConfirmed: num(provider.confirmed),
    providerPartial: num(provider.partial),
    providerMissing: num(provider.missing),
    qaReleaseReadiness: num(qa.releaseReadiness),
    qaCanReleaseBasic: qa.canReleaseBasicPublic === true,
    qaCanRenderProPdf: qa.canRenderProPdf === true,
    qaCanFinalSignAdvanced: qa.canFinalSignAdvanced === true,
    qaTopBlocker: text(qa.topReleaseBlocker),
    rawPath: `evaluation/raw/audit/${safeName(symbol)}-${depth}.json.gz`,
  };
  await saveGz(summary.rawPath, payload);
  await saveJson(`evaluation/summaries/${stem}.json`, summary);
  progress("audit", stem, status, error);
}

await saveJson("evaluation/PASS4640_REGRESSION_RUN.json", {
  generatedAt: new Date().toISOString(),
  completed,
  failures,
});
console.log(JSON.stringify({ completed, failureCount: failures.length }));

}

main().catch((error) => { console.error(error); process.exit(1); });
