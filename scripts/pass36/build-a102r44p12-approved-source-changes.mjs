import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const revisionId = "VELMERE_PASS36_A102R44P12_ACTION_REQUIRED_REAL_PUBLIC_PROVIDER_DIAGNOSTIC_15_ASSET_TWO_PROVIDER_IDENTITY_FRESHNESS_CONFLICT_AND_RIGHTS_BOUNDARY_NO_LIVE_CREDIT";
const parentRevisionId = "VELMERE_PASS36_A102R44P11_ACTION_REQUIRED_COMPILER_AST_FOUNDRY_FUZZ_INVARIANT_ANGEL_SAFETY_UI_RUNTIME_AND_FINAL_BYTE_CLOSURE_NO_LIVE_CREDIT";
const parentManifestRel = "_velmere/PASS36_A102R44P11_SOURCE_MANIFEST.json";
const ledgerRel = "config/pass36/a102r44p12-approved-source-changes.json";
const currentManifestRel = "_velmere/PASS36_A102R44P12_SOURCE_MANIFEST.json";
const parentManifestExpected = { byteLength: 1215632, sha256: "59e7be36cffdffeb4b45ead7b57daae0073f38642d3b56db208da941f62a21f1" };
const expectedAdded = new Set([
  "VELMERE_A102R44P12_PATCH.txt",
  "config/pass36/a102r44p12-a60-typescript-root-denominator-migration.json",
  "config/pass36/a102r44p12-action-required-current-state.json",
  "config/pass36/a102r44p12-browser-process-isolation-and-verifier-identity-migration.json",
  "config/pass36/a102r44p12-browser-verifier-check-identities.json",
  "config/pass36/a102r44p12-real-provider-diagnostic-policy.json",
  "config/pass36/a102r44p12-turbopack-rss-budget-migration.json",
  "lib/market-integrity/r44p12-real-provider-diagnostic-boundary.ts",
  "scripts/pass36/a102r44p12-real-provider-diagnostic-lib.mjs",
  "scripts/pass36/build-a102r44p12-approved-source-changes.mjs",
  "scripts/pass36/build-a102r44p12-source-manifest.mjs",
  "scripts/pass36/test-a102r44p12-browser-process-isolation.mjs",
  "scripts/pass36/test-a102r44p12-real-provider-diagnostic-boundary.ts",
  "scripts/pass36/test-a102r44p12-real-provider-diagnostic-tamper.mjs",
  "scripts/pass36/verify-a102r44p12-a60-typescript-root-denominator-migration.mjs",
  "scripts/pass36/verify-a102r44p12-approved-source-changes.mjs",
  "scripts/pass36/verify-a102r44p12-browser-process-isolation-and-verifier-identity-migration.mjs",
  "scripts/pass36/verify-a102r44p12-clean-unpack.mjs",
  "scripts/pass36/verify-a102r44p12-independent-final-audit.mjs",
  "scripts/pass36/verify-a102r44p12-real-provider-diagnostic.mjs",
  "scripts/pass36/verify-a102r44p12-source-authority.mjs",
  "scripts/pass36/verify-a102r44p12-static-policy.mjs",
  "scripts/pass36/verify-a102r44p12-turbopack-rss-budget-migration.mjs",
]);
const expectedModified = new Set(["VELMERE_ACTIVE_PASS.txt", "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", "config/pass36/a60-exact-final-byte-build-browser-acceptance.json", "scripts/a45-browser-acceptance.mjs", "scripts/deployment/run-segmented-build.mjs", "scripts/pass36/test-a60-exact-final-byte-build-browser-acceptance.mjs"]);
const forbiddenNames = new Set(["node_modules", ".next", ".turbo", ".cache", "coverage", "test-results", "playwright-report", "__pycache__", ".pytest_cache"]);
const sha256Bytes = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file) => sha256Bytes(fs.readFileSync(file));

