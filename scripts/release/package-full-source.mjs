#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { parseDeterministicZip, writeDeterministicZip } from "../pass4826/release-package-contract.mjs";
import { validateGenesis } from "../pass36/a77-clean-root-migration-lib.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalize = (value) => value.split(path.sep).join("/");
const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`argument_value_missing:${name}`);
  return value;
};

const sourceRoot = path.resolve(argument("--source-root", "."));
const archivePath = path.resolve(argument("--archive", "../VELMERE_FULL_SOURCE.zip"));
const receiptPath = path.resolve(argument("--receipt", `${archivePath}.receipt.json`));
const manifestPath = path.join(sourceRoot, "artifacts", "release", "FILE_MANIFEST.csv");
const excludedDirectoryNames = new Set([".git", "node_modules", ".turbo", ".vercel", "coverage", "dist", "out"]);
const dynamicExcluded = new Set([archivePath, receiptPath].map((value) => path.resolve(value)));

function isGeneratedBuildDirectory(name) {
  return name === ".next" || name.startsWith(".next-pass25-");
}

function csvPaths(csvText) {
  const lines = csvText.trimEnd().split(/\r?\n/u);
  if (lines.shift() !== "path,bytes,sha256") throw new Error("full_source_manifest_header_invalid");
  return lines.map((line) => {
    const match = line.match(/^"((?:[^"]|"")*)",\d+,[a-f0-9]{64}$/u) ?? line.match(/^([^,]+),\d+,[a-f0-9]{64}$/u);
    if (!match) throw new Error(`full_source_manifest_row_invalid:${line.slice(0, 160)}`);
    return match[1].replaceAll('""', '"');
  });
}

function collect(directory, prefix = "", entries = []) {
  for (const dirent of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const relativePath = prefix ? `${prefix}/${dirent.name}` : dirent.name;
    const absolutePath = path.join(directory, dirent.name);
    if (dynamicExcluded.has(path.resolve(absolutePath))) continue;
    if (dirent.isDirectory() && (excludedDirectoryNames.has(dirent.name) || isGeneratedBuildDirectory(dirent.name))) continue;
    const metadata = fs.lstatSync(absolutePath);
    if (metadata.isSymbolicLink()) throw new Error(`full_source_symlink_forbidden:${relativePath}`);
    if (metadata.isDirectory()) {
      collect(absolutePath, relativePath, entries);
      continue;
    }
    if (!metadata.isFile()) throw new Error(`full_source_special_file_forbidden:${relativePath}`);
    const content = fs.readFileSync(absolutePath);
    entries.push({ path: normalize(relativePath), content, mode: (metadata.mode & 0o111) === 0 ? 0o100644 : 0o100755 });
  }
  return entries;
}

if (!fs.existsSync(manifestPath)) throw new Error("full_source_file_manifest_missing");
const sourceEntries = collect(sourceRoot).sort((a, b) => a.path.localeCompare(b.path, "en"));
const sourceMap = new Map(sourceEntries.map((entry) => [entry.path, entry]));
const requiredPaths = csvPaths(fs.readFileSync(manifestPath, "utf8"));
const missingRequiredPaths = requiredPaths.filter((requiredPath) => !sourceMap.has(requiredPath));
if (missingRequiredPaths.length > 0) throw new Error(`full_source_manifest_coverage_failed:${missingRequiredPaths.slice(0, 20).join("|")}`);
const legacyLineagePresent = sourceMap.has(".velmere/orphan-quarantine-pass6.json") && sourceMap.has("_velmere/VLM_PASS5_RELEASE_MANIFEST.json");
const cleanRootGenesisPath = "config/pass36/a77-clean-root-genesis.json";
let cleanRootValidated = false;
let cleanRootValidationFailures = [];
if (sourceMap.has(cleanRootGenesisPath) && sourceMap.has("config/pass36/a77-clean-root-migration-policy.json")) {
  try {
    const policy = JSON.parse(sourceMap.get("config/pass36/a77-clean-root-migration-policy.json").content.toString("utf8"));
    const genesis = JSON.parse(sourceMap.get(cleanRootGenesisPath).content.toString("utf8"));
    const validation = validateGenesis(sourceRoot, genesis, policy);
    cleanRootValidated = validation.passed;
    cleanRootValidationFailures = validation.checks.filter((row) => !row.passed);
  } catch (error) { cleanRootValidationFailures = [error instanceof Error ? error.message : String(error)]; }
}
if (!legacyLineagePresent && !cleanRootValidated) throw new Error(`full_source_lineage_root_missing_or_invalid:${JSON.stringify(cleanRootValidationFailures).slice(0,1000)}`);
const lineageMode = legacyLineagePresent ? "LEGACY_EXACT" : "A77_CLEAN_ROOT";
if (!sourceMap.has(".github/workflows/pass26-exact-runtime-bridge.yml")) throw new Error("full_source_hidden_dot_github_missing");

