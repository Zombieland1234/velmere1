import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p10-targeted-closure-policy.json"), "utf8"));
const sku = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p10-customer-facing-sku-truth.json"), "utf8"));
const checks = [];
const check = (id, ok, detail = {}) => checks.push({ id, ok: Boolean(ok), detail });
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function runJson(rel) {
  const r = spawnSync(process.execPath, [rel], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1" },
    shell: false,
    windowsHide: true,
  });
  const parsed = (() => {
    try { return JSON.parse(r.stdout); } catch (error) { void error; return null; }
  })();
  return { rel, exitCode: r.status, stdoutBytes: Buffer.byteLength(r.stdout || ""), stderrBytes: Buffer.byteLength(r.stderr || ""), parsed };
}

check("global-no-go", policy.globalTruth?.decision === "NO_GO");
check("global-live-false", policy.globalTruth?.live === false);
check("global-sale-false", policy.globalTruth?.saleEnabled === false);
check("global-production-false", policy.globalTruth?.productionApproved === false);
check("global-world-class-false", policy.globalTruth?.worldClassProven === false);

check("sku-basic-truth", sku.tiers?.basic?.customerDecision === "GO_FREE_LIMITED_PRESCREEN_AFTER_FINAL_BROWSER_RETEST" && sku.tiers?.basic?.price === null && sku.tiers?.basic?.publicCheckoutAllowed === false);
check("sku-pro-truth", sku.tiers?.pro?.customerDecision === "CONTROLLED_INVITATION_ONLY_BETA" && sku.tiers?.pro?.price === null && sku.tiers?.pro?.publicCheckoutAllowed === false);
check("sku-advanced-truth", sku.tiers?.advanced?.customerDecision === "NOT_FOR_SALE" && sku.tiers?.advanced?.price === null && sku.tiers?.advanced?.publicCheckoutAllowed === false && sku.tiers?.advanced?.humanReviewIncluded === false);
check("finding-confidence-not-calibrated", sku.findingConfidence?.publicValue === "NOT_CALIBRATED" && sku.findingConfidence?.numericTierConfidenceAllowed === false);

const visibleFiles = [
  "app/[locale]/security/audits/customer-report/[id]/page.tsx",
  "components/account/AuditAccountMessagesClient.tsx",
  "components/account/AuditCasesPortalClient.tsx",
  "components/checkout/VelmereCheckoutFlowClient.tsx",
  "components/checkout/VlmServiceCheckoutSuccessClient.tsx",
  "lib/account/audit-account-messages.ts",
  "lib/security/audit-watch-server-helpers.ts",
  "lib/security/linked-request-drawer.ts",
  "lib/intelligence/intelligence-content.ts",
];
const visibleClaims = [];
for (const rel of visibleFiles) {
  const text = read(rel);
  if (/human review|human-reviewed|operator signoff/i.test(text)) visibleClaims.push(rel);
}
check("visible-human-review-promises-zero", visibleClaims.length === 0, { files: visibleClaims });

