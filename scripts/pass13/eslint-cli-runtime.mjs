#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const EXPECTED_PACKAGE_NAME = "eslint";
const EXPECTED_BIN_RELATIVE_PATH = "bin/eslint.js";

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function regularFileIdentity(filePath, codePrefix) {
  const metadata = fs.lstatSync(filePath);
  invariant(!metadata.isSymbolicLink(), `${codePrefix}_symlink_forbidden`);
  invariant(metadata.isFile(), `${codePrefix}_not_regular_file`);
  const realPath = fs.realpathSync(filePath);
  const realMetadata = fs.lstatSync(realPath);
  invariant(realMetadata.isFile() && !realMetadata.isSymbolicLink(), `${codePrefix}_realpath_not_regular_file`);
  const bytes = fs.readFileSync(realPath);
  return {
    path: filePath,
    realPath,
    byteLength: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

function normalizeBinPath(value) {
  invariant(typeof value === "string" && value.length > 0, "eslint_package_bin_missing");
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//u, "");
  invariant(normalized === EXPECTED_BIN_RELATIVE_PATH, `eslint_package_bin_unexpected:${normalized}`);
  return normalized;
}

export function resolveInstalledEslintCli(rootPath = process.cwd()) {
  const root = fs.realpathSync(path.resolve(rootPath));
  const rootMetadata = fs.lstatSync(root);
  invariant(rootMetadata.isDirectory() && !rootMetadata.isSymbolicLink(), "eslint_root_not_regular_directory");

  const packageRoot = path.join(root, "node_modules", EXPECTED_PACKAGE_NAME);
  invariant(fs.existsSync(packageRoot), "eslint_package_missing");
  const packageMetadata = fs.lstatSync(packageRoot);
  invariant(packageMetadata.isDirectory() && !packageMetadata.isSymbolicLink(), "eslint_package_root_invalid");
  const packageRealRoot = fs.realpathSync(packageRoot);
  invariant(isInside(root, packageRealRoot), "eslint_package_outside_project_root");

  const packageJsonPath = path.join(packageRoot, "package.json");
  const packageJsonIdentity = regularFileIdentity(packageJsonPath, "eslint_package_json");
  invariant(isInside(packageRealRoot, packageJsonIdentity.realPath), "eslint_package_json_outside_package");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonIdentity.realPath, "utf8"));
  invariant(packageJson?.name === EXPECTED_PACKAGE_NAME, "eslint_package_name_mismatch");
  invariant(typeof packageJson?.version === "string" && packageJson.version.length > 0, "eslint_package_version_missing");
  const configuredBin = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.eslint;
  const binRelativePath = normalizeBinPath(configuredBin);

  const cliPath = path.join(packageRoot, ...binRelativePath.split("/"));
  invariant(fs.existsSync(cliPath), "eslint_cli_missing");
  const cliIdentity = regularFileIdentity(cliPath, "eslint_cli");
  invariant(isInside(packageRealRoot, cliIdentity.realPath), "eslint_cli_outside_package");

  return {
    packageName: EXPECTED_PACKAGE_NAME,
    packageVersion: packageJson.version,
    packageRoot,
    packageRealRoot,
    packageJsonPath: packageJsonIdentity.realPath,
    packageJsonSha256: packageJsonIdentity.sha256,
    cliPath: cliIdentity.realPath,
    cliRelativePath: path.relative(root, cliIdentity.realPath).split(path.sep).join("/"),
    cliByteLength: cliIdentity.byteLength,
    cliSha256: cliIdentity.sha256,
    nodeExecutable: process.execPath,
  };
}

export function runInstalledEslint({
  root = process.cwd(),
  args = [],
  timeout = 180_000,
  maxBuffer = 64 * 1024 * 1024,
  env = process.env,
} = {}) {
  invariant(Array.isArray(args) && args.every((value) => typeof value === "string"), "eslint_args_invalid");
  const identity = resolveInstalledEslintCli(root);
  const result = spawnSync(process.execPath, [identity.cliPath, ...args], {
    cwd: path.resolve(root),
    encoding: "utf8",
    timeout,
    maxBuffer,
    env,
    shell: false,
    windowsHide: true,
    killSignal: "SIGTERM",
  });
  return {
    identity,
    invocation: {
      executable: process.execPath,
      arguments: [identity.cliPath, ...args],
      shell: false,
      cwd: path.resolve(root),
      timeout,
      maxBuffer,
    },
    result,
  };
}

export function boundedTextTail(value, limit = 4_000) {
  const text = String(value ?? "");
  return text.length <= limit ? text : text.slice(-limit);
}
