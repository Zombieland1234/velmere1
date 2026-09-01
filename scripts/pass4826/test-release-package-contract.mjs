import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import {
  RELEASE_MANIFEST_PATH,
  buildReleaseManifest,
  collectReleaseInventory,
  parseDeterministicZip,
  releaseEntriesFromInventory,
  sha256,
  verifyReleaseArchive,
  writeDeterministicZip,
} from "./release-package-contract.mjs";
import { createPortableRejectedSymlink } from "../pass36/portable-symlink-negative-fixture.mjs";

function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "velmere-pass4826-release-"));
  const source = path.join(directory, "source");
  const output = path.join(directory, "output");
  mkdirSync(path.join(source, "nested"), { recursive: true });
  mkdirSync(output, { recursive: true });
  writeFileSync(path.join(source, "package.json"), "{\"name\":\"fixture\"}\n");
  writeFileSync(path.join(source, "nested", "alpha.txt"), "alpha\n");
  writeFileSync(path.join(source, "run.sh"), "#!/bin/sh\nexit 0\n");
  chmodSync(path.join(source, "run.sh"), 0o755);
  return { directory, source, output };
}

function cleanup(directory) {
  rmSync(directory, { recursive: true, force: true });
}

function packageFixture(source, archivePath) {
  const inventory = collectReleaseInventory(source);
  const manifest = buildReleaseManifest(inventory);
  writeDeterministicZip(archivePath, releaseEntriesFromInventory(inventory, manifest));
  return { inventory, manifest };
}

test("repo-owned ZIP writer is byte-for-byte deterministic", () => {
  const current = fixture();
  try {
    const inventory = collectReleaseInventory(current.source);
    const manifest = buildReleaseManifest(inventory);
    const entries = releaseEntriesFromInventory(inventory, manifest).reverse();
    const first = path.join(current.output, "first.zip");
    const second = path.join(current.output, "second.zip");
    const firstResult = writeDeterministicZip(first, entries);
    const secondResult = writeDeterministicZip(second, entries);
    assert.equal(firstResult.sha256, secondResult.sha256);
    assert.deepEqual(readFileSync(first), readFileSync(second));
    assert.equal(verifyReleaseArchive(first, { sourceRoot: current.source }).status, "PASS");
  } finally { cleanup(current.directory); }
});

test("node_modules, .next and every tsconfig.tmp*.json are physically excluded", () => {
  const current = fixture();
  try {
    mkdirSync(path.join(current.source, "node_modules", "pkg"), { recursive: true });
    mkdirSync(path.join(current.source, ".next", "server"), { recursive: true });
    writeFileSync(path.join(current.source, "node_modules", "pkg", "index.js"), "unsafe\n");
    writeFileSync(path.join(current.source, ".next", "server", "output.js"), "build\n");
    writeFileSync(path.join(current.source, "tsconfig.tmp4295.json"), "{}\n");
    writeFileSync(path.join(current.source, "nested", "tsconfig.tmp-anything.json"), "{}\n");
    const archive = path.join(current.output, "release.zip");
    packageFixture(current.source, archive);
    const paths = parseDeterministicZip(archive).entries.map(({ path: entryPath }) => entryPath);
    assert(paths.includes("package.json"));
    assert(paths.includes(RELEASE_MANIFEST_PATH));
    assert.equal(paths.some((entryPath) => entryPath.includes("node_modules")), false);
    assert.equal(paths.some((entryPath) => entryPath.includes(".next")), false);
    assert.equal(paths.some((entryPath) => /(?:^|\/)tsconfig\.tmp.*\.json$/u.test(entryPath)), false);
  } finally { cleanup(current.directory); }
});

test("payload mutation is detected by CRC and content binding", () => {
  const current = fixture();
  try {
    const archive = path.join(current.output, "release.zip");
    packageFixture(current.source, archive);
    const bytes = readFileSync(archive);
    const location = bytes.indexOf(Buffer.from("alpha\n"));
    assert(location >= 0);
    bytes[location] ^= 0x01;
    writeFileSync(archive, bytes);
    assert.throws(() => verifyReleaseArchive(archive), /release_zip_crc_mismatch/u);
  } finally { cleanup(current.directory); }
});

test("source mutation after packaging invalidates current-source verification", () => {
  const current = fixture();
  try {
    const archive = path.join(current.output, "release.zip");
    packageFixture(current.source, archive);
    writeFileSync(path.join(current.source, "nested", "alpha.txt"), "changed\n");
    assert.throws(() => verifyReleaseArchive(archive, { sourceRoot: current.source }), /release_archive_source_tree_not_current/u);
  } finally { cleanup(current.directory); }
});

test("manifest cannot invent dynamic exclusions to hide release source", () => {
  const current = fixture();
  try {
    const hidden = path.join(current.source, "nested", "alpha.txt");
    const inventory = collectReleaseInventory(current.source, { dynamicExcludedPaths: [hidden] });
    const manifest = buildReleaseManifest(inventory);
    const archive = path.join(current.output, "hidden-source.zip");
    writeDeterministicZip(archive, releaseEntriesFromInventory(inventory, manifest));
    assert.throws(
      () => verifyReleaseArchive(archive, { sourceRoot: current.source }),
      /release_archive_dynamic_exclusion_policy_mismatch/u,
    );
  } finally { cleanup(current.directory); }
});

