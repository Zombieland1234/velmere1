#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const values = {};
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error(`invalid_argument:${key}`);
    values[key.slice(2)] = value;
  }
  for (const key of ["source-root", "evidence-root", "second-evidence-root", "smartbugs-root", "openzeppelin-root", "typescript-root", "output"]) {
    if (!values[key]) throw new Error(`missing_argument:${key}`);
  }
  return values;
}
const args = parseArgs(process.argv);
const sourceRoot = path.resolve(args["source-root"]);
const outputPath = path.resolve(args.output);
const node = process.execPath;
const manifestPath = path.join(sourceRoot, "_velmere/PASS36_A102R44P43_SOURCE_ONLY_MANIFEST.json");
const manifestBefore = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifestBytesBefore = fs.readFileSync(manifestPath);
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const manifestFileShaBefore = sha256(manifestBytesBefore);
const rows = [];
function execute(id, script, extraArgs = []) {
  const absoluteScript = path.join(sourceRoot, ...script.split("/"));
  const startedAt = new Date().toISOString();
  const result = spawnSync(node, [absoluteScript, ...extraArgs], {
    cwd: sourceRoot,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, TZ: "UTC", LC_ALL: "C", LANG: "C" },
  });
  rows.push({
    id,
    script,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.status,
    signal: result.signal,
    passed: result.status === 0,
    stdout: result.stdout,
    stderr: result.stderr,
  });
  return result.status === 0;
}

const firstChildScript = "scripts/pass36/verify-a102r44p43-source-authority.mjs";
execute("authority-before", firstChildScript, [sourceRoot]);
execute("approved-changes", "scripts/pass36/verify-a102r44p43-approved-source-changes.mjs");
execute("current-release-pointers", "scripts/pass36/verify-a102r44p43-current-release-pointers.mjs");
execute("static-policy", "scripts/pass36/test-a102r44p43-static-policy.mjs", [path.join(path.resolve(args["evidence-root"]), "R44P43_PUBLIC_BALANCED_HOLDOUT_SUMMARY.json")]);
execute("dynamic-scorecard", "scripts/pass36/verify-a102r44p43-dynamic-scorecard.mjs");
execute("targeted-typescript", "scripts/pass36/test-a102r44p43-targeted-typescript.mjs", ["--source-root", sourceRoot, "--typescript-root", path.resolve(args["typescript-root"])]);
execute("repeatability", "scripts/pass36/verify-a102r44p43-repeatability.mjs", [path.resolve(args["evidence-root"]), path.resolve(args["second-evidence-root"])]);
execute("holdout-evidence", "scripts/pass36/verify-a102r44p43-public-balanced-holdout.mjs", ["--evidence-root", path.resolve(args["evidence-root"]), "--smartbugs-root", path.resolve(args["smartbugs-root"]), "--openzeppelin-root", path.resolve(args["openzeppelin-root"])]);
execute("tamper-suite", "scripts/pass36/test-a102r44p43-public-balanced-holdout-tamper.mjs", ["--evidence-root", path.resolve(args["evidence-root"]), "--smartbugs-root", path.resolve(args["smartbugs-root"]), "--openzeppelin-root", path.resolve(args["openzeppelin-root"])]);
execute("authority-after", firstChildScript, [sourceRoot]);

const manifestAfter = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifestFileShaAfter = sha256(fs.readFileSync(manifestPath));
const failedRows = rows.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p43.clean-unpack-sequence.v1",
  status: failedRows.length === 0 && manifestBefore.sourceAggregateSha256 === manifestAfter.sourceAggregateSha256 && manifestFileShaBefore === manifestFileShaAfter
    ? "PASS_R44P43_CLEAN_UNPACK_SEQUENCE"
    : "FAIL_R44P43_CLEAN_UNPACK_SEQUENCE",
  firstChildLiteral: rows[0]?.script === firstChildScript,
  firstChildScript,
  node: process.version,
  requiredSteps: rows.length,
  passedSteps: rows.length - failedRows.length,
  failedSteps: failedRows.length,
  sourceAggregateBefore: manifestBefore.sourceAggregateSha256,
  sourceAggregateAfter: manifestAfter.sourceAggregateSha256,
  manifestFileShaBefore,
  manifestFileShaAfter,
  sourceImmutable: manifestBefore.sourceAggregateSha256 === manifestAfter.sourceAggregateSha256 && manifestFileShaBefore === manifestFileShaAfter,
  rows,
  failedRows,
  liveCredit: false,
  saleCredit: false,
  worldClassCredit: false,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ ...receipt, rows: rows.map(({ stdout, stderr, ...row }) => row) }, null, 2)}\n`);
if (receipt.status.startsWith("FAIL")) process.exit(1);
