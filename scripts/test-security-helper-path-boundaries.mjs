import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import {
  publishArchiveAtomically,
  resolveApprovedZipTarget,
} from "./create-production-clean-zip.mjs";
import { resolveManagedRuntimeDestination } from "./pass24/import-exact-runtime.mjs";
import { createPortableRejectedSymlink } from "./pass36/portable-symlink-negative-fixture.mjs";

const temporaryRoots = [];

function temporaryRoot(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

after(() => {
  for (const root of temporaryRoots) fs.rmSync(root, { recursive: true, force: true });
});

test("runtime replacement destinations are confined to the managed exact-runtime directory", () => {
  const projectRoot = temporaryRoot("velmere-runtime-boundary-");
  const managedRoot = path.join(projectRoot, ".velmere", "exact-runtime");
  assert.equal(
    resolveManagedRuntimeDestination({ root: projectRoot }),
    path.join(managedRoot, "node-v24.18.0-linux-x64"),
  );
  assert.equal(
    resolveManagedRuntimeDestination({ root: projectRoot, requestedDestination: ".velmere/exact-runtime/custom" }),
    path.join(managedRoot, "custom"),
  );
  assert.throws(
    () => resolveManagedRuntimeDestination({ root: projectRoot, requestedDestination: projectRoot }),
    /runtime_destination_outside_managed_root/u,
  );
  assert.throws(
    () => resolveManagedRuntimeDestination({ root: projectRoot, requestedDestination: managedRoot }),
    /runtime_destination_outside_managed_root/u,
  );
  assert.throws(
    () => resolveManagedRuntimeDestination({ root: projectRoot, requestedDestination: "../outside-runtime" }),
    /runtime_destination_outside_managed_root/u,
  );
});

test("runtime replacement rejects a managed directory reparse point resolving outside", (context) => {
  const projectRoot = temporaryRoot("velmere-runtime-symlink-");
  const outside = temporaryRoot("velmere-runtime-outside-");
  fs.mkdirSync(path.join(projectRoot, ".velmere"), { recursive: true });
  const managedLink = path.join(projectRoot, ".velmere", "exact-runtime");
  const link = createPortableRejectedSymlink(managedLink, outside, { junctionTargetRoot: outside });
  context.after(() => link.cleanup());
  context.diagnostic(`managed runtime reparse fixture: ${link.kind}`);

  const managedReal = fs.realpathSync(managedLink);
  const outsideReal = fs.realpathSync(outside);
  const outsideRelative = path.relative(outsideReal, managedReal);
  assert.equal(fs.lstatSync(managedLink).isSymbolicLink(), true);
  assert.ok(link.kind === "file-symlink" || link.kind === "directory-junction");
  assert.ok(outsideRelative === "" || (!outsideRelative.startsWith("..") && !path.isAbsolute(outsideRelative)));

  const sentinel = path.join(managedReal, "outside-sentinel.txt");
  fs.writeFileSync(sentinel, "outside-must-remain-unchanged", "utf8");
  assert.throws(
    () => resolveManagedRuntimeDestination({ root: projectRoot }),
    /runtime_destination_symlink_component_rejected/u,
  );
  assert.equal(fs.readFileSync(sentinel, "utf8"), "outside-must-remain-unchanged");
  assert.equal(fs.existsSync(path.join(managedReal, "node-v24.18.0-linux-x64")), false);
});

test("production ZIP targets are confined to one approved output directory", () => {
  const projectRoot = temporaryRoot("velmere-zip-boundary-");
  const outputRoot = path.join(projectRoot, ".velmere", "exports");
  assert.deepEqual(resolveApprovedZipTarget({ projectRoot }), {
    approvedOutputRoot: outputRoot,
    target: path.join(outputRoot, "velmere-production-clean.zip"),
  });
  assert.equal(
    resolveApprovedZipTarget({ projectRoot, requestedTarget: "custom.zip" }).target,
    path.join(outputRoot, "custom.zip"),
  );
  assert.throws(
    () => resolveApprovedZipTarget({ projectRoot, requestedTarget: "../escaped.zip" }),
    /zip_target_outside_approved_output_directory/u,
  );
  assert.throws(
    () => resolveApprovedZipTarget({ projectRoot, requestedTarget: path.join(projectRoot, "outside.zip") }),
    /zip_target_outside_approved_output_directory/u,
  );
  assert.throws(
    () => resolveApprovedZipTarget({ projectRoot, requestedTarget: "nested/archive.zip" }),
    /zip_target_outside_approved_output_directory/u,
  );
  assert.throws(
    () => resolveApprovedZipTarget({ projectRoot, requestedTarget: "archive.txt" }),
    /zip_target_extension_invalid/u,
  );
});

test("ZIP publication is atomic and never deletes an existing target implicitly", () => {
  const projectRoot = temporaryRoot("velmere-zip-publish-");
  const approvedOutputRoot = path.join(projectRoot, ".velmere", "exports");
  const buildRoot = path.join(approvedOutputRoot, ".zip-build-test");
  const temporaryArchive = path.join(buildRoot, "archive.zip");
  const target = path.join(approvedOutputRoot, "release.zip");
  fs.mkdirSync(buildRoot, { recursive: true });
  fs.writeFileSync(temporaryArchive, "new-archive", { mode: 0o600 });
  fs.writeFileSync(target, "existing-archive", { mode: 0o600 });

  assert.throws(
    () => publishArchiveAtomically({ temporaryArchive, target, approvedOutputRoot }),
    /zip_target_exists_use_overwrite/u,
  );
  assert.equal(fs.readFileSync(target, "utf8"), "existing-archive");
  assert.equal(fs.readFileSync(temporaryArchive, "utf8"), "new-archive");

  publishArchiveAtomically({ temporaryArchive, target, approvedOutputRoot, overwrite: true });
  assert.equal(fs.readFileSync(target, "utf8"), "new-archive");
  assert.equal(fs.existsSync(temporaryArchive), false);
});

test("ZIP publication rejects an outside target without modifying it", () => {
  const projectRoot = temporaryRoot("velmere-zip-outside-publish-");
  const approvedOutputRoot = path.join(projectRoot, ".velmere", "exports");
  const buildRoot = path.join(approvedOutputRoot, ".zip-build-test");
  const temporaryArchive = path.join(buildRoot, "archive.zip");
  const outsideTarget = path.join(projectRoot, "outside.zip");
  fs.mkdirSync(buildRoot, { recursive: true });
  fs.writeFileSync(temporaryArchive, "new-archive", { mode: 0o600 });
  fs.writeFileSync(outsideTarget, "outside-sentinel", { mode: 0o600 });

  assert.throws(
    () => publishArchiveAtomically({ temporaryArchive, target: outsideTarget, approvedOutputRoot, overwrite: true }),
    /zip_publish_target_outside_approved_output_directory/u,
  );
  assert.equal(fs.readFileSync(outsideTarget, "utf8"), "outside-sentinel");
  assert.equal(fs.readFileSync(temporaryArchive, "utf8"), "new-archive");
});
