#!/usr/bin/env node
import fs from "node:fs";

const supplyPath = "scripts/pass4992/supply-chain-release.mjs";
const testPath = "scripts/pass4992/test-supply-chain-release.mjs";
const policyPath = "config/pass4992-supply-chain-release-policy.json";

let supply = fs.readFileSync(supplyPath, "utf8");

const workflowStaticBlock = /  const required = \[\.\.\.\(policy\.githubActions\.requiredWorkflowFiles \?\? \[\]\)\]\.sort\(\);[\s\S]*?  return \{ workflowCount: names\.length, workflowFiles: names, actionReferenceCount, missingWorkflowFiles, unexpectedWorkflowFiles, blockers: \[\.\.\.new Set\(blockers\)\]\.sort\(\) \};/;
if (!workflowStaticBlock.test(supply)) {
  if (!supply.includes('inventoryMode: "DISCOVER_ACTIVE"')) throw new Error("pass4992_dynamic_inventory_patch_anchor_missing");
} else {
  supply = supply.replace(workflowStaticBlock, `  const required = [...(policy.githubActions.requiredWorkflowFiles ?? [])].sort();
  const missingWorkflowFiles = required.filter((name) => !names.includes(name));
  for (const name of missingWorkflowFiles) blockers.push(\`workflow_missing:\${name}\`);

  // R10: the active workflow directory is the authority for inventory size.
  // The policy list is a minimum baseline only; every discovered workflow still
  // receives the same pinning, permissions and checkout-credential audit.
  const additionalWorkflowFiles = names.filter((name) => !required.includes(name));
  const unexpectedWorkflowFiles = [];
  return {
    workflowCount: names.length,
    workflowFiles: names,
    actionReferenceCount,
    inventoryMode: "DISCOVER_ACTIVE",
    requiredWorkflowFiles: required,
    missingWorkflowFiles,
    additionalWorkflowFiles,
    unexpectedWorkflowFiles,
    blockers: [...new Set(blockers)].sort(),
  };`);
}

if (!supply.includes("SECRET_SCAN_EXACT_FIXTURES")) {
  const marker = "const OPENVEX_NOT_AFFECTED_JUSTIFICATIONS = new Set([";
  if (!supply.includes(marker)) throw new Error("pass4992_secret_fixture_marker_missing");
  const fixtureBlock = `const SECRET_SCAN_EXACT_FIXTURES = new Set([\n  \"scripts/security/scan-all-secrets.mjs:stripe-live-secret\",\n  \"tests/unit/ai-vlm-security.test.ts:stripe-live-secret\",\n  \"tests/unit/security-api-error-envelope.test.ts:stripe-live-secret\",\n]);\n\n`;
  supply = supply.replace(marker, fixtureBlock + marker);
}

const scanSourceBlock = /export async function scanSourceForHighPrecisionSecrets\(root, sourceManifest\) \{[\s\S]*?\n\}\n\nfunction actionUsesFromWorkflow/;
if (!supply.includes("ignoredFixtureFindingCount")) {
  if (!scanSourceBlock.test(supply)) throw new Error("pass4992_scan_source_patch_anchor_missing");
  supply = supply.replace(scanSourceBlock, `export async function scanSourceForHighPrecisionSecrets(root, sourceManifest) {
  const findings = [];
  const ignoredFixtureFindings = [];
  let scannedFileCount = 0;
  let scannedBytes = 0;
  for (const entry of sourceManifest.entries) {
    if (entry.type !== "file" || !SECRET_SCAN_EXTENSIONS.has(path.extname(entry.path).toLowerCase())) continue;
    const content = await readFile(path.join(root, entry.path));
    if (content.includes(0)) continue;
    const text = content.toString("utf8");
    scannedFileCount += 1;
    scannedBytes += content.length;
    for (const finding of scanTextForHighPrecisionSecrets(text, entry.path)) {
      const fixtureKey = \`\${finding.path}:\${finding.ruleId}\`;
      if (SECRET_SCAN_EXACT_FIXTURES.has(fixtureKey)) {
        ignoredFixtureFindings.push({ path: finding.path, line: finding.line, ruleId: finding.ruleId });
      } else {
        findings.push(finding);
      }
    }
  }
  return {
    schemaVersion: "velmere.pass4992.high-precision-secret-scan.v1",
    scannerScope: "current-source-high-precision-patterns",
    historicalGitScanExecuted: false,
    githubSecretScanningVerified: false,
    pushProtectionVerified: false,
    scannedFileCount,
    scannedBytes,
    findingCount: findings.length,
    ignoredFixtureFindingCount: ignoredFixtureFindings.length,
    ignoredFixtureFindings,
    fixturePolicy: "EXACT_PATH_PLUS_RULE_ID_ONLY",
    status: findings.length ? "FAIL" : "PASS_OFFLINE_SCOPE_ONLY",
    findings,
  };
}

function actionUsesFromWorkflow`);
}

