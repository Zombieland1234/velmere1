import { readFileSync } from "node:fs";
import path from "node:path";

import { countBy, receiptWithDigest, verifyReceiptDigest } from "./shared.ts";

type Tier = "basic" | "pro" | "advanced";

interface CustomerRow {
  executionId: string;
  personaId: string;
  personaRole: string;
  locale: string;
  device: string;
  expertise: string;
  stepOrdinal: number;
  productRowId: string | null;
  fixtureState: string;
  adversarialKind: string | null;
  verdict: string;
  assertions: { adversarialInstructionRejected: boolean };
  observed: { taskCompleted: boolean; customerFinal: boolean };
  customerFinalCredit: number;
  realCustomerCredit: number;
}

interface AuditCase {
  caseId: string;
  split: string;
  fixtureSha256: string;
  groundTruth: string;
}

interface TierCell {
  cellId: string;
  caseId: string;
  split: string;
  tier: Tier;
  locale: string;
  fixtureSha256: string;
  groundTruth: string;
  adversarialProbe: { ignored: boolean };
  legacyAdvancedHumanGateConflict?: boolean;
  historicalPass16Divergence?: boolean;
  currentContract?: {
    revision: string;
    expectedOutcome: string;
    requiresHumanReview: boolean;
    automatedInformational: boolean;
  };
  customerFinalCredit: number;
  productAccuracyCredit: number;
}

interface ReviewRow {
  evaluationId: string;
  reviewerId: string;
  sourceCaseIdRetainedForAdjudication: string;
  split: string;
  tier: Tier;
  organizationalIndependence: boolean;
  independentReviewerCredit: number;
  customerFinalCredit: number;
  productAccuracyCredit: number;
  adversarialProbeDetectedAndRejected: boolean;
}

interface CampaignReceipt extends Record<string, unknown> {
  schemaVersion: string;
  classification: string;
  evidenceSha256: string;
  runtimeBoundary: {
    sourceWrites: number;
    providerNetworkCalls: number;
    modelCalls: number;
    credentialsRead: number;
    output: string;
  };
  customerCampaign: {
    personas: number;
    stepsPerPersona: number;
    journeyExecutions: number;
    productInteractions: number;
    sharedLifecycleInteractions: number;
    exactProductRows: number;
    sourceTruth: { customerFinal: string; allRowsWithheld: boolean };
    adversarialExecutions: number;
    adversarialRejected: number;
    simulatedOraclePasses: number;
    simulatedOracleFailures: number;
    productTaskCompletions: number;
    personasRegistry: Array<{ personaId: string; locale: string; device: string; expertise: string; role: string }>;
    rows: CustomerRow[];
    credits: { customerFinal: number; realCustomer: number; willingnessToPay: number; sale: boolean; live: boolean; worldClass: boolean };
  };
  auditReviewerCampaign: {
    noCherryPick: { manifestCases: number; includedCases: number; excludedCases: number; allFixtureHashesVerified: boolean; uniqueFixtureHashes: number };
    cases: number;
    matchedTierCells: number;
    reviewerRoles: number;
    reviewerEvaluations: number;
    evaluationsPerCell: number;
    adversarialTierCells: number;
    adversarialProbesRejected: number;
    disagreementCells: number;
    simulatedOracleDraftConfusionExactCorpusOnly: { tp: number; tn: number; fp: number; fn: number; withheldAmbiguous: number };
    productRuntimeConfusion: null;
    legacyAdvancedHumanGateConflicts?: number;
    historicalPass16AdvancedDivergences?: number;
    currentAdvancedAutomaticCells?: number;
    currentCellsWithheldSolelyForMissingHumanReview?: number;
    currentContractBinding?: {
      revision: string;
      advancedHumanReviewRequired: boolean;
      advancedAnalysisMode: string;
      normalizationRequiresHumanReview: boolean;
    };
    casesRegistry: AuditCase[];
    tierCells: TierCell[];
    reviewerEvaluationRows: ReviewRow[];
    adjudications: Array<{ cellId: string; tier: Tier; reviewerCount: number; disagreementPreserved: boolean; adjudication: string; customerReleaseEligible: boolean; customerFinalCredit: number }>;
    credits: { customerFinal: number; productAccuracy: number; independentReviewer: number; realCustomer: number; sale: boolean; live: boolean; worldClass: boolean };
  };
  globalCredits: {
    customerFinal: number;
    realCustomer: number;
    productAccuracy: number;
    independentReviewer: number;
    externalProof: number;
    sale: boolean;
    live: boolean;
    worldClass: boolean;
  };
}

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (key?.startsWith("--") && value !== undefined) args.set(key.slice(2), value);
}
const receiptArg = args.get("receipt");
if (receiptArg === undefined) throw new Error("V4_AI_CAMPAIGN_VERIFY:missing --receipt");
const receiptPath = path.resolve(receiptArg);
const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as CampaignReceipt;

