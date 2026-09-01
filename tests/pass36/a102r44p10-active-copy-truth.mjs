import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const rows = [];
const check = (id, fn) => {
  try { fn(); rows.push({ id, ok: true }); }
  catch (error) { rows.push({ id, ok: false, error: error instanceof Error ? error.message : String(error) }); }
};

const sku = JSON.parse(read("config/pass36/a102r44p10-customer-facing-sku-truth.json"));
const product = read("lib/security/vlm-audit-product.ts");
const tierContract = read("lib/security/audit-tier-contract.ts");
const currentStart = tierContract.indexOf("export const CURRENT_AUDIT_TIER_CONTRACTS");
const currentEnd = tierContract.indexOf("export function auditTierFromReviewLevel", currentStart);
const currentBlock = tierContract.slice(currentStart, currentEnd);
const auditMetadata = read("app/[locale]/security/audits/page.tsx");
const auditLanding = read("components/security/SecurityAuditsCleanPage.tsx");
const portal = read("components/account/AuditCasesPortalClient.tsx");
const intelligence = read("app/[locale]/intelligence/page.tsx");
const angel = read("lib/server/lazy-route-modules/angel.ts");
const outputQuality = read("lib/ai/audit-output-quality.ts");
const advancedState = read("lib/server/market-integrity-route-modules/advanced-review-state.ts");
const fixtureRuntime = read("lib/worldclass/pass36-a82-audit-real-contract-matrix-runtime.mjs");

check("01-basic-no-checkout", () => assert.equal(sku.tiers.basic.publicCheckoutAllowed, false));
check("02-basic-price-null", () => assert.equal(sku.tiers.basic.price, null));
check("03-pro-invitation-only", () => assert.equal(sku.tiers.pro.customerDecision, "CONTROLLED_INVITATION_ONLY_BETA"));
check("04-pro-no-public-checkout", () => assert.equal(sku.tiers.pro.publicCheckoutAllowed, false));
check("05-pro-price-null", () => assert.equal(sku.tiers.pro.price, null));
check("06-pro-manual-qa-required", () => assert.equal(sku.tiers.pro.manualQaRequired, true));
check("07-advanced-not-for-sale", () => assert.equal(sku.tiers.advanced.customerDecision, "NOT_FOR_SALE"));
check("08-advanced-no-public-checkout", () => assert.equal(sku.tiers.advanced.publicCheckoutAllowed, false));
check("09-advanced-price-null", () => assert.equal(sku.tiers.advanced.price, null));
check("10-numeric-tier-confidence-forbidden", () => assert.equal(sku.findingConfidence.numericTierConfidenceAllowed, false));
check("11-nine-not-calibrated-scorecards", () => assert.equal((product.match(/status:\s*"NOT_CALIBRATED",\s*percent:\s*null/g) || []).length, 9));
check("12-old-tier-confidence-copy-absent", () => assert.equal(/technical packet confidence|pewność pakietu technicznego|Paketkonfidenz/i.test(product), false));
check("13-product-public-price-absent", () => assert.equal(/Advanced[^\n]{0,100}(?:149[.,]99|€149|149\.99€)|Pro[^\n]{0,100}(?:79[.,]99|€79|79\.99€)/i.test(product), false));
check("14-current-tier-three-null-prices", () => assert.equal((currentBlock.match(/price:\s*null/g) || []).length, 3));
check("15-current-tier-three-disabled-checkouts", () => assert.equal((currentBlock.match(/publicCheckoutAllowed:\s*false/g) || []).length, 3));
check("16-audit-metadata-no-human-verification-claim", () => assert.equal(/human verification in Advanced/i.test(auditMetadata), false));
check("17-portal-no-advanced-human-label", () => assert.equal(/Advanced · (?:human|Mensch|człowiek)/i.test(portal), false));
check("18-angel-no-public-audit-price", () => assert.equal(/Advanced Audit (?:is|remains|costs)?\s*149(?:[.,]99)?\s*(?:EUR|€)|149(?:[.,]99)?\s*(?:EUR|€) Advanced/i.test(angel), false));
check("19-angel-no-paid-human-vlm-claim", () => assert.equal(/paid human\+VLM|human\+VLM evidence workflow/i.test(angel), false));
check("20-output-quality-no-public-price", () => assert.equal(/Advanced Audit 149€|149€ audit workflow/i.test(outputQuality), false));
check("21-advanced-state-no-included-human-review", () => assert.equal(/whether Advanced human-review notes may render/i.test(advancedState), false));
check("22-fixture-human-review-false", () => assert.equal(/humanReviewVerified:\s*false/.test(fixtureRuntime), true));
check("23-normalization-map", () => assert.equal(sku.customerStatusNormalization.human_review_queue, "analysis_queue"));
check("24-legacy-not-customer-visible", () => assert.equal(sku.legacyCompatibility.customerVisible, false));
check("25-intelligence-audit-uses-current-sku-sale-labels", () => {
  assert.equal(intelligence.includes("price: skuTruth[id].publicPriceLabel"), true);
  assert.equal(/(?:€|EUR)\s*(?:59|79|149)(?:[.,]99)?|(?:59|79|149)(?:[.,]99)?\s*(?:€|EUR)/i.test(intelligence), false);
});
check("26-audit-menu-hides-internal-enum", () => assert.equal(auditLanding.includes('<strong>{tier.id === "basic" ? tier.price : t.plannedPrice}</strong>'), true));

const failed = rows.filter((row) => !row.ok);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p10.active-copy-truth.v3",
  checks: rows.length,
  passed: rows.length - failed.length,
  failed: failed.length,
  rows,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
}, null, 2));
if (failed.length) process.exit(1);
