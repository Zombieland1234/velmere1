#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  acquireSegmentedBuildLock,
  classifySegmentedBuildStatus,
  inspectBuildIdPair,
  inspectExactBuildId,
  inspectSegmentedBuildLockBoundary,
  releaseSegmentedBuildLock,
} from "../../lib/build/segmented-build-integrity.mjs";

const probeRoot = process.argv[2] === "--probe-lock" ? process.argv[3] : null;
const probeExternalLockRoot = process.argv[2] === "--probe-lock" ? process.argv[4] : null;
if (probeRoot) {
  const lock = acquireSegmentedBuildLock({
    root: probeRoot,
    mode: "webpack",
    distDir: ".next-pass25-webpack",
    buildId: "vlm-deployment-webpack-lockprobe",
    externalLockRoot: probeExternalLockRoot,
  });
  if (!lock.acquired) {
    console.log(JSON.stringify({ status: lock.status, acquired: false, observed: lock.observed }));
    process.exit(23);
  }
  const release = releaseSegmentedBuildLock(lock);
  console.log(JSON.stringify({ status: release.status, acquired: true, released: release.released }));
  process.exit(release.released ? 0 : 24);
}

const raceProbeRoot = process.argv[2] === "--probe-race" ? process.argv[3] : null;
if (raceProbeRoot) {
  const raceExternalLockRoot = process.argv[4];
  const startAtMs = Number(process.argv[5]);
  if (!Number.isSafeInteger(startAtMs)) process.exit(25);
  const waitCell = new Int32Array(new SharedArrayBuffer(4));
  while (Date.now() < startAtMs) Atomics.wait(waitCell, 0, 0, Math.min(25, startAtMs - Date.now()));
  const lock = acquireSegmentedBuildLock({
    root: raceProbeRoot,
    mode: "webpack",
    distDir: ".next-pass25-webpack",
    buildId: "vlm-deployment-webpack-raceprobe",
    externalLockRoot: raceExternalLockRoot,
  });
  if (!lock.acquired) {
    console.log(JSON.stringify({ status: lock.status, acquired: false }));
    process.exit(23);
  }
  Atomics.wait(waitCell, 0, 0, 2_000);
  const release = releaseSegmentedBuildLock(lock);
  console.log(JSON.stringify({ status: release.status, acquired: true, released: release.released }));
  process.exit(release.released ? 0 : 24);
}

let assertions = 0;
const equal = (actual, expected, message) => {
  assert.equal(actual, expected, message);
  assertions += 1;
};
const ok = (value, message) => {
  assert.ok(value, message);
  assertions += 1;
};
const throws = (fn, pattern, message) => {
  assert.throws(fn, pattern, message);
  assertions += 1;
};
const notEqual = (actual, expected, message) => {
  assert.notEqual(actual, expected, message);
  assertions += 1;
};
const suiteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-segmented-integrity-"));
const root = path.join(suiteRoot, "source-one");
const secondRoot = path.join(suiteRoot, "source-two");
const externalLockRoot = path.join(suiteRoot, "external-lock-state");
fs.mkdirSync(root, { mode: 0o700 });
fs.mkdirSync(secondRoot, { mode: 0o700 });
fs.mkdirSync(externalLockRoot, { mode: 0o700 });
const testFile = fileURLToPath(import.meta.url);
const verifierFile = fileURLToPath(new URL("./verify-segmented-build-lock-boundary.mjs", import.meta.url));
const buildId = "vlm-deployment-webpack-0123456789abcdef";
const rootBuildIdPath = path.join(root, ".next-pass25-webpack", "BUILD_ID");
const standaloneBuildIdPath = path.join(root, ".next-pass25-webpack", "standalone", ".next-pass25-webpack", "BUILD_ID");

function launchRaceContender(startAtMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [testFile, "--probe-race", root, externalLockRoot, String(startAtMs)], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      try {
        resolve({ code, signal, receipt: JSON.parse(stdout.trim()), stderr });
      } catch (error) {
        reject(new Error(`race_probe_invalid_output:${code}:${signal}:${stderr}`, { cause: error }));
      }
    });
  });
}

