#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const REV = "VELMERE_PASS36_A102R44P45_ACTION_REQUIRED_CONTINUOUS_CURRENT_STATE_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT";
const args = process.argv.slice(2);
const rootIndex = args.indexOf("--materials-root");
if (rootIndex < 0 || !args[rootIndex + 1]) throw new Error("materials_root_required");
const root = path.resolve(args[rootIndex + 1]);
const rows = [];
const add = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });
const file = (relative) => path.join(root, ...relative.split("/"));
const json = (relative) => JSON.parse(fs.readFileSync(file(relative), "utf8"));
const exists = (relative) => fs.existsSync(file(relative));

for (const relative of [
  "01_ACCURACY_DELTA/interaction/R44P45_INTERACTION_CONTEXT_SUMMARY.json",
  "01_ACCURACY_DELTA/public_holdout_current/R44P43_PUBLIC_BALANCED_HOLDOUT_SUMMARY.json",
  "01_ACCURACY_DELTA/R44P45_REPEATABILITY.json",
  "01_ACCURACY_DELTA/R44P45_INTERACTION_CONTEXT_VERIFIER.json",
  "01_ACCURACY_DELTA/R44P45_INTERACTION_CONTEXT_TAMPER.json",
  "02_AI_PANELS/targeted/R44P45_AI_CUSTOMER_PANEL.json",
  "02_AI_PANELS/targeted/R44P45_AI_REVIEWER_PANEL.json",
  "02_AI_PANELS/targeted/R44P45_AI_PANELS_VERIFIER.json",
  "02_AI_PANELS/broad/R44P45_AI_PANELS_SUMMARY.json",
  "03_OVERLOAD/R44P45_ANALYZER_RESILIENCE.json",
  "03_OVERLOAD/R44P45_ANALYZER_OVERLOAD.json",
  "05_CURRENT_CHILD_QA/R44P45_STATIC_QA_SUMMARY.json",
  "05_CURRENT_CHILD_QA/R44P45_SOURCE_AUDIT.json",
  "00_CURRENT_STATE/R44P45_FINAL_TEST_LEDGER.json",
  "00_CURRENT_STATE/R44P45_SCORECARD.json",
  "00_CURRENT_STATE/R44P45_PRODUCT_TIER_VALUE_MATRIX.json",
  "00_CURRENT_STATE/R44P45_EXTERNAL_HUMAN_PROOF.json",
]) add(`exists:${relative}`, exists(relative));

