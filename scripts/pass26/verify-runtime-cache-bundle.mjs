#!/usr/bin/env node
import path from "node:path";
import { verifyRuntimeCacheBundle } from "./runtime-bundle-lib.mjs";

const index = process.argv.indexOf("--bundle");
if (index < 0 || !process.argv[index + 1]) {
  console.error("Usage: node scripts/pass26/verify-runtime-cache-bundle.mjs --bundle PATH");
  process.exit(2);
}
const result = verifyRuntimeCacheBundle(path.resolve(process.argv[index + 1]));
console.log(JSON.stringify({ status: "PASS_RUNTIME_CACHE_BUNDLE", ...result }, null, 2));
