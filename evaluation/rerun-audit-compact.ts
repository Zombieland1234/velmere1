import { readFile } from "node:fs/promises";
import { arr, hash, num, obj, safeName, saveGz, saveJson, text } from "./eval-utils";

Object.assign(process.env, {
  NODE_ENV: "development",
  VELMERE_LOCAL_PAID_ACCESS_DEMO: "true",
  VELMERE_REQUIRE_PAID_ENTITLEMENT_LEDGER: "false",
});

type Row = [string, string, string, string, "basic" | "pro" | "advanced"];

async function main() {
  const { POST } = await import("@/lib/server/security-route-modules/audit-watch");
  const { buildPass4420AdvancedPaidContext } = await import("../lib/security/audit-watch-server-helpers.ts");
  const { upsertVlmPaidEntitlementFromDemoReceipt } = await import("../lib/commerce/vlm-entitlement-ledger.ts");
  const { createVlmPaidAccessToken } = await import("../lib/commerce/vlm-paid-access-server.ts");

  const input = await readFile("evaluation/audit-pending.tsv", "utf8");
  const allRows = input.trim().split(/\r?\n/).map((line) => line.split("\t") as Row);
  const start = Math.max(0, Number(process.argv[2] ?? "0"));
  const end = Math.min(allRows.length, Number(process.argv[3] ?? String(allRows.length)));
  const rows = allRows.slice(start, end);

  for (const [localIndex, row] of rows.entries()) {
    const index = start + localIndex;
    const [symbol, name, address, chain, depth] = row;
    const reviewLevel = depth === "basic" ? "basic_review" : depth === "pro" ? "pro_review" : "advanced_review";
    let token = "";
    let entitlementOk = depth === "basic";

    if (depth !== "basic") {
      const productId = depth === "pro" ? "vlm_pro_audit_review" : "vlm_advanced_audit_human_review";
      const context = buildPass4420AdvancedPaidContext({ locale: "en", depth, contractAddress: address, auditUrl: undefined, projectName: name });
      const sessionId = `vlm_demo_eval_compact_${safeName(symbol)}_${depth}_${index}`;
      const setup = await upsertVlmPaidEntitlementFromDemoReceipt({ sessionId, productId, context });
      entitlementOk = setup.ok === true;
      const signed = createVlmPaidAccessToken({ productId, context, sessionId });
      if (signed.ok) token = signed.token;
    }

    const started = Date.now();
    let status = 0;
    let payload: Record<string, unknown> | null;
    let error = "";
    try {
      const request = new Request("http://localhost/api/security/audit-watch", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { "x-velmere-paid-access": token } : {}) },
        body: JSON.stringify({ projectName: name, contractAddress: address, chain, reviewLevel, locale: "en" }),
      });
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error("audit_timeout_120s")), 120_000);
      });
      const response = await Promise.race([POST(request), timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      status = response.status;
      payload = obj(await response.json());
    } catch (cause) {
      error = String(cause);
      payload = { error };
    }
    const latencyMs = Date.now() - started;
    const stem = `audit-${safeName(symbol)}-${depth}`;
    const rawPath = `evaluation/raw/audit/${safeName(symbol)}-${depth}.json.gz`;
    await saveGz(rawPath, payload);

    const customer = obj(payload?.customerResult);
    const commercial = obj(payload?.commercialReadiness);
    const assessment = obj(payload?.assessment);
    const summary = {
      category: "audit",
      symbol: safeName(symbol),
      name,
      address,
      depth,
      reviewLevel,
      status,
      latencyMs,
      error,
      responseBytes: Buffer.byteLength(JSON.stringify(payload)),
      responseMode: text(payload?.responseMode),
      customerDataStatus: text(customer.dataStatus),
      customerRiskScore: typeof customer.riskScore === "number" ? customer.riskScore : null,
      customerConfidence: num(customer.confidence),
      providerCoverage: text(customer.providerCoverage),
      releaseReadiness: num(customer.releaseReadiness),
      commercialCheckoutAllowed: commercial.checkoutAllowed === true,
      commercialProSellReady: commercial.proSellReady === true,
      commercialAdvancedSellReady: commercial.advancedSellReady === true,
      commercialTopBlocker: text(commercial.topBlocker),
      entitlementOk,
      assessmentVerdict: text(assessment.verdict),
      assessmentConfidenceCap: num(assessment.confidenceCap),
      assessmentMissingCount: arr(assessment.missingEvidence).length,
      canonicalHash: hash({ status, customer, commercial, assessment }),
      rawPath,
    };
    await saveJson(`evaluation/summaries/${stem}.json`, summary);
    console.log(`${index + 1}/30 ${symbol} ${depth} status=${status} bytes=${summary.responseBytes} ms=${latencyMs}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
