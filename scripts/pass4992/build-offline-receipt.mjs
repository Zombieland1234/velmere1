import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditDependabotText,
  auditWorkflowDirectory,
  buildCycloneDxSbom,
  buildEmptyOpenVex,
  buildOfflineProvenance,
  buildReleaseGate,
  buildSourceManifest,
  canonicalJson,
  readPolicy,
  scanSourceForHighPrecisionSecrets,
  sha256,
  validateCycloneDxSbom,
  validateOfflineProvenance,
  validateOpenVex,
} from "./supply-chain-release.mjs";

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] ?? "").trim() : fallback;
}

function generatedAtValue() {
  const explicit = argument("generated-at");
  if (explicit) return explicit;
  const sourceDateEpoch = Number(process.env.SOURCE_DATE_EPOCH ?? "");
  if (Number.isSafeInteger(sourceDateEpoch) && sourceDateEpoch > 0) {
    return new Date(sourceDateEpoch * 1_000).toISOString();
  }
  return new Date().toISOString();
}

async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, file);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(argument("root", path.resolve(scriptDirectory, "../..")));
const output = path.resolve(argument("output", path.join(root, "artifacts/pass4992")));
const generatedAt = generatedAtValue();
const now = new Date(generatedAt);

const { policy, policyDigest } = await readPolicy(root);
const packageJsonText = await readFile(path.join(root, "package.json"), "utf8");
const packageLockText = await readFile(path.join(root, "package-lock.json"), "utf8");
const packageJson = JSON.parse(packageJsonText);
const packageLock = JSON.parse(packageLockText);
const packageLockDigest = sha256(packageLockText);
const manifest = await buildSourceManifest(root);
const workflowAudit = await auditWorkflowDirectory(root, policy);
const dependabotText = await readFile(path.join(root, ".github/dependabot.yml"), "utf8");
const dependabotBlockers = auditDependabotText(dependabotText);
const secretScan = await scanSourceForHighPrecisionSecrets(root, manifest);
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
const releaseGate = buildReleaseGate({
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
  externalReceipts: [],
  trustedReceiptKeys: {},
});

const localBlockers = [
  ...workflowAudit.blockers,
  ...dependabotBlockers,
  ...validateCycloneDxSbom({ sbom, packageJsonText, packageLockText }),
  ...validateOpenVex(vex),
  ...validateOfflineProvenance({
    provenance,
    policy,
    sourceDigest: manifest.sourceDigest,
    packageLockDigest,
    sbomDigest,
    vexDigest,
  }),
];
if (secretScan.findingCount !== 0) localBlockers.push(`offline_secret_findings_present:${secretScan.findingCount}`);
if (process.version !== `v${policy.toolchain.node}`) localBlockers.push(`node_runtime_mismatch:${process.version}/v${policy.toolchain.node}`);
if (packageJson.packageManager !== `npm@${policy.toolchain.npm}`) localBlockers.push("package_manager_contract_mismatch");
if (packageJson.engines?.node !== policy.toolchain.node || packageJson.engines?.npm !== policy.toolchain.npm) {
  localBlockers.push("package_engine_contract_mismatch");
}
if (packageLock.lockfileVersion !== policy.toolchain.lockfileVersion) localBlockers.push("package_lock_version_mismatch");
if (releaseGate.releaseEligible) localBlockers.push("offline_receipt_unexpectedly_release_eligible");
for (const control of policy.releaseGate.requiredSignedControls) {
  if (!releaseGate.blockers.includes(`external_receipt:${control}:missing`)) {
    localBlockers.push(`offline_fail_closed_blocker_missing:${control}`);
  }
}

const uniqueLocalBlockers = [...new Set(localBlockers)].sort();
const implementationBody = {
  schemaVersion: "velmere.pass4992.offline-supply-chain-implementation-receipt.v1",
  generatedAt,
  status: uniqueLocalBlockers.length ? "FAIL" : "PASS_OFFLINE_CONTROLS_RELEASE_BLOCKED",
  offlineImplementationPassed: uniqueLocalBlockers.length === 0,
  releaseEligible: false,
  sourceDigest: manifest.sourceDigest,
  sourceFileCount: manifest.fileCount,
  sourceBytes: manifest.totalBytes,
  packageLockDigest,
  packageCount: sbom.components.length,
  productionPackageCount: sbom.components.filter((item) => item.scope === "required").length,
  developmentOnlyPackageCount: sbom.components.filter((item) => item.scope === "excluded").length,
  policyDigest,
  sbomDigest,
  vexDigest,
  offlineProvenanceDigest: sha256(canonicalJson(provenance)),
  releaseGateDigest: releaseGate.receiptDigest,
  checks: {
    workflowCount: workflowAudit.workflowCount,
    actionReferenceCount: workflowAudit.actionReferenceCount,
    allActionsFullShaAndAllowlisted: workflowAudit.blockers.length === 0,
    dependabotNpmAndActionsConfigured: dependabotBlockers.length === 0,
    highPrecisionSecretScanPassed: secretScan.findingCount === 0,
    historicalSecretScanExecuted: false,
    githubSecretProtectionVerified: false,
    cycloneDxLockfileCoverageComplete: validateCycloneDxSbom({ sbom, packageJsonText, packageLockText }).length === 0,
    openVexFormatValid: validateOpenVex(vex).length === 0,
    openVexDispositionClaimsMade: vex.statements.length,
    offlineProvenanceExplicitlyUntrustedAndUnsigned: true,
    codeqlHostedRunExecuted: false,
    dependencyAdvisoryNetworkScanExecuted: false,
    trustedReleaseProvenanceIssued: false,
  },
  localBlockers: uniqueLocalBlockers,
  remainingReleaseBlockers: releaseGate.blockers,
  truthBoundary: "This receipt proves local contract execution only. It does not claim hosted CodeQL, GitHub secret protection, registry advisory status, trusted builder provenance, pentest completion, or LIVE readiness.",
};
const implementationReceipt = {
  ...implementationBody,
  receiptDigest: sha256(canonicalJson(implementationBody)),
};

await atomicJson(path.join(output, "PASS4992_CYCLONEDX_SBOM.cdx.json"), sbom);
await atomicJson(path.join(output, "PASS4992_OPENVEX.json"), vex);
await atomicJson(path.join(output, "PASS4992_OFFLINE_UNTRUSTED_PROVENANCE.intoto.json"), provenance);
await atomicJson(path.join(output, "PASS4992_HIGH_PRECISION_SECRET_SCAN.json"), secretScan);
await atomicJson(path.join(output, "PASS4992_RELEASE_GATE.json"), releaseGate);
await atomicJson(path.join(output, "PASS4992_OFFLINE_IMPLEMENTATION_RECEIPT.json"), implementationReceipt);

if (process.argv.includes("--expect-release-blocked") && releaseGate.status !== "BLOCKED") {
  throw new Error("pass4992_release_gate_expected_blocked");
}
if (uniqueLocalBlockers.length) {
  console.error(JSON.stringify(implementationReceipt, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(implementationReceipt, null, 2));