const before = sourceEntries.map(({ path: entryPath, content, mode }) => ({ path: entryPath, sha256: sha256(content), byteLength: content.length, mode }));
const archive = writeDeterministicZip(archivePath, sourceEntries, { overwrite: true });
const parsed = parseDeterministicZip(archivePath);
const parsedMap = new Map(parsed.entries.map((entry) => [entry.path, entry]));
const missingArchivePaths = sourceEntries.filter((entry) => !parsedMap.has(entry.path)).map((entry) => entry.path);
const mismatchedArchivePaths = sourceEntries.filter((entry) => {
  const archived = parsedMap.get(entry.path);
  return archived && (archived.sha256 !== sha256(entry.content) || archived.mode !== entry.mode);
}).map((entry) => entry.path);
const extraArchivePaths = parsed.entries.filter((entry) => !sourceMap.has(entry.path)).map((entry) => entry.path);
const sourceEntriesAfter = collect(sourceRoot).sort((a, b) => a.path.localeCompare(b.path, "en"));
const after = sourceEntriesAfter.map(({ path: entryPath, content, mode }) => ({ path: entryPath, sha256: sha256(content), byteLength: content.length, mode }));
const sourceBeforeSha256 = sha256(JSON.stringify(before));
const sourceAfterSha256 = sha256(JSON.stringify(after));
const status = missingArchivePaths.length === 0 && mismatchedArchivePaths.length === 0 && extraArchivePaths.length === 0 && sourceBeforeSha256 === sourceAfterSha256 ? "PASS" : "FAIL";
const receipt = {
  schemaVersion: "velmere.full-source-package.v1",
  status,
  sourceRoot,
  sourceBeforeSha256,
  sourceAfterSha256,
  sourceUnchanged: sourceBeforeSha256 === sourceAfterSha256,
  sourceFiles: sourceEntries.length,
  sourceBytes: sourceEntries.reduce((sum, entry) => sum + entry.content.length, 0),
  operationalManifestCoverage: { required: requiredPaths.length, missing: missingRequiredPaths.length },
  lineage: { mode: lineageMode, legacyExactArtifactsPresent: legacyLineagePresent, cleanRootValidated, cleanRootGenesisPath: cleanRootValidated ? cleanRootGenesisPath : null, legacyRecoveryClaimed: lineageMode === "LEGACY_EXACT" },
  hiddenCoverage: {
    dotVelmereEntries: sourceEntries.filter((entry) => entry.path.startsWith(".velmere/")).length,
    dotGithubEntries: sourceEntries.filter((entry) => entry.path.startsWith(".github/")).length,
  },
  exclusions: { directoryNames: [...excludedDirectoryNames].sort(), generatedBuildPattern: ".next and .next-pass25-*" },
  archive: { path: archivePath, sha256: archive.sha256, bytes: archive.byteLength, entries: archive.entryCount },
  verification: { missingArchivePaths, mismatchedArchivePaths, extraArchivePaths, deterministicZipParsed: true },
  truthBoundary: lineageMode === "A77_CLEAN_ROOT"
    ? "The full-source archive is bound to the verified A77 clean-root genesis. Missing PASS5/PASS6 bytes remain unresolved and are not reconstructed or claimed recovered. Node_modules, VCS metadata and generated build outputs are physically excluded."
    : "The full-source archive includes exact legacy lineage artifacts and every FILE_MANIFEST.csv path; node_modules, VCS metadata and generated build outputs are physically excluded.",
};
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (status !== "PASS") process.exit(1);
