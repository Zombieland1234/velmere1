#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { verifyProviderDiagnosticEvidence } from "./a102r44p12-real-provider-diagnostic-lib.mjs";

const args = process.argv.slice(2);
const index = args.indexOf("--evidence-root");
if (index < 0 || !args[index + 1] || args.length !== 2) throw new Error("usage: verify-a102r44p12-real-provider-diagnostic.mjs --evidence-root <path>");
const result = verifyProviderDiagnosticEvidence(path.resolve(args[index + 1]));
console.log(JSON.stringify(result, null, 2));
if (result.failed) process.exit(1);
