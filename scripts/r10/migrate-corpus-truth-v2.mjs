#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrateCorpus as migrateCorpusV1 } from "./migrate-corpus-truth.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "../..");

function withLegacyAliasesRestored(root, write, callback) {
  const dir = path.join(root, "reports", "real_markets");
  const backups = [];
  let restored = 0;
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir).filter((entry) => entry.endsWith(".json")).sort()) {
      const file = path.join(dir, name);
      const raw = fs.readFileSync(file, "utf8");
      const report = JSON.parse(raw);
      const alias = report?.marketSpec?.legacyCustomerAlias;
      if (!alias || !report?.target || report.target.tokenSymbol === alias) continue;
      report.target.tokenSymbol = alias;
      backups.push([file, raw]);
      fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      restored += 1;
    }
  }
  try {
    const receipt = callback();
    return { ...receipt, preflightLegacyAliasRestores: restored, migrationEngine: "r10-corpus-truth-v2" };
  } finally {
    if (!write) {
      for (const [file, raw] of backups) fs.writeFileSync(file, raw, "utf8");
    }
  }
}

export function migrateCorpus(root, { write = false } = {}) {
  return withLegacyAliasesRestored(root, write, () => migrateCorpusV1(root, { write }));
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
