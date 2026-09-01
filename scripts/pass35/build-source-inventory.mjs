#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectPass35Inventory, sha256, canonicalJson } from "./source-inventory.mjs";

const root = process.cwd();
const outputDir = path.join(root, "_velmere/pass35");
const inventory = collectPass35Inventory(root);
if (inventory.unknownCount !== 0) throw new Error(`pass35_unknown_paths_blocked:${inventory.unknownCount}`);
const core = { ...inventory, generatedAt: new Date().toISOString() };
const sealed = { ...core, inventorySha256: sha256(canonicalJson(core)) };
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, "PASS35_SOURCE_INVENTORY.json"), `${JSON.stringify(sealed, null, 2)}\n`);
const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
const rows = [
  ["path", "role", "sourceIncluded", "reason", "byteLength", "sha256"],
  ...inventory.entries.map((entry) => [entry.path, entry.role, entry.sourceIncluded, entry.reason, entry.byteLength, entry.sha256]),
];
writeFileSync(path.join(outputDir, "PASS35_SOURCE_INVENTORY.csv"), `${rows.map((row) => row.map(escape).join(",")).join("\n")}\n`);
console.log(JSON.stringify({
  status: "PASS_STATIC_CLASSIFICATION",
  source: inventory.source,
  evidence: inventory.evidence,
  roles: inventory.roles,
  unknownCount: inventory.unknownCount,
  output: "_velmere/pass35/PASS35_SOURCE_INVENTORY.json",
}, null, 2));

if (path.resolve(process.argv[1] ?? "") !== fileURLToPath(import.meta.url)) {
  throw new Error("pass35_inventory_cli_entrypoint_mismatch");
}
