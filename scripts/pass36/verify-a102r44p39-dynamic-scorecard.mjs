#!/usr/bin/env node
import fs from "node:fs";
const REV = "VELMERE_PASS36_A102R44P39_ACTION_REQUIRED_AUDIT_PACKET_PARITY_BYTECODE_PROXY_BINDING_AND_EXTERNAL_ACCURACY_REGISTRY_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT";
const score = JSON.parse(fs.readFileSync("config/pass36/r44p39-dynamic-scorecard.json", "utf8"));
const rows = [];
const check = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });
check("revision", score.revisionId === REV && score.testCycle === "2/3");
check("products-17", Array.isArray(score.products) && score.products.length === 17);
check("unique-products", new Set(score.products.map((row) => row.productId)).size === 17);
check("customer-proof-zero", score.products.every((row) => row.customerProof === 0));
check("world-class-cap", score.products.every((row) => Number(row.worldClassEvidence ?? 0) <= 49));
const allowedMovement = new Set(["audit-basic", "audit-pro", "audit-advanced", "pdf-basic", "pdf-pro", "pdf-advanced"]);
check("related-movement-only", score.products.every((row) => allowedMovement.has(row.productId) ? row.deltaDynamicQuality > 0 : row.deltaDynamicQuality === 0), score.products.map((row) => [row.productId, row.deltaDynamicQuality]));
check("browser-no-movement", score.products.filter((row) => row.productId.startsWith("browser-")).every((row) => row.deltaDynamicQuality === 0));
check("no-sale-promotion", score.products.every((row) => row.saleEnabled === false && row.publicCheckoutAllowed === false));
check("summary", score.summary?.products === 17 && score.summary?.productsWithMovement === 6 && score.summary?.realCustomerParticipants === 0);
const failed = rows.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r44p39.dynamic-scorecard-verification.v1", status: failed.length ? "FAIL_R44P39_DYNAMIC_SCORECARD" : "PASS_R44P39_DYNAMIC_SCORECARD", checks: rows.length, passed: rows.length - failed.length, failed: failed.length, rows }, null, 2));
if (failed.length) process.exit(1);
