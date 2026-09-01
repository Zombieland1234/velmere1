#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const EXACT_TARGET = Object.freeze({
  os: "Windows Server 2025",
  osBaseBuild: "26100",
  platform: "win32",
  arch: "x64",
  node: "v24.18.0",
  npm: "11.16.0",
});

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  const inline = args.find((value) => value.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : fallback;
};

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function evaluateExactWindowsServer2025({ runtime, osIdentity }) {
  const caption = normalizedString(osIdentity?.caption);
  const productName = normalizedString(osIdentity?.productName);
  const installationType = normalizedString(osIdentity?.installationType);
  const editionId = normalizedString(osIdentity?.editionId);
  const buildNumber = normalizedString(osIdentity?.buildNumber);
  const registryBuildNumber = normalizedString(osIdentity?.currentBuildNumber);
  const version = normalizedString(osIdentity?.version);
  const osArchitecture = normalizedString(osIdentity?.osArchitecture);
  const ubr = Number(osIdentity?.ubr);
  const productType = Number(osIdentity?.productType);
  const githubActions = runtime?.githubActions === true;
  const imageOs = normalizedString(runtime?.imageOs);
  const runnerOs = normalizedString(runtime?.runnerOs);

  const checks = [
    { id: "platform", expected: EXACT_TARGET.platform, observed: runtime?.platform, pass: runtime?.platform === EXACT_TARGET.platform },
    { id: "architecture", expected: EXACT_TARGET.arch, observed: runtime?.arch, pass: runtime?.arch === EXACT_TARGET.arch },
    { id: "node", expected: EXACT_TARGET.node, observed: runtime?.node, pass: runtime?.node === EXACT_TARGET.node },
    { id: "npm", expected: EXACT_TARGET.npm, observed: runtime?.npm, pass: runtime?.npm === EXACT_TARGET.npm },
    { id: "caption", expected: "Windows Server 2025 caption", observed: caption || null, pass: /Windows Server 2025/i.test(caption) },
    { id: "productName", expected: "Windows Server 2025 product", observed: productName || null, pass: /Windows Server 2025/i.test(productName) },
    { id: "productType", expected: "2 or 3 (domain controller/server)", observed: Number.isFinite(productType) ? productType : null, pass: productType === 2 || productType === 3 },
    { id: "installationType", expected: "Server*", observed: installationType || null, pass: /^Server/i.test(installationType) },
    { id: "editionId", expected: "Server*", observed: editionId || null, pass: /^Server/i.test(editionId) },
    { id: "osArchitecture", expected: "64-bit/x64", observed: osArchitecture || null, pass: /64|x64/i.test(osArchitecture) },
    { id: "osBaseBuild", expected: EXACT_TARGET.osBaseBuild, observed: buildNumber || null, pass: buildNumber === EXACT_TARGET.osBaseBuild },
    { id: "registryBaseBuild", expected: EXACT_TARGET.osBaseBuild, observed: registryBuildNumber || null, pass: registryBuildNumber === EXACT_TARGET.osBaseBuild },
    { id: "version", expected: `10.0.${EXACT_TARGET.osBaseBuild}`, observed: version || null, pass: version.startsWith(`10.0.${EXACT_TARGET.osBaseBuild}`) },
    { id: "updateBuildRevision", expected: "non-negative integer", observed: Number.isFinite(ubr) ? ubr : null, pass: Number.isInteger(ubr) && ubr >= 0 },
    { id: "githubRunnerOs", expected: githubActions ? "Windows" : "not applicable", observed: runnerOs || null, pass: !githubActions || runnerOs === "Windows" },
    { id: "githubImageOs", expected: githubActions ? "win25*" : "not applicable", observed: imageOs || null, pass: !githubActions || /^win25/i.test(imageOs) },
  ];

  return {
    pass: checks.every((check) => check.pass),
    checks,
    blockers: checks.filter((check) => !check.pass).map((check) => `EXACT_TARGET_MISMATCH_${check.id.toUpperCase()}`),
  };
}

function collectOsIdentity() {
  if (process.platform !== "win32") return { collectionError: `unsupported_platform:${process.platform}` };
  const script = [
    "$ErrorActionPreference='Stop'",
    "$os=Get-CimInstance Win32_OperatingSystem",
    "$reg=Get-ItemProperty -LiteralPath 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion'",
    "[ordered]@{caption=$os.Caption;version=$os.Version;buildNumber=$os.BuildNumber;osArchitecture=$os.OSArchitecture;productType=[int]$os.ProductType;productName=$reg.ProductName;installationType=$reg.InstallationType;editionId=$reg.EditionID;currentBuildNumber=$reg.CurrentBuildNumber;ubr=[int]$reg.UBR;displayVersion=$reg.DisplayVersion}|ConvertTo-Json -Compress",
  ].join(";");
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    return { collectionError: `powershell_exit_${result.status}:${normalizedString(result.stderr).slice(-1000)}` };
  }
  try {
    return JSON.parse(normalizedString(result.stdout));
  } catch (error) {
    return { collectionError: `identity_json_parse:${String(error)}` };
  }
}

function npmVersion() {
  const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npm";
  const commandArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", "npm.cmd --version"]
    : ["--version"];
  const result = spawnSync(executable, commandArgs, { encoding: "utf8", maxBuffer: 1024 * 1024, windowsHide: true });
  return result.status === 0 ? normalizedString(result.stdout) : null;
}

function writeReceipt(output, receipt) {
  const copy = structuredClone(receipt);
  delete copy.integritySha256;
  receipt.integritySha256 = sha256(stable(copy));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
}

function main() {
  const output = path.resolve(arg("--output", path.join(process.cwd(), "current-execution-out", "EXACT_WINDOWS_SERVER_2025_IDENTITY.json")));
  const osIdentity = collectOsIdentity();
  const runtime = {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    npm: npmVersion(),
    githubActions: process.env.GITHUB_ACTIONS === "true",
    runnerOs: process.env.RUNNER_OS || null,
    imageOs: process.env.ImageOS || null,
    githubRunId: process.env.GITHUB_RUN_ID || null,
    githubSha: process.env.GITHUB_SHA || null,
  };
  const evaluation = evaluateExactWindowsServer2025({ runtime, osIdentity });
  if (osIdentity.collectionError) {
    evaluation.pass = false;
    evaluation.blockers.unshift("OS_IDENTITY_COLLECTION_FAILED");
  }
  const receipt = {
    schemaVersion: "velmere.current-execution.exact-windows-server-2025-identity.v1",
    generatedAt: new Date().toISOString(),
    status: evaluation.pass ? "PASS" : "WITHHELD",
    classification: evaluation.pass
      ? "EXACT_WINDOWS_SERVER_2025_RUNTIME_IDENTITY_PASS"
      : "WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED",
    exactTarget: EXACT_TARGET,
    runtime,
    osIdentity,
    checks: evaluation.checks,
    blockers: evaluation.blockers,
    credit: {
      exactWindowsServer2025Identity: evaluation.pass,
      engineeringGates: false,
      customerFinal: false,
      goPaid: false,
      live: false,
    },
    truthBoundary: "This receipt proves only physical OS/runtime identity. It does not prove dependency, TypeScript, ESLint, build, browser, customer, rights, FINAL, GO_PAID or LIVE gates.",
  };
  writeReceipt(output, receipt);
  console.log(JSON.stringify({ status: receipt.status, classification: receipt.classification, blockers: receipt.blockers, output }, null, 2));
  process.exitCode = evaluation.pass ? 0 : 78;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
