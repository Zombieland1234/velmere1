#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "");
if (!root || !fs.existsSync(root)) throw new Error("panel_root_required");
const stable = (value) => value === null || typeof value !== "object"
  ? (JSON.stringify(value) ?? "null")
  : Array.isArray(value)
    ? `[${value.map(stable).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
const digestOk = (row) => {
  const { evidenceSha256, ...core } = row;
  return evidenceSha256 === sha256(stable(core));
};

const customers = readJson("R44P45_AI_CUSTOMER_PANEL.json");
const reviewers = readJson("R44P45_AI_REVIEWER_PANEL.json");
const embedded = readJson("R44P45_AI_PANELS_VERIFIER.json");
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
check("customer-schema", customers.schemaVersion === "velmere.pass36.a102r44p45.ai-customer-panel.v1");
check("reviewer-schema", reviewers.schemaVersion === "velmere.pass36.a102r44p45.ai-reviewer-panel.v1");
check("customer-digest", digestOk(customers));
check("reviewer-digest", digestOk(reviewers));
check("customer-sessions-24", customers.sessions === 24 && customers.rows?.length === 24, customers.rows?.length);
check("reviewer-assessments-180", reviewers.assessments === 180 && reviewers.assessmentRows?.length === 180, reviewers.assessmentRows?.length);
check("reviewer-roles-12", reviewers.reviewers?.length === 12, reviewers.reviewers?.length);
check("ai-classification", customers.evidenceClass === "AI_SIMULATED" && reviewers.evidenceClass === "AI_SIMULATED");
check("customer-proof-zero", customers.customerProof === 0 && reviewers.externalReviewerProof === 0);
check("external-review-zero", reviewers.externalReviewerProof === 0);
check("wtp-zero", customers.realWillingnessToPay === 0);
check("no-sale-live", reviewers.assessmentRows?.every((row) => row.saleCredit === false && row.liveCredit === false));
check("embedded-verifier", embedded.ok === true && embedded.checks?.every((row) => row.ok === true));
const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p45.ai-panels-verifier.v2",
  status: failed.length ? "FAIL_R44P45_AI_PANELS" : "PASS_R44P45_AI_PANELS",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  rows: checks,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exitCode = 1;
