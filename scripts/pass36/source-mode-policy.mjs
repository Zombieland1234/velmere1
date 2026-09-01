import fs from "node:fs";
import path from "node:path";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

export const REGULAR_FILE_MODE = 0o100644;
export const EXECUTABLE_FILE_MODE = 0o100755;
const RAW_COMPARE = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return isRecord(value)
    && JSON.stringify(Object.keys(value).sort(RAW_COMPARE))
      === JSON.stringify([...expected].sort(RAW_COMPARE));
}

function hasNoControlCharacters(value) {
  return [...value].every((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint >= 0x20 && codePoint !== 0x7f;
  });
}

export function validateSourceRelativePath(value) {
  invariant(typeof value === "string" && value.length > 0, "source_mode_path_empty");
  invariant(!value.includes("\\") && !value.includes("\0"), `source_mode_path_separator:${value}`);
  invariant(!value.startsWith("/") && !/^[a-z]:/iu.test(value), `source_mode_path_absolute:${value}`);
  invariant(hasNoControlCharacters(value), `source_mode_path_control:${JSON.stringify(value)}`);
  invariant(value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== ".."), `source_mode_path_traversal:${value}`);
  return value;
}

export function loadSourceModePolicy(rootPath, policyRelativePath) {
  const root = path.resolve(rootPath);
  const policyPath = path.join(root, validateSourceRelativePath(policyRelativePath));
  const policyBytes = readDescriptorBoundRegularFile(policyPath, { maxBytes: 1024 * 1024, errorPrefix: "source_mode_policy" }).bytes;
  const policy = parseStrictJsonCli(policyBytes.toString("utf8"), { maxBytes: 1024 * 1024, maxDepth: 64, maxNodes: 100000, requireObject: true });
  const keys = [
    "schemaVersion",
    "revisionId",
    "parentRevisionId",
    "regularFileMode",
    "executableFileMode",
    "modeAuthority",
    "windowsFilesystemModeIsAuthority",
    "posixFilesystemModeIsAuthority",
    "processExecPathRequired",
    "shellFalseRequired",
    "executablePaths",
    "truthBoundary",
  ];
  invariant(exactKeys(policy, keys), "source_mode_policy_fields");
  invariant(policy.schemaVersion === "velmere.pass36.cross-platform-source-mode-policy.v1", "source_mode_policy_schema");
  invariant(policy.regularFileMode === REGULAR_FILE_MODE, "source_mode_policy_regular_mode");
  invariant(policy.executableFileMode === EXECUTABLE_FILE_MODE, "source_mode_policy_executable_mode");
  invariant(policy.modeAuthority === "EXACT_PATH_ALLOWLIST", "source_mode_policy_authority");
  invariant(policy.windowsFilesystemModeIsAuthority === false, "source_mode_policy_windows_authority");
  invariant(policy.posixFilesystemModeIsAuthority === true, "source_mode_policy_posix_authority");
  invariant(policy.processExecPathRequired === true && policy.shellFalseRequired === true, "source_mode_policy_process_contract");
  invariant(Array.isArray(policy.executablePaths) && policy.executablePaths.length > 0, "source_mode_policy_paths");
  const paths = policy.executablePaths.map(validateSourceRelativePath);
  invariant(JSON.stringify(paths) === JSON.stringify([...paths].sort(RAW_COMPARE)), "source_mode_policy_path_order");
  invariant(new Set(paths).size === paths.length, "source_mode_policy_path_duplicate");
  const executablePaths = new Set(paths);
  for (const relativePath of paths) {
    const absolutePath = path.join(root, relativePath);
    const fileMetadata = fs.lstatSync(absolutePath);
    invariant(fileMetadata.isFile() && !fileMetadata.isSymbolicLink(), `source_mode_policy_executable_not_regular:${relativePath}`);
  }
  return { ...policy, executablePaths };
}

export function canonicalSourceMode(relativePath, policy) {
  validateSourceRelativePath(relativePath);
  return policy.executablePaths.has(relativePath)
    ? EXECUTABLE_FILE_MODE
    : REGULAR_FILE_MODE;
}

export function validateObservedSourceMode(relativePath, metadata, policy, platform = process.platform) {
  const expectedMode = canonicalSourceMode(relativePath, policy);
  const observedPermissions = metadata.mode & 0o7777;
  const expectedPermissions = expectedMode & 0o7777;
  if (platform === "win32") {
    return {
      ok: true,
      platform,
      enforcement: "CANONICAL_PATH_POLICY_WINDOWS_FILESYSTEM_MODE_NON_AUTHORITY",
      expectedMode,
      observedPermissions,
    };
  }
  invariant(platform === "linux" || platform === "darwin" || platform === "freebsd" || platform === "openbsd" || platform === "sunos" || platform === "aix", `source_mode_platform_unsupported:${platform}`);
  invariant(observedPermissions === expectedPermissions, `source_mode_posix_mismatch:${relativePath}:${observedPermissions.toString(8)}:${expectedPermissions.toString(8)}`);
  return {
    ok: true,
    platform,
    enforcement: "EXACT_POSIX_PERMISSION_PARITY",
    expectedMode,
    observedPermissions,
  };
}
