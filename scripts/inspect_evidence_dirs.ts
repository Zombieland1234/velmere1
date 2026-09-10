import fs from "node:fs";
import path from "node:path";

const evidenceDir = path.resolve("./evidence");
const dirs = fs.readdirSync(evidenceDir).filter(d => d.startsWith("AUD-CONTRACT-"));
dirs.sort();

console.log(`Found ${dirs.length} evidence dirs:`);
dirs.forEach(d => {
  const fullPath = path.join(evidenceDir, d);
  const files = fs.readdirSync(fullPath);
  let reportJson = null;
  let evidenceJson = null;
  if (files.includes("report.json")) {
    reportJson = JSON.parse(fs.readFileSync(path.join(fullPath, "report.json"), "utf8"));
  }
  if (files.includes("evidence.json")) {
    evidenceJson = JSON.parse(fs.readFileSync(path.join(fullPath, "evidence.json"), "utf8"));
  }
  console.log(`${d.padEnd(25)} | report: ${Boolean(reportJson)} | snap: ${Boolean(reportJson?.verdict?.snapshotProvenance || reportJson?.snapshotProvenance)} | cov: ${Boolean(reportJson?.verdict?.coverageTuple)} | files: ${files.join(", ")}`);
});
