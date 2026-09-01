import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WINDOWS_PRIVILEGE_ERRORS = new Set(["EACCES", "EPERM", "UNKNOWN"]);

function removeLinkOnly(linkPath) {
  try {
    fs.unlinkSync(linkPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

/**
 * Creates a filesystem object that lstat identifies as a symbolic link/reparse
 * point. Windows hosts without Developer Mode commonly reject file symlinks;
 * an unprivileged directory junction preserves the negative security boundary.
 */
export function createPortableRejectedSymlink(linkPath, fileTarget, options = {}) {
  try {
    fs.symlinkSync(fileTarget, linkPath);
    return {
      kind: "file-symlink",
      cleanup() { removeLinkOnly(linkPath); },
    };
  } catch (error) {
    if (process.platform !== "win32" || !WINDOWS_PRIVILEGE_ERRORS.has(error?.code)) throw error;
  }

  const junctionTargetRoot = options.junctionTargetRoot === undefined
    ? os.tmpdir()
    : path.resolve(options.junctionTargetRoot);
  const junctionTarget = fs.mkdtempSync(path.join(junctionTargetRoot, "velmere-rejected-junction-target-"));
  try {
    fs.symlinkSync(junctionTarget, linkPath, "junction");
  } catch (error) {
    fs.rmSync(junctionTarget, { recursive: true, force: true });
    throw error;
  }
  return {
    kind: "directory-junction",
    cleanup() {
      removeLinkOnly(linkPath);
      fs.rmSync(junctionTarget, { recursive: true, force: true });
    },
  };
}
