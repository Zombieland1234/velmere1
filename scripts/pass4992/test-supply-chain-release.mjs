import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXTERNAL_RECEIPT_SCHEMA,
  auditDependabotText,
  auditWorkflowDirectory,
  auditWorkflowText,
  buildCycloneDxSbom,
  buildEmptyOpenVex,
  buildOfflineProvenance,
  buildReleaseGate,
  buildSourceManifest,
  canonicalJson,
  readPolicy,
  scanSourceForHighPrecisionSecrets,
  scanTextForHighPrecisionSecrets,
  sha256,
  signExternalReceipt,
  validateCycloneDxSbom,
  validateOfflineProvenance,
  validateOpenVex,
} from "./supply-chain-release.mjs";

const checks = [];

async function check(name, callback) {
  try {
    await callback();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "../..");
const generatedAt = "2026-07-18T12:00:00.000Z";
const now = new Date(generatedAt);
const { policy, policyDigest } = await readPolicy(root);
const packageJsonText = await readFile(path.join(root, "package.json"), "utf8");
const packageLockText = await readFile(path.join(root, "package-lock.json"), "utf8");
const packageLockDigest = sha256(packageLockText);
const manifest = await buildSourceManifest(root);
const sbom = buildCycloneDxSbom({ packageJsonText, packageLockText, generatedAt });
const sbomDigest = sha256(canonicalJson(sbom));
const vex = buildEmptyOpenVex({ generatedAt, sourceDigest: manifest.sourceDigest });
const vexDigest = sha256(canonicalJson(vex));
const provenance = buildOfflineProvenance({
  generatedAt,
  sourceDigest: manifest.sourceDigest,
  packageLockDigest,
  sbomDigest,
  vexDigest,
  builderId: policy.provenance.offlineBuilderId,
});

await check("policy is explicit OFFLINE and has no pretrusted release key", () => {
  assert.equal(policy.mode, "OFFLINE_PREPARATION_ONLY");
  assert.deepEqual(policy.releaseGate.trustedReceiptKeyIds, []);
  assert.equal(policy.releaseGate.offlineReceiptMustRemainReleaseBlocked, true);
});

await check("source manifest is content-addressed and excludes generated artifacts", () => {
  assert.ok(manifest.fileCount > 1_000);
  assert.ok(manifest.totalBytes > 1_000_000);
  assert.match(manifest.sourceDigest, /^[a-f0-9]{64}$/);
  assert.equal(manifest.entries.some((entry) => entry.path.startsWith("artifacts/")), false);
});

await check("all workflow actions are full-SHA pinned and policy allowlisted", async () => {
  const audit = await auditWorkflowDirectory(root, policy);
  assert.equal(audit.workflowCount, policy.githubActions.requiredWorkflowFiles.length);
  assert.deepEqual(audit.workflowFiles, [...policy.githubActions.requiredWorkflowFiles].sort());
  assert.equal(audit.actionReferenceCount, policy.githubActions.expectedActionReferenceCount);
  assert.deepEqual(audit.blockers, []);
});

await check("unpinned and unallowlisted actions fail workflow audit", () => {
  const unpinned = auditWorkflowText({
    text: "permissions: read-all\nsteps:\n  - uses: actions/checkout@v4\n",
    workflowPath: ".github/workflows/adversarial.yml",
    policy,
  });
  assert.equal(unpinned.some((item) => item.includes("action_not_full_sha_pinned")), true);
  const unknown = auditWorkflowText({
    text: "steps:\n  - uses: example/unknown@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
    workflowPath: ".github/workflows/adversarial.yml",
    policy,
  });
  assert.equal(unknown.some((item) => item.includes("action_not_policy_allowlisted")), true);
});

await check("Dependabot covers npm and GitHub Actions without ignored dependencies", async () => {
  const text = await readFile(path.join(root, ".github/dependabot.yml"), "utf8");
  assert.deepEqual(auditDependabotText(text), []);
});

await check("CycloneDX 1.6 SBOM exactly covers the current lockfile package set", () => {
  const lock = JSON.parse(packageLockText);
  const expectedPackageCount = Object.keys(lock.packages ?? {}).filter((entry) => entry !== "").length;
  assert.equal(sbom.bomFormat, "CycloneDX");
  assert.equal(sbom.specVersion, "1.6");
  assert.equal(sbom.components.length, expectedPackageCount);
  assert.deepEqual(validateCycloneDxSbom({ sbom, packageJsonText, packageLockText }), []);
});

await check("SBOM component tampering is rejected", () => {
  const tampered = structuredClone(sbom);
  tampered.components[0].version = "999.999.999";
  assert.equal(validateCycloneDxSbom({ sbom: tampered, packageJsonText, packageLockText }).includes("cyclonedx_not_exactly_reproducible_from_lockfile"), true);
});

await check("empty OpenVEX is valid but makes no vulnerability disposition claim", () => {
  assert.deepEqual(validateOpenVex(vex), []);
  assert.deepEqual(vex.statements, []);
});

await check("OpenVEX not_affected without machine justification is rejected", () => {
  const invalid = structuredClone(vex);
  invalid.statements.push({
    vulnerability: { name: "CVE-2099-0001" },
    products: [{ "@id": "pkg:npm/example@1.0.0" }],
    status: "not_affected",
  });
  assert.equal(validateOpenVex(invalid).some((item) => item.startsWith("openvex_not_affected_justification_invalid")), true);
});

await check("OpenVEX affected without remediation action is rejected", () => {
  const invalid = structuredClone(vex);
  invalid.statements.push({
    vulnerability: { name: "CVE-2099-0002" },
    products: [{ "@id": "pkg:npm/example@1.0.0" }],
    status: "affected",
  });
  assert.equal(validateOpenVex(invalid).some((item) => item.startsWith("openvex_affected_action_missing")), true);
});

await check("offline provenance is in-toto/SLSA shaped and explicitly untrusted", () => {
  assert.deepEqual(validateOfflineProvenance({
    provenance,
    policy,
    sourceDigest: manifest.sourceDigest,
    packageLockDigest,
    sbomDigest,
    vexDigest,
  }), []);
  assert.equal(provenance.predicate.buildDefinition.internalParameters.trustedBuilder, false);
  assert.equal(provenance.predicate.buildDefinition.internalParameters.signatureIssued, false);
});

await check("high-precision scanner detects secrets without retaining values", () => {
  const fixture = [
    ["AKIA", "ABCDEFGHIJKLMNOP"].join(""),
    ["sk", "_live_", "A1B2C3D4E5F6G7H8I9"].join(""),
    ["-----BEGIN ", "PRIVATE KEY-----"].join(""),
  ].join("\n");
  const findings = scanTextForHighPrecisionSecrets(fixture, "synthetic.fixture");
  assert.equal(findings.length, 3);
  const serialized = JSON.stringify(findings);
  for (const value of fixture.split("\n")) assert.equal(serialized.includes(value), false);
});

await check("current source has no high-precision secret finding", async () => {
  const scan = await scanSourceForHighPrecisionSecrets(root, manifest);
  assert.equal(scan.status, "PASS_OFFLINE_SCOPE_ONLY");
  assert.equal(scan.findingCount, 0);
  assert.equal(scan.historicalGitScanExecuted, false);
});

const baseGateArguments = {
  generatedAt,
  now,
  policy,
  policyDigest,
  manifest,
  packageJsonText,
  packageLockText,
  sbom,
  vex,
  offlineProvenance: provenance,
};

await check("actual offline release gate blocks every missing signed hosted control", () => {
  const gate = buildReleaseGate(baseGateArguments);
  assert.equal(gate.status, "BLOCKED");
  assert.equal(gate.releaseEligible, false);
  assert.equal(gate.releaseEligibilityBps, 0);
  for (const control of policy.releaseGate.requiredSignedControls) {
    assert.equal(gate.blockers.includes(`external_receipt:${control}:missing`), true);
  }
});

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const testKeyId = "pass4992-test-ed25519-key";
const positivePolicy = structuredClone(policy);
positivePolicy.releaseGate.trustedReceiptKeyIds = [testKeyId];
const issuedAt = new Date(now.getTime() - 1_000).toISOString();
const expiresAt = new Date(now.getTime() + 60 * 60 * 1_000).toISOString();
const buildArtifactDigest = sha256("synthetic-release-artifact");
const builderId = "https://github.com/example/velmere/.github/workflows/release.yml@refs/heads/main";
const trustedStatement = {
  _type: policy.provenance.statementType,
  subject: [{ name: "velmere-release.tar.zst", digest: { sha256: buildArtifactDigest } }],
  predicateType: policy.provenance.predicateType,
  predicate: {
    buildDefinition: {
      buildType: "https://velmere.invalid/build-types/hosted-release/v1",
      externalParameters: {},
      internalParameters: {},
      resolvedDependencies: [
        { uri: "urn:velmere:source-tree", digest: { sha256: manifest.sourceDigest } },
        { uri: "package-lock.json", digest: { sha256: packageLockDigest } },
      ],
    },
    runDetails: {
      builder: { id: builderId },
      metadata: { invocationId: "urn:uuid:11111111-1111-4111-8111-111111111111", startedOn: issuedAt, finishedOn: issuedAt },
      byproducts: [],
    },
  },
};
const trustedStatementDigest = sha256(canonicalJson(trustedStatement));
const positiveResults = {
  codeql: {
    analysisCompleted: true,
    sarifUploaded: true,
    languages: ["actions", "javascript-typescript"],
    querySuites: ["security-extended", "security-and-quality"],
    openCritical: 0,
    openHigh: 0,
  },
  "github-secret-protection": {
    secretScanningEnabled: true,
    pushProtectionEnabled: true,
    historicalScanCompleted: true,
    unresolvedVerifiedSecrets: 0,
  },
  "dependency-review": {
    dependencyGraphComplete: true,
    lockfileReviewed: true,
    malwareReviewComplete: true,
    registrySignaturesReviewed: true,
    critical: 0,
    high: 0,
    unknownSeverity: 0,
    findingIds: [],
    vexRequiredFindingIds: [],
  },
  provenance: {
    predicateType: policy.provenance.predicateType,
    statementDigest: trustedStatementDigest,
    buildArtifactName: "velmere-release.tar.zst",
    buildArtifactDigest,
    builderId,
    sbomDigest,
    vexDigest,
    trustedBuilder: true,
    oidcIdentityVerified: true,
    transparencyLogVerified: true,
    immutableArtifact: true,
    twoPersonReviewVerified: true,
  },
};

function makeSignedReceipt(control, result, overrides = {}) {
  const unsigned = {
    schemaVersion: EXTERNAL_RECEIPT_SCHEMA,
    control,
    receiptId: `pass4992-${control}-receipt-0001`,
    nonce: `pass4992-${control}-nonce-0000001`,
    sourceDigest: manifest.sourceDigest,
    packageLockDigest,
    issuedAt,
    expiresAt,
    issuer: "synthetic-test-issuer",
    status: "PASS",
    complete: true,
    evidenceDigest: sha256(`synthetic-evidence:${control}`),
    result,
    ...overrides,
  };
  return signExternalReceipt(unsigned, { privateKey, keyId: testKeyId });
}

const completeReceipts = Object.entries(positiveResults).map(([control, result]) => makeSignedReceipt(control, result));
const positiveGateArguments = {
  ...baseGateArguments,
  policy: positivePolicy,
  externalReceipts: completeReceipts,
  trustedReceiptKeys: { [testKeyId]: publicKey },
  externalEvidenceByDigest: { [trustedStatementDigest]: trustedStatement },
};

await check("complete fresh signed evidence can satisfy the complete-or-block gate", () => {
  const gate = buildReleaseGate(positiveGateArguments);
  assert.equal(gate.status, "READY");
  assert.equal(gate.releaseEligible, true);
  assert.equal(gate.releaseEligibilityBps, 10_000);
  assert.deepEqual(gate.blockers, []);
});

await check("copied receipt with mutated CodeQL result fails signature verification", () => {
  const tampered = structuredClone(completeReceipts);
  tampered.find((item) => item.control === "codeql").result.openHigh = 1;
  const gate = buildReleaseGate({ ...positiveGateArguments, externalReceipts: tampered });
  assert.equal(gate.releaseEligible, false);
  assert.equal(gate.blockers.includes("external_receipt:codeql:signature_untrusted_or_invalid"), true);
});

await check("fresh signed CodeQL receipt missing a required language is blocked", () => {
  const receipts = completeReceipts.filter((item) => item.control !== "codeql");
  receipts.push(makeSignedReceipt("codeql", { ...positiveResults.codeql, languages: ["javascript-typescript"] }));
  const gate = buildReleaseGate({ ...positiveGateArguments, externalReceipts: receipts });
  assert.equal(gate.blockers.includes("external_receipt:codeql:language_missing:actions"), true);
});

await check("stale signed receipt is blocked", () => {
  const receipts = completeReceipts.filter((item) => item.control !== "codeql");
  receipts.push(makeSignedReceipt("codeql", positiveResults.codeql, {
    issuedAt: new Date(now.getTime() - 2 * 86400 * 1_000).toISOString(),
    expiresAt: new Date(now.getTime() + 60 * 60 * 1_000).toISOString(),
  }));
  const gate = buildReleaseGate({ ...positiveGateArguments, externalReceipts: receipts });
  assert.equal(gate.blockers.includes("external_receipt:codeql:stale"), true);
});

await check("trusted provenance receipt without the statement material is blocked", () => {
  const gate = buildReleaseGate({ ...positiveGateArguments, externalEvidenceByDigest: {} });
  assert.equal(gate.blockers.includes("external_receipt:provenance:statement_material_missing_or_digest_invalid"), true);
});

await check("duplicate signed nonce is blocked as replay-shaped evidence", () => {
  const secretReceipt = completeReceipts.find((item) => item.control === "github-secret-protection");
  const receipts = completeReceipts.filter((item) => item.control !== "codeql");
  receipts.push(makeSignedReceipt("codeql", positiveResults.codeql, { nonce: secretReceipt.nonce }));
  const gate = buildReleaseGate({ ...positiveGateArguments, externalReceipts: receipts });
  assert.equal(gate.blockers.some((item) => item.startsWith("external_receipt_duplicate_nonce:")), true);
});

await check("signed dependency result with a high-severity finding is blocked", () => {
  const receipts = completeReceipts.filter((item) => item.control !== "dependency-review");
  receipts.push(makeSignedReceipt("dependency-review", { ...positiveResults["dependency-review"], high: 1, findingIds: ["CVE-2099-0099"] }));
  const gate = buildReleaseGate({ ...positiveGateArguments, externalReceipts: receipts });
  assert.equal(gate.blockers.includes("external_receipt:dependency-review:critical_high_or_unknown_open"), true);
});

await check("a VEX-required finding without a disposition is blocked", () => {
  const receipts = completeReceipts.filter((item) => item.control !== "dependency-review");
  receipts.push(makeSignedReceipt("dependency-review", {
    ...positiveResults["dependency-review"],
    findingIds: ["CVE-2099-0100"],
    vexRequiredFindingIds: ["CVE-2099-0100"],
  }));
  const gate = buildReleaseGate({ ...positiveGateArguments, externalReceipts: receipts });
  assert.equal(gate.blockers.includes("openvex_required_disposition_missing:CVE-2099-0100"), true);
});

await check("release receipt digest is content-bound", () => {
  const gate = buildReleaseGate(positiveGateArguments);
  const { receiptDigest, ...body } = gate;
  assert.equal(receiptDigest, sha256(canonicalJson(body)));
});

const failures = checks.filter((item) => !item.ok);
const result = {
  schemaVersion: "velmere.pass4992.supply-chain-release-adversarial-test.v1",
  generatedAt: new Date().toISOString(),
  status: failures.length ? "FAIL" : "PASS",
  checksPassed: checks.length - failures.length,
  checksTotal: checks.length,
  failures,
};
const testReceiptPath = path.join(root, "artifacts/pass4992/PASS4992_SUPPLY_CHAIN_ADVERSARIAL_TEST.json");
await mkdir(path.dirname(testReceiptPath), { recursive: true });
const temporaryTestReceiptPath = `${testReceiptPath}.${process.pid}.tmp`;
await writeFile(temporaryTestReceiptPath, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
await rename(temporaryTestReceiptPath, testReceiptPath);
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
