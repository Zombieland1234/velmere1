#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildRequirementsDocument, collectLockfileRequirements, readJson, POLICY_PATH } from "./runtime-lib.mjs";

const policy = readJson(POLICY_PATH);
assert.deepEqual(policy.target, { platform: "linux", arch: "x64", libc: "glibc" });
const requirements = buildRequirementsDocument();
const included = new Set(requirements.targetEligible.flatMap((row) => row.packagePaths));
const excluded = new Set(requirements.targetExcluded.flatMap((row) => row.packagePaths));
const pairs = [
  ["node_modules/@img/sharp-libvips-linux-x64", "node_modules/@img/sharp-libvips-linuxmusl-x64"],
  ["node_modules/@img/sharp-linux-x64", "node_modules/@img/sharp-linuxmusl-x64"],
  ["node_modules/@next/swc-linux-x64-gnu", "node_modules/@next/swc-linux-x64-musl"],
  ["node_modules/@parcel/watcher-linux-x64-glibc", "node_modules/@parcel/watcher-linux-x64-musl"],
  ["node_modules/@swc/core-linux-x64-gnu", "node_modules/@swc/core-linux-x64-musl"],
  ["node_modules/@unrs/resolver-binding-linux-x64-gnu", "node_modules/@unrs/resolver-binding-linux-x64-musl"],
];
let checks = 1;
for (const [glibcPath, muslPath] of pairs) {
  assert.equal(included.has(glibcPath), true, `${glibcPath} must be target eligible`);
  assert.equal(excluded.has(muslPath), true, `${muslPath} must be target excluded`);
  checks += 2;
}
const synthetic = collectLockfileRequirements({ packages: {
  "": { dependencies: { "example-glibc": "1.0.0", "example-musl": "1.0.0" } },
  "node_modules/example-glibc": { resolved: `${policy.npmRegistry}example/-/example-1.0.0.tgz`, integrity: "sha512-AA==", os: ["linux"], cpu: ["x64"], libc: ["glibc"] },
  "node_modules/example-musl": { resolved: `${policy.npmRegistry}example-musl/-/example-musl-1.0.0.tgz`, integrity: "sha512-AA==", os: ["linux"], cpu: ["x64"], libc: ["musl"] },
}}, policy);
assert.equal(synthetic.eligible.length, 1);
assert.equal(synthetic.excluded.length, 1);
checks += 2;
for (const packagePath of [
  "node_modules/@emnapi/core",
  "node_modules/@emnapi/runtime",
  "node_modules/@emnapi/wasi-threads",
  "node_modules/@napi-rs/wasm-runtime",
  "node_modules/@tybys/wasm-util",
]) {
  assert.equal(included.has(packagePath), false, `${packagePath} must not be reachable through excluded wasm32-wasi parent`);
  checks += 1;
}
console.log(`PASS29 target tuple contract: ${checks}/${checks} PASS eligible=${requirements.counts.targetEligibleArchives} excluded=${requirements.counts.targetExcludedArchives}`);
