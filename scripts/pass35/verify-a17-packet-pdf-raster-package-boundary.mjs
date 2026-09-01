#!/usr/bin/env node
process.argv.push("--raster");
await import("./verify-a17-packet-pdf-package-boundary.mjs");
