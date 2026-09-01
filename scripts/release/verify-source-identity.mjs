#!/usr/bin/env node
// Compatibility alias. Source identity is valid only as part of the full PASS35 set.
import { verifyCanonicalPass35ManifestSet } from "../pass35/verify-release-manifests.mjs";

const result = verifyCanonicalPass35ManifestSet();
console.log(JSON.stringify(result, null, 2));
if (result.blockers.length) process.exitCode = 1;