function walk(dir) {
  const rows = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error(`symlink forbidden: ${rel}`);
    if (entry.isDirectory()) {
      if (forbiddenNames.has(entry.name) || entry.name.startsWith(".next-")) throw new Error(`generated directory forbidden: ${rel}`);
      rows.push(...walk(full));
    } else if (entry.isFile()) {
      if ([ledgerRel, currentManifestRel, parentManifestRel].includes(rel)) continue;
      if (/(^|\/)\.env(?:\.|$)/i.test(rel)) throw new Error(`environment file forbidden: ${rel}`);
      rows.push({ path: rel, byteLength: stat.size, sha256: sha256File(full), mode: stat.mode & 0o777 });
    } else throw new Error(`non-regular entry forbidden: ${rel}`);
  }
  return rows;
}

const parentPath = path.join(root, parentManifestRel);
if (fs.statSync(parentPath).size !== parentManifestExpected.byteLength || sha256File(parentPath) !== parentManifestExpected.sha256) throw new Error("parent manifest identity mismatch");
const parent = JSON.parse(fs.readFileSync(parentPath, "utf8"));
if (parent.revisionId !== parentRevisionId) throw new Error("parent revision mismatch");
const parentMap = new Map(parent.entries.filter((row) => row.path !== parentManifestRel).map((row) => [row.path, row]));
const current = walk(root).sort((a,b) => a.path.localeCompare(b.path));
const currentMap = new Map(current.map((row) => [row.path, row]));
const changes = [];
for (const rel of [...new Set([...parentMap.keys(), ...currentMap.keys()])].sort()) {
  const before = parentMap.get(rel);
  const after = currentMap.get(rel);
  if (!before && after) changes.push({ status: "ADDED", path: rel, after });
  else if (before && !after) changes.push({ status: "DELETED", path: rel, before });
  else if (before && after && (before.byteLength !== after.byteLength || before.sha256 !== after.sha256 || before.mode !== after.mode)) changes.push({ status: "MODIFIED", path: rel, before, after });
}
const added = changes.filter((row) => row.status === "ADDED").map((row) => row.path);
const modified = changes.filter((row) => row.status === "MODIFIED").map((row) => row.path);
const deleted = changes.filter((row) => row.status === "DELETED").map((row) => row.path);
const unexpectedAdded = added.filter((rel) => !expectedAdded.has(rel));
const missingAdded = [...expectedAdded].filter((rel) => !added.includes(rel));
const unexpectedModified = modified.filter((rel) => !expectedModified.has(rel));
const missingModified = [...expectedModified].filter((rel) => !modified.includes(rel));
if (deleted.length || unexpectedAdded.length || missingAdded.length || unexpectedModified.length || missingModified.length) {
  throw new Error(JSON.stringify({ deleted, unexpectedAdded, missingAdded, unexpectedModified, missingModified }, null, 2));
}
const changeSetSha256 = sha256Bytes(changes.map((row) => JSON.stringify(row)).join("\n") + "\n");
const ledger = {
  schemaVersion: "velmere.pass36.a102r44p12.approved-source-changes.v1",
  revisionId,
  parentRevisionId,
  parentManifest: { path: parentManifestRel, ...parentManifestExpected },
  exclusions: [ledgerRel, currentManifestRel, parentManifestRel],
  approvalPolicy: {
    exactAllowlistRequired: true,
    deletionsAllowed: false,
    generatedPathsAllowed: false,
    historicalRevisionFilesMutable: false,
    evidenceCannotOverwriteSource: true,
  },
  counts: { added: added.length, modified: modified.length, deleted: deleted.length, total: changes.length },
  expectedAdded: [...expectedAdded].sort(),
  expectedModified: [...expectedModified].sort(),
  changeSetSha256,
  changes,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
fs.writeFileSync(path.join(root, ledgerRel), JSON.stringify(ledger, null, 2) + "\n", { encoding: "utf8", mode: 0o644 });
console.log(JSON.stringify({ status: "PASS_R44P12_APPROVED_CHANGES_BUILT", revisionId, counts: ledger.counts, changeSetSha256, ledgerPath: ledgerRel }, null, 2));
