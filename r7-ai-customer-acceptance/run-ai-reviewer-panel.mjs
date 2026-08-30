import crypto from "node:crypto";
import fs from "node:fs";

const CASES = 50;
const TIERS = ["basic", "pro", "advanced"];
const REVIEWERS = [
  ["AI-REVIEWER-01", "security-engineer"],
  ["AI-REVIEWER-02", "smart-contract-auditor"],
  ["AI-REVIEWER-03", "privacy-reviewer"],
  ["AI-REVIEWER-04", "product-risk-reviewer"],
  ["AI-REVIEWER-05", "evidence-adjudicator"],
  ["AI-REVIEWER-06", "customer-safety-reviewer"],
];
const DIMENSIONS = [
  "evidence-sufficiency", "source-provenance", "currentness", "entitlement-boundary", "tenant-isolation",
  "fail-closed-behavior", "customer-value-delta", "artifact-integrity", "rights-boundary", "disclosure-quality",
];
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

const judgments = [];
for (let c = 1; c <= CASES; c += 1) {
  for (const tier of TIERS) {
    for (const [reviewerId, specialization] of REVIEWERS) {
      const dimensions = Object.fromEntries(DIMENSIONS.map((d, index) => {
        const seed = sha256(`${c}|${tier}|${reviewerId}|${d}`);
        const score = 1 + (Number.parseInt(seed.slice(0, 2), 16) % 5);
        return [d, score];
      }));
      judgments.push({
        caseRef: `AI-AUDIT-CASE-${String(c).padStart(3, "0")}`,
        tier,
        reviewerId,
        specialization,
        dimensions,
        overallDisposition: "AWAITING_REAL_CASE_EVIDENCE",
        disagreementKey: sha256(`${c}|${tier}|${reviewerId}|disagreement`),
        aiSimulationOnly: true,
        externalHumanProofCredit: false,
      });
    }
  }
}

const expected = CASES * TIERS.length * REVIEWERS.length;
if (judgments.length !== expected) throw new Error("ai_reviewer_denominator_invalid");

const agreementKeys = new Map();
for (const row of judgments) {
  const key = `${row.caseRef}|${row.tier}`;
  agreementKeys.set(key, (agreementKeys.get(key) ?? 0) + 1);
}
if (agreementKeys.size !== CASES * TIERS.length || [...agreementKeys.values()].some((n) => n !== REVIEWERS.length)) {
  throw new Error("ai_reviewer_panel_bijection_invalid");
}

const aggregateSha256 = sha256(judgments.map((j) => `${j.caseRef}|${j.tier}|${j.reviewerId}|${JSON.stringify(j.dimensions)}|${j.disagreementKey}`).join("\n"));
fs.mkdirSync("artifacts/r7/ai-customer-acceptance", { recursive: true });
fs.writeFileSync(
  "artifacts/r7/ai-customer-acceptance/R7_AI_REVIEWER_PANEL.json",
  `${JSON.stringify({
    schemaVersion: "velmere.r7.ai-simulated-reviewer-panel.v1",
    panelStatus: "PANEL_DEFINED",
    denominator: {
      auditCases: CASES,
      tiers: TIERS.length,
      reviewers: REVIEWERS.length,
      judgments: expected,
      dimensionsPerJudgment: DIMENSIONS.length,
    },
    aggregateSha256,
    judgments,
    truthBoundary: {
      aiSimulatedOnly: true,
      externalHumanProofCredit: false,
      customerFinalCredit: false,
      paidValueCredit: false,
    },
    nextPhase: "Replace synthetic disposition with real post-closure evidence-backed reviewer prompts and persist adjudicated outputs without conflating them with human proof.",
  }, null, 2)}\n`,
);
console.log(JSON.stringify({ status: "PASS_REVIEWER_DENOMINATOR", auditCases: CASES, tiers: TIERS.length, reviewers: REVIEWERS.length, judgments: expected, aggregateSha256 }, null, 2));
