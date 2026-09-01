#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { run, readJson, POLICY_PATH, sha256File, writeJson, ROOT } from "./runtime-lib.mjs";

const DEFAULT_RUNTIME_DIRECTORY = "node-v24.18.0-linux-x64";

function argument(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`argument_value_missing:${name}`);
  return value;
}

function assertNoSymlinkComponents(root, destination) {
  const relative = path.relative(root, destination);
  let current = root;
  if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
    throw new Error("runtime_destination_root_symlink_rejected");
  }
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error("runtime_destination_symlink_component_rejected");
    }
  }
}

export function resolveManagedRuntimeDestination({
  root = ROOT,
  requestedDestination = null,
  runtimeDirectory = DEFAULT_RUNTIME_DIRECTORY,
} = {}) {
  const resolvedRoot = path.resolve(root);
  const managedRoot = path.join(resolvedRoot, ".velmere", "exact-runtime");
  const destination = requestedDestination
    ? path.resolve(resolvedRoot, requestedDestination)
    : path.join(managedRoot, runtimeDirectory);
  const relative = path.relative(managedRoot, destination);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("runtime_destination_outside_managed_root");
  }
  assertNoSymlinkComponents(resolvedRoot, destination);
  return destination;
}

export function main(argv = process.argv.slice(2)) {
  const archiveArgument = argument(argv, "--archive");
  if (!archiveArgument) {
    console.error("Usage: node scripts/pass24/import-exact-runtime.mjs --archive /path/node-v24.18.0-linux-x64.tar.xz [--destination .velmere/exact-runtime/NAME]");
    return 2;
  }
  const archive = path.resolve(archiveArgument);
  const requestedDestination = argument(argv, "--destination");
  const destination = resolveManagedRuntimeDestination({ root: ROOT, requestedDestination });
  const policy = readJson(POLICY_PATH);
  if (!fs.existsSync(archive) || !fs.statSync(archive).isFile()) throw new Error(`Archive not found: ${archive}`);
  const archivePolicy = Object.values(policy.node.officialArchives).find((row) => row.fileName === path.basename(archive));
  if (!archivePolicy) throw new Error(`Archive filename is not approved by PASS24 policy: ${path.basename(archive)}`);
  const actualSha = sha256File(archive);
  if (actualSha !== archivePolicy.sha256) throw new Error(`Archive SHA mismatch: expected ${archivePolicy.sha256}, got ${actualSha}`);
  const listing = run("tar", ["-tf", archive], { timeout: 120_000 });
  if (listing.status !== 0) throw new Error(`Cannot list archive: ${listing.stderr || listing.stdout}`);
  for (const row of listing.stdout.split(/\r?\n/u).filter(Boolean)) {
    const normalized = row.replaceAll("\\", "/");
    if (normalized.startsWith("/") || normalized.split("/").includes("..")) throw new Error(`Unsafe archive path: ${row}`);
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-pass24-runtime-"));
  try {
    const extracted = run("tar", ["-xf", archive, "-C", temporary], { timeout: 300_000 });
    if (extracted.status !== 0) throw new Error(`Archive extraction failed: ${extracted.stderr || extracted.stdout}`);
    const expectedRoot = path.join(temporary, DEFAULT_RUNTIME_DIRECTORY);
    if (!fs.existsSync(expectedRoot)) throw new Error("Expected runtime root is missing after extraction.");
    for (const entry of fs.readdirSync(expectedRoot, { recursive: true, withFileTypes: true })) {
      if (!entry.isSymbolicLink()) continue;
      const absolute = path.join(entry.parentPath ?? entry.path, entry.name);
      const resolved = fs.realpathSync(absolute);
      if (!resolved.startsWith(`${fs.realpathSync(expectedRoot)}${path.sep}`)) throw new Error(`Runtime symlink escapes root: ${absolute}`);
    }
    const nodeBinary = path.join(expectedRoot, "bin", "node");
    const npmBinary = path.join(expectedRoot, "bin", "npm");
    const nodeVersion = run(nodeBinary, ["-v"], { timeout: 30_000 });
    const npmVersion = run(npmBinary, ["-v"], {
      timeout: 30_000,
      env: { ...process.env, PATH: `${path.join(expectedRoot, "bin")}${path.delimiter}${process.env.PATH ?? ""}` },
    });
    if (nodeVersion.status !== 0 || nodeVersion.stdout.trim() !== `v${policy.node.version}`) throw new Error(`Wrong Node version: ${nodeVersion.stdout.trim()} ${nodeVersion.stderr.trim()}`);
    if (npmVersion.status !== 0 || npmVersion.stdout.trim() !== policy.node.bundledNpmVersion) throw new Error(`Wrong npm version: ${npmVersion.stdout.trim()} ${npmVersion.stderr.trim()}`);

    // Revalidate immediately before the only recursive replacement operation.
    resolveManagedRuntimeDestination({ root: ROOT, requestedDestination: destination });
    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(expectedRoot, destination, { recursive: true, dereference: false, preserveTimestamps: true });
    const receipt = {
      schemaVersion: "velmere.pass24.exact-runtime-import.v1",
      archive: { fileName: path.basename(archive), sha256: actualSha, officialUrl: archivePolicy.url },
      destination: path.relative(ROOT, destination).replaceAll(path.sep, "/"),
      nodeVersion: nodeVersion.stdout.trim(),
      npmVersion: npmVersion.stdout.trim(),
      target: policy.target,
      ok: true,
    };
    writeJson(path.join(ROOT, ".velmere", "pass24-diagnostics", "runtime-import.json"), receipt);
    console.log(`PASS24 exact runtime imported: Node ${receipt.nodeVersion}, npm ${receipt.npmVersion}`);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
  return 0;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const exitCode = main();
  if (exitCode !== 0) process.exitCode = exitCode;
}
