import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const summary = read("artifacts/closure/p35/internal-ai-availability-artifact-summary.json");
const verifier = read("artifacts/closure/p35/internal-ai-availability-ledger-verifier-receipt.json");
const matrix = read("artifacts/closure/p35/current-evidence-availability-matrix.json");
const external = read("artifacts/closure/p35/P35_REAL_EXTERNAL_PROGRAM_TABLE.json");
const policy = read("config/closure/p35/internal-ai-availability-artifact-ledger-policy.json");

let checks = 0;
const ok = (condition, message) => { checks += 1; assert.ok(condition, message); };
const sha = (path) => crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");

ok(policy.expectedTotalRows === 5147, "P35 internal AI denominator must be frozen at 5147");
ok(summary.rowsExecuted === 5147 && summary.rowDenominator === 5147, "all current P35 internal rows must be executed");
ok(summary.executionCoveragePercent === 100, "internal AI execution coverage must be 100%");
ok(summary.profilesCovered === 33, "all 33 product/tier profiles must be covered");
ok(summary.cohortCount === 10, "P35 must have ten frozen AI cohorts");
ok(summary.creditSummary.realCustomerCredit === 0, "AI personas must not receive real-customer credit");
ok(summary.creditSummary.independentReviewerCredit === 0, "AI role lanes must not receive independent-review credit");
ok(summary.creditSummary.professionalLegalDecisionCredit === 0, "AI legal review must not receive professional legal credit");
ok(summary.creditSummary.providerRightsCredit === 0, "AI rights review must not create provider rights");
ok(summary.creditSummary.paidReleaseCredit === 0, "internal AI execution must not create paid release credit");
ok(summary.creditSummary.worldClassCredit === 0, "internal AI execution must not create world-class credit");
ok(matrix.denominator === 33, "dynamic eligibility matrix must retain 33 profiles");
ok(matrix.analysisEligibleProfileCount === 7 || matrix.analysisEligibleProfileCount === 11, "only Basic internal analysis is currently eligible");
ok(matrix.saleEligibleProfileCount === 0, "current public sale eligibility must remain fail closed");
ok(matrix.profiles.every((row) => row.receipt.estimatedRestorationAt === null), "no eligibility receipt may invent restoration ETA");
ok(external.length === 9 && external.every((row) => row.completionPercent === 0), "real/external program must remain separate at 0/9");
ok(verifier.status === "PASS", "P35 ledger verifier must pass");
ok(verifier.checks.mutationsDetected === verifier.checks.mutationDenominator, "all false-promotion mutations must be detected");
ok(summary.authority.binding.eligibilityMatrixSha256 === sha("artifacts/closure/p35/current-evidence-availability-matrix.json"), "AI ledger must bind the exact eligibility matrix");
ok(summary.truthBoundary.includes("not final customer-value quality"), "truth boundary must preserve no-fake customer value credit");

console.log(`P35 internal AI availability ledger: PASS (${checks}/${checks})`);
