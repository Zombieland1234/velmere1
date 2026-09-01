#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { executeForgeAdapter } from "./audit-forge-adapter.mjs";

const args = process.argv.slice(2);
const value = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
const inputPath = value("--input");
const toolPath = value("--tool");
const outputPath = value("--output");
if (!inputPath || !toolPath || !outputPath) throw new Error("usage: --input <case.json> --tool <tool.json> --output <receipt.json>");
const root = process.cwd();
const absoluteOutput = path.resolve(root, outputPath);
const relativeOutput = path.relative(root, absoluteOutput);
if (relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) throw new Error("a6_forge_output_outside_root");
const caseInput = JSON.parse(readFileSync(path.resolve(root, inputPath), "utf8"));
const toolSpec = JSON.parse(readFileSync(path.resolve(root, toolPath), "utf8"));
if (caseInput.inputClass !== "SYNTHETIC_OFFLINE" && !relativeOutput.startsWith(`.velmere${path.sep}private-audit-cases${path.sep}`)) throw new Error("a6_forge_customer_receipt_must_use_private_evidence_root");
if (caseInput.inputClass === "SYNTHETIC_OFFLINE" && !relativeOutput.startsWith(`fixtures${path.sep}pass35${path.sep}audit-a6${path.sep}`)) throw new Error("a6_forge_synthetic_receipt_must_use_fixture_root");
const receipt = executeForgeAdapter({ rootPath: root, caseInput, toolSpec });
mkdirSync(path.dirname(absoluteOutput), { recursive: true });
writeFileSync(absoluteOutput, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: receipt.status, output: relativeOutput, receiptSha256: receipt.receiptSha256, realCaseExecution: receipt.realCaseExecution, paidGateEligible: false }, null, 2));
