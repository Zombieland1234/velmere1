import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import path from "node:path";

export const A94R1_REVISION =
  "VELMERE_PASS36_A94R1_ACTION_REQUIRED_LOCAL_HARDENING_CHECKPOINT";
export const A94R1_PARENT =
  "VELMERE_PASS36_A89R0_ACCOUNT_AUTH_TENANT_PRIVACY_RED_TEAM_AND_TRUST_CENTER_INTAKE";
export const A94R1_PARENT_MANIFEST_DIGEST =
  "8900eab75426203d41a6012c265a1824fe2d45b68ed8e3dd240e007def2f30f8";
export const A94R1_MANIFEST_PATH =
  "config/pass36/a94r1-current-root-descendant-manifest.json";
export const A94R1_PACKAGE_MANIFEST_PATH =
  "_velmere/PASS36_A94R1_SOURCE_ONLY_MANIFEST.json";
export const A94R1_IMMUTABLE_LOG_FIXTURE_PATH =
  "fixtures/pass35/a42/windows-global-json-crash.log";

const EXCLUDED_PREFIXES = [
  ".git/",
  ".velmere/",
  ".next/",
  ".next-",
  ".turbo/",
  "_velmere/",
  "artifacts/",
  "coverage/",
  "node_modules/",
];

const EXCLUDED_EXACT = new Set([
  A94R1_MANIFEST_PATH,
]);
const IMMUTABLE_LOG_FIXTURES = new Set([
  A94R1_IMMUTABLE_LOG_FIXTURE_PATH,
]);
const FORBIDDEN_PACKAGED_TOP_LEVEL = new Set([
  ".cache",
  ".git",
  ".next",
  ".turbo",
  ".velmere",
  "artifacts",
  "cache",
  "coverage",
  "dist",
  "out",
]);
const REQUIRED_PACKAGED_PATHS = [
  A94R1_MANIFEST_PATH,
  A94R1_PACKAGE_MANIFEST_PATH,
  A94R1_IMMUTABLE_LOG_FIXTURE_PATH,
];

function portablePath(value) {
  return value.split(path.sep).join("/");
}