const checks: Array<{ name: string; ok: boolean; detail?: unknown }> = [];
const failures: Array<{ name: string; detail?: unknown }> = [];
function record(name: string, ok: boolean, detail?: unknown): void {
  const row = detail === undefined ? { name, ok } : { name, ok, detail };
  checks.push(row);
  if (!ok) failures.push(detail === undefined ? { name } : { name, detail });
}

record("receipt:digest", verifyReceiptDigest(receipt));
record("receipt:schema", receipt.schemaVersion === "velmere.p101r1.v4-ai-campaigns.current-byte.v1", receipt.schemaVersion);
record("receipt:classification", receipt.classification === "AI_SIMULATED_BOUNDED_NO_PROVIDER_NO_CUSTOMER_FINAL_CREDIT");
record(
  "runtime:zero-provider-credential-source-write",
  receipt.runtimeBoundary.sourceWrites === 0 &&
    receipt.runtimeBoundary.providerNetworkCalls === 0 &&
    receipt.runtimeBoundary.modelCalls === 0 &&
    receipt.runtimeBoundary.credentialsRead === 0 &&
    receipt.runtimeBoundary.output === "STDOUT_ONLY",
  receipt.runtimeBoundary,
);

const customer = receipt.customerCampaign;
record("customer:personas-100", customer.personas === 100 && customer.personasRegistry.length === 100, customer.personas);
record("customer:steps-per-persona-24", customer.stepsPerPersona === 24);
record("customer:journey-2400", customer.journeyExecutions === 2400 && customer.rows.length === 2400, customer.rows.length);
record("customer:product-shared-counts", customer.productInteractions === 2000 && customer.sharedLifecycleInteractions === 400);
record("customer:exact-20-products", customer.exactProductRows === 20);
record("customer:unique-personas", new Set(customer.personasRegistry.map((row) => row.personaId)).size === 100);

const customerRowsByPersona = new Map<string, CustomerRow[]>();
for (const row of customer.rows) {
  const group = customerRowsByPersona.get(row.personaId) ?? [];
  group.push(row);
  customerRowsByPersona.set(row.personaId, group);
}
record(
  "customer:every-persona-exact-24-steps",
  [...customerRowsByPersona.values()].every(
    (rows) => rows.length === 24 && new Set(rows.map((row) => row.stepOrdinal)).size === 24 && Math.min(...rows.map((row) => row.stepOrdinal)) === 1 && Math.max(...rows.map((row) => row.stepOrdinal)) === 24,
  ),
  countBy(customer.rows, (row) => row.personaId),
);

const productRows = customer.rows.filter((row) => row.productRowId !== null);
const productCoverage = countBy(productRows, (row) => row.productRowId ?? "missing");
record("customer:all-20-products-covered-100-times", Object.keys(productCoverage).length === 20 && Object.values(productCoverage).every((count) => count === 100), productCoverage);
record(
  "customer:fixture-states-exact-480-each",
  JSON.stringify(countBy(customer.rows, (row) => row.fixtureState)) === JSON.stringify({ ERROR: 480, PARTIAL: 480, STALE: 480, SUCCESS: 480, WITHHELD: 480 }),
  countBy(customer.rows, (row) => row.fixtureState),
);
record(
  "customer:locale-distribution",
  JSON.stringify(countBy(customer.rows, (row) => row.locale)) === JSON.stringify({ de: 792, en: 792, pl: 816 }),
  countBy(customer.rows, (row) => row.locale),
);
record(
  "customer:device-distribution",
  JSON.stringify(countBy(customer.rows, (row) => row.device)) === JSON.stringify({ desktop: 1200, mobile: 1200 }),
  countBy(customer.rows, (row) => row.device),
);
record("customer:expertise-four-levels", Object.keys(countBy(customer.personasRegistry, (row) => row.expertise)).length === 4);
record("customer:required-role-count", Object.keys(countBy(customer.personasRegistry, (row) => row.role)).length === 13);
record("customer:source-truth-zero-final", customer.sourceTruth.customerFinal === "0/20" && customer.sourceTruth.allRowsWithheld);
record("customer:all-oracle-pass", customer.simulatedOraclePasses === 2400 && customer.simulatedOracleFailures === 0 && customer.rows.every((row) => row.verdict === "PASS_SIMULATED_TRUTH_ORACLE"));
record(
  "customer:adversarial-preserved",
  customer.adversarialExecutions >= 100 && customer.adversarialExecutions === customer.adversarialRejected && customer.rows.filter((row) => row.adversarialKind !== null).every((row) => row.assertions.adversarialInstructionRejected),
  { executions: customer.adversarialExecutions, rejected: customer.adversarialRejected },
);
record("customer:no-product-completion", customer.productTaskCompletions === 0 && productRows.every((row) => !row.observed.taskCompleted));
record(
  "customer:zero-credit",
  customer.credits.customerFinal === 0 &&
    customer.credits.realCustomer === 0 &&
    customer.credits.willingnessToPay === 0 &&
    !customer.credits.sale &&
    !customer.credits.live &&
    !customer.credits.worldClass &&
    customer.rows.every((row) => row.customerFinalCredit === 0 && row.realCustomerCredit === 0 && row.observed.customerFinal === false),
);

