#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REV = "VELMERE_PASS36_A102R44P29_ACTION_REQUIRED_R44P27_AUTHORITY_FORK_RECONCILIATION_DUAL_CONTROL_TRUST_QUARANTINE_72H_WATCHDOG_AND_CREDENTIAL_HYGIENE_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P28_ACTION_REQUIRED_EXTERNAL_CI_POSTGRES_RLS19_SIGSTORE_OIDC_ATTESTATION_AND_PARENT_SOURCE_BINDING_NO_LIVE_CREDIT";
const SIBLING = "VELMERE_PASS36_A102R44P27_ACTION_REQUIRED_DUAL_CONTROL_TRUST_ANCHOR_EVIDENCE_QUARANTINE_AND_REAL_TIME_72H_WATCHDOG_NO_LIVE_CREDIT";
const DURABLE = "VELMERE_PASS36_A102R44P27_ACTION_REQUIRED_DURABLE_EXTERNAL_EVIDENCE_REPLAY_JOURNAL_ATOMIC_ADMISSION_AND_ENVELOPE_TIME_HARDENING_NO_LIVE_CREDIT";
const MANIFEST = "_velmere/PASS36_A102R44P29_SOURCE_ONLY_MANIFEST.json";
const PM = "_velmere/PASS36_A102R44P28_SOURCE_ONLY_MANIFEST.json";
const LEDGER = "config/pass36/a102r44p29-approved-current-source-changes.json";
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const forbidden = new Set([".cache", ".git", ".turbo", ".velmere", "__pycache__", "artifacts", "build", "cache", "coverage", "dist", "node_modules", "out", "playwright-report", "temp", "test-results", "tmp"]);
const reject = (rel) => {
  const parts = rel.split("/");
  const top = parts[0] ?? "";
  return forbidden.has(top) || top.startsWith(".next") || top === ".env" || top.startsWith(".env.") || parts.includes("__pycache__") || rel.endsWith(".pyc") || rel.endsWith(".tsbuildinfo") || rel.endsWith(".map");
};
function collect() {
  const rows = [];
  function walk(dir, prefix = "") {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (rel === MANIFEST) continue;
      const full = path.join(dir, entry.name);
      const st = fs.lstatSync(full);
      if (st.isSymbolicLink()) throw new Error(`symlink:${rel}`);
      if (entry.isDirectory()) {
        if (!reject(rel)) walk(full, rel);
        continue;
      }
      if (!entry.isFile() || reject(rel)) continue;
      const bytes = fs.readFileSync(full);
      rows.push({ path: rel, byteLength: bytes.length, sha256: sha(bytes), mode: st.mode & 0o777 });
    }
  }
  walk(ROOT);
  return rows.sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
}

const manifestBytes = fs.readFileSync(path.join(ROOT, MANIFEST));
const manifest = JSON.parse(manifestBytes);
const rows = collect();
const totalBytes = rows.reduce((sum, row) => sum + row.byteLength, 0);
const pathSetSha256 = sha(Buffer.from(rows.map((row) => row.path).join("\n") + "\n"));
const aggregateSha256 = sha(Buffer.from(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode.toString(8)}`).join("\n") + "\n"));
const state = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p29-action-required-current-state.json"), "utf8"));
const fork = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/a102r44p29-r44p27-fork-reconciliation.json"), "utf8"));
const pointer = JSON.parse(fs.readFileSync(path.join(ROOT, "config/pass36/current-release-authority.json"), "utf8"));
const checks = [];
const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });

add("schema", manifest.schemaVersion === "velmere.pass36.a102r44p29.source-manifest.v1");
add("revision", manifest.revisionId === REV && manifest.parentRevisionId === PARENT);
add("count", manifest.fileCount === rows.length);
add("bytes", manifest.byteLength === totalBytes);
add("pathset", manifest.pathSetSha256 === pathSetSha256);
add("aggregate", manifest.aggregateSha256 === aggregateSha256);
add("entries", manifest.entries.length === rows.length && manifest.entries.every((entry, index) => entry.path === rows[index].path && entry.byteLength === rows[index].byteLength && entry.sha256 === rows[index].sha256 && entry.mode === rows[index].mode));
add("active", fs.readFileSync(path.join(ROOT, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim() === REV);
add("flags", state.globalDecision === "NO_GO" && [state.LIVE, state.saleEnabled, state.productionApproved, state.worldClassProven].every((value) => value === false));
add("approved-bound", manifest.approvedChangesPath === LEDGER && manifest.approvedChangesSha256 === sha(fs.readFileSync(path.join(ROOT, LEDGER))));
add("parent-bound", manifest.parentManifestPath === PM && manifest.parentManifestSha256 === sha(fs.readFileSync(path.join(ROOT, PM))));
add("fork-selected-parent", fork.parentRevisionId === PARENT && fork.selectedLineage.r44p27RevisionId === DURABLE);
add("fork-sibling-blocked", fork.siblingLineage.r44p27RevisionId === SIBLING && fork.siblingLineage.mayBecomeParent === false && fork.siblingLineage.silentMergeForbidden === true);
add("fork-imported", fork.mergeDecisions.importedAsR44P29Paths.length === 10 && fork.mergeDecisions.importedAsR44P29Paths.every((rel) => fs.existsSync(path.join(ROOT, rel))));
add("durable-replay-preserved", fork.mergeDecisions.durableReplayFilesPreserved.every((rel) => fs.existsSync(path.join(ROOT, rel))));
add("no-promotion", state.currentByteCredit.externalStaging === false && state.currentByteCredit.sale === false && state.currentByteCredit.live === false);
add("no-exact-release", [state.currentByteCredit.fullEslint, state.currentByteCredit.fullTypeScript, state.currentByteCredit.sourceAudit, state.currentByteCredit.webpack, state.currentByteCredit.turbopack, state.currentByteCredit.browser57, state.currentByteCredit.pdf150, state.currentByteCredit.exactWindows].every((value) => value === false));
add("roots-zero", state.productionTrustedRoots === 0 && state.externalEvidenceAdmitted === 0 && state.independentTimestampAuthorities === 0);
add("retained-parent-rls", state.retainedParentEvidence.externalCiPostgresRls19 === true && state.retainedParentEvidence.classification === "RETAINED_PARENT_EVIDENCE_ONLY");
add("pointers", pointer.authorityRevisionId === REV && pointer.sourceRevisionId === REV && pointer.parentRevisionId === PARENT && pointer.currentSource?.revisionId === REV && pointer.currentSource?.parentRevisionId === PARENT);
add("roadmap", fs.readFileSync(path.join(ROOT, "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt"), "utf8").startsWith("================================================================================\nVELMÈRE WORLD CLASS MAX ROADMAP — PASS36 A102R44P29"));
add("basic-free", state.skuDecisions.basic === "ALWAYS_FREE_ACTION_REQUIRED");
add("pro-beta", state.skuDecisions.pro === "INVITATION_ONLY_CONTROLLED_BETA_MANUAL_QA_REQUIRED");
add("advanced-stop", state.skuDecisions.advanced === "NOT_FOR_SALE");

const failed = checks.filter((row) => !row.ok);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p29.source-authority-verification.v1",
  status: failed.length ? "FAIL" : "PASS_R44P29_SOURCE_AUTHORITY",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  revisionId: REV,
  manifestSha256: sha(manifestBytes),
  aggregateSha256,
  fileCount: rows.length,
  sourceImmutable: true,
  rows: checks,
}, null, 2));
if (failed.length) process.exit(1);
