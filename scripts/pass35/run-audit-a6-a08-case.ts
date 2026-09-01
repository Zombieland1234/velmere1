#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { executeModelFuzzInvariants, type Pass35A6A08Case } from "../../lib/security/audit-a08-model-fuzz.ts";

const args = process.argv.slice(2);
const value = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
const inputPath = value("--input");
const outputPath = value("--output");
if (!inputPath || !outputPath) throw new Error("usage: --input <case.json> --output <receipt.json>");
const root = process.cwd();
const absoluteInput = path.resolve(root, inputPath);
const absoluteOutput = path.resolve(root, outputPath);
const relativeOutput = path.relative(root, absoluteOutput);
if (relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) throw new Error("a6_a08_output_outside_root");
const input = JSON.parse(readFileSync(absoluteInput, "utf8")) as Pass35A6A08Case;
if (input.inputClass !== "SYNTHETIC_OFFLINE" && !relativeOutput.startsWith(`.velmere${path.sep}private-audit-cases${path.sep}`)) throw new Error("a6_a08_customer_receipt_must_use_private_evidence_root");
if (input.inputClass === "SYNTHETIC_OFFLINE" && !relativeOutput.startsWith(`fixtures${path.sep}pass35${path.sep}audit-a6${path.sep}`)) throw new Error("a6_a08_synthetic_receipt_must_use_fixture_root");
const receipt = executeModelFuzzInvariants(input);
mkdirSync(path.dirname(absoluteOutput), { recursive: true });
writeFileSync(absoluteOutput, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: receipt.execution.status, output: relativeOutput, receiptSha256: receipt.receiptSha256, paidGateEligible: false }, null, 2));
