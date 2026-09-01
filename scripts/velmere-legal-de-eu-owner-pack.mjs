#!/usr/bin/env node
import fs from 'node:fs';

const requiredLegalSurfaces = [
  { id: 'impressum', jurisdiction: 'DE', required: true, ownerReview: true },
  { id: 'datenschutz', jurisdiction: 'DE/EU', required: true, ownerReview: true },
  { id: 'agb', jurisdiction: 'DE/EU', required: true, ownerReview: true },
  { id: 'widerruf', jurisdiction: 'DE/EU', required: true, ownerReview: true },
  { id: 'versand', jurisdiction: 'DE/EU/international', required: true, ownerReview: true },
  { id: 'retouren', jurisdiction: 'DE/EU/international', required: true, ownerReview: true },
  { id: 'payment_terms', jurisdiction: 'DE/EU', required: true, ownerReview: true },
  { id: 'risk_disclaimer_no_investment_advice', jurisdiction: 'DE/EU', required: true, ownerReview: true },
  { id: 'ai_disclosure_and_source_limits', jurisdiction: 'DE/EU', required: true, ownerReview: true },
  { id: 'cookie_consent', jurisdiction: 'DE/EU', required: true, ownerReview: true },
];

const pageCandidates = [
  'app/[locale]/impressum/page.tsx',
  'app/[locale]/legal/page.tsx',
  'app/[locale]/privacy/page.tsx',
  'app/[locale]/terms/page.tsx',
  'app/[locale]/returns/page.tsx',
  'app/[locale]/shipping/page.tsx',
];
const presentPages = pageCandidates.filter((file) => fs.existsSync(file));
const checklist = `# PASS2157 Legal DE/EU Owner Review Pack\n\nStatus: OWNER_REVIEW_REQUIRED.\n\nThis pack does not replace a qualified legal review. It gives the owner a concrete checklist before production launch in Germany/EU.\n\n## Required owner confirmations\n\n${requiredLegalSurfaces.map((item) => `- [ ] ${item.id} — ${item.jurisdiction}`).join('\n')}\n\n## Required final receipt\n\nCreate or complete \`receipts/runtime/legal_owner_review.receipt.json\` only after owner/lawyer review.\n`;
fs.mkdirSync('docs/legal', { recursive: true });
fs.writeFileSync('docs/legal/PASS2157_DE_EU_LEGAL_OWNER_REVIEW_PACK.md', checklist);

const template = {
  schema: 'velmere.runtime.receipt.v1',
  gateId: 'legal_owner_review',
  status: 'PASS',
  requiredFor90: true,
  source: 'owner_or_qualified_legal_review',
  command: 'manual legal review and sign-off',
  timing: { startedAt: 'YYYY-MM-DDTHH:mm:ssZ', endedAt: 'YYYY-MM-DDTHH:mm:ssZ' },
  reviewer: { name: 'Marcin Bajak or qualified legal reviewer', reviewedAt: 'YYYY-MM-DDTHH:mm:ssZ' },
  result: {
    summary: 'Owner confirms German/EU legal pages, policies, risk copy, AI disclosure, payment/returns/shipping terms reviewed for launch.',
    exitCode: 0,
    artifactPath: 'docs/legal/PASS2157_DE_EU_LEGAL_OWNER_REVIEW_PACK.md'
  }
};
fs.mkdirSync('receipts/runtime/templates', { recursive: true });
fs.writeFileSync('receipts/runtime/templates/legal_owner_review.receipt.template.json', JSON.stringify(template, null, 2));
const report = {
  pass: 'PASS2157',
  name: 'DE/EU legal owner pack',
  status: 'OWNER_LEGAL_REVIEW_REQUIRED_STATIC_PACK_READY',
  requiredLegalSurfaces,
  presentPages,
  blockers: ['Owner/legal reviewer must complete final legal receipt before production promotion.'],
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2157_DE_EU_LEGAL_OWNER_PACK.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, required: requiredLegalSurfaces.length, presentPages: presentPages.length }, null, 2));
