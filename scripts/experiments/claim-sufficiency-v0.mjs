#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('usage: node scripts/experiments/claim-sufficiency-v0.mjs <case.json> [output.json]');
  process.exit(2);
}

const outputPath = process.argv[3] ?? null;
const raw = fs.readFileSync(inputPath, 'utf8');
const input = JSON.parse(raw);

const ALLOWED_EVIDENCE_STATES = new Set(['VERIFIED_TRUE', 'VERIFIED_FALSE', 'MISSING', 'NOT_APPLICABLE']);
const ALLOWED_MODES = new Set(['all', 'any']);

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
}

requireString(input.caseId, 'caseId');
if (!input.subject || typeof input.subject !== 'object') throw new Error('subject is required');
if (!Array.isArray(input.evidence) || input.evidence.length === 0) throw new Error('evidence[] is required');
if (!Array.isArray(input.claims) || input.claims.length === 0) throw new Error('claims[] is required');

const evidence = new Map();
for (const row of input.evidence) {
  requireString(row.id, 'evidence.id');
  if (evidence.has(row.id)) throw new Error(`duplicate evidence id: ${row.id}`);
  if (!ALLOWED_EVIDENCE_STATES.has(row.state)) throw new Error(`invalid evidence state for ${row.id}: ${row.state}`);
  evidence.set(row.id, row);
}

function evaluateRequirement(req) {
  requireString(req.id, 'requirement.id');
  if (!ALLOWED_MODES.has(req.mode)) throw new Error(`invalid requirement mode: ${req.mode}`);
  if (!Array.isArray(req.evidence) || req.evidence.length === 0) throw new Error(`requirement ${req.id} needs evidence refs`);

  const refs = req.evidence.map((id) => {
    if (!evidence.has(id)) throw new Error(`requirement ${req.id} references unknown evidence: ${id}`);
    const row = evidence.get(id);
    return { id, state: row.state, provenance: row.provenance ?? null };
  });

  const trueCount = refs.filter((x) => x.state === 'VERIFIED_TRUE').length;
  const falseCount = refs.filter((x) => x.state === 'VERIFIED_FALSE').length;
  const missingCount = refs.filter((x) => x.state === 'MISSING').length;
  const applicable = refs.filter((x) => x.state !== 'NOT_APPLICABLE').length;

  let state;
  if (req.mode === 'all') {
    if (falseCount > 0) state = 'CONTRADICTED';
    else if (missingCount > 0) state = 'MISSING';
    else if (applicable > 0 && trueCount === applicable) state = 'SATISFIED';
    else state = 'MISSING';
  } else {
    if (trueCount > 0) state = 'SATISFIED';
    else if (missingCount > 0) state = 'MISSING';
    else if (applicable > 0 && falseCount === applicable) state = 'CONTRADICTED';
    else state = 'MISSING';
  }

  return {
    id: req.id,
    mode: req.mode,
    critical: req.critical !== false,
    state,
    evidence: refs,
  };
}

function evaluateClaim(claim) {
  requireString(claim.id, 'claim.id');
  requireString(claim.text, `claim ${claim.id}.text`);

  if (claim.scopeCovered === false) {
    return {
      id: claim.id,
      text: claim.text,
      verdict: 'NOT_COVERED',
      reason: claim.scopeReason ?? 'claim is outside the declared evaluation scope',
      requirements: [],
      missingEvidence: [],
    };
  }

  const requirements = (claim.requirements ?? []).map(evaluateRequirement);
  if (requirements.length === 0) {
    return {
      id: claim.id,
      text: claim.text,
      verdict: 'UNKNOWN',
      reason: 'no support requirements were declared',
      requirements,
      missingEvidence: [],
    };
  }

  const criticalContradiction = requirements.some((r) => r.critical && r.state === 'CONTRADICTED');
  const criticalMissing = requirements.some((r) => r.critical && r.state === 'MISSING');
  const anyMissing = requirements.some((r) => r.state === 'MISSING');
  const allSatisfied = requirements.every((r) => r.state === 'SATISFIED');

  let verdict;
  let reason;
  if (criticalContradiction) {
    verdict = 'CONTRADICTED';
    reason = 'at least one critical support requirement is contradicted by verified evidence';
  } else if (allSatisfied) {
    verdict = 'SUPPORTED';
    reason = 'all declared support requirements are satisfied';
  } else if (criticalMissing) {
    verdict = 'UNKNOWN';
    reason = 'at least one critical support requirement lacks the evidence needed to establish the claim';
  } else if (anyMissing) {
    verdict = 'PARTIAL';
    reason = 'core support is present but one or more non-critical support requirements are missing';
  } else {
    verdict = 'PARTIAL';
    reason = 'the declared evidence does not fully support the claim';
  }

  const missingEvidence = requirements
    .filter((r) => r.state === 'MISSING')
    .flatMap((r) => r.evidence.filter((e) => e.state === 'MISSING').map((e) => ({ requirementId: r.id, evidenceId: e.id })));

  return { id: claim.id, text: claim.text, verdict, reason, requirements, missingEvidence };
}

const claims = input.claims.map(evaluateClaim);
const result = {
  schema: 'velmere.claim-sufficiency-result.v0',
  engine: {
    name: 'Velmere Claim Sufficiency Prototype',
    version: '0.1.0-experimental',
    truthBoundary: 'Deterministic claim-to-declared-evidence sufficiency evaluation only. It does not independently verify upstream cryptography unless such verification is supplied as evidence.',
  },
  caseId: input.caseId,
  subject: input.subject,
  sourceCaseSha256: sha256(raw),
  evaluatedAt: new Date().toISOString(),
  claims,
  summary: {
    SUPPORTED: claims.filter((c) => c.verdict === 'SUPPORTED').length,
    PARTIAL: claims.filter((c) => c.verdict === 'PARTIAL').length,
    UNKNOWN: claims.filter((c) => c.verdict === 'UNKNOWN').length,
    NOT_COVERED: claims.filter((c) => c.verdict === 'NOT_COVERED').length,
    CONTRADICTED: claims.filter((c) => c.verdict === 'CONTRADICTED').length,
  },
};

const serialized = `${JSON.stringify(result, null, 2)}\n`;
if (outputPath) fs.writeFileSync(outputPath, serialized);
process.stdout.write(serialized);
