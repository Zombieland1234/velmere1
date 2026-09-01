#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const reportsDir = 'reports';
fs.mkdirSync(reportsDir, { recursive: true });

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const attach = readJson(path.join(reportsDir, 'PASS2145_RUNTIME_RECEIPT_ATTACH.json'));
const gateIds = ['clean_install','typecheck','build','supabase','stripe','provider','hosted_smoke','admin_auth','legal_owner_review'];
const accepted = new Set((attach?.receipts || []).filter((r) => r.status === 'ACCEPTED_RUNTIME_RECEIPT').map((r) => r.gateId));
const gates = gateIds.map((gateId) => ({
  gateId,
  status: accepted.has(gateId) ? 'VALIDATED' : 'MISSING_OR_REJECTED',
  requiredFor90: true,
}));
const missing = gates.filter((g) => g.status !== 'VALIDATED').map((g) => g.gateId);
const result = {
  pass: 'PASS2146',
  name: 'Runtime receipt validation',
  status: missing.length ? 'VALIDATION_LOCKED_RUNTIME_RECEIPTS_MISSING' : 'VALIDATION_PASS_ALL_REQUIRED_RUNTIME_RECEIPTS',
  lockedBelow90: missing.length > 0,
  acceptedCount: gateIds.length - missing.length,
  requiredCount: gateIds.length,
  missing,
  gates,
  sourceReport: attach ? 'reports/PASS2145_RUNTIME_RECEIPT_ATTACH.json' : 'missing_attach_report',
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(reportsDir, 'PASS2146_RUNTIME_RECEIPT_VALIDATION.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.status, missing: result.missing }, null, 2));
