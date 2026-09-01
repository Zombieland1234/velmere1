#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  REV, PARENT, OBSERVATION_REVISION, FROZEN_OBSERVATION_SOURCE,
  MANIFEST, STATE, PROGRAM,
} from "./a102r3-source-boundary.mjs";

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const authority = read("config/pass36/current-release-authority.json");
const mirror = read("config/pass35/current-revision.json");
const legacy = read("config/current-release.json");
const state = read(STATE);
const program = read(PROGRAM);
const a58 = read("config/pass36/a58-release-integrity-policy.json");
const packageJson = read("package.json");
const active = fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim();
const readme = fs.readFileSync("README.md", "utf8");
const cleanReadme = fs.readFileSync("CLEAN_SAFE_README.md", "utf8");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

add("active:revision", active === REV, active);
add("authority:identity", authority.authorityRevisionId === REV
  && authority.parentRevisionId === PARENT
  && authority.currentSource?.revisionId === REV
  && authority.currentSource?.parentRevisionId === PARENT);
add("authority:top-level-pointers", authority.currentRootDescendantManifestPath === MANIFEST
  && authority.currentRootDescendantManifestRevisionId === REV
  && authority.worldClassCompletionProgramPath === PROGRAM
  && authority.worldClassCompletionProgramRevisionId === REV);
add("authority:roadmap-plane", authority.planes?.roadmapProgram?.revisionId === REV
  && authority.planes?.roadmapProgram?.path === PROGRAM
  && authority.planes?.roadmapProgram?.completedThrough === 89
  && authority.planes?.roadmapProgram?.remainingPasses === 31);
add("authority:local-closure-plane", authority.planes?.a102r3LocalClosure?.revisionId === REV
  && authority.planes?.a102r3LocalClosure?.parentRevisionId === PARENT
  && authority.planes?.a102r3LocalClosure?.localGapsFound === 13
  && authority.planes?.a102r3LocalClosure?.localGapsFixed === 10
  && authority.planes?.a102r3LocalClosure?.freshExactBuildBrowser === false
  && authority.planes?.a102r3LocalClosure?.a88r2FreshSourceBoundCredit === false
  && authority.planes?.a102r3LocalClosure?.realObservationRuns === 0
  && authority.planes?.a102r3LocalClosure?.passCredit === false);
add("authority:no-promotion", authority.claims?.a90ToA102PassCredit === false
  && authority.claims?.realRepeatedSloVendorExitObservationExecuted === false
  && authority.claims?.exactFinalByteBuildExecuted === false
  && authority.claims?.liveProven === false
  && authority.claims?.saleEnabled === false
  && authority.claims?.productionApproved === false
  && authority.claims?.worldClassProven === false
  && authority.claims?.decision === "NO_GO");
add("authority:compatibility-mirror", authority.compatibilityPointers
  ?.find((row) => row.path === "config/pass35/current-revision.json")?.declaredRevisionId === REV);
add("mirror:current", mirror.sourceRevisionId === REV
  && mirror.parentSourceRevisionId === PARENT
  && mirror.currentRootDescendantManifestPath === MANIFEST
  && mirror.worldClassCompletionProgramPath === PROGRAM
  && mirror.a102r3RealObservationRuns === 0
  && mirror.a102r3ExactReleaseCredit === false
  && mirror.a90ToA102PassCredit === false);
add("legacy:pointer", legacy.notAuthoritativeCurrentSourcePointer === true
  && legacy.authoritativeCurrentSourceRevisionId === REV
  && legacy.authoritativeCurrentSourceParentRevisionId === PARENT
  && legacy.currentRepeatedObservationRevisionId === OBSERVATION_REVISION
  && legacy.realRepeatedObservationRuns === 0
  && legacy.a90ToA102PassCredit === false);
add("state:identity-and-truth", state.revisionId === REV
  && state.parentRevisionId === PARENT
  && state.frozenObservationSourceRevisionId === FROZEN_OBSERVATION_SOURCE
  && state.completedThrough === 89
  && state.passCredit?.A102 === false
  && state.passCredit?.A103ToA116 === false
  && state.passCredit?.A77R1ToA80R1 === false
  && state.passCredit?.A88R2 === false
  && state.promotion?.globalDecision === "NO_GO"
  && state.promotion?.live === false
  && state.promotion?.saleEnabled === false);
