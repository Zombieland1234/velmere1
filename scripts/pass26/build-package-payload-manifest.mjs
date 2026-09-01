#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { cleanPayloadManifest } from "./source-boundary.mjs";

const root = process.cwd();
const result = cleanPayloadManifest(root);
const output = {
  schemaVersion: "velmere.pass26.package-payload-manifest.v2",
  generatedAt: "2026-07-20T18:30:00.000Z",
  artifactRole: "CURRENT_ENGINEERING_SOURCE_CLEAN_SAFE",
  excludedFromPayload: [
    "root generated/output directories only: .git, .velmere, node_modules, artifacts, coverage, out, build, .next, .next-pass25-*",
    "CLEAN_SAFE_VERIFICATION.json",
    "config/pass26/package-payload-manifest.json",
    "*.tsbuildinfo"
  ],
  ...result,
  truthBoundary: "Root-level generated output named build is excluded, but nested first-party source directories such as lib/build are mandatory payload and hash inputs."
};
const outputPath = path.join(root, "config/pass26/package-payload-manifest.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ files: result.files, bytes: result.bytes, treeSha256: result.treeSha256 }, null, 2));
