#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { evaluateOfficialAuditToolchain } from "../../lib/security/official-audit-toolchain-admission.mjs";

const root = process.cwd();
const admissionPolicy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p2-official-audit-toolchain-admission.json"), "utf8"));
const matrixPolicy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p2-official-toolchain-policy.json"), "utf8"));
const corpus = JSON.parse(fs.readFileSync(path.join(root, "evaluation/pass16/worldclass-base-corpus.json"), "utf8"));
const cases = corpus.cases.filter((row) => row.surface === "smart_contract_audit");
const admission = evaluateOfficialAuditToolchain(admissionPolicy, process.env, { versionReceipts: {} });
const byTool = new Map(admission.tools.map((row) => [row.toolId, row]));
const matrix = [];
for (const caseRow of cases) {
  for (const tool of matrixPolicy.tools) {
    const row = byTool.get(tool.id);
    matrix.push({
      schemaVersion: "velmere.pass36.a102r44p2.official-tool-execution-row.v2",
      rowId: `${caseRow.id}::${tool.id}`,
      caseId: caseRow.id,
      sourcePath: caseRow.input.fixture,
      expectedSourceSha256: caseRow.input.fixtureSha256,
      toolId: tool.id,
      requiredVersion: tool.requiredVersion,
      status: row?.admitted ? "ADMITTED_NOT_EXECUTED" : "NOT_RUN_TOOL_NOT_ADMITTED",
      blockers: row?.blockers ?? ["tool_admission_missing"],
      officialExecutionCredit: false,
      receiptSha256: null,
    });
  }
}
const outputIndex = process.argv.indexOf("--matrix-out");
if (outputIndex >= 0) {
  const output = path.resolve(process.argv[outputIndex + 1] ?? "");
  if (!output || output === root || output.startsWith(`${root}${path.sep}`)) throw new Error("matrix_output_must_be_outside_source_root");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${matrix.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}
const result = {
  schemaVersion: "velmere.pass36.a102r44p2.official-toolchain-probe.v2",
  status: admission.allToolsAdmitted ? "READY_EXACT_TOOLCHAIN_NO_EXECUTION_CREDIT" : "ACTION_REQUIRED_OFFICIAL_TOOLCHAIN_NOT_ADMITTED",
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  toolsRequired: admission.requiredTools,
  toolsExactReady: admission.admittedTools,
  plannedRows: matrix.length,
  readyRows: matrix.filter((row) => row.status === "ADMITTED_NOT_EXECUTED").length,
  unavailableRows: matrix.filter((row) => row.status === "NOT_RUN_TOOL_NOT_ADMITTED").length,
  officialExecutions: 0,
  officialExecutionCredit: false,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  admission,
  truthBoundary: matrixPolicy.truthBoundary,
};
console.log(JSON.stringify(result, null, 2));
