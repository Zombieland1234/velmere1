#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const reportsDir = 'reports';
fs.mkdirSync(reportsDir, { recursive: true });

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const promotionBoard = readJson(path.join(reportsDir, 'PASS2134_PROMOTION_BOARD.json')) || {};
const proofPack = readJson(path.join(reportsDir, 'PASS2139_OWNER_PRODUCTION_PROOF_PACK.json')) || {};
const receiptForge = readJson(path.join(reportsDir, 'PASS2133_EVIDENCE_RECEIPTS.json')) || {};

const requiredEvidence = [
  { id: 'clean_install', label: 'Clean npm ci on Node 24.18.0 / npm 11.16', files: ['package-lock.json'], blockers: ['node_modules_not_verified_here'] },
  { id: 'typecheck', label: 'Full npm run typecheck', files: [], blockers: ['node_modules_required'] },
  { id: 'build', label: 'Full npm run build / Vercel build', files: [], blockers: ['node_modules_required'] },
  { id: 'supabase', label: 'Supabase migration applied + schema receipt', files: ['lib/db/schema.sql'], blockers: ['supabase_env_required'] },
  { id: 'stripe', label: 'Stripe signed webhook replay receipt', files: ['app/api/stripe/webhook/route.ts'], blockers: ['stripe_env_required'] },
  { id: 'provider', label: 'Printful/Tapstitch sandbox fulfilment receipt', files: ['lib/providers/provider-sandbox-fulfilment.ts'], blockers: ['provider_env_required'] },
  { id: 'hosted_smoke', label: 'Hosted desktop/mobile smoke evidence', files: ['reports/PASS2123_HOSTED_SMOKE_PACK.json'], blockers: ['hosted_base_url_required'] },
  { id: 'admin_auth', label: 'Admin signed-session smoke evidence', files: ['lib/admin/session-roles.ts'], blockers: ['admin_secret_required'] },
  { id: 'legal_owner_review', label: 'EU/Germany owner legal/commercial review', files: ['PASS2091_IMPLEMENTATION_REPORT.md'], blockers: ['owner_review_required'] },
];

const evidence = requiredEvidence.map((gate) => {
  const presentFiles = gate.files.filter((file) => fs.existsSync(file));
  return {
    ...gate,
    presentFiles,
    missingFiles: gate.files.filter((file) => !fs.existsSync(file)),
    status: presentFiles.length === gate.files.length ? 'STRUCTURE_READY_RUNTIME_EVIDENCE_REQUIRED' : 'MISSING_STRUCTURE',
  };
});

const result = {
  pass: 'PASS2140',
  name: 'Promotion evidence intake',
  status: 'READY_FOR_RUNTIME_EVIDENCE_INTAKE_LOCKED_BELOW_90',
  promotionBoardStatus: promotionBoard.status || promotionBoard.overallStatus || 'unknown',
  proofPackStatus: proofPack.status || 'unknown',
  receiptForgeStatus: receiptForge.status || 'unknown',
  gates: evidence,
  summary: {
    gatesConfigured: evidence.length,
    structureReady: evidence.filter((gate) => gate.status === 'STRUCTURE_READY_RUNTIME_EVIDENCE_REQUIRED').length,
    runtimeEvidenceRequired: evidence.length,
    canPromoteAbove90: false,
  },
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(reportsDir, 'PASS2140_PROMOTION_EVIDENCE_INTAKE.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.summary, null, 2));
