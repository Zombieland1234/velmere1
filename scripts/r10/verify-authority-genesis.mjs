#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateR10AuthorityGenesis } from "./authority-genesis-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const authorityPath = path.join(root, "config/r10/authority-genesis.json");
const authority = JSON.parse(fs.readFileSync(authorityPath, "utf8"));
const validation = validateR10AuthorityGenesis(authority);
const receipt = {
  schemaVersion: "velmere.r10.authority-genesis-receipt.v1",
  status: validation.valid ? "PASS_AUTHORITY_GENESIS_POLICY" : "FAIL_AUTHORITY_GENESIS_POLICY",
  releaseAuthority: validation.releaseAuthority,
  releaseEligible: authority.releaseEligible === true && validation.releaseAuthority,
  computedAuthorityDigestSha256: validation.computedAuthorityDigestSha256,
  blockers: validation.blockers,
  truthBoundary: "Passing this verifier proves only that the explicit R10 genesis reset policy is internally coherent. CANDIDATE_NOT_RELEASE_AUTHORITY receives zero release credit.",
};
if (process.argv.includes("--write")) {
  const outIndex = process.argv.indexOf("--output");
  const output = outIndex >= 0
    ? path.resolve(process.argv[outIndex + 1])
    : path.join(root, "artifacts/r10/R10_AUTHORITY_GENESIS_RECEIPT.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n", "utf8");
}
console.log(JSON.stringify(receipt, null, 2));
if (!validation.valid) process.exit(1);
