#!/usr/bin/env node
// Compatibility alias. Partial evidence-only publication is intentionally disabled.
import { runCanonicalPass35ManifestBuild } from "../pass35/build-release-manifests.mjs";

console.log(JSON.stringify(runCanonicalPass35ManifestBuild(), null, 2));
