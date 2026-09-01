import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const policyPath = "config/pass36/a102r44p7-advanced-incremental-evidence-policy.json";
const statePath = "config/pass36/a102r44p7-action-required-current-state.json";
const scorecardPath = "config/pass36/a102r44p7-advanced-value-scorecard.json";
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const policy = readJson(policyPath);
const state = readJson(statePath);
const scorecard = readJson(scorecardPath);
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

add("revision", policy.revisionId.includes("A102R44P7"), policy.revisionId);
add("parent", policy.parentRevisionId.includes("A102R44P6"), policy.parentRevisionId);
add("global", policy.globalDecision === "NO_GO" && !policy.live && !policy.saleEnabled && !policy.productionApproved && !policy.worldClassProven, policy.globalDecision);
add("denominator-cases", policy.denominators.cases === 50, policy.denominators.cases);
add("denominator-packets", policy.denominators.packetRows === 450 && policy.denominators.basicRows === 150 && policy.denominators.proRows === 150 && policy.denominators.advancedRows === 150, policy.denominators);
add("denominator-tools", policy.denominators.officialProcesses === 200, policy.denominators.officialProcesses);
add("denominator-pdfs", policy.denominators.pdfDocuments === 150 && policy.denominators.pdfPages === 700, policy.denominators);
add("denominator-pairs", policy.denominators.riskControlPairs === 24, policy.denominators.riskControlPairs);
add("denominator-blind", policy.denominators.blindAdjudicationPackets === 50 && policy.denominators.independentAdjudications === 0, policy.denominators);
add("family-delta", policy.evidenceFamilies.proExact === 4 && policy.evidenceFamilies.advancedExact === 7 && policy.evidenceFamilies.advancedGreaterThanProCases === 50, policy.evidenceFamilies);
add("new-families", JSON.stringify([...policy.evidenceFamilies.advancedNew].sort()) === JSON.stringify(["compiler_artifact_diff", "comparative_control_analysis", "cross_tool_consensus"].sort()), policy.evidenceFamilies.advancedNew);
add("pair-metrics", policy.pairwiseMetrics.riskControlPairs === 24 && policy.pairwiseMetrics.severityImprovedPairs + policy.pairwiseMetrics.severityEqualPairs + policy.pairwiseMetrics.severityWorsePairs === 24, policy.pairwiseMetrics);
add("state-revision", state.revisionId === policy.revisionId && state.parentRevisionId === policy.parentRevisionId, state.revisionId);
add("state-global", state.globalDecision === "NO_GO" && !state.live && !state.saleEnabled && !state.productionApproved && !state.worldClassProven, state.globalDecision);
add("advanced-decision", state.skuDecisions.AuditAdvanced === "PILOT_ONLY_PAID_INFORMATIONAL_INCREMENTAL_EVIDENCE_CLOSED_ADJUDICATION_OPEN", state.skuDecisions.AuditAdvanced);
add("scorecard-revision", scorecard.revisionId === policy.revisionId && scorecard.parentRevisionId === policy.parentRevisionId, scorecard.revisionId);
add("scorecard-advanced", scorecard.audit.advanced.evidenceFamilies === 7 && scorecard.audit.advanced.newEvidenceFamilies.length === 3 && scorecard.audit.advanced.independentAdjudications === 0, scorecard.audit.advanced);
add("scorecard-pdf", scorecard.pdf.documents === 150 && scorecard.pdf.pages === 700 && scorecard.pdf.passed === 150 && scorecard.pdf.advancedMarkersVerified === 50, scorecard.pdf);

for (const [rel, expected] of Object.entries(policy.sourceBindings)) {
  const absolute = path.join(root, rel);
  const exists = fs.existsSync(absolute) && fs.statSync(absolute).isFile();
  add(`source-binding:${rel}:exists`, exists, rel);
  if (!exists) continue;
  const bytes = fs.readFileSync(absolute);
  add(`source-binding:${rel}:bytes`, bytes.length === expected.bytes, { actual: bytes.length, expected: expected.bytes });
  add(`source-binding:${rel}:sha`, sha(bytes) === expected.sha256, { actual: sha(bytes), expected: expected.sha256 });
}

