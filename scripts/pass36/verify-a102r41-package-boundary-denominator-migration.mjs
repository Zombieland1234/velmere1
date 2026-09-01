import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";

const REVISION_ID = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const MIGRATION_PATH = "config/pass36/a102r41-package-boundary-denominator-migration.json";
const TEST_PATH = "scripts/pass36/test-a102r41-package-portability-and-parser.mjs";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const unique = (values) => Array.isArray(values) && new Set(values).size === values.length;

export function verifyPackageBoundaryMigration(root = process.cwd()) {
  const migration = JSON.parse(fs.readFileSync(path.join(root, MIGRATION_PATH), "utf8"));
  const testSource = fs.readFileSync(path.join(root, TEST_PATH), "utf8");
  const checks = [];
  const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
  check("schema", migration.schemaVersion === "velmere.pass36.a102r41.package-boundary-denominator-migration.v1");
  check("revision", migration.revisionId === REVISION_ID);
  check("old-denominator", migration.oldDenominator === 17);
  check("new-denominator", migration.newDenominator === 36);
  check("retained-count", migration.retainedCheckIds?.length === 17);
  check("added-count", migration.addedCheckIds?.length === 19);
  check("removed-zero", Array.isArray(migration.removedCheckIds) && migration.removedCheckIds.length === 0 && migration.testsRemovedForScore === 0);
  check("retained-unique", unique(migration.retainedCheckIds));
  check("added-unique", unique(migration.addedCheckIds));
  check("no-overlap", migration.retainedCheckIds?.every((id) => !migration.addedCheckIds?.includes(id)));
  check("denominator-formula", migration.newDenominator === migration.retainedCheckIds?.length + migration.addedCheckIds?.length);
  check("test-markers-complete", [...migration.retainedCheckIds, ...migration.addedCheckIds].every((id) => testSource.includes(JSON.stringify(id))));
  check("verifier-path", migration.verifierPath === "scripts/pass36/verify-a102r41-package-boundary-denominator-migration.mjs");
  check("reason", typeof migration.reason === "string" && migration.reason.includes("Retain all 17") && migration.reason.includes("19 unique"));
  check("no-promotion", migration.scoreCredit === false && migration.globalDecision === "NO_GO" && migration.live === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);
  check("negative-collapse", migration.oldDenominator !== 16 && migration.newDenominator > migration.oldDenominator);
  check("negative-removal", migration.retainedCheckIds?.length === migration.oldDenominator);
  check("negative-duplicate", new Set([...migration.retainedCheckIds, ...migration.addedCheckIds]).size === migration.newDenominator);
  check("negative-overlap", !migration.retainedCheckIds?.some((id) => migration.addedCheckIds?.includes(id)));
  const core = { ...migration };
  delete core.migrationDigestSha256;
  check("self-digest", /^[a-f0-9]{64}$/u.test(migration.migrationDigestSha256) && migration.migrationDigestSha256 === sha256(canonicalJson(core)));
  const failed = checks.filter((row) => !row.passed);
  return {
    schemaVersion: "velmere.pass36.a102r41.package-boundary-denominator-migration-verification.v1",
    revisionId: REVISION_ID,
    status: failed.length === 0 ? "PASS_A102R41_PACKAGE_BOUNDARY_DENOMINATOR_MIGRATION_NO_PROMOTION" : "FAIL_A102R41_PACKAGE_BOUNDARY_DENOMINATOR_MIGRATION",
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    oldDenominator: migration.oldDenominator,
    newDenominator: migration.newDenominator,
    retainedChecks: migration.retainedCheckIds?.length ?? 0,
    addedChecks: migration.addedCheckIds?.length ?? 0,
    removedChecks: migration.removedCheckIds?.length ?? 0,
    failures: failed,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const result = verifyPackageBoundaryMigration();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exit(1);
}