const commercial = read("lib/security/audit-commercial-sku-truth.ts");
check("commercial-basic-aligned", /basic:\s*\{[\s\S]*?decision:\s*"GO_FREE_LIMITED_PRESCREEN_AFTER_FINAL_BROWSER_RETEST"/.test(commercial));
check("commercial-pro-aligned", /pro:\s*\{[\s\S]*?decision:\s*"CONTROLLED_INVITATION_ONLY_BETA"/.test(commercial));
check("commercial-advanced-aligned", /advanced:\s*\{[\s\S]*?decision:\s*"NOT_FOR_SALE"/.test(commercial));

const tierContract = read("lib/security/audit-tier-contract.ts");
const currentStart = tierContract.indexOf("export const CURRENT_AUDIT_TIER_CONTRACTS");
const currentEnd = tierContract.indexOf("export function auditTierFromReviewLevel", currentStart);
const currentBlock = tierContract.slice(currentStart, currentEnd);
check("current-tier-prices-null", (currentBlock.match(/price:\s*null/g) || []).length === 3, { count: (currentBlock.match(/price:\s*null/g) || []).length });
check("current-tier-public-checkout-disabled", (currentBlock.match(/publicCheckoutAllowed:\s*false/g) || []).length === 3, { count: (currentBlock.match(/publicCheckoutAllowed:\s*false/g) || []).length });
check("current-tier-advanced-stop-sold", /customerDecision:\s*"NOT_FOR_SALE"/.test(currentBlock));

const paidAccess = read("lib/commerce/vlm-paid-access.ts");
check("paid-audit-runtime-sanitizer-present", paidAccess.includes("function customerSafeAuditProduct") && paidAccess.includes("amount: 0") && paidAccess.includes("publicCheckoutAllowed: false"));
check("paid-audit-runtime-decisions", paidAccess.includes('"CONTROLLED_INVITATION_ONLY_BETA"') && paidAccess.includes('"NOT_FOR_SALE"'));

const diagnostics = [
  ".velmere/pass15-diagnostics/lazy-route-shell-verification.json",
  ".velmere/pass15-diagnostics/route-dispatch-verification.json",
  "artifacts/pass13/PASS13_CLEAN_SAFE_AUDIT.json",
  "artifacts/pass13/PASS13_CLEAN_SAFE_MANIFEST.json",
].filter((rel) => fs.existsSync(path.join(root, rel)));
check("generated-diagnostics-absent", diagnostics.length === 0, { paths: diagnostics });

// Negative policy tests: customer promises and numeric tier confidence must still be caught.
const forbiddenHumanClaim = (value) => /(?:includes?|adds?|enters?|waits? for|assigned|delivered after)[^\n.]{0,80}human review|human-reviewed service/i.test(value);
const forbiddenTierConfidence = (value) => /(?:findingConfidence|technicalPacketConfidence|tierConfidence|packageConfidence)\s*[:=]\s*\d+/i.test(value);
check("negative-catches-human-review-inclusion", forbiddenHumanClaim("Advanced includes human review and operator notes."));
check("negative-catches-human-reviewed-service", forbiddenHumanClaim("This is a human-reviewed service."));
check("negative-allows-review-required-warning", !forbiddenHumanClaim("Signals require external human review; none is included."));
check("negative-catches-numeric-tier-confidence", forbiddenTierConfidence("tierConfidence: 91"));

const meta = runJson("tests/pass36/a102r44p10-metamorphic-generalization.mjs");
check("metamorphic-432", meta.exitCode === 0 && meta.parsed?.assertions === 432 && meta.parsed?.passed === 432 && meta.parsed?.failed === 0, { exitCode: meta.exitCode, parsed: meta.parsed && { assertions: meta.parsed.assertions, passed: meta.parsed.passed, failed: meta.parsed.failed }, stdoutBytes: meta.stdoutBytes, stderrBytes: meta.stderrBytes });
const truth = runJson("tests/pass36/a102r44p10-customer-truth-normalizer.mjs");
check("customer-truth-9", truth.exitCode === 0 && truth.parsed?.checks === 9 && truth.parsed?.passed === 9 && truth.parsed?.failed === 0, { exitCode: truth.exitCode, parsed: truth.parsed });
const e2e = runJson("tests/pass36/a102r44p10-real-local-e2e.mjs");
check("local-e2e-14", e2e.exitCode === 0 && e2e.parsed?.assertions === 14 && e2e.parsed?.passed === 14 && e2e.parsed?.failed === 0, { exitCode: e2e.exitCode, parsed: e2e.parsed && { assertions: e2e.parsed.assertions, passed: e2e.parsed.passed, failed: e2e.parsed.failed } });
const activeCopy = runJson("tests/pass36/a102r44p10-active-copy-truth.mjs");
check("active-copy-truth-26", activeCopy.exitCode === 0 && activeCopy.parsed?.checks === 26 && activeCopy.parsed?.passed === 26 && activeCopy.parsed?.failed === 0, { exitCode: activeCopy.exitCode, parsed: activeCopy.parsed && { checks: activeCopy.parsed.checks, passed: activeCopy.parsed.passed, failed: activeCopy.parsed.failed } });
const routeMigration = runJson("scripts/pass36/verify-a102r44p10-route-dispatch-rebaseline.mjs");
check("route-rebaseline-9", routeMigration.exitCode === 0 && routeMigration.parsed?.checks === 9 && routeMigration.parsed?.passed === 9 && routeMigration.parsed?.failed === 0, { exitCode: routeMigration.exitCode, parsed: routeMigration.parsed });

const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p10.targeted-closure-verification.v1",
  revisionId: policy.revisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checksDetail: checks,
  truthBoundary: policy.creditBoundary,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
