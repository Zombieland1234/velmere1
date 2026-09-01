import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const method = fs.readFileSync(path.join(root, "docs/authority/VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V13_EVIDENCE_AVAILABILITY_ARTIFACT_PARITY_2026-08-13.txt"), "utf8");
const growth = fs.readFileSync(path.join(root, "docs/authority/VELMERE_GROWTH_INTEL_TOP_WORLD_R11_EVIDENCE_AVAILABILITY_VAULT_2026-08-13.txt"), "utf8");
const requirement = fs.readFileSync(path.join(root, "docs/research/VELMERE_EVIDENCE_AVAILABILITY_DYNAMIC_TIERS_HISTORICAL_INTELLIGENCE_PDF_ACCOUNT_ARTIFACTS_R2_2026-08-13.txt"), "utf8");
const requirementR3 = fs.readFileSync(path.join(root, "docs/research/VELMERE_EVIDENCE_AVAILABILITY_DYNAMIC_TIERS_HISTORICAL_INTELLIGENCE_PDF_ACCOUNT_ARTIFACTS_R3_CURRENT_SOURCE_MAPPING_2026-08-13.txt"), "utf8");
const engine = fs.readFileSync(path.join(root, "lib/commerce/vlm-evidence-availability.ts"), "utf8");
const artifactRoute = fs.readFileSync(path.join(root, "lib/server/lazy-route-modules/account--customer-artifact.ts"), "utf8");

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

check(requirement.includes("NOT IMPLEMENTED BY DECLARATION"), "uploaded product idea must retain its no-credit declaration");
check(requirementR3.includes("PARTIAL P0 IMPLEMENTATION / NO FAKE FEATURE CREDIT"), "R3 must map the idea to current source without promoting the full roadmap");
check(requirementR3.includes("33/33 profiles executed"), "R3 must bind the current dynamic eligibility denominator");
check(requirementR3.includes("0/33 saleEligible"), "R3 must preserve current stop-sell truth");
check(requirementR3.includes("Evidence Time Machine"), "R3 must retain the deferred historical scope explicitly");
check(method.includes("M25 — EVIDENCE AVAILABILITY"), "methodology must adopt deterministic availability as M25");
check(method.includes("M26 — CANONICAL CUSTOMER ARTIFACT"), "methodology must adopt exact artifact parity as M26");
check(method.includes("Payment proof nigdy nie nadpisuje"), "methodology must forbid payment overriding eligibility");
check(method.includes("Full owned preview body SHA-256 == download body SHA-256"), "methodology must require exact owned-preview/download parity");
check(method.includes("Evidence Time Machine/What Changed/Incident Window: DEFERRED_P2"), "unimplemented historical products must remain deferred and receive zero credit");
check(growth.includes("[IDEA-09] VELMÈRE EVIDENCE AVAILABILITY ENGINE"), "Growth Intel must retain the bounded availability opportunity");
check(growth.includes("[IDEA-10] EVIDENCE VAULT"), "Growth Intel must retain the bounded Evidence Vault opportunity");
check(growth.includes("RETENTION HYPOTHESES TO TEST, NOT PROMISE"), "7/90/365 retention must remain a hypothesis");
check(engine.includes("evaluateVlmTierEligibility"), "current source must contain a deterministic eligibility engine");
check(engine.includes("verifyVlmTierEligibilityReceipt"), "eligibility receipt must be reconstructable and tamper checked");
check(engine.includes("silentDowngradeAllowed: false"), "post-payment decision must forbid silent downgrade");
check(artifactRoute.includes('disposition === "preview"'), "artifact route must support explicit full preview disposition");
check(artifactRoute.includes("exactStoredPdf"), "artifact public projection must state exact stored PDF availability");
check(artifactRoute.includes('"inline" : "attachment"'), "preview/download may differ by disposition only");
check(!artifactRoute.includes('"x-velmere-storage-source"'), "public response must not expose storage implementation");

console.log(`Evidence availability/artifact methodology binding: PASS (${assertions}/${assertions})`);
