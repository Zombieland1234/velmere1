#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { A79_REVISION, buildA60ChildEnvironment, canonicalJson, readJson } from "./a79-exact-build-browser-lib.mjs";
import { validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const root = process.cwd();
const policy = readJson(root, "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json");
const test = readJson(root, "config/pass36/a79-test-receipt.json");
const current = readJson(root, "config/pass35/current-revision.json");
const authority = readJson(root, "config/pass36/current-release-authority.json");
const state = readJson(root, "config/pass36/a79-current-state.json");
const program = readJson(root, current.worldClassCompletionProgramPath);
const liveTestSource = fs.readFileSync("scripts/pass36/test-a79-exact-final-byte-build-browser-evidence-binding.mjs", "utf8");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("policy:revision", policy.revisionId === A79_REVISION, policy.revisionId);
add("policy:parent", policy.parentRevisionId === "VELMERE_PASS36_A78R0_EXACT_RUNTIME_LOCKFILE_DEPENDENCY_BROWSER_BOOTSTRAP_HARDENING", policy.parentRevisionId);
add("policy:closed-gaps", Array.isArray(policy.closedByA79) && policy.closedByA79.length === 11, policy.closedByA79);
const liveTestRun = spawnSync(process.execPath, ["scripts/pass36/test-a79-exact-final-byte-build-browser-evidence-binding.mjs"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
  env: { ...buildA60ChildEnvironment(process.env), TERM: "dumb" },
  shell: false,
  windowsHide: true,
});
const liveTest = (() => {
  try {
    return parseStrictJsonCli(liveTestRun.stdout, {
      maxBytes: 16 * 1024 * 1024,
      maxDepth: 128,
      maxNodes: 1_000_000,
      requireObject: true,
    });
  } catch {
    return null;
  }
})();
add("test:pass", test.status === "PASS_A79_LOCAL_ADMISSION_AND_ADVERSARIAL"
  && test.summary?.checks === 54 && test.summary?.failed === 0
  && liveTestRun.status === 0
  && liveTest?.status === "PASS_A79_LOCAL_ADMISSION_AND_ADVERSARIAL"
  && liveTest?.summary?.checks === 54 && liveTest?.summary?.failed === 0
  && !liveTestSource.includes('writeFileSync("config/pass36/a79-test-receipt.json"')
  && canonicalJson(liveTest) === canonicalJson(test),
{ staticSummary: test.summary, liveExitCode: liveTestRun.status, liveSummary: liveTest?.summary ?? null, stderrBytes: Buffer.byteLength(liveTestRun.stderr ?? "") });
add("test:no-exact-credit", test.exactBuildExecuted === false && test.exactBrowserExecuted === false, test);
const source = validateCurrentSourceAuthorityExact(root);
add("source:current-authority-exact", source.passed === true && source.mismatches.length === 0, source);
add("current:source", current.sourceRevisionId === current.currentReleaseAuthorityRevisionId && current.currentRootDescendantManifestRevisionId === current.sourceRevisionId, current.sourceRevisionId);
add("current:a79", current.exactBuildBrowserEvidenceHardeningRevisionId === A79_REVISION, current.exactBuildBrowserEvidenceHardeningRevisionId);
add("current:no-credit", current.exactFinalByteBuildExecuted === false && current.browserScreenshotParityExecuted === false && current.saleEnabled === false && current.liveProven === false, current);
add("authority:revision", authority.authorityRevisionId === current.sourceRevisionId && authority.currentSource?.revisionId === current.sourceRevisionId, authority.currentSource);
add("authority:a79-plane", authority.planes?.exactBuildBrowserEvidenceHardening?.revisionId === A79_REVISION && authority.planes?.exactBuildBrowserEvidenceHardening?.verified === false, authority.planes?.exactBuildBrowserEvidenceHardening);
add("state:decision", state.revisionId === A79_REVISION && state.decision === "PASS_LOCAL_BUILD_BROWSER_ADMISSION_HARDENING_BLOCKED_A78_EXACT_ARTIFACTS", state.decision);
add("state:no-credit", state.exactExecution?.exactBuildExecuted === false && state.exactExecution?.exactBrowserExecuted === false, state.exactExecution);
add("program:revision", program.revisionId === current.sourceRevisionId, program.revisionId);
const a79 = (program.passes ?? []).find((row) => row.passNumber === 79);
add("program:a79", a79?.status === "DONE_LOCAL_ADMISSION_HARDENING_BLOCKED_A78_EXACT_ARTIFACTS", a79);
add("active", fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim() === current.sourceRevisionId, fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim());
add("runner:present", fs.existsSync("VELMERE_RUN_A79_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.cmd"));
add("patch:present", fs.existsSync("VELMERE_A79_PATCH.txt"));
const failed = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a79.exact-final-byte-build-browser-evidence-binding-verification.v1",
  revisionId: A79_REVISION,
  status: failed.length ? "FAIL_A79" : "PASS_A79_LOCAL_HARDENING_NO_EXACT_CREDIT",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  exactBuildExecuted: false,
  exactBrowserExecuted: false,
  saleEnabled: false,
  liveProven: false,
  truthBoundary: policy.truthBoundary
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
