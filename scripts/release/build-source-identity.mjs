#!/usr/bin/env node
// Compatibility alias. PASS35 publishes the complete set through one canonical implementation.
import { runCanonicalPass35ManifestBuild } from "../pass35/build-release-manifests.mjs";

console.log(JSON.stringify(runCanonicalPass35ManifestBuild(), null, 2));
