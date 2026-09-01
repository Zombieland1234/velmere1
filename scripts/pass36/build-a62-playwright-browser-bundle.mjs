#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json"), "utf8"));
const browserRoot = path.resolve(String(process.env.VELMERE_A62_BROWSER_ROOT ?? ""));
const executableInput = String(process.env.VELMERE_A62_BROWSER_EXECUTABLE_RELATIVE ?? "").replaceAll("\\", "/");
const output = path.resolve(process.argv[2] ?? path.join(root, "artifacts/pass36/a62/A62_PLAYWRIGHT_BROWSER_BUNDLE.zip"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
if (!process.env.VELMERE_A62_BROWSER_ROOT || !fs.statSync(browserRoot).isDirectory()) throw new Error("a62_browser_root_missing");
if (!executableInput || executableInput.startsWith("/") || executableInput.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("a62_browser_executable_relative_invalid");
const executable = path.resolve(browserRoot, executableInput);
if (!executable.startsWith(`${browserRoot}${path.sep}`) || !fs.statSync(executable).isFile()) throw new Error("a62_browser_executable_missing");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a62-browser-bundle-"));
try {
  const bundleRoot = path.join(temp, policy.browserBundle.rootDirectory);
  fs.cpSync(browserRoot, bundleRoot, { recursive: true, dereference: false, errorOnExist: true });
  const files = [];
  function walk(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name,"en"))) {
      const absolute = path.join(directory, item.name);
      if (item.isSymbolicLink()) throw new Error(`a62_browser_symlink_forbidden:${absolute}`);
      if (item.isDirectory()) { walk(absolute); continue; }
      if (!item.isFile()) throw new Error(`a62_browser_special_file_forbidden:${absolute}`);
      const bytes = fs.readFileSync(absolute);
      const relative = path.relative(temp, absolute).replaceAll("\\", "/");
      files.push({ path: relative, byteLength: bytes.length, sha256: sha256(bytes), mode: (fs.statSync(absolute).mode & 0o111) ? 0o100755 : 0o100644 });
    }
  }
  walk(bundleRoot);
  files.sort((a,b)=>a.path.localeCompare(b.path,"en"));
  const packageLockSha256 = sha256(fs.readFileSync(path.join(root, policy.packageLock.path)));
  const platform = `${process.platform}-${process.arch}`;
  if (!policy.runtimeProfiles[platform]) throw new Error(`a62_platform_unsupported:${platform}`);
  const manifest = { schemaVersion: policy.browserBundle.schemaVersion, packageLockSha256, playwrightVersion: policy.browserBundle.playwrightVersion, browserName: policy.browserBundle.browserName, platform, rootDirectory: policy.browserBundle.rootDirectory, executableRelativePath: `${policy.browserBundle.rootDirectory}/${executableInput}`, files };
  fs.writeFileSync(path.join(temp, policy.browserBundle.manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  const run = spawnSync(policy.pythonCommand ?? "python3", ["scripts/pass36/a62_browser_bundle_zip.py", temp, output], { cwd: root, encoding: "utf8" });
  if (run.status !== 0) throw new Error(run.stderr || run.stdout || "a62_browser_bundle_zip_failed");
  const archive = fs.readFileSync(output);
  console.log(JSON.stringify({ status: "PASS_A62_BROWSER_BUNDLE_BUILD", output, sha256: sha256(archive), byteLength: archive.length, files: files.length, platform, executableRelativePath: manifest.executableRelativePath }, null, 2));
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
