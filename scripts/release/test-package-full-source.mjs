#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseDeterministicZip } from "../pass4826/release-package-contract.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-full-source-package-"));
const archive = path.join(root, "outside.zip");
const receipt = path.join(root, "outside.receipt.json");
const source = path.join(root, "source");
fs.mkdirSync(path.join(source, ".velmere"), { recursive: true });
fs.mkdirSync(path.join(source, ".github", "workflows"), { recursive: true });
fs.mkdirSync(path.join(source, "_velmere"), { recursive: true });
fs.mkdirSync(path.join(source, "node_modules", "ignored"), { recursive: true });
fs.mkdirSync(path.join(source, ".next-pass25-webpack", "ignored"), { recursive: true });
fs.mkdirSync(path.join(source, "artifacts", "release"), { recursive: true });
fs.writeFileSync(path.join(source, ".velmere", "orphan-quarantine-pass6.json"), "{}\n");
fs.writeFileSync(path.join(source, "_velmere", "VLM_PASS5_RELEASE_MANIFEST.json"), "{}\n");
fs.writeFileSync(path.join(source, ".github", "workflows", "pass26-exact-runtime-bridge.yml"), "name: exact\n");
fs.writeFileSync(path.join(source, "package.json"), "{}\n");
fs.writeFileSync(path.join(source, "node_modules", "ignored", "x.js"), "ignored\n");
fs.writeFileSync(path.join(source, ".next-pass25-webpack", "ignored", "x.js"), "ignored\n");
const digest = "0".repeat(64);
fs.writeFileSync(path.join(source, "artifacts", "release", "FILE_MANIFEST.csv"), [
  "path,bytes,sha256",
  `".github/workflows/pass26-exact-runtime-bridge.yml",12,${digest}`,
  `".velmere/orphan-quarantine-pass6.json",3,${digest}`,
  `"package.json",3,${digest}`,
  "",
].join("\n"));
try {
  const result = spawnSync(process.execPath, [new URL("./package-full-source.mjs", import.meta.url).pathname, "--source-root", source, "--archive", archive, "--receipt", receipt], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = parseDeterministicZip(archive);
  const names = new Set(parsed.entries.map((entry) => entry.path));
  assert.equal(names.has(".velmere/orphan-quarantine-pass6.json"), true);
  assert.equal(names.has(".github/workflows/pass26-exact-runtime-bridge.yml"), true);
  assert.equal(names.has("_velmere/VLM_PASS5_RELEASE_MANIFEST.json"), true);
  assert.equal([...names].some((name) => name.startsWith("node_modules/")), false);
  assert.equal([...names].some((name) => name.startsWith(".next-pass25-webpack/")), false);
  const data = JSON.parse(fs.readFileSync(receipt, "utf8"));
  assert.equal(data.status, "PASS");
  assert.equal(data.operationalManifestCoverage.missing, 0);
  assert.equal(data.lineage.mode, "LEGACY_EXACT");
  console.log(JSON.stringify({ schemaVersion: "velmere.full-source-package.test.v1", status: "OFFLINE-PROVEN", assertions: 9 }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
