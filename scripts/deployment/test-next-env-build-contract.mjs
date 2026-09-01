#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  expectedNextEnvForDistDir,
  inspectManagedNextEnv,
  restoreManagedNextEnv,
  stageManagedNextEnv,
} from "../../lib/build/next-env-build-contract.mjs";

let assertions = 0;
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); assertions += 1; };
const throws = (fn, pattern, message) => { assert.throws(fn, pattern, message); assertions += 1; };
const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-next-env-contract-"));
const canonical = [
  '/// <reference types="next" />',
  '/// <reference types="next/image-types/global" />',
  'import "./.next/types/routes.d.ts";',
  "",
  "// NOTE: This file should not be edited",
  "// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.",
  "",
].join("\n");
fs.writeFileSync(path.join(root, "next-env.d.ts"), canonical);
try {
  const webpackState = stageManagedNextEnv(root, ".next-pass25-webpack");
  equal(fs.readFileSync(webpackState.filePath, "utf8"), expectedNextEnvForDistDir(".next-pass25-webpack"), "webpack staging is exact");
  equal(inspectManagedNextEnv(webpackState).exactExpectedContent, true, "expected webpack content accepted");
  fs.writeFileSync(webpackState.filePath, "unexpected mutation\n");
  equal(inspectManagedNextEnv(webpackState).exactExpectedContent, false, "unexpected mutation rejected");
  equal(restoreManagedNextEnv(webpackState).restored, true, "canonical content restored");
  equal(fs.readFileSync(webpackState.filePath, "utf8"), canonical, "restored bytes equal canonical bytes");

  const turboState = stageManagedNextEnv(root, ".next-pass25-turbopack");
  equal(inspectManagedNextEnv(turboState).exactExpectedContent, true, "turbopack staging accepted");
  equal(restoreManagedNextEnv(turboState).restored, true, "turbopack canonical restore");
  throws(() => expectedNextEnvForDistDir(".next"), /invalid_dist_dir/u, "generic output rejected");
  console.log(JSON.stringify({ schemaVersion: "velmere.next-env-build-contract.v1", status: "OFFLINE-PROVEN", assertions }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
