import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const identity = (metadata) => [metadata.dev, metadata.ino, metadata.mode, metadata.nlink, metadata.size, metadata.mtimeMs, metadata.ctimeMs].join(":");

export function readDescriptorBoundRegularFile(filePath, { maxBytes = Number.MAX_SAFE_INTEGER, errorPrefix = "descriptor_file" } = {}) {
  const absolute = path.resolve(filePath);
  const pathBefore = fs.lstatSync(absolute);
  invariant(pathBefore.isFile() && !pathBefore.isSymbolicLink(), `${errorPrefix}_not_regular`);
  invariant(pathBefore.size <= maxBytes, `${errorPrefix}_too_large`);
  const realBefore = fs.realpathSync(absolute);
  const noFollow = Number.isInteger(fs.constants.O_NOFOLLOW) ? fs.constants.O_NOFOLLOW : 0;
  let descriptor;
  try {
    descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
    const descriptorBefore = fs.fstatSync(descriptor);
    invariant(descriptorBefore.isFile() && identity(pathBefore) === identity(descriptorBefore), `${errorPrefix}_path_descriptor_identity_mismatch`);
    const bytes = fs.readFileSync(descriptor);
    const descriptorAfter = fs.fstatSync(descriptor);
    const pathAfter = fs.lstatSync(absolute);
    const realAfter = fs.realpathSync(absolute);
    invariant(
      identity(descriptorBefore) === identity(descriptorAfter)
        && identity(pathBefore) === identity(pathAfter)
        && identity(descriptorAfter) === identity(pathAfter)
        && realBefore === realAfter
        && bytes.length === descriptorAfter.size,
      `${errorPrefix}_changed_during_descriptor_read`,
    );
    return {
      absolutePath: absolute,
      realPath: realAfter,
      bytes,
      binding: {
        fileName: path.basename(absolute),
        byteLength: bytes.length,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      },
      observedMode: descriptorAfter.mode,
      observedNlink: descriptorAfter.nlink,
      descriptorBound: true,
      noFollowFlagApplied: noFollow !== 0,
    };
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}