test("archive verifier rejects physically injected excluded paths", () => {
  const current = fixture();
  try {
    const archive = path.join(current.output, "forbidden.zip");
    writeDeterministicZip(archive, [{ path: "node_modules/escape.js", content: Buffer.from("x"), mode: 0o100644 }]);
    assert.throws(() => parseDeterministicZip(archive), /release_archive_forbidden_entry:node_modules\/escape\.js/u);
  } finally { cleanup(current.directory); }
});

test("manifest checksum tampering is rejected even in a structurally valid ZIP", () => {
  const current = fixture();
  try {
    const inventory = collectReleaseInventory(current.source);
    const manifest = buildReleaseManifest(inventory);
    manifest.payload.fileCount += 1;
    const entries = releaseEntriesFromInventory(inventory, manifest);
    const archive = path.join(current.output, "manifest-tampered.zip");
    writeDeterministicZip(archive, entries);
    assert.throws(() => verifyReleaseArchive(archive), /release_manifest_checksum_mismatch/u);
  } finally { cleanup(current.directory); }
});

test("symlinks are rejected rather than dereferenced outside the release root", (context) => {
  const current = fixture();
  let link;
  try {
    link = createPortableRejectedSymlink(
      path.join(current.source, "link.json"),
      path.join(current.source, "package.json"),
    );
    context.diagnostic(`release reparse fixture: ${link.kind}`);
    assert.throws(() => collectReleaseInventory(current.source), /release_symlink_forbidden:link\.json/u);
  } finally {
    link?.cleanup();
    cleanup(current.directory);
  }
});

test("unsafe traversal paths cannot be emitted by the ZIP writer", () => {
  const current = fixture();
  try {
    const archive = path.join(current.output, "traversal.zip");
    assert.throws(
      () => writeDeterministicZip(archive, [{ path: "../escape.txt", content: Buffer.from("x"), mode: 0o100644 }]),
      /release_path_not_normalized|release_path_traversal/u,
    );
  } finally { cleanup(current.directory); }
});

test("manifest source aggregate covers every included byte, path and normalized mode", () => {
  const current = fixture();
  try {
    const inventory = collectReleaseInventory(current.source);
    const manifest = buildReleaseManifest(inventory);
    assert.equal(manifest.payload.aggregateSha256, inventory.aggregateSha256);
    assert.equal(manifest.payload.pathSetSha256, inventory.pathSetSha256);
    assert.equal(manifest.sourceBinding.completeReleaseTreeBound, true);
    assert.equal(manifest.sourceBinding.sourceTreeAggregateSha256, inventory.aggregateSha256);
    assert.equal(sha256(Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)).length, 64);
  } finally { cleanup(current.directory); }
});

test("packager and verifier CLIs agree on generated-output exclusions and whole-archive digest", () => {
  const current = fixture();
  try {
    const artifactDirectory = path.join(current.source, "artifacts", "pass4826");
    mkdirSync(artifactDirectory, { recursive: true });
    const archive = path.join(artifactDirectory, "fixture-release.zip");
    const packageReceipt = path.join(artifactDirectory, "package-receipt.json");
    const verificationReceipt = path.join(artifactDirectory, "verification.json");
    const packageRun = spawnSync(process.execPath, [
      "scripts/pass4826/package-deterministic-release.mjs",
      "--source-root", current.source,
      "--archive", archive,
      "--receipt", packageReceipt,
      "--verification-receipt", verificationReceipt,
    ], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 });
    assert.equal(packageRun.status, 0, `${packageRun.stdout}\n${packageRun.stderr}`);
    const verifyRun = spawnSync(process.execPath, [
      "scripts/pass4826/verify-deterministic-release.mjs",
      "--source-root", current.source,
      "--archive", archive,
      "--package-receipt", packageReceipt,
      "--output", verificationReceipt,
    ], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 });
    assert.equal(verifyRun.status, 0, `${verifyRun.stdout}\n${verifyRun.stderr}`);
    const packageEvidence = JSON.parse(readFileSync(packageReceipt, "utf8"));
    const verificationEvidence = JSON.parse(readFileSync(verificationReceipt, "utf8"));
    assert.equal(packageEvidence.archive.sha256, verificationEvidence.archive.sha256);
    assert.equal(packageEvidence.sourceUnchanged, true);
    assert.equal(verificationEvidence.completeReleaseTreeBound, true);
    packageEvidence.archive.sha256 = "f".repeat(64);
    writeFileSync(packageReceipt, `${JSON.stringify(packageEvidence, null, 2)}\n`);
    const tamperedRun = spawnSync(process.execPath, [
      "scripts/pass4826/verify-deterministic-release.mjs",
      "--source-root", current.source,
      "--archive", archive,
      "--package-receipt", packageReceipt,
      "--output", verificationReceipt,
    ], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 });
    assert.notEqual(tamperedRun.status, 0);
    assert.match(tamperedRun.stderr, /release_package_receipt_checksum_mismatch/u);
  } finally { cleanup(current.directory); }
});
