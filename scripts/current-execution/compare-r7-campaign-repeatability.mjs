import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); if (i < 0) throw new Error(`missing --${name}`); return process.argv[i + 1]; };
const a = JSON.parse(fs.readFileSync(arg("run1"), "utf8"));
const b = JSON.parse(fs.readFileSync(arg("run2"), "utf8"));
const out = path.resolve(arg("output"));
if (a.denominator !== 52 || b.denominator !== 52) throw new Error("denominator mismatch");
const by = (x) => new Map(x.results.map((r) => [r.file, r]));
const ma = by(a), mb = by(b); const files = [...ma.keys()].sort();
if (files.length !== 52 || files.some((f) => !mb.has(f))) throw new Error("path set mismatch");
const rows = files.map((file) => {
  const x = ma.get(file), y = mb.get(file);
  return { file, classificationStable: x.classification === y.classification, exitCodeStable: x.exitCode === y.exitCode, stdoutStable: x.stdoutSha256 === y.stdoutSha256, stderrStable: x.stderrSha256 === y.stderrSha256 };
});
const receipt = {
  schemaVersion: "velmere.r7.current-execution-repeatability.v1",
  generatedAt: new Date().toISOString(),
  denominator: 52,
  classificationStable: rows.filter((r) => r.classificationStable).length,
  exitCodeStable: rows.filter((r) => r.exitCodeStable).length,
  stdoutStable: rows.filter((r) => r.stdoutStable).length,
  stderrStable: rows.filter((r) => r.stderrStable).length,
  allPassBothRuns: a.summary.PASS === 52 && b.summary.PASS === 52,
  rows,
};
receipt.status = receipt.classificationStable === 52 && receipt.exitCodeStable === 52 && receipt.allPassBothRuns ? "PASS" : "FAIL";
receipt.integritySha256 = crypto.createHash("sha256").update(JSON.stringify({ ...receipt, integritySha256: undefined })).digest("hex");
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({status:receipt.status,classificationStable:receipt.classificationStable,exitCodeStable:receipt.exitCodeStable,stdoutStable:receipt.stdoutStable,stderrStable:receipt.stderrStable,output:out},null,2));
if (receipt.status !== "PASS") process.exitCode = 2;