try {
  const first = acquireSegmentedBuildLock({
    root,
    mode: "webpack",
    distDir: ".next-pass25-webpack",
    buildId,
    externalLockRoot,
  });
  equal(first.acquired, true, "first exact mode/distDir lock is acquired");
  equal(first.status, "ACQUIRED", "acquired lock has a readable status");
  equal(first.storage, "EXTERNAL_RUNTIME_STATE", "lock receipt identifies external runtime storage");
  ok(/^[a-f0-9]{64}$/u.test(first.namespaceSha256), "lock namespace is a full SHA-256");
  ok(/^[a-f0-9]{64}$/u.test(first.owner.hostnameSha256), "owner host identity is hash-only");
  equal("hostname" in first.owner, false, "acquisition receipt does not disclose the raw hostname");
  equal(first.path.includes(externalLockRoot), false, "reported lock path does not disclose the external host path");
  equal(first.owner.platform, process.platform, "lock receipt binds the executing platform");
  equal(first.owner.windowsAclOwnershipVerified, false, "no unverified Windows ACL ownership credit is emitted");
  equal(first.owner.lockFileDataFsyncApplied, true, "owner bytes are fsynced before acquisition succeeds");
  if (process.platform === "win32") {
    equal(first.owner.processIdentityBound, false, "Windows acquisition does not claim Linux process identity");
    equal(first.owner.directoryFsyncApplied, false, "Windows acquisition does not claim unavailable directory fsync");
    equal(first.owner.crashDurabilityCredit, false, "Windows acquisition receives no crash-durability credit");
  } else {
    equal(first.owner.processIdentityBound, true, "Linux acquisition binds boot and process-start identity");
    equal(first.owner.directoryFsyncApplied, true, "Linux acquisition fsyncs the namespace directory");
    equal(first.owner.crashDurabilityCredit, true, "Linux acquisition records its applied durability boundary");
  }
  ok(fs.existsSync(first.absolutePath), "acquired external lock has a physical owner record");
  equal(
    fs.existsSync(path.join(root, ".velmere", "deployment-builds", "locks")),
    false,
    "acquisition never creates the legacy source lock directory",
  );
  const firstNamespaceSha256 = first.namespaceSha256;

  const blockedProbe = spawnSync(process.execPath, [testFile, "--probe-lock", root, externalLockRoot], {
    encoding: "utf8",
    timeout: 10_000,
  });
  equal(blockedProbe.status, 23, "a concurrent process is blocked from the same mode/distDir");
  const blockedReceipt = JSON.parse(blockedProbe.stdout.trim());
  equal(blockedReceipt.status, "BLOCKED_BUILD_LOCK", "contention emits the exact blocked status");
  equal(blockedReceipt.acquired, false, "blocked process does not claim the lock");
  equal(blockedReceipt.observed.readable, true, "contention receipt safely describes the current owner");
  equal(
    "hostname" in blockedReceipt.observed.owner,
    false,
    "contention receipt does not disclose the raw hostname",
  );

  const turbopack = acquireSegmentedBuildLock({
    root,
    mode: "turbopack",
    distDir: ".next-pass25-turbopack",
    buildId: "vlm-deployment-turbopack-0123456789abcdef",
    externalLockRoot,
  });
  equal(turbopack.acquired, true, "a different mode/distDir uses an independent lock");
  const turbopackRelease = releaseSegmentedBuildLock(turbopack);
  equal(turbopackRelease.status, "RELEASED", "independent lock releases");
  const firstRelease = releaseSegmentedBuildLock(first);
  equal(firstRelease.status, "RELEASED", "owner releases the original lock");
  equal(firstRelease.absentAtRelease, true, "release physically verifies lock-path absence");
  equal(
    firstRelease.directoryFsyncApplied,
    process.platform !== "win32",
    "release reports the platform's exact directory-fsync capability",
  );
  equal(firstRelease.windowsAclOwnershipVerified, false, "release emits no unverified Windows ACL ownership credit");

  const successfulProbe = spawnSync(process.execPath, [testFile, "--probe-lock", root, externalLockRoot], {
    encoding: "utf8",
    timeout: 10_000,
  });
  equal(successfulProbe.status, 0, "the same mode/distDir can run after verified release");
  equal(JSON.parse(successfulProbe.stdout.trim()).status, "RELEASED", "post-release probe owns and releases its lock");
  const raceResults = await Promise.all(Array.from({ length: 6 }, () => launchRaceContender(Date.now() + 1_000)));
  const raceWinners = raceResults.filter((row) => row.receipt.acquired === true);
  const raceBlocked = raceResults.filter((row) => row.receipt.status === "BLOCKED_BUILD_LOCK");
  equal(raceResults.length, 6, "all simultaneous race contenders return a receipt");
  equal(raceWinners.length, 1, "exactly one simultaneous contender acquires an absent lock path");
  equal(raceBlocked.length, 5, "every losing simultaneous contender is blocked");
  equal(raceResults.every((row) => row.stderr === ""), true, "race probes emit no hidden stderr failure");
  equal(raceWinners[0].receipt.released, true, "the unique race winner releases its owned lock");
  equal(inspectSegmentedBuildLockBoundary({ root, externalLockRoot }).ok, true, "race completion leaves the lock boundary absent");
  const raceReacquired = acquireSegmentedBuildLock({
    root,
    mode: "webpack",
    distDir: ".next-pass25-webpack",
    buildId,
    externalLockRoot,
  });
  equal(raceReacquired.acquired, true, "the lock can be reacquired after the simultaneous race");
  equal(releaseSegmentedBuildLock(raceReacquired).status, "RELEASED", "the post-race reacquisition releases");
  const unrelated = spawnSync(process.execPath, ["--eval", "setTimeout(() => {}, 25)"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  equal(unrelated.status, 0, "an unrelated process launches after the lock-owning child exits");
  const afterUnrelated = inspectSegmentedBuildLockBoundary({ root, externalLockRoot });
  equal(afterUnrelated.ok, true, "external and legacy source lock paths remain absent after unrelated process launch");
  const postProcessVerifier = spawnSync(process.execPath, [verifierFile, "--phase", "manual"], {
    cwd: root,
    env: { ...process.env, VELMERE_BUILD_LOCK_ROOT: externalLockRoot },
    encoding: "utf8",
    timeout: 10_000,
  });
  equal(postProcessVerifier.status, 0, "bounded post-process verifier passes after child exit");
  equal(JSON.parse(postProcessVerifier.stdout).checks >= 2, true, "post-process verifier performs repeated checks");
  throws(
    () => acquireSegmentedBuildLock({
      root,
      mode: "webpack",
      distDir: ".next-pass25-turbopack",
      buildId,
      externalLockRoot,
    }),
    /dist_dir_mismatch/u,
    "mode/distDir shadowing is rejected",
  );

  const tampered = acquireSegmentedBuildLock({
    root,
    mode: "webpack",
    distDir: ".next-pass25-webpack",
    buildId,
    externalLockRoot,
  });
  const tamperedPath = tampered.absolutePath;
  const tamperedMetadata = JSON.parse(fs.readFileSync(tamperedPath, "utf8"));
  tamperedMetadata.token = "0".repeat(64);
  fs.writeFileSync(tamperedPath, `${JSON.stringify(tamperedMetadata)}\n`, "utf8");
  const tamperedRelease = releaseSegmentedBuildLock(tampered);
  equal(tamperedRelease.status, "FAIL_BUILD_LOCK_RELEASE", "owner-token tamper fails release closed");
  equal(fs.existsSync(tamperedPath), true, "tampered lock is retained for operator review");
  const blockedByTamper = acquireSegmentedBuildLock({
    root,
    mode: "webpack",
    distDir: ".next-pass25-webpack",
    buildId,
    externalLockRoot,
  });
  equal(blockedByTamper.status, "BLOCKED_BUILD_LOCK", "a retained tampered lock cannot be auto-stolen");
  fs.unlinkSync(tamperedPath);

  const replaced = acquireSegmentedBuildLock({
    root,
    mode: "webpack",
    distDir: ".next-pass25-webpack",
    buildId,
    externalLockRoot,
  });
  const replacedPath = replaced.absolutePath;
  fs.unlinkSync(replacedPath);
  fs.writeFileSync(replacedPath, "{}\n", { flag: "wx", mode: 0o600 });
  const replacedRelease = releaseSegmentedBuildLock(replaced);
  equal(replacedRelease.status, "FAIL_BUILD_LOCK_RELEASE", "path replacement fails release closed");
  equal(replacedRelease.reason, "lock_inode_changed", "path replacement is classified by descriptor/path identity");
  equal(fs.existsSync(replacedPath), true, "replacement path is retained rather than deleted by the former owner");
  fs.unlinkSync(replacedPath);

  const secondNamespace = acquireSegmentedBuildLock({
    root: secondRoot,
    mode: "webpack",
    distDir: ".next-pass25-webpack",
    buildId,
    externalLockRoot,
  });
  equal(secondNamespace.acquired, true, "a second canonical source root can acquire its own namespace");
  notEqual(
    secondNamespace.namespaceSha256,
    firstNamespaceSha256,
    "different canonical source roots have deterministic namespace separation",
  );
  notEqual(secondNamespace.path, tampered.path, "reported lock paths separate distinct source roots");
  equal(releaseSegmentedBuildLock(secondNamespace).status, "RELEASED", "second source namespace releases");

  const aliasRoot = path.join(suiteRoot, "source-one-alias");
  fs.symlinkSync(root, aliasRoot, process.platform === "win32" ? "junction" : "dir");
  const canonicalAlias = acquireSegmentedBuildLock({
    root: aliasRoot,
    mode: "webpack",
    distDir: ".next-pass25-webpack",
    buildId,
    externalLockRoot,
  });
  equal(
    canonicalAlias.namespaceSha256,
    firstNamespaceSha256,
    "a source-root symlink alias resolves to the same canonical namespace",
  );
  equal(releaseSegmentedBuildLock(canonicalAlias).status, "RELEASED", "canonical alias lock releases");

  throws(
    () => acquireSegmentedBuildLock({
      root,
      mode: "webpack",
      distDir: ".next-pass25-webpack",
      buildId,
      externalLockRoot: "relative-lock-root",
    }),
    /root_must_be_absolute/u,
    "relative external lock roots are rejected",
  );
  throws(
    () => acquireSegmentedBuildLock({
      root,
      mode: "webpack",
      distDir: ".next-pass25-webpack",
      buildId,
      externalLockRoot: path.join(root, "lock-state"),
    }),
    /root_not_disjoint_from_source/u,
    "external lock roots inside the source tree are rejected",
  );
  throws(
    () => acquireSegmentedBuildLock({
      root,
      mode: "webpack",
      distDir: ".next-pass25-webpack",
      buildId,
      externalLockRoot: suiteRoot,
    }),
    /root_not_disjoint_from_source/u,
    "external lock roots containing the source tree are rejected",
  );
  const symlinkTarget = path.join(suiteRoot, "symlink-lock-target");
  const symlinkRoot = path.join(suiteRoot, "symlink-lock-root");
  fs.mkdirSync(symlinkTarget, { mode: 0o700 });
  fs.symlinkSync(symlinkTarget, symlinkRoot, process.platform === "win32" ? "junction" : "dir");
  throws(
    () => acquireSegmentedBuildLock({
      root,
      mode: "webpack",
      distDir: ".next-pass25-webpack",
      buildId,
      externalLockRoot: symlinkRoot,
    }),
    /root_symlink_rejected/u,
    "symlink external lock roots are rejected",
  );
  const intermediateTarget = path.join(suiteRoot, "intermediate-junction-target");
  const intermediateLink = path.join(suiteRoot, "intermediate-junction-link");
  fs.mkdirSync(path.join(intermediateTarget, "nested-lock-root"), { recursive: true, mode: 0o700 });
  fs.symlinkSync(intermediateTarget, intermediateLink, process.platform === "win32" ? "junction" : "dir");
  throws(
    () => acquireSegmentedBuildLock({
      root,
      mode: "webpack",
      distDir: ".next-pass25-webpack",
      buildId,
      externalLockRoot: path.join(intermediateLink, "nested-lock-root"),
    }),
    /root_symlink_rejected/u,
    "an intermediate reparse component in the external lock root is rejected",
  );
  const insecureRoot = path.join(suiteRoot, "insecure-lock-root");
  fs.mkdirSync(insecureRoot, { mode: 0o755 });
  fs.chmodSync(insecureRoot, 0o755);
  if (process.platform === "win32") {
    const windowsAclBoundary = acquireSegmentedBuildLock({
      root,
      mode: "webpack",
      distDir: ".next-pass25-webpack",
      buildId,
      externalLockRoot: insecureRoot,
    });
    equal(windowsAclBoundary.acquired, true, "Windows lock still uses exclusive owner-file creation");
    equal(windowsAclBoundary.owner.posixOwnerAndModeVerified, false, "Windows does not claim POSIX ownership or mode verification");
    equal(windowsAclBoundary.owner.windowsAclOwnershipVerified, false, "Windows ACL ownership remains explicitly unverified");
    equal(windowsAclBoundary.owner.crashDurabilityCredit, false, "Windows lock has no directory-fsync crash-durability credit");
    equal(releaseSegmentedBuildLock(windowsAclBoundary).status, "RELEASED", "Windows ACL-boundary fixture releases safely");
  } else {
    throws(
      () => acquireSegmentedBuildLock({
        root,
        mode: "webpack",
        distDir: ".next-pass25-webpack",
        buildId,
        externalLockRoot: insecureRoot,
      }),
      /root_insecure_permissions/u,
      "group/world-accessible external lock roots are rejected",
    );
    const nonOwnerRoot = path.join(suiteRoot, "non-owner-lock-root");
    fs.mkdirSync(nonOwnerRoot, { mode: 0o700 });
    const originalLstatSync = fs.lstatSync;
    fs.lstatSync = (candidate, ...args) => {
      const stat = originalLstatSync(candidate, ...args);
      if (path.resolve(String(candidate)) === nonOwnerRoot) {
        return new Proxy(stat, {
          get(target, property, receiver) {
            if (property === "uid") return process.getuid() + 1;
            return Reflect.get(target, property, receiver);
          },
        });
      }
      return stat;
    };
    try {
      throws(
        () => acquireSegmentedBuildLock({
          root,
          mode: "webpack",
          distDir: ".next-pass25-webpack",
          buildId,
          externalLockRoot: nonOwnerRoot,
        }),
        /root_owner_mismatch/u,
        "external lock roots with an observed owner mismatch are rejected",
      );
    } finally {
      fs.lstatSync = originalLstatSync;
    }
  }

  fs.mkdirSync(path.dirname(rootBuildIdPath), { recursive: true });
  fs.writeFileSync(rootBuildIdPath, buildId, "utf8");
  equal(inspectExactBuildId({
    filePath: rootBuildIdPath,
    expectedBuildId: buildId,
    label: "root",
  }).status, "EXACT", "byte-exact root BUILD_ID passes");

  fs.writeFileSync(rootBuildIdPath, "", "utf8");
  equal(inspectExactBuildId({
    filePath: rootBuildIdPath,
    expectedBuildId: buildId,
    label: "root",
  }).status, "EMPTY", "empty BUILD_ID fails explicitly");

  fs.writeFileSync(rootBuildIdPath, "vlm-deployment-webpack-wrong", "utf8");
  const wrong = inspectExactBuildId({
    filePath: rootBuildIdPath,
    expectedBuildId: buildId,
    label: "root",
  });
  equal(wrong.status, "MISMATCH", "wrong BUILD_ID fails");
  equal(wrong.ok, false, "wrong BUILD_ID cannot receive exact credit");

  fs.writeFileSync(rootBuildIdPath, `${buildId}\n`, "utf8");
  equal(inspectExactBuildId({
    filePath: rootBuildIdPath,
    expectedBuildId: buildId,
    label: "root",
  }).status, "MISMATCH", "newline-normalized BUILD_ID is not treated as exact");

  fs.mkdirSync(path.dirname(standaloneBuildIdPath), { recursive: true });
  fs.writeFileSync(rootBuildIdPath, buildId, "utf8");
  fs.writeFileSync(standaloneBuildIdPath, "vlm-deployment-webpack-other", "utf8");
  const mismatch = inspectBuildIdPair({ rootBuildIdPath, standaloneBuildIdPath, expectedBuildId: buildId });
  equal(mismatch.ok, false, "root/standalone mismatch fails the pair");
  equal(mismatch.root.ok, true, "pair receipt retains the exact root result");
  equal(mismatch.standalone.status, "MISMATCH", "pair receipt identifies the wrong standalone BUILD_ID");
  equal(mismatch.rootStandaloneEqual, false, "mismatched root/standalone bytes cannot be equal");

  fs.writeFileSync(standaloneBuildIdPath, buildId, "utf8");
  const exactPair = inspectBuildIdPair({ rootBuildIdPath, standaloneBuildIdPath, expectedBuildId: buildId });
  equal(exactPair.ok, true, "byte-exact root and standalone BUILD_ID pair passes");
  equal(exactPair.rootStandaloneEqual, true, "final pair proves root/standalone equality");

  equal(classifySegmentedBuildStatus({
    compileStatus: "PASS",
    generateStatus: "PASS",
    outputContractOk: false,
  }), "FAIL_OUTPUT_CONTRACT", "successful phases with false output cannot be labeled PASS");
  equal(classifySegmentedBuildStatus({
    compileStatus: "PASS",
    generateStatus: null,
    buildIdBoundaryFailed: true,
    outputContractOk: false,
  }), "FAIL_OUTPUT_CONTRACT", "failed pre-generate BUILD_ID checkpoint is an output-contract failure");
  equal(classifySegmentedBuildStatus({
    compileStatus: "PASS",
    generateStatus: "PASS",
    outputContractOk: true,
  }), "PASS", "all exact local build contracts produce PASS");
  equal(classifySegmentedBuildStatus({
    lockAcquired: false,
    compileStatus: null,
    generateStatus: null,
  }), "BLOCKED_BUILD_LOCK", "lock contention has a distinct blocked status");
  equal(classifySegmentedBuildStatus({
    lockReleased: false,
    compileStatus: "PASS",
    generateStatus: "PASS",
    outputContractOk: true,
  }), "FAIL_BUILD_LOCK_RELEASE", "unverified lock release fails closed");
  equal(classifySegmentedBuildStatus({
    sourceImmutable: false,
    compileStatus: "PASS",
    generateStatus: "PASS",
    outputContractOk: true,
  }), "FAIL_SOURCE_MUTATION", "source mutation still has priority over build credit");
  equal(classifySegmentedBuildStatus({
    compileStatus: "PASS",
    generateStatus: "PASS",
    outputContractOk: true,
    managedNextEnvOk: false,
  }), "FAIL_CONTRACT", "managed next-env failure cannot receive PASS");

  console.log(JSON.stringify({
    schemaVersion: "velmere.segmented-build-integrity.test.v1",
    status: "OFFLINE-PROVEN",
    assertions,
    truthBoundary: process.platform === "win32"
      ? "Windows physical lock tests cover canonical namespace separation, junction rejection, O_EXCL contention, descriptor/inode/token release, file fsync and exact absence. Windows ACL ownership, Linux process identity, directory fsync, crash durability and orphan recovery are explicitly not credited. No Next build was executed."
      : "External lock-root safety, canonical namespace separation, cross-process cleanup, atomic contention, ownership tamper, byte-exact BUILD_ID boundaries and status classification only. No Next build was executed.",
  }, null, 2));
} finally {
  fs.rmSync(suiteRoot, { recursive: true, force: true });
}
