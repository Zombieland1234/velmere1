import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const EXTERNAL_RECEIPT_ENV = "VELMERE_EXTERNAL_RECEIPT_ROOT";
const RECEIPT_NAME = /^[A-Z0-9][A-Z0-9_.-]*\.json$/u;

function isInside(sourceRoot, candidate) {
  const relative = path.relative(sourceRoot, candidate);
  return relative === "" || (
    relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

export function resolveA59ReceiptDirectory(
  sourceRoot,
  env = process.env,
) {
  const resolvedSourceRoot = fs.realpathSync(path.resolve(sourceRoot));
  const configured = env[EXTERNAL_RECEIPT_ENV]?.trim();
  if (!configured) {
    return {
      directory: path.join(resolvedSourceRoot, "artifacts/pass36/a59"),
      external: false,
    };
  }
  if (!path.isAbsolute(configured)) {
    throw new Error("a59_external_receipt_root_must_be_absolute");
  }

  const requested = path.resolve(configured);
  let metadata;
  try {
    metadata = fs.lstatSync(requested);
  } catch {
    throw new Error("a59_external_receipt_root_must_exist");
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("a59_external_receipt_root_must_be_real_directory");
  }

  const directory = fs.realpathSync(requested);
  if (directory !== requested) {
    throw new Error("a59_external_receipt_root_symlink_component_forbidden");
  }
  if (directory === path.parse(directory).root) {
    throw new Error("a59_external_receipt_root_filesystem_root_forbidden");
  }
  if (isInside(resolvedSourceRoot, directory)) {
    throw new Error("a59_external_receipt_root_must_be_outside_source");
  }
  if ((metadata.mode & 0o022) !== 0) {
    throw new Error("a59_external_receipt_root_write_permissions_too_broad");
  }

  return { directory, external: true };
}

export function writeA59Receipt({
  sourceRoot,
  fileName,
  content,
  env = process.env,
}) {
  if (!RECEIPT_NAME.test(fileName) || fileName.includes("..")) {
    throw new Error("a59_receipt_file_name_invalid");
  }
  const destination = resolveA59ReceiptDirectory(sourceRoot, env);
  if (!destination.external) {
    fs.mkdirSync(destination.directory, { recursive: true });
    const output = path.join(destination.directory, fileName);
    fs.writeFileSync(output, content, "utf8");
    return output;
  }

  // Re-resolve immediately before the write. The external directory is also
  // required to be non-group/world-writable, preventing an untrusted peer
  // from swapping a validated path component during this process.
  const verified = resolveA59ReceiptDirectory(sourceRoot, env);
  const output = path.join(verified.directory, fileName);
  try {
    const target = fs.lstatSync(output);
    if (target.isSymbolicLink() || !target.isFile()) {
      throw new Error("a59_external_receipt_target_must_be_regular_file");
    }
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && error.code === "ENOENT"
    ) {
      // A missing target is the expected first-write state.
    } else if (
      error instanceof Error
      && error.message === "a59_external_receipt_target_must_be_regular_file"
    ) {
      throw error;
    } else {
      throw new Error(
        "a59_external_receipt_target_inspection_failed",
        { cause: error },
      );
    }
  }

  const temporary = path.join(
    verified.directory,
    `.${fileName}.${process.pid}.${crypto.randomBytes(12).toString("hex")}.tmp`,
  );
  let descriptor;
  try {
    descriptor = fs.openSync(
      temporary,
      fs.constants.O_CREAT
        | fs.constants.O_EXCL
        | fs.constants.O_WRONLY
        | (fs.constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    fs.writeFileSync(descriptor, content, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, output);
  } catch (error) {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try {
      fs.unlinkSync(temporary);
    } catch {
      // Preserve the original boundary/write error.
    }
    throw error;
  }
  return output;
}
