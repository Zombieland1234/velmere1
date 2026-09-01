#!/usr/bin/env node
import fs from "node:fs";
import { evaluateOfficialAuditToolchain } from "../../lib/security/official-audit-toolchain-admission.mjs";

const policy = JSON.parse(fs.readFileSync("config/pass36/a102r44p2-official-audit-toolchain-admission.json", "utf8"));
const receipt = evaluateOfficialAuditToolchain(policy, process.env);
console.log(JSON.stringify(receipt, null, 2));
if (process.argv.includes("--require-all") && !receipt.allToolsAdmitted) process.exit(1);
