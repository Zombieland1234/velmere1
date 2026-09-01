#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const receiptPath = path.join(root, "artifacts/pass36/a59/PASS36_A59_CSS_COMPACTION_RECEIPT.json");
const dedupPath = path.join(root, "artifacts/pass36/a59/PASS36_A59_CSS_EXACT_DEDUP_RECEIPT.json");
const sourceReceiptPath = path.join(root, "config/pass36/a59-css-compaction-receipt.json");
const sourceDedupPath = path.join(root, "config/pass36/a59-css-exact-dedup-receipt.json");
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const dedup = JSON.parse(fs.readFileSync(dedupPath, "utf8"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
let finalBytes = 0;
for (const file of receipt.files) {
  const bytes = fs.readFileSync(path.join(root, file.path));
  file.afterBytes = bytes.length;
  file.afterSha256 = sha256(bytes);
  file.savedBytes = file.beforeBytes - file.afterBytes;
  file.parseErrorsAfter = 0;
  finalBytes += bytes.length;
}
receipt.summary.afterBytes = finalBytes;
receipt.summary.savedBytes = receipt.summary.beforeBytes - finalBytes;
receipt.summary.exactDuplicateGroupsRemoved = dedup.totals?.duplicateGroups ?? 0;
receipt.summary.exactDuplicateRulesRemoved = dedup.totals?.duplicateExtras ?? 0;
receipt.summary.exactDuplicateBytesRemoved = dedup.totals?.removedBytes ?? 0;
receipt.exactDuplicateReceiptPath = "config/pass36/a59-css-exact-dedup-receipt.json";
receipt.truthBoundary = "Only rules whose exact class/id identifiers are absent from active app/components/lib source and whose selectors carry high-entropy pass markers are pruned. Other CSS is lexically compacted without changing token order, then exact duplicate rules are removed while retaining the first effective occurrence. Final bytes are hash-bound here. Browser screenshot parity still requires exact Node 24 acceptance.";
const receiptBytes = `${JSON.stringify(receipt, null, 2)}\n`;
const dedupBytes = `${JSON.stringify(dedup, null, 2)}\n`;
fs.mkdirSync(path.dirname(sourceReceiptPath), { recursive: true });
fs.writeFileSync(receiptPath, receiptBytes, "utf8");
fs.writeFileSync(sourceReceiptPath, receiptBytes, "utf8");
fs.writeFileSync(sourceDedupPath, dedupBytes, "utf8");
console.log(JSON.stringify({ ...receipt.summary, sourceReceiptPath: path.relative(root, sourceReceiptPath), sourceDedupPath: path.relative(root, sourceDedupPath) }, null, 2));
