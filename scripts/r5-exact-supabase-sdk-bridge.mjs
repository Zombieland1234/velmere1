import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import https from "node:https";
import { execFileSync } from "node:child_process";

const out = path.resolve("r5-exact-supabase-sdk-bridge");
const packagesDir = path.join(out, "packages");
const extractDir = path.join(out, ".extract");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(packagesDir, { recursive: true });
fs.mkdirSync(path.join(out, "logs"), { recursive: true });
fs.mkdirSync(extractDir, { recursive: true });

const specs = [
  ["@supabase/supabase-js", "2.108.1", "supabase-js-2.108.1.tgz", "https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.108.1.tgz", "V/1hRKLSCJ0zEL+9QFRBUtivvePfOsaAYQmC0HhFNSHC2F3xFs4jSF3YhkLmzex6E4V4FGvmBDOP72D/53NnZA=="],
  ["@supabase/auth-js", "2.108.1", "auth-js-2.108.1.tgz", "https://registry.npmjs.org/@supabase/auth-js/-/auth-js-2.108.1.tgz", "Lle5rKU8f9LF3K5dDd8Or8mkkG+ptzRZZWKPVMm9B9UuovH65Ss2+iFnQqRsCqaGouvJEcTWyl0cj2riNrrDLQ=="],
  ["@supabase/functions-js", "2.108.1", "functions-js-2.108.1.tgz", "https://registry.npmjs.org/@supabase/functions-js/-/functions-js-2.108.1.tgz", "fxBRW/A4IG7ADQztVt0NaEy5ysiO1WJ2pbldsnBchrkHuyepX0Krek9qA9T4gUQBVVTCE9Ea4pdsM5hfn3nc4A=="],
  ["@supabase/postgrest-js", "2.108.1", "postgrest-js-2.108.1.tgz", "https://registry.npmjs.org/@supabase/postgrest-js/-/postgrest-js-2.108.1.tgz", "9lj2MCPPMgSTaJ5y+amnhb3TWPtMFVlbDn2hmX/VV91xQU4j0AauwfMaBErHBJ+zzsSwjc0jLU+zLIZFLQzfig=="],
  ["@supabase/realtime-js", "2.108.1", "realtime-js-2.108.1.tgz", "https://registry.npmjs.org/@supabase/realtime-js/-/realtime-js-2.108.1.tgz", "mHGGqOjwd1XTydcoffUqEMsbFQHUi6A3uhQ0EXr3iqzpLqItxKA9nbN6gIQxrZ7JRRnuUe/iOFPUkYV9Tdc5lg=="],
  ["@supabase/storage-js", "2.108.1", "storage-js-2.108.1.tgz", "https://registry.npmjs.org/@supabase/storage-js/-/storage-js-2.108.1.tgz", "Er0SGGt85iT6ye+SSh98Az6L2CesoZJuyzEZYH2oBOAnIxa9Nn4CtwUC3veGxYggoT56X+3tVuuQeDBP8kR8sg=="],
  ["@supabase/phoenix", "0.4.5", "phoenix-0.4.5.tgz", "https://registry.npmjs.org/@supabase/phoenix/-/phoenix-0.4.5.tgz", "aAn9H9ovVyeApKy11OWOrrOGq8DV68yWeH4ud2lN9fzn4aO8Zb5GLL9m1pUg9nLqIcT+ZDfAcsZe0E/nqdv2lw=="],
  ["tslib", "2.8.1", "tslib-2.8.1.tgz", "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz", "oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w=="],
  ["iceberg-js", "0.8.1", "iceberg-js-0.8.1.tgz", "https://registry.npmjs.org/iceberg-js/-/iceberg-js-0.8.1.tgz", "1dhVQZXhcHje7798IVM+xoo/1ZdVfzOMIc8/rgVSijRK38EDqOJoGula9N/8ZI5RD8QTxNQtK/Gozpr+qUqRRA=="],
];

function download(url, redirects = 0) {
  if (redirects > 8) return Promise.reject(new Error(`too_many_redirects:${url}`));
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Velmere-R5-Exact-Supabase-SDK-Bridge/1.0" } }, (response) => {
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

const npmVersion = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
if (process.version !== "v24.18.0") throw new Error(`wrong_node:${process.version}`);
if (npmVersion !== "11.16.0") throw new Error(`wrong_npm:${npmVersion}`);
fs.writeFileSync(path.join(out, "logs", "node-version.txt"), `${process.version}\n`);
fs.writeFileSync(path.join(out, "logs", "npm-version.txt"), `${npmVersion}\n`);

const packages = [];
for (const [name, version, file, sourceUrl, expectedSha512Base64] of specs) {
  const bytes = await download(sourceUrl);
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
    sourceUrl,
    byteLength: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    sha512Base64,
    lockIntegrity: `sha512-${expectedSha512Base64}`,
    license: packageJson.license ?? null,
    packageIdentity: "PASS",
  });
}
fs.rmSync(extractDir, { recursive: true, force: true });

const receipt = {
  schemaVersion: "velmere.r5.exact-supabase-sdk-bridge.v1",
  generatedAt: new Date().toISOString(),
  sourceCommit: process.env.GITHUB_SHA ?? null,
  sourceBranch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || null,
  runner: {
    os: process.env.RUNNER_OS ?? process.platform,
    arch: process.arch,
    node: process.version,
    npm: npmVersion,
  },
  packages,
  status: "PASS_EXACT_LOCK_INTEGRITY_AND_PACKAGE_IDENTITY",
  customerFinalCredit: false,
  authorizedSupabaseRuntimeCredit: false,
  exactWindowsCredit: false,
  truthBoundary: "Nine exact npm tarballs forming the current-lock Supabase SDK closure for bounded local fail-closed testing. This is not an authorized Supabase staging environment, not a full npm install and not row-level Customer FINAL.",
};
fs.writeFileSync(path.join(out, "VELMERE_R5_EXACT_SUPABASE_SDK_BRIDGE_RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, packageCount: packages.length, node: process.version, npm: npmVersion }, null, 2));
