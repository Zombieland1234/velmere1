#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "config/pass35/a54-source-manifest.json");
if (!fs.existsSync(file)) { console.error("a54 source manifest missing"); process.exit(1); }
const bytes = fs.readFileSync(file);
const manifest = JSON.parse(bytes.toString("utf8"));
const failures = [];
if (manifest.revisionId !== "VELMERE_PASS35_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE") failures.push({ error: "revision_mismatch", observed: manifest.revisionId });
if ((manifest.files ?? []).some((row) => row.path === "config/pass35/a54-source-manifest.json")) failures.push({ error: "manifest_self_reference" });
for (const row of manifest.files ?? []) {
  const absolute = path.resolve(root, row.path);
  if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) { failures.push({ path: row.path, error: "path_escape" }); continue; }
  if (!fs.existsSync(absolute)) { failures.push({ path: row.path, error: "missing" }); continue; }
  const current = fs.readFileSync(absolute);
  const digest = crypto.createHash("sha256").update(current).digest("hex");
  if (digest !== row.sha256 || current.byteLength !== row.bytes) failures.push({ path: row.path, error: "mismatch" });
}
console.log(JSON.stringify({ revisionId: manifest.revisionId, manifestSha256: crypto.createHash("sha256").update(bytes).digest("hex"), files: manifest.files?.length ?? 0, passed: (manifest.files?.length ?? 0) - failures.filter((row) => row.path).length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures.slice(0, 100), null, 2)); process.exit(1); }
