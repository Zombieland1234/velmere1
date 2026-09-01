#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const confirm = process.argv.includes('--confirm');
fs.mkdirSync('reports/pass2151-owner-runtime-proof-runner', { recursive: true });
const logPath = 'reports/pass2151-owner-runtime-proof-runner/legal_owner_review.log';
const summary = confirm
  ? 'Owner must manually confirm Impressum, Datenschutz, AGB, Widerruf, shipping and returns before accepting this receipt.'
  : 'Legal owner review requires explicit --confirm and human review.';
fs.writeFileSync(logPath, summary + '\n');
if (!confirm) process.exit(1);
const now = new Date().toISOString();
const log = fs.readFileSync(logPath, 'utf8');
const receipt = {
  schema: 'velmere.runtime.receipt.v1',
  gateId: 'legal_owner_review',
  source: 'owner_review',
  status: 'PASS',
  requiredFor90: true,
  command: 'node scripts/velmere-owner-legal-review-receipt.mjs --confirm',
  environment: { node: process.version, npm: 'not_applicable', target: 'owner' },
  timing: { startedAt: now, endedAt: now },
  result: { exitCode: 0, summary, artifactPath: logPath, redactedLogPath: logPath, sha256: crypto.createHash('sha256').update(log).digest('hex') },
  reviewer: { owner: 'Marcin Bajak / Velmère', reviewedAt: now, note: 'This receipt is only acceptable after real owner legal review; do not use it as legal advice.' },
};
fs.mkdirSync('receipts/runtime', { recursive: true });
fs.writeFileSync('receipts/runtime/legal_owner_review.receipt.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ status: 'LEGAL_OWNER_REVIEW_RECEIPT_WRITTEN', receipt: 'receipts/runtime/legal_owner_review.receipt.json' }, null, 2));
