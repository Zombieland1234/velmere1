#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  REV,
  PARENT,
  OBSERVATION_REVISION,
  FROZEN_OBSERVATION_SOURCE,
  MANIFEST,
} from "./a102r2-source-boundary.mjs";

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const authority = read("config/pass36/current-release-authority.json");
const mirror = read("config/pass35/current-revision.json");
const legacy = read("config/current-release.json");
const state = read("config/pass36/a102r2-action-required-current-state.json");
const program = read("config/pass36/a102r2-world-class-completion-program.json");
const observationPolicy = read(
  "config/pass36/a102-out-of-time-repeated-slo-vendor-exit-observation-policy.json",
);
const packageJson = read("package.json");
const active = fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim();
const checks = [];
const add = (id, passed, detail = null) =>
  checks.push({ id, passed: Boolean(passed), detail });

add("active:revision", active === REV, active);
add("authority:identity",
  authority.authorityRevisionId === REV
  && authority.parentRevisionId === PARENT
  && authority.currentSource?.revisionId === REV
  && authority.currentSource?.parentRevisionId === PARENT);
add("authority:top-level-pointers",
  authority.currentRootDescendantManifestPath === MANIFEST
  && authority.currentRootDescendantManifestRevisionId === REV
  && authority.worldClassCompletionProgramPath
    === "config/pass36/a102r2-world-class-completion-program.json"
  && authority.worldClassCompletionProgramRevisionId === REV);
add("authority:roadmap-plane",
  authority.planes?.roadmapProgram?.revisionId === REV
  && authority.planes?.roadmapProgram?.path
    === "config/pass36/a102r2-world-class-completion-program.json"
  && authority.planes?.roadmapProgram?.completedThrough === 89
  && authority.planes?.roadmapProgram?.remainingPasses === 31);
add("authority:local-closure-plane",
  authority.planes?.a102r2LocalClosure?.revisionId === REV
  && authority.planes?.a102r2LocalClosure?.parentRevisionId === PARENT
  && authority.planes?.a102r2LocalClosure?.a88r2BehavioralHandlerInvocations === 324
  && authority.planes?.a102r2LocalClosure?.a88r2ResignedSemanticMutantsKilled === 6480
  && authority.planes?.a102r2LocalClosure?.realObservationRuns === 0
  && authority.planes?.a102r2LocalClosure?.realStagingStages === 0
  && Array.from({ length: 13 }, (_, index) => index + 90)
    .every((pass) =>
      authority.planes?.a102r2LocalClosure?.[`a${pass}PassCredit`] === false)
  && authority.planes?.a102r2LocalClosure?.passCredit === false);
add("authority:observation-plane-preserved",
  authority.planes?.repeatedSloVendorExitObservationBoundary?.revisionId
    === OBSERVATION_REVISION
  && authority.planes?.repeatedSloVendorExitObservationBoundary
    ?.realObservationRuns === 0
  && authority.planes?.repeatedSloVendorExitObservationBoundary
    ?.realEvidenceBound === false);
add("authority:no-promotion",
  authority.claims?.a90ToA102PassCredit === false
  && authority.claims?.realRepeatedSloVendorExitObservationExecuted === false
  && authority.claims?.liveProven === false
  && authority.claims?.saleEnabled === false
  && authority.claims?.productionApproved === false
  && authority.claims?.worldClassProven === false
  && authority.claims?.decision === "NO_GO");
add("authority:compatibility-mirror",
  authority.compatibilityPointers
    ?.find((row) => row.path === "config/pass35/current-revision.json")
    ?.declaredRevisionId === REV);
add("mirror:current",
  mirror.sourceRevisionId === REV
  && mirror.parentSourceRevisionId === PARENT
  && mirror.currentRootDescendantManifestPath === MANIFEST
  && mirror.worldClassCompletionProgramPath
    === "config/pass36/a102r2-world-class-completion-program.json"
  && mirror.a102r2RealObservationRuns === 0
  && mirror.a102r2ExactReleaseCredit === false
  && mirror.a90ToA102PassCredit === false);
add("legacy:pointer",
  legacy.notAuthoritativeCurrentSourcePointer === true
  && legacy.authoritativeCurrentSourceRevisionId === REV
  && legacy.authoritativeCurrentSourceParentRevisionId === PARENT
  && legacy.currentRepeatedObservationRevisionId === OBSERVATION_REVISION
  && legacy.realRepeatedObservationRuns === 0
  && legacy.a90ToA102PassCredit === false);