if (rows.every((row) => row.passed)) {
  const interaction = json("01_ACCURACY_DELTA/interaction/R44P45_INTERACTION_CONTEXT_SUMMARY.json");
  add("interaction-revision", interaction.revisionId === REV, interaction.revisionId);
  add("interaction-controls", interaction.publicControlCandidates === 29, interaction.publicControlCandidates);
  add("interaction-control-alerts-zero", interaction.publicControlCandidatesWithAlerts === 0, interaction.publicControlCandidatesWithAlerts);
  add("interaction-synthetic", interaction.syntheticCases === 13 && interaction.syntheticPass === 13 && interaction.syntheticFail === 0);
  add("interaction-no-formal-fpr", interaction.formalFalsePositiveRateCredit === false && interaction.formalPrecisionCredit === false);
  add("interaction-no-promotion", interaction.independentHumanAdjudicationCredit === false && interaction.customerCredit === false && interaction.saleCredit === false && interaction.liveCredit === false);

  const holdout = json("01_ACCURACY_DELTA/public_holdout_current/R44P43_PUBLIC_BALANCED_HOLDOUT_SUMMARY.json");
  add("holdout-public-cases", holdout.positiveEvaluation.publicCases === 69, holdout.positiveEvaluation.publicCases);
  add("holdout-supported", holdout.positiveEvaluation.supportedCategoryCases === 29 && holdout.positiveEvaluation.analyzedWithExactCompilerAndCompactAst === 22);
  add("holdout-detection-preserved", holdout.positiveEvaluation.supportedSignalsDetected === 22 && holdout.positiveEvaluation.supportedSignalsMissed === 0);
  add("holdout-withheld", holdout.positiveEvaluation.withheldSupportedCases === 7, holdout.positiveEvaluation.withheldSupportedCases);
  add("holdout-controls", holdout.controlCandidateEvaluation.publicCandidates === 29 && holdout.controlCandidateEvaluation.candidatesWithRootAlerts === 0);
  add("holdout-no-formal-score", holdout.formalMetricAvailability.formalPositivePredictiveValueAvailable === false && holdout.formalMetricAvailability.formalNegativeControlRateAvailable === false && holdout.formalMetricAvailability.singleOverallScoreAllowed === false);

  const repeat = json("01_ACCURACY_DELTA/R44P45_REPEATABILITY.json");
  add("repeatability-ok", repeat.ok === true && repeat.checks.length === 7 && repeat.checks.every((row) => row.byteIdentical === true));
  add("repeatability-no-external-credit", Object.values(repeat.creditBoundary).every((value) => value === false));

  const interactionVerifier = json("01_ACCURACY_DELTA/R44P45_INTERACTION_CONTEXT_VERIFIER.json");
  add("interaction-verifier", interactionVerifier.ok === true && interactionVerifier.failed.length === 0 && interactionVerifier.checks.every((row) => row.ok === true));
  const tamper = json("01_ACCURACY_DELTA/R44P45_INTERACTION_CONTEXT_TAMPER.json");
  add("interaction-tamper", tamper.passed === 12 && tamper.total === 12 && tamper.rows.every((row) => row.rejected === true));

  const targetedCustomer = json("02_AI_PANELS/targeted/R44P45_AI_CUSTOMER_PANEL.json");
  const targetedReviewer = json("02_AI_PANELS/targeted/R44P45_AI_REVIEWER_PANEL.json");
  const targetedVerifier = json("02_AI_PANELS/targeted/R44P45_AI_PANELS_VERIFIER.json");
  add("targeted-ai-customers", targetedCustomer.evidenceClass === "AI_SIMULATED" && targetedCustomer.sessions === 24 && targetedCustomer.personas === 8 && targetedCustomer.rows.every((row) => row.externalHumanProofCredit === false && row.realWillingnessToPayCredit === false));
  add("targeted-ai-reviewers", targetedReviewer.evidenceClass === "AI_SIMULATED" && targetedReviewer.reviewers.length === 12 && targetedReviewer.assessments === 180 && targetedReviewer.independentHumanReviewers === 0 && targetedReviewer.externalReviewerProof === 0);
  add("targeted-ai-verifier", targetedVerifier.ok === true && targetedVerifier.checks.every((row) => row.ok === true));

  const broad = json("02_AI_PANELS/broad/R44P45_AI_PANELS_SUMMARY.json");
  add("broad-ai-panel", broad.classification === "AI_SIMULATED" && broad.customerSessions === 60 && broad.reviewerAssessments === 60 && broad.realParticipants === 0 && broad.externalReviewers === 0);
  add("broad-candidates-not-proof", broad.falseNegativeCandidates === 2 && broad.falsePositiveCandidates === 2 && broad.customerProofCredit === 0 && broad.independentReviewerCredit === 0 && broad.realWillingnessToPayCredit === 0);

  const resilience = json("03_OVERLOAD/R44P45_ANALYZER_RESILIENCE.json");
  add("resilience-25", resilience.summary.executions === 25 && resilience.summary.passed === 25 && resilience.summary.failed === 0);
  add("resilience-no-production", resilience.summary.productionCapacityCredit === false && resilience.summary.tenUserCredit === false && resilience.summary.hundredUserCredit === false && resilience.summary.thousandUserCredit === false);
  const overload = json("03_OVERLOAD/R44P45_ANALYZER_OVERLOAD.json");
  add("overload-local-1-10-100-1000", JSON.stringify(overload.rows.map((row) => row.tasks)) === JSON.stringify([1,10,100,1000]) && overload.rows.every((row) => row.passed === true && row.fakeResultCount === 0));
  add("overload-no-production", overload.productionLoadCredit === false && overload.stagingLoadCredit === false && overload.customerCredit === false && overload.saleCredit === false && overload.liveCredit === false);

  const staticQa = json("05_CURRENT_CHILD_QA/R44P45_STATIC_QA_SUMMARY.json");
  add("targeted-eslint", staticQa.targetedEslint.exitCode === 0 && staticQa.targetedEslint.errors === 0 && staticQa.targetedEslint.warnings === 0);
  add("full-typescript", staticQa.fullSemanticTypeScript.exitCode === 0 && staticQa.fullSemanticTypeScript.diagnostics === 0);
  const sourceAudit = json("05_CURRENT_CHILD_QA/R44P45_SOURCE_AUDIT.json");
  add("source-audit", sourceAudit.findings.syntaxErrorFileCount === 0 && sourceAudit.findings.unresolvedLocalImportCount === 0 && sourceAudit.findings.undeclaredPackageImportCount === 0 && sourceAudit.findings.secretCandidateCount === 0);

  const ledger = json("00_CURRENT_STATE/R44P45_FINAL_TEST_LEDGER.json");
  add("ledger-revision", ledger.revisionId === REV, ledger.revisionId);
  add("ledger-no-promotion", ledger.globalDecision === "NO_GO" && ledger.LIVE === false && ledger.saleEnabled === false && ledger.productionApproved === false && ledger.worldClassProven === false);
  add("ledger-external-zero", ledger.externalHumanProof?.realParticipants === 0 && ledger.externalHumanProof?.independentReviewersCompleted === 0 && ledger.externalHumanProof?.realWillingnessToPay === 0);

  const score = json("00_CURRENT_STATE/R44P45_SCORECARD.json");
  add("score-revision", score.revisionId === REV);
  add("score-external-zero", score.project.realCustomerProof === 0 && score.project.realWillingnessToPay === 0 && score.project.independentReviewersCompleted === 0);
  add("score-no-unrelated-movement", score.products.filter((row) => !row.name.startsWith("Audit ")).every((row) => row.deltaQuality === 0));

  const matrix = json("00_CURRENT_STATE/R44P45_PRODUCT_TIER_VALUE_MATRIX.json");
  add("tier-matrix-33", matrix.revisionId === REV && matrix.rows.length === 33, matrix.rows.length);
  const external = json("00_CURRENT_STATE/R44P45_EXTERNAL_HUMAN_PROOF.json");
  add("external-human-zero", external.revisionId === REV && Object.entries(external).filter(([key, value]) => typeof value === "number" && key !== "requiredExternalReviewers").every(([, value]) => value === 0) && external.AIContributesZero === true);
}

const failed = rows.filter((row) => !row.passed);
const output = {
  schemaVersion: "velmere.pass36.a102r44p45.current-evidence-bundle-verifier.v1",
  revisionId: REV,
  status: failed.length ? "FAIL_R44P45_CURRENT_EVIDENCE_BUNDLE" : "PASS_R44P45_CURRENT_EVIDENCE_BUNDLE",
  checks: rows.length,
  passed: rows.length - failed.length,
  failed: failed.length,
  rows,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
