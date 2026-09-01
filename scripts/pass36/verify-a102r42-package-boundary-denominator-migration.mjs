import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const REV = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const MIGRATION_PATH = "config/pass36/a102r42-package-boundary-denominator-migration.json";
const TEST_PATH = "scripts/pass36/test-a102r42-package-portability-and-parser.mjs";
const CLEAN_PATH = "scripts/pass36/verify-a102r42-clean-unpack.mjs";
const ADDED_IDS = ["reject:nested-failed-stage-contradiction", "reject:nested-stage-row-collapse"];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);
const readStrict = (relativePath) => parseStrictJsonCli(fs.readFileSync(relativePath, "utf8"), { maxBytes: 2 * 1024 * 1024, maxDepth: 64, maxNodes: 100000, requireObject: true });
const resign = (document) => { const core = { ...document }; delete core.migrationDigestSha256; document.migrationDigestSha256 = sha256(canonical(core)); return document; };

function validate(document, parentBytes, testSource, cleanSource) {
  const checks = [];
  const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
  const core = { ...document }; delete core.migrationDigestSha256;
  check("schema", document.schemaVersion === "velmere.pass36.a102r42.package-boundary-denominator-migration.v1");
  check("identity", document.revisionId === REV && document.parentRevisionId === PARENT);
  check("digest", document.migrationDigestSha256 === sha256(canonical(core)));
  check("parent-anchor", document.parentTestPath === "scripts/pass36/test-a102r41-package-portability-and-parser.mjs" && document.parentTestByteLength === 11691 && document.parentTestSha256 === "bab26c82047341950dc4b33986ddc9ad3be784242b550897e3cf51b00f8b344a" && parentBytes.length === document.parentTestByteLength && sha256(parentBytes) === document.parentTestSha256);
  check("denominators", document.oldDenominator === 36 && document.newDenominator === 38);
  check("counts", document.retainedCount === 36 && document.addedCount === 2 && document.removedCount === 0 && document.retainedIds?.length === 36 && document.addedIds?.length === 2 && document.removedIds?.length === 0);
  check("added-exact", canonical(document.addedIds) === canonical(ADDED_IDS));
  check("sets-exact", new Set(document.retainedIds).size === 36 && new Set(document.addedIds).size === 2 && document.retainedIds.every((id) => !document.addedIds.includes(id)) && [...document.retainedIds, ...document.addedIds].every((id) => typeof id === "string" && id.length > 3 && !/[?*]/u.test(id)));
  check("test-source", [...document.retainedIds, ...document.addedIds].every((id) => testSource.includes(JSON.stringify(id))) && testSource.includes("required: 38") && testSource.includes("checks.length !== 38"));
  check("clean-source", cleanSource.includes("Array.isArray(value.failedStages)") && cleanSource.includes("value.stages.length === 29") && cleanSource.includes("new Set(stageIds).size === 29") && cleanSource.includes("value.stages.every((row) => row?.passed === true)"));
  check("truth-boundary", document.verifierChecks === 16 && document.scoreImprovementClaimed === false && document.globalDecision === "NO_GO" && document.live === false && document.saleEnabled === false && document.productionApproved === false && document.worldClassProven === false);
  const collapse = resign({ ...structuredClone(document), newDenominator: 37 }); check("negative-collapse", validateShapeOnly(collapse) === false);
  const removal = resign({ ...structuredClone(document), removedCount: 1, removedIds: [document.retainedIds[0]], retainedCount: 35, retainedIds: document.retainedIds.slice(1) }); check("negative-removal", validateShapeOnly(removal) === false);
  const duplicate = resign({ ...structuredClone(document), addedIds: [document.addedIds[0], document.addedIds[0]] }); check("negative-duplicate", validateShapeOnly(duplicate) === false);
  const wildcard = resign({ ...structuredClone(document), addedIds: [document.addedIds[0], "nested-*"] }); check("negative-wildcard", validateShapeOnly(wildcard) === false);
  const parentTamper = resign({ ...structuredClone(document), parentTestSha256: "0".repeat(64) }); check("negative-parent-anchor", validateShapeOnly(parentTamper) === false);
  return checks;
}

function validateShapeOnly(document) {
  const core = { ...document }; delete core.migrationDigestSha256;
  return document.migrationDigestSha256 === sha256(canonical(core))
    && document.schemaVersion === "velmere.pass36.a102r42.package-boundary-denominator-migration.v1"
    && document.revisionId === REV && document.parentRevisionId === PARENT
    && document.parentTestSha256 === "bab26c82047341950dc4b33986ddc9ad3be784242b550897e3cf51b00f8b344a"
    && document.oldDenominator === 36 && document.newDenominator === 38
    && document.retainedCount === 36 && document.addedCount === 2 && document.removedCount === 0
    && document.retainedIds?.length === 36 && new Set(document.retainedIds).size === 36
    && canonical(document.addedIds) === canonical(ADDED_IDS) && new Set(document.addedIds).size === 2
    && document.removedIds?.length === 0 && [...document.retainedIds, ...document.addedIds].every((id) => typeof id === "string" && !/[?*]/u.test(id));
}

export function verifyA102R42PackageBoundaryMigration() {
  const migration = readStrict(MIGRATION_PATH);
  const parentBytes = fs.readFileSync(migration.parentTestPath);
  const testSource = fs.readFileSync(TEST_PATH, "utf8");
  const cleanSource = fs.readFileSync(CLEAN_PATH, "utf8");
  const checks = validate(migration, parentBytes, testSource, cleanSource);
  const failures = checks.filter((row) => !row.passed);
  return {
    schemaVersion: "velmere.pass36.a102r42.package-boundary-denominator-migration-verification.v1",
    status: failures.length === 0 ? "PASS_A102R42_PACKAGE_BOUNDARY_DENOMINATOR_MIGRATION_36_TO_38_ZERO_REMOVED" : "FAIL_A102R42_PACKAGE_BOUNDARY_DENOMINATOR_MIGRATION",
    checks: checks.length, passed: checks.length - failures.length, failed: failures.length,
    oldDenominator: 36, newDenominator: 38, retainedChecks: 36, addedChecks: 2, removedChecks: 0,
    globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false, failures,
  };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  const report = verifyA102R42PackageBoundaryMigration();
  console.log(JSON.stringify(report, null, 2));
  if (report.failed > 0) process.exitCode = 1;
}
