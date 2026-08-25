#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { stageWebpackProxyForGenerate } from "../../lib/build/segmented-build-compat.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-segmented-build-"));
let assertions = 0;
const equal = (a, b, m) => { assert.equal(a, b, m); assertions += 1; };
try {
  const server = path.join(root, "server");
  fs.mkdirSync(server, { recursive: true });
  fs.writeFileSync(path.join(server, "middleware.js"), "module.exports = 1;\n");
  fs.writeFileSync(path.join(server, "middleware.js.nft.json"), '{"version":1}\n');
  const staged = stageWebpackProxyForGenerate(root);
  equal(staged.status, "STAGED", "bridge stages absent proxy output");
  equal(staged.copied.length, 2, "bridge copies executable and trace");
  equal(staged.copied.every((row) => !path.isAbsolute(row.source) && !path.isAbsolute(row.target)), true, "receipt paths are output-relative");
  equal(staged.copied.every((row) => row.rawAbsolutePathDisclosed === false), true, "receipt explicitly disclaims raw absolute paths");
  equal(fs.readFileSync(path.join(server, "proxy.js"), "utf8"), "module.exports = 1;\n", "proxy bytes match middleware");
  equal(fs.readFileSync(path.join(server, "proxy.js.nft.json"), "utf8"), '{"version":1}\n', "trace bytes match");
  const second = stageWebpackProxyForGenerate(root);
  equal(second.status, "NOT_REQUIRED", "existing proxy is not overwritten");
  equal(second.reason, "compiled_proxy_present", "existing proxy reason is explicit");
  console.log(JSON.stringify({ schemaVersion: "velmere.segmented-build-compat.test.v1", status: "OFFLINE-PROVEN", assertions }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
