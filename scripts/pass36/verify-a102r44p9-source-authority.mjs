import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const manifestPath = path.join(root, "_velmere/PASS36_A102R44P9_SOURCE_MANIFEST.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function sha256File(p) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(p));
  return h.digest("hex");
}
function walk(dir) {
  const rows = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".turbo", ".cache"].includes(entry.name) || entry.name.startsWith(".next-")) {
        rows.push({ forbiddenDirectory: rel });
        continue;
      }
      rows.push(...walk(full));
    } else if (entry.isFile()) {
      rows.push({ path: rel, full });
    }
  }
  return rows;
}

const inventory = walk(root);
const forbidden = inventory.filter((x) => x.forbiddenDirectory || /(^|\/)\.env(?:\.|$)/i.test(x.path || ""));
const files = inventory.filter((x) => x.path && x.path !== manifest.manifestPath);
const actual = files.map(({ path: rel, full }) => {
  const stat = fs.statSync(full);
  return {
    path: rel,
    byteLength: stat.size,
    sha256: sha256File(full),
    mode: stat.mode & 0o777,
  };
}).sort((a, b) => a.path.localeCompare(b.path));
const expected = [...manifest.entries].sort((a, b) => a.path.localeCompare(b.path));
const expectedMap = new Map(expected.map((x) => [x.path, x]));
const actualMap = new Map(actual.map((x) => [x.path, x]));
const missing = expected.filter((x) => !actualMap.has(x.path)).map((x) => x.path);
const extra = actual.filter((x) => !expectedMap.has(x.path)).map((x) => x.path);
const changed = [];
for (const row of actual) {
  const exp = expectedMap.get(row.path);
  if (!exp) continue;
  if (exp.byteLength !== row.byteLength || exp.sha256 !== row.sha256) {
    changed.push({ path: row.path, expected: exp, actual: row });
  }
}

const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p9-independent-final-audit-policy.json"), "utf8"));
const checks = [
  ["revision", manifest.revisionId === policy.revisionId],
  ["parent", manifest.parentRevisionId === policy.parentRevisionId],
  ["file-count", manifest.fileCount === expected.length && actual.length === expected.length],
  ["missing-zero", missing.length === 0],
  ["extra-zero", extra.length === 0],
  ["changed-zero", changed.length === 0],
  ["forbidden-zero", forbidden.length === 0],
  ["global-no-go", policy.globalTruth?.decision === "NO_GO"],
  ["live-false", policy.globalTruth?.live === false],
  ["sale-false", policy.globalTruth?.saleEnabled === false],
  ["production-false", policy.globalTruth?.productionApproved === false],
  ["world-class-false", policy.globalTruth?.worldClassProven === false],
];
const failed = checks.filter(([, ok]) => !ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p9.source-authority-verification.v1",
  revisionId: manifest.revisionId,
  parentRevisionId: manifest.parentRevisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  sourceFiles: actual.length,
  missing,
  extra,
  changed: changed.slice(0, 50),
  forbidden: forbidden.slice(0, 50),
  pathSetSha256: crypto.createHash("sha256").update(actual.map((x) => x.path).join("\n")).digest("hex"),
  aggregateSha256: crypto.createHash("sha256").update(actual.map((x) => `${x.path}\0${x.byteLength}\0${x.sha256}\n`).join("")).digest("hex"),
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  checksDetail: checks.map(([id, ok]) => ({ id, ok })),
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
