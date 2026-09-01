#!/usr/bin/env node
import { validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";
const result = validateCurrentSourceAuthorityExact(process.cwd());
console.log(JSON.stringify({
  status: result.passed ? "PASS_CURRENT_SOURCE_AUTHORITY_EXACT" : "FAIL_CURRENT_SOURCE_AUTHORITY_EXACT",
  revisionId: result.revisionId,
  parentRevisionId: result.parentRevisionId,
  manifestPath: result.manifestPath,
  manifestSha256: result.manifestSha256,
  payload: result.payload,
  mismatches: result.mismatches,
  rejected: result.rejected,
}, null, 2));
if (!result.passed) process.exitCode = 1;
