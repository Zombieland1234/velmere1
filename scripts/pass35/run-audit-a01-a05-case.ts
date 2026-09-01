#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { executePass35AuditA01A05, type Pass35AuditA01A05Input } from "../../lib/security/audit-a01-a05-engine.ts";

const root = process.cwd();
function valueAfter(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
function insideRoot(candidate: string) {
  const absolute = path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`path_outside_root:${candidate}`);
  return absolute;
}

const inputArgument = valueAfter("--input") ?? "fixtures/pass35/audit-a01-a05/synthetic-risky-upgradeable.json";
const outputArgument = valueAfter("--output") ?? "fixtures/pass35/audit-a01-a05/PASS35_A3_A01_A05_SYNTHETIC_RECEIPT.json";
const inputPath = insideRoot(inputArgument);
const outputPath = insideRoot(outputArgument);
const parsed = JSON.parse(readFileSync(inputPath, "utf8")) as Pass35AuditA01A05Input;
const outputRelative = path.relative(root, outputPath).replaceAll(path.sep, "/");
if (parsed.inputClass === "SYNTHETIC_OFFLINE" && !outputRelative.startsWith("fixtures/pass35/audit-a01-a05/")) {
  throw new Error(`synthetic_output_must_stay_in_fixture_tree:${outputRelative}`);
}
if (parsed.inputClass !== "SYNTHETIC_OFFLINE" && !outputRelative.startsWith(".velmere/private-audit-cases/")) {
  throw new Error(`customer_output_must_stay_in_private_case_store:${outputRelative}`);
}
const report = executePass35AuditA01A05(parsed);
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({
  status: "PASS_LOCAL_A01_A05_EXECUTION",
  inputClass: report.inputClass,
  caseRef: report.caseRef,
  controls: Object.fromEntries(Object.entries(report.controls).map(([id, value]) => [id, value.state])),
  staticFamilies: report.staticFamilies.map((family) => ({ familyId: family.familyId, status: family.status, findings: family.findingCount, paidGateEligible: family.paidGateEligible })),
  findings: report.summary.findings,
  bytecodeComparison: report.bytecodeComparison.status,
  paidDeliveryAllowed: report.summary.paidDeliveryAllowed,
  fullAuditClaimAllowed: report.summary.fullAuditClaimAllowed,
  output: outputRelative,
  reportSha256: report.reportSha256,
  truthBoundary: report.truthBoundary,
}, null, 2));
