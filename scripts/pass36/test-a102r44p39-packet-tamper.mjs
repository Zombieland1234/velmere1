#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { verifyAuditCompilerPacketSet } from "../../lib/security/audit-compiler-canonical-packet.mjs";
const packetDir = path.resolve(process.argv[2] ?? "");
const files = fs.readdirSync(packetDir).filter((name) => name.endsWith(".json")).sort();
const firstCase = files[0].replace(/_(?:basic|pro|advanced)\.json$/u, "");
const original = ["basic", "pro", "advanced"].map((tier) => JSON.parse(fs.readFileSync(path.join(packetDir, `${firstCase}_${tier}.json`), "utf8")));
const clone = (value) => JSON.parse(JSON.stringify(value));
const rows = [];
const check = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });
check("baseline", verifyAuditCompilerPacketSet(original).failed === 0);
for (const [id, mutate] of [
  ["severity-tamper", (rows) => { rows[2].severitySha256 = "sha256:" + "0".repeat(64); }],
  ["finding-identity-tamper", (rows) => { rows[1].findingIdentitySha256 = "sha256:" + "1".repeat(64); }],
  ["numeric-confidence", (rows) => { rows[0].findingConfidence = 99; rows[0].customerTruth.numericFindingConfidenceAllowed = true; }],
  ["tier-truth-promotion", (rows) => { rows[2].customerTruth.tierChangesFindingTruth = true; }],
  ["advanced-sale-promotion", (rows) => { rows[2].availability = "PUBLIC_SALE"; rows[2].creditBoundary.paidSaleCredit = true; }],
  ["missing-tier", (rows) => { rows.pop(); }],
  ["depth-collapse", (rows) => { rows[1].findings = rows[1].findings.map(({ description, safeRemediation, excerpt, compilerEvidenceSha256, ...rest }) => rest); }],
]) {
  const changed = clone(original); mutate(changed);
  const result = verifyAuditCompilerPacketSet(changed);
  check(id, result.failed > 0, result.status);
}
const failed = rows.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r44p39.packet-tamper.v1", status: failed.length ? "FAIL_R44P39_PACKET_TAMPER" : "PASS_R44P39_PACKET_TAMPER", cases: rows.length, passed: rows.length - failed.length, failed: failed.length, rows }, null, 2));
if (failed.length) process.exit(1);
