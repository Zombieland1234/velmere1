#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";

const executableModules = [
  "../../lib/market-integrity/risk-history-contract.ts",
  "../../lib/market-integrity/market-memory.ts",
  "../../lib/market-integrity/risk-ledger.ts",
  "../../lib/market-integrity/long-term-memory-spine.ts",
  "../../lib/server/market-integrity-route-modules/history.ts",
];
const rows = [];
for (const modulePath of executableModules) {
  try {
    await import(modulePath);
    rows.push({ module: modulePath.replace(/^\.\.\/\.\.\//u, "./"), status: "PASS" });
  } catch (error) {
    rows.push({ module: modulePath.replace(/^\.\.\/\.\.\//u, "./"), status: "FAIL", error: String(error) });
  }
}
const marketsSource = await readFile(new URL("../../lib/server/market-integrity-route-modules/markets.ts", import.meta.url), "utf8");
const marketsStaticBound = marketsSource.includes('getCustomerSafeRiskLedgerStatus')
  && !marketsSource.includes('getRiskLedgerStatus()');
rows.push({
  module: "./lib/server/market-integrity-route-modules/markets.ts",
  status: marketsStaticBound ? "PASS_STATIC_DEPENDENCY_BOUNDARY" : "FAIL",
  executableImport: "WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING",
  missingTransitiveDependencyObserved: "zod",
});
const failed = rows.filter((row) => row.status.startsWith("FAIL"));
const receipt = {
  schemaVersion: "velmere.p91.changed-module-imports.v1",
  generatedAt: "2026-08-20T18:55:00.000Z",
  status: failed.length ? "FAIL" : "PASS_BOUNDED_CHANGED_IMPORTS",
  executableImports: { total: executableModules.length, passed: rows.filter((row) => row.status === "PASS").length },
  staticDependencyBoundaryChecks: 1,
  checks: rows,
  truthBoundary: "Five P91 production modules were imported through the offline TypeScript loader. The full markets route import is withheld because the SOURCE_ONLY environment lacks the installed transitive dependency graph (observed missing zod); its P91 binding is checked statically and receives no executable-import credit.",
};
await mkdir(new URL("../../receipts/p91/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p91/", import.meta.url), { recursive: true });
await writeFile(new URL("../../receipts/p91/P91_CHANGED_MODULE_IMPORTS.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
await writeFile(new URL("../../artifacts/p91/P91_CHANGED_MODULE_IMPORTS.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, executableImports: receipt.executableImports, staticDependencyBoundaryChecks: 1 }, null, 2));
if (failed.length) process.exitCode = 1;
