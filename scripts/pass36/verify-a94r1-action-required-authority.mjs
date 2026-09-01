#!/usr/bin/env node
import { readFileSync } from "node:fs";
import {
  A94R1_MANIFEST_PATH,
  A94R1_PARENT,
  A94R1_PARENT_MANIFEST_DIGEST,
  A94R1_REVISION,
  buildA94R1Payload,
  collectA94R1SourceRows,
  digestValid,
  readJson,
} from "./a94r1-source-boundary.mjs";

const root = process.cwd();
const authority = readJson(
  root,
  "config/pass36/current-release-authority.json",
);
const mirror = readJson(root, "config/pass35/current-revision.json");
const legacy = readJson(root, "config/current-release.json");
const state = readJson(
  root,
  "config/pass36/a94r1-action-required-current-state.json",
);
const program = readJson(
  root,
  "config/pass36/a94r1-world-class-completion-program.json",
);
const manifest = readJson(root, A94R1_MANIFEST_PATH);
const active = readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim();
const inventory = collectA94R1SourceRows(root);
const observedPayload = buildA94R1Payload(inventory.rows);

const checks = [];
function check(id, passed, detail = null) {
  checks.push({ id, passed: Boolean(passed), detail });
}

check("active:revision", active === A94R1_REVISION, active);
check(
  "authority:revision",
  authority.authorityRevisionId === A94R1_REVISION &&
    authority.currentSource?.revisionId === A94R1_REVISION,
  authority.currentSource,
);
check(
  "authority:parent",
  authority.parentRevisionId === A94R1_PARENT &&
    authority.currentSource?.parentRevisionId === A94R1_PARENT,
  authority.parentRevisionId,
);
check(
  "authority:program",
  authority.planes?.roadmapProgram?.revisionId === A94R1_REVISION &&
    authority.planes?.roadmapProgram?.path ===
      "config/pass36/a94r1-world-class-completion-program.json" &&
    authority.worldClassCompletionProgramRevisionId === A94R1_REVISION &&
    authority.worldClassCompletionProgramPath ===
      "config/pass36/a94r1-world-class-completion-program.json",
  authority.planes?.roadmapProgram,
);
check(
  "authority:sparse-non-pass",
  authority.planes?.localHardeningCheckpoint?.checkpointClass ===
    "ACTION_REQUIRED_NON_PASS" &&
    authority.planes?.localHardeningCheckpoint?.completedThrough === 89 &&
    authority.planes?.localHardeningCheckpoint?.a90PassCredit === false &&
    authority.planes?.localHardeningCheckpoint?.a94PassCredit === false,
  authority.planes?.localHardeningCheckpoint,
);
check(
  "authority:claims",
  authority.claims?.currentRevisionId === A94R1_REVISION &&
    authority.claims?.parentRevisionId === A94R1_PARENT &&
    authority.claims?.checkpointClass === "ACTION_REQUIRED_NON_PASS" &&
    authority.claims?.a90ToA94PassCredit === false &&
    authority.claims?.decision === "NO_GO" &&
    authority.claims?.exactFinalByteBuildExecuted === false &&
    authority.claims?.realStagingExecuted === false &&
    authority.claims?.liveProven === false &&
    authority.claims?.saleEnabled === false &&
    authority.claims?.productionApproved === false &&
    authority.claims?.worldClassProven === false,
  authority.claims,
);
check(
  "mirror:revision",
  mirror.sourceRevisionId === A94R1_REVISION &&
    mirror.parentSourceRevisionId === A94R1_PARENT &&
    mirror.currentReleaseAuthorityRevisionId === A94R1_REVISION &&
    mirror.checkpointClass === "ACTION_REQUIRED_NON_PASS" &&
    mirror.a90ToA94PassCredit === false,
  {
    sourceRevisionId: mirror.sourceRevisionId,
    parentSourceRevisionId: mirror.parentSourceRevisionId,
    checkpointClass: mirror.checkpointClass,
  },
);
check(
  "legacy:pointer-class",
  legacy.notAuthoritativeCurrentSourcePointer === true &&
    legacy.authoritativeCurrentSourceRevisionId === A94R1_REVISION,
  {
    notAuthoritative: legacy.notAuthoritativeCurrentSourcePointer,
    current: legacy.authoritativeCurrentSourceRevisionId,
  },
);
check(
  "state:truth",
  state.revisionId === A94R1_REVISION &&
    state.parentRevisionId === A94R1_PARENT &&
    state.checkpointClass === "ACTION_REQUIRED_NON_PASS" &&
    state.completedThrough === 89 &&
    Object.values(state.passCredit ?? {}).every((value) => value === false) &&
    state.promotion?.live === false &&
    state.promotion?.saleEnabled === false &&
    state.promotion?.productionApproved === false &&
    state.promotion?.worldClassProven === false,
  state.passCredit,
);
check(
  "state:local-evidence-without-release-credit",
  state.localVerification?.fullLintPassed === true &&
    state.localVerification?.productionRuntimeSmokePassed === true &&
    state.localVerification?.currentRoot30Of30PassedOnFinalBytes === true &&
    state.localVerification?.sourceFrozen === true &&
    state.localVerification?.cleanUnpackPassed === false &&
    state.localVerification?.browserExecuted === false &&
    state.localVerification?.exactReleaseCreditGranted === false &&
    state.localVerification?.browserCreditGranted === false,
  state.localVerification,
);
check(
  "program:truth",
  program.revisionId === A94R1_REVISION &&
    program.parentRevisionId === A94R1_PARENT &&
    program.completedThrough === 89 &&
    program.remainingPasses === 31 &&
    program.promotion?.globalDecision === "NO_GO" &&
    program.promotion?.live === false &&
    program.promotion?.saleEnabled === false &&
    program.promotion?.productionApproved === false,
  {
    revisionId: program.revisionId,
    remainingPasses: program.remainingPasses,
    promotion: program.promotion,
  },
);
check(
  "denominator:shield",
  state.denominators?.shieldAssets?.required === 318 &&
    state.denominators?.shieldAssets?.unavailableOrBlocked === 318 &&
    state.denominators?.shieldProMapAssets?.required === 318 &&
    state.denominators?.shieldProMapAssets?.unavailableOrBlocked === 318,
  state.denominators,
);
check(
  "denominator:real-markets",
  state.denominators?.realMarketsInstruments?.required === 583 &&
    state.denominators?.realMarketsInstruments
      ?.unavailableOrBlocked === 583,
  state.denominators?.realMarketsInstruments,
);
check(
  "manifest:digest",
  digestValid(manifest),
  manifest.manifestDigestSha256,
);
check(
  "manifest:lineage",
  manifest.revisionId === A94R1_REVISION &&
    manifest.parentRevisionId === A94R1_PARENT &&
    manifest.parentDescendantManifestDigestSha256 ===
      A94R1_PARENT_MANIFEST_DIGEST &&
    manifest.checkpointClass === "ACTION_REQUIRED_NON_PASS",
  {
    revisionId: manifest.revisionId,
    parentRevisionId: manifest.parentRevisionId,
    parentDigest: manifest.parentDescendantManifestDigestSha256,
  },
);
for (const key of Object.keys(observedPayload)) {
  check(
    `manifest:payload:${key}`,
    manifest.payload?.[key] === observedPayload[key],
    {
      declared: manifest.payload?.[key],
      observed: observedPayload[key],
    },
  );
}
check(
  "manifest:no-rejected-source",
  inventory.rejected.length === 0,
  inventory.rejected,
);
check(
  "manifest:no-credit",
  Object.values(manifest.claims ?? {}).every((value) => value === false),
  manifest.claims,
);

const failures = checks.filter((row) => !row.passed);
console.log(
  JSON.stringify(
    {
      schemaVersion:
        "velmere.pass36.a94r1.action-required-authority-verification.v1",
      revisionId: A94R1_REVISION,
      status: failures.length
        ? "FAIL_A94R1_ACTION_REQUIRED_AUTHORITY"
        : "PASS_A94R1_ACTION_REQUIRED_AUTHORITY_NO_PASS_CREDIT",
      checks: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      failures,
      payload: observedPayload,
      globalDecision: "NO_GO",
      live: false,
      saleEnabled: false,
      productionApproved: false,
    },
    null,
    2,
  ),
);
if (failures.length) process.exit(1);
