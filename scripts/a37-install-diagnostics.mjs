import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const runtimePolicy = JSON.parse(fs.readFileSync(path.join(root, "config/pass24/runtime-policy.json"), "utf8"));
const requiredNode = pkg.engines?.node ?? "24.18.0";
const requiredNpm = pkg.engines?.npm ?? "11.16.0";
const clean = (value) => String(value ?? "").trim().replace(/^v/, "");
const run = (cmd, args = [], cwd = root) => {
  try { return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch (error) { return String(error?.stdout || error?.stderr || "").trim(); }
};
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmNeutralCwd = os.tmpdir();
const readNpmConfig = (key) => {
  const value = run(npmCommand, ["--loglevel=silent", "config", "get", key], npmNeutralCwd);
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1) ?? "";
};
const endpointState = (raw) => {
  const value = String(raw ?? "").trim();
  if (!value || value === "null" || value === "undefined") return "not_configured";
  try {
    const parsed = new URL(value);
    return parsed.hostname === "registry.npmjs.org" ? "official_npm_registry" : "configured_custom_registry_redacted";
  } catch {
    return "configured_non_url_value_redacted";
  }
};
const currentNode = clean(process.version);
const currentNpm = clean(run(npmCommand, ["--version"], npmNeutralCwd));
const archives = runtimePolicy?.node?.officialArchives ?? {};
const result = {
  status: currentNode === requiredNode && currentNpm === requiredNpm ? "READY" : "TOOLCHAIN_MISMATCH",
  current: { node: currentNode, npm: currentNpm },
  required: { node: requiredNode, npm: requiredNpm },
  officialArchivePolicy: {
    tarXz: archives["tar.xz"] ? { fileName: archives["tar.xz"].fileName, sha256: archives["tar.xz"].sha256 } : null,
    tarGz: archives["tar.gz"] ? { fileName: archives["tar.gz"].fileName, sha256: archives["tar.gz"].sha256 } : null,
  },
  npm: {
    registry: endpointState(readNpmConfig("registry")),
    proxy: endpointState(readNpmConfig("proxy")),
    httpsProxy: endpointState(readNpmConfig("https-proxy")),
  },
  guidance: [
    `Use Node ${requiredNode} and npm ${requiredNpm}.`,
    "On Windows run: powershell -ExecutionPolicy Bypass -File .\\VELMERE_SETUP_WINDOWS_A37.ps1",
    "npm configuration is inspected from a neutral temporary directory, so a wrong project runtime cannot force a diagnostic bypass.",
    "HTTP 503/ETIMEDOUT/ECONNRESET are registry/network failures; the setup script retries without weakening engine checks.",
  ],
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "READY" ? 0 : 2);
