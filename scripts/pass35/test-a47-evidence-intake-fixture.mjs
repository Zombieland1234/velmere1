#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { crc32 } from "../lib/a47-safe-zip.mjs";

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a47-fixture-"));
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");

function zipStore(output, entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [name, raw] of entries) {
    const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const nameBuffer = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuffer.length, 26);
    localParts.push(local, nameBuffer, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(0x0314, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuffer.length, 28); central.writeUInt32LE((0o100644 << 16) >>> 0, 38); central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + data.length;
  }
  const centralBuffer = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10); eocd.writeUInt32LE(centralBuffer.length, 12); eocd.writeUInt32LE(offset, 16);
  fs.writeFileSync(output, Buffer.concat([...localParts, centralBuffer, eocd]));
}
function manifestEntries(files, revision) {
  return json({ schemaVersion: revision.includes("A45") ? "velmere.pass35.a45.evidence-manifest.v1" : "velmere.pass35.a46.evidence-manifest.v1", revisionId: revision, generatedAt: "2026-07-24T18:00:00.000Z", files: files.map(([name, data]) => ({ path: name, bytes: data.length, sha256: sha256(data) })) });
}
function a45Zip(output, { tamper = false } = {}) {
  const source = { files: 1064, sha256: "a".repeat(64) };
  const stages = ["diagnose-a44","diagnose-a45","source-audit-a44","typecheck","lint","a44-contract","a45-contract","build-webpack","build-turbopack","dev-server-ready","http-smoke","browser-acceptance"].map((id) => ({ id, ok: true, status: 0 }));
  const exact = json({ schemaVersion: "velmere.pass35.a45.exact-runtime-acceptance.v1", revisionId: "VELMERE_PASS35_A45_EXACT_RUNTIME_BROWSER_ACCEPTANCE", generatedAt: "2026-07-24T18:00:00.000Z", completedAt: "2026-07-24T18:10:00.000Z", runtime: { node: "24.18.0", npm: "11.16.0" }, sourceBefore: source, sourceAfter: source, sourceUnchanged: true, failure: null, stages, summary: { stages: stages.length, passed: stages.length, failed: 0, sourceUnchanged: true } });
  const rows = [];
  const screenshots = [];
  const routes = ["home","browser","shield","shield-pro","shield-map","real-markets","audits","atelier","intelligence"];
  for (const locale of ["pl","en","de"]) for (const route of routes) {
    const row = { locale, route, viewport: "desktop", ok: true, status: 200, selectorCount: 1, consoleErrors: [], pageErrors: [], brokenImages: [], layout: { bodyHeight: 1000, horizontalOverflowPx: 0, invalidTokens: [] } };
    if (locale === "pl") { const name = `screenshots/pl-desktop-${route}.png`; const data = Buffer.from(`png-${name}`); screenshots.push([name, data]); row.screenshotPath = `artifacts/pass35/a45/${name}`; row.screenshotSha256 = sha256(data); }
    rows.push(row);
  }
  for (const route of routes) {
    const name = `screenshots/pl-mobile-${route}.png`; const data = Buffer.from(`png-${name}`); screenshots.push([name, data]);
    rows.push({ locale: "pl", route, viewport: "mobile", ok: true, status: 200, selectorCount: 1, consoleErrors: [], pageErrors: [], brokenImages: [], layout: { bodyHeight: 1000, horizontalOverflowPx: 0, invalidTokens: [] }, screenshotPath: `artifacts/pass35/a45/${name}`, screenshotSha256: sha256(data) });
  }
  screenshots.push(["screenshots/pl-desktop-shield-popup-four-tabs.png", Buffer.from("popup-png")]);
  const browser = json({ schemaVersion: "velmere.pass35.a45.browser-acceptance.v1", revisionId: "VELMERE_PASS35_A45_EXACT_RUNTIME_BROWSER_ACCEPTANCE", generatedAt: "2026-07-24T18:09:00.000Z", summary: { checks: 37, passed: 37, failed: 0 }, rows, popup: { ok: true, tabRows: ["overview","analysis","market-impact","whale-watch"].map((tabId) => ({ tabId, selected: "true", visible: true })) }, failures: [] });
  const files = [["PASS35_A45_EXACT_RUNTIME_ACCEPTANCE.json", exact], ["PASS35_A45_BROWSER_ACCEPTANCE.json", browser], ...screenshots];
  const manifest = manifestEntries(files, "VELMERE_PASS35_A45_EXACT_RUNTIME_BROWSER_ACCEPTANCE");
  if (tamper) files[0][1] = Buffer.from(`${files[0][1].toString("utf8")}tampered`);
  zipStore(output, [...files, ["PASS35_A45_EVIDENCE_MANIFEST.json", manifest]]);
}
function a46Zip(output, { failedCheck = null } = {}) {
  const source = { files: 1064, sha256: "b".repeat(64) };
  const stages = ["diagnose-a45","diagnose-a46","source-audit","a45-contract","a46-contract","dev-server-ready","data-plane-acceptance"].map((id) => ({ id, ok: true, status: 0 }));
  const exact = json({ schemaVersion: "velmere.pass35.a46.exact-data-acceptance.v1", revisionId: "VELMERE_PASS35_A46_CUSTOMER_UI_DATA_PLANE_ACCEPTANCE", generatedAt: "2026-07-24T18:11:00.000Z", completedAt: "2026-07-24T18:20:00.000Z", runtime: { node: "24.18.0", npm: "11.16.0" }, sourceBefore: source, sourceAfter: source, sourceUnchanged: true, failure: null, stages, summary: { stages: stages.length, passed: stages.length, failed: 0, sourceUnchanged: true } });
  const ids = ["markets","shield-search","klines","shield-map-investigator","browser-search","lens-report-json","lens-report-pdf","market-intelligence-basic","market-intelligence-pro"];
  const rows = ids.map((id) => ({ id, severity: id.startsWith("market-intelligence") ? "truth-boundary" : "hard", ok: id !== failedCheck, detail: { status: id === failedCheck ? 500 : 200, state: id === failedCheck ? "error" : "available" } }));
  const failed = rows.filter((row) => !row.ok).length;
  const data = json({ schemaVersion: "velmere.pass35.a46.data-plane-acceptance.v1", revisionId: "VELMERE_PASS35_A46_CUSTOMER_UI_DATA_PLANE_ACCEPTANCE", generatedAt: "2026-07-24T18:19:00.000Z", summary: { checks: 9, passed: 9 - failed, failed, hardFailed: failedCheck && !failedCheck.startsWith("market-intelligence") ? 1 : 0, truthBoundaryFailed: failedCheck?.startsWith("market-intelligence") ? 1 : 0 }, rows });
  const files = [["PASS35_A46_EXACT_DATA_ACCEPTANCE.json", exact], ["PASS35_A46_DATA_PLANE_ACCEPTANCE.json", data]];
  zipStore(output, [...files, ["PASS35_A46_EVIDENCE_MANIFEST.json", manifestEntries(files, "VELMERE_PASS35_A46_CUSTOMER_UI_DATA_PLANE_ACCEPTANCE")]]);
}
function run(a45, a46) {
  fs.rmSync(path.join(root, "artifacts/pass35/a47"), { recursive: true, force: true });
  const result = spawnSync(process.execPath, ["scripts/a47-evidence-intake.mjs", "--a45", a45, "--a46", a46], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const reportPath = path.join(root, "artifacts/pass35/a47/PASS35_A47_ACCEPTANCE_EVIDENCE_TRIAGE.json");
  const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : null;
  return { result, report };
}
try {
  const validA45 = path.join(temp, "valid-a45.zip"); const validA46 = path.join(temp, "valid-a46.zip");
  a45Zip(validA45); a46Zip(validA46);
  const valid = run(validA45, validA46);
  check("valid:exit", valid.result.status === 0, valid.result.stderr || valid.result.stdout);
  check("valid:decision", valid.report?.decision?.state === "VERIFIED_LOCAL_ACCEPTANCE", valid.report?.decision);
  check("valid:accepted", valid.report?.decision?.accepted === true, valid.report?.decision);

  const tamperedA45 = path.join(temp, "tampered-a45.zip"); a45Zip(tamperedA45, { tamper: true });
  const tampered = run(tamperedA45, validA46);
  check("tamper:exit", tampered.result.status !== 0, tampered.result.status);
  check("tamper:decision", tampered.report?.decision?.state === "REJECTED_INTEGRITY", tampered.report?.decision);
  check("tamper:hash", tampered.report?.evidence?.a45?.errors?.some((value) => value.includes("manifest_hash_mismatch")), tampered.report?.evidence?.a45?.errors);

  const traversal = path.join(temp, "traversal-a45.zip"); zipStore(traversal, [["../evil.txt", Buffer.from("evil")]]);
  const traversalRun = run(traversal, validA46);
  check("traversal:exit", traversalRun.result.status !== 0, traversalRun.result.status);
  check("traversal:decision", traversalRun.report?.decision?.state === "REJECTED_INTEGRITY", traversalRun.report?.decision);
  check("traversal:rejected", traversalRun.report?.evidence?.a45?.errors?.some((value) => value.includes("zip_path_traversal")), traversalRun.report?.evidence?.a45?.errors);

  const failedA46 = path.join(temp, "failed-a46.zip"); a46Zip(failedA46, { failedCheck: "markets" });
  const action = run(validA45, failedA46);
  check("action:exit", action.result.status !== 0, action.result.status);
  check("action:decision", action.report?.decision?.state === "ACTION_REQUIRED", action.report?.decision);
  check("action:triage", action.report?.actions?.some((row) => row.id === "a46-markets" && row.area === "market-data"), action.report?.actions);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
const failures = checks.filter((row) => !row.ok);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length }, null, 2));
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
