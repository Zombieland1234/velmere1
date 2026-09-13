#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { evaluateClaimSufficiency } from './claim-sufficiency-engine.mjs';

const VELMERE_BASE_SHA = 'c9e194e21804c55c27ccecfac537814d62a66493';
const BOLYRA_SHA = '9e076ba105b1d75ad4182d4ce0b302e42899a4dd';
const BOLYRA_README_BLOB = 'dd1e40ee46e4de0bb0b7fa9349ca15a78b7b0e46';
const BOLYRA_CHAIN_TEST_BLOB = '50d7a21198018418e7c317388eeea0150c97e2e5';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const commonClaims = [
  {
    id: 'complete-through-checkpoint',
    text: 'The presented receipt log is complete through the claimed checkpoint.',
    coverage: 'IN_SCOPE',
    requirements: [
      {
        id: 'internal-chain-validity',
        critical: true,
        description: 'The presented chain must pass the upstream chain verifier.',
        missingEvidence: 'A successful upstream chain-verification result for the exact presented receipt set.',
        when: { kind: 'upstream_chain_verification', minTrust: 'SOURCE_ASSERTED', path: 'assertions.ok', equals: true },
      },
      {
        id: 'trusted-completeness-anchor',
        critical: true,
        description: 'Completeness requires an independently trusted checkpoint-bound expected count or expected head hash.',
        missingEvidence: 'An independently trusted checkpoint-bound expectedCount OR expectedHeadHash.',
        when: {
          anyOf: [
            { kind: 'expected_count_anchor', minTrust: 'INDEPENDENT_TRUSTED', path: 'assertions.checkpointBound', equals: true },
            { kind: 'expected_head_anchor', minTrust: 'INDEPENDENT_TRUSTED', path: 'assertions.checkpointBound', equals: true },
          ],
        },
      },
    ],
    contradictions: [
      {
        id: 'upstream-completeness-mismatch',
        description: 'The upstream verifier detected a count/head mismatch against a trusted expectation.',
        when: { kind: 'upstream_chain_verification', path: 'assertions.completenessMismatch', equals: true },
      },
    ],
  },
  {
    id: 'internally-valid-presented-prefix',
    text: 'The presented receipts form an internally valid chain/prefix under the supplied upstream verification result.',
    coverage: 'IN_SCOPE',
    narrowerThan: 'complete-through-checkpoint',
    requirements: [
      {
        id: 'internal-chain-validity',
        critical: true,
        missingEvidence: 'A successful upstream chain-verification result for the exact presented receipt set.',
        when: { kind: 'upstream_chain_verification', minTrust: 'SOURCE_ASSERTED', path: 'assertions.ok', equals: true },
      },
    ],
  },
];

function makeInput(extraEvidence = []) {
  return {
    schemaVersion: 'velmere.claim-sufficiency.v0.1',
    subject: {
      type: 'EXTERNAL_RECEIPT_SET',
      id: 'bolyra-public-tail-truncation-boundary-case',
      velmereBaseSha: VELMERE_BASE_SHA,
      upstreamRepo: 'bolyra/bolyra',
      upstreamSha: BOLYRA_SHA,
      upstreamArtifacts: [
        { path: 'integrations/receipts/README.md', blobSha: BOLYRA_README_BLOB },
        { path: 'integrations/receipts/test/chain.test.ts', blobSha: BOLYRA_CHAIN_TEST_BLOB },
      ],
    },
    policy: {
      id: 'velmere-claim-sufficiency-policy-v0.1',
      rule: 'A broader completeness claim fails closed to UNKNOWN when a critical completeness trust anchor is absent.',
    },
    evidence: [
      {
        id: 'bolyra-documented-chain-verifier-result-model',
        kind: 'upstream_chain_verification',
        trust: 'SOURCE_ASSERTED',
        assertions: {
          ok: true,
          scope: 'internal_consistency_of_presented_prefix',
          tailTruncationDetectableWithoutExternalExpectation: false,
          completenessMismatch: false,
        },
        provenance: {
          repo: 'bolyra/bolyra',
          sha: BOLYRA_SHA,
          readmeBlobSha: BOLYRA_README_BLOB,
          chainTestBlobSha: BOLYRA_CHAIN_TEST_BLOB,
        },
      },
      ...extraEvidence,
    ],
    claims: commonClaims,
    staleTriggers: [
      'Bolyra receipt-chain verification semantics change',
      'the exact presented receipt set changes',
      'the trusted completeness anchor or its checkpoint provenance changes',
    ],
    reverificationTriggers: [
      'new receipt appended after the assessed checkpoint',
      'new independently trusted expectedCount becomes available',
      'new independently trusted expectedHeadHash becomes available',
    ],
  };
}

