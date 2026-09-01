#!/usr/bin/env node
// Compatibility alias. PASS35 verifies or regenerates the complete canonical set.
import { runCanonicalPass35ManifestBuild } from "../pass35/build-release-manifests.mjs";
import { verifyCanonicalPass35ManifestSet } from "../pass35/verify-release-manifests.mjs";

if (process.argv.includes("--verify")) {
  const result = verifyCanonicalPass35ManifestSet();
  console.log(JSON.stringify(result, null, 2));
  if (result.blockers.length) process.exitCode = 1;
} else {
  console.log(JSON.stringify(runCanonicalPass35ManifestBuild(), null, 2));
}
