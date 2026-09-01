#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.cwd());
const allowed = new Set([
  "scripts/pass36/verify-a88-brain-angel-risk-eval.ts",
  "scripts/pass36/verify-a87-market-impact-whale-watch-matrix.ts",
  "scripts/pass36/verify-a86-real-markets-cross-asset-matrix.ts",
  "scripts/pass36/verify-a85-shield-pro-map-full-depth-matrix.ts",
  "scripts/pass36/verify-a84-shield-full-catalog-tier-matrix.ts",
  "scripts/pass36/verify-a83-browser-lens-pdf-real-packet-matrix.ts",
  "scripts/pass36/verify-a81-canonical-mega-matrix-orchestrator.ts",
  "scripts/pass35/test-a37-visual-runtime-performance.mjs",
  "scripts/pass35/test-a38-client-runtime-lifecycle.mjs",
  "scripts/pass35/test-a39-runtime-binding-css.mjs",
  "scripts/pass35/test-a40-session-temporal-visibility.mjs",
]);
const target = String(process.argv[2] ?? "").replaceAll("\\", "/");
if (!allowed.has(target)) {
  console.error(JSON.stringify({ status: "FAIL_A88_FORCE_EXIT_TARGET", target }, null, 2));
  process.exit(1);
}
const absolute = path.resolve(root, target);
if (!absolute.startsWith(`${root}${path.sep}`)) {
  console.error(JSON.stringify({ status: "FAIL_A88_FORCE_EXIT_PATH", target }, null, 2));
  process.exit(1);
}
try {
  await import(pathToFileURL(absolute).href);
  const exitCode = Number.isInteger(process.exitCode) ? process.exitCode : 0;
  await Promise.all([
    new Promise((resolve) => process.stdout.write("", resolve)),
    new Promise((resolve) => process.stderr.write("", resolve)),
  ]);
  process.exit(exitCode);
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
