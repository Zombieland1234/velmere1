#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const gates = ['clean_install','typecheck','build','supabase','stripe','provider','hosted_smoke','admin_auth','legal_owner_review'];
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
const receiptDir = 'receipts/runtime';
const receipts = gates.map((gateId) => {
  const receiptPath = path.join(receiptDir, `${gateId}.receipt.json`);
  const r = readJson(receiptPath);
  const accepted = r?.schema === 'velmere.runtime.receipt.v1' && r?.gateId === gateId && r?.status === 'PASS' && r?.requiredFor90 === true && (gateId === 'legal_owner_review' || r?.result?.exitCode === 0);
  return { gateId, receiptPath, present: Boolean(r), accepted, status: accepted ? 'ACCEPTED_FOR_PROMOTION_MERGE' : 'MISSING_OR_REJECTED' };
});
const missing = receipts.filter((r) => !r.accepted).map((r) => r.gateId);
const report = {
  pass: 'PASS2153',
  name: 'Promotion receipt merge',
  status: missing.length ? 'PROMOTION_MERGE_LOCKED_RUNTIME_RECEIPTS_MISSING' : 'PROMOTION_MERGE_PASS_READY_ABOVE_90',
  canPromoteAbove90: missing.length === 0,
  honestOverallCeiling: missing.length ? 89.997 : 91.0,
  acceptedCount: gates.length - missing.length,
  requiredCount: gates.length,
  missing,
  receipts,
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2153_PROMOTION_RECEIPT_MERGE.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, accepted: report.acceptedCount, required: report.requiredCount, missing }, null, 2));