const audit = receipt.auditReviewerCampaign;
record(
  "audit:no-cherry-pick-50",
  audit.noCherryPick.manifestCases === 50 &&
    audit.noCherryPick.includedCases === 50 &&
    audit.noCherryPick.excludedCases === 0 &&
    audit.noCherryPick.allFixtureHashesVerified &&
    audit.noCherryPick.uniqueFixtureHashes === 50,
  audit.noCherryPick,
);
record("audit:cases-50", audit.cases === 50 && audit.casesRegistry.length === 50 && new Set(audit.casesRegistry.map((row) => row.caseId)).size === 50);
record(
  "audit:splits-30-10-10",
  JSON.stringify(countBy(audit.casesRegistry, (row) => row.split)) === JSON.stringify({ development: 30, holdout: 10, validation: 10 }),
  countBy(audit.casesRegistry, (row) => row.split),
);
record("audit:tier-cells-150", audit.matchedTierCells === 150 && audit.tierCells.length === 150 && new Set(audit.tierCells.map((row) => row.cellId)).size === 150);
record(
  "audit:tiers-50-each",
  JSON.stringify(countBy(audit.tierCells, (row) => row.tier)) === JSON.stringify({ advanced: 50, basic: 50, pro: 50 }),
  countBy(audit.tierCells, (row) => row.tier),
);
record(
  "audit:locale-50-each",
  JSON.stringify(countBy(audit.tierCells, (row) => row.locale)) === JSON.stringify({ de: 50, en: 50, pl: 50 }),
  countBy(audit.tierCells, (row) => row.locale),
);

const cellsByCase = new Map<string, TierCell[]>();
for (const cell of audit.tierCells) {
  const group = cellsByCase.get(cell.caseId) ?? [];
  group.push(cell);
  cellsByCase.set(cell.caseId, group);
}
record(
  "audit:matched-same-input-through-three-tiers",
  [...cellsByCase.values()].every(
    (rows) => rows.length === 3 && new Set(rows.map((row) => row.tier)).size === 3 && new Set(rows.map((row) => row.fixtureSha256)).size === 1,
  ),
);
record("audit:reviewer-evaluations-900", audit.reviewerRoles === 6 && audit.reviewerEvaluations === 900 && audit.reviewerEvaluationRows.length === 900);

