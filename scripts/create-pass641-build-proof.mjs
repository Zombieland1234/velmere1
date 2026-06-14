import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const nextDir = path.resolve(".next");
const required = ["BUILD_ID", "routes-manifest.json", "server/app-paths-manifest.json"];
const missing = required.filter((entry) => !fs.existsSync(path.join(nextDir, entry)));
if (missing.length) {
  console.error(`PASS641 build proof unavailable; missing: ${missing.join(", ")}`);
  process.exit(1);
}
const hashFile = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const routesManifestPath = path.join(nextDir, "routes-manifest.json");
const appPathsPath = path.join(nextDir, "server/app-paths-manifest.json");
const routesManifest = JSON.parse(fs.readFileSync(routesManifestPath, "utf8"));
const appPaths = JSON.parse(fs.readFileSync(appPathsPath, "utf8"));
const routeKeys = Object.keys(appPaths).sort();
const proof = {
  pass: "PASS641",
  createdAt: new Date().toISOString(),
  node: process.version,
  next: JSON.parse(fs.readFileSync("package.json", "utf8")).dependencies?.next,
  buildId: fs.readFileSync(path.join(nextDir, "BUILD_ID"), "utf8").trim(),
  routeCount: routeKeys.length,
  appRoutes: routeKeys,
  dynamicRoutes: routesManifest.dynamicRoutes?.length || 0,
  staticHeaders: routesManifest.headers?.length || 0,
  hashes: {
    routesManifest: hashFile(routesManifestPath),
    appPathsManifest: hashFile(appPathsPath),
  },
  contract: {
    semanticTypecheck: "required-before-proof",
    node20: process.versions.node.startsWith("20.") ? "executed" : "environment-mismatch",
    nextProductionBuild: "completed",
    artifactsExcludedFromReleaseZip: [".next", "node_modules"],
  },
};
fs.mkdirSync("docs/reports", { recursive: true });
fs.writeFileSync("docs/reports/PASS641_BUILD_PROOF.json", `${JSON.stringify(proof, null, 2)}\n`);
console.log(`PASS641 build proof written · ${proof.routeCount} app routes · build ${proof.buildId}`);
