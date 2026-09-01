#!/usr/bin/env node
import fs from "node:fs";
import { buildRequirementsDocument, REQUIREMENTS_PATH, sha256Bytes, writeJson } from "./runtime-lib.mjs";

const check = process.argv.includes("--check");
const document = buildRequirementsDocument();
const encoded = `${JSON.stringify(document, null, 2)}\n`;
if (check) {
  if (!fs.existsSync(REQUIREMENTS_PATH)) {
    console.error(`PASS24 requirements missing: ${REQUIREMENTS_PATH}`);
    process.exit(1);
  }
  const current = fs.readFileSync(REQUIREMENTS_PATH, "utf8");
  if (current !== encoded) {
    console.error("PASS24 requirements drift from package-lock.json.");
    process.exit(1);
  }
} else {
  writeJson(REQUIREMENTS_PATH, document);
}
console.log(`PASS24 runtime requirements: eligible=${document.counts.targetEligibleArchives} excluded=${document.counts.targetExcludedArchives} all=${document.counts.allUniqueRegistryArchives} sha256=${sha256Bytes(encoded)}`);
