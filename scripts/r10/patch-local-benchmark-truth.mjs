import fs from "node:fs";
import path from "node:path";

const rel = "scripts/qa/benchmark-security-engine-v2.ts";
const abs = path.join(process.cwd(), rel);
let src = fs.readFileSync(abs, "utf8");
const before = src;

const replacements = [
  ["BLIND_HOLDOUT", "LOCAL_HOLDOUT"],
  ["Zero-Leakage Unseen Generalization Test", "In-Repository Local Holdout Check"],
  ["PARTITIONED BENCHMARK METRICS (DEV / VALIDATION / BLIND)", "PARTITIONED LOCAL BENCHMARK METRICS (DEV / VALIDATION / LOCAL HOLDOUT)"],
  ["ANTI-CHERRY-PICKING & ANTI-OVERFITTING CERTIFICATION", "LOCAL BENCHMARK HYGIENE CHECK"],
  ["Blind Holdout Integrity: Unseen test set evaluated without parameter leakage.", "Local Holdout Scope: kept outside DEV/VALIDATION inside this repository; no independence claim."],
  ["To guard against overfitting and cherry-picking, the corpus is partitioned into three rigorous subsets:", "For local regression visibility, this in-repository corpus is partitioned into three subsets:"],
  ["**LOCAL_HOLDOUT (Out-of-Sample Generalization)**: 3 contracts held blind to guarantee zero data-leakage and prove generalizeable detection on unseen patterns.", "**LOCAL_HOLDOUT (In-Repository Holdout)**: 3 repository fixtures kept outside DEV/VALIDATION scoring. This is not an independent, externally frozen, or blind benchmark."],
  ["## 2. Dataset Partitioning (DEV / VALIDATION / LOCAL_HOLDOUT)", "## 2. Local Dataset Partitioning (DEV / VALIDATION / LOCAL_HOLDOUT)"],
  ["## 6. Anti-Cherry-Picking & Anti-Overfitting Certification", "## 6. Local Benchmark Hygiene & Scope Boundary"],
];
for (const [from, to] of replacements) src = src.split(from).join(to);

// Sweep remaining variants of the same overclaim class without changing test cases or metrics.
src = src
  .replace(/zero[- ]leakage/gi, "local holdout separation")
  .replace(/unseen generalization/gi, "local holdout evaluation")
  .replace(/held blind/gi, "kept outside DEV/VALIDATION")
  .replace(/prove generalizeable/gi, "measure local")
  .replace(/prove generalizable/gi, "measure local");

const reportAnchor = "# VELMÈRE SECURITY ENGINE V2 — BENCHMARK MATRIX & STATISTICAL REPORT\n\n";
const boundary = "# VELMÈRE SECURITY ENGINE V2 — BENCHMARK MATRIX & STATISTICAL REPORT\n\n> **Truth boundary:** This is an in-repository local benchmark (N=11; local holdout N=3). It is not independent, externally frozen, blind, or sufficient evidence of production/world-class performance. Historical external R9 false negatives remain unchanged.\n\n";
if (!src.includes(reportAnchor)) throw new Error("benchmark_report_anchor_missing");
src = src.replace(reportAnchor, boundary);

const consoleAnchor = '  console.log("   VELMÈRE SECURITY ENGINE V2 — BENCHMARK & RESEARCH EVALUATION SUITE");\n';
if (!src.includes(consoleAnchor)) throw new Error("benchmark_console_anchor_missing");
src = src.replace(consoleAnchor, consoleAnchor + '  console.log("   TRUTH BOUNDARY: LOCAL IN-REPOSITORY BENCHMARK; NOT INDEPENDENT/BLIND/EXTERNAL");\n');

const forbidden = [
  /BLIND_HOLDOUT/g,
  /zero[- ]leakage/gi,
  /unseen generalization/gi,
  /ANTI-OVERFITTING CERTIFICATION/gi,
  /held blind/gi,
  /prove generalizeable/gi,
  /prove generalizable/gi,
];
const remaining = forbidden.flatMap((re) => [...src.matchAll(re)].map((m) => m[0]));
if (remaining.length) throw new Error(`benchmark_overclaim_remaining:${remaining.join(",")}`);
if (src === before) throw new Error("benchmark_truth_patch_noop");
fs.writeFileSync(abs, src);

const receipt = {
  schemaVersion: "velmere.r10.local-benchmark-truth-patch.v1",
  file: rel,
  localCorpusN: 11,
  localHoldoutN: 3,
  classification: "LOCAL_ONLY",
  independent: false,
  externallyFrozen: false,
  blind: false,
  worldClassCredit: false,
  productionCredit: false,
  historicalR9ExternalFalseNegativesPreserved: true,
};
fs.mkdirSync("artifacts/r10", { recursive: true });
fs.writeFileSync("artifacts/r10/R10_LOCAL_BENCHMARK_TRUTH_PATCH.json", JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
