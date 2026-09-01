#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const REV =
  "VELMERE_PASS36_A102R2_ACTION_REQUIRED_LOCAL_SECURITY_PRIVACY_BEHAVIORAL_DATA_AND_RUNTIME_CLOSURE_NO_REAL_CREDIT";
export const PARENT =
  "VELMERE_PASS36_A102R1_OUT_OF_TIME_REPEATED_SLO_VENDOR_EXIT_OBSERVATION_INDEPENDENT_WITNESS_AND_FROZEN_SOURCE_DIVERSITY_TRUTH_BOUNDARY";
export const OBSERVATION_REVISION =
  "VELMERE_PASS36_A102R1_OUT_OF_TIME_REPEATED_SLO_VENDOR_EXIT_OBSERVATION_INDEPENDENT_WITNESS_AND_FROZEN_SOURCE_DIVERSITY_TRUTH_BOUNDARY";
export const FROZEN_OBSERVATION_SOURCE =
  "VELMERE_PASS36_A101R0_MEASURED_SLO_ERROR_BUDGET_VENDOR_EXIT_AND_RECOVERY_TRUTH_BOUNDARY";
export const MANIFEST =
  "config/pass36/a102r2-current-root-descendant-manifest.json";
export const PARENT_MANIFEST =
  "config/pass36/a102r1-current-root-descendant-manifest.json";
const IMMUTABLE_LOG = "fixtures/pass35/a42/windows-global-json-crash.log";

export const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function excluded(relativePath) {
  const top = relativePath.split("/", 1)[0];
  if (
    [".git", ".velmere", ".next", ".turbo", "_velmere", "artifacts",
      "coverage", "node_modules", "dist", "out", ".cache", "cache"].includes(top)
    || top.startsWith(".next-")
  ) return true;
  const segments = relativePath.split("/");
  const base = segments.at(-1);
  if (segments.includes("__pycache__") || base.endsWith(".pyc")) return true;
  if (base === ".env" || base.startsWith(".env.")) return true;
  if (base === ".eslintcache" || base.endsWith(".tsbuildinfo")) return true;
  if (base.endsWith(".log") && relativePath !== IMMUTABLE_LOG) return true;
  if (/\.(?:db|sqlite|sqlite3)$/iu.test(base)) return true;
  return relativePath === MANIFEST;
}

export function collect(root) {
  const rows = [];
  const rejected = [];
  function walk(absolutePath, relativePath = "") {
    const entries = fs.readdirSync(absolutePath, { withFileTypes: true })
      .sort((left, right) =>
        Buffer.from(left.name).compare(Buffer.from(right.name)));
    for (const entry of entries) {
      const relative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const absolute = path.join(absolutePath, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        rejected.push({ path: relative, reason: "symlink" });
        continue;
      }
      if (entry.isDirectory()) {
        if (!excluded(`${relative}/x`)) walk(absolute, relative);
        continue;
      }
      if (!entry.isFile()) {
        rejected.push({ path: relative, reason: "special" });
        continue;
      }
      if (excluded(relative)) continue;
      const bytes = fs.readFileSync(absolute);
      rows.push({
        path: relative,
        byteLength: bytes.length,
        sha256: sha256(bytes),
        mode: (stat.mode & 0o111) ? 0o100755 : 0o100644,
      });
    }
  }
  walk(path.resolve(root));
  rows.sort((left, right) =>
    Buffer.from(left.path).compare(Buffer.from(right.path)));
  return { rows, rejected };
}

export function payload(rows) {
  return {
    fileCount: rows.length,
    byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
    pathSetSha256: sha256(rows.map((row) => row.path).join("\n")),
    aggregateSha256: sha256(rows.map((row) =>
      `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")),
  };
}
