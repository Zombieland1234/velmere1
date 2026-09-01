#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { executeSlitherAdapter } from "./audit-slither-adapter.mjs";
const root = process.cwd();
function valueAfter(flag, fallback) { const index = process.argv.indexOf(flag); return index >= 0 ? process.argv[index + 1] : fallback; }
function insideRoot(candidate) { const absolute = path.resolve(root, candidate); const relative = path.relative(root, absolute); if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`path_outside_root:${candidate}`); return absolute; }
const inputArg = valueAfter("--input", "fixtures/pass35/audit-a4/synthetic-slither-case.json");
const toolArg = valueAfter("--tool", "fixtures/pass35/audit-a4/fake-slither-tool.json");
const outputArg = valueAfter("--output", "fixtures/pass35/audit-a4/PASS35_A4_SLITHER_SYNTHETIC_RECEIPT.json");
const caseInput = JSON.parse(readFileSync(insideRoot(inputArg), "utf8"));
const toolSpec = JSON.parse(readFileSync(insideRoot(toolArg), "utf8"));
const outputPath = insideRoot(outputArg);
const outputRelative = path.relative(root, outputPath).replaceAll(path.sep, "/");
if (caseInput.inputClass === "SYNTHETIC_OFFLINE" && !outputRelative.startsWith("fixtures/pass35/audit-a4/")) throw new Error(`synthetic_output_must_stay_in_fixture_tree:${outputRelative}`);
if (caseInput.inputClass !== "SYNTHETIC_OFFLINE" && !outputRelative.startsWith(".velmere/private-audit-cases/")) throw new Error(`customer_output_must_stay_private:${outputRelative}`);
const receipt = executeSlitherAdapter({ rootPath: root, caseInput, toolSpec });
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: "PASS_AUDIT_A4_SLITHER_RUNNER", adapterStatus: receipt.status, blockers: receipt.blockers, paidGateEligible: receipt.paidGateEligible, output: outputRelative, receiptSha256: receipt.receiptSha256 }, null, 2));
