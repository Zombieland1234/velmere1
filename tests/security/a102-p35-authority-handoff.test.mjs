import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const authorityPath = path.join(root, "artifacts/closure/p35/CURRENT_AUTHORITY_P35.json");
const handoffPath = path.join(root, "artifacts/closure/p35/P35_HANDOFF_MANIFEST.json");
const authority = JSON.parse(fs.readFileSync(authorityPath, "utf8"));
const handoff = JSON.parse(fs.readFileSync(handoffPath, "utf8"));
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, p))).digest("hex");

let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks += 1; }

check(authority.schemaVersion === "velmere.p35.current-authority.v1", "authority schema");
check(authority.state === "CURRENT_SOURCE_ONLY_IN_PROGRESS", "authority state");
check(authority.execution.internalAiRows === 5147, "AI rows");
check(authority.execution.internalAiDenominator === 5147, "AI denominator");
check(authority.execution.dynamicEligibilityProfiles === 33, "eligibility denominator");
check(authority.execution.analysisEligibleProfiles === 11, "analysis eligible");
check(authority.execution.saleEligibleProfiles === 0, "sale eligible fail closed");
check(authority.paidReadiness.axisCount === 12, "paid axes");
check(authority.paidReadiness.releasePass === 0, "release paid axes remain zero");
check(authority.paidReadiness.goPaidAllowed === false, "GO_PAID false");
check(authority.openTruth.finalTierValueHoldoutsClosed === 0, "holdouts open");
check(authority.openTruth.realExternalTracksClosed === 0, "external open");
check(authority.openTruth.goInternal === false, "GO_INTERNAL false");
check(authority.openTruth.worldClassProven === false, "world class false");
check(authority.authorityFiles.methodology.sha256 === sha(authority.authorityFiles.methodology.path), "method hash");
check(authority.authorityFiles.growthIntel.sha256 === sha(authority.authorityFiles.growthIntel.path), "growth hash");
check(authority.authorityFiles.requirementR3CurrentMapping.sha256 === sha(authority.authorityFiles.requirementR3CurrentMapping.path), "R3 hash");
check(handoff.requiredUserArtifacts.length === 3, "exactly three user artifacts");
check(handoff.requiredUserArtifacts[2].path.endsWith(".zip"), "SOURCE archive last");
check(handoff.rule.includes("SOURCE is the final link"), "handoff rule");

console.log(`P35 authority handoff: ${checks}/${checks} PASS`);
