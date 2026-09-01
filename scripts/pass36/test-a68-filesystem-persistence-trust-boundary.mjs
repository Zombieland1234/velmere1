import assert from "node:assert/strict";
import { chmod, lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  DURABLE_FILE_BOUNDARY_ID,
  readDurableFileBounded,
  readDurableJsonBounded,
  writeDurableFileAtomic,
  writeDurableJsonAtomic,
} from "../../lib/security/durable-file-boundary.ts";

const REVISION = "VELMERE_PASS36_A68R0_FILESYSTEM_PERSISTENCE_TRUST_BOUNDARY_HARDENING";
const checks = [];
const check = (id, condition, detail = null) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, id);
};
const expectReject = async (id, fn, marker) => {
  try {
    await fn();
    check(id, false, "unexpected_success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(id, message.includes(marker), message.slice(0, 160));
  }
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sandbox = await fsMkdtemp();

async function fsMkdtemp() {
  const base = path.join(os.tmpdir(), "velmere-a68-");
  const { mkdtemp } = await import("node:fs/promises");
  const directory = await mkdtemp(base);
  if (process.platform !== "win32") await chmod(directory, 0o700);
  return directory;
}

try {
  const root = path.join(sandbox, "store");
  const options = { rootDirectory: root, fileName: "record.json", maximumBytes: 4096, label: "a68-test", productionLike: true };
  const first = await writeDurableJsonAtomic(options, { version: 1, value: "alpha" }, true);
  check("boundary_id_exact", first.boundaryId === DURABLE_FILE_BOUNDARY_ID);
  check("write_readback_verified", first.readBackVerified && first.isolatedRootVerified && first.symlinkFree);
  check("atomic_rename_reported", first.atomicRename === true);
  check("write_digest_exact", first.sha256 === sha256(await readFile(first.filePath)));
  const firstRead = await readDurableJsonBounded(options);
  check("json_round_trip", firstRead.version === 1 && firstRead.value === "alpha");

  const second = await writeDurableJsonAtomic(options, { version: 2, value: "beta" });
  const secondRead = await readDurableJsonBounded(options);
  check("regular_file_replacement_atomic", secondRead.version === 2 && second.sha256 !== first.sha256);
  check("target_mode_private", process.platform === "win32" || ((await lstat(second.filePath)).mode & 0o077) === 0);
  check("temporary_files_cleaned", (await readdir(root)).every((name) => !name.startsWith("tmp-")));

  await expectReject("traversal_file_name_rejected", () => writeDurableFileAtomic({ ...options, fileName: "../escape.json" }, "x"), "durable_file_name_invalid");
  await expectReject("absolute_file_name_rejected", () => writeDurableFileAtomic({ ...options, fileName: path.join(path.parse(root).root, "escape.json") }, "x"), "durable_file_name_invalid");
  await expectReject("control_root_rejected", () => writeDurableFileAtomic({ ...options, rootDirectory: `${root}\nother` }, "x"), "durable_file_root_invalid");
  await expectReject("filesystem_root_rejected", () => writeDurableFileAtomic({ ...options, rootDirectory: path.parse(root).root }, "x"), "durable_file_root_filesystem_root_forbidden");
  await expectReject("relative_production_root_rejected", () => writeDurableFileAtomic({ ...options, rootDirectory: "relative-a68" }, "x"), "durable_file_root_absolute_required");
  await expectReject("invalid_label_rejected", () => writeDurableFileAtomic({ ...options, label: "bad label" }, "x"), "durable_file_label_invalid");
  await expectReject("invalid_budget_rejected", () => writeDurableFileAtomic({ ...options, maximumBytes: 0 }, "x"), "durable_file_maximum_bytes_invalid");
  await expectReject("oversized_write_rejected", () => writeDurableFileAtomic({ ...options, fileName: "oversized.bin", maximumBytes: 8 }, Buffer.alloc(9)), "durable_file_too_large");

  const invalidJsonOptions = { ...options, fileName: "invalid.json" };
  await writeDurableFileAtomic(invalidJsonOptions, "{not-json}");
  await expectReject("invalid_json_rejected", () => readDurableJsonBounded(invalidJsonOptions), "durable_file_json_invalid");

  const largeOptions = { ...options, fileName: "large.bin", maximumBytes: 128 };
  await writeDurableFileAtomic(largeOptions, Buffer.alloc(120, 7));
  await expectReject("oversized_read_rejected", () => readDurableFileBounded({ ...largeOptions, maximumBytes: 100 }), "durable_file_too_large");

  const symlinkTarget = path.join(sandbox, "symlink-target");
  await mkdir(symlinkTarget, { mode: 0o700 });
  const symlinkRoot = path.join(sandbox, "symlink-root");
  try {
    await symlink(symlinkTarget, symlinkRoot, process.platform === "win32" ? "junction" : "dir");
    await expectReject("symlink_root_rejected", () => writeDurableFileAtomic({ ...options, rootDirectory: symlinkRoot }, "x"), "durable_file_path_symlink_forbidden");
  } catch (error) {
    check("symlink_root_rejected", process.platform === "win32", error instanceof Error ? error.message : String(error));
  }

  const nestedBase = path.join(sandbox, "nested-base");
  const nestedTarget = path.join(sandbox, "nested-target");
  await mkdir(nestedBase, { mode: 0o700 });
  await mkdir(nestedTarget, { mode: 0o700 });
  const linkedComponent = path.join(nestedBase, "linked");
  try {
    await symlink(nestedTarget, linkedComponent, process.platform === "win32" ? "junction" : "dir");
    await expectReject("symlink_component_rejected", () => writeDurableFileAtomic({ ...options, rootDirectory: path.join(linkedComponent, "child") }, "x"), "durable_file_path_symlink_forbidden");
  } catch (error) {
    check("symlink_component_rejected", process.platform === "win32", error instanceof Error ? error.message : String(error));
  }

  const targetSymlinkRoot = path.join(sandbox, "target-symlink-root");
  await mkdir(targetSymlinkRoot, { mode: 0o700 });
  const externalTarget = path.join(sandbox, "external-target.json");
  await writeFile(externalTarget, "outside");
  try {
    await symlink(externalTarget, path.join(targetSymlinkRoot, "record.json"), "file");
    await expectReject("target_symlink_write_rejected", () => writeDurableFileAtomic({ ...options, rootDirectory: targetSymlinkRoot }, "x"), "durable_file_target_symlink_forbidden");
    await expectReject("target_symlink_read_rejected", () => readDurableFileBounded({ ...options, rootDirectory: targetSymlinkRoot }), "durable_file_target_symlink_forbidden");
    check("external_target_unchanged", (await readFile(externalTarget, "utf8")) === "outside");
  } catch (error) {
    check("target_symlink_write_rejected", process.platform === "win32", error instanceof Error ? error.message : String(error));
    check("target_symlink_read_rejected", process.platform === "win32");
    check("external_target_unchanged", true);
  }

  const directoryTargetRoot = path.join(sandbox, "directory-target-root");
  await mkdir(path.join(directoryTargetRoot, "record.json"), { recursive: true, mode: 0o700 });
  await expectReject("directory_target_write_rejected", () => writeDurableFileAtomic({ ...options, rootDirectory: directoryTargetRoot }, "x"), "durable_file_target_not_regular");
  await expectReject("directory_target_read_rejected", () => readDurableFileBounded({ ...options, rootDirectory: directoryTargetRoot }), "durable_file_target_not_regular");

  if (process.platform !== "win32") {
    const writableRoot = path.join(sandbox, "world-writable");
    await mkdir(writableRoot, { mode: 0o777 });
    await chmod(writableRoot, 0o777);
    await expectReject("world_writable_production_root_rejected", () => writeDurableFileAtomic({ ...options, rootDirectory: writableRoot }, "x"), "durable_file_root_writable_by_group_or_world");
  } else {
    check("world_writable_production_root_rejected", true, "posix_only");
  }

  const sourceFiles = [
    "lib/market-integrity/provider-evidence-ledger.ts",
    "lib/market-integrity/instrument-metadata-cache.ts",
    "lib/market-integrity/continuous-evidence-availability.ts",
    "lib/products/local-product-store.ts",
  ];
  for (const file of sourceFiles) {
    const source = await readFile(file, "utf8");
    check(`integration_${path.basename(file).replaceAll(".", "_")}_uses_boundary`, source.includes("durable-file-boundary"));
    check(`integration_${path.basename(file).replaceAll(".", "_")}_no_direct_atomic_write`, !/\b(?:writeFile|rename)\s*\(/u.test(source));
  }
  const boundarySource = await readFile("lib/security/durable-file-boundary.ts", "utf8");
  check("boundary_uses_no_follow", boundarySource.includes("O_NOFOLLOW") && boundarySource.includes("durable_file_target_symlink_forbidden"));
  check("boundary_revalidates_root_before_rename", boundarySource.includes("await resolveAndVerifyRoot(options);") && boundarySource.includes("await fs.rename(temporary, target)"));
  check("boundary_fsyncs_file_and_directory", boundarySource.includes("await handle.sync()") && boundarySource.includes("syncDirectoryBestEffort"));
  check("boundary_read_is_bounded", boundarySource.includes("durable_file_too_large") && boundarySource.includes("durable_file_changed_during_read"));
} finally {
  await rm(sandbox, { recursive: true, force: true });
}

const failed = checks.filter((row) => !row.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a68.filesystem-persistence-trust-boundary-test.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
