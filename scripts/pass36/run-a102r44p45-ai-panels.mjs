import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REVISION = "VELMERE_PASS36_A102R44P45_ACTION_REQUIRED_CONTINUOUS_CURRENT_STATE_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT";
const FIXED_TIME = "2026-08-10T12:00:00.000Z";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};
function parseArgs(argv) {
  const map = new Map();
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error(`invalid_argument:${key ?? "missing"}`);
    map.set(key.slice(2), value);
  }
  for (const key of ["interaction-root", "output"]) if (!map.has(key)) throw new Error(`missing_argument:${key}`);
  return Object.fromEntries(map);
}

const REVIEWERS = Object.freeze([
  ["A", "Vulnerability Researcher", "missing security behavior and reachable attack surfaces"],
  ["B", "Sceptical Auditor", "evidence sufficiency and over-claiming"],
  ["C", "Exploitability Reviewer", "preconditions, attacker capability and reproducibility"],
  ["D", "Remediation Reviewer", "root-cause closure and regression risk"],
  ["E", "Customer Report Reviewer", "clarity, actionability and expectation mismatch"],
  ["F", "Claims / Legal-risk Reviewer", "unsupported safe/secure/verified language"],
  ["G", "False-Negative Hunter", "unsafe lookalikes missed by bounded suppression"],
  ["H", "False-Positive Hunter", "benign patterns incorrectly promoted to vulnerabilities"],
  ["I", "Severity Challenger", "severity inflation and missing calibration"],
  ["J", "Protocol / Business Logic Reviewer", "context not captured by local AST shape"],
  ["K", "Data Provenance Reviewer", "source/compiler/evidence traceability"],
  ["L", "Adversarial Product Reviewer", "ways customer copy or automation can overstate the result"],
].map(([id, role, focus]) => ({ id, role, focus })));

function expectedClass(row) {
  if (row.expectedAlert) return "ALERT_REQUIRED";
  if (row.expectedSuppression) return "BOUNDED_REVIEW_CONTEXT";
  return "NO_ALERT_EXPECTED";
}

