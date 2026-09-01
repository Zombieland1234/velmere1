#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  buildWorldclassSmartContractAuditOutput,
  buildWorldclassLensPdfOutput,
  buildLensCanonicalCustomerPayload,
  buildAuditLensEvidenceReceipt,
} from "../../lib/worldclass/audit-lens-output-adapter.mjs";
import { scoreWorldclassOutput } from "../../lib/worldclass/output-scorer.mjs";
import { commonImplementationDigest } from "../worldclass/common-implementation-digest.mjs";

const root = process.cwd();
const writeOutputs = process.argv.includes("--write");
const wave2AutomatedInformational = process.argv.includes("--wave2-automated-informational");
const NOW = "2026-07-20T09:00:00.000Z";
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const contractPath = wave2AutomatedInformational
  ? "config/pass36/a102r44p2-worldclass-output-contract.json"
  : "config/pass16/worldclass-output-contract.json";
const policyPath = wave2AutomatedInformational
  ? "config/pass36/a102r44p2-audit-lens-output-adapter-policy.json"
  : "config/pass18/audit-lens-output-adapter-policy.json";
const contract = JSON.parse(fs.readFileSync(path.join(root, contractPath), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, policyPath), "utf8"));
const matrixRows = fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-2700-matrix.jsonl"), "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const selectedCases = corpus.cases.filter((row) => row.surface === "smart_contract_audit" || row.surface === "lens_pdf");
const caseById = new Map(selectedCases.map((row) => [row.id, row]));

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function sha256(value) { return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex"); }
function sourceTreeDigest() { return commonImplementationDigest(root); }
function keywordForFinding(id) {
  const map = {
    external_call_before_state_update: ["call{", ".call", "balances[msg.sender]"],
    tx_origin_authorization: ["tx.origin"],
    initializer_replay_or_takeover: ["initialize", "owner ="],
    unchecked_low_level_call: [".call", "(bool ok"],
    user_controlled_delegatecall: ["delegatecall"],
    manipulable_spot_oracle: ["spot", "reserve", "price"],
    donation_share_price_manipulation: ["totalAssets", "shares"],
    unsafe_rounding_direction: ["/", "shares"],
    missing_role_enforcement: ["onlyOwner", "admin"],
    unbounded_iteration_dos: ["for (", "while ("],
    timestamp_dependency: ["block.timestamp"],
    upgrade_storage_collision: ["implementation", "delegatecall"],
    unsafe_selfdestruct: ["selfdestruct"],
    unsafe_token_hook_reentrancy: ["tokensReceived", "onTransfer"],
    fee_on_transfer_accounting: ["transferFrom", "balanceOf"],
    blacklist_or_freeze_control: ["blacklist", "frozen"],
    central_operator_control: ["operator", "owner"],
    insolvency_or_bad_debt: ["debt", "collateral"],
    governance_flash_loan: ["vote", "snapshot"],
    frontrunnable_parameter_update: ["set", "price"],
    predictable_randomness: ["blockhash", "prevrandao", "timestamp"],
    signature_replay: ["ecrecover", "nonce", "signature"],
    cross_chain_message_replay: ["message", "nonce", "chainId"],
  };
  return map[id] ?? id.split("_");
}
function evidenceLocation(source, sourcePath, findingId) {
  const lines = source.split(/\r?\n/u);
  const terms = keywordForFinding(findingId).map((value) => value.toLowerCase());
  let index = lines.findIndex((line) => terms.some((term) => line.toLowerCase().includes(term)));
  if (index < 0) index = lines.findIndex((line) => /contract\s+/u.test(line));
  if (index < 0) index = 0;
  const snippet = lines[index] ?? "";
  return { sourcePath, lineStart: index + 1, lineEnd: index + 1, codeSha256: sha256(snippet) };
}
function severityForFinding(id) {
  if (/delegatecall|selfdestruct|cross_chain|reentrancy|oracle|insolvency|governance/u.test(id)) return "high";
  if (/authorization|initializer|unchecked|signature|blacklist|operator|random|frontrun|storage/u.test(id)) return "medium";
  return "low";
}
function remediationForFinding(id) {
  return `Apply a source-bound mitigation for ${id.replaceAll("_", " ")}, add a negative regression test and obtain independent review before release.`;
}
function auditFixture(caseRow) {
  const sourcePath = caseRow.input.fixture;
  const absolute = path.join(root, sourcePath);
  const source = fs.readFileSync(absolute, "utf8");
  const actualSha = sha256(Buffer.from(source));
  if (actualSha !== caseRow.input.fixtureSha256) throw new Error(`fixture_sha_mismatch:${caseRow.id}`);
  const canonicalIdentity = `${caseRow.input.chain}:${actualSha}`;
  const expected = Array.isArray(caseRow.input.expectedFindings) ? caseRow.input.expectedFindings : [];
  const ambiguous = Boolean(caseRow.input.ambiguousControl);
  const findings = expected.map((id) => ({
    id,
    severity: severityForFinding(id),
    title: id.replaceAll("_", " "),
    rationale: `Synthetic analyzer observation bound to ${sourcePath}; this is an adapter fixture, not detector-quality proof.`,
    remediation: remediationForFinding(id),
    evidence: [evidenceLocation(source, sourcePath, id)],
  }));
  const ambiguousFinding = ambiguous ? [{
    id: "ambiguous_control_requires_review",
    severity: "informational",
    title: "ambiguous control requires review",
    rationale: "One synthetic analyzer cannot resolve the control from the bounded source fragment.",
    remediation: "Obtain execution context and independent human review.",
    evidence: [evidenceLocation(source, sourcePath, "control")],
  }] : [];
  const analyses = [
    { sourceId: `${caseRow.id}-static`, providerId: "fixture-static-semantic", family: "static_semantic", findings: ambiguous ? ambiguousFinding : findings, controls: ["source_hash_verified", "compiler_version_bound", "no_issue_label_without_location"] },
    { sourceId: `${caseRow.id}-flow`, providerId: "fixture-control-flow", family: "control_flow", findings: ambiguous ? [] : findings, controls: ["cross_function_flow_checked", "clean_control_pair_considered", "severity_requires_evidence"] },
    { sourceId: `${caseRow.id}-compiler`, providerId: "fixture-compiler-metadata", family: "compiler_metadata", findings: [], controls: ["compiler_identity_verified", "source_bytecode_boundary_declared"] },
  ].map((row) => {
    const normalized = {
      ...row,
      canonicalIdentity,
      observedAt: NOW,
      freshnessStatus: "snapshot_bound",
      licenseStatus: "verified",
      compiler: caseRow.input.compiler,
      sourceSha256: actualSha,
      scope: ["source_identity", "bounded_static_analysis", "false_positive_controls"],
    };
    normalized.payloadSha256 = sha256({ findings: normalized.findings, controls: normalized.controls, sourceSha256: actualSha });
    return normalized;
  });
  const packet = {
    schemaVersion: "velmere.pass18.smart-contract-evidence-fixture.v1",
    caseId: caseRow.id,
    surface: "smart_contract_audit",
    asOf: NOW,
    contract: {
      canonicalIdentity,
      chain: caseRow.input.chain,
      compiler: caseRow.input.compiler,
      sourcePath,
      sourceSha256: actualSha,
      bytecodeSha256: sha256(`synthetic-bytecode:${actualSha}`),
      sourceAvailable: true,
    },
    analyses,
    humanReview: null,
    truthBoundary: "Synthetic deterministic adapter evidence. Expected fixture labels are used only to build adapter test observations; they do not prove detector precision, recall or real human review.",
  };
  packet.provenanceReceiptSha256 = buildAuditLensEvidenceReceipt(packet);
  return packet;
}
function lensSource(caseRow, index, options = {}) {
  const canonicalIdentity = options.canonicalIdentity;
  const family = ["canonical_fact_packet", "source_registry", "independent_context"][index];
  const base = {
    summary: options.conflict && index === 1 ? `Conflicting fixture statement for ${caseRow.input.entity}` : `Source-bound fixture statement for ${caseRow.input.entity}`,
    riskDrivers: [{ id: `driver-${index + 1}`, contribution: index + 1, basis: family }],
    chartData: options.chartMissing ? null : [1, 2, 3, 4].map((value) => value + index),
    reportKind: caseRow.input.reportKind,
  };
  const row = {
    sourceId: `${caseRow.id}-source-${index + 1}`,
    providerId: `fixture-${family}`,
    family,
    canonicalIdentity: options.identityConflict && index === 1 ? `conflict:${canonicalIdentity}` : canonicalIdentity,
    observedAt: NOW,
    freshnessStatus: options.stale && index === 0 ? "stale" : "snapshot_bound",
    licenseStatus: options.restricted ? (index === 0 ? "display_only" : "restricted") : "verified",
    values: base,
  };
  row.payloadSha256 = sha256(row.values);
  return row;
}
function lensFixture(caseRow, relevantRows, sourceSha256) {
  const category = caseRow.category;
  const canonicalIdentity = category === "identity_ambiguous" ? "" : `${caseRow.input.reportKind}:${String(caseRow.input.entity).toLowerCase().replaceAll(" ", "-")}`;
  const options = {
    canonicalIdentity,
    conflict: category === "two_sources_conflict",
    stale: category === "stale_primary",
    restricted: category === "license_restricted",
    chartMissing: category === "chart_data_missing",
    identityConflict: category === "identity_ambiguous",
  };
  let sources = [0, 1, 2].map((index) => lensSource(caseRow, index, options));
  if (category === "one_source_missing") sources = sources.slice(0, 1);
  if (category === "identity_ambiguous") {
    sources[0].canonicalIdentity = "ambiguous:a";
    sources[1].canonicalIdentity = "ambiguous:b";
    sources[2].canonicalIdentity = "ambiguous:c";
  }
  const missingFields = [];
  if (category === "one_source_missing") missingFields.push("second_source");
  if (category === "chart_data_missing") missingFields.push("chart_data");
  if (category === "identity_ambiguous") missingFields.push("canonical_identity");
  const packet = {
    schemaVersion: "velmere.pass18.lens-pdf-evidence-fixture.v1",
    caseId: caseRow.id,
    surface: "lens_pdf",
    asOf: NOW,
    report: { canonicalIdentity, reportKind: caseRow.input.reportKind, entity: caseRow.input.entity },
    sources,
    missingFields,
    renderReceipts: [],
    truthBoundary: "Synthetic deterministic report fixture. Hash parity proves adapter canonicalization only; it is not a rendered browser PDF, customer delivery, staging or LIVE proof.",
  };
  for (const matrixRow of relevantRows) {
    const args = { matrixRow, corpusCase: caseRow, evidencePacket: packet, sourceSha256, corpusSha256: corpus.corpusSha256, entitlementStatus: matrixRow.tier === "basic" ? "unverified" : "verified", policy };
    const payload = buildLensCanonicalCustomerPayload(args);
    const canonicalPayloadSha256 = sha256(payload);
    const pageManifestSha256 = sha256(payload.pageManifest);
    for (const channel of policy.lensPdf.requiredChannels) {
      packet.renderReceipts.push({
        channel,
        tier: matrixRow.tier,
        locale: matrixRow.locale,
        rendererVersion: "pass18-fixture-renderer-v1",
        canonicalPayloadSha256,
        pageManifestSha256,
        pageCount: payload.pageManifest.pageCount,
        transportSha256: sha256(`${caseRow.id}:${matrixRow.tier}:${matrixRow.locale}:${channel}:transport`),
      });
    }
  }
  packet.provenanceReceiptSha256 = buildAuditLensEvidenceReceipt(packet);
  return packet;
}

const sourceTree = sourceTreeDigest();
const rows = matrixRows.filter((row) => row.surface === "smart_contract_audit" || row.surface === "lens_pdf");
const rowsByCase = new Map();
for (const row of rows) { const list = rowsByCase.get(row.caseId) ?? []; list.push(row); rowsByCase.set(row.caseId, list); }
const fixtures = selectedCases.map((caseRow) => caseRow.surface === "smart_contract_audit" ? auditFixture(caseRow) : lensFixture(caseRow, rowsByCase.get(caseRow.id) ?? [], sourceTree.sha256));
const fixtureByCase = new Map(fixtures.map((row) => [row.caseId, row]));
const results = [];
const failures = [];
const outputsByGroup = new Map();

for (const matrixRow of rows) {
  const corpusCase = caseById.get(matrixRow.caseId);
  const evidencePacket = fixtureByCase.get(matrixRow.caseId);
  const args = { matrixRow, corpusCase, evidencePacket, sourceSha256: sourceTree.sha256, corpusSha256: corpus.corpusSha256, entitlementStatus: matrixRow.tier === "basic" ? "unverified" : "verified", policy };
  const output = matrixRow.surface === "smart_contract_audit" ? buildWorldclassSmartContractAuditOutput(args) : buildWorldclassLensPdfOutput(args);
  const repeated = matrixRow.surface === "smart_contract_audit" ? buildWorldclassSmartContractAuditOutput(args) : buildWorldclassLensPdfOutput(args);
  const score = scoreWorldclassOutput({ matrixRow, output, contract, corpusSha256: corpus.corpusSha256 });
  const deterministic = stable(output) === stable(repeated);
  let lineage;
  if (matrixRow.surface === "smart_contract_audit") {
    const evidenceHashes = new Set(evidencePacket.analyses.flatMap((analysis) => analysis.findings.flatMap((finding) => finding.evidence.map((row) => row.codeSha256))));
    lineage = output.findings.every((finding) => finding.evidence.every((row) => evidenceHashes.has(row.codeSha256)));
  } else {
    const sourceIds = new Set(evidencePacket.sources.map((row) => row.sourceId));
    lineage = output.sourceManifest.every((row) => sourceIds.has(row.sourceId)) && output.previewHash === output.downloadHash && output.previewHash === output.accountCopyHash;
  }
  const record = {
    matrixId: matrixRow.matrixId,
    caseId: matrixRow.caseId,
    surface: matrixRow.surface,
    tier: matrixRow.tier,
    locale: matrixRow.locale,
    status: output.status,
    blockers: output.blockers ?? [],
    contractOk: score.ok,
    contractScore: score.score,
    deterministic,
    lineage,
    confidence: output.confidence,
    analysisMode: output.analysisMode ?? null,
    humanReviewIncluded: output.claimBoundary?.humanReviewIncluded === true,
    humanReviewClaimAllowed: output.claimBoundary?.humanReviewClaimAllowed === true,
    independentCertificationClaimAllowed: output.claimBoundary?.independentCertificationClaimAllowed === true,
    personalisedAdviceAllowed: output.claimBoundary?.personalisedAdviceAllowed === true,
    securityGuaranteeAllowed: output.claimBoundary?.securityGuaranteeAllowed === true,
    customerVerdictSha256: sha256(output.customerVerdict ?? ""),
    outputSha256: sha256(output),
  };
  results.push(record);
  const groupKey = `${matrixRow.caseId}:${matrixRow.locale}`;
  const group = outputsByGroup.get(groupKey) ?? {};
  group[matrixRow.tier] = output;
  outputsByGroup.set(groupKey, group);
  if (!score.ok || !deterministic || !lineage) failures.push({ matrixId: matrixRow.matrixId, scoreFailures: score.failures, deterministic, lineage });
}

let differentiationFailures = 0;
for (const [groupKey, group] of outputsByGroup) {
  if (!group.basic || !group.pro || !group.advanced) { differentiationFailures += 1; failures.push({ groupKey, code: "tier_group_incomplete" }); continue; }
  const basicProjection = sha256({ status: group.basic.status, sections: group.basic.sections, evidenceTable: group.basic.evidenceTable, pageManifest: group.basic.pageManifest, findings: group.basic.findings, verdict: group.basic.customerVerdict });
  const proProjection = sha256({ status: group.pro.status, sections: group.pro.sections, evidenceTable: group.pro.evidenceTable, pageManifest: group.pro.pageManifest, findings: group.pro.findings, verdict: group.pro.customerVerdict });
  const advancedProjection = sha256({ status: group.advanced.status, sections: group.advanced.sections, evidenceTable: group.advanced.evidenceTable, pageManifest: group.advanced.pageManifest, findings: group.advanced.findings, verdict: group.advanced.customerVerdict, blockers: group.advanced.blockers });
  if (basicProjection === proProjection || proProjection === advancedProjection) { differentiationFailures += 1; failures.push({ groupKey, code: "tier_not_materially_different" }); }
}

let localeFailures = 0;
for (const caseRow of selectedCases) {
  for (const tier of ["basic", "pro", "advanced"]) {
    const relevant = results.filter((row) => row.caseId === caseRow.id && row.tier === tier);
    if (new Set(relevant.map((row) => row.customerVerdictSha256)).size !== 3) { localeFailures += 1; failures.push({ caseId: caseRow.id, tier, code: "locale_copy_not_distinct" }); }
  }
}

const byStatus = {};
for (const row of results) byStatus[`${row.surface}:${row.tier}:${row.status}`] = (byStatus[`${row.surface}:${row.tier}:${row.status}`] ?? 0) + 1;
const summary = {
  schemaVersion: "velmere.pass18.audit-lens-adapter-simulation-summary.v1",
  generatedAt: NOW,
  ok: failures.length === 0,
  sourceSha256: sourceTree.sha256,
  sourceFiles: sourceTree.files,
  corpusSha256: corpus.corpusSha256,
  baseCases: selectedCases.length,
  auditCases: selectedCases.filter((row) => row.surface === "smart_contract_audit").length,
  lensCases: selectedCases.filter((row) => row.surface === "lens_pdf").length,
  matrixRowsExecuted: results.length,
  contractPass: results.filter((row) => row.contractOk).length,
  deterministicPass: results.filter((row) => row.deterministic).length,
  lineagePass: results.filter((row) => row.lineage).length,
  differentiationGroups: outputsByGroup.size,
  differentiationFailures,
  localeGroups: selectedCases.length * 3,
  localeFailures,
  byStatus,
  mode: wave2AutomatedInformational ? "A102R44P2_AUTOMATED_INFORMATIONAL" : "PASS18_HISTORICAL_HUMAN_REVIEW_GATED",
  contractPath,
  policyPath,
  advancedAuditSafelyBlockedWithoutRealHumanReview: results.filter((row) => row.surface === "smart_contract_audit" && row.tier === "advanced" && row.status === "blocked" && row.blockers.includes("real_human_review_required")).length,
  advancedAutomatedPassedWithoutHumanReview: results.filter((row) => row.surface === "smart_contract_audit" && row.tier === "advanced" && row.status === "passed" && row.analysisMode === "automated_informational" && row.humanReviewIncluded === false).length,
  advancedAutomatedUnsafeClaimRows: results.filter((row) => row.surface === "smart_contract_audit" && row.tier === "advanced" && (row.humanReviewClaimAllowed || row.independentCertificationClaimAllowed || row.personalisedAdviceAllowed || row.securityGuaranteeAllowed)).length,
  canonicalProviderOrReviewerBoundOutputsExecuted: 0,
  renderedBrowserPdfOutputsExecuted: 0,
  failures,
  truthBoundary: policy.truthBoundary,
};

if (writeOutputs) {
  const outDir = path.join(root, "evaluation/pass18");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "audit-lens-evidence-fixtures.json"), `${JSON.stringify({ schemaVersion: "velmere.pass18.audit-lens-evidence-fixtures.v1", generatedAt: NOW, sourceSha256: sourceTree.sha256, fixtures, truthBoundary: policy.truthBoundary }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outDir, "audit-lens-adapter-output-index.jsonl"), `${results.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(outDir, "audit-lens-adapter-simulation-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  const diag = path.join(root, ".velmere/pass18-diagnostics/audit-lens-adapter-verification.json");
  fs.mkdirSync(path.dirname(diag), { recursive: true });
  fs.writeFileSync(diag, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify({
  ok: summary.ok,
  mode: summary.mode,
  baseCases: summary.baseCases,
  matrixRows: summary.matrixRowsExecuted,
  contractPass: summary.contractPass,
  deterministicPass: summary.deterministicPass,
  lineagePass: summary.lineagePass,
  advancedAuditBlocked: summary.advancedAuditSafelyBlockedWithoutRealHumanReview,
  advancedAutomatedPassed: summary.advancedAutomatedPassedWithoutHumanReview,
  advancedAutomatedUnsafeClaimRows: summary.advancedAutomatedUnsafeClaimRows,
  differentiationFailures,
  localeFailures,
}, null, 2));
if (!summary.ok) { console.error(JSON.stringify(failures.slice(0, 20), null, 2)); process.exit(1); }
