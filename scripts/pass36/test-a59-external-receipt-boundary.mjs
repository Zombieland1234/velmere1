#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  resolveA59ReceiptDirectory,
  writeA59Receipt,
} from "./a59-external-receipt-boundary.mjs";

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a59-receipts-"));
const sourceRoot = path.join(sandbox, "source");
const externalRoot = path.join(sandbox, "external");
fs.mkdirSync(sourceRoot, { mode: 0o700 });
fs.mkdirSync(externalRoot, { mode: 0o700 });
const assertions = [];

function check(name, action) {
  action();
  assertions.push(name);
}

function rejects(name, expected, action) {
  check(name, () => assert.throws(action, expected));
}

try {
  check("default remains source artifacts compatible", () => {
    assert.deepEqual(resolveA59ReceiptDirectory(sourceRoot, {}), {
      directory: path.join(sourceRoot, "artifacts/pass36/a59"),
      external: false,
    });
    const output = writeA59Receipt({
      sourceRoot,
      fileName: "PASS36_A59_DEFAULT.json",
      content: "{}\n",
      env: {},
    });
    assert.equal(
      output,
      path.join(sourceRoot, "artifacts/pass36/a59/PASS36_A59_DEFAULT.json"),
    );
    assert.equal(fs.readFileSync(output, "utf8"), "{}\n");
    fs.rmSync(path.join(sourceRoot, "artifacts"), {
      recursive: true,
      force: true,
    });
  });

  check("valid external root writes only outside source", () => {
    const content = '{"status":"PASS"}\n';
    const output = writeA59Receipt({
      sourceRoot,
      fileName: "PASS36_A59_TEST.json",
      content,
      env: { VELMERE_EXTERNAL_RECEIPT_ROOT: externalRoot },
    });
    assert.equal(output, path.join(externalRoot, "PASS36_A59_TEST.json"));
    assert.equal(fs.readFileSync(output, "utf8"), content);
    assert.equal(fs.existsSync(path.join(sourceRoot, "artifacts")), false);
  });

  rejects(
    "relative external root rejected",
    /a59_external_receipt_root_must_be_absolute/u,
    () => resolveA59ReceiptDirectory(sourceRoot, {
      VELMERE_EXTERNAL_RECEIPT_ROOT: "../receipts",
    }),
  );
  rejects(
    "missing external root rejected",
    /a59_external_receipt_root_must_exist/u,
    () => resolveA59ReceiptDirectory(sourceRoot, {
      VELMERE_EXTERNAL_RECEIPT_ROOT: path.join(sandbox, "missing"),
    }),
  );
  rejects(
    "source root rejected",
    /a59_external_receipt_root_must_be_outside_source/u,
    () => resolveA59ReceiptDirectory(sourceRoot, {
      VELMERE_EXTERNAL_RECEIPT_ROOT: sourceRoot,
    }),
  );
  rejects(
    "filesystem root rejected",
    /a59_external_receipt_root_filesystem_root_forbidden/u,
    () => resolveA59ReceiptDirectory(sourceRoot, {
      VELMERE_EXTERNAL_RECEIPT_ROOT: path.parse(sourceRoot).root,
    }),
  );
  const nestedSource = path.join(sourceRoot, "nested");
  fs.mkdirSync(nestedSource);
  rejects(
    "source descendant rejected",
    /a59_external_receipt_root_must_be_outside_source/u,
    () => resolveA59ReceiptDirectory(sourceRoot, {
      VELMERE_EXTERNAL_RECEIPT_ROOT: nestedSource,
    }),
  );

  const directSymlink = path.join(sandbox, "external-link");
  fs.symlinkSync(externalRoot, directSymlink, "dir");
  rejects(
    "symlink root rejected",
    /a59_external_receipt_root_must_be_real_directory/u,
    () => resolveA59ReceiptDirectory(sourceRoot, {
      VELMERE_EXTERNAL_RECEIPT_ROOT: directSymlink,
    }),
  );

  const linkedParent = path.join(sandbox, "linked-parent");
  const linkedChild = path.join(externalRoot, "child");
  fs.mkdirSync(linkedChild, { mode: 0o700 });
  fs.symlinkSync(externalRoot, linkedParent, "dir");
  rejects(
    "symlink path component rejected",
    /a59_external_receipt_root_symlink_component_forbidden/u,
    () => resolveA59ReceiptDirectory(sourceRoot, {
      VELMERE_EXTERNAL_RECEIPT_ROOT: path.join(linkedParent, "child"),
    }),
  );

  const broadRoot = path.join(sandbox, "broad");
  fs.mkdirSync(broadRoot, { mode: 0o777 });
  fs.chmodSync(broadRoot, 0o777);
  rejects(
    "group or world writable root rejected",
    /a59_external_receipt_root_write_permissions_too_broad/u,
    () => resolveA59ReceiptDirectory(sourceRoot, {
      VELMERE_EXTERNAL_RECEIPT_ROOT: broadRoot,
    }),
  );

  const targetLink = path.join(externalRoot, "PASS36_A59_LINK.json");
  fs.symlinkSync(path.join(sandbox, "outside.json"), targetLink, "file");
  rejects(
    "symlink receipt target rejected",
    /a59_external_receipt_target_must_be_regular_file/u,
    () => writeA59Receipt({
      sourceRoot,
      fileName: "PASS36_A59_LINK.json",
      content: "{}\n",
      env: { VELMERE_EXTERNAL_RECEIPT_ROOT: externalRoot },
    }),
  );
  rejects(
    "receipt traversal name rejected",
    /a59_receipt_file_name_invalid/u,
    () => writeA59Receipt({
      sourceRoot,
      fileName: "../escape.json",
      content: "{}\n",
      env: { VELMERE_EXTERNAL_RECEIPT_ROOT: externalRoot },
    }),
  );

  console.log(JSON.stringify({
    status: "PASS_A59_EXTERNAL_RECEIPT_BOUNDARY",
    assertions: assertions.length,
  }, null, 2));
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
