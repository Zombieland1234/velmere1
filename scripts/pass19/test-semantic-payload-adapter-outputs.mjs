#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildWorldclassMarketOutput } from "../../lib/worldclass/market-output-adapter.mjs";
import {
  buildWorldclassSmartContractAuditOutput,
  buildWorldclassLensPdfOutput,
} from "../../lib/worldclass/audit-lens-output-adapter.mjs";
import {
  buildWorldclassVlmBrainOutput,
  buildWorldclassAngelOutput,
  buildBrainAngelEvidenceReceipt,
} from "../../lib/worldclass/brain-angel-output-adapter.mjs";
import {
  SEMANTIC_PAYLOAD_SCHEMA_VERSION,
  buildSemanticPayload,
  semanticDigestSha256,
} from "../../lib/worldclass/semantic-payload.mjs";

const root = process.cwd();
const H = createHash("sha256").update("f19-semantic-adapter-subject").digest("hex");
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const matrix = fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-2700-matrix.jsonl"), "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const marketPolicy = JSON.parse(fs.readFileSync(path.join(root, "config/pass17/market-output-adapter-policy.json"), "utf8"));
const auditPolicy = JSON.parse(fs.readFileSync(path.join(root, "config/pass18/audit-lens-output-adapter-policy.json"), "utf8"));
const brainPolicy = JSON.parse(fs.readFileSync(path.join(root, "config/pass19/brain-angel-output-adapter-policy.json"), "utf8"));
const marketFixtures = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass17/market-evidence-fixtures.json"), "utf8")).fixtures;
const auditFixtures = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass18/audit-lens-evidence-fixtures.json"), "utf8")).fixtures;
const caseById = new Map(corpus.cases.map((item) => [item.id, item]));
const marketFixtureById = new Map(marketFixtures.map((item) => [item.caseId, item]));
const auditFixtureById = new Map(auditFixtures.map((item) => [item.caseId, item]));

