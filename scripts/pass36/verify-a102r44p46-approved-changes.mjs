#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { APPROVED_PATH, deriveApprovedChanges } from "./build-a102r44p46-approved-changes.mjs";

const root = path.resolve(process.argv[2] ?? process.cwd());
const expected = deriveApprovedChanges(root);
const actual = JSON.parse(fs.readFileSync(path.join(root, APPROVED_PATH), "utf8"));
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const exact = JSON.stringify(stable(actual)) === JSON.stringify(stable(expected));
const pass = exact && actual.deletedFiles === 0 && actual.testsOrGatesRemoved === 0 && actual.denominatorCollapse === false && actual.LIVE === false && actual.saleEnabled === false && actual.productionApproved === false && actual.worldClassProven === false;
process.stdout.write(`${JSON.stringify({ status: pass ? "PASS_R44P46_APPROVED_CHANGES" : "FAIL_R44P46_APPROVED_CHANGES", pass, changedPathCount: expected.changedPathCount, added: expected.addedFiles, modified: expected.modifiedFiles, deleted: expected.deletedFiles, exact }, null, 2)}\n`);
if (!pass) process.exitCode = 1;
