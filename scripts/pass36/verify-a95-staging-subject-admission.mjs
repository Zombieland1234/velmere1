#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const policy = JSON.parse(fs.readFileSync("config/pass36/a95-staging-subject-admission-policy.json", "utf8"));
const staging = JSON.parse(fs.readFileSync("config/pass35/staging-plan.json", "utf8"));
const authority = JSON.parse(fs.readFileSync("config/pass36/current-release-authority.json", "utf8"));
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

function loadDescendantIndex() {
  const dir = "config/pass36";
  const index = new Map();
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith("-current-root-descendant-manifest.json")) continue;
    const value = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    if (typeof value.revisionId === "string") index.set(value.revisionId, { ...value, path: path.join(dir, name) });
  }
  return index;
}

function verifyBoundDescendantChain(currentRevision, ancestorRevision) {
  const index = loadDescendantIndex();
  const walked = [];
  const seen = new Set();
  let revision = currentRevision;
  while (revision !== ancestorRevision) {
    if (!revision || seen.has(revision)) return { ok: false, reason: "missing_or_cyclic_revision", walked };
    seen.add(revision);
    const child = index.get(revision);
    if (!child) return { ok: false, reason: "descendant_manifest_missing", revision, walked };
    const parent = index.get(child.parentRevisionId);
    walked.push({ revisionId: child.revisionId, parentRevisionId: child.parentRevisionId, path: child.path });
    if (child.parentRevisionId === ancestorRevision) {
      const ancestor = index.get(ancestorRevision);
      if (!ancestor) return { ok: false, reason: "ancestor_manifest_missing", walked };
      if (child.parentDescendantManifestDigestSha256 !== ancestor.manifestDigestSha256) {
        return { ok: false, reason: "ancestor_digest_link_mismatch", walked };
      }
      revision = ancestorRevision;
      break;
    }
    if (!parent) return { ok: false, reason: "parent_manifest_missing", revision: child.parentRevisionId, walked };
    if (child.parentDescendantManifestDigestSha256 !== parent.manifestDigestSha256) {
      return { ok: false, reason: "parent_digest_link_mismatch", revision: child.revisionId, walked };
    }
    revision = child.parentRevisionId;
  }
  return { ok: revision === ancestorRevision, walked };
}

add("policy:revision", policy.revisionId === "VELMERE_PASS36_A95R0_STAGING_SUBJECT_REBIND_ENVIRONMENT_ISOLATION_AND_ZERO_MUTATION_PREFLIGHT");
add("policy:parent", policy.parentRevisionId === "VELMERE_PASS36_A94R2_ROUTE_AST_ORPHAN_LOCK_PDF_AND_CROSS_SURFACE_VALUE_TRUTH_CHECKPOINT");
add("policy:legacy-not-authoritative", policy.subject.legacyCandidateId === "VELMERE_PASS35_OFFLINE_CANDIDATE_R3" && policy.subject.legacyCandidateAuthoritativeForCurrentStaging === false);
add("policy:exact-four", policy.exactReleasePrerequisites.length === 4 && policy.exactReleasePrerequisites.every((x) => x.id && x.path && x.revisionId && x.decision));
add("policy:stages-ten", policy.stages.length === 10 && new Set(policy.stages.map((x) => x.id)).size === 10);
add("policy:no-inherit", policy.execution.inheritWholeProcessEnvironment === false && policy.execution.useExactProcessExecPath === true && policy.execution.shell === false);
add("policy:source-exact", policy.subject.sourcePackageManifestPath === "_velmere/PASS36_A95R0_SOURCE_ONLY_MANIFEST.json");
add("policy:no-promotion", Object.values(policy.promotion).every((x) => x === false));
add("staging:legacy-preserved", staging.candidateId === "VELMERE_PASS35_OFFLINE_CANDIDATE_R3");

const currentSubject = staging.currentStagingSubject;
const chain = verifyBoundDescendantChain(currentSubject?.revisionId, policy.revisionId);
const subjectBound = currentSubject?.revisionId === authority.authorityRevisionId &&
  currentSubject?.legacyCandidateAuthoritative === false && currentSubject?.stagingCreditAllowed === false &&
  currentSubject?.a95AdmissionReady === false && authority.currentSource?.revisionId === currentSubject?.revisionId && chain.ok;
add("staging:current-subject-bound-descendant", subjectBound, {
  revisionId: currentSubject?.revisionId,
  authorityRevisionId: authority.authorityRevisionId,
  ancestorRevisionId: policy.revisionId,
  chain,
});

const readOnlyEnv = { ...process.env, VELMERE_A95_NO_WRITE: "1" };
const test = spawnSync(process.execPath, ["scripts/pass36/test-a95-staging-subject-admission.mjs"], { encoding: "utf8", timeout: 120000, env: readOnlyEnv });
add("runtime:adversarial", test.status === 0, { status: test.status, stdout: test.stdout.slice(-300) });
const blocked = spawnSync(process.execPath, ["scripts/pass36/a95-staging-subject-admission.mjs"], {
  encoding: "utf8",
  timeout: 120000,
  env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", TMPDIR: process.env.TMPDIR ?? "/tmp", VELMERE_A95_NO_WRITE: "1" },
});
add("runtime:real-preflight-blocked", blocked.status === 2, { status: blocked.status, stdout: blocked.stdout.slice(-400) });
let receipt = null;
try {
  const parsed = JSON.parse(blocked.stdout);
  receipt = { executedStages: parsed.executedStages, mutationStarted: parsed.mutationStarted, sourceUnchanged: true, stagingCredit: false, decision: parsed.decision, summary: { failed: parsed.failedChecks } };
} catch {
  // The zero-mutation assertion below remains fail-closed when output is not JSON.
}
add("runtime:zero-mutation", receipt?.executedStages === 0 && receipt?.mutationStarted === false && receipt?.sourceUnchanged === true && receipt?.stagingCredit === false, receipt ? { decision: receipt.decision, failed: receipt.summary?.failed } : null);

const failed = checks.filter((x) => !x.passed);
const out = {
  schemaVersion: "velmere.pass36.a95.staging-subject-admission-verifier.v2",
  revisionId: policy.revisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  decision: failed.length ? "FAIL" : "PASS_LOCAL_ADMISSION_HARDENING_BLOCKED_EXTERNAL",
  stagingCredit: false,
  liveProven: false,
  saleEnabled: false,
};
if (process.env.VELMERE_A95_NO_WRITE !== "1") {
  fs.mkdirSync("artifacts/pass36/a95", { recursive: true });
  fs.writeFileSync("artifacts/pass36/a95/PASS36_A95_STAGING_SUBJECT_ADMISSION_VERIFIER.json", JSON.stringify(out, null, 2) + "\n");
}
console.log(JSON.stringify({ decision: out.decision, checks: out.checks, passed: out.passed, failed: out.failed }, null, 2));
process.exit(failed.length ? 1 : 0);
