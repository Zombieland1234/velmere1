import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const requiredNode = pkg.engines?.node ?? "24.18.0";
const requiredNpm = pkg.engines?.npm ?? "11.16.0";
const clean = (value) => String(value ?? "").trim().replace(/^v/, "");
const run = (cmd, args = [], cwd = root) => {
  try { return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch (error) { return String(error?.stdout || error?.stderr || "").trim(); }
};
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const readNpmConfig = (key) => {
  const value = run(npmCommand, ["--force", "--loglevel=silent", "config", "get", key]);
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1) ?? "";
};
const currentNode = clean(process.version);
const currentNpm = clean(run(npmCommand, ["--version"]));
const registry = readNpmConfig("registry");
const proxy = readNpmConfig("proxy");
const httpsProxy = readNpmConfig("https-proxy");
const result = {
  status: currentNode === requiredNode && currentNpm === requiredNpm ? "READY" : "TOOLCHAIN_MISMATCH",
  current: { node: currentNode, npm: currentNpm },
  required: { node: requiredNode, npm: requiredNpm },
  npm: { registry, proxy, httpsProxy },
  guidance: [
    `Use Node ${requiredNode} and npm ${requiredNpm}.`,
    "On Windows run: powershell -ExecutionPolicy Bypass -File .\\VELMERE_SETUP_WINDOWS_A35.ps1",
    "HTTP 503/ETIMEDOUT/ECONNRESET are registry/network failures; the setup script retries without weakening engine checks.",
  ],
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "READY" ? 0 : 2);
