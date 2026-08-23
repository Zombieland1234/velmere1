import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import https from "node:https";
import { execFileSync } from "node:child_process";

const out = path.resolve("r5-exact-dependency-bridge");
const packagesDir = path.join(out, "packages");
const extractDir = path.join(out, ".extract");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(packagesDir, { recursive: true });
fs.mkdirSync(path.join(out, "logs"), { recursive: true });
fs.mkdirSync(extractDir, { recursive: true });

const specs = [
  ["react", "19.2.7", "react-19.2.7.tgz", "https://registry.npmjs.org/react/-/react-19.2.7.tgz", "HNe9WslTbXmFK8o8cmwgAeJFSBvt1bPdHCVKtaaV+WlAN36mpT4hcRpwbf3fY56ar2oIXzsBpOAiIRHAdY0OlQ=="],
  ["react-dom", "19.2.7", "react-dom-19.2.7.tgz", "https://registry.npmjs.org/react-dom/-/react-dom-19.2.7.tgz", "t0BRVXvbiE/o20Hfw669rLbMCDWtYZLvmJigy2f0MxsXF+71pxhR3xOkspmsO8h3ZlNzyibAmtCa3l4lYKk6gQ=="],
  ["scheduler", "0.27.0", "scheduler-0.27.0.tgz", "https://registry.npmjs.org/scheduler/-/scheduler-0.27.0.tgz", "eNv+WrVbKu1f3vbYJT/xtiF5syA5HPIMtf9IgY/nKg0sWqzAUEvqY/xm7OcZc/qafLx/iO9FgOmeSAp4v5ti/Q=="],
  ["typescript", "5.9.3", "typescript-5.9.3.tgz", "https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz", "jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw=="],
  ["@electric-sql/pglite", "0.5.4", "electric-sql-pglite-0.5.4.tgz", "https://registry.npmjs.org/@electric-sql/pglite/-/pglite-0.5.4.tgz", "yYZUyyXrHU7tPlCjwZQJ6hIG9DscdCCn7Uk0mYKwC1FeHX286AbcmFveMiRBEak8e9iPupjsoVImN3yJZVed2g=="],
];

function download(url, redirects = 0) {
  if (redirects > 8) return Promise.reject(new Error(`too_many_redirects:${url}`));
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Velmere-R5-Exact-Dependency-Bridge/1.0" } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const next = new URL(response.headers.location, url).toString();
        response.resume();
        resolve(download(next, redirects + 1));
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`http_${response.statusCode}:${url}`));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    }).on("error", reject);
  });
}

const nodeUrl = "https://nodejs.org/dist/v24.18.0/node-v24.18.0-linux-x64.tar.xz";
const sumsUrl = "https://nodejs.org/dist/v24.18.0/SHASUMS256.txt";
const [nodeBytes, sumsBytes] = await Promise.all([download(nodeUrl), download(sumsUrl)]);
const sumsText = sumsBytes.toString("utf8");
const checksumMatch = sumsText.match(/^([0-9a-f]{64})  node-v24\.18\.0-linux-x64\.tar\.xz$/mu);
if (!checksumMatch) throw new Error("node_checksum_line_missing");
const nodeSha256 = crypto.createHash("sha256").update(nodeBytes).digest("hex");
if (nodeSha256 !== checksumMatch[1]) throw new Error(`node_sha256_mismatch:${nodeSha256}`);
fs.writeFileSync(path.join(out, "node-v24.18.0-linux-x64.tar.xz"), nodeBytes);
fs.writeFileSync(path.join(out, "SHASUMS256.txt"), sumsBytes);

const packages = [];
for (const [name, version, file, url, expectedSha512Base64] of specs) {
  const bytes = await download(url);
  const sha512Base64 = crypto.createHash("sha512").update(bytes).digest("base64");
  if (sha512Base64 !== expectedSha512Base64) {
    throw new Error(`integrity_mismatch:${name}@${version}:${sha512Base64}`);
  }
  const archive = path.join(packagesDir, file);
  fs.writeFileSync(archive, bytes);
  const target = path.join(extractDir, file.replace(/\.tgz$/u, ""));
  fs.mkdirSync(target, { recursive: true });
  execFileSync("tar", ["-xzf", archive, "-C", target]);
  const packageJson = JSON.parse(fs.readFileSync(path.join(target, "package", "package.json"), "utf8"));
  if (packageJson.name !== name || packageJson.version !== version) {
    throw new Error(`package_identity_mismatch:${name}@${version}:${packageJson.name}@${packageJson.version}`);
  }
  packages.push({
    name,
    version,
    file: `packages/${file}`,
    sourceUrl: url,
    byteLength: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    sha512Base64,
    lockIntegrity: `sha512-${expectedSha512Base64}`,
    license: packageJson.license ?? null,
    packageIdentity: "PASS",
  });
}
fs.rmSync(extractDir, { recursive: true, force: true });

const npmVersion = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
if (process.version !== "v24.18.0") throw new Error(`wrong_node:${process.version}`);
if (npmVersion !== "11.16.0") throw new Error(`wrong_npm:${npmVersion}`);
fs.writeFileSync(path.join(out, "logs", "node-version.txt"), `${process.version}\n`);
fs.writeFileSync(path.join(out, "logs", "npm-version.txt"), `${npmVersion}\n`);

const receipt = {
  schemaVersion: "velmere.r5.exact-dependency-bridge.v3",
  generatedAt: new Date().toISOString(),
  sourceCommit: process.env.GITHUB_SHA ?? null,
  sourceBranch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || null,
  runner: {
    os: process.env.RUNNER_OS ?? process.platform,
    arch: process.arch,
    node: process.version,
    npm: npmVersion,
  },
  nodeArchive: {
    version: "24.18.0",
    platform: "linux-x64",
    sourceUrl: nodeUrl,
    file: "node-v24.18.0-linux-x64.tar.xz",
    byteLength: nodeBytes.length,
    sha256: nodeSha256,
    checksumSource: sumsUrl,
    checksumVerification: "PASS",
  },
  packages,
  status: "PASS_EXACT_LOCK_INTEGRITY_AND_PACKAGE_IDENTITY",
  customerFinalCredit: false,
  exactWindowsCredit: false,
  truthBoundary: "Exact official Linux Node archive and five exact npm tarballs required by bounded R5 tests. Not npm ci, not the full dependency tree, not Windows Server 2025 and not row-level Customer FINAL.",
};
fs.writeFileSync(path.join(out, "VELMERE_R5_EXACT_DEPENDENCY_BRIDGE_RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, packageCount: packages.length, node: process.version, npm: npmVersion }, null, 2));
