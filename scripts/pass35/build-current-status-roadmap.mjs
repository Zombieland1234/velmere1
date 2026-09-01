#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "config/pass35/current-status-register.json");
const outputPath = path.join(root, "artifacts/release/PASS35_CURRENT_STATUS.md");
const register = JSON.parse(readFileSync(inputPath, "utf8"));
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const statuses = new Set(register.allowedStatuses ?? []);
if (register.schemaVersion !== "velmere.pass35.current-status-register.v1") throw new Error("pass35_status_register_schema_invalid");
if (register.canonicalCurrentTruth !== true || register.globalDecision !== "NO_GO" || register.promotionAllowed !== false || register.sellEnabledCount !== 0) throw new Error("pass35_status_register_false_promotion");
if (!Array.isArray(register.rows) || register.rows.length < 30) throw new Error("pass35_status_register_rows_missing");
const ids = new Set();
for (const row of register.rows) {
  if (!/^[A-Z0-9_]{5,80}$/u.test(String(row.id ?? "")) || ids.has(row.id)) throw new Error(`pass35_status_register_id_invalid:${row.id}`);
  ids.add(row.id);
  if (!statuses.has(row.status)) throw new Error(`pass35_status_register_status_invalid:${row.id}`);
  if (!Array.isArray(row.doneEvidence) || !Array.isArray(row.missing)) throw new Error(`pass35_status_register_evidence_invalid:${row.id}`);
  for (const field of ["domain", "blocker", "nextAction", "sellImpact"]) if (!String(row[field] ?? "").trim()) throw new Error(`pass35_status_register_field_missing:${row.id}:${field}`);
  if (row.status === "DONE" && row.missing.length) throw new Error(`pass35_status_register_done_has_missing:${row.id}`);
  if (row.status === "NOT_DONE" && row.missing.length === 0) throw new Error(`pass35_status_register_not_done_without_missing:${row.id}`);
}
const counts = Object.fromEntries(register.allowedStatuses.map((status) => [status, register.rows.filter((row) => row.status === status).length]));
const denominator = register.rows.length;
const strict = Number(((counts.DONE / denominator) * 100).toFixed(1));
const weighted = Number((((counts.DONE + counts.PARTIAL * 0.5) / denominator) * 100).toFixed(1));
const lines = [
  "# PASS35 — Canonical Current Status",
  "",
  `- Candidate: \`${register.candidateId}\``,
  `- Source revision: \`${register.sourceRevisionId}\``,
  `- Global decision: **${register.globalDecision}**`,
  `- Paid cells enabled: **${register.sellEnabledCount}**`,
  `- External verified evidence: **${register.externalVerifiedEvidence}**`,
  `- Current rows: **${denominator}**; DONE ${counts.DONE}, PARTIAL ${counts.PARTIAL}, BLOCKED_EXTERNAL ${counts.BLOCKED_EXTERNAL}, NOT_DONE ${counts.NOT_DONE}`,
  `- Strict local completion index: **${strict}%**; weighted planning index: **${weighted}%**. Neither permits sale or promotion.`,
  `- Zero-budget functional core: **${register.zeroBudgetFunctionalTrack?.currentWeightedPlanningPercent ?? "n/a"}%** toward target **${register.zeroBudgetFunctionalTrack?.targetPercent ?? "n/a"}%**.`,
  `- Product/tier specification: **${register.productTierSpecification?.status ?? "missing"}**; visual changes: **${register.productTierSpecification?.visualChangesMade === false ? "0" : "unknown"}**.`,
  "",
  "> This file is generated from `config/pass35/current-status-register.json`. Older A2-A14 blocks are historical implementation notes and cannot override this register.",
  "",
  "| ID | Domain | Status | Done evidence | Missing | Blocker | Next action | Sell impact |",
  "|---|---|---|---|---|---|---|---|",
];
const cell = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
for (const row of register.rows) {
  lines.push(`| ${cell(row.id)} | ${cell(row.domain)} | **${cell(row.status)}** | ${cell(row.doneEvidence.join("; ") || "—")} | ${cell(row.missing.join("; ") || "—")} | ${cell(row.blocker)} | ${cell(row.nextAction)} | ${cell(row.sellImpact)} |`);
}
lines.push("", "## Truth boundary", "", register.truthBoundary, "");
const body = `${lines.join("\n")}\n`;
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, body);
const summary = {
  schemaVersion: "velmere.pass35.current-status-summary.v1",
  candidateId: register.candidateId,
  sourceRevisionId: register.sourceRevisionId,
  registerSha256: sha256(readFileSync(inputPath)),
  generatedMarkdownSha256: sha256(body),
  denominator,
  counts,
  strictCompletionPercent: strict,
  weightedCompletionPercent: weighted,
  globalDecision: "NO_GO",
  promotionAllowed: false,
  sellEnabledCount: 0,
};
writeFileSync(path.join(root, "artifacts/release/PASS35_CURRENT_STATUS_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS_CURRENT_STATUS_GENERATED", ...summary }, null, 2));
