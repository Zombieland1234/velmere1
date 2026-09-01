import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(ROOT, "_velmere", "PASS36_A102R44P15_SOURCE_ONLY_MANIFEST.json");
const diagnosticRoot = path.join(ROOT, ".velmere", "r44p15-source-boundary-test");
const diagnosticPath = path.join(diagnosticRoot, "generated-diagnostic.json");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const manifestBytesBefore = fs.readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytesBefore.toString("utf8"));
const manifestSha256Before = sha256(manifestBytesBefore);

fs.rmSync(diagnosticRoot, { recursive: true, force: true });
fs.mkdirSync(diagnosticRoot, { recursive: true });
fs.writeFileSync(diagnosticPath, `${JSON.stringify({ generated: true, sourceAuthority: false })}\n`, { encoding: "utf8", flag: "wx" });

const run = spawnSync(process.execPath, ["scripts/pass36/verify-a102r44p15-source-authority.mjs"], {
  cwd: ROOT,
  encoding: "utf8",
  timeout: 60_000,
  maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, NODE_OPTIONS: "" },
});
let parsed = null;
try { parsed = JSON.parse(run.stdout || "{}"); } catch { /* reported by exact binding check */ }
const verifierRows = new Map(Array.isArray(parsed?.rows) ? parsed.rows.map((row) => [row.id, row]) : []);
const assertions = [];
const check = (id, ok, detail = null) => assertions.push({ id, ok: Boolean(ok), detail });
check("diagnostic-created", fs.existsSync(diagnosticPath));
check("manifest-excludes-generated-diagnostic", !manifest.entries.some((row) => row.path === ".velmere/r44p15-source-boundary-test/generated-diagnostic.json"));
check("verifier-exit-zero", run.status === 0 && String(run.stderr || "").length === 0, { exitCode: run.status, stderrBytes: Buffer.byteLength(String(run.stderr || "")) });
check("verifier-exact-manifest-binding", parsed?.status === "PASS"
  && parsed?.failed === 0
  && parsed?.fileCount === manifest.fileCount
  && parsed?.aggregateSha256 === manifest.aggregateSha256
  && parsed?.manifestSha256 === manifestSha256Before
  && verifierRows.get("missing-zero")?.ok === true
  && verifierRows.get("extra-zero")?.ok === true
  && verifierRows.get("changed-zero")?.ok === true,
{ expectedFileCount: manifest.fileCount, actualFileCount: parsed?.fileCount, expectedAggregate: manifest.aggregateSha256, actualAggregate: parsed?.aggregateSha256 });
fs.rmSync(diagnosticRoot, { recursive: true, force: true });
const manifestSha256After = sha256(fs.readFileSync(manifestPath));
check("cleanup-and-authority-immutability", !fs.existsSync(diagnosticPath)
  && manifestSha256After === manifestSha256Before
  && parsed?.sourceImmutable === true,
{ manifestSha256Before, manifestSha256After });

const failed = assertions.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p15.generated-diagnostics-source-boundary-test.v2",
  status: failed.length ? "FAIL" : "PASS",
  checks: assertions.length,
  passed: assertions.length - failed.length,
  failed: failed.length,
  generatedPath: ".velmere/r44p15-source-boundary-test/generated-diagnostic.json",
  sourceAuthorityExcluded: run.status === 0,
  exactManifestBinding: failed.every((row) => row.id !== "verifier-exact-manifest-binding"),
  rows: assertions,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
