#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildRequirementsDocument, buildRequirementsSeal, readJson, POLICY_PATH, SEAL_PATH, sha256File } from "./runtime-lib.mjs";

let passed = 0;
const check = (condition, message) => { if (!condition) throw new Error(message); passed += 1; };
const policy = readJson(POLICY_PATH);
const requirements = buildRequirementsDocument();
const committedSeal = readJson(SEAL_PATH);
const generatedSeal = buildRequirementsSeal(requirements);

check(policy.node.version === "24.18.0", "Node policy drift");
check(policy.node.bundledNpmVersion === "11.16.0", "npm policy drift");
check(policy.node.officialArchives["tar.xz"].sha256 === "55aa7153f9d88f28d765fcdad5ae6945b5c0f98a36881703817e4c450fa76742", "tar.xz SHA drift");
check(policy.node.officialArchives["tar.gz"].sha256 === "783130984963db7ba9cbd01089eaf2c2efb055c7c1693c943174b967b3050cb8", "tar.gz SHA drift");
check(JSON.stringify(generatedSeal) === JSON.stringify(committedSeal), "Committed requirements seal drift");
check(requirements.counts.allUniqueRegistryArchives === committedSeal.counts.allUniqueRegistryArchives, "All-archive count differs from committed seal");
check(requirements.counts.targetEligibleArchives === committedSeal.counts.targetEligibleArchives, "Eligible-archive count differs from committed seal");
check(requirements.counts.targetExcludedArchives === committedSeal.counts.targetExcludedArchives, "Excluded-archive count differs from committed seal");
check(requirements.counts.targetEligibleArchives > 0, "Eligible archive denominator must be non-zero");
check(requirements.targetEligible.every((row) => row.integrity?.startsWith("sha512-")), "Every eligible archive must have SHA-512 integrity");
check(new Set(requirements.targetEligible.map((row) => row.url)).size === requirements.targetEligible.length, "Eligible URLs must be unique");
check(/^[0-9a-f]{64}$/u.test(committedSeal.generatedManifestSha256), "Generated manifest SHA-256 must be a 64-char hex digest");
const blocked = spawnSync(process.execPath, ["scripts/pass24/run-exact-milestone.mjs"], { cwd: process.cwd(), encoding: "utf8" });
check(blocked.status === 2, "Heavy milestone must be blocked without --allow-heavy");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-pass24-test-"));
try {
  const fake = path.join(temporary, policy.node.officialArchives["tar.xz"].fileName);
  fs.writeFileSync(fake, "not-an-official-runtime");
  const rejected = spawnSync(process.execPath, ["scripts/pass24/import-exact-runtime.mjs", "--archive", fake], { cwd: process.cwd(), encoding: "utf8" });
  check(rejected.status !== 0, "Wrong runtime archive SHA must be rejected");
  check(sha256File(fake) !== policy.node.officialArchives["tar.xz"].sha256, "Fake archive unexpectedly matches official SHA");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
console.log(`PASS24 runtime acquisition boundaries: ${passed}/${passed} PASS`);
