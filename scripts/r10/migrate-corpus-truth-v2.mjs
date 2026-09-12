#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrateCorpus as migrateCorpusV1 } from "./migrate-corpus-truth.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "../..");
const CORPUS_DIRS = ["smart_contract", "shield", "real_markets"];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function snapshotCorpus(root) {
  const entries = [];
  for (const surface of CORPUS_DIRS) {
    const dir = path.join(root, "reports", surface);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).filter((entry) => entry.endsWith(".json")).sort()) {
      const file = path.join(dir, name);
      entries.push({
        key: `${surface}/${name}`,
        file,
        raw: fs.readFileSync(file, "utf8"),
      });
    }
  }
  return entries;
}

function digestSnapshot(entries) {
  return `sha256:${sha256(entries.map((entry) => `${entry.key}\n${entry.raw}`).join("\n--R10-V2--\n"))}`;
}

function restoreLegacyAliases(root) {
  const dir = path.join(root, "reports", "real_markets");
  let restored = 0;
  if (!fs.existsSync(dir)) return restored;
  for (const name of fs.readdirSync(dir).filter((entry) => entry.endsWith(".json")).sort()) {
    const file = path.join(dir, name);
    const raw = fs.readFileSync(file, "utf8");
    const report = JSON.parse(raw);
    const alias = report?.marketSpec?.legacyCustomerAlias;
    if (!alias || !report?.target || report.target.tokenSymbol === alias) continue;
    report.target.tokenSymbol = alias;
    fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    restored += 1;
  }
  return restored;
}

export function migrateCorpus(root, { write = false } = {}) {
  const before = snapshotCorpus(root);
  const beforeByKey = new Map(before.map((entry) => [entry.key, entry.raw]));
  const restored = restoreLegacyAliases(root);
  let receipt;
  try {
    receipt = migrateCorpusV1(root, { write });
  } finally {
    if (!write) {
      for (const entry of before) fs.writeFileSync(entry.file, entry.raw, "utf8");
    }
  }

  const after = write ? snapshotCorpus(root) : before;
  const changedFiles = after.reduce((count, entry) => count + (beforeByKey.get(entry.key) === entry.raw ? 0 : 1), 0);
  return {
    ...receipt,
    changedFiles,
    beforeDigest: digestSnapshot(before),
    afterDigest: digestSnapshot(after),
    preflightLegacyAliasRestores: restored,
    migrationEngine: "r10-corpus-truth-v2",
  };
}

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const outputIndex = argv.indexOf("--output");
  return {
    root: rootIndex >= 0 ? path.resolve(argv[rootIndex + 1]) : DEFAULT_ROOT,
    write: argv.includes("--write"),
    output: outputIndex >= 0 ? path.resolve(argv[outputIndex + 1]) : null,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const receipt = migrateCorpus(args.root, { write: args.write });
  const output = args.output ?? path.join(args.root, "artifacts", "r10", "R10_CORPUS_TRUTH_MIGRATION_RECEIPT.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(receipt, null, 2));
}
