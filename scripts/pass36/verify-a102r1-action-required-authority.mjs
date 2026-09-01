#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  REV,
  PARENT,
  FROZEN_SOURCE,
  MANIFEST,
} from "./a102r1-source-boundary.mjs";

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const authority = read("config/pass36/current-release-authority.json");
const mirror = read("config/pass35/current-revision.json");
const legacy = read("config/current-release.json");
const state = read("config/pass36/a102r1-action-required-current-state.json");
const program = read("config/pass36/a102r1-world-class-completion-program.json");
const policy = read(
  "config/pass36/a102-out-of-time-repeated-slo-vendor-exit-observation-policy.json",
);
const rejectedDraft = read("config/pass36/a102-current-root-descendant-manifest.json");
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
    === "config/pass36/a102r1-world-class-completion-program.json"
  && authority.worldClassCompletionProgramRevisionId === REV);
add("authority:program-plane",
  authority.planes?.roadmapProgram?.revisionId === REV
  && authority.planes?.roadmapProgram?.path
    === "config/pass36/a102r1-world-class-completion-program.json"
  && authority.planes?.roadmapProgram?.remainingPasses === 31);
add("authority:a102r1-plane",
  authority.planes?.repeatedSloVendorExitObservationBoundary?.revisionId === REV
  && authority.planes?.repeatedSloVendorExitObservationBoundary
    ?.rejectedDraftRevisionId === PARENT
  && authority.planes?.repeatedSloVendorExitObservationBoundary
    ?.structuralAssertions === 37
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
  && authority.claims?.worldClassProven === false);
add("authority:compatibility-pointers",
  authority.compatibilityPointers
    ?.filter((row) => [
      "config/pass35/current-revision.json",
      "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt",
    ].includes(row.path))
    .every((row) => row.declaredRevisionId === REV));
add("mirror:current",
  mirror.sourceRevisionId === REV
  && mirror.parentSourceRevisionId === PARENT
  && mirror.currentRootDescendantManifestPath === MANIFEST
  && mirror.worldClassCompletionProgramPath
    === "config/pass36/a102r1-world-class-completion-program.json"
  && mirror.a102r1RealObservationRuns === 0
  && mirror.a102r1RealEvidenceBound === false
  && mirror.a90ToA102PassCredit === false);
add("legacy:pointer",
  legacy.notAuthoritativeCurrentSourcePointer === true
  && legacy.authoritativeCurrentSourceRevisionId === REV
  && legacy.authoritativeCurrentSourceParentRevisionId === PARENT
  && legacy.currentRepeatedObservationRevisionId === REV
  && legacy.realRepeatedObservationRuns === 0
  && legacy.a90ToA102PassCredit === false);
add("state:truth",
  state.revisionId === REV
  && state.parentRevisionId === PARENT
  && state.frozenSourceRevisionId === FROZEN_SOURCE
  && state.passCredit?.A102 === false
  && state.localVerification?.a102r1StructuralAssertions === 37
  && state.localVerification?.a102r1RealObservationRuns === 0
  && state.localVerification?.a102r1RealCreditEligible === false);
add("program:truth",
  program.revisionId === REV
  && program.formalRemainingEntries === 31
  && program.passes?.find((row) => row.id === "A102")?.realObservationRuns === 0
  && program.skuDecisions?.pro === "NOT_FOR_SALE"
  && program.skuDecisions?.advanced === "NOT_FOR_SALE");
add("policy:truth",
  policy.revisionId === REV
  && policy.parentRevisionId === PARENT
  && policy.frozenSourceRevisionId === FROZEN_SOURCE
  && policy.localValidatorMode
    === "SYNTHETIC_STRUCTURAL_ONLY_REAL_EVIDENCE_REQUIRES_EXTERNAL_VERIFIER"
  && policy.truthBoundary?.live === false
  && policy.truthBoundary?.saleEnabled === false);
add("rejected-draft:no-false-byte-recovery",
  rejectedDraft.revisionId === PARENT
  && rejectedDraft.parentRevisionId === FROZEN_SOURCE
  && rejectedDraft.sourceBytesRecovered === false
  && rejectedDraft.payloadIdentityAvailable === false
  && rejectedDraft.claims?.a102PassCredit === false);
add("package:current",
  packageJson.velmere?.currentRevisionId === REV
  && packageJson.velmere?.currentRevisionParentId === PARENT
  && packageJson.velmere?.worldClassCompletionProgramPath
    === "config/pass36/a102r1-world-class-completion-program.json");

for (const [id, script, expected] of [
  ["descendant", "scripts/pass36/verify-a102r1-current-root-descendant.mjs",
    "PASS_A102R1_DESCENDANT_NO_PROMOTION"],
  ["boundary",
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
    ? "FAIL_A102R1_AUTHORITY"
    : "PASS_A102R1_ACTION_REQUIRED_AUTHORITY_NO_REAL_OR_STAGING_CREDIT",
  revisionId: REV,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  globalDecision: "NO_GO",
  realObservationRuns: 0,
  productionSloProven: false,
  continuousMonitoringProven: false,
  stagingCredit: false,
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
}, null, 2));
process.exit(failed.length ? 1 : 0);
