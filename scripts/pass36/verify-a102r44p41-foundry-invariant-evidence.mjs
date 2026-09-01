#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { R44P41_REVISION, sha256File, validateR44P41ReceiptCore, verifyArtifactIndex } from "../../lib/security/r44p41-foundry-evidence.mjs";

const sourceRoot = path.resolve(process.argv[2] ?? process.cwd());
const evidenceRoot = path.resolve(process.argv[3] ?? "");
const receiptPath = path.join(evidenceRoot, "R44P41_FOUNDRY_INVARIANT_CAMPAIGN_RECEIPT.json");
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const rows = [...validateR44P41ReceiptCore(receipt), ...verifyArtifactIndex(receipt, evidenceRoot)];
const manifestPath = path.join(sourceRoot, "_velmere/PASS36_A102R44P41_SOURCE_ONLY_MANIFEST.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
rows.push({ id: "manifest-revision", passed: manifest.revisionId === R44P41_REVISION, detail: manifest.revisionId });
rows.push({ id: "manifest-sha", passed: sha256File(manifestPath) === receipt.sourceBinding.manifestSha256 });
rows.push({ id: "aggregate", passed: manifest.sourceAggregateSha256 === receipt.sourceBinding.sourceAggregateSha256 });
rows.push({ id: "path-set", passed: manifest.pathSetSha256 === receipt.sourceBinding.pathSetSha256 });
rows.push({ id: "file-count", passed: manifest.fileCount === receipt.sourceBinding.fileCount });
const failed = rows.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r44p41.foundry-invariant-evidence-verification.v1", status: failed.length ? "FAIL_R44P41_FOUNDRY_INVARIANT_EVIDENCE" : "PASS_R44P41_FOUNDRY_INVARIANT_EVIDENCE", checks: rows.length, passed: rows.length - failed.length, failed: failed.length, rows }, null, 2));
if (failed.length) process.exit(1);