function row(prefix, tier, locale = "en") {
  const found = matrix.find((item) => item.caseId.startsWith(prefix) && item.tier === tier && item.locale === locale);
  if (!found) throw new Error(`matrix_row_missing:${prefix}:${tier}:${locale}`);
  return found;
}
function clone(value) { return structuredClone(value); }
function sha256Json(value) { return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex"); }

function buildMarket(matrixRow) {
  const packet = clone(marketFixtureById.get(matrixRow.caseId));
  if (!packet) throw new Error(`market_fixture_missing:${matrixRow.caseId}`);
  return buildWorldclassMarketOutput({
    matrixRow,
    corpusCase: caseById.get(matrixRow.caseId),
    evidencePacket: packet,
    sourceSha256: H,
    corpusSha256: corpus.corpusSha256,
    entitlementStatus: matrixRow.tier === "basic" ? "unverified" : "verified",
    rightsMode: "synthetic_fixture",
    policy: marketPolicy,
  });
}

function buildAuditLens(matrixRow) {
  const packet = clone(auditFixtureById.get(matrixRow.caseId));
  if (!packet) throw new Error(`audit_fixture_missing:${matrixRow.caseId}`);
  const args = {
    matrixRow,
    corpusCase: caseById.get(matrixRow.caseId),
    evidencePacket: packet,
    sourceSha256: H,
    corpusSha256: corpus.corpusSha256,
    entitlementStatus: matrixRow.tier === "basic" ? "unverified" : "verified",
    policy: auditPolicy,
  };
  return matrixRow.surface === "smart_contract_audit"
    ? buildWorldclassSmartContractAuditOutput(args)
    : buildWorldclassLensPdfOutput(args);
}

function buildBrainPacket(matrixRow) {
  const families = matrixRow.surface === "vlm_brain"
    ? ["canonical_fact_packet", "provider_provenance", "policy_decision"]
    : ["product_state", "evidence_registry", "policy_decision"];
  const packet = {
    schemaVersion: "velmere.pass19.semantic-adapter-fixture.v1",
    caseId: matrixRow.caseId,
    surface: matrixRow.surface,
    asOf: "2026-07-20T10:00:00.000Z",
    factPacketHash: H,
    sources: families.map((family, index) => ({
      sourceId: `s${index + 1}`,
      family,
      observedAt: "2026-07-20T10:00:00.000Z",
      freshnessStatus: "snapshot_bound",
      licenseStatus: index === 0 ? "display_only" : "verified",
      valid: true,
      payloadSha256: H,
    })),
    claims: [{
      id: "c1",
      text: { en: "Bound claim.", pl: "Ograniczony wniosek.", de: "Begrenzte Aussage." },
      confidence: 70,
      sourceIds: ["s1"],
    }],
    riskDrivers: [],
    contradictions: [],
    missingFields: [],
    limitations: [],
    policyDecision: { action: "answer_bounded", humanAuthorityClaimed: false },
    untrustedInstructionDetected: false,
    redactionApplied: false,
    severity: "informational",
    numericRiskScore: 35,
    toolExecution: { attempted: 0, executed: 0 },
  };
  packet.provenanceReceiptSha256 = buildBrainAngelEvidenceReceipt(packet);
  return packet;
}

function buildBrainAngel(matrixRow) {
  const args = {
    matrixRow,
    corpusCase: caseById.get(matrixRow.caseId),
    evidencePacket: buildBrainPacket(matrixRow),
    sourceSha256: H,
    corpusSha256: corpus.corpusSha256,
    entitlementStatus: matrixRow.tier === "basic" ? "unverified" : "verified",
    policy: brainPolicy,
  };
  return matrixRow.surface === "vlm_brain"
    ? buildWorldclassVlmBrainOutput(args)
    : buildWorldclassAngelOutput(args);
}

const factories = [
  ["shield", () => buildMarket(row("shield-004-", "advanced"))],
  ["real_markets", () => buildMarket(row("real_markets-049-", "basic"))],
  ["smart_contract_audit", () => buildAuditLens(row("smart_contract_audit-001-", "basic"))],
  ["lens_pdf", () => buildAuditLens(row("lens_pdf-001-", "pro"))],
  ["vlm_brain", () => buildBrainAngel(row("vlm_brain-001-", "advanced"))],
  ["angel", () => buildBrainAngel(row("angel-001-", "advanced"))],
];

const rows = [];
for (const [surface, factory] of factories) {
  try {
    const outputA = factory();
    const outputB = factory();
    const digestA = semanticDigestSha256(outputA);
    const digestB = semanticDigestSha256(outputB);
    const payload = buildSemanticPayload(outputA);

    const semanticMutation = clone(outputA);
    if (typeof semanticMutation.customerVerdict === "string") semanticMutation.customerVerdict += " [semantic mutation]";
    else if (typeof semanticMutation.confidence === "number") semanticMutation.confidence += 1;
    else semanticMutation.semanticMutationProbe = "changed";
    const mutationSensitive = semanticDigestSha256(semanticMutation) !== digestA;

    const renderMutation = clone(outputA);
    const exactJsonBefore = sha256Json(renderMutation);
    renderMutation.exactPdfSha256 = "f".repeat(64);
    renderMutation.pdfByteLength = 999999;
    const exactJsonAfter = sha256Json(renderMutation);
    const renderSeparated = exactJsonBefore !== exactJsonAfter && semanticDigestSha256(renderMutation) === digestA;

    const reordered = Object.fromEntries(Object.entries(outputA).reverse());
    const keyOrderInvariant = semanticDigestSha256(reordered) === digestA;

    let evidenceOrderSensitive = true;
    if (Array.isArray(outputA.evidence) && outputA.evidence.length > 1) {
      const evidenceReordered = clone(outputA);
      evidenceReordered.evidence.reverse();
      evidenceOrderSensitive = semanticDigestSha256(evidenceReordered) !== digestA;
    }

    const ok = /^[0-9a-f]{64}$/u.test(digestA)
      && digestA === digestB
      && payload.schemaVersion === SEMANTIC_PAYLOAD_SCHEMA_VERSION
      && mutationSensitive
      && renderSeparated
      && keyOrderInvariant
      && evidenceOrderSensitive;
    rows.push({
      surface,
      ok,
      status: outputA.status ?? null,
      semanticDigestSha256: digestA,
      deterministic: digestA === digestB,
      semanticMutationSensitive: mutationSensitive,
      exactRenderBytesSeparated: renderSeparated,
      objectKeyOrderInvariant: keyOrderInvariant,
      evidenceArrayOrderSemantic: evidenceOrderSensitive,
      excludedPathsOnBaseOutput: payload.excludedPaths,
    });
  } catch (error) {
    rows.push({ surface, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const result = {
  schemaVersion: "velmere.pass19.semantic-payload-adapter-output-tests.v1",
  semanticPayloadSchemaVersion: SEMANTIC_PAYLOAD_SCHEMA_VERSION,
  surfaces: rows.length,
  passed: rows.filter((item) => item.ok).length,
  failed: rows.filter((item) => !item.ok).length,
  ok: rows.every((item) => item.ok),
  rows,
  truthBoundary: "PASS proves the semantic digest contract against one deterministic synthetic output from each of the six real Worldclass adapter surfaces. It proves key-order invariance, semantic mutation sensitivity, array-order semantics and separation from exact PDF/render byte fields. It does not prove provider truth, model quality, human review, PDF visual correctness, staging, LIVE, or the final governed 180-case corpus.",
};
const out = path.join(root, ".velmere/pass19-diagnostics/semantic-payload-adapter-output-tests.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
