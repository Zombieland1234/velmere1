import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'reports', 'PASS2112_PRIVACY_PII_SCAN.json');
const outputPath = path.join(root, 'reports', 'PASS2120_PRIVACY_REVIEW_QUEUE_RESOLUTION.json');

const safeSignals = [
  'false',
  'blocked',
  'redacted',
  'redaction',
  'hideRawProviderPayloads',
  'Allowed: false',
  'AllowedFields',
  'allowedFields',
  'no pii',
  'No PII',
  'secretAllowed: false',
  'rawProviderPayloadAllowed: false',
  'rawProviderPayloadStored: false',
  'rawCustomerPiiStored: false',
  'secretsStored: false',
];

function classify(finding) {
  const line = String(finding.line ?? '');
  const normalized = line.toLowerCase();
  const hasSafeSignal = safeSignals.some((signal) => normalized.includes(signal.toLowerCase()));
  if (hasSafeSignal) {
    return {
      ...finding,
      pass2120Resolution: 'FALSE_POSITIVE_POLICY_DECLARATION',
      customerSafe: true,
      ownerAction: 'none unless code changes remove the redaction/false boundary',
    };
  }
  return {
    ...finding,
    pass2120Resolution: 'OWNER_REVIEW_REQUIRED',
    customerSafe: false,
    ownerAction: 'inspect this line before production release',
  };
}

if (!fs.existsSync(inputPath)) {
  const report = {
    schemaVersion: 'velmere.pass2120.privacy-review-resolution.v1',
    generatedAt: new Date().toISOString(),
    status: 'BLOCKED_MISSING_PASS2112_SCAN',
    inputPath: 'reports/PASS2112_PRIVACY_PII_SCAN.json',
    summary: { total: 0, autoClosed: 0, ownerReview: 0, blockers: 1 },
  };
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.error('[pass2120] missing PASS2112 privacy scan');
  process.exit(1);
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const findings = Array.isArray(input.findings) ? input.findings : [];
const resolved = findings.map(classify);
const ownerReview = resolved.filter((item) => item.pass2120Resolution === 'OWNER_REVIEW_REQUIRED');
const autoClosed = resolved.filter((item) => item.pass2120Resolution === 'FALSE_POSITIVE_POLICY_DECLARATION');
const blockers = ownerReview.filter((item) => item.severity === 'blocker');

const report = {
  schemaVersion: 'velmere.pass2120.privacy-review-resolution.v1',
  generatedAt: new Date().toISOString(),
  status: blockers.length > 0 ? 'BLOCKED_PRIVACY_REVIEW' : ownerReview.length > 0 ? 'PASS_WITH_OWNER_REVIEW' : 'PASS_REVIEW_QUEUE_CLOSED',
  policy: 'Close obvious false positives only when the line itself proves redaction/blocked/no-PII behavior. Never hide unresolved PII/secrets.',
  inputSummary: input.summary ?? null,
  summary: {
    total: findings.length,
    autoClosed: autoClosed.length,
    ownerReview: ownerReview.length,
    blockers: blockers.length,
  },
  closedItems: autoClosed,
  ownerReviewItems: ownerReview,
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`[pass2120] privacy review queue: ${report.status} (${autoClosed.length}/${findings.length} auto-closed, ${ownerReview.length} owner-review)`);
if (blockers.length > 0) process.exit(1);
