import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const policyPath = path.join(root, "config/pass36/a102r44p9-independent-final-audit-policy.json");
const skuPath = path.join(root, "config/pass36/a102r44p9-customer-facing-sku-truth.json");

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}
function rel(p) { return path.relative(root, p).split(path.sep).join("/"); }
function sha256(p) { return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); }

const policy = readJson(policyPath);
const sku = readJson(skuPath);
const checks = [];
const warnings = [];
function check(id, ok, detail = {}) { checks.push({ id, ok: Boolean(ok), detail }); }

check("global-decision-no-go", policy.globalTruth?.decision === "NO_GO");
check("global-live-false", policy.globalTruth?.live === false);
check("global-sale-false", policy.globalTruth?.saleEnabled === false);
check("global-production-false", policy.globalTruth?.productionApproved === false);
check("global-world-class-false", policy.globalTruth?.worldClassProven === false);

for (const tier of ["basic", "pro", "advanced"]) {
  const row = sku.tiers?.[tier];
  check(`${tier}-checkout-disabled`, row?.publicCheckoutAllowed === false);
  check(`${tier}-price-null`, row?.price === null);
  check(`${tier}-human-review-false`, row?.humanReviewIncluded === false);
}
check("advanced-not-for-sale", sku.tiers?.advanced?.customerDecision === "NOT_FOR_SALE");
check("pro-invitation-only", sku.tiers?.pro?.customerDecision === "CONTROLLED_INVITATION_ONLY_BETA");
check("numeric-tier-confidence-forbidden", sku.findingConfidence?.numericTierConfidenceAllowed === false);
check("public-confidence-not-calibrated", sku.findingConfidence?.publicValue === "NOT_CALIBRATED");

const forbiddenRoots = ["node_modules", ".next", ".turbo", ".cache"];
const forbiddenFound = [];
for (const name of forbiddenRoots) {
  if (fs.existsSync(path.join(root, name))) forbiddenFound.push(name);
}
const all = walk(root);
for (const file of all) {
  const r = rel(file);
  if (/(^|\/)\.env(?:\.|$)/i.test(r)) forbiddenFound.push(r);
  if (/(^|\/)(?:node_modules|\.next(?:-[^/]+)?|\.turbo|\.cache)(\/|$)/i.test(r)) forbiddenFound.push(r);
}
check("source-forbidden-generated-paths-zero", forbiddenFound.length === 0, { count: forbiddenFound.length, sample: forbiddenFound.slice(0, 20) });

const activeRoots = ["app", "components", "lib", "messages"];
const activeFiles = activeRoots.flatMap((d) => walk(path.join(root, d))).filter((p) => /\.(?:[cm]?[jt]sx?|json)$/i.test(p));
const numericConfidence = [];
const affirmativeHumanReview = [];
const rawEnumMessages = [];
for (const file of activeFiles) {
  const r = rel(file);
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch { continue; }
  if (/(?:findingConfidence|confidence)\s*[:=]\s*(?:78|86|90|91)\b/i.test(text)) numericConfidence.push(r);
  // Only affirmative customer claims are blocking; explicit negation is allowed.
  const claimRe = /(["'`])([^"'`\n]{0,120}(?:human review|operator signoff|human-reviewed)[^"'`\n]{0,120})\1/gi;
  for (const m of text.matchAll(claimRe)) {
    const phrase = m[2];
    if (!/\b(?:no|not|without|does not|isn't|nie|bez|kein|keine|nicht)\b/i.test(phrase)) {
      affirmativeHumanReview.push({ path: r, phrase: phrase.slice(0, 220) });
    }
  }
  if (r.startsWith("messages/") && /\bNOT_FOR_SALE\b/.test(text)) rawEnumMessages.push(r);
}
check("active-numeric-confidence-zero", numericConfidence.length === 0, { count: numericConfidence.length, files: numericConfidence.slice(0, 30) });
check("affirmative-human-review-claims-zero", affirmativeHumanReview.length === 0, { count: affirmativeHumanReview.length, sample: affirmativeHumanReview.slice(0, 20) });
check("raw-not-for-sale-enum-in-messages-zero", rawEnumMessages.length === 0, { count: rawEnumMessages.length, files: rawEnumMessages.slice(0, 20) });

const legacyMatches = [];
for (const file of all.filter((p) => /\.(?:[cm]?[jt]sx?|json|sql|md|txt)$/i.test(p))) {
  const r = rel(file);
  if (/^(?:tests|fixtures|scripts|config|docs|db|supabase|_velmere)\//.test(r)) {
    const text = fs.readFileSync(file, "utf8");
    if (/human_review|operator_signoff/i.test(text)) legacyMatches.push(r);
  }
}
if (legacyMatches.length) warnings.push({
  id: "legacy-human-review-identifiers-remain-outside-active-customer-roots",
  count: legacyMatches.length,
  sample: legacyMatches.slice(0, 30),
  blocking: false,
});

check("metamorphic-test-present", fs.existsSync(path.join(root, "tests/pass36/a102r44p9-metamorphic-generalization.mjs")));
check("real-local-e2e-test-present", fs.existsSync(path.join(root, "tests/pass36/a102r44p9-real-local-e2e.mjs")));
check("structured-analyzer-honest-class", fs.readFileSync(path.join(root, "lib/security/solidity-structured-signal.mjs"), "utf8").includes("STRUCTURED_TOKEN_AST_NOT_COMPILER_AST"));

const failed = checks.filter((x) => !x.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p9.independent-static-policy.v1",
  revisionId: policy.revisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  policySha256: sha256(policyPath),
  skuTruthSha256: sha256(skuPath),
  warnings,
  checksDetail: checks,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
