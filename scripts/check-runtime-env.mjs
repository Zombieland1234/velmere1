import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const requiredNode = packageJson.engines?.node ?? "not declared";
const requiredNpm = packageJson.engines?.npm ?? "not declared";
const actualNode = process.version;
const npmUserAgent = process.env.npm_config_user_agent ?? "";

function detectNpmVersion() {
  const fromUserAgent = npmUserAgent.match(/npm\/(\d+\.\d+\.\d+)/)?.[1];
  try {
    const fromPath = execFileSync("npm", ["-v"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (/^\d+\.\d+\.\d+$/.test(fromPath)) return fromPath;
  } catch {
    // Some CI wrappers expose only npm_config_user_agent. Fall back to that.
  }
  return fromUserAgent ?? "unknown";
}

const actualNpm = detectNpmVersion();

function parseMajor(value) {
  const match = String(value).match(/v?(\d+)/);
  return match ? Number(match[1]) : null;
}

const nodeMajor = parseMajor(actualNode);
const npmMajor = parseMajor(actualNpm);
const nodeOk = nodeMajor === 24;
const npmOk = npmMajor === 11;

console.log(`Velmère runtime env: node ${actualNode} / npm ${actualNpm}`);
console.log(`Required: node ${requiredNode} / npm ${requiredNpm}`);

if (!nodeOk || !npmOk) {
  console.error(
    "Runtime env mismatch. Use Node 24.x and npm 11.x before npm ci, typecheck, lint, build or Vercel smoke QA.",
  );
  process.exit(1);
}
