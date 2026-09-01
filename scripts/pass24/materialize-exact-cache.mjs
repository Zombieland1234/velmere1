#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { cacheContentPath, parseCacheIndex, readJson, REQUIREMENTS_PATH, verifyCacheCoverage, writeJson } from "./runtime-lib.mjs";

function requiredValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Usage requires ${name} VALUE`);
  return path.resolve(process.argv[index + 1]);
}
const sourceCache = requiredValue("--source-cache");
const outputCache = requiredValue("--output-cache");
const npmRoot = requiredValue("--npm-root");
const reportIndex = process.argv.indexOf("--report");
const reportPath = reportIndex >= 0 && process.argv[reportIndex + 1] ? path.resolve(process.argv[reportIndex + 1]) : null;
const npmPackageJson = path.join(npmRoot, "package.json");
if (!fs.existsSync(npmPackageJson)) throw new Error(`npm root missing package.json: ${npmPackageJson}`);
const requireFromNpm = createRequire(npmPackageJson);
const cacache = requireFromNpm("cacache");
const requirements = readJson(REQUIREMENTS_PATH);
const outputCacache = path.join(outputCache, "_cacache");
const sourceIndex = parseCacheIndex(sourceCache);
const byIntegrity = new Map();
for (const [url, row] of sourceIndex) {
  if (!row.integrity) continue;
  const rows = byIntegrity.get(row.integrity) ?? [];
  rows.push({ url, row });
  byIntegrity.set(row.integrity, rows);
}
fs.rmSync(outputCache, { recursive: true, force: true });
fs.mkdirSync(outputCache, { recursive: true });
const materialized = [];
for (const requirement of requirements.targetEligible) {
  const candidates = byIntegrity.get(requirement.integrity) ?? [];
  if (candidates.length !== 1) {
    throw new Error(`PASS29 exact cache source match count ${candidates.length} for ${requirement.url}`);
  }
  const source = candidates[0];
  const contentPath = cacheContentPath(sourceCache, requirement.integrity);
  if (!contentPath || !fs.existsSync(contentPath)) throw new Error(`PASS29 source cache bytes missing for ${requirement.url}`);
  const bytes = fs.readFileSync(contentPath);
  const sourceMetadata = source.row.metadata && typeof source.row.metadata === "object" ? source.row.metadata : {};
  const metadata = {
    ...sourceMetadata,
    time: Number(sourceMetadata.time ?? Date.now()),
    url: requirement.url,
    reqHeaders: sourceMetadata.reqHeaders ?? {},
    resHeaders: sourceMetadata.resHeaders ?? {},
    options: sourceMetadata.options ?? {},
    velmereSourceCacheUrl: source.url,
  };
  await cacache.put(outputCacache, `make-fetch-happen:request-cache:${requirement.url}`, bytes, {
    integrity: requirement.integrity,
    metadata,
  });
  materialized.push({ url: requirement.url, integrity: requirement.integrity, bytes: bytes.length, sourceUrl: source.url });
}
const coverage = verifyCacheCoverage(outputCache, requirements);
const contentRoot = path.join(outputCache, "_cacache", "content-v2");
let contentFiles = 0;
const visit = (directory) => {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (entry.isFile()) contentFiles += 1;
  }
};
visit(contentRoot);
const indexEntries = parseCacheIndex(outputCache).size;
const report = {
  schemaVersion: "velmere.pass29.exact-cache-materialization.v1",
  sourceCache: path.resolve(sourceCache),
  outputCache: path.resolve(outputCache),
  npmRoot: path.resolve(npmRoot),
  required: requirements.counts.targetEligibleArchives,
  materialized: materialized.length,
  indexEntries,
  contentFiles,
  coverage: { passed: coverage.passed, required: coverage.required, coveragePercent: coverage.coveragePercent },
  noExtraIndexEntries: indexEntries === requirements.counts.targetEligibleArchives,
  noExtraContentFiles: contentFiles === new Set(requirements.targetEligible.map((row) => row.integrity)).size,
  ok: coverage.ok && materialized.length === requirements.counts.targetEligibleArchives
    && indexEntries === requirements.counts.targetEligibleArchives
    && contentFiles === new Set(requirements.targetEligible.map((row) => row.integrity)).size,
  rows: materialized,
};
if (reportPath) writeJson(reportPath, report);
console.log(`PASS29 exact cache: ${coverage.passed}/${coverage.required} index=${indexEntries} content=${contentFiles} status=${report.ok ? "PASS" : "FAIL"}`);
if (!report.ok) process.exit(1);
