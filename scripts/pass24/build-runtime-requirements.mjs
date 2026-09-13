#!/usr/bin/env node
import fs from "node:fs";
import {
  buildRequirementsDocument,
  buildRequirementsSeal,
  encodeRequirementsDocument,
  REQUIREMENTS_PATH,
  SEAL_PATH,
  readJson,
  sha256Bytes,
  writeJson,
} from "./runtime-lib.mjs";

const check = process.argv.includes("--check");
const document = buildRequirementsDocument();
const encoded = encodeRequirementsDocument(document);
const seal = buildRequirementsSeal(document);

if (check) {
  if (!fs.existsSync(SEAL_PATH)) {
    console.error(`PASS24 requirements seal missing: ${SEAL_PATH}`);
    process.exit(1);
  }
  const committedSeal = readJson(SEAL_PATH);
  if (JSON.stringify(committedSeal) !== JSON.stringify(seal)) {
    console.error("PASS24 requirements seal drift from package-lock.json.");
    console.error(JSON.stringify({ expected: seal, committed: committedSeal }, null, 2));
    process.exit(1);
  }
} else {
  writeJson(REQUIREMENTS_PATH, document);
  writeJson(SEAL_PATH, seal);
}

console.log(`PASS24 runtime requirements: eligible=${document.counts.targetEligibleArchives} excluded=${document.counts.targetExcludedArchives} all=${document.counts.allUniqueRegistryArchives} manifestSha256=${sha256Bytes(encoded)} seal=${SEAL_PATH}`);