const product = fs.readFileSync(path.join(root, "lib/security/vlm-audit-product.ts"), "utf8");
const tier = fs.readFileSync(path.join(root, "lib/security/audit-tier-contract.ts"), "utf8");
const business = fs.readFileSync(path.join(root, "lib/security/audit-business-flow.ts"), "utf8");
const ui = fs.readFileSync(path.join(root, "components/security/SecurityAuditsCleanPage.tsx"), "utf8");
const pdfVerifier = fs.readFileSync(path.join(root, "scripts/pass36/verify-a102r44p7-advanced-evidence-pdf-corpus.py"), "utf8");
const packageJson = readJson("package.json");
add("copy-pl", product.includes("konsensus między narzędziami") && product.includes("różnicę artefaktów kompilatora") && product.includes("porównanie ryzyko-remediacja"), null);
add("copy-en", product.includes("cross-tool consensus") && product.includes("compiler-artifact diff") && product.includes("risk-to-control remediation delta"), null);
add("copy-de", product.includes("werkzeugübergreifenden Konsens") && product.includes("Compiler-Artefakt-Differenz") && product.includes("Risiko-Abhilfe-Vergleich"), null);
add("scorecard-current-pl", product.includes("siedem rodzin dowodów wobec czterech w Pro") && product.includes("niezależnej adjudykacji i wyników klientów"), null);
add("scorecard-current-en", product.includes("seven evidence families versus four in Pro") && product.includes("independent adjudication and customer outcomes"), null);
add("scorecard-current-de", product.includes("sieben Evidenzfamilien gegenüber vier in Pro") && product.includes("unabhängige Adjudikation und Kundenergebnisse"), null);
add("no-stale-scorecard-copy", !product.includes("liczba rodzin dowodów pozostaje taka sama jak w Pro") && !product.includes("evidence-family count is unchanged from Pro") && !product.includes("Zahl der Evidenzfamilien bleibt jedoch wie bei Pro"), null);
add("tier-contract", tier.includes("seven-family evidence profile") && tier.includes("blind adjudication packet readiness") && tier.includes("human-reviewed audit claim"), null);
add("business-copy", business.includes("konsensusem między narzędziami") && business.includes("cross-tool consensus") && business.includes("werkzeugübergreifendem Konsens"), null);
add("ui-copy", ui.includes("Konsensus narzędzi + różnica ABI/bytecode") && ui.includes("Cross-tool consensus + ABI/bytecode diff") && ui.includes("Werkzeugkonsens + ABI/Bytecode-Differenz"), null);
add("pdf-verifier-current-schema", pdfVerifier.includes("velmere.pass36.a102r44p7.audit-pdf-corpus-verification.v1") && pdfVerifier.includes("PASS_A102R44P7_ADVANCED_EVIDENCE_PDF_CORPUS_NO_REAL_CUSTOMER_CREDIT") && !pdfVerifier.includes("velmere.pass36.a102r44p2.audit-pdf-corpus-verification.v1"), null);
add("pdf-verifier-markers", pdfVerifier.includes("advancedMarkerDocuments") && pdfVerifier.includes("ADVANCED_MARKERS"), null);
add("package-pdf-verifier", packageJson.scripts?.["verify:pass36:a102r44p7-pdf"]?.includes("verify-a102r44p7-advanced-evidence-pdf-corpus.py"), packageJson.scripts?.["verify:pass36:a102r44p7-pdf"]);
add("portable-material-bindings", Object.values(policy.bindings).every((binding) => typeof binding.path === "string" && !path.isAbsolute(binding.path) && !/^[A-Za-z]:[\\/]/.test(binding.path)), Object.values(policy.bindings).map((binding) => binding.path));
add("no-independent-credit", !product.includes("independentAdjudicationCredit: true") && policy.denominators.independentAdjudications === 0, null);
add("no-live-credit", !JSON.stringify(policy).includes('"live": true') && !JSON.stringify(state).includes('"live": true'), null);

const failed = checks.filter((row) => !row.passed);
const output = {
  schemaVersion: "velmere.pass36.a102r44p7.static-policy-verification.v1",
  status: failed.length ? "FAIL_A102R44P7_STATIC_POLICY" : "PASS_A102R44P7_STATIC_POLICY",
  revisionId: policy.revisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  advancedEvidenceFamilies: policy.evidenceFamilies.advancedExact,
  proEvidenceFamilies: policy.evidenceFamilies.proExact,
  independentAdjudicationCredit: 0,
  realAuditCredit: 0,
  liveCredit: 0,
  saleEnabled: false,
  failures: failed,
  rows: checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
