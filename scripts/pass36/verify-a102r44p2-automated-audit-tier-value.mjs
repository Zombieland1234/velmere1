#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  buildWorldclassSmartContractAuditOutput,
  buildAuditLensEvidenceReceipt,
} from "../../lib/worldclass/audit-lens-output-adapter.mjs";
import { scoreWorldclassOutput } from "../../lib/worldclass/output-scorer.mjs";
import { commonImplementationDigest } from "../worldclass/common-implementation-digest.mjs";

const root = process.cwd();
const NOW = "2026-08-02T07:00:00.000Z";
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const sha256 = (value) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
const clone = (value) => JSON.parse(JSON.stringify(value));

const corpus = readJson("evaluation/pass16/worldclass-base-corpus.json");
const contract = readJson("config/pass36/a102r44p2-worldclass-output-contract.json");
const policy = readJson("config/pass36/a102r44p2-audit-lens-output-adapter-policy.json");
const severityRegistry = readJson("config/pass36/a102r44p2-audit-severity-registry.json");
const fixtureEnvelope = readJson("evaluation/pass18/audit-lens-evidence-fixtures.json");
const matrixRows = fs.readFileSync("evaluation/pass16/worldclass-2700-matrix.jsonl", "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const cases = corpus.cases.filter((row) => row.surface === "smart_contract_audit");
const caseById = new Map(cases.map((row) => [row.id, row]));
const fixtureByCase = new Map(fixtureEnvelope.fixtures.filter((row) => row.surface === "smart_contract_audit").map((row) => [row.caseId, row]));
const sourceTree = commonImplementationDigest(root);

function normalizeCurrentMatrix(row) {
  const current = clone(row);
  if (current.tier === "advanced") {
    current.expectedOutcome = "automated_advanced_informational_analysis";
    current.requiresHumanReview = false;
    current.minSourceFamilies = 3;
  }
  current.currentContractRevision = "A102R44P2";
  return current;
}
function currentRemediation(id) {
  return `Apply a source-bound mitigation for ${id.replaceAll("_", " ")}, add a negative regression test and reproduce the finding with pinned official tools. Human-review and certification claims remain disabled without a valid receipt.`;
}
function currentFixture(packet) {
  const value = clone(packet);
  for (const analysis of value.analyses ?? []) {
    for (const finding of analysis.findings ?? []) {
      const rule = severityRegistry.entries[finding.id] ?? severityRegistry.default;
      finding.severity = rule.severity;
      finding.rationale = `${rule.rationale} Local benchmark fixture only; not deployed-contract detector proof.`;
      finding.remediation = currentRemediation(finding.id);
      finding.severityRegistryClass = rule.class;
    }
    analysis.payloadSha256 = sha256({ findings: analysis.findings ?? [], controls: analysis.controls ?? [], sourceSha256: analysis.sourceSha256 });
  }
  value.humanReview = null;
  value.truthBoundary = policy.truthBoundary;
  value.provenanceReceiptSha256 = buildAuditLensEvidenceReceipt(value);
  return value;
}
function execute(row, packet) {
  const corpusCase = caseById.get(row.caseId);
  const args = {
    matrixRow: row,
    corpusCase,
    evidencePacket: packet,
    sourceSha256: sourceTree.sha256,
    corpusSha256: corpus.corpusSha256,
    entitlementStatus: row.tier === "basic" ? "unverified" : "verified",
    policy,
  };
  const output = buildWorldclassSmartContractAuditOutput(args);
  const repeated = buildWorldclassSmartContractAuditOutput(args);
  const score = scoreWorldclassOutput({ matrixRow: row, output, contract, corpusSha256: corpus.corpusSha256 });
  return { args, output, score, deterministic: stable(output) === stable(repeated) };
}

const rows = matrixRows.filter((row) => row.surface === "smart_contract_audit").map(normalizeCurrentMatrix);
const records = [];
const pdfPackets = [];
const failures = [];
const outputsByGroup = new Map();
for (const row of rows) {
  const fixture = currentFixture(fixtureByCase.get(row.caseId));
  const { output, score, deterministic } = execute(row, fixture);
  const evidenceHashes = new Set(fixture.analyses.flatMap((analysis) => analysis.findings.flatMap((finding) => finding.evidence.map((item) => item.codeSha256))));
  const lineage = output.findings.every((finding) => finding.evidence.every((item) => evidenceHashes.has(item.codeSha256)));
  const expectedStatus = "passed";
  const record = {
    matrixId: row.matrixId,
    caseId: row.caseId,
    category: row.category,
    tier: row.tier,
    locale: row.locale,
    status: output.status,
    expectedStatus,
    contractOk: score.ok,
    contractScore: score.score,
    deterministic,
    lineage,
    evidenceFamilyCount: score.evidenceFamilyCount,
    findingCount: output.findings.length,
    highestSeverity: output.highestSeverity,
    analysisMode: output.analysisMode,
    claimBoundary: output.claimBoundary,
    tierValue: output.tierValue,
    paidInformationalCandidate: output.paidInformationalCandidate,
    outputSha256: sha256(output),
  };
  records.push(record);
  pdfPackets.push({
    schemaVersion: "velmere.pass36.a102r44p2.automated-audit-pdf-packet.v1",
    matrixId: row.matrixId,
    caseId: row.caseId,
    category: row.category,
    tier: row.tier,
    locale: row.locale,
    sourcePath: fixture.contract.sourcePath,
    sourceSha256: fixture.contract.sourceSha256,
    outputSha256: sha256(output),
    analysisMode: output.analysisMode,
    status: output.status,
    confidence: output.confidence,
    highestSeverity: output.highestSeverity,
    customerVerdict: output.customerVerdict,
    claimBoundary: output.claimBoundary,
    tierValue: output.tierValue,
    evidenceCoverage: output.evidenceCoverage,
    findings: output.findings,
    contradictions: output.contradictions,
    limitations: output.limitations,
    missingData: output.missingData,
    nextSafeCheck: output.nextSafeCheck,
    methodology: output.methodology ?? null,
    evidenceTable: output.evidenceTable,
    provenanceReceipt: output.provenanceReceipt,
    commercialRights: output.commercialRights,
    entitlementStatus: output.entitlementStatus,
  });
  const groupKey = `${row.caseId}:${row.locale}`;
  const group = outputsByGroup.get(groupKey) ?? {};
  group[row.tier] = output;
  outputsByGroup.set(groupKey, group);
  if (!score.ok || !deterministic || !lineage || output.status !== expectedStatus) failures.push({ matrixId: row.matrixId, status: output.status, scoreFailures: score.failures, deterministic, lineage });
}

let differentiationPass = 0;
for (const [groupKey, group] of outputsByGroup) {
  const additions = [group.basic, group.pro, group.advanced].map((output) => stable(output?.tierValue?.materialAdditions ?? []));
  const familyCounts = [group.basic, group.pro, group.advanced].map((output) => output?.tierValue?.evidenceFamilyCount ?? 0);
  const valid = group.basic && group.pro && group.advanced
    && new Set(additions).size === 3
    && familyCounts[0] >= 1 && familyCounts[1] >= 2 && familyCounts[2] >= 3
    && group.advanced.methodology?.mode === "automated_informational"
    && group.advanced.claimBoundary?.humanReviewIncluded === false
    && group.advanced.claimBoundary?.humanReviewClaimAllowed === false
    && group.advanced.claimBoundary?.independentCertificationClaimAllowed === false
    && group.advanced.claimBoundary?.personalisedAdviceAllowed === false
    && group.advanced.claimBoundary?.securityGuaranteeAllowed === false;
  if (valid) differentiationPass += 1;
  else failures.push({ groupKey, code: "tier_value_boundary_failed", additions, familyCounts });
}

const targeted = [];
const targetedCheck = (id, condition, detail = null) => targeted.push({ id, passed: Boolean(condition), detail });
const advancedRow = rows.find((row) => row.tier === "advanced" && row.locale === "en" && row.caseId === "smart_contract_audit-001-vault");
const baseFixture = currentFixture(fixtureByCase.get(advancedRow.caseId));
const automated = execute(advancedRow, baseFixture);
targetedCheck("advanced:automated-without-human-review-passes-content-contract", automated.output.status === "passed" && automated.score.ok, { status: automated.output.status, failures: automated.score.failures });
targetedCheck("advanced:claim-boundary-no-human-review-claim", automated.output.claimBoundary.humanReviewIncluded === false && automated.output.claimBoundary.humanReviewClaimAllowed === false && automated.output.humanReview === undefined, automated.output.claimBoundary);
targetedCheck("advanced:three-family-floor", automated.output.evidenceCoverage.analyzerFamilyCount === 3 && automated.output.evidenceCoverage.minimumAnalyzerFamilies === 3, automated.output.evidenceCoverage);
const validReviewFixture = clone(baseFixture);
validReviewFixture.humanReview = {
  authorityId: "reviewer-fixture-001",
  authorityKind: "real_human",
  reviewerRole: "authorized security reviewer",
  reviewStatus: "approved",
  reviewedAt: NOW,
  reviewReceiptSha256: sha256("a102r44p2-valid-human-review-fixture"),
};
const withReview = execute(advancedRow, validReviewFixture);
targetedCheck("advanced:valid-optional-human-review-is-bound", withReview.output.status === "passed" && withReview.score.ok && withReview.output.claimBoundary.humanReviewIncluded === true && withReview.output.claimBoundary.humanReviewClaimAllowed === true && withReview.output.humanReview?.reviewReceiptSha256 === validReviewFixture.humanReview.reviewReceiptSha256, withReview.output.claimBoundary);
const invalidReviewFixture = clone(baseFixture);
invalidReviewFixture.humanReview = { authorityId: "ai-agent", authorityKind: "automated_agent", reviewStatus: "approved", reviewerRole: "model", reviewedAt: NOW, reviewReceiptSha256: "not-a-hash" };
const invalidReview = execute(advancedRow, invalidReviewFixture);
targetedCheck("advanced:invalid-human-review-receipt-blocks", invalidReview.output.status === "blocked" && invalidReview.output.blockers.includes("human_review_receipt_invalid"), invalidReview.output.blockers);
const twoFamilyFixture = clone(baseFixture);
twoFamilyFixture.analyses = twoFamilyFixture.analyses.filter((row) => row.family !== "compiler_metadata");
const twoFamily = execute(advancedRow, twoFamilyFixture);
targetedCheck("advanced:two-family-output-blocked", twoFamily.output.status === "blocked" && twoFamily.output.blockers.includes("analyzer_family_floor_not_met"), twoFamily.output.blockers);
const tampered = clone(automated.output);
tampered.claimBoundary.independentCertificationClaimAllowed = true;
const tamperedScore = scoreWorldclassOutput({ matrixRow: advancedRow, output: tampered, contract, corpusSha256: corpus.corpusSha256 });
targetedCheck("advanced:certification-claim-tamper-rejected", !tamperedScore.ok && tamperedScore.failures.some((row) => row.code === "advanced_audit_independent_certification_claim_forbidden"), tamperedScore.failures);
const severityIds = new Set(Object.keys(severityRegistry.entries));
const corpusFindingIds = new Set(cases.flatMap((row) => row.input.expectedFindings ?? []).concat(["ambiguous_control_requires_review"]));
targetedCheck("severity-registry:covers-current-corpus", [...corpusFindingIds].every((id) => severityIds.has(id)), { missing: [...corpusFindingIds].filter((id) => !severityIds.has(id)) });
const highRiskRecord = records.find((row) => row.caseId === "smart_contract_audit-001-vault" && row.tier === "advanced" && row.locale === "en");
targetedCheck("severity:reentrancy-normalized-high", highRiskRecord?.highestSeverity === "high", highRiskRecord);
targetedCheck("truth:paid-informational-credit-remains-false", records.every((row) => row.paidInformationalCandidate === false), null);
targetedCheck("truth:no-independent-certification-claim", records.every((row) => row.claimBoundary.independentCertificationClaimAllowed === false), null);
targetedCheck("truth:no-personalised-advice-claim", records.every((row) => row.claimBoundary.personalisedAdviceAllowed === false), null);
targetedCheck("truth:no-security-guarantee-claim", records.every((row) => row.claimBoundary.securityGuaranteeAllowed === false), null);

for (const row of targeted.filter((item) => !item.passed)) failures.push({ code: row.id, detail: row.detail });
const byTier = Object.fromEntries(["basic", "pro", "advanced"].map((tier) => [tier, {
  rows: records.filter((row) => row.tier === tier).length,
  passed: records.filter((row) => row.tier === tier && row.status === "passed" && row.contractOk && row.deterministic && row.lineage).length,
  blocked: records.filter((row) => row.tier === tier && row.status === "blocked").length,
  evidenceFamilyFloor: Math.min(...records.filter((row) => row.tier === tier).map((row) => row.evidenceFamilyCount)),
}]));
const packetOutIndex = process.argv.indexOf("--packet-out");
if (packetOutIndex >= 0) {
  const resolved = path.resolve(process.argv[packetOutIndex + 1] ?? "");
  const sourcePrefix = `${path.resolve(root)}${path.sep}`;
  if (!resolved || resolved === path.resolve(root) || resolved.startsWith(sourcePrefix)) throw new Error("packet_output_must_be_outside_source_root");
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${pdfPackets.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

const result = {
  schemaVersion: "velmere.pass36.a102r44p2.automated-audit-tier-value-verification.v1",
  generatedAt: NOW,
  status: failures.length ? "FAIL_A102R44P2_AUTOMATED_AUDIT_TIER_VALUE" : "PASS_A102R44P2_AUTOMATED_AUDIT_TIER_VALUE_LOCAL_FIXTURE_ONLY",
  currentRevision: "A102R44P2",
  sourceSha256: sourceTree.sha256,
  sourceFiles: sourceTree.files,
  corpusSha256: corpus.corpusSha256,
  auditCases: cases.length,
  matrixRows: records.length,
  contractPass: records.filter((row) => row.contractOk).length,
  deterministicPass: records.filter((row) => row.deterministic).length,
  lineagePass: records.filter((row) => row.lineage).length,
  differentiationGroups: outputsByGroup.size,
  differentiationPass,
  targetedChecks: targeted.length,
  targetedPassed: targeted.filter((row) => row.passed).length,
  byTier,
  officialToolExecutions: 0,
  realAuditCases: 0,
  realTierOutputs: 0,
  paidInformationalReleaseCredit: false,
  humanReviewedAuditCredit: false,
  independentCertificationCredit: false,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  truthBoundary: policy.truthBoundary,
  failures,
  targeted,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
