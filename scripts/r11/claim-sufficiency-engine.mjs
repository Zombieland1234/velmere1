const TRUST_RANK = Object.freeze({
  UNTRUSTED: 0,
  SOURCE_ASSERTED: 1,
  INDEPENDENT_TRUSTED: 2,
});

function getPath(object, path) {
  if (!path) return undefined;
  return String(path).split('.').reduce((value, key) => (value == null ? undefined : value[key]), object);
}

function selectorMatches(evidence, selector) {
  if (!evidence || !selector) return false;
  if (selector.kind && evidence.kind !== selector.kind) return false;
  if (selector.id && evidence.id !== selector.id) return false;
  if (selector.minTrust) {
    const actual = TRUST_RANK[evidence.trust] ?? -1;
    const required = TRUST_RANK[selector.minTrust] ?? Number.POSITIVE_INFINITY;
    if (actual < required) return false;
  }
  if (selector.path) {
    const actual = getPath(evidence, selector.path);
    if (Object.prototype.hasOwnProperty.call(selector, 'equals') && actual !== selector.equals) return false;
    if (selector.exists === true && typeof actual === 'undefined') return false;
    if (selector.exists === false && typeof actual !== 'undefined') return false;
  }
  return true;
}

function clauseMatches(evidenceSet, clause) {
  if (!clause || typeof clause !== 'object') return false;
  if (Array.isArray(clause.allOf)) return clause.allOf.every((part) => clauseMatches(evidenceSet, part));
  if (Array.isArray(clause.anyOf)) return clause.anyOf.some((part) => clauseMatches(evidenceSet, part));
  if (clause.not) return !clauseMatches(evidenceSet, clause.not);
  return evidenceSet.some((evidence) => selectorMatches(evidence, clause));
}

function evaluateClaim(claim, evidenceSet) {
  if (claim.coverage === 'OUT_OF_SCOPE') {
    return {
      claimId: claim.id,
      text: claim.text,
      status: 'NOT_COVERED',
      reasonCodes: ['CLAIM_OUT_OF_SCOPE'],
      satisfiedRequirements: [],
      missingEvidence: [],
      contradictions: [],
    };
  }

  const contradictions = (claim.contradictions || [])
    .filter((rule) => clauseMatches(evidenceSet, rule.when))
    .map((rule) => ({ id: rule.id, description: rule.description }));

  if (contradictions.length > 0) {
    return {
      claimId: claim.id,
      text: claim.text,
      status: 'CONTRADICTED',
      reasonCodes: ['CONTRADICTORY_EVIDENCE_PRESENT'],
      satisfiedRequirements: [],
      missingEvidence: [],
      contradictions,
    };
  }

  const requirements = claim.requirements || [];
  const satisfiedRequirements = [];
  const missingEvidence = [];
  for (const requirement of requirements) {
    if (clauseMatches(evidenceSet, requirement.when)) {
      satisfiedRequirements.push(requirement.id);
    } else {
      missingEvidence.push({
        requirementId: requirement.id,
        critical: requirement.critical !== false,
        description: requirement.missingEvidence || requirement.description,
      });
    }
  }

  const missingCritical = missingEvidence.filter((item) => item.critical);
  const missingNonCritical = missingEvidence.filter((item) => !item.critical);
  let status = 'SUPPORTED';
  const reasonCodes = [];

  if (missingCritical.length > 0) {
    status = 'UNKNOWN';
    reasonCodes.push('MISSING_CRITICAL_EVIDENCE');
  } else if (missingNonCritical.length > 0) {
    status = 'PARTIAL';
    reasonCodes.push('MISSING_NONCRITICAL_EVIDENCE');
  }

  return {
    claimId: claim.id,
    text: claim.text,
    status,
    reasonCodes,
    satisfiedRequirements,
    missingEvidence,
    contradictions,
  };
}

export function evaluateClaimSufficiency(input) {
  if (!input || input.schemaVersion !== 'velmere.claim-sufficiency.v0.1') {
    throw new Error('unsupported_claim_sufficiency_schema');
  }
  if (!input.subject?.id) throw new Error('exact_subject_required');
  if (!Array.isArray(input.evidence)) throw new Error('evidence_set_required');
  if (!Array.isArray(input.claims) || input.claims.length === 0) throw new Error('claims_required');

  const claimResults = input.claims.map((claim) => evaluateClaim(claim, input.evidence));
  const byId = new Map(claimResults.map((result) => [result.claimId, result]));
  const supportedNarrowerClaims = [];
  for (const claim of input.claims) {
    if (!claim.narrowerThan) continue;
    const result = byId.get(claim.id);
    const parent = byId.get(claim.narrowerThan);
    if (result?.status === 'SUPPORTED' && parent && parent.status !== 'SUPPORTED') {
      supportedNarrowerClaims.push({ parentClaimId: claim.narrowerThan, claimId: claim.id, text: claim.text });
    }
  }

  return {
    schemaVersion: 'velmere.claim-sufficiency-result.v0.1',
    subject: input.subject,
    policy: input.policy || null,
    evidenceCount: input.evidence.length,
    claimCount: input.claims.length,
    results: claimResults,
    supportedNarrowerClaims,
    staleTriggers: input.staleTriggers || [],
    reverificationTriggers: input.reverificationTriggers || [],
    truthBoundary:
      'This engine evaluates whether the supplied evidence set satisfies explicit claim requirements. It does not independently create or cryptographically validate upstream evidence unless an upstream verifier result is supplied as evidence.',
  };
}
