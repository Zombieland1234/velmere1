import assert from "node:assert/strict";
import fsModule from "node:fs";
import {
  chmod,
  link,
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  readDurableFileBounded,
  writeDurableFileAtomic,
} from "../../lib/security/durable-file-boundary.ts";

const checks = [];
function check(id, condition, detail = null) {
  const passed = Boolean(condition);
  checks.push({ id, passed, detail });
  assert.ok(passed, id);
}
async function expectReject(id, run, marker) {
  try {
    await run();
    check(id, false, "unexpected_success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(id, message.includes(marker), message);
  }
}

const sandbox = await mkdtemp(path.join(os.tmpdir(), "velmere-a91-files-"));
if (process.platform !== "win32") await chmod(sandbox, 0o700);
const options = {
  rootDirectory: path.join(sandbox, "store"),
  fileName: "record.bin",
  maximumBytes: 1024,
  label: "a91-file-test",
  productionLike: true,
};

try {
  const receipt = await writeDurableFileAtomic(options, Buffer.from("alpha"));
  check("receipt_hardlink_free", receipt.hardlinkFree === true);
  check("receipt_descriptor_identity_bound", receipt.descriptorIdentityBound === true);
  check("round_trip", (await readDurableFileBounded(options)).toString("utf8") === "alpha");

  const hardlinkPath = path.join(options.rootDirectory, "second-link.bin");
  if (process.platform !== "win32") {
    await link(receipt.filePath, hardlinkPath);
    await expectReject(
      "hardlink_read_rejected",
      () => readDurableFileBounded(options),
      "durable_file_hardlink_forbidden",
    );
    await expectReject(
      "hardlink_write_target_rejected",
      () => writeDurableFileAtomic(options, Buffer.from("beta")),
      "durable_file_hardlink_forbidden",
    );
    await rm(hardlinkPath);
  } else {
    check("hardlink_read_rejected", true, "posix_behavior_not_executed");
    check("hardlink_write_target_rejected", true, "posix_behavior_not_executed");
  }

  const swapRoot = path.join(sandbox, "swap-store");
  await mkdir(swapRoot, { mode: 0o700 });
  const swapOptions = { ...options, rootDirectory: swapRoot, fileName: "swap.bin" };
  await writeDurableFileAtomic(swapOptions, Buffer.from("original"));
  const swapTarget = path.join(swapRoot, "swap.bin");
  const replacement = path.join(swapRoot, "replacement.bin");
  await writeFile(replacement, "replacement", { mode: 0o600 });

  const originalOpen = fsModule.promises.open;
  let injected = false;
  fsModule.promises.open = async function patchedOpen(target, flags, ...args) {
    const handle = await originalOpen.call(fsModule.promises, target, flags, ...args);
    if (!injected && path.resolve(String(target)) === path.resolve(swapTarget)) {
      const originalReadFile = handle.readFile.bind(handle);
      handle.readFile = async (...readArgs) => {
        injected = true;
        await rename(replacement, swapTarget);
        return originalReadFile(...readArgs);
      };
    }
    return handle;
  };
  try {
    await expectReject(
      "inode_path_swap_rejected",
      () => readDurableFileBounded(swapOptions),
      "durable_file_path_changed_during_read",
    );
    check("inode_swap_was_injected", injected);
    check("replacement_remains_at_path", (await readFile(swapTarget, "utf8")) === "replacement");
  } finally {
    fsModule.promises.open = originalOpen;
  }
} finally {
  await rm(sandbox, { recursive: true, force: true });
}

const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a91.durable-file-boundary-test.v1",
  revisionId: "VELMERE_PASS36_A91R0_FILE_UPLOAD_DOWNLOAD_PARSER_AND_STORAGE_HARDENING",
  status: failed.length ? "FAIL" : "PASS_LOCAL_FILESYSTEM_BEHAVIOR",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  platform: process.platform,
  stagingProven: false,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
