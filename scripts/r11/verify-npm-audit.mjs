#!/usr/bin/env node
import fs from "node:fs";

export const NPM_AUDIT_VERDICT_SCHEMA = "velmere.r11.npm-audit-verdict.v1";

export function classifyNpmAudit({ payload, exitCode }) {
  const toolError = Boolean(
    payload &&
    typeof payload === "object" &&
    (payload.error || payload.code || payload.message) &&
    !payload.metadata
  );
  const vulnerabilities = payload?.metadata?.vulnerabilities;
  const keys = ["info", "low", "moderate", "high", "critical", "total"];
  const schemaValid = Boolean(
    vulnerabilities && keys.every((k) => Number.isInteger(vulnerabilities[k]) && vulnerabilities[k] >= 0)
  );
  const exitValid = exitCode === 0 || exitCode === 1;

  const blockers = [];
  if (!exitValid) blockers.push(`npm_audit_tool_exit_${exitCode}`);
  if (toolError) blockers.push("npm_audit_error_payload");
  if (!schemaValid) blockers.push("npm_audit_schema_invalid");

  if (schemaValid) {
    if (vulnerabilities.high > 0) blockers.push(`high_${vulnerabilities.high}`);
    if (vulnerabilities.critical > 0) blockers.push(`critical_${vulnerabilities.critical}`);
    if (vulnerabilities.total < vulnerabilities.high + vulnerabilities.critical) blockers.push("npm_audit_counts_inconsistent");
  }

  const ok = blockers.length === 0;
  return {
    schemaVersion: NPM_AUDIT_VERDICT_SCHEMA,
    status: ok ? "PASS_NO_HIGH_CRITICAL" : "FAIL_OR_UNKNOWN",
    ok,
    toolError,
    exitCode,
    schemaValid,
    high: schemaValid ? vulnerabilities.high : null,
    critical: schemaValid ? vulnerabilities.critical : null,
    vulnerabilities: schemaValid ? vulnerabilities : null,
    blockers,
    releaseCredit: ok,
  };
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = arg("--file");
  const exitCode = Number(arg("--exit-code", "-1"));
  if (!file || !Number.isInteger(exitCode)) throw new Error("usage: --file <audit.json> --exit-code <n>");
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    payload = null;
  }
  const result = classifyNpmAudit({ payload, exitCode });
  const out = arg("--output");
  if (out) fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  if (!result.releaseCredit) process.exit(1);
}