add("state:fresh-runtime-truth", state.runtimeTruth?.currentAuditExecutionNodeVersion === "22.16.0"
  && state.runtimeTruth?.requiredNodeVersion === "24.18.0"
  && state.runtimeTruth?.freshNpmCiOnA102R3BytesExecuted === false
  && state.runtimeTruth?.freshWebpackBuildOnA102R3BytesExecuted === false
  && state.runtimeTruth?.freshTurbopackBuildOnA102R3BytesExecuted === false
  && state.runtimeTruth?.freshExactBrowserRowsExecuted === 0
  && state.runtimeTruth?.exactReleaseCreditGranted === false);
add("program:exact-sequence-and-truth", program.revisionId === REV
  && program.parentRevisionId === PARENT
  && program.formalRemainingEntries === 31
  && program.passes?.map((row) => row.id).join(",") === "A102,A103,A104,A105,A106,A107,A108,A109,A110,A111,A112,A113,A114,A115,A116"
  && program.passes?.every((row) => row.credit === false)
  && program.closureTracks?.every((row) => row.credit === false)
  && program.newRoadmapGaps?.some((row) => row.id === "A102R3-GAP-12")
  && program.newRoadmapGaps?.some((row) => row.id === "A102R3-GAP-13"));
add("package:current", packageJson.velmereCurrentReleaseAuthorityPass === REV
  && packageJson.velmereWorldClassCompletionProgramPass === REV
  && packageJson.velmereWorldClassCompletionProgramPath === PROGRAM
  && packageJson.velmereCurrentRootDescendantManifestPath === MANIFEST
  && packageJson.velmere?.currentRevisionId === REV
  && packageJson.velmere?.currentRevisionParentId === PARENT
  && packageJson.velmere?.saleEnabled === false);
add("readmes:current", readme.includes(`Current source revision: \`${REV}\``)
  && cleanReadme.includes(`Current source revision: \`${REV}\``));
add("a58:current", a58.currentCheckpointRevisionId === REV
  && a58.currentCheckpointParentRevisionId === PARENT
  && a58.currentDescendantManifestPath === MANIFEST
  && a58.currentAuthorityVerifierPath === "scripts/pass36/verify-a102r3-action-required-authority.mjs"
  && a58.archiveManifestPath === "_velmere/PASS36_A102R3_SOURCE_ONLY_MANIFEST.json");

for (const [id, script, expected] of [
  ["descendant", "scripts/pass36/verify-a102r3-current-root-descendant.mjs", "PASS_A102R3_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION"],
  ["local-regression", "scripts/pass36/verify-a102r3-local-regression-receipt.mjs", "PASS_A102R3_LOCAL_REGRESSION_RECEIPT_ACTION_REQUIRED_NO_PROMOTION"],
  ["observation-boundary", "scripts/pass36/test-a102-repeated-slo-vendor-exit-observation-boundaries.mjs", "PASS_A102R1_STRUCTURAL_BOUNDARY_LOCAL_SYNTHETIC_ONLY_REAL_CLAIMS_REJECTED"],
]) {
  const result = spawnSync(process.execPath, [script], { encoding: "utf8", timeout: 900_000 });
  let parsed = null;
  try { parsed = JSON.parse(result.stdout); } catch {
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  }
  add(`${id}:verified`, result.status === 0
    && (parsed?.decision === expected || parsed?.status === expected), {
      status: result.status,
      parsedStatus: parsed?.decision ?? parsed?.status ?? null,
      stderr: (result.stderr ?? "").slice(-1600),
    });
}
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  status: failed.length ? "FAIL_A102R3_AUTHORITY" : "PASS_A102R3_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_OR_STAGING_CREDIT",
  revisionId: REV,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  globalDecision: "NO_GO",
  realObservationRuns: 0,
  freshExactBuildBrowserCredit: false,
  freshA88R2SourceBoundCredit: false,
  stagingCredit: false,
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
}, null, 2));
process.exit(failed.length ? 1 : 0);