export function compareA94R1Paths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function isA94R1SourceExcluded(relativePath) {
  const normalized = portablePath(relativePath);
  if (IMMUTABLE_LOG_FIXTURES.has(normalized)) return false;
  if (EXCLUDED_EXACT.has(normalized)) return true;
  if (EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }
  const base = path.posix.basename(normalized);
  if (base === ".env" || base.startsWith(".env.")) return true;
  if (base.endsWith(".log")) return true;
  if (/\.(?:db|sqlite|sqlite3)$/iu.test(base)) return true;
  return false;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(record[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function collectA94R1SourceRows(root) {
  const rows = [];
  const rejected = [];

  function walk(directory, relativeDirectory = "") {
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) =>
        compareA94R1Paths(left.name, right.name),
      );
    for (const entry of entries) {
      const relativePath = portablePath(
        relativeDirectory
          ? `${relativeDirectory}/${entry.name}`
          : entry.name,
      );
      if (isA94R1SourceExcluded(relativePath)) continue;
      const absolutePath = path.join(directory, entry.name);
      const metadata = lstatSync(absolutePath);
      if (metadata.isSymbolicLink()) {
        rejected.push({ path: relativePath, reason: "symlink_forbidden" });
        continue;
      }
      if (metadata.isDirectory()) {
        walk(absolutePath, relativePath);
        continue;
      }
      if (!metadata.isFile()) {
        rejected.push({ path: relativePath, reason: "special_file_forbidden" });
        continue;
      }
      const bytes = readFileSync(absolutePath);
      rows.push({
        path: relativePath,
        byteLength: bytes.length,
        sha256: sha256(bytes),
        mode: metadata.mode & 0o111 ? "100755" : "100644",
      });
    }
  }

  walk(root);
  rows.sort((left, right) =>
    compareA94R1Paths(left.path, right.path),
  );
  return { rows, rejected };
}

function packagedTreeForbiddenReason(relativePath) {
  const normalized = portablePath(relativePath);
  if (IMMUTABLE_LOG_FIXTURES.has(normalized)) return null;
  const [topLevel] = normalized.split("/");
  if (
    FORBIDDEN_PACKAGED_TOP_LEVEL.has(topLevel) ||
    topLevel.startsWith(".next-")
  ) {
    return `forbidden_output:${topLevel}`;
  }
  if (
    normalized.startsWith("_velmere/") &&
    normalized !== A94R1_PACKAGE_MANIFEST_PATH
  ) {
    return "unexpected_release_metadata";
  }
  const base = path.posix.basename(normalized);
  if (base === ".env" || base.startsWith(".env.")) {
    return "environment_file_forbidden";
  }
  if (base === ".eslintcache" || base.endsWith(".tsbuildinfo")) {
    return "cache_file_forbidden";
  }
  if (base.endsWith(".log")) return "mutable_log_forbidden";
  if (/\.(?:db|sqlite|sqlite3)$/iu.test(base)) {
    return "database_file_forbidden";
  }
  return null;
}

export function inspectA94R1RuntimeNodeModules(root) {
  const sourceRoot = path.resolve(root);
  const absolutePath = path.join(sourceRoot, "node_modules");
  try {
    const metadata = lstatSync(absolutePath);
    if (metadata.isSymbolicLink()) {
      return {
        passed: false,
        path: "node_modules",
        reason: "node_modules_symlink_forbidden",
      };
    }
    if (!metadata.isDirectory()) {
      return {
        passed: false,
        path: "node_modules",
        reason: "node_modules_must_be_directory",
      };
    }
    const realSourceRoot = realpathSync(sourceRoot);
    const realNodeModules = realpathSync(absolutePath);
    const relative = path.relative(realSourceRoot, realNodeModules);
    if (
      relative === "" ||
      relative.startsWith(`..${path.sep}`) ||
      relative === ".." ||
      path.isAbsolute(relative)
    ) {
      return {
        passed: false,
        path: "node_modules",
        reason: "node_modules_realpath_outside_source",
      };
    }
    const typeScriptCli = path.join(
      absolutePath,
      "typescript",
      "bin",
      "tsc",
    );
    const cliMetadata = lstatSync(typeScriptCli);
    if (cliMetadata.isSymbolicLink() || !cliMetadata.isFile()) {
      return {
        passed: false,
        path: "node_modules/typescript/bin/tsc",
        reason: "typescript_cli_must_be_regular_file",
      };
    }
    const realTypeScriptCli = realpathSync(typeScriptCli);
    const cliRelative = path.relative(
      realNodeModules,
      realTypeScriptCli,
    );
    if (
      cliRelative === "" ||
      cliRelative.startsWith(`..${path.sep}`) ||
      cliRelative === ".." ||
      path.isAbsolute(cliRelative)
    ) {
      return {
        passed: false,
        path: "node_modules/typescript/bin/tsc",
        reason: "typescript_cli_realpath_outside_node_modules",
      };
    }
    return {
      passed: true,
      path: "node_modules",
      reason: null,
      realPath: portablePath(realNodeModules),
      typeScriptCli: {
        path: "node_modules/typescript/bin/tsc",
        realPath: portablePath(realTypeScriptCli),
      },
    };
  } catch (error) {
    return {
      passed: false,
      path: "node_modules",
      reason:
        error && typeof error === "object" && "code" in error
          ? `node_modules_unavailable:${String(error.code)}`
          : "node_modules_unavailable",
    };
  }
}

export function collectA94R1PackagedTreeRows(root) {
  const rows = [];
  const rejected = [];
  const forbidden = [];

  function walk(directory, relativeDirectory = "") {
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) =>
        compareA94R1Paths(left.name, right.name),
      );
    for (const entry of entries) {
      const relativePath = portablePath(
        relativeDirectory
          ? `${relativeDirectory}/${entry.name}`
          : entry.name,
      );
      const absolutePath = path.join(directory, entry.name);
      const metadata = lstatSync(absolutePath);
      if (relativePath === "node_modules") {
        if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
          rejected.push({
            path: relativePath,
            reason: metadata.isSymbolicLink()
              ? "node_modules_symlink_forbidden"
              : "node_modules_must_be_directory",
          });
        }
        continue;
      }
      const forbiddenReason =
        packagedTreeForbiddenReason(relativePath);
      if (forbiddenReason) {
        forbidden.push({
          path: relativePath,
          reason: forbiddenReason,
          type: metadata.isDirectory()
            ? "directory"
            : metadata.isFile()
              ? "file"
              : "other",
        });
        continue;
      }
      if (metadata.isSymbolicLink()) {
        rejected.push({
          path: relativePath,
          reason: "symlink_forbidden",
        });
        continue;
      }
      if (metadata.isDirectory()) {
        walk(absolutePath, relativePath);
        continue;
      }
      if (!metadata.isFile()) {
        rejected.push({
          path: relativePath,
          reason: "special_file_forbidden",
        });
        continue;
      }
      const bytes = readFileSync(absolutePath);
      rows.push({
        path: relativePath,
        byteLength: bytes.length,
        sha256: sha256(bytes),
        mode: metadata.mode & 0o111 ? "100755" : "100644",
      });
    }
  }

  walk(path.resolve(root));
  rows.sort((left, right) =>
    compareA94R1Paths(left.path, right.path),
  );
  const observedPaths = new Set(rows.map((row) => row.path));
  const requiredMissing = REQUIRED_PACKAGED_PATHS.filter(
    (requiredPath) => !observedPaths.has(requiredPath),
  );
  return {
    rows,
    payload: buildA94R1Payload(rows),
    rejected,
    forbidden,
    requiredMissing,
  };
}

export function buildA94R1Payload(rows) {
  return {
    fileCount: rows.length,
    byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
    pathSetSha256: sha256(rows.map((row) => row.path).join("\n")),
    aggregateSha256: sha256(
      rows
        .map(
          (row) =>
            `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`,
        )
        .join("\n"),
    ),
  };
}

export function readJson(root, relativePath) {
  return JSON.parse(
    readFileSync(path.join(root, relativePath), "utf8"),
  );
}

export function digestValid(manifest) {
  if (!manifest || typeof manifest !== "object") return false;
  const { manifestDigestSha256, ...core } = manifest;
  return (
    typeof manifestDigestSha256 === "string" &&
    manifestDigestSha256 === sha256(canonicalJson(core))
  );
}
