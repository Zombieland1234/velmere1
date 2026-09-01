#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync("config/pass35/a17-evidence-family-registry.json", "utf8"));
const product = JSON.parse(readFileSync("config/pass35/product-tier-content-contract.json", "utf8"));
const current = JSON.parse(readFileSync("config/current-release.json", "utf8"));
const tiers = ["basic", "pro", "advanced"];
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };

check(registry.schemaVersion === "velmere.pass35.a17.evidence-family-registry.v1", "schema");
check(registry.passId === "PASS35_A17", "pass");
check(registry.sourceRevisionId === current.sourceRevisionId && /^VELMERE_PASS35_A32_/u.test(current.sourceRevisionId), "revision");
check(registry.rules.length === 21, "rule denominator");
check(new Set(registry.rules.map((row) => `${row.surfaceId}:${row.tier}`)).size === 21, "unique cells");
for (const surface of product.surfaces) {
  for (const tier of tiers) {
    const row = registry.rules.find((item) => item.surfaceId === surface.surfaceId && item.tier === tier);
    check(Boolean(row), `missing:${surface.surfaceId}:${tier}`);
    check(Number.isInteger(row.floor) && row.floor >= 1, `floor:${surface.surfaceId}:${tier}`);
    check(Array.isArray(row.families) && row.families.length >= row.floor, `families:${surface.surfaceId}:${tier}`);
    check(new Set(row.families).size === row.families.length, `duplicates:${surface.surfaceId}:${tier}`);
    check(surface.tiers[tier].evidenceFamilyFloor === row.floor, `product floor:${surface.surfaceId}:${tier}`);
    check(row.families.every((family) => surface.tiers[tier].requiredEvidenceFamilies.includes(family)), `product families:${surface.surfaceId}:${tier}`);
  }
}
const auditAdvanced = registry.rules.find((row) => row.surfaceId === "audit_evm" && row.tier === "advanced");
check(auditAdvanced.floor === 5 && auditAdvanced.families.includes("fork_replay") && auditAdvanced.families.includes("economic_adversarial"), "audit advanced material lanes");
const realAdvanced = registry.rules.find((row) => row.surfaceId === "real_markets" && row.tier === "advanced");
check(realAdvanced.floor === 3 && realAdvanced.families.includes("portfolio_regime_stress"), "real markets advanced lane");
console.log(JSON.stringify({ status: "PASS_A17_EVIDENCE_FAMILY_REGISTRY", checks, cells: registry.rules.length }, null, 2));
