#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalSourceMode,
  loadSourceModePolicy,
  validateObservedSourceMode,
} from "./source-mode-policy.mjs";

export const REV = "VELMERE_PASS36_A102R39_ACTION_REQUIRED_CROSS_PLATFORM_SOURCE_MODE_IDENTITY_WINDOWS_UNPACK_AND_POSIX_EXECUTABLE_POLICY_NO_LIVE_CREDIT";
export const PARENT = "VELMERE_PASS36_A102R38_ACTION_REQUIRED_PRODUCTION_SMOKE_UNIQUE_ASSERTION_RESULT_DENOMINATOR_AND_SOURCE_AUTHORITY_RECONCILIATION_NO_LIVE_CREDIT";
export const MANIFEST = "config/pass36/a102r39-current-root-descendant-manifest.json";
export const PARENT_MANIFEST = "config/pass36/a102r38-current-root-descendant-manifest.json";
export const STATE = "config/pass36/a102r39-action-required-current-state.json";
export const PROGRAM = "config/pass36/a102r39-world-class-completion-program.json";
export const RECEIPT = "config/pass36/a102r39-local-regression-receipt.json";
export const MODE_POLICY = "config/pass36/a102r39-cross-platform-source-mode-policy.json";
const IMMUTABLE_LOG = "fixtures/pass35/a42/windows-global-json-crash.log";

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const readJson = (root, relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

function excluded(relativePath) {
  const top = relativePath.split("/", 1)[0];
  if ([".git", ".velmere", ".next", ".turbo", "_velmere", "artifacts", "coverage", "node_modules", "dist", "out", ".cache", "cache"].includes(top) || top.startsWith(".next-")) return true;
  const parts = relativePath.split("/");
  const base = parts.at(-1);
  if (parts.includes("__pycache__") || base.endsWith(".pyc")) return true;
  if (base === ".env" || base.startsWith(".env.") || base === ".eslintcache" || base.endsWith(".tsbuildinfo")) return true;
  if (base.endsWith(".log") && relativePath !== IMMUTABLE_LOG) return true;
  if (/\.(?:db|sqlite|sqlite3)$/iu.test(base)) return true;
  return relativePath === MANIFEST;
}

export function collect(rootPath, options = {}) {
  const root = path.resolve(rootPath);
  const platform = options.platform ?? process.platform;
  const modePolicy = options.modePolicy ?? loadSourceModePolicy(root, MODE_POLICY);
  const rows = [];
  const rejected = [];
  const modeChecks = [];
  function walk(absoluteDirectory, relativeDirectory = "") {
    const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true })
      .sort((left, right) => Buffer.from(left.name).compare(Buffer.from(right.name)));
    for (const entry of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const metadata = fs.lstatSync(absolutePath);
      if (metadata.isSymbolicLink()) {
        rejected.push({ path: relativePath, reason: "symlink" });
        continue;
      }
      if (entry.isDirectory()) {
        if (!excluded(`${relativePath}/x`)) walk(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile()) {
        rejected.push({ path: relativePath, reason: "special" });
        continue;
      }
      if (excluded(relativePath)) continue;
      try {
        modeChecks.push({ path: relativePath, ...validateObservedSourceMode(relativePath, metadata, modePolicy, platform) });
      } catch (error) {
        rejected.push({ path: relativePath, reason: error instanceof Error ? error.message : String(error) });
        continue;
      }
      const bytes = fs.readFileSync(absolutePath);
      rows.push({
        path: relativePath,
        byteLength: bytes.length,
        sha256: sha256(bytes),
        mode: canonicalSourceMode(relativePath, modePolicy),
      });
    }
  }
  walk(root);
  rows.sort((left, right) => Buffer.from(left.path).compare(Buffer.from(right.path)));
  return { rows, rejected, modeChecks, platform, executablePaths: modePolicy.executablePaths.size };
}

export function payload(rows) {
  return {
    fileCount: rows.length,
    byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
    pathSetSha256: sha256(rows.map((row) => row.path).join("\n")),
    aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")),
  };
}
