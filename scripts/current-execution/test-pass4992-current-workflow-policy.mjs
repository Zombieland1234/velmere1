import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditWorkflowDirectory,
  auditWorkflowText,
  readPolicy,
} from "../pass4992/supply-chain-release.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "../..");
const { policy } = await readPolicy(root);

assert.equal(policy.schemaVersion, "velmere.pass4992.supply-chain-release-policy.v2");
assert.equal(policy.mode, "OFFLINE_PREPARATION_ONLY");
assert.equal(policy.githubActions.requireFullLengthCommitPin, true);
assert.equal(policy.githubActions.forbidPullRequestTarget, true);
assert.equal(policy.githubActions.forbidWriteAll, true);
assert.equal(policy.githubActions.requireCheckoutCredentialsDisabledForAllWorkflows, true);
assert.equal(policy.githubActions.requiredWorkflowFiles.length, 9);
assert.equal(policy.githubActions.expectedActionReferenceCount, 30);
assert.deepEqual(policy.codeql.requiredLanguages, ["actions", "javascript-typescript"]);
assert.deepEqual(policy.codeql.requiredQuerySuites, ["security-extended", "security-and-quality"]);
assert.equal(policy.dependencySecurity.maximumCritical, 0);
assert.equal(policy.dependencySecurity.maximumHigh, 0);
assert.equal(policy.dependencySecurity.maximumUnknownSeverity, 0);
assert.deepEqual(policy.releaseGate.requiredSignedControls, [
  "codeql",
  "dependency-review",
  "github-secret-protection",
  "provenance",
]);
assert.equal(policy.releaseGate.offlineReceiptMustRemainReleaseBlocked, true);

const allowedPins = Object.values(policy.githubActions.allowedActions).flat();
const allowedActionPins = Object.entries(policy.githubActions.allowedActions)
  .flatMap(([action, digests]) => digests.map((digest) => `${action}@${digest}`));
assert.equal(allowedPins.length, 10);
assert.equal(new Set(allowedActionPins).size, 10);
for (const digest of allowedPins) assert.match(digest, /^[a-f0-9]{40}$/u);

const workflowAudit = await auditWorkflowDirectory(root, policy);
assert.equal(workflowAudit.workflowCount, 9);
assert.equal(workflowAudit.actionReferenceCount, 30);
assert.deepEqual(workflowAudit.missingWorkflowFiles, []);
assert.deepEqual(workflowAudit.unexpectedWorkflowFiles, []);
assert.deepEqual(workflowAudit.blockers, []);

const p42Path = ".github/workflows/p42-exact-windows-node24-lifecycle-quarantine.yml";
const p42 = await readFile(path.join(root, p42Path), "utf8");
const unknownPin = p42.replace(
  "actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
  `actions/checkout@${"0".repeat(40)}`,
);
assert.equal(
  auditWorkflowText({ text: unknownPin, workflowPath: p42Path, policy })
    .some((blocker) => blocker.includes("action_not_policy_allowlisted:actions/checkout")),
  true,
);

const persistedCredentials = p42.replace("persist-credentials: false", "persist-credentials: true");
assert.equal(
  auditWorkflowText({ text: persistedCredentials, workflowPath: p42Path, policy })
    .includes(`${p42Path}:checkout_credentials_persisted`),
  true,
);

const unpinned = p42.replace(
  "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
  "actions/setup-node@v4",
);
assert.equal(
  auditWorkflowText({ text: unpinned, workflowPath: p42Path, policy })
    .some((blocker) => blocker.includes("action_not_full_sha_pinned")),
  true,
);

console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.pass4992-current-workflow-policy-test.v1",
  status: "PASS",
  workflowCount: workflowAudit.workflowCount,
  actionReferenceCount: workflowAudit.actionReferenceCount,
  uniqueAllowedActionPinCount: new Set(allowedActionPins).size,
  externalReleaseControlsStillRequired: policy.releaseGate.requiredSignedControls.length,
  truthBoundary: "Current workflow static policy only; hosted execution, external controls, trusted provenance, release, and FINAL remain unproven.",
}, null, 2));
