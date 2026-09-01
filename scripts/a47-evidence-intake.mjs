#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { extractZipSafely } from "./lib/a47-safe-zip.mjs";
import { VELMERE_RUNTIME } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const artifactRoot = path.join(root, "artifacts/pass35/a47");
const intakeRoot = path.join(artifactRoot, "intake");
fs.mkdirSync(intakeRoot, { recursive: true });
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a47-acceptance-evidence-intake.json"), "utf8"));
const args = process.argv.slice(2);
const getArg = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };

function sha256File(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function normalizeRelative(value) { return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, ""); }
function findFile(directory, basename) {
  const matches = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name === basename) matches.push(absolute);
    }
  };
  walk(directory);
  if (matches.length !== 1) throw new Error(`evidence_file_count:${basename}:${matches.length}`);
  return matches[0];
}
function resolveEvidence(kind) {
  const explicit = getArg(`--${kind}`);
  const expectedName = kind === "a45" ? "PASS35_A45_ACCEPTANCE_EVIDENCE.zip" : "PASS35_A46_DATA_ACCEPTANCE_EVIDENCE.zip";
  const candidates = [
    explicit,
    path.join(root, expectedName),
    path.join(root, "artifacts/pass35/incoming", expectedName),
    path.join(root, "artifacts/pass35", expectedName),
  ].filter(Boolean).map((value) => path.resolve(root, value));
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}
function verifyManifest(extractedRoot, manifestName, expectedRevision) {
  const manifestPath = findFile(extractedRoot, manifestName);
  const manifest = readJson(manifestPath);
  const errors = [];
  if (manifest.revisionId !== expectedRevision) errors.push(`manifest_revision:${manifest.revisionId ?? "missing"}`);
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) errors.push("manifest_files_missing");
  const manifestBase = path.dirname(manifestPath);
  const seen = new Set();
  for (const row of manifest.files ?? []) {
    const relative = normalizeRelative(row.path);
    if (!relative || relative.includes("../") || relative.startsWith("/")) { errors.push(`manifest_path_invalid:${relative}`); continue; }
    if (seen.has(relative)) { errors.push(`manifest_duplicate:${relative}`); continue; }
    seen.add(relative);
    const absolute = path.resolve(manifestBase, relative);
    if (!absolute.startsWith(`${path.resolve(manifestBase)}${path.sep}`)) { errors.push(`manifest_escape:${relative}`); continue; }
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) { errors.push(`manifest_missing:${relative}`); continue; }
    const stat = fs.statSync(absolute);
    if (Number(row.bytes) !== stat.size) errors.push(`manifest_size_mismatch:${relative}`);
    if (String(row.sha256 ?? "").toLowerCase() !== sha256File(absolute)) errors.push(`manifest_hash_mismatch:${relative}`);
  }
  return { ok: errors.length === 0, errors, manifestPath, manifest, manifestBase };
}
function exactRuntimeValid(runtime) {
  return runtime?.node === VELMERE_RUNTIME.node && runtime?.npm === VELMERE_RUNTIME.npm;
}
function dateValue(value) { const parsed = Date.parse(String(value ?? "")); return Number.isFinite(parsed) ? parsed : null; }
function classifyAction(id, area, message, detail = null, priority = "P0") { return { id, area, priority, message, detail }; }
function inspectA45(extractedRoot, manifestResult) {
  const exactPath = findFile(extractedRoot, "PASS35_A45_EXACT_RUNTIME_ACCEPTANCE.json");
  const browserPath = findFile(extractedRoot, "PASS35_A45_BROWSER_ACCEPTANCE.json");
  const exact = readJson(exactPath);
  const browser = readJson(browserPath);
  const errors = [...manifestResult.errors];
  const actions = [];
  if (!exactRuntimeValid(exact.runtime)) { errors.push("a45_runtime_not_exact"); actions.push(classifyAction("a45-runtime", "runtime", "Uruchom A45 ponownie na Node 24.18.0 i npm 11.16.0.", exact.runtime)); }
  if (exact.sourceUnchanged !== true || exact.sourceBefore?.sha256 !== exact.sourceAfter?.sha256) { errors.push("a45_source_drift"); actions.push(classifyAction("a45-source-drift", "integrity", "Źródło zmieniło się podczas acceptance; użyj świeżego pustego folderu.", { before: exact.sourceBefore, after: exact.sourceAfter })); }
  if (exact.failure) { errors.push(`a45_failure:${exact.failure}`); actions.push(classifyAction("a45-stage-failure", "acceptance", `Napraw etap A45: ${exact.failure}.`, exact.stages)); }
  const stages = new Map((exact.stages ?? []).map((row) => [row.id, row]));
  for (const stage of contract.requiredA45Stages) {
    const row = stages.get(stage);
    if (!row?.ok) { errors.push(`a45_stage_missing_or_failed:${stage}`); actions.push(classifyAction(`a45-${stage}`, "build-browser", `Etap ${stage} nie przeszedł.`, row ?? null)); }
  }
  if (browser.summary?.failed !== 0 || !Array.isArray(browser.rows) || browser.rows.length !== contract.expectedA45RouteRows) {
    errors.push("a45_browser_summary_failed");
  }
  for (const row of browser.rows ?? []) {
    if (!row.ok) actions.push(classifyAction(`browser-${row.locale}-${row.viewport}-${row.route}`, "browser", `Napraw trasę ${row.locale}/${row.route} (${row.viewport}).`, { status: row.status, navigationError: row.navigationError, consoleErrors: row.consoleErrors, pageErrors: row.pageErrors, failedRequests: row.failedRequests, layout: row.layout }));
    if (row.screenshotPath) {
      const screenshot = path.resolve(manifestResult.manifestBase, normalizeRelative(row.screenshotPath).replace(/^artifacts\/pass35\/a45\//u, ""));
      if (!fs.existsSync(screenshot)) { errors.push(`a45_screenshot_missing:${row.screenshotPath}`); }
      else if (row.screenshotSha256 && sha256File(screenshot) !== row.screenshotSha256) errors.push(`a45_screenshot_hash_mismatch:${row.screenshotPath}`);
    }
  }
  if (browser.popup?.ok !== true) { errors.push("a45_popup_failed"); actions.push(classifyAction("a45-popup", "popup", "Napraw czterokartowy popup Shield.", browser.popup)); }
  const popupScreenshot = path.join(manifestResult.manifestBase, "screenshots/pl-desktop-shield-popup-four-tabs.png");
  if (!fs.existsSync(popupScreenshot)) errors.push("a45_popup_screenshot_missing");
  return { kind: "a45", ok: errors.length === 0, integrityOk: manifestResult.ok, errors, actions, exact, browser, completedAt: exact.completedAt ?? exact.generatedAt, zipRevision: manifestResult.manifest.revisionId };
}
function inspectA46(extractedRoot, manifestResult) {
  const exactPath = findFile(extractedRoot, "PASS35_A46_EXACT_DATA_ACCEPTANCE.json");
  const dataPath = findFile(extractedRoot, "PASS35_A46_DATA_PLANE_ACCEPTANCE.json");
  const exact = readJson(exactPath);
  const data = readJson(dataPath);
  const errors = [...manifestResult.errors];
  const actions = [];
  if (!exactRuntimeValid(exact.runtime)) { errors.push("a46_runtime_not_exact"); actions.push(classifyAction("a46-runtime", "runtime", "Uruchom A46 ponownie na Node 24.18.0 i npm 11.16.0.", exact.runtime)); }
  if (exact.sourceUnchanged !== true || exact.sourceBefore?.sha256 !== exact.sourceAfter?.sha256) { errors.push("a46_source_drift"); actions.push(classifyAction("a46-source-drift", "integrity", "Źródło zmieniło się podczas data acceptance.", { before: exact.sourceBefore, after: exact.sourceAfter })); }
  if (exact.failure) { errors.push(`a46_failure:${exact.failure}`); actions.push(classifyAction("a46-stage-failure", "data-acceptance", `Napraw etap A46: ${exact.failure}.`, exact.stages)); }
  const stages = new Map((exact.stages ?? []).map((row) => [row.id, row]));
  for (const stage of contract.requiredA46Stages) {
    const row = stages.get(stage);
    if (!row?.ok) { errors.push(`a46_stage_missing_or_failed:${stage}`); actions.push(classifyAction(`a46-${stage}`, "data-acceptance", `Etap ${stage} nie przeszedł.`, row ?? null)); }
  }
  const dataRows = new Map((data.rows ?? []).map((row) => [row.id, row]));
  for (const check of contract.requiredA46Checks) {
    const row = dataRows.get(check);
    if (!row?.ok) {
      errors.push(`a46_check_failed:${check}`);
      const area = check.startsWith("market-intelligence") ? "market-intelligence" : check.startsWith("lens") || check.startsWith("browser") ? "browser-pdf" : check.includes("shield-map") ? "shield-map" : "market-data";
      actions.push(classifyAction(`a46-${check}`, area, `Napraw kontrolę danych: ${check}.`, row ?? null));
    }
  }
  if (data.summary?.failed !== 0 || data.summary?.checks !== contract.requiredA46Checks.length) errors.push("a46_data_summary_failed");
  return { kind: "a46", ok: errors.length === 0, integrityOk: manifestResult.ok, errors, actions, exact, data, completedAt: exact.completedAt ?? exact.generatedAt, zipRevision: manifestResult.manifest.revisionId };
}
function intake(kind, zipPath) {
  if (!zipPath) return { kind, present: false, ok: false, integrityOk: false, errors: [`${kind}_evidence_missing`], actions: [classifyAction(`${kind}-missing`, "evidence", `Brakuje ZIP-a evidence ${kind.toUpperCase()}.`, null)] };
  const zipSha256 = sha256File(zipPath);
  const destination = path.join(intakeRoot, `${kind}-${zipSha256.slice(0, 16)}`);
  try {
    const archive = extractZipSafely(zipPath, destination, contract.zipBudgets);
    const manifestName = kind === "a45" ? "PASS35_A45_EVIDENCE_MANIFEST.json" : "PASS35_A46_EVIDENCE_MANIFEST.json";
    const expectedRevision = kind === "a45" ? contract.a45RevisionId : contract.a46RevisionId;
    const manifest = verifyManifest(destination, manifestName, expectedRevision);
    if (!manifest.ok) {
      return { kind, present: true, ok: false, integrityOk: false, errors: manifest.errors, actions: [classifyAction(`${kind}-manifest-rejected`, "integrity", `Odrzucono manifest ${kind.toUpperCase()} z powodu niezgodności hashy lub rozmiarów.`, manifest.errors)], zip: { path: path.relative(root, zipPath).replaceAll("\\", "/"), bytes: fs.statSync(zipPath).size, sha256: zipSha256, ...archive } };
    }
    const result = kind === "a45" ? inspectA45(destination, manifest) : inspectA46(destination, manifest);
    return { ...result, present: true, zip: { path: path.relative(root, zipPath).replaceAll("\\", "/"), bytes: fs.statSync(zipPath).size, sha256: zipSha256, ...archive } };
  } catch (error) {
    return { kind, present: true, ok: false, integrityOk: false, errors: [error instanceof Error ? error.message : String(error)], actions: [classifyAction(`${kind}-rejected`, "integrity", `Odrzucono ZIP ${kind.toUpperCase()} z powodu integralności.`, error instanceof Error ? error.message : String(error))], zip: { path: path.relative(root, zipPath).replaceAll("\\", "/"), bytes: fs.statSync(zipPath).size, sha256: zipSha256 } };
  }
}

const a45 = intake("a45", resolveEvidence("a45"));
const a46 = intake("a46", resolveEvidence("a46"));
const actions = [...a45.actions, ...a46.actions];
const a45Time = dateValue(a45.completedAt);
const a46Time = dateValue(a46.completedAt);
let chronologyOk = true;
if (a45.ok && a46.ok && a45Time !== null && a46Time !== null && a46Time < a45Time) {
  chronologyOk = false;
  actions.push(classifyAction("chronology", "evidence", "A46 zostało wykonane przed A45; uruchom acceptance w kolejności A45, potem A46.", { a45: a45.completedAt, a46: a46.completedAt }));
}
let state;
if ([a45, a46].some((row) => row.present && !row.integrityOk)) state = "REJECTED_INTEGRITY";
else if (!a45.present || !a46.present) state = "INCOMPLETE_EVIDENCE";
else if (a45.ok && a46.ok && chronologyOk) state = "VERIFIED_LOCAL_ACCEPTANCE";
else state = "ACTION_REQUIRED";
const report = {
  schemaVersion: "velmere.pass35.a47.acceptance-evidence-intake.v1",
  revisionId: contract.revisionId,
  generatedAt: new Date().toISOString(),
  truthBoundary: contract.truthBoundary,
  decision: {
    state,
    accepted: state === "VERIFIED_LOCAL_ACCEPTANCE",
    exactRuntimeBrowserDataProven: state === "VERIFIED_LOCAL_ACCEPTANCE",
    stagingProven: false,
    liveProven: false,
    saleEnabled: false,
  },
  summary: { evidencePresent: [a45, a46].filter((row) => row.present).length, evidenceVerified: [a45, a46].filter((row) => row.ok).length, actions: actions.length, chronologyOk },
  chronology: { ok: chronologyOk, a45CompletedAt: a45.completedAt ?? null, a46CompletedAt: a46.completedAt ?? null },
  evidence: { a45, a46 },
  actions,
};
fs.writeFileSync(path.join(artifactRoot, "PASS35_A47_ACCEPTANCE_EVIDENCE_TRIAGE.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
const markdown = [
  "# PASS35 A47 — Acceptance Evidence Triage",
  "",
  `- Decision: **${state}**`,
  `- A45 verified: **${a45.ok ? "YES" : "NO"}**`,
  `- A46 verified: **${a46.ok ? "YES" : "NO"}**`,
  `- Chronology: **${chronologyOk ? "PASS" : "FAIL"}**`,
  `- Staging/LIVE/sale: **NOT PROVEN / NOT ENABLED**`,
  "",
  "## Actions",
  ...(actions.length ? actions.map((row) => `- **${row.priority} ${row.area}** — ${row.message}`) : ["- No local acceptance failures detected."]),
  "",
  "## Truth boundary",
  contract.truthBoundary,
  "",
].join("\n");
fs.writeFileSync(path.join(artifactRoot, "PASS35_A47_ACCEPTANCE_EVIDENCE_TRIAGE.md"), `${markdown}\n`, "utf8");
console.log(JSON.stringify({ state, accepted: report.decision.accepted, actions: actions.length, a45: a45.ok, a46: a46.ok }, null, 2));
if (state !== "VERIFIED_LOCAL_ACCEPTANCE") process.exitCode = 1;