function reviewerVerdict(reviewer, scenario) {
  const expected = expectedClass(scenario);
  const observedAlert = scenario.observedAlert;
  const observedContext = scenario.observedSuppression;
  const base = {
    reviewerId: reviewer.id,
    reviewerRole: reviewer.role,
    focus: reviewer.focus,
    scenarioId: scenario.caseId,
    evidenceClass: "AI_SIMULATED",
    externalHumanProofCredit: false,
    independentReviewerCredit: false,
    saleCredit: false,
    liveCredit: false,
  };
  if (reviewer.id === "G") {
    const candidate = expected === "ALERT_REQUIRED" && !observedAlert;
    return { ...base, verdict: candidate ? "FALSE_NEGATIVE_CANDIDATE" : "NO_FALSE_NEGATIVE_CANDIDATE", confidenceState: "NOT_CALIBRATED", issue: candidate ? "Expected unsafe behavior was not alerted." : null };
  }
  if (reviewer.id === "H") {
    const candidate = expected !== "ALERT_REQUIRED" && observedAlert;
    return { ...base, verdict: candidate ? "FALSE_POSITIVE_CANDIDATE" : "NO_FALSE_POSITIVE_CANDIDATE", confidenceState: "NOT_CALIBRATED", issue: candidate ? "Control-like behavior was promoted to an alert." : null };
  }
  if (reviewer.id === "I") {
    return { ...base, verdict: observedAlert ? "SEVERITY_REQUIRES_ADJUDICATION" : observedContext ? "NO_SEVERITY_FOR_REVIEW_CONTEXT" : "NO_SEVERITY_SIGNAL", confidenceState: "NOT_CALIBRATED", issue: observedAlert ? "Local AST evidence does not independently prove impact or exploitability." : null };
  }
  if (reviewer.id === "C") {
    return { ...base, verdict: observedAlert ? "EXPLOITABILITY_NOT_PROVEN_REPRODUCER_REQUIRED" : "EXPLOITABILITY_NOT_APPLICABLE_OR_NOT_PROVEN", confidenceState: "NOT_CALIBRATED", issue: observedAlert ? "Requires executable reproducer or independently reviewed path." : null };
  }
  if (reviewer.id === "J") {
    return { ...base, verdict: observedContext ? "KEEP_VISIBLE_BUSINESS_LOGIC_REVIEW_CONTEXT" : observedAlert ? "BUSINESS_LOGIC_REVIEW_REQUIRED" : "NO_LOCAL_CONTEXT_ESCALATION", confidenceState: "NOT_CALIBRATED", issue: observedContext ? "Bounded suppression must not become a safe-contract claim." : null };
  }
  if (reviewer.id === "F" || reviewer.id === "E" || reviewer.id === "L") {
    return { ...base, verdict: observedContext ? "WORD_AS_REVIEW_CONTEXT_NOT_SAFE" : observedAlert ? "WORD_AS_POTENTIAL_FINDING_NOT_CONFIRMED_EXPLOIT" : "WORD_AS_NO_SIGNAL_WITH_SCOPE_LIMITS", confidenceState: "NOT_CALIBRATED", issue: "Customer-facing copy must preserve scope, uncertainty and human-review trigger." };
  }
  if (reviewer.id === "K") {
    return { ...base, verdict: scenario.compilerVersion && scenario.sourceBundleSha256 ? "PROVENANCE_PRESENT" : "PROVENANCE_GAP", confidenceState: "NOT_CALIBRATED", issue: scenario.compilerVersion && scenario.sourceBundleSha256 ? null : "Missing source/compiler binding." };
  }
  if (reviewer.id === "D") {
    return { ...base, verdict: observedAlert ? "REMEDIATION_AND_REGRESSION_TEST_REQUIRED" : observedContext ? "NO_FIX_RECOMMENDATION_WITHOUT_HUMAN_REVIEW" : "NO_REMEDIATION_TRIGGER", confidenceState: "NOT_CALIBRATED", issue: observedAlert ? "Fix must be checked against an unsafe/control pair." : null };
  }
  if (reviewer.id === "B") {
    return { ...base, verdict: observedContext ? "SUPPRESSION_ACCEPTABLE_ONLY_AS_BOUNDED_REVIEW_NOTE" : observedAlert ? "ALERT_ACCEPTABLE_AS_REVIEW_PRIORITY" : "NO_ALERT_ACCEPTABLE_WITH_LIMITATIONS", confidenceState: "NOT_CALIBRATED", issue: observedContext ? "The pattern is not independently adjudicated as safe." : null };
  }
  return { ...base, verdict: observedAlert ? "REVIEW_PRIORITY_SUPPORTED_BY_LOCAL_AST" : observedContext ? "BOUNDED_CONTEXT_REVIEW_SUPPORTED" : "NO_SUPPORTED_SIGNAL", confidenceState: "NOT_CALIBRATED", issue: null };
}