const reviewsByCell = new Map<string, ReviewRow[]>();
for (const review of audit.reviewerEvaluationRows) {
  const key = `${review.sourceCaseIdRetainedForAdjudication}__${review.tier}`;
  const group = reviewsByCell.get(key) ?? [];
  group.push(review);
  reviewsByCell.set(key, group);
}
record(
  "audit:exact-six-distinct-roles-per-cell",
  reviewsByCell.size === 150 && [...reviewsByCell.values()].every((rows) => rows.length === 6 && new Set(rows.map((row) => row.reviewerId)).size === 6),
  { cells: reviewsByCell.size },
);
record(
  "audit:reviewer-split-counts",
  JSON.stringify(countBy(audit.reviewerEvaluationRows, (row) => row.split)) === JSON.stringify({ development: 540, holdout: 180, validation: 180 }),
  countBy(audit.reviewerEvaluationRows, (row) => row.split),
);
record(
  "audit:adversarial-rejected",
  audit.adversarialTierCells === 150 &&
    audit.adversarialProbesRejected === 150 &&
    audit.tierCells.every((row) => row.adversarialProbe.ignored) &&
    audit.reviewerEvaluationRows.every((row) => row.adversarialProbeDetectedAndRejected),
);
record("audit:disagreement-preserved", audit.disagreementCells > 0 && audit.adjudications.some((row) => row.disagreementPreserved), audit.disagreementCells);
record(
  "audit:exact-simulated-oracle-confusion",
  JSON.stringify(audit.simulatedOracleDraftConfusionExactCorpusOnly) === JSON.stringify({ tp: 72, tn: 72, fp: 0, fn: 0, withheldAmbiguous: 6 }) && audit.productRuntimeConfusion === null,
  audit.simulatedOracleDraftConfusionExactCorpusOnly,
);
record(
  "audit:historical-pass16-advanced-divergence-retained-as-metadata",
  audit.historicalPass16AdvancedDivergences === 50 &&
    audit.tierCells.filter((row) => row.tier === "advanced").every((row) => row.historicalPass16Divergence === true),
  audit.historicalPass16AdvancedDivergences,
);
record(
  "audit:current-pass36-automatic-advanced-bound",
  audit.currentAdvancedAutomaticCells === 50 &&
    audit.currentContractBinding?.revision === "A102R44P2" &&
    audit.currentContractBinding.advancedHumanReviewRequired === false &&
    audit.currentContractBinding.advancedAnalysisMode === "automated_informational" &&
    audit.currentContractBinding.normalizationRequiresHumanReview === false &&
    audit.tierCells
      .filter((row) => row.tier === "advanced")
      .every(
        (row) =>
          row.currentContract?.revision === "A102R44P2" &&
          row.currentContract.expectedOutcome === "automated_advanced_informational_analysis" &&
          row.currentContract.requiresHumanReview === false &&
          row.currentContract.automatedInformational === true,
      ),
  audit.currentContractBinding,
);
record(
  "audit:no-current-withhold-solely-for-missing-human-review",
  audit.currentCellsWithheldSolelyForMissingHumanReview === 0 &&
    audit.adjudications
      .filter((row) => row.tier === "advanced")
      .every((row) => !row.adjudication.includes("HUMAN") && !row.adjudication.includes("LEGACY_TIER_CONTRACT")),
  audit.currentCellsWithheldSolelyForMissingHumanReview,
);
record(
  "audit:zero-credit",
  audit.credits.customerFinal === 0 &&
    audit.credits.productAccuracy === 0 &&
    audit.credits.independentReviewer === 0 &&
    audit.credits.realCustomer === 0 &&
    !audit.credits.sale &&
    !audit.credits.live &&
    !audit.credits.worldClass &&
    audit.tierCells.every((row) => row.customerFinalCredit === 0 && row.productAccuracyCredit === 0) &&
    audit.reviewerEvaluationRows.every(
      (row) => !row.organizationalIndependence && row.independentReviewerCredit === 0 && row.customerFinalCredit === 0 && row.productAccuracyCredit === 0,
    ) &&
    audit.adjudications.every((row) => !row.customerReleaseEligible && row.customerFinalCredit === 0),
);
record(
  "global:zero-credit",
  receipt.globalCredits.customerFinal === 0 &&
    receipt.globalCredits.realCustomer === 0 &&
    receipt.globalCredits.productAccuracy === 0 &&
    receipt.globalCredits.independentReviewer === 0 &&
    receipt.globalCredits.externalProof === 0 &&
    !receipt.globalCredits.sale &&
    !receipt.globalCredits.live &&
    !receipt.globalCredits.worldClass,
);

const verificationCore = {
  schemaVersion: "velmere.p101r1.v4-ai-campaigns.verification.v1",
  status: failures.length === 0 ? "PASS_V4_AI_CAMPAIGNS_EXACT_COUNTS_BOUNDED_CREDIT" : "FAIL_V4_AI_CAMPAIGNS",
  classification: "AI_SIMULATED_BOUNDED_VERIFICATION_NO_CUSTOMER_FINAL_CREDIT",
  receiptInput: "EXTERNAL_PATH_NOT_EMBEDDED_TO_PRESERVE_CONTENT_DETERMINISM",
  receiptEvidenceSha256: receipt.evidenceSha256,
  counts: {
    checks: checks.length,
    passed: checks.filter((row) => row.ok).length,
    failed: failures.length,
    personas: customer.personas,
    journeyExecutions: customer.journeyExecutions,
    auditCases: audit.cases,
    auditTierCells: audit.matchedTierCells,
    reviewerRoles: audit.reviewerRoles,
    reviewerEvaluations: audit.reviewerEvaluations,
  },
  checks,
  failures,
  truthBoundary: "This verifies exact deterministic registries and bounded simulated judgments only. It grants zero Customer FINAL, product accuracy, independent review, sale, LIVE or world-class credit.",
};

const verification = receiptWithDigest(verificationCore);
process.stdout.write(`${JSON.stringify(verification, null, 2)}\n`);
if (failures.length > 0) process.exit(1);