const noAnchor = evaluateClaimSufficiency(makeInput());
const byId = Object.fromEntries(noAnchor.results.map((r) => [r.claimId, r]));
assert.equal(byId['complete-through-checkpoint'].status, 'UNKNOWN');
assert.equal(byId['complete-through-checkpoint'].reasonCodes[0], 'MISSING_CRITICAL_EVIDENCE');
assert.equal(byId['complete-through-checkpoint'].missingEvidence[0]?.requirementId, 'trusted-completeness-anchor');
assert.equal(byId['internally-valid-presented-prefix'].status, 'SUPPORTED');
assert.equal(noAnchor.supportedNarrowerClaims[0]?.claimId, 'internally-valid-presented-prefix');

const withTrustedCount = evaluateClaimSufficiency(
  makeInput([
    {
      id: 'checkpoint-count-4',
      kind: 'expected_count_anchor',
      trust: 'INDEPENDENT_TRUSTED',
      assertions: { expectedCount: 4, checkpointBound: true },
    },
  ]),
);
assert.equal(withTrustedCount.results.find((r) => r.claimId === 'complete-through-checkpoint')?.status, 'SUPPORTED');

const withTrustedHead = evaluateClaimSufficiency(
  makeInput([
    {
      id: 'checkpoint-head-r3',
      kind: 'expected_head_anchor',
      trust: 'INDEPENDENT_TRUSTED',
      assertions: { expectedHeadHash: '0xsynthetic-r3-head', checkpointBound: true },
    },
  ]),
);
assert.equal(withTrustedHead.results.find((r) => r.claimId === 'complete-through-checkpoint')?.status, 'SUPPORTED');

const contradiction = evaluateClaimSufficiency({
  ...makeInput(),
  evidence: [
    {
      id: 'bolyra-upstream-mismatch',
      kind: 'upstream_chain_verification',
      trust: 'SOURCE_ASSERTED',
      assertions: { ok: false, completenessMismatch: true },
    },
  ],
});
assert.equal(contradiction.results.find((r) => r.claimId === 'complete-through-checkpoint')?.status, 'CONTRADICTED');

const enginePath = fileURLToPath(new URL('./claim-sufficiency-engine.mjs', import.meta.url));
const testPath = fileURLToPath(import.meta.url);

const report = {
  schemaVersion: 'velmere.bolyra.claim-sufficiency-test.v1',
  implementation: {
    engineSchema: 'velmere.claim-sufficiency.v0.1',
    commitSha: process.env.VELMERE_IMPLEMENTATION_SHA || null,
    engineSha256: sha256(fs.readFileSync(enginePath)),
    testSha256: sha256(fs.readFileSync(testPath)),
  },
  generatedFrom: {
    velmereBaseSha: VELMERE_BASE_SHA,
    bolyraSha: BOLYRA_SHA,
    bolyraReadmeBlobSha: BOLYRA_README_BLOB,
    bolyraChainTestBlobSha: BOLYRA_CHAIN_TEST_BLOB,
  },
  executedCases: 4,
  assertionsPassed: 8,
  primaryCase: noAnchor,
  controls: {
    trustedExpectedCount: withTrustedCount,
    trustedExpectedHeadHash: withTrustedHead,
    explicitMismatch: contradiction,
  },
  conclusion: {
    attemptedClaim: 'The presented receipt log is complete through the claimed checkpoint.',
    verdict: byId['complete-through-checkpoint'].status,
    reason: 'MISSING_CRITICAL_EVIDENCE',
    missingEvidence: byId['complete-through-checkpoint'].missingEvidence,
    narrowerSupportedClaim: noAnchor.supportedNarrowerClaims,
  },
  nonClaims: [
    'This test does not claim an independent cryptographic re-verification of a live Bolyra receipt.',
    'The upstream-chain-validity input is source-asserted from Bolyra public documentation/tests pinned to the recorded upstream SHA.',
    'This test evaluates claim sufficiency over supplied evidence and explicit trust requirements.',
  ],
};
report.reportSha256 = sha256(JSON.stringify(report));
const out = process.argv[2] || '/mnt/data/VELMERE_BOLYRA_CLAIM_SUFFICIENCY_RUN_v1.json';
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  passed: true,
  executedCases: report.executedCases,
  assertionsPassed: report.assertionsPassed,
  primaryVerdict: report.conclusion.verdict,
  missingRequirement: report.conclusion.missingEvidence.map((x) => x.requirementId),
  narrowerSupportedClaim: report.conclusion.narrowerSupportedClaim.map((x) => x.claimId),
  reportSha256: report.reportSha256,
  output: out,
}, null, 2));
