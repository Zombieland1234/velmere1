#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const read = (file) => fs.readFileSync(file, "utf8");
const json = (file) => JSON.parse(read(file));
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

const currentPolicy = json("config/pass36/a102r44p2-audit-lens-output-adapter-policy.json");
const historicalPolicy = json("config/pass18/audit-lens-output-adapter-policy.json");
const currentContract = json("config/pass36/a102r44p2-worldclass-output-contract.json");
const historicalContract = json("config/pass16/worldclass-output-contract.json");
const severity = json("config/pass36/a102r44p2-audit-severity-registry.json");
const toolchain = json("config/pass36/a102r44p2-official-toolchain-policy.json");

check("history:pass18-human-review-policy-preserved", historicalPolicy.smartContractAudit.advancedRequiresRealHumanReview === true);
check("history:pass16-human-review-contract-preserved", historicalContract.advancedAuditHumanReview.required === true);
check("current:advanced-automated-informational", currentPolicy.smartContractAudit.advancedRequiresRealHumanReview === false && currentPolicy.smartContractAudit.automatedAdvancedAnalysisMode === "automated_informational");
check("current:human-review-claim-requires-receipt", currentPolicy.smartContractAudit.advancedHumanReviewClaimRequiresReceipt === true && currentContract.advancedAuditHumanReview.required === false && currentContract.advancedAuditHumanReview.claimRequiresValidReceipt === true);
check("current:advanced-three-family-floor", currentPolicy.smartContractAudit.minimumAnalyzerFamilies.advanced === 3 && currentContract.tierRequirements.advanced.minimumIndependentSourceFamilies === 3 && currentContract.advancedAuditAutomatedInformational.minimumIndependentSourceFamilies === 3);
check("current:no-independent-certification", currentPolicy.smartContractAudit.independentCertificationClaimAllowed === false && currentContract.advancedAuditAutomatedInformational.independentCertificationClaimAllowed === false);
check("current:no-personalised-advice", currentPolicy.smartContractAudit.personalisedAdviceAllowed === false && currentContract.advancedAuditAutomatedInformational.personalisedAdviceAllowed === false);
check("current:no-security-guarantee", currentPolicy.smartContractAudit.securityGuaranteeAllowed === false && currentContract.advancedAuditAutomatedInformational.securityGuaranteeAllowed === false);
check("severity:registry-nontrivial", Object.keys(severity.entries).length >= 26 && severity.entries.external_call_before_state_update.severity === "high" && severity.entries.ambiguous_control_requires_review.severity === "informational");
check("tools:denominator-200", toolchain.tools.length === 4 && toolchain.caseDenominator === 50 && toolchain.plannedExecutionDenominator === 200);

const adapter = read("lib/worldclass/audit-lens-output-adapter.mjs");
const scorer = read("lib/worldclass/output-scorer.mjs");
check("adapter:issuer-velmere-security", adapter.includes('issuer: "Velmère Security"'));
check("adapter:paid-candidate-fail-closed", adapter.includes("paidInformationalCandidate: false"));
check("adapter:invalid-review-only-affects-advanced", adapter.includes('matrixRow.tier === "advanced" && reviewPresent && !reviewOk'));
check("scorer:automated-boundary-enforced", scorer.includes("advanced_audit_independent_certification_claim_forbidden") && scorer.includes("advanced_audit_human_review_claim_without_receipt"));

const lens = read("lib/search/lens-report.ts");
const forge = read("lib/market-integrity/pdf-forge-intelligence.ts");
const cockpit = read("lib/market-integrity/a4-decision-cockpit.ts");
const client = read("components/search/VelmereIntelligenceSearchClient.tsx");
for (const [id, source] of [["lens", lens], ["forge", forge], ["cockpit", cockpit], ["client", client]]) {
  check(`branding:${id}:velmere-security`, source.includes("Velmère Security"));
  check(`branding:${id}:legacy-cybersecurity-removed`, !source.includes("Velmère Cybersecurity"));
}
check("branding:lens:automated-engine", lens.includes("Velmère Security Engine"));
check("branding:lens:integrity", /integralność dokumentu|document integrity|Dokumentintegrität/u.test(lens));
check("branding:lens:no-independent-certification", /nie jest niezależną certyfikacją|not an independent certification|keine unabhängige Zertifizierung/u.test(lens));
check("branding:lens:no-human-review-claim", /nie jest.*human-review|not.*human review|kein Human Review/u.test(lens));
check("branding:plain-language-not-human-brief", lens.includes("Plain-language brief") && !lens.includes('title: "Human brief"') && client.includes('brief: "Plain-language brief"'));

for (const script of [
  "lib/worldclass/audit-lens-output-adapter.mjs",
  "lib/worldclass/output-scorer.mjs",
  "scripts/pass36/verify-a102r44p2-automated-audit-tier-value.mjs",
  "scripts/pass36/probe-a102r44p2-official-audit-toolchain.mjs",
]) {
  const run = spawnSync(process.execPath, ["--check", script], { cwd: process.cwd(), encoding: "utf8", shell: false, windowsHide: true });
  check(`syntax:${script}`, run.status === 0 && !(run.stderr ?? "").trim(), { status: run.status, stderr: run.stderr });
}
const auditRun = spawnSync(process.execPath, ["scripts/pass36/verify-a102r44p2-automated-audit-tier-value.mjs"], { cwd: process.cwd(), encoding: "utf8", shell: false, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
let auditReceipt = null;
try { auditReceipt = JSON.parse(auditRun.stdout); } catch { /* Contract check below rejects missing JSON. */ }
check("runtime:audit-tier-verifier", auditRun.status === 0 && !(auditRun.stderr ?? "").trim() && auditReceipt?.matrixRows === 450 && auditReceipt?.contractPass === 450 && auditReceipt?.differentiationPass === 150 && auditReceipt?.officialToolExecutions === 0 && auditReceipt?.paidInformationalReleaseCredit === false, { status: auditRun.status, stderr: auditRun.stderr, receipt: auditReceipt });
const toolRun = spawnSync(process.execPath, ["scripts/pass36/probe-a102r44p2-official-audit-toolchain.mjs"], { cwd: process.cwd(), encoding: "utf8", shell: false, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
let toolReceipt = null;
try { toolReceipt = JSON.parse(toolRun.stdout); } catch { /* Contract check below rejects missing JSON. */ }
check("runtime:tool-probe-honest-zero-credit", toolRun.status === 0 && !(toolRun.stderr ?? "").trim() && toolReceipt?.plannedRows === 200 && toolReceipt?.officialExecutions === 0 && toolReceipt?.officialExecutionCredit === false, { status: toolRun.status, stderr: toolRun.stderr, receipt: toolReceipt });

const failed = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a102r44p2.paid-informational-claim-boundary-test.v1",
  status: failed.length ? "FAIL_A102R44P2_PAID_INFORMATIONAL_CLAIM_BOUNDARY" : "PASS_A102R44P2_PAID_INFORMATIONAL_CLAIM_BOUNDARY_LOCAL_ONLY",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  paidInformationalReleaseCredit: false,
  humanReviewedAuditCredit: false,
  independentCertificationCredit: false,
  failures: failed,
  results: checks,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
