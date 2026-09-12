#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT_COMMIT = "4e6801b7d313348967c4a27f38aab01b6dcd2776";
const LAST_VISUAL_EVIDENCE_DATE = "2026-09-07";
const KNOWN_POST_VISUAL_IMPORT = "41e331c34d268e7ecca87984b682ec61104aa788";
const GIT_BUFFER_BYTES = 16 * 1024 * 1024;
const manifest = JSON.parse(fs.readFileSync("config/pass14/visual-freeze-manifest.json", "utf8"));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const latestCommit = (file) => execFileSync("git", ["log", "-1", "--format=%H", "--", file], { encoding: "utf8", maxBuffer: GIT_BUFFER_BYTES }).trim();
const latestDate = (file) => execFileSync("git", ["log", "-1", "--format=%cI", "--", file], { encoding: "utf8", maxBuffer: GIT_BUFFER_BYTES }).trim();
const rootBytes = (file) => execFileSync("git", ["show", `${ROOT_COMMIT}:${file}`], { maxBuffer: GIT_BUFFER_BYTES });
const fileEvidence = (file, documentDate) => ({
  path: file,
  documentDate,
  sha256: sha256(fs.readFileSync(file)),
  lastCommit: latestCommit(file),
  lastCommitDate: latestDate(file),
});

const visualEvidence = [
  fileEvidence("FINAL_SCREENSHOT_QA_REPORT.md", "2026-09-06"),
  fileEvidence("VELMERE_SCREENSHOT_MANIFEST.md", "2026-09-07"),
];

const rows = manifest.files.map((entry) => {
  const current = fs.readFileSync(entry.path);
  const currentSha256 = sha256(current);
  const rootSha256 = sha256(rootBytes(entry.path));
  const lastCommit = latestCommit(entry.path);
  const lastCommitDate = latestDate(entry.path);
  const manifestMatchedAtRoot = entry.sha256 === rootSha256;
  const unchangedSinceRoot = currentSha256 === rootSha256;
  let classification;
  if (currentSha256 === entry.sha256) classification = "CURRENT_MATCHES_V1_MANIFEST";
  else if (!manifestMatchedAtRoot && unchangedSinceRoot) classification = "V1_HASH_INVALID_AT_CREATION_FILE_UNCHANGED_SINCE_ROOT";
  else if (!manifestMatchedAtRoot && lastCommit === KNOWN_POST_VISUAL_IMPORT) classification = "V1_HASH_INVALID_AT_CREATION_AND_POST_VISUAL_CHANGE_REAPPROVAL_REQUIRED";
  else classification = "UNRESOLVED_VISUAL_PROVENANCE";
  return {
    path: entry.path,
    manifestSha256: entry.sha256,
    rootSha256,
    currentSha256,
    manifestMatchedAtRoot,
    unchangedSinceRoot,
    lastCommit,
    lastCommitDate,
    classification,
  };
});

const counts = rows.reduce((acc, row) => {
  acc[row.classification] = (acc[row.classification] || 0) + 1;
  return acc;
}, {});
const reapprovalRequired = rows.filter((r) => r.classification.includes("REAPPROVAL_REQUIRED"));
const unresolved = rows.filter((r) => r.classification === "UNRESOLVED_VISUAL_PROVENANCE");
const provenanceClassificationPassed = unresolved.length === 0;
const releaseVisualFreezePassed = provenanceClassificationPassed && reapprovalRequired.length === 0;
const receipt = {
  schemaVersion: "velmere.pass26.visual-freeze-provenance.v2",
  subjectSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  rootCommit: ROOT_COMMIT,
  lastVisualEvidenceDate: LAST_VISUAL_EVIDENCE_DATE,
  knownPostVisualImportCommit: KNOWN_POST_VISUAL_IMPORT,
  visualEvidence,
  protectedFileCount: rows.length,
  counts,
  reapprovalRequiredCount: reapprovalRequired.length,
  reapprovalRequiredPaths: reapprovalRequired.map((r) => r.path),
  unresolvedCount: unresolved.length,
  provenanceClassificationPassed,
  releaseVisualFreezePassed,
  rows,
  truthBoundary: "This receipt proves Git/hash provenance only. provenanceClassificationPassed means the mismatch population was classified, not visually approved. releaseVisualFreezePassed remains false while any post-evidence CSS path requires deterministic screenshot review/handoff.",
};
fs.mkdirSync(".velmere/pass26-diagnostics", { recursive: true });
fs.writeFileSync(".velmere/pass26-diagnostics/visual-freeze-provenance-v2.json", JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
if (!provenanceClassificationPassed) process.exit(1);
