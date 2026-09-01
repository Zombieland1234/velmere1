#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildRequirementsDocument, readJson, POLICY_PATH, REQUIREMENTS_PATH, sha256File } from "./runtime-lib.mjs";

let passed = 0;
const check = (condition, message) => { if (!condition) throw new Error(message); passed += 1; };
const policy = readJson(POLICY_PATH);
const requirements = buildRequirementsDocument();
const committed = readJson(REQUIREMENTS_PATH);
check(policy.node.version === "24.18.0", "Node policy drift");
check(policy.node.bundledNpmVersion === "11.16.0", "npm policy drift");
check(policy.node.officialArchives["tar.xz"].sha256 === "55aa7153f9d88f28d765fcdad5ae6945b5c0f98a36881703817e4c450fa76742", "tar.xz SHA drift");
check(policy.node.officialArchives["tar.gz"].sha256 === "783130984963db7ba9cbd01089eaf2c2efb055c7c1693c943174b967b3050cb8", "tar.gz SHA drift");
check(requirements.counts.allUniqueRegistryArchives === 790, `Expected 790 lock archives, got ${requirements.counts.allUniqueRegistryArchives}`);
check(requirements.counts.targetEligibleArchives === 682, `Expected 682 eligible archives, got ${requirements.counts.targetEligibleArchives}`);
check(requirements.counts.targetExcludedArchives === 108, `Expected 108 excluded archives, got ${requirements.counts.targetExcludedArchives}`);
check(JSON.stringify(requirements) === JSON.stringify(committed), "Committed requirements drift");
check(requirements.targetEligible.every((row) => row.integrity?.startsWith("sha512-")), "Every eligible archive must have SHA-512 integrity");
check(new Set(requirements.targetEligible.map((row) => row.url)).size === requirements.targetEligible.length, "Eligible URLs must be unique");
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
