#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const runtimeReceiptDir = 'receipts/runtime';
const reportsDir = 'reports';
fs.mkdirSync(runtimeReceiptDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });

const requiredGateIds = [
  'clean_install',
  'typecheck',
  'build',
  'supabase',
  'stripe',
  'provider',
  'hosted_smoke',
  'admin_auth',
  'legal_owner_review',
];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return { __readError: String(error?.message || error) };
  }
}

function sha256File(file) {
  try {
    const bytes = fs.readFileSync(file);
    return crypto.createHash('sha256').update(bytes).digest('hex');
  } catch {
    return null;
  }
}

function isPlaceholder(value) {
  return typeof value === 'string' && /REPLACE_WITH|YYYY-MM-DD|Paste short human summary/i.test(value);
}

function evaluateReceipt(gateId, receipt, receiptFile) {
  const issues = [];
  if (receipt.__readError) issues.push(`invalid_json:${receipt.__readError}`);
  if (receipt.schema !== 'velmere.runtime.receipt.v1') issues.push('schema_missing_or_wrong');
  if (receipt.gateId !== gateId) issues.push('gate_id_mismatch');
  if (receipt.status !== 'PASS') issues.push('status_not_PASS');
  if (receipt.requiredFor90 !== true) issues.push('requiredFor90_not_true');
  if (!receipt.command || isPlaceholder(receipt.command)) issues.push('command_missing_or_placeholder');
  if (!receipt.source || isPlaceholder(receipt.source)) issues.push('source_missing_or_placeholder');
  if (!receipt.timing?.startedAt || isPlaceholder(receipt.timing.startedAt)) issues.push('startedAt_missing_or_placeholder');
  if (!receipt.timing?.endedAt || isPlaceholder(receipt.timing.endedAt)) issues.push('endedAt_missing_or_placeholder');
  if (!receipt.reviewer?.reviewedAt || isPlaceholder(receipt.reviewer.reviewedAt)) issues.push('reviewedAt_missing_or_placeholder');
  if (!receipt.result?.summary || isPlaceholder(receipt.result.summary)) issues.push('summary_missing_or_placeholder');
  if (['clean_install', 'typecheck', 'build', 'stripe', 'provider', 'hosted_smoke', 'admin_auth'].includes(gateId)) {
    if (receipt.result?.exitCode !== 0) issues.push('exitCode_not_zero');
  }
  const artifactPath = receipt.result?.artifactPath;
  const artifactHash = artifactPath && !isPlaceholder(artifactPath) && fs.existsSync(artifactPath) ? sha256File(artifactPath) : null;
  return {
    gateId,
    receiptFile,
    status: issues.length ? 'ATTACHED_BUT_NOT_ACCEPTED' : 'ACCEPTED_RUNTIME_RECEIPT',
    issues,
    artifactHash,
    source: receipt.source || null,
    command: receipt.command || null,
  };
}

const attached = requiredGateIds.map((gateId) => {
  const receiptFile = path.join(runtimeReceiptDir, `${gateId}.receipt.json`);
  if (!fs.existsSync(receiptFile)) {
    return { gateId, receiptFile, status: 'MISSING_RUNTIME_RECEIPT', issues: ['receipt_file_missing'] };
  }
  return evaluateReceipt(gateId, readJson(receiptFile), receiptFile);
});

const accepted = attached.filter((item) => item.status === 'ACCEPTED_RUNTIME_RECEIPT');
const result = {
  pass: 'PASS2145',
  name: 'Runtime receipt attach lane',
  status: accepted.length === requiredGateIds.length ? 'ALL_RUNTIME_RECEIPTS_ACCEPTED' : 'RUNTIME_RECEIPTS_INCOMPLETE_LOCKED_BELOW_90',
  acceptedCount: accepted.length,
  requiredCount: requiredGateIds.length,
  lockedBelow90: accepted.length !== requiredGateIds.length,
  receipts: attached,
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(reportsDir, 'PASS2145_RUNTIME_RECEIPT_ATTACH.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.status, accepted: result.acceptedCount, required: result.requiredCount }, null, 2));
