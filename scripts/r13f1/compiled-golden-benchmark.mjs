#!/usr/bin/env node
/** Diagnostic only: existing public fixtures are NOT a blind/external benchmark.
 * Run: node --import tsx scripts/r13f1/compiled-golden-benchmark.mjs
 * Uses actual deployed bytecode from lockfile solc. Does not deploy a contract,
 * execute target EVM transactions, call providers, or run CertiK software.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import solc from 'solc';
import { executeFullAuditV2 } from '../../lib/security/v2/master-audit-orchestrator.ts';
import { validateRemediationPatch } from '../../lib/security/v2/patch-validation-engine.ts';

const BASE = '671132a95a497e45c128a4dc364d6823edaf4168';
const out = path.resolve('r13f1-evidence');
fs.mkdirSync(out, { recursive: true });
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const replacer = (_key, value) => typeof value === 'bigint' ? value.toString() : value instanceof Map ? Object.fromEntries(value) : value instanceof Set ? [...value] : value;
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, replacer, 2) + '\n');
const tiers = ['BASIC', 'PRO', 'ADVANCED'];
const fixtures = [
  ['known-clean/CleanERC20.sol', 'CleanERC20', []],
  ['known-vulnerable/ReentrancyBank.sol', 'ReentrancyBank', ['VLM-SEC-REENTRANCY-01']],
  ['known-vulnerable/InsecureTxOriginWallet.sol', 'InsecureTxOriginWallet', ['VLM-SEC-AUTH-TXORIGIN-01']],
  ['known-exploited/EulerExploitModel.sol', 'EulerExploitModel', ['VLM-SEC-DEFI-VAULT-INFLATION-01']],
  ['known-clean/GuardedVault.sol', 'GuardedVault', []],
  ['known-vulnerable/SpotReserveLending.sol', 'SpotReserveLending', ['VLM-SEC-ORACLE-SPOT-MANIPULATION-01']],
  ['known-edge/WeirdUSDTToken.sol', 'WeirdUSDTToken', ['VLM-SEC-ERC-NON-STANDARD-RETURN-01']],
  ['known-exploited/SafeMoonExploitModel.sol', 'SafeMoonExploitModel', ['VLM-SEC-AUTH-UNPROTECTED-MINT-03']],
  ['known-edge/FeeOnTransferToken.sol', 'FeeOnTransferToken', []],
  ['known-vulnerable/VulnerableInflationVault.sol', 'VulnerableInflationVault', ['VLM-SEC-DEFI-VAULT-INFLATION-01']],
  ['known-upgradeable/Eip1967TransparentProxy.sol', 'Eip1967TransparentProxy', []],
];
const settings = { optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris', metadata: { bytecodeHash: 'none' }, outputSelection: { '*': { '*': ['abi', 'evm.deployedBytecode.object'] } } };
const results = [];
const errors = [];
const compileRecords = [];
const artifact = { schemaVersion: 'velmere.r13f1.compiled-golden-diagnostic.v1', observedAt: new Date().toISOString(), runtimeBaseCommit: BASE, harnessCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), compiler: solc.version(), settings, expectedLabelsSource: 'scripts/qa/benchmark-security-engine-v2.ts at runtimeBaseCommit', actualContractsDeployed: 0, externalCalls: 0, competitorExecutions: 0, independentValidation: false, results, compileRecords, errors };

function compile(sourcePath, source, contractName) {
  const input = { language: 'Solidity', sources: { [sourcePath]: { content: source } }, settings };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const diagnostics = output.errors ?? [];
  const hardErrors = diagnostics.filter((d) => d.severity === 'error');
  const bytecode = output.contracts?.[sourcePath]?.[contractName]?.evm?.deployedBytecode?.object;
  compileRecords.push({ path: sourcePath, name: contractName, sourceSha256: sha256(source), compilerInputSha256: sha256(JSON.stringify(input)), bytecodeSha256: bytecode ? sha256(Buffer.from(bytecode, 'hex')) : null, bytecodeBytes: bytecode ? bytecode.length / 2 : 0, diagnostics });
  if (hardErrors.length || !bytecode || !/^[0-9a-f]+$/i.test(bytecode)) throw new Error(`Compilation failed for ${sourcePath}: ${hardErrors.map((d) => d.formattedMessage).join('\n')}`);
  return '0x' + bytecode;
}
const decisionFingerprint = (audit) => sha256(JSON.stringify({ findings: audit.findings.map((f) => ({ id: f.findingId, severity: f.severity, confidence: f.confidence })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), scores: audit.scores, profile: audit.contractProfile }, replacer));

for (let index = 0; index < fixtures.length; index++) {
  const [relative, name, expected] = fixtures[index];
  const sourcePath = 'golden/' + relative;
  try {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const bytecode = compile(sourcePath, source, name);
    for (const tier of tiers) {
      const repeats = [];
      for (let repeat = 0; repeat < 2; repeat++) {
        const started = performance.now();
        const audit = executeFullAuditV2({ contractAddress: '0x' + (index + 1).toString(16).padStart(40, '0'), chainId: '1', blockNumber: 19000000, bytecode, sourceCode: source, contractName: name, tier });
        const measuredMs = performance.now() - started;
        const filename = `${name}-${tier}-${repeat + 1}.json`;
        write(filename, { fixture: name, tier, repeat: repeat + 1, measuredMs, targetDeployed: false, outputIsNotCertification: true, audit });
        repeats.push({ repeat: repeat + 1, measuredMs, decisionSha256: decisionFingerprint(audit), findingIds: [...new Set(audit.findings.map((f) => f.findingId))].sort(), highCriticalFindingIds: [...new Set(audit.findings.filter((f) => ['high', 'critical'].includes(f.severity)).map((f) => f.findingId))].sort(), formalClaims: audit.formalAssurance, modelFuzzIterations: audit.fuzzResults.iterationsExecuted, rawFile: filename });
      }
      const first = repeats[0];
      const missingExpected = expected.filter((id) => !first.findingIds.includes(id));
      const casePassed = expected.length ? missingExpected.length === 0 : first.highCriticalFindingIds.length === 0;
      results.push({ fixture: name, tier, expectedFindingIds: expected, negativeFixture: expected.length === 0, casePassed, missingExpected, repeats, deterministicDecisions: first.decisionSha256 === repeats[1].decisionSha256 });
    }
  } catch (error) { errors.push({ fixture: name, error: String(error) }); }
}

// A real compiled unchecked addition cannot prove the advertised universal
// Solidity-0.8 overflow-revert claim. This is a diagnostic, not an exploit.
try {
  const source = 'pragma solidity ^0.8.20; contract UncheckedAddition { function add(uint256 a, uint256 b) external pure returns (uint256) { unchecked { return a + b; } } }';
  const bytecode = compile('diagnostic/UncheckedAddition.sol', source, 'UncheckedAddition');
  const probe = executeFullAuditV2({ contractAddress: '0x' + '0'.repeat(39) + 'f', chainId: '1', bytecode, sourceCode: source, contractName: 'UncheckedAddition', tier: 'BASIC' });
  artifact.formalCounterProbe = { source, sourceSha256: sha256(source), formalClaims: probe.formalAssurance, unsupportedOverflowClaimObserved: probe.formalAssurance.some((p) => p.propertyId === 'FORMAL-PROP-01-TRANSFER-NO-OVERFLOW' && p.proven === true), explanation: 'The implementation traverses CFG but does not invoke a constraint solver or verify arithmetic semantics. unchecked addition is modulo 2^256, not overflow-reverting.' };
} catch (error) { errors.push({ fixture: 'UncheckedAddition', error: String(error) }); }

const patchProbe = validateRemediationPatch({ findingId: 'DIAGNOSTIC-UNIMPLEMENTED-PROPERTY', remediation: { solidityPatchDiff: '+this is not valid Solidity!!!' } }, 'pragma solidity ^0.8.20; contract Empty {}');
artifact.patchCounterProbe = { result: patchProbe, unsupportedCompilationClaimObserved: patchProbe.compilationClean === true && patchProbe.validationStatus === 'VERIFIED', explanation: 'Deliberately invalid appended Solidity; the validator does not compile it. validationProofDigest is not a real SHA-256 digest.' };
artifact.tierSummary = tiers.map((tier) => {
  const rows = results.filter((r) => r.tier === tier);
  const positives = rows.filter((r) => !r.negativeFixture);
  const negatives = rows.filter((r) => r.negativeFixture);
  return { tier, casesExecuted: rows.length, casesPassed: rows.filter((r) => r.casePassed).length, positiveExpectedIdHits: positives.filter((r) => r.casePassed).length, positiveCases: positives.length, negativeWithoutHighCritical: negatives.filter((r) => r.casePassed).length, negativeCases: negatives.length, negativeWithHighCritical: negatives.filter((r) => !r.casePassed).map((r) => r.fixture), expectedIdMisses: positives.filter((r) => !r.casePassed).map((r) => ({ fixture: r.fixture, missing: r.missingExpected })), deterministicCases: rows.filter((r) => r.deterministicDecisions).length, modelFuzzIterations: [...new Set(rows.map((r) => r.repeats[0].modelFuzzIterations))] };
});
artifact.sameFindingsAcrossTiers = fixtures.map(([, name]) => { const rows = results.filter((r) => r.fixture === name); return { fixture: name, comparedTiers: rows.length, identical: rows.length === 3 && new Set(rows.map((r) => JSON.stringify(r.repeats[0].findingIds))).size === 1 }; });
artifact.executionCompleted = errors.length === 0 && results.length === fixtures.length * tiers.length;
artifact.expectedLabelGatePassed = artifact.executionCompleted && results.every((r) => r.casePassed && r.deterministicDecisions);
artifact.truthClaimsGatePassed = !artifact.formalCounterProbe?.unsupportedOverflowClaimObserved && !artifact.patchCounterProbe.unsupportedCompilationClaimObserved;
artifact.qualityGatePassed = artifact.expectedLabelGatePassed && artifact.truthClaimsGatePassed;
artifact.releaseDecision = 'NO_GO';
artifact.limits = [
  '11 existing self-authored fixtures, not an independently curated or blind sample.',
  '33 tier/case rows and 66 repeated engine executions, not 66 independent contracts.',
  'Fixture exploit models are not historical deployed-contract replays.',
  'Compiled deployed bytecode is actual solc output, but target EVM transactions were not executed.',
  'Source code is also provided to the engine; this is not bytecode-only detection.',
  'Labels test selected expected IDs and negative high/critical alarms, not exhaustive finding-level precision.',
  'V2 internal model fuzzing is not target-contract EVM invariant fuzzing.',
  'No CertiK, OpenZeppelin, Trail of Bits or other competitor was run on this corpus.',
  'No paid Audit/Shield/Real Markets route was qualified by this engine-only measurement.'
];
write('COMPILED_BENCHMARK.json', artifact);
console.log(JSON.stringify({ executionCompleted: artifact.executionCompleted, compiler: artifact.compiler, tierSummary: artifact.tierSummary, formalCounterProbe: artifact.formalCounterProbe, patchCounterProbe: artifact.patchCounterProbe, sameFindingsAcrossTiers: artifact.sameFindingsAcrossTiers, expectedLabelGatePassed: artifact.expectedLabelGatePassed, truthClaimsGatePassed: artifact.truthClaimsGatePassed, qualityGatePassed: artifact.qualityGatePassed, releaseDecision: artifact.releaseDecision }, replacer, 2));
if (!artifact.qualityGatePassed) process.exitCode = 1;
