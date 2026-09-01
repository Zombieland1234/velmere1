#!/usr/bin/env node
import assert from "node:assert/strict";
import { classifyPass35Path } from "./source-inventory.mjs";

const cases = [
  ["artifacts/pass35/local-product-quality/.pdf-corpus-generation.lock", "GENERATED"],
  ["artifacts/pass35/local-product-quality/pdf-corpus.tmp-123-456", "GENERATED"],
  ["artifacts/pass35/local-product-quality/pdf-corpus.tmp-123-456/basic/a.pdf", "GENERATED"],
  ["artifacts/release/SOURCE_IDENTITY.json.123.tmp-99", "GENERATED"],
  ["artifacts/release/report.partial", "GENERATED"],
  ["artifacts/pass35/pdf-corpus", "GENERATED"],
  ["artifacts/pass35/pdf-corpus/basic/a.pdf", "GENERATED"],
  ["artifacts/pass35/renders", "GENERATED"],
  ["artifacts/pass35/renders/basic-first-pages-contact-sheet.png", "GENERATED"],
];
for (const [filePath, expectedRole] of cases) {
  const result = classifyPass35Path(filePath);
  assert.equal(result.role, expectedRole, filePath);
  assert.equal(result.sourceIncluded, false, filePath);
}
assert.equal(classifyPass35Path("package-lock.json").role, "ACTIVE_SOURCE");
assert.equal(classifyPass35Path("config/example.lock.json").role, "ACTIVE_SOURCE");
console.log(JSON.stringify({
  status: "PASS_TRANSIENT_INVENTORY_EXCLUSION",
  checks: cases.length + 2,
  transientFilesExcluded: true,
  packageLockPreserved: true,
}, null, 2));