const args = parseArgs(process.argv);
const interactionRoot = path.resolve(args["interaction-root"]);
const outputRoot = path.resolve(args.output);
const summary = JSON.parse(fs.readFileSync(path.join(interactionRoot, "R44P45_INTERACTION_CONTEXT_SUMMARY.json"), "utf8"));
if (summary.analyzerRevision !== "R44P45_CONTEXT_QUALIFIED_INTERACTION_ORDERING_V3" || summary.syntheticCases !== 13) throw new Error("interaction_summary_boundary");
const syntheticDir = path.join(interactionRoot, "synthetic");
const synthetic = fs.readdirSync(syntheticDir).filter((name) => name.endsWith(".json")).sort().map((name) => JSON.parse(fs.readFileSync(path.join(syntheticDir, name), "utf8")));
const selectedControls = ["OZ5_CONTROL_05", "OZ5_CONTROL_10"].map((caseId) => JSON.parse(fs.readFileSync(path.join(interactionRoot, "controls", `${caseId}.json`), "utf8")));
const scenarios = [
  ...synthetic.map((row) => ({
    caseId: row.caseId,
    kind: "SYNTHETIC_ADVERSARIAL_OR_CONTROL",
    expectedAlert: row.expectedAlert,
    expectedSuppression: row.expectedSuppression,
    observedAlert: row.observedAlert,
    observedSuppression: row.observedSuppression,
    compilerVersion: row.compilerVersion,
    sourceBundleSha256: row.sourceBundleSha256,
  })),
  ...selectedControls.map((row) => ({
    caseId: row.caseId,
    kind: "PUBLIC_CONTROL_CANDIDATE",
    expectedAlert: false,
    expectedSuppression: row.suppressionPatternIds[0] ?? null,
    observedAlert: row.rootFindings.length > 0,
    observedSuppression: row.suppressionPatternIds[0] ?? null,
    compilerVersion: row.compilerVersion,
    sourceBundleSha256: row.sourceBundleSha256,
  })),
];
if (scenarios.length !== 15) throw new Error(`scenario_count:${scenarios.length}`);
const assessments = REVIEWERS.flatMap((reviewer) => scenarios.map((scenario) => reviewerVerdict(reviewer, scenario)));
const falseNegativeCandidates = assessments.filter((row) => row.verdict === "FALSE_NEGATIVE_CANDIDATE").length;
const falsePositiveCandidates = assessments.filter((row) => row.verdict === "FALSE_POSITIVE_CANDIDATE").length;
const severityDisputes = assessments.filter((row) => row.verdict === "SEVERITY_REQUIRES_ADJUDICATION").length;
const businessLogicEscalations = assessments.filter((row) => row.verdict === "KEEP_VISIBLE_BUSINESS_LOGIC_REVIEW_CONTEXT" || row.verdict === "BUSINESS_LOGIC_REVIEW_REQUIRED").length;
const adjudications = scenarios.map((scenario) => {
  const expected = expectedClass(scenario);
  const status = scenario.observedAlert ? "POTENTIAL_FINDING_REVIEW_PRIORITY" : scenario.observedSuppression ? "BOUNDED_CONTEXT_REVIEW_NOT_CONFIRMED_VULNERABILITY" : "NO_SUPPORTED_SIGNAL_WITH_SCOPE_LIMITS";
  return {
    scenarioId: scenario.caseId,
    expectedClass: expected,
    finalStatus: status,
    findingTruthChangedByTier: false,
    numericConfidenceAllowed: false,
    externalHumanAdjudication: "NOT_PERFORMED",
    nextSafeAction: scenario.observedAlert ? "Build or review a reproducer and inspect business logic before severity." : scenario.observedSuppression ? "Retain a visible context note and request human business-logic review for high-value use." : "Preserve unsupported-family and no-signal limitations.",
  };
});
const reviewerPanelCore = {
  schemaVersion: "velmere.pass36.a102r44p45.ai-reviewer-panel.v1",
  revisionId: REVISION,
  observedAt: FIXED_TIME,
  evidenceClass: "AI_SIMULATED",
  reviewers: REVIEWERS,
  scenarios: scenarios.length,
  assessments: assessments.length,
  falseNegativeCandidates,
  falsePositiveCandidates,
  severityDisputes,
  businessLogicEscalations,
  independentHumanReviewers: 0,
  externalReviewerProof: 0,
  assessmentRows: assessments,
  adjudications,
  limitations: [
    "Reviewer roles are deterministic AI-simulated perspectives, not independent people or organizations.",
    "No AI assessment can create formal false-positive, false-negative, severity, customer, sale, LIVE or world-class credit.",
    "Bounded context suppression remains a human-review trigger rather than a safety conclusion."
  ],
};
const reviewerPanel = { ...reviewerPanelCore, evidenceSha256: sha256(stable(reviewerPanelCore)) };