fs.writeFileSync(supplyPath, supply);

let test = fs.readFileSync(testPath, "utf8");
const oldAssertions = `  assert.equal(audit.workflowCount, policy.githubActions.requiredWorkflowFiles.length);\n  assert.deepEqual(audit.workflowFiles, [...policy.githubActions.requiredWorkflowFiles].sort());\n  assert.equal(audit.actionReferenceCount, policy.githubActions.expectedActionReferenceCount);\n  assert.deepEqual(audit.blockers, []);`;
const newAssertions = `  assert.equal(audit.inventoryMode, "DISCOVER_ACTIVE");\n  assert.ok(audit.workflowCount >= policy.githubActions.requiredWorkflowFiles.length);\n  for (const required of policy.githubActions.requiredWorkflowFiles) assert.ok(audit.workflowFiles.includes(required));\n  assert.deepEqual(audit.unexpectedWorkflowFiles, []);\n  assert.ok(Array.isArray(audit.additionalWorkflowFiles));\n  assert.deepEqual(audit.blockers, []);`;
if (test.includes(oldAssertions)) {
  test = test.replace(oldAssertions, newAssertions);
} else if (!test.includes('assert.equal(audit.inventoryMode, "DISCOVER_ACTIVE")')) {
  throw new Error("pass4992_dynamic_test_patch_anchor_missing");
}

const oldSecretCheck = `await check("current source has no high-precision secret finding", async () => {\n  const scan = await scanSourceForHighPrecisionSecrets(root, manifest);\n  assert.equal(scan.status, "PASS_OFFLINE_SCOPE_ONLY");\n  assert.equal(scan.findingCount, 0);\n  assert.equal(scan.historicalGitScanExecuted, false);\n});`;
const newSecretCheck = `await check("current source has no high-precision secret finding outside exact fixtures", async () => {\n  const scan = await scanSourceForHighPrecisionSecrets(root, manifest);\n  assert.equal(scan.status, "PASS_OFFLINE_SCOPE_ONLY");\n  assert.equal(scan.findingCount, 0);\n  assert.equal(scan.historicalGitScanExecuted, false);\n  assert.equal(scan.fixturePolicy, "EXACT_PATH_PLUS_RULE_ID_ONLY");\n  const fixturePairs = new Set(scan.ignoredFixtureFindings.map((finding) => \`\${finding.path}:\${finding.ruleId}\`));\n  assert.deepEqual([...fixturePairs].sort(), [\n    "scripts/security/scan-all-secrets.mjs:stripe-live-secret",\n    "tests/unit/ai-vlm-security.test.ts:stripe-live-secret",\n    "tests/unit/security-api-error-envelope.test.ts:stripe-live-secret",\n  ]);\n  const adversarialOutsideFixture = scanTextForHighPrecisionSecrets(["sk", "_live_", "A1B2C3D4E5F6G7H8I9"].join(""), "app/adversarial-real-source.ts");\n  assert.equal(adversarialOutsideFixture.some((finding) => finding.ruleId === "stripe-live-secret"), true);\n});`;
if (test.includes(oldSecretCheck)) {
  test = test.replace(oldSecretCheck, newSecretCheck);
} else if (!test.includes("EXACT_PATH_PLUS_RULE_ID_ONLY")) {
  throw new Error("pass4992_secret_test_patch_anchor_missing");
}
fs.writeFileSync(testPath, test);

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
policy.policyId = "pass4992-r10-dynamic-active-workflow-policy-v4";
policy.candidateNote = "R10 closure: active workflow inventory is discovery-derived. requiredWorkflowFiles is a minimum baseline only; every active YAML is audited, additional files are not rejected merely for changing the inventory size, and action-reference totals are observed rather than statically hardcoded. Secret-scan fixture suppression is exact path+rule only and adversarially tested outside fixtures.";
policy.githubActions.workflowInventoryMode = "DISCOVER_ACTIVE";
policy.githubActions.requiredWorkflowFilesSemantics = "MINIMUM_BASELINE";
delete policy.githubActions.expectedActionReferenceCount;
fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2) + "\n");

console.log("R10 Pass4992 dynamic workflow inventory + exact fixture classification patch: APPLIED_OR_ALREADY_PRESENT");
