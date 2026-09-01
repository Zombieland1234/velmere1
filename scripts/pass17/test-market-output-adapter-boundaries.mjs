#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildWorldclassMarketOutput } from "../../lib/worldclass/market-output-adapter.mjs";
import { scoreWorldclassOutput } from "../../lib/worldclass/output-scorer.mjs";

const root = process.cwd();
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass16/worldclass-output-contract.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass17/market-output-adapter-policy.json"), "utf8"));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass17/market-evidence-fixtures.json"), "utf8")).fixtures;
const rows = fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-2700-matrix.jsonl"), "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const H = createHash("sha256").update("pass17-boundary-source").digest("hex");
const caseById = new Map(corpus.cases.map((row) => [row.id, row]));
const fixtureById = new Map(fixtures.map((row) => [row.caseId, row]));
function clone(value) { return structuredClone(value); }
function row(prefix, tier, locale = "en") { return rows.find((item) => item.caseId.startsWith(prefix) && item.tier === tier && item.locale === locale); }
function run(matrixRow, packet, entitlementStatus = matrixRow.tier === "basic" ? "unverified" : "verified") {
  const output = buildWorldclassMarketOutput({ matrixRow, corpusCase: caseById.get(matrixRow.caseId), evidencePacket: packet, sourceSha256: H, corpusSha256: corpus.corpusSha256, entitlementStatus, rightsMode: "synthetic_fixture", policy });
  const score = scoreWorldclassOutput({ matrixRow, output, contract, corpusSha256: corpus.corpusSha256 });
  return { output, score };
}
const tests = [];
function test(name, condition, detail = null) { tests.push({ name, ok: Boolean(condition), detail }); }

const shieldBase = fixtureById.get("shield-004-usdt-stablecoin-depeg");
let r = run(row("shield-004-", "basic"), clone(shieldBase));
test("basic_complete_passes", r.output.status === "passed" && r.score.ok, r.output.blockers);
test("basic_hides_paid_evidence_table", !("evidenceTable" in r.output));
r = run(row("shield-004-", "pro"), clone(shieldBase));
test("pro_complete_passes", r.output.status === "passed" && r.score.ok);
test("pro_hides_advanced_provenance", !("provenanceReceipt" in r.output));
r = run(row("shield-004-", "advanced"), clone(shieldBase));
test("advanced_complete_passes", r.output.status === "passed" && r.score.ok);
test("advanced_has_provenance_and_confidence_basis", typeof r.output.provenanceReceipt === "string" && r.output.confidenceBasis?.identityOk === true);

const noSources = clone(shieldBase); noSources.sources = [];
r = run(row("shield-004-", "basic"), noSources);
test("no_sources_blocks_and_suppresses_numeric_score", r.output.status === "blocked" && !("numericRiskScore" in r.output));

const identityConflict = clone(shieldBase); identityConflict.sources[1].canonicalIdentity = "crypto:different";
r = run(row("shield-004-", "basic"), identityConflict);
test("identity_conflict_blocks", r.output.status === "blocked" && r.output.blockers.includes("canonical_identity_unresolved"));

const stale = clone(shieldBase); stale.sources = stale.sources.map((source) => ({ ...source, observedAt: "2026-07-19T00:00:00.000Z" }));
r = run(row("shield-004-", "pro"), stale);
test("stale_paid_sources_block", r.output.status === "blocked" && r.output.blockers.includes("no_fresh_usable_evidence"));

const missing = clone(shieldBase); for (const source of missing.sources) source.values.liquidity_usd = null;
r = run(row("shield-004-", "pro"), missing);
test("missing_paid_required_field_blocks", r.output.status === "blocked" && r.output.blockers.includes("paid_required_fields_missing"));

const restricted = clone(shieldBase); restricted.sources = restricted.sources.map((source, index) => ({ ...source, licenseStatus: index === 0 ? "display_only" : "restricted" }));
r = run(row("shield-004-", "basic"), restricted);
test("basic_uses_display_only_but_not_restricted", r.output.status === "passed" && r.output.evidenceStatus.startsWith("1/"));
r = run(row("shield-004-", "pro"), restricted);
test("paid_restricted_license_blocks", r.output.status === "blocked" && r.output.blockers.includes("commercial_rights_unverified"));

r = run(row("shield-004-", "pro"), clone(shieldBase), "unverified");
test("paid_entitlement_fail_closed", r.output.status === "blocked" && r.output.blockers.includes("server_entitlement_unverified"));

const divergent = clone(shieldBase); divergent.sources[1].values.price *= 1.25;
r = run(row("shield-004-", "advanced"), divergent);
test("provider_conflict_is_disclosed", r.output.status === "passed" && r.output.contradictions.some((item) => item.field === "price"));

const metadataRow = row("real_markets-049-", "basic");
r = run(metadataRow, clone(fixtureById.get(metadataRow.caseId)));
test("metadata_only_never_emits_numeric_risk", r.output.status === "passed" && !("numericRiskScore" in r.output) && r.output.riskAssessment.score === null);

const repeatedA = run(row("shield-004-", "advanced"), clone(shieldBase)).output;
const repeatedB = run(row("shield-004-", "advanced"), clone(shieldBase)).output;
test("deterministic_repeat", JSON.stringify(repeatedA) === JSON.stringify(repeatedB));

const result = {
  schemaVersion: "velmere.pass17.market-output-adapter-boundary-tests.v1",
  generatedAt: new Date().toISOString(),
  tests: tests.length,
  passed: tests.filter((item) => item.ok).length,
  failed: tests.filter((item) => !item.ok).length,
  ok: tests.every((item) => item.ok),
  cases: tests,
  truthBoundary: "Boundary tests use deterministic fixtures and prove adapter behavior only, not current provider data or customer-output correctness.",
};
fs.mkdirSync(path.join(root, ".velmere/pass17-diagnostics"), { recursive: true });
fs.writeFileSync(path.join(root, ".velmere/pass17-diagnostics/market-output-adapter-boundary-tests.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ tests: result.tests, passed: result.passed, failed: result.failed, ok: result.ok }, null, 2));
if (!result.ok) { console.error(JSON.stringify(tests.filter((item) => !item.ok), null, 2)); process.exit(1); }
