import crypto from 'node:crypto';

export const CLAIM_STATUSES = Object.freeze({
  SUPPORTED: 'SUPPORTED',
  PARTIAL: 'PARTIAL',
  UNKNOWN: 'UNKNOWN',
  NOT_COVERED: 'NOT_COVERED',
  CONTRADICTED: 'CONTRADICTED',
});

export const SUFFICIENCY = Object.freeze({
  SUFFICIENT: 'SUFFICIENT_FOR_CLAIM',
  NOT_SUFFICIENT: 'NOT_SUFFICIENT_FOR_CLAIM',
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(stable(value));
}

export function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : canonicalJson(value)).digest('hex');
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

/**
 * Minimal pre-release claim-sufficiency evaluator.
 *
 * Truth boundary:
 * - It evaluates whether supplied evidence is sufficient for the supplied claim under explicit policy.
 * - It does NOT independently establish that external evidence is authentic unless the input includes
 *   a separately trusted basis for that fact.
 * - It does NOT audit Bolyra, certify Bolyra, or assert a defect in Bolyra's verifier.
 */
export function evaluateReceiptCompletenessClaim(input) {
  const { claim, evidence, policy = {} } = input;
  const missingEvidence = [];
  const conflictingEvidence = [];
  const observations = [];

  if (claim?.type !== 'COMPLETE_RECEIPT_HISTORY_THROUGH_CHECKPOINT') {
    return finalize({
      claim,
      evidence,
      policy,
      status: CLAIM_STATUSES.NOT_COVERED,
      sufficiency: SUFFICIENCY.NOT_SUFFICIENT,
      observations: ['Claim type is outside this prototype evaluator.'],
      missingEvidence: [],
      conflictingEvidence: [],
      narrowerSupportableClaim: null,
    });
  }

  if (evidence?.receiptVerification?.ok !== true) {
    if (evidence?.receiptVerification?.ok === false) {
      conflictingEvidence.push('Presented receipt chain failed structural verification.');
      return finalize({
        claim,
        evidence,
        policy,
        status: CLAIM_STATUSES.CONTRADICTED,
        sufficiency: SUFFICIENCY.NOT_SUFFICIENT,
        observations,
        missingEvidence,
        conflictingEvidence,
        narrowerSupportableClaim: null,
      });
    }
    missingEvidence.push('A receipt-chain verification result bound to the presented receipt set.');
  } else {
    observations.push('Presented receipt set passed the supplied structural receipt-chain verification result.');
  }

  const presentedCount = evidence?.presentedReceiptSet?.count;
  const presentedHeadHash = evidence?.presentedReceiptSet?.headHash;
  const expectedCount = evidence?.checkpointExpectation?.expectedCount;
  const expectedHeadHash = evidence?.checkpointExpectation?.expectedHeadHash;
  const checkpointProvenanceTrusted = evidence?.checkpointExpectation?.provenanceTrusted === true;

  const countExpectationPresent = hasValue(expectedCount);
  const headExpectationPresent = hasValue(expectedHeadHash);

  if (!countExpectationPresent && !headExpectationPresent) {
    missingEvidence.push('An independently trusted expected receipt count OR expected terminal/head receipt hash for the claimed checkpoint.');
  }

  if ((countExpectationPresent || headExpectationPresent) && !checkpointProvenanceTrusted) {
    missingEvidence.push('Trusted provenance for the checkpoint expectation.');
  }

  if (countExpectationPresent && hasValue(presentedCount)) {
    if (Number(expectedCount) !== Number(presentedCount)) {
      conflictingEvidence.push(`Trusted expected receipt count (${expectedCount}) does not equal presented count (${presentedCount}).`);
    } else {
      observations.push('Presented receipt count matches the supplied checkpoint expectation.');
    }
  }

  if (headExpectationPresent && hasValue(presentedHeadHash)) {
    if (String(expectedHeadHash).toLowerCase() !== String(presentedHeadHash).toLowerCase()) {
      conflictingEvidence.push('Trusted expected terminal/head receipt hash does not match the presented head hash.');
    } else {
      observations.push('Presented head hash matches the supplied checkpoint expectation.');
    }
  }

  if (policy.requireTrustedSignerForAuthoritativeHistory === true) {
    if (evidence?.signerTrust?.independentlyTrusted !== true) {
      missingEvidence.push('An independently trusted signer identity/basis for an authoritative-history claim.');
    } else {
      observations.push('Signer identity is independently trusted under the supplied policy input.');
    }
  }

  if (conflictingEvidence.length > 0) {
    return finalize({
      claim,
      evidence,
      policy,
      status: CLAIM_STATUSES.CONTRADICTED,
      sufficiency: SUFFICIENCY.NOT_SUFFICIENT,
      observations,
      missingEvidence,
      conflictingEvidence,
      narrowerSupportableClaim: evidence?.receiptVerification?.ok === true
        ? 'The presented receipts form an internally valid verified prefix/set under the supplied verification inputs; completeness through the claimed checkpoint is contradicted by the trusted expectation.'
        : null,
    });
  }

  if (missingEvidence.length > 0) {
    return finalize({
      claim,
      evidence,
      policy,
      status: CLAIM_STATUSES.UNKNOWN,
      sufficiency: SUFFICIENCY.NOT_SUFFICIENT,
      observations,
      missingEvidence,
      conflictingEvidence,
      narrowerSupportableClaim: evidence?.receiptVerification?.ok === true
        ? 'The presented receipts form an internally valid verified prefix/set under the supplied verification inputs. Completeness beyond the presented set is not established.'
        : null,
    });
  }

  return finalize({
    claim,
    evidence,
    policy,
    status: CLAIM_STATUSES.SUPPORTED,
    sufficiency: SUFFICIENCY.SUFFICIENT,
    observations,
    missingEvidence,
    conflictingEvidence,
    narrowerSupportableClaim: claim.statement,
  });
}

function finalize({ claim, evidence, policy, status, sufficiency, observations, missingEvidence, conflictingEvidence, narrowerSupportableClaim }) {
  const evaluatedAt = 'DETERMINISTIC_NO_WALL_CLOCK';
  const resultCore = {
    schema: 'velmere.claim-sufficiency.result.v0.1',
    engine: 'VelmereClaimSufficiencyPrototype/0.1',
    evaluatedAt,
    claimId: claim?.id ?? null,
    claimType: claim?.type ?? null,
    claimStatement: claim?.statement ?? null,
    status,
    sufficiency,
    observations,
    missingEvidence,
    conflictingEvidence,
    narrowerSupportableClaim,
    staleTriggers: [
      'receipt-set identity changes',
      'checkpoint expectation changes',
      'checkpoint provenance/trust basis changes',
      'signer trust basis changes when signer trust is required by policy',
      'verification policy changes',
    ],
    reverificationRequiredOnStale: true,
    truthBoundary: [
      'Pre-release claim-sufficiency prototype.',
      'Machine-evaluates supplied evidence against explicit claim requirements.',
      'Does not independently authenticate external evidence unless an independent trust basis is supplied as evidence.',
      'Does not constitute a Bolyra audit, certification, vulnerability finding, or endorsement.',
    ],
    inputDigestSha256: sha256({ claim, evidence, policy }),
  };

  return {
    ...resultCore,
    resultDigestSha256: sha256(resultCore),
  };
}
