import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "artifacts/r5/VELMERE_R5_TEST_ONLY_SHIM_BOUNDARY.json");
const SHIM = "scripts/pass11/shims/next-server.mjs";
const LOADER = "scripts/pass11/offline-ts-loader.mjs";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const productionRoots = ["app", "components", "lib", "store", "proxy.ts", "next.config.mjs"];
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);

function filesUnder(relative) {
  const absolute = path.join(ROOT, relative);
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return [relative];
  const result = [];
  const walk = (directory, prefix) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)))) {
      const child = path.join(directory, entry.name);
      const rel = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(child, rel);
      else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name).toLowerCase())) result.push(rel.split(path.sep).join("/"));
    }
  };
  walk(absolute, relative);
  return result;
}

const productionFiles = productionRoots.flatMap(filesUnder);
const forbiddenPatterns = ["scripts/pass11/shims", "next-server.mjs", "pass11-offline-route-unit"];
const productionReferences = [];
for (const relativePath of productionFiles) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  for (const pattern of forbiddenPatterns) {
    if (source.includes(pattern)) productionReferences.push({ relativePath, pattern });
  }
}
const shimBytes = fs.readFileSync(path.join(ROOT, SHIM));
const shimSource = shimBytes.toString("utf8");
const loaderBytes = fs.readFileSync(path.join(ROOT, LOADER));
const loaderSource = loaderBytes.toString("utf8");
const checks = [
  { id: "shim_file_exists", passed: fs.existsSync(path.join(ROOT, SHIM)) },
  { id: "loader_file_exists", passed: fs.existsSync(path.join(ROOT, LOADER)) },
  { id: "shim_exports_after", passed: /export\s+function\s+after\s*\(/u.test(shimSource) },
  { id: "loader_maps_next_server_to_test_shim", passed: loaderSource.includes('["next/server", path.join(root, "scripts", "pass11", "shims", "next-server.mjs")]') },
  { id: "production_source_has_no_test_shim_reference", passed: productionReferences.length === 0, detail: productionReferences },
  { id: "shim_declares_test_only_boundary", passed: shimSource.includes("test-only compatibility surface") && shimSource.includes("never imported by production code") },
];
const failures = checks.filter((check) => !check.passed);
const payload = {
  schemaVersion: "velmere.r5.test-only-next-server-shim-boundary.v1",
  generatedAt: new Date().toISOString(),
  status: failures.length ? "FAIL" : "PASS",
  scannedProductionFiles: productionFiles.length,
  shim: { path: SHIM, sha256: sha256(shimBytes) },
  loader: { path: LOADER, sha256: sha256(loaderBytes) },
  checks,
  failures,
  productionNextRuntimeCredit: false,
  customerFinalCredit: false,
  truthBoundary: "This proves only that the local compatibility surface is wired through the offline test loader and is not referenced by scanned production source. It does not prove the real Next runtime, build, browser or deployed behavior.",
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: payload.status, scannedProductionFiles: payload.scannedProductionFiles, failures: failures.length, output: path.relative(ROOT, OUT).split(path.sep).join("/") }, null, 2)}\n`);
if (failures.length) process.exit(2);
