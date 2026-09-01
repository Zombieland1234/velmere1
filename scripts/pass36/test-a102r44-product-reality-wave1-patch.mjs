#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const checks = [];
const check = (id, condition, detail = null) => checks.push({ id, passed: Boolean(condition), detail });
const sha256File = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const canonicalOutputs = [
  "evaluation/pass17/market-adapter-output-index.jsonl",
  "evaluation/pass17/market-adapter-simulation-summary.json",
  "evaluation/pass18/audit-lens-adapter-output-index.jsonl",
  "evaluation/pass18/audit-lens-adapter-simulation-summary.json",
  "evaluation/pass18/audit-lens-evidence-fixtures.json",
  "evaluation/pass19/brain-angel-adapter-output-index.jsonl",
  "evaluation/pass19/brain-angel-adapter-simulation-summary.json",
  "evaluation/pass19/brain-angel-evidence-fixtures.json",
];
const before = Object.fromEntries(canonicalOutputs.map((file) => [file, sha256File(file)]));

const commands = [
  ["pass17", ["scripts/pass17/verify-market-output-adapters.mjs", "--no-write"]],
  ["pass18", ["scripts/pass18/verify-audit-lens-output-adapters.mjs", "--no-write"]],
  ["pass19", ["scripts/pass19/verify-brain-angel-output-adapters.mjs", "--no-write"]],
];
for (const [id, args] of commands) {
  const run = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });
  check(`${id}:exit-zero`, run.status === 0, { status: run.status, stderr: run.stderr.slice(0, 400) });
  check(`${id}:stdout-json`, /^\s*\{/u.test(run.stdout) && /"ok"\s*:\s*true/u.test(run.stdout), run.stdout.slice(-500));
}
const after = Object.fromEntries(canonicalOutputs.map((file) => [file, sha256File(file)]));
check("adapter-verifiers:canonical-outputs-immutable", canonicalOutputs.every((file) => before[file] === after[file]), { before, after });

const pass17 = fs.readFileSync("scripts/pass17/verify-market-output-adapters.mjs", "utf8");
const pass18 = fs.readFileSync("scripts/pass18/verify-audit-lens-output-adapters.mjs", "utf8");
const pass19 = fs.readFileSync("scripts/pass19/verify-brain-angel-output-adapters.mjs", "utf8");
for (const [id, source] of [["pass17", pass17], ["pass18", pass18], ["pass19", pass19]]) {
  check(`${id}:write-explicit-only`, source.includes('process.argv.includes("--write")'), null);
}

const route = fs.readFileSync("app/api/checkout/vlm-service/route.ts", "utf8");
const gateIndex = route.indexOf("const productCellGate = evaluatePass35ProductCellCheckout(");
const stripeClientIndex = route.indexOf("const stripe = getStripeServerClient();");
const stripeCreateIndex = route.indexOf("stripe.checkout.sessions.create(sessionParams,");
check("checkout:gate-before-stripe-client", gateIndex >= 0 && stripeClientIndex > gateIndex, { gateIndex, stripeClientIndex });
check("checkout:create-after-client", stripeCreateIndex > stripeClientIndex, { stripeClientIndex, stripeCreateIndex });
check("checkout:server-idempotency-bound", /stripe\.checkout\.sessions\.create\(sessionParams,\s*\{\s*idempotencyKey:\s*stripeIdempotencyKey/u.test(route), null);


const currentVisualFreeze = spawnSync(process.execPath, ["scripts/pass36/verify-a102r44p1-current-visual-freeze.mjs"], {
  cwd: process.cwd(), encoding: "utf8", shell: false, windowsHide: true, maxBuffer: 8 * 1024 * 1024,
});
check("visual-freeze:current-exit-zero", currentVisualFreeze.status === 0, { status: currentVisualFreeze.status, stderr: currentVisualFreeze.stderr.slice(0, 400) });
check("visual-freeze:current-denominator-12", /"protectedFileCount"\s*:\s*12/u.test(currentVisualFreeze.stdout), currentVisualFreeze.stdout.slice(-800));
check("visual-freeze:legacy-kept", fs.existsSync("scripts/pass14/verify-visual-freeze.mjs") && fs.existsSync("config/pass14/visual-freeze-manifest.json"));

const auditSource = fs.readFileSync("scripts/pass13/audit-full-tree.mjs", "utf8");
check("source-audit:custom-next-distdir-generated-types", auditSource.includes('/^\\.\\/.next(?:-[^/]+)?\\/types\\//u.test(specifier)'), null);
check("source-audit:arbitrary-missing-imports-not-ignored", auditSource.includes("else unresolvedLocalImports.push"), null);


const intelligencePage = fs.readFileSync("app/[locale]/intelligence/page.tsx", "utf8");
check("jsonld:escapes-ampersand", intelligencePage.includes('.replace(/&/g, "\\\\u0026")'), null);
check("jsonld:escapes-less-than", intelligencePage.includes('.replace(/</g, "\\\\u003c")'), null);
check("jsonld:escapes-greater-than", intelligencePage.includes('.replace(/>/g, "\\\\u003e")'), null);
check("jsonld:escapes-line-separators", intelligencePage.includes('.replace(/\\u2028/g, "\\\\u2028")') && intelligencePage.includes('.replace(/\\u2029/g, "\\\\u2029")'), null);


check("source-clean:no-python-last-welcome-cache", !fs.existsSync("Python/_cache/last_welcome.txt"), null);


const waveState = JSON.parse(fs.readFileSync("config/pass36/a102r44p1-product-reality-wave1-state.json", "utf8"));
check("state:fail-closed", waveState.globalDecision === "NO_GO" && waveState.live === false && waveState.saleEnabled === false && waveState.productionApproved === false && waveState.worldClassProven === false, null);
check("state:environment-honest", waveState.environment.exactWindowsExecuted === false && waveState.environment.browserExecuted === false && waveState.environment.buildExecuted === false, waveState.environment);
const patternReview = JSON.parse(fs.readFileSync("config/pass36/a102r44p1-static-pattern-review.json", "utf8"));
check("static-review:fake-live-key-not-promoted", patternReview.secretCandidateReview.realSecretFound === false && patternReview.secretCandidateReview.classification === "DELIBERATE_FAKE_NEGATIVE_TEST_VALUE", null);
check("static-review:jsonld-reviewed", patternReview.dangerousPatternReview.some((row) => row.path === "app/[locale]/intelligence/page.tsx" && row.classification === "JSON_LD_ONLY_WITH_ESCAPE_HARDENING"), null);

const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44.product-reality-wave1-patch-test.v1",
  status: failed.length ? "FAIL_PRODUCT_REALITY_WAVE1_PATCH" : "PASS_PRODUCT_REALITY_WAVE1_PATCH_LOCAL_ONLY",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  sourceMutationPrevented: before && canonicalOutputs.every((file) => before[file] === after[file]),
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  failures: failed,
  results: checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