const CUSTOMER_PERSONAS = [
  ["BEGINNER", "beginner retail user"], ["FOUNDER", "protocol founder"], ["DEVELOPER", "smart-contract developer"],
  ["SECURITY", "security engineer"], ["PROCUREMENT", "procurement buyer"], ["COMPLIANCE", "compliance reviewer"],
  ["SCEPTIC", "sceptical CTO"], ["REFUND", "customer demanding refund"],
];
const LANGUAGES = ["PL", "EN", "DE"];
const customerSessions = [];
for (const [personaId, persona] of CUSTOMER_PERSONAS) {
  for (const language of LANGUAGES) {
    const technical = ["DEVELOPER", "SECURITY"].includes(personaId);
    const legal = ["COMPLIANCE", "PROCUREMENT", "REFUND"].includes(personaId);
    const comprehension = technical ? 88 : legal ? 82 : 78;
    const trust = legal ? 84 : personaId === "SCEPTIC" ? 76 : 80;
    const decisionUtility = technical ? 86 : 74;
    const tierValue = technical ? 72 : 61;
    const refundRisk = personaId === "REFUND" ? 58 : legal ? 34 : 24;
    customerSessions.push({
      sessionId: `${personaId}_${language}`,
      persona,
      language,
      evidenceClass: "AI_SIMULATED",
      journey: "Audit finding wording: raw high alert versus context-qualified review note",
      baselineReaction: "Raw interaction-ordering alert may be interpreted as confirmed reentrancy.",
      currentReaction: "Context-qualified wording is clearer but still needs visible independent-review limitation.",
      comprehension,
      trust,
      decisionUtility,
      tierValue,
      refundRisk,
      purchaseIntentSimulation: technical ? "CONSIDER_PRO_ONLY_WITH_MANUAL_QA" : "USE_BASIC_FREE",
      externalHumanProofCredit: false,
      realWillingnessToPayCredit: false,
    });
  }
}
const avg = (key) => Number((customerSessions.reduce((sum, row) => sum + row[key], 0) / customerSessions.length).toFixed(2));
const customerPanelCore = {
  schemaVersion: "velmere.pass36.a102r44p45.ai-customer-panel.v1",
  revisionId: REVISION,
  observedAt: FIXED_TIME,
  evidenceClass: "AI_SIMULATED",
  sessions: customerSessions.length,
  languages: LANGUAGES,
  personas: CUSTOMER_PERSONAS.length,
  scores: {
    comprehension: avg("comprehension"),
    trust: avg("trust"),
    decisionUtility: avg("decisionUtility"),
    tierValue: avg("tierValue"),
    refundRisk: avg("refundRisk"),
  },
  rows: customerSessions,
  realResearchParticipants: 0,
  realWillingnessToPay: 0,
  customerProof: 0,
  limitations: [
    "These sessions are deterministic AI-simulated product reviews, not moderated human research.",
    "AI purchase intent is not real willingness to pay.",
    "Customer Proof remains zero until real participants complete preregistered tasks."
  ],
};
const customerPanel = { ...customerPanelCore, evidenceSha256: sha256(stable(customerPanelCore)) };

const verifierChecks = [
  ["reviewers-12", REVIEWERS.length === 12],
  ["scenarios-15", scenarios.length === 15],
  ["assessments-180", assessments.length === 180],
  ["no-fn-candidates", falseNegativeCandidates === 0],
  ["no-fp-candidates", falsePositiveCandidates === 0],
  ["customer-sessions-24", customerSessions.length === 24],
  ["customer-proof-zero", customerPanel.customerProof === 0],
  ["external-review-zero", reviewerPanel.externalReviewerProof === 0],
  ["no-sale-credit", assessments.every((row) => row.saleCredit === false)],
  ["no-live-credit", assessments.every((row) => row.liveCredit === false)],
];
const verifier = {
  schemaVersion: "velmere.pass36.a102r44p45.ai-panels-verifier.v1",
  ok: verifierChecks.every(([, ok]) => ok),
  checks: verifierChecks.map(([id, ok]) => ({ id, ok })),
};
if (!verifier.ok) throw new Error(`ai_panel_verifier_failed:${verifier.checks.filter((row) => !row.ok).map((row) => row.id).join(",")}`);
writeJson(path.join(outputRoot, "R44P45_AI_REVIEWER_PANEL.json"), reviewerPanel);
writeJson(path.join(outputRoot, "R44P45_AI_CUSTOMER_PANEL.json"), customerPanel);
writeJson(path.join(outputRoot, "R44P45_AI_PANELS_VERIFIER.json"), verifier);
process.stdout.write(`${JSON.stringify({ status: "PASS_R44P45_AI_SIMULATED_PANELS_NO_EXTERNAL_PROOF", reviewers: 12, assessments: 180, customerSessions: 24, falseNegativeCandidates, falsePositiveCandidates, customerProof: 0, externalReviewerProof: 0 })}\n`);
