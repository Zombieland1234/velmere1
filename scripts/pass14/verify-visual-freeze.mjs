#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const manifestPath = path.join(root, "config", "pass14", "visual-freeze-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
function sha256(buffer) { return createHash("sha256").update(buffer).digest("hex"); }
const rows = manifest.files.map((expected) => {
  const file = path.join(root, expected.path);
  if (!fs.existsSync(file)) return { ...expected, status: "MISSING", actualSha256: null };
  const actualSha256 = sha256(fs.readFileSync(file));
  return { ...expected, status: actualSha256 === expected.sha256 ? "PASS" : "CHANGED", actualSha256 };
});
const failed = rows.filter((row) => row.status !== "PASS");
const result = {
  schemaVersion: "velmere.pass14.visual-freeze-verification.v1",
  generatedAt: new Date().toISOString(),
  ok: failed.length === 0,
  protectedFileCount: rows.length,
  failed
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
