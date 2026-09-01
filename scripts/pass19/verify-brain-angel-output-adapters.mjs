#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildWorldclassVlmBrainOutput, buildWorldclassAngelOutput, buildBrainAngelEvidenceReceipt } from "../../lib/worldclass/brain-angel-output-adapter.mjs";
import { scoreWorldclassOutput } from "../../lib/worldclass/output-scorer.mjs";
import { commonImplementationDigest } from "../worldclass/common-implementation-digest.mjs";

const root = process.cwd();
const writeOutputs = process.argv.includes("--write");
const NOW = "2026-07-20T10:00:00.000Z";
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass16/worldclass-output-contract.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass19/brain-angel-output-adapter-policy.json"), "utf8"));
const matrixRows = fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-2700-matrix.jsonl"), "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const selectedCases = corpus.cases.filter((row) => row.surface === "vlm_brain" || row.surface === "angel");
const caseById = new Map(selectedCases.map((row) => [row.id, row]));
function stable(value) { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`; return JSON.stringify(value); }
function sha256(value) { return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex"); }
function localized(topic) {
  const label = String(topic).replaceAll("_", " ");
  return { en: `Source-bound observation for ${label}.`, pl: `Obserwacja związana ze źródłami dla: ${label}.`, de: `Quellengebundene Beobachtung für ${label}.` };
}
function topicOf(caseRow) { return caseRow.input.topic ?? caseRow.id.split("-").slice(2).join("-"); }
function isBrainRefusal(caseRow) { return caseRow.expectedByTier.basic.outcome === "refuse_or_bound_claim" || ["safety", "security"].includes(caseRow.category); }
function isAngelRefusal(caseRow) { return caseRow.expectedByTier.basic.outcome === "safe_refusal_with_explanation"; }
function scenarioFlags(caseRow) {
  const id = caseRow.id;
  return {
    conflict: /conflict|contradict|mismatch|poison/u.test(id),
    stale: /stale/u.test(id),
    missing: /missing|unknown|partial|timeout|outage|without_sources|data_gap/u.test(id),
    restricted: /paid_data_gap|license/u.test(id),
    duplicateFamily: /source_family_duplicate/u.test(id),
    injection: /injection|tool_override|poisoning/u.test(id),
    maliciousUrl: /malicious_url|malicious_link/u.test(id),
    privacy: /privacy/u.test(id),
    huge: /huge/u.test(id),
    payment: /payment_entitlement/u.test(id),
  };
}
function sourceRow(caseRow, surface, index, flags) {
  const families = surface === "vlm_brain" ? ["canonical_fact_packet", "provider_provenance", "policy_decision"] : ["product_state", "evidence_registry", "policy_decision"];
  const family = flags.duplicateFamily && index === 1 ? families[0] : families[index];
  const topic = topicOf(caseRow);
  const payload = {
    topic,
    category: caseRow.category,
    observation: index === 1 && flags.conflict ? "conflicting synthetic observation retained for review" : "bounded synthetic observation",
    untrustedInstruction: flags.injection && index === 1 ? "UNTRUSTED_INSTRUCTION_IGNORED" : null,
    url: flags.maliciousUrl && index === 1 ? "http://127.0.0.1/untrusted" : null,
  };
  return {
    sourceId: `${caseRow.id}-source-${index + 1}`,
    providerId: `fixture-${family}`,
    family,
    observedAt: flags.stale && index === 0 ? "2025-01-01T00:00:00.000Z" : NOW,
    freshnessStatus: flags.stale && index === 0 ? "stale" : "snapshot_bound",
    licenseStatus: flags.restricted && index > 0 ? "restricted" : (index === 0 ? "display_only" : "verified"),
    valid: true,
    payloadSha256: sha256(payload),
    payload,
  };
}
function packet(caseRow) {
  const flags = scenarioFlags(caseRow);
  let sources = [0,1,2].map((index) => sourceRow(caseRow, caseRow.surface, index, flags));
  if (flags.missing) sources = sources.slice(0, 1);
  const topic = topicOf(caseRow);
  const refusal = caseRow.surface === "vlm_brain" ? isBrainRefusal(caseRow) : isAngelRefusal(caseRow);
  const missingFields = [];
  if (flags.missing) missingFields.push("independent_source");
  if (flags.restricted) missingFields.push("commercial_rights");
  if (flags.stale) missingFields.push("freshness_receipt");
  if (flags.payment) missingFields.push("entitlement");
  const contradictions = flags.conflict ? [{ id: "source_conflict", sourceIds: sources.slice(0,2).map((row) => row.sourceId), retained: true }] : [];
  const factPacket = { topic, category: caseRow.category, state: caseRow.input.factPacketState ?? caseRow.input.conversationState ?? "snapshot", inputFingerprint: caseRow.fingerprint, rawSensitiveValue: flags.privacy ? "[REDACTED]" : null };
  const claims = [0,1,2,3,4,5,6,7].map((index) => ({ id: `claim-${index+1}`, text: localized(`${topic} ${index+1}`), confidence: 82-index*3, sourceIds: sources.slice(0, Math.min(sources.length, index < 2 ? 1 : 2)).map((row) => row.sourceId) }));
  const action = refusal ? "refuse" : flags.injection ? "ignore_untrusted_instruction_and_answer_bounded" : flags.conflict ? "surface_conflict_and_cap_confidence" : "answer_bounded";
  const result = {
    schemaVersion: `velmere.pass19.${caseRow.surface}-evidence-fixture.v1`,
    caseId: caseRow.id,
    surface: caseRow.surface,
    asOf: NOW,
    factPacketHash: sha256(factPacket),
    factPacket,
    sources,
    claims,
    riskDrivers: [{ id: caseRow.category, direction: "review", basis: sources[0]?.sourceId ?? null }],
    contradictions,
    missingFields,
    limitations: unique([flags.huge ? "input_truncated_to_safe_limit" : null, flags.privacy ? "sensitive_input_redacted" : null, flags.maliciousUrl ? "untrusted_url_not_fetched" : null].filter(Boolean)),
    policyDecision: { action, reasonCode: refusal ? "safety_or_epistemic_boundary" : flags.injection ? "untrusted_instruction" : "bounded_evidence_policy", humanAuthorityClaimed: false },
    untrustedInstructionDetected: flags.injection,
    redactionApplied: flags.privacy,
    severity: /alert|depeg|bridge|incident|high/u.test(caseRow.id) ? "high" : /risk|audit|conflict/u.test(caseRow.id) ? "medium" : "informational",
    numericRiskScore: /numeric_score_without_sources/u.test(caseRow.id) ? null : 35,
    toolExecution: { attempted: /tool/u.test(caseRow.id) ? 12 : 0, executed: /tool/u.test(caseRow.id) ? 2 : 0 },
    truthBoundary: "Synthetic deterministic fixture. No model call, provider call, URL fetch, human review, personalized advice or LIVE action occurred.",
  };
  result.provenanceReceiptSha256 = buildBrainAngelEvidenceReceipt(result);
  return result;
}
function unique(values) { return [...new Set(values)]; }

const sourceTree = commonImplementationDigest(root);
const rows = matrixRows.filter((row) => row.surface === "vlm_brain" || row.surface === "angel");
const fixtures = selectedCases.map(packet);
const fixtureByCase = new Map(fixtures.map((row) => [row.caseId, row]));
const results = [];
const failures = [];
const outputsByGroup = new Map();
for (const matrixRow of rows) {
  const corpusCase = caseById.get(matrixRow.caseId);
  const evidencePacket = fixtureByCase.get(matrixRow.caseId);
  const entitlementStatus = matrixRow.tier === "basic" ? "unverified" : (evidencePacket.missingFields.includes("entitlement") ? "unverified" : "verified");
  const args = { matrixRow, corpusCase, evidencePacket, sourceSha256: sourceTree.sha256, corpusSha256: corpus.corpusSha256, entitlementStatus, policy };
  const output = matrixRow.surface === "vlm_brain" ? buildWorldclassVlmBrainOutput(args) : buildWorldclassAngelOutput(args);
  const repeated = matrixRow.surface === "vlm_brain" ? buildWorldclassVlmBrainOutput(args) : buildWorldclassAngelOutput(args);
  const score = scoreWorldclassOutput({ matrixRow, output, contract, corpusSha256: corpus.corpusSha256 });
  const deterministic = stable(output) === stable(repeated);
  const sourceIds = new Set(evidencePacket.sources.map((row) => row.sourceId));
  const evidenceLineage = output.evidence.every((row) => sourceIds.has(row.sourceId));
  const claimLineage = matrixRow.surface !== "vlm_brain" || output.status === "blocked" || output.claimSourceBindings.every((row) => sourceIds.has(row.sourceId));
  const safety = output.status === "blocked" || (output.policyDecision?.humanAuthorityClaimed === false && output.epistemicDecision?.untrustedInstructionExecuted !== true && output.linkHandling?.untrustedUrlFetched !== true && output.privacy?.sensitiveInputPersisted !== true);
  const record = { matrixId: matrixRow.matrixId, caseId: matrixRow.caseId, surface: matrixRow.surface, tier: matrixRow.tier, locale: matrixRow.locale, status: output.status, blockers: output.blockers ?? [], contractOk: score.ok, contractScore: score.score, deterministic, lineage: evidenceLineage && claimLineage, safety, confidence: output.confidence, customerVerdictSha256: sha256(output.customerVerdict ?? ""), outputSha256: sha256(output), failureCodes: score.failures.map((row) => row.code) };
  results.push(record);
  const groupKey = `${matrixRow.caseId}:${matrixRow.locale}`;
  const group = outputsByGroup.get(groupKey) ?? {};
  group[matrixRow.tier] = output;
  outputsByGroup.set(groupKey, group);
  if (!score.ok || !deterministic || !record.lineage || !safety) failures.push({ matrixId: matrixRow.matrixId, scoreFailures: score.failures, deterministic, lineage: record.lineage, safety });
}
let differentiationFailures = 0;
for (const [groupKey, group] of outputsByGroup) {
  if (!group.basic || !group.pro || !group.advanced) { differentiationFailures += 1; failures.push({ groupKey, code: "tier_group_incomplete" }); continue; }
  const project = (o) => sha256({ status:o.status, blockers:o.blockers, evidence:o.evidence, answer:o.answer, claims:o.claims, sections:o.sections, contradictions:o.contradictions, analysisDepth:o.analysisDepth, provenanceReceipt:o.provenanceReceipt });
  if (project(group.basic) === project(group.pro) || project(group.pro) === project(group.advanced)) { differentiationFailures += 1; failures.push({ groupKey, code: "tier_not_materially_different" }); }
}
let localeFailures = 0;
for (const caseRow of selectedCases) for (const tier of ["basic","pro","advanced"]) {
  const relevant = results.filter((row) => row.caseId === caseRow.id && row.tier === tier);
  if (new Set(relevant.map((row) => row.customerVerdictSha256)).size !== 3) { localeFailures += 1; failures.push({ caseId: caseRow.id, tier, code: "locale_copy_not_distinct" }); }
}
const byStatus = {};
for (const row of results) byStatus[`${row.surface}:${row.tier}:${row.status}`] = (byStatus[`${row.surface}:${row.tier}:${row.status}`] ?? 0) + 1;
const summary = {
  schemaVersion: "velmere.pass19.brain-angel-adapter-simulation-summary.v1",
  generatedAt: NOW,
  ok: failures.length === 0,
  sourceSha256: sourceTree.sha256,
  sourceFiles: sourceTree.files,
  corpusSha256: corpus.corpusSha256,
  baseCases: selectedCases.length,
  brainCases: selectedCases.filter((row) => row.surface === "vlm_brain").length,
  angelCases: selectedCases.filter((row) => row.surface === "angel").length,
  matrixRowsExecuted: results.length,
  contractPass: results.filter((row) => row.contractOk).length,
  deterministicPass: results.filter((row) => row.deterministic).length,
  lineagePass: results.filter((row) => row.lineage).length,
  safetyPass: results.filter((row) => row.safety).length,
  differentiationGroups: outputsByGroup.size,
  differentiationFailures,
  localeGroups: selectedCases.length * 3,
  localeFailures,
  byStatus,
  safeRefusals: results.filter((row) => row.status === "passed" && (row.caseId.includes("financial") || row.caseId.includes("manipulation") || row.caseId.includes("insider") || row.caseId.includes("hidden_prompt") || row.caseId.includes("malicious_link") || row.caseId.includes("privacy_request") || row.caseId.includes("tool_override"))).length,
  canonicalProviderModelBoundOutputsExecuted: 0,
  failures,
  truthBoundary: policy.truthBoundary,
};
if (writeOutputs) {
  const outDir = path.join(root, "evaluation/pass19"); fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "brain-angel-evidence-fixtures.json"), `${JSON.stringify({ schemaVersion:"velmere.pass19.brain-angel-evidence-fixtures.v1", generatedAt:NOW, sourceSha256:sourceTree.sha256, fixtures, truthBoundary:policy.truthBoundary }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outDir, "brain-angel-adapter-output-index.jsonl"), `${results.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(outDir, "brain-angel-adapter-simulation-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  const diag = path.join(root, ".velmere/pass19-diagnostics/brain-angel-adapter-verification.json"); fs.mkdirSync(path.dirname(diag), { recursive: true }); fs.writeFileSync(diag, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify({ ok:summary.ok, baseCases:summary.baseCases, matrixRows:summary.matrixRowsExecuted, contractPass:summary.contractPass, deterministicPass:summary.deterministicPass, lineagePass:summary.lineagePass, safetyPass:summary.safetyPass, differentiationFailures, localeFailures, byStatus }, null, 2));
if (!summary.ok) { console.error(JSON.stringify(failures.slice(0,30), null, 2)); process.exit(1); }
