import fs from "node:fs";

const lock = fs.readFileSync("package-lock.json", "utf8");
const npmrc = fs.existsSync(".npmrc") ? fs.readFileSync(".npmrc", "utf8") : "";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const required = [
  [!lock.includes("packages.applied-caas-gateway"), "package-lock has no OpenAI internal registry URL"],
  [!lock.includes("artifactory/api/npm/npm-public"), "package-lock has no artifactory npm-public URL"],
  [lock.includes("https://registry.npmjs.org/ws/-/ws-8.20.1.tgz"), "ws 8.20.1 resolves to public npm registry"],
  [npmrc.includes("registry=https://registry.npmjs.org/"), ".npmrc pins public npm registry"],
  [pkg.dependencies?.ws || pkg.devDependencies?.ws, "ws is a direct dependency"],
];

let failed = false;
for (const [ok, label] of required) {
  if (ok) {
    console.log(`PASS2035 OK: ${label}`);
  } else {
    failed = true;
    console.error(`PASS2035 FAIL: ${label}`);
  }
}

if (failed) process.exit(1);
console.log("PASS2035 registry hygiene verifier passed.");
