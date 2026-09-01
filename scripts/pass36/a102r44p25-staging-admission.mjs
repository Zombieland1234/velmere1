#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateStagingAdmission } from "./a102r44p25-staging-admission-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p25-staging-admission-policy.json"), "utf8"));
const expected = process.argv[2] ?? process.env.VELMERE_EXPECTED_SOURCE_MANIFEST_SHA256 ?? "";
const report = evaluateStagingAdmission(process.env, policy, expected);
console.log(JSON.stringify(report, null, 2));
process.exit(report.preflightPassed ? 0 : 2);
