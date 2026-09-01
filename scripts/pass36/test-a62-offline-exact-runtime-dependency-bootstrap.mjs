#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { evaluateA62Inputs, inspectBrowserBundle, sha256 } from "./a62-offline-runtime-dependency-lib.mjs";

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a62-test-"));
const checks = []; const failures = [];
const check = (id, ok, detail = null) => { const row = { id, ok: Boolean(ok), detail }; checks.push(row); if (!row.ok) failures.push(row); };
function py(code, args = []) { const run = spawnSync("python3", ["-c", code, ...args], { encoding: "utf8" }); if (run.status !== 0) throw new Error(run.stderr || run.stdout || "python_fixture_failed"); }
function deterministicZip(directory, output) {
  py('import os,stat,sys,zipfile\nroot,out=sys.argv[1],sys.argv[2]\nfiles=[]\nfor base,ds,fs in os.walk(root):\n ds.sort(); fs.sort()\n for f in fs: files.append(os.path.join(base,f))\nwith zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED,compresslevel=9) as z:\n for p in sorted(files,key=lambda p:os.path.relpath(p,root).replace(os.sep,"/")):\n  rel=os.path.relpath(p,root).replace(os.sep,"/"); info=zipfile.ZipInfo(rel,(1980,1,1,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED; info.external_attr=((stat.S_IFREG | stat.S_IMODE(os.stat(p).st_mode)) & 0xffff)<<16; z.writestr(info,open(p,"rb").read(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)', [directory, output]);
}
function buildRuntime({ version = "99.0.0", npm = "99.0.0", unsafe = false } = {}) {
  const tree = path.join(temp, `runtime-${crypto.randomUUID()}`); const r = path.join(tree, "fake-node");
  fs.mkdirSync(path.join(r, "bin"), { recursive: true }); fs.mkdirSync(path.join(r, "lib/node_modules/npm/bin"), { recursive: true });
  fs.writeFileSync(path.join(r, "bin/node"), `#!/bin/sh\nif [ "$1" = "--version" ]; then echo v${version}; elif [ "$2" = "--version" ]; then echo ${npm}; else exit 0; fi\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(r, "lib/node_modules/npm/bin/npm-cli.js"), "// fixture\n");
  if (unsafe) fs.symlinkSync("../../../../outside", path.join(r, "bin/bad")); else fs.symlinkSync("../lib/node_modules/npm/bin/npm-cli.js", path.join(r, "bin/npm"));
  const archive = `${tree}.tar.xz`;
  const run = spawnSync("tar", ["--sort=name", "--mtime=@0", "--owner=0", "--group=0", "--numeric-owner", "-cJf", archive, "-C", tree, "fake-node"], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(run.stderr);
  return archive;
}
const tarball = Buffer.from("a62-fixture-package-tarball-v1");
const integrity = `sha512-${crypto.createHash("sha512").update(tarball).digest("base64")}`;
const lock = { name: "fixture", lockfileVersion: 3, packages: { "": { name: "fixture" }, "node_modules/demo": { version: "1.0.0", resolved: "https://registry.npmjs.org/demo/-/demo-1.0.0.tgz", integrity } } };
const lockPath = path.join(temp, "package-lock.json"); fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
function buildDependencyBundle(mutator = null, extra = null) {
  const manifest = { schemaVersion: "velmere.pass36.a62.dependency-bundle.v1", packageLockSha256: sha256(fs.readFileSync(lockPath)), packages: [{ lockPath: "node_modules/demo", version: "1.0.0", resolved: "https://registry.npmjs.org/demo/-/demo-1.0.0.tgz", integrity, tarballPath: "tarballs/demo.tgz", byteLength: tarball.length, sha256: sha256(tarball) }] };
  if (mutator) mutator(manifest);
  const dir = path.join(temp, `bundle-${crypto.randomUUID()}`); fs.mkdirSync(path.join(dir, "tarballs"), { recursive: true });
  fs.writeFileSync(path.join(dir, "A62_DEPENDENCY_BUNDLE_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`); fs.writeFileSync(path.join(dir, "tarballs/demo.tgz"), tarball);
  if (extra) fs.writeFileSync(path.join(dir, extra), "extra");
  const zip = `${dir}.zip`; deterministicZip(dir, zip); return zip;
}
function buildBrowserBundle(mutator = null, extra = null) {
  const dir = path.join(temp, `browser-${crypto.randomUUID()}`); const executableRelativePath = "ms-playwright/chromium-fixture/chrome";
  fs.mkdirSync(path.join(dir, "ms-playwright/chromium-fixture"), { recursive: true });
  const executable = Buffer.from("#!/bin/sh\nexit 0\n"); fs.writeFileSync(path.join(dir, executableRelativePath), executable, { mode: 0o755 });
  const manifest = { schemaVersion: "velmere.pass36.a62.playwright-browser-bundle.v1", packageLockSha256: sha256(fs.readFileSync(lockPath)), playwrightVersion: "99.0.0", browserName: "chromium", platform: "linux-x64", rootDirectory: "ms-playwright", executableRelativePath, files: [{ path: executableRelativePath, byteLength: executable.length, sha256: sha256(executable), mode: 0o100755 }] };
  if (mutator) mutator(manifest);
  fs.writeFileSync(path.join(dir, "A62_PLAYWRIGHT_BROWSER_BUNDLE_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  if (extra) fs.writeFileSync(path.join(dir, extra), "extra");
  const zip = `${dir}.zip`; deterministicZip(dir, zip); return zip;
}

const runtime = buildRuntime(); const dependencyBundle = buildDependencyBundle(); const browserBundle = buildBrowserBundle();
const fixturePolicy = {
  revisionId: "A62_FIXTURE", expectedRuntime: { node: "99.0.0", npm: "99.0.0" }, pythonCommand: "python3",
  packageLock: { path: "", sha256: sha256(fs.readFileSync(lockPath)), expectedRemotePackages: 1 },
  runtimeProfiles: { "linux-x64": { archiveType: "tar.xz", sha256: sha256(fs.readFileSync(runtime)), expectedRoot: "fake-node", nodeRelativePath: "bin/node", npmCliRelativePath: "lib/node_modules/npm/bin/npm-cli.js", pathDirectoryRelativePath: "bin", npmCommandRelativePath: "bin/npm", allowedSymlinks: ["fake-node/bin/npm"], maximumArchiveBytes: 10_000_000, maximumEntries: 100, maximumTotalBytes: 10_000_000, maximumSingleFileBytes: 5_000_000 } },
  dependencyBundle: { schemaVersion: "velmere.pass36.a62.dependency-bundle.v1", manifestPath: "A62_DEPENDENCY_BUNDLE_MANIFEST.json", budgets: { maximumArchiveBytes: 10_000_000, maximumEntries: 100, maximumTotalUncompressedBytes: 10_000_000, maximumSingleFileBytes: 5_000_000 } },
  browserBundle: { schemaVersion: "velmere.pass36.a62.playwright-browser-bundle.v1", manifestPath: "A62_PLAYWRIGHT_BROWSER_BUNDLE_MANIFEST.json", playwrightVersion: "99.0.0", browserName: "chromium", rootDirectory: "ms-playwright", budgets: { maximumArchiveBytes: 10_000_000, maximumEntries: 100, maximumTotalUncompressedBytes: 10_000_000, maximumSingleFileBytes: 5_000_000 } },
  decisions: { verifiedInputs: "VERIFIED", blocked: "BLOCKED", rejected: "REJECTED" }, truthBoundary: "fixture"
};
const relativeFixtureLock = "artifacts/pass36/a62-test-package-lock.json"; fs.mkdirSync(path.dirname(path.join(root, relativeFixtureLock)), { recursive: true }); fs.copyFileSync(lockPath, path.join(root, relativeFixtureLock)); fixturePolicy.packageLock.path = relativeFixtureLock;
function evaluate(nodeArchivePath = runtime, dependencyBundlePath = dependencyBundle, browserBundlePath = browserBundle, browserSha = sha256(fs.readFileSync(browserBundle)), policy = fixturePolicy, extractRuntime = false) { return evaluateA62Inputs({ root, policy, nodeArchivePath, dependencyBundlePath, browserBundlePath, expectedBrowserBundleSha256: browserSha, extractRuntime, platformKey: "linux-x64" }); }

const valid = evaluate(runtime, dependencyBundle, browserBundle, sha256(fs.readFileSync(browserBundle)), fixturePolicy, true);
check("valid-decision", valid.decision === "VERIFIED", valid.decision);
check("valid-runtime", valid.runtime?.node === "99.0.0" && valid.runtime?.npm === "99.0.0", valid.runtime);
check("valid-package-count", valid.summary.packageCount === 1, valid.summary);
check("valid-browser", valid.summary.browserBundleVerified === true && valid.summary.browserFiles === 1, valid.browser);
check("valid-no-promotion", valid.saleEnabled === false && valid.liveProven === false);
const extractedBrowser = inspectBrowserBundle({ bundlePath: browserBundle, expectedBundleSha256: sha256(fs.readFileSync(browserBundle)), packageLockPath: path.join(root, relativeFixtureLock), policy: fixturePolicy, platformKey: "linux-x64", extractRoot: path.join(temp, "browser-extracted") });
check("browser-extraction", fs.existsSync(extractedBrowser.executablePath), extractedBrowser.executableRelativePath);
const blocked = evaluate(null, null, null, null); check("missing-inputs-blocked", blocked.decision === "BLOCKED" && blocked.summary.errors === 3, blocked.summary);
const wrongHashPolicy = structuredClone(fixturePolicy); wrongHashPolicy.runtimeProfiles["linux-x64"].sha256 = "0".repeat(64); check("wrong-runtime-hash-rejected", evaluate(runtime, dependencyBundle, browserBundle, sha256(fs.readFileSync(browserBundle)), wrongHashPolicy).decision === "REJECTED");
const wrongLockPolicy = structuredClone(fixturePolicy); wrongLockPolicy.packageLock.sha256 = "1".repeat(64); check("wrong-lock-anchor-rejected", evaluate(runtime, dependencyBundle, browserBundle, sha256(fs.readFileSync(browserBundle)), wrongLockPolicy).decision === "REJECTED");
check("dependency-extra-file-rejected", evaluate(runtime, buildDependencyBundle(null, "extra.txt"), browserBundle).decision === "REJECTED");
check("tarball-sha-rejected", evaluate(runtime, buildDependencyBundle((m) => { m.packages[0].sha256 = "2".repeat(64); }), browserBundle).decision === "REJECTED");
check("tarball-size-rejected", evaluate(runtime, buildDependencyBundle((m) => { m.packages[0].byteLength += 1; }), browserBundle).decision === "REJECTED");
check("tarball-integrity-rejected", evaluate(runtime, buildDependencyBundle((m) => { m.packages[0].integrity = `sha512-${Buffer.alloc(64).toString("base64")}`; }), browserBundle).decision === "REJECTED");
check("bundle-lock-digest-rejected", evaluate(runtime, buildDependencyBundle((m) => { m.packageLockSha256 = "3".repeat(64); }), browserBundle).decision === "REJECTED");
check("bundle-metadata-rejected", evaluate(runtime, buildDependencyBundle((m) => { m.packages[0].version = "2.0.0"; }), browserBundle).decision === "REJECTED");
check("bundle-missing-package-rejected", evaluate(runtime, buildDependencyBundle((m) => { m.packages = []; }), browserBundle).decision === "REJECTED");
check("bundle-duplicate-package-rejected", evaluate(runtime, buildDependencyBundle((m) => { m.packages.push({ ...m.packages[0] }); }), browserBundle).decision === "REJECTED");
check("browser-anchor-rejected", evaluate(runtime, dependencyBundle, browserBundle, "4".repeat(64)).decision === "REJECTED");
const browserBadHash = buildBrowserBundle((m) => { m.files[0].sha256 = "5".repeat(64); }); check("browser-file-hash-rejected", evaluate(runtime, dependencyBundle, browserBadHash, sha256(fs.readFileSync(browserBadHash))).decision === "REJECTED");
const browserExtra = buildBrowserBundle(null, "extra.txt"); check("browser-extra-file-rejected", evaluate(runtime, dependencyBundle, browserExtra, sha256(fs.readFileSync(browserExtra))).decision === "REJECTED");
const browserPlatform = buildBrowserBundle((m) => { m.platform = "win32-x64"; }); check("browser-platform-rejected", evaluate(runtime, dependencyBundle, browserPlatform, sha256(fs.readFileSync(browserPlatform))).decision === "REJECTED");
const browserLock = buildBrowserBundle((m) => { m.packageLockSha256 = "6".repeat(64); }); check("browser-lock-rejected", evaluate(runtime, dependencyBundle, browserLock, sha256(fs.readFileSync(browserLock))).decision === "REJECTED");
const browserExecutable = buildBrowserBundle((m) => { m.executableRelativePath = "ms-playwright/missing"; }); check("browser-executable-rejected", evaluate(runtime, dependencyBundle, browserExecutable, sha256(fs.readFileSync(browserExecutable))).decision === "REJECTED");
const wrongVersionRuntime = buildRuntime({ version: "98.0.0" }); const wrongVersionPolicy = structuredClone(fixturePolicy); wrongVersionPolicy.runtimeProfiles["linux-x64"].sha256 = sha256(fs.readFileSync(wrongVersionRuntime)); check("runtime-version-rejected", evaluate(wrongVersionRuntime, dependencyBundle, browserBundle, sha256(fs.readFileSync(browserBundle)), wrongVersionPolicy, true).decision === "REJECTED");
const unsafeRuntime = buildRuntime({ unsafe: true }); const unsafePolicy = structuredClone(fixturePolicy); unsafePolicy.runtimeProfiles["linux-x64"].sha256 = sha256(fs.readFileSync(unsafeRuntime)); check("unsafe-runtime-symlink-rejected", evaluate(unsafeRuntime, dependencyBundle, browserBundle, sha256(fs.readFileSync(browserBundle)), unsafePolicy).decision === "REJECTED");
for (const relative of ["scripts/a62-offline-exact-runtime-dependency-bootstrap.mjs", "scripts/pass36/a62-offline-runtime-dependency-lib.mjs", "scripts/pass36/a62_safe_tar.py", "scripts/pass36/a62-playwright-browser-smoke.mjs", "scripts/pass36/build-a62-playwright-browser-bundle.mjs", "scripts/pass36/build-a62-dependency-bundle.mjs", "scripts/pass36/a62_deterministic_zip.py", "scripts/pass36/verify-a62-offline-exact-runtime-dependency-bootstrap.mjs", "VELMERE_RUN_A62_OFFLINE_EXACT_RUNTIME_DEPENDENCY_BOOTSTRAP.cmd"]) check(`file:${relative}`, fs.existsSync(path.join(root, relative)));
const productionPolicy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json"), "utf8"));
check("production-linux-anchor", productionPolicy.runtimeProfiles["linux-x64"].sha256 === "55aa7153f9d88f28d765fcdad5ae6945b5c0f98a36881703817e4c450fa76742");
check("production-windows-anchor", productionPolicy.runtimeProfiles["win32-x64"].sha256 === "0ae68406b42d7725661da979b1403ec9926da205c6770827f33aac9d8f26e821");
check("production-runtime-exact", productionPolicy.expectedRuntime.node === "24.18.0" && productionPolicy.expectedRuntime.npm === "11.16.0");
check("production-package-denominator", productionPolicy.packageLock.expectedRemotePackages === 654 && productionPolicy.packageLock.denominatorMigrationPath === "config/pass36/a102r41-a78-lockfile-denominator-migration.json");
check("production-browser-bound", productionPolicy.browserBundle.playwrightVersion === "1.60.0" && productionPolicy.browserBundle.browserVersion === "148.0.7778.96" && productionPolicy.browserBundle.browserRevision === "1223" && productionPolicy.promotionConditions.playwrightBrowserBundleRequired === true && productionPolicy.promotionConditions.browserLaunchSmokeRequired === true);
check("production-offline-required", productionPolicy.promotionConditions.offlineNpmCiRequired === true && productionPolicy.promotionConditions.a60VerifiedDecisionRequired === true);
const runner = fs.readFileSync(path.join(root, "scripts/a62-offline-exact-runtime-dependency-bootstrap.mjs"), "utf8");
for (const marker of ["a62_missing_external_source_manifest_anchor", "buildIsolatedExecutionEnvironment", "a62_runtime_tree_mutated_during_bootstrap", "a62_confirmation_token_invalid", "dependency-cache-seeded", "playwright-browser-bundle-extracted", "playwright-browser-launch-smoke", "offline-npm-ci", "a60-exact-admission", "VERIFIED_LOCAL_EXACT_FINAL_BYTE_BUILD_BROWSER", "sourceUnchanged"]) check(`runner-marker:${marker}`, runner.includes(marker));
const browserRunner = fs.readFileSync(path.join(root, "scripts/a45-browser-acceptance.mjs"), "utf8"); check("a45-executable-binding", browserRunner.includes("VELMERE_PLAYWRIGHT_EXECUTABLE_PATH") && browserRunner.includes("executablePath"));
const current = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/current-revision.json"), "utf8"));
check("current-source-a63-and-a62-retained", current.sourceRevisionId === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY" && current.offlineExactRuntimeDependencyBootstrapRevisionId === productionPolicy.revisionId, current);
check("current-a60-retained", current.exactFinalByteBuildAcceptanceRevisionId === productionPolicy.exactBuildAcceptanceRevisionId);
check("current-no-false-credit", current.offlineExactRuntimeDependencyBootstrapExecuted === false && current.exactRuntimeArtifactVerified === false && current.dependencyBundleVerified === false && current.playwrightBrowserBundleVerified === false && current.exactFinalByteBuildExecuted === false && current.saleEnabled === false && current.liveProven === false, current);

if (valid.temporaryRuntimeRoot) fs.rmSync(valid.temporaryRuntimeRoot, { recursive: true, force: true });
for (const item of fs.readdirSync(root)) if (item.startsWith(".a62-runtime-")) fs.rmSync(path.join(root, item), { recursive: true, force: true });
const result = { schemaVersion: "velmere.pass36.a62.offline-exact-runtime-dependency-bootstrap-test.v2", revisionId: productionPolicy.revisionId, status: failures.length ? "FAIL_A62" : "PASS_A62_STATIC_AND_ADVERSARIAL_FIXTURE", summary: { checks: checks.length, passed: checks.filter((r) => r.ok).length, failed: failures.length }, failures, checks, realRuntimeSupplied: false, realDependencyBundleSupplied: false, realBrowserBundleSupplied: false, saleEnabled: false, liveProven: false, truthBoundary: productionPolicy.truthBoundary };
fs.writeFileSync(path.join(root, "config/pass36/a62-offline-runtime-dependency-test-receipt.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
fs.rmSync(path.join(root, relativeFixtureLock), { force: true }); fs.rmSync(temp, { recursive: true, force: true });
if (failures.length) process.exit(1);