add("state:identity-and-truth",
  state.revisionId === REV
  && state.parentRevisionId === PARENT
  && state.frozenObservationSourceRevisionId === FROZEN_OBSERVATION_SOURCE
  && state.completedThrough === 89
  && state.passCredit?.A102 === false
  && state.passCredit?.A103ToA116 === false
  && state.passCredit?.A77R1ToA80R1 === false
  && state.promotion?.globalDecision === "NO_GO"
  && state.promotion?.live === false
  && state.promotion?.saleEnabled === false);
add("state:denominators",
  state.denominators?.a102ObservationRuns?.realVerified === 0
  && state.denominators?.providerRights?.approved === 0
  && state.denominators?.legalDpo?.signed === 0
  && state.denominators?.officialAuditToolRuns?.executed === 0
  && state.denominators?.realCustomerPdfCases?.verified === 0
  && state.denominators?.customerCohorts?.verified === 0);
add("state:runtime-truth",
  state.runtimeTruth?.observedNodeVersion === "24.18.0"
  && state.runtimeTruth?.observedNpmVersion === "11.16.0"
  && state.runtimeTruth?.historicalRequiredDependencyDenominator === 827
  && state.runtimeTruth?.currentPhysicalLockfilePackageRows === 654
  && state.runtimeTruth?.currentResolvedAndSriRows === 654
  && state.runtimeTruth?.requiredChromiumVersion === "148.0.7778.96"
  && state.runtimeTruth?.observedChromiumVersion === "148.0.7778.0"
  && state.runtimeTruth?.exactPlaywrightChromiumVerified === false);
add("program:exact-sequence-and-truth",
  program.revisionId === REV
  && program.formalRemainingEntries === 31
  && program.passes?.map((row) => row.id).join(",")
    === "A102,A103,A104,A105,A106,A107,A108,A109,A110,A111,A112,A113,A114,A115,A116"
  && program.passes?.every((row) => row.credit === false)
  && program.closureTracks?.every((row) => row.credit === false)
  && program.repairRevisions?.find((row) => row.id === "A88R2")
    ?.creditBoundary === "LOCAL_BEHAVIORAL_ONLY");
add("observation-policy:historical-current-boundary",
  observationPolicy.revisionId === OBSERVATION_REVISION
  && observationPolicy.parentRevisionId.includes("A102R0")
  && observationPolicy.frozenSourceRevisionId === FROZEN_OBSERVATION_SOURCE
  && observationPolicy.truthBoundary?.live === false
  && observationPolicy.truthBoundary?.saleEnabled === false);
add("package:current",
  packageJson.velmere?.currentRevisionId === REV
  && packageJson.velmere?.currentRevisionParentId === PARENT
  && packageJson.velmere?.worldClassCompletionProgramPath
    === "config/pass36/a102r2-world-class-completion-program.json"
  && packageJson.velmere?.checkpointClass === "ACTION_REQUIRED_NON_PASS"
  && packageJson.velmere?.saleEnabled === false);

for (const [id, script, expected] of [
  ["descendant", "scripts/pass36/verify-a102r2-current-root-descendant.mjs",
    "PASS_A102R2_DESCENDANT_NO_PROMOTION"],
  ["observation-boundary",
    "scripts/pass36/test-a102-repeated-slo-vendor-exit-observation-boundaries.mjs",
    "PASS_A102R1_STRUCTURAL_BOUNDARY_LOCAL_SYNTHETIC_ONLY_REAL_CLAIMS_REJECTED"],
]) {
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    timeout: 900_000,
  });
  const parsed = (() => {
    try {
      return JSON.parse(result.stdout);
    } catch {
      return null;
    }
  })();
  add(`${id}:verified`,
    result.status === 0
    && (parsed?.decision === expected || parsed?.status === expected),
    {
      status: result.status,
      parsedStatus: parsed?.decision ?? parsed?.status ?? null,
      stderr: (result.stderr ?? "").slice(-1600),
    });
}

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  status: failed.length
    ? "FAIL_A102R2_AUTHORITY"
    : "PASS_A102R2_ACTION_REQUIRED_AUTHORITY_NO_REAL_OR_STAGING_CREDIT",
  revisionId: REV,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  globalDecision: "NO_GO",
  realObservationRuns: 0,
  stagingCredit: false,
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false
}, null, 2));
process.exit(failed.length ? 1 : 0);
