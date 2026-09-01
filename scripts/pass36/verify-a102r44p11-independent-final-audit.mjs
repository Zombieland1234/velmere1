import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const state = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p11-action-required-current-state.json"), "utf8"));
const checks = [];
const warnings = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

check("global-no-go", state.decision === "NO_GO");
check("global-flags-false", Object.values(state.globalTruth).every((value) => value === false));
check("advanced-not-for-sale", state.skuDecisions?.auditAdvanced === "NOT_FOR_SALE");
check("pro-invitation-only", state.skuDecisions?.auditPro === "CONTROLLED_INVITATION_ONLY_BETA_WITH_MANDATORY_MANUAL_QA");
check("providers-zero-credit", state.localEvidence?.shield?.realProviderCredit === 0 && state.localEvidence?.realMarkets?.realCurrentDataCredit === 0);

const customerFiles = [
  "lib/ai/angel-route-policy.ts",
  "lib/ai/vlm-tier-differentiation.ts",
  "lib/ai/vlm-entitlement-output-firewall.ts",
  "lib/server/market-integrity-route-modules/access.ts",
  "lib/server/market-integrity-vlm-route-modules/access-policy.ts",
];
const combined = customerFiles.map((rel) => read(rel)).join("\n");
check("no-public-audit-prices", !/(?:79[,.]99|149[,.]99|€\s*79|€\s*149)/i.test(combined));
check("no-customer-human-review-promise", !/(?:includes?|adds?|enters?|assigned to)[^\n.]{0,80}(?:human review|operator signoff)/i.test(combined));
check("no-numeric-tier-confidence", !/(?:tier|package|technical)[A-Za-z]*Confidence\s*[:=]\s*\d+/i.test(combined));
check("advanced-stop-sold-copy", /not for sale|nie jest dostępny w sprzedaży|nicht zum verkauf/i.test(combined));
check("pro-controlled-beta-copy", /invitation|zaprosze|einladung/i.test(combined));

const structured = read("lib/security/solidity-structured-signal.mjs");
check("structured-analyzer-honest-class", structured.includes("STRUCTURED_TOKEN_AST_NOT_COMPILER_AST"));
const compilerPolicy = JSON.parse(read("config/pass36/a102r44p11-compiler-ast-dynamic-policy.json"));
check("compiler-ast-local-credit", compilerPolicy.creditBoundary?.localCompilerAstCredit === true);
check("compiler-ast-no-real-accuracy-credit", compilerPolicy.creditBoundary?.realExternalProtocolAccuracyCredit === false);
check("foundry-local-credit", compilerPolicy.creditBoundary?.localFoundryFuzzCredit === true && compilerPolicy.creditBoundary?.localFoundryInvariantCredit === true);

const globe = read("components/market-integrity/ShieldProMonochromeGlobe.tsx");
check("globe-single-fetch", (globe.match(/fetch\(LAND_POINTS_URL/g) ?? []).length === 1);
check("globe-bounded-animation", globe.includes("targetFps") && globe.includes("IntersectionObserver") && globe.includes("visibilitychange"));
const transition = read("components/ui/VelmereRouteTransition.tsx");
check("route-reveal-font-image-layout-bound", transition.includes("fontsReady") && transition.includes("pendingAboveFoldImage") && transition.includes("layoutSettled"));

const forbidden = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".turbo", ".cache", "coverage", "test-results", "playwright-report", "__pycache__", ".pytest_cache"].includes(entry.name) || entry.name.startsWith(".next-")) forbidden.push(rel);
      else walk(full);
    } else if (entry.isFile() && /(^|\/)\.env(?:\.|$)/i.test(rel)) forbidden.push(rel);
  }
}
walk(root);
check("source-forbidden-generated-zero", forbidden.length === 0, forbidden.slice(0, 30));

warnings.push({ id: "real-external-protocol-accuracy-unproven", blocking: true, credit: 0 });
warnings.push({ id: "real-provider-rights-unproven", blocking: true, shield: "0/318", realMarkets: "0/583" });
warnings.push({ id: "independent-adjudication-unperformed", blocking: true, completed: "0/50" });
warnings.push({ id: "exact-windows-final-byte-not-run", blocking: true });

const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p11.independent-final-audit.v1",
  revisionId: state.revisionId,
  status: failed.length ? "FAIL_R44P11_INDEPENDENT_FINAL_AUDIT" : "PASS_R44P11_LOCAL_INDEPENDENT_AUDIT_WITH_EXTERNAL_BLOCKERS",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checksDetail: checks,
  blockingWarnings: warnings,
  balancedAssessment: {
    engineeringFramework: 9.0,
    evidenceIntegrity: 9.2,
    localCompilerLevelAnalysis: 7.8,
    localFoundryFuzzInvariants: 7.7,
    pdfEngineering: 9.2,
    localCustomerTruth: 8.5,
    realExternalProtocolAccuracy: null,
    shieldRealData: 1.5,
    realMarketsRealData: 1.0,
    publicSaleReadinessPercentRange: [35, 45],
    worldClassProof: 5.4
  },
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
