#!/usr/bin/env node
import { buildR44P35DynamicScorecard } from "../../lib/product/vlm-dynamic-product-scoring.mjs";

const scorecard = buildR44P35DynamicScorecard();
const rows = [];
const add = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });
add("product-rows-17", scorecard.rows.length === 17);
add("tiered-9", scorecard.summary.tieredRows === 9);
add("standalone-8", scorecard.summary.standaloneRows === 8);
add("cycle-2-of-3", scorecard.testCycle.current === 2 && scorecard.testCycle.total === 3);
add("all-recalculated", scorecard.rows.every((row) => Number.isFinite(row.scoreBeforePct) && Number.isFinite(row.scoreAfterPct) && Number.isFinite(row.deltaPct)));
add("customer-proof-zero", scorecard.rows.every((row) => row.customerProofPct === 0) && scorecard.summary.customerProvenRows === 0);
add("sale-disabled", scorecard.saleEnabled === false && scorecard.rows.every((row) => row.saleEnabled === false && row.publicCheckoutAllowed === false));
add("standalone-not-tiered", scorecard.rows.filter((row) => ["market-impact", "whale-watch", "angel", "risk-indicator"].includes(row.productId)).every((row) => row.tier === null));
add("target-modules-move", ["market-impact", "whale-watch", "angel", "risk-indicator"].every((id) => (scorecard.rows.find((row) => row.productId === id)?.deltaPct ?? 0) > 0));
add("unrelated-zero-delta-reason", scorecard.rows.filter((row) => row.deltaPct === 0).every((row) => typeof row.reasonForNoMovement === "string" && row.reasonForNoMovement.length > 10));
add("release-cap-cycle2", scorecard.rows.every((row) => row.releaseReadinessPct <= 79));
add("advanced-not-for-sale", scorecard.rows.filter((row) => row.tier === "advanced").every((row) => row.saleDecision === "NOT_FOR_SALE"));
add("world-class-capped-with-zero-customer-proof", scorecard.rows.every((row) => row.worldClassEvidencePct <= 49 && row.worldClassCapReason === "WORLD_CLASS_EVIDENCE_CAPPED_BELOW_50_WITH_ZERO_REAL_CUSTOMER_PROOF"));
const failures = rows.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p35.dynamic-scorecard-test.v1",
  status: failures.length ? "FAIL" : "PASS_R44P35_DYNAMIC_SCORECARD",
  checks: rows.length,
  passed: rows.length - failures.length,
  failed: failures.length,
  summary: scorecard.summary,
  rows,
}, null, 2));
if (failures.length) process.exit(1);
