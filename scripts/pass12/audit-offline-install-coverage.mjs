import { createHash } from "node:crypto";
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : "artifacts/pass12/PASS12_OFFLINE_INSTALL_COVERAGE.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const fileDigest = async (relative) => sha256(await readFile(path.join(root, relative)));

const lock = await readJson("package-lock.json");
const licenseEvidence = await readJson("config/supply-chain-license-evidence-pass4825.json");
const installEvidence = await readJson("config/supply-chain-install-script-evidence-pass4825.json");
const packageJsonSha256 = await fileDigest("package.json");
const lockfileSha256 = await fileDigest("package-lock.json");

const lockEntries = Object.entries(lock.packages ?? {})
  .filter(([packagePath, row]) => packagePath && row && typeof row === "object" && !row.link)
  .map(([packagePath, row]) => ({
    packagePath,
    name: row.name ?? (packagePath.startsWith("node_modules/") ? packagePath.slice("node_modules/".length).replace(/\/node_modules\//g, ">") : packagePath),
    version: row.version ?? null,
    resolved: row.resolved ?? null,
    integrity: row.integrity ?? null,
  }));
const registryLockEntries = lockEntries.filter((row) => typeof row.resolved === "string" && /^https:\/\/registry\.npmjs\.org\//.test(row.resolved));

const evidenceEntries = [
  ...(licenseEvidence.entries ?? []).map((row) => ({
    package: row.package,
    name: row.name,
    version: row.version,
    archiveCachePath: row.sourceArchiveCachePath ?? `config/supply-chain-license-archive-cas-pass4825/${row.tarballSha256}.tgz`,
    tarballSha256: row.tarballSha256,
    source: "license_evidence",
  })),
  ...(installEvidence.entries ?? []).map((row) => ({
    package: `${row.name}@${row.version}`,
    name: row.name,
    version: row.version,
    archiveCachePath: row.archiveCachePath,
    tarballSha256: row.tarballSha256,
    source: "install_script_evidence",
  })),
];
const evidenceByIdentity = new Map();
const archiveVerification = [];
for (const row of evidenceEntries) {
  const identity = `${row.name}@${row.version}`;
  const existing = evidenceByIdentity.get(identity) ?? [];
  existing.push(row);
  evidenceByIdentity.set(identity, existing);
  let present = false;
  let digestMatches = false;
  let bytes = null;
  try {
    const absolute = path.join(root, row.archiveCachePath);
    const info = await stat(absolute);
    const data = await readFile(absolute);
    present = info.isFile();
    bytes = data.length;
    digestMatches = sha256(data) === row.tarballSha256;
  } catch (ignoredError) { void ignoredError; }
  archiveVerification.push({ identity, path: row.archiveCachePath, present, digestMatches, bytes, source: row.source });
}

const lockIdentity = (row) => {
  const parts = row.packagePath.split("node_modules/").filter(Boolean);
  const name = parts.at(-1) ?? row.name;
  return `${name}@${row.version}`;
};
const coveredLockEntries = registryLockEntries.filter((row) => evidenceByIdentity.has(lockIdentity(row)));
const uncoveredLockEntries = registryLockEntries.filter((row) => !evidenceByIdentity.has(lockIdentity(row)));
const uniqueRegistryIdentities = new Set(registryLockEntries.map(lockIdentity));
const coveredUniqueIdentities = new Set(coveredLockEntries.map(lockIdentity));

const vendoredPackages = [];
for (const relative of [
  ".velmere/offline-toolchain/node_modules/typescript/package.json",
  ".velmere/offline-toolchain/node_modules/ts-node/package.json",
  ".velmere/offline-test-deps/node_modules/zod/package.json",
]) {
  try {
    const row = await readJson(relative);
    vendoredPackages.push({ name: row.name, version: row.version, path: relative });
  } catch (ignoredError) { void ignoredError; }
}

const expectedBindings = {
  licenseEvidencePackageJsonSha256: licenseEvidence.source?.packageJsonSha256 ?? null,
  licenseEvidenceLockfileSha256: licenseEvidence.source?.lockfileSha256 ?? null,
  installEvidencePackageJsonSha256: installEvidence.source?.packageJsonSha256 ?? null,
  installEvidenceLockfileSha256: installEvidence.source?.lockfileSha256 ?? null,
};
const sourceBindingsCurrent = Object.values(expectedBindings).every(Boolean)
  && expectedBindings.licenseEvidencePackageJsonSha256 === packageJsonSha256
  && expectedBindings.installEvidencePackageJsonSha256 === packageJsonSha256
  && expectedBindings.licenseEvidenceLockfileSha256 === lockfileSha256
  && expectedBindings.installEvidenceLockfileSha256 === lockfileSha256;
const archivesValid = archiveVerification.every((row) => row.present && row.digestMatches);
const registryEntryCoveragePercent = registryLockEntries.length ? Number((coveredLockEntries.length / registryLockEntries.length * 100).toFixed(2)) : 100;
const uniqueIdentityCoveragePercent = uniqueRegistryIdentities.size ? Number((coveredUniqueIdentities.size / uniqueRegistryIdentities.size * 100).toFixed(2)) : 100;
const completeOfflineInstallArchiveCoverage = coveredLockEntries.length === registryLockEntries.length && archivesValid;

const receipt = {
  schemaVersion: "velmere.pass12.offline-install-coverage.v1",
  generatedAt: new Date().toISOString(),
  truthBoundary: "This verifies repository-carried archive evidence and source bindings only. It does not claim npm cache layout compatibility, lifecycle execution, native binary availability, Node/npm exact-runtime execution, or a successful npm ci.",
  currentSource: { packageJsonSha256, lockfileSha256, node: process.version },
  expectedBindings,
  sourceBindingsCurrent,
  lockInventory: {
    packageNodesExcludingRootAndLinks: lockEntries.length,
    registryResolvedNodes: registryLockEntries.length,
    uniqueRegistryPackageVersions: uniqueRegistryIdentities.size,
  },
  archiveEvidence: {
    evidenceRows: evidenceEntries.length,
    uniqueEvidencePackageVersions: evidenceByIdentity.size,
    verifiedArchiveRows: archiveVerification.filter((row) => row.present && row.digestMatches).length,
    invalidOrMissingArchiveRows: archiveVerification.filter((row) => !row.present || !row.digestMatches),
    coveredRegistryNodes: coveredLockEntries.length,
    uncoveredRegistryNodes: uncoveredLockEntries.length,
    registryEntryCoveragePercent,
    coveredUniqueRegistryPackageVersions: coveredUniqueIdentities.size,
    uncoveredUniqueRegistryPackageVersions: uniqueRegistryIdentities.size - coveredUniqueIdentities.size,
    uniqueIdentityCoveragePercent,
    completeOfflineInstallArchiveCoverage,
  },
  vendoredTestOnlyPackages: vendoredPackages,
  blockers: [
    ...(!sourceBindingsCurrent ? ["PASS4825 supply-chain evidence is not bound to the current package.json/package-lock.json bytes."] : []),
    ...(!completeOfflineInstallArchiveCoverage ? [`Only ${registryEntryCoveragePercent}% of registry-resolved lock nodes have repository-carried exact tarball evidence.`] : []),
    "CAS evidence archives are not a complete npm-compatible offline cache and do not by themselves make npm ci --offline succeed.",
    ...(process.version !== "v24.18.0" ? [`Exact required Node v24.18.0 is unavailable; current runtime is ${process.version}.`] : []),
  ],
  sampleUncovered: uncoveredLockEntries.slice(0, 100).map((row) => ({ identity: lockIdentity(row), packagePath: row.packagePath, resolved: row.resolved })),
  gate: completeOfflineInstallArchiveCoverage && sourceBindingsCurrent ? "ARCHIVE_COVERAGE_PASS_NOT_NPM_CI" : "FAIL_INCOMPLETE_OFFLINE_INSTALL",
};
await mkdir(path.dirname(path.resolve(root, output)), { recursive: true });
await writeFile(path.resolve(root, output), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  output,
  gate: receipt.gate,
  sourceBindingsCurrent,
  lockInventory: receipt.lockInventory,
  archiveEvidence: receipt.archiveEvidence,
  blockers: receipt.blockers,
}, null, 2));
if (receipt.gate !== "ARCHIVE_COVERAGE_PASS_NOT_NPM_CI") process.exitCode = 1;
