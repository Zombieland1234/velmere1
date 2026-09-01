#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { executePinnedSolcReproduction, type Pass35A4SolcCase, type Pass35A4ToolSpec } from "../../lib/security/audit-a02-solc-reproduction.ts";

const root = process.cwd();
function valueAfter(flag: string, fallback?: string) { const index = process.argv.indexOf(flag); return index >= 0 ? process.argv[index + 1] : fallback; }
function insideRoot(candidate: string) { const absolute = path.resolve(root, candidate); const relative = path.relative(root, absolute); if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`path_outside_root:${candidate}`); return absolute; }
const inputArg = valueAfter("--input", "fixtures/pass35/audit-a4/synthetic-solc-case.json")!;
const toolArg = valueAfter("--tool", "fixtures/pass35/audit-a4/fake-solc-tool.json")!;
const outputArg = valueAfter("--output", "fixtures/pass35/audit-a4/PASS35_A4_SOLC_SYNTHETIC_RECEIPT.json")!;
const input = JSON.parse(readFileSync(insideRoot(inputArg), "utf8")) as Pass35A4SolcCase;
const tool = JSON.parse(readFileSync(insideRoot(toolArg), "utf8")) as Pass35A4ToolSpec;
const outputPath = insideRoot(outputArg);
const outputRelative = path.relative(root, outputPath).replaceAll(path.sep, "/");
if (input.inputClass === "SYNTHETIC_OFFLINE" && !outputRelative.startsWith("fixtures/pass35/audit-a4/")) throw new Error(`synthetic_output_must_stay_in_fixture_tree:${outputRelative}`);
if (input.inputClass !== "SYNTHETIC_OFFLINE" && !outputRelative.startsWith(".velmere/private-audit-cases/")) throw new Error(`customer_output_must_stay_private:${outputRelative}`);
const receipt = executePinnedSolcReproduction(input, tool, { rootPath: root });
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: "PASS_AUDIT_A4_SOLC_RUNNER", comparison: receipt.comparison.status, blockers: receipt.blockers, paidGateEligible: receipt.paidGateEligible, output: outputRelative, receiptSha256: receipt.receiptSha256 }, null, 2));
