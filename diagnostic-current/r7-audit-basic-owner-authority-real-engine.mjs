import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const solc = require(path.join(process.cwd(), 'r7-audit-engine-deps', 'node_modules', 'solc'));
const astModuleUrl = pathToFileURL(path.join(process.cwd(), 'r7-work', 'lib', 'security', 'solidity-compiler-ast-runtime.mjs')).href;
const engineModuleUrl = pathToFileURL(path.join(process.cwd(), 'r7-work', 'lib', 'security', 'audit-a01-a05-engine.ts')).href;
const { analyzeSolidityCompilerOutputAst, verifySolidityCompilerAstEvidence } = await import(astModuleUrl);
const { executePass35AuditA01A05 } = await import(engineModuleUrl);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const sourceSha = '3f05fc95b3bfd3d41e96fa281e00a71302e35b8fff59f81f399a419cdb9f577e';
const runtimeSha = '2756d7c52baee85cacb504f6ee1df7aad6809ac8d94a4a111d76991f90d36d6e';
const address = '0xca11bde05977b3631167028862be2a173976ca11';

const sr = await fetch(`https://sourcify.dev/server/v2/contract/56/${address}?fields=all`, {
  headers: { accept: 'application/json', 'user-agent': 'velmere-r7-owner-authority-real-engine' },
  signal: AbortSignal.timeout(25_000),
});
if (!sr.ok) throw new Error(`sourcify_fetch_failed:${sr.status}`);
const raw = await sr.text();
const sc = JSON.parse(raw);
if (sc.match !== 'exact_match') throw new Error('sourcify_not_exact_match');
const rows = Object.entries(sc.sources ?? {}).filter(([p, v]) => /Multicall3\.sol$/i.test(p) && v && typeof v === 'object' && typeof v.content === 'string');
if (rows.length !== 1) throw new Error(`source_denominator:${rows.length}`);
const [sourcePath, record] = rows[0];
const source = record.content;
if (sha(Buffer.from(source, 'utf8')) !== sourceSha) throw new Error('exact_deployed_source_sha_mismatch');

const settings = sc.compilation?.compilerSettings ?? {};
const input = {
  language: 'Solidity',
  sources: { [sourcePath]: { content: source } },
  settings: {
    ...settings,
    outputSelection: { '*': { '': ['ast'], '*': ['abi', 'storageLayout', 'ir', 'irOptimized', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'evm.methodIdentifiers'] } },
  },
};
const compilerOutput = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (compilerOutput.errors ?? []).filter((r) => r.severity === 'error');
if (errors.length) throw new Error(errors.map((r) => r.formattedMessage ?? r.message).join('\n'));

const sourceFiles = [{ path: sourcePath, content: source }];
const astEvidence = analyzeSolidityCompilerOutputAst({
  sourceFiles,
  compilerVersion: '0.8.12+commit.f00d7308',
  expectedCompilerVersionPrefix: '0.8.12+commit.f00d7308',
  compilerOutput,
});
const astVerification = verifySolidityCompilerAstEvidence(astEvidence, sourceFiles);
if (astVerification.ok !== true) throw new Error(`compiler_ast_evidence_verification_failed:${JSON.stringify(astVerification)}`);

const onchain = String(sc.runtimeBytecode?.onchainBytecode ?? '').toLowerCase();
const recompiled = String(sc.runtimeBytecode?.recompiledBytecode ?? '').toLowerCase();
if (!/^0x[0-9a-f]{200,}$/.test(onchain) || !/^0x[0-9a-f]{200,}$/.test(recompiled)) throw new Error('runtime_bytecode_missing');
const liveRes = await fetch('https://bsc-dataseed.binance.org/', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getCode', params: [address, 'latest'] }),
  signal: AbortSignal.timeout(20_000),
});
if (!liveRes.ok) throw new Error(`bsc_rpc_failed:${liveRes.status}`);
const live = String((await liveRes.json()).result ?? '').toLowerCase();
if (live !== onchain) throw new Error('live_runtime_not_sourcify_onchain');
if (sha(Buffer.from(live.slice(2), 'hex')) !== runtimeSha) throw new Error('runtime_sha_mismatch');

const observedAt = new Date().toISOString();
const auditInput = {
  schemaVersion: 'velmere.pass35.audit-a01-a05-input.v1', inputClass: 'CUSTOMER_SUPPLIED_VERIFIED',
  caseRef: 'AUD-REAL-MULTICALL3-56', observedAt, chainId: '56', chainName: 'BSC', contractAddress: address, projectName: 'Multicall3',
  sourceFiles, abi: sc.abi,
  sourceProvenance: { provider: 'Sourcify API v2', sourceReference: `https://sourcify.dev/server/v2/contract/56/${address}?fields=all`, verifiedSource: true, observedAt, responseSha256: `sha256:${sha(Buffer.from(raw, 'utf8'))}` },
  compiler: { family: 'solc', version: '0.8.12+commit.f00d7308', optimizerEnabled: settings.optimizer?.enabled ?? null, optimizerRuns: settings.optimizer?.runs ?? null, evmVersion: settings.evmVersion ?? null, viaIR: settings.viaIR ?? null, settings },
  compiledRuntimeBytecode: recompiled, deployedRuntimeBytecode: live,
  compilerAstEvidence: astEvidence, compilerDeploymentBinding: null, compilerProxyBinding: null,
};

const report = executePass35AuditA01A05(auditInput);
if (report.controls.A01.passEligible !== true || report.controls.A02.passEligible !== true || report.controls.A03.passEligible !== true) {
  throw new Error(`owner_authority_a01_a03_not_pass:${JSON.stringify(report.controls)}`);
}
if (report.privilegeMap.length === 0 && report.controls.A04.passEligible !== true) {
  throw new Error(`a04_no_privilege_surface_should_be_pass:${JSON.stringify(report.controls.A04)}`);
}
if (report.privilegeMap.length > 0 && report.controls.A04.passEligible === true) {
  throw new Error('a04_privileged_surface_cannot_pass_without_current_state');
}
if (report.controls.A05.passEligible !== false) throw new Error('a05_local_engine_must_not_self_finalize');

const adjudication = JSON.parse(fs.readFileSync('r7-evidence/R7_AUDIT_BASIC_MULTICALL3_ADJUDICATION_PACKET.json', 'utf8'));
if (adjudication.reviewState?.twoIndependentExternalFamiliesExecuted !== true || adjudication.reviewState?.compilerAstTransportPresent !== true || adjudication.reviewState?.behavioralReproductionPresent !== true || adjudication.reviewState?.remediationRetestPresent !== true) {
  throw new Error('adjudication_packet_evidence_incomplete');
}
if (!Array.isArray(adjudication.confirmedFindings) || adjudication.confirmedFindings.length < 1) throw new Error('confirmed_finding_missing');
const confirmed = adjudication.confirmedFindings[0];
if (confirmed.state !== 'CONFIRMED_BEHAVIOR_REMEDIATION_RETESTED' || confirmed.severity !== 'medium' || confirmed.confidence < 90) throw new Error('confirmed_finding_not_release_quality');

const envelope = {
  schemaVersion: 'velmere.r7.audit-basic-owner-authority-real-engine.v1',
  status: 'PASS_OWNER_AUTHORITY_AUTOMATED_A01_A04_REAL_TARGET',
  github: { runId: process.env.GITHUB_RUN_ID, headSha: process.env.GITHUB_SHA, runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT) },
  exactCurrentSource: {
    fullSourceAggregateSha256: process.env.R7_RISK_FULL_SOURCE_AGGREGATE_SHA256,
    executionSliceAggregateSha256: process.env.R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256,
    executionSliceManifestSha256: process.env.R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256,
    executionBundleSha256: process.env.R7_RISK_BUNDLE_SHA256,
  },
  target: { chainId: '56', address, exactDeployedSourceSha256: sourceSha, runtimeSha256: runtimeSha, sourcifyMatch: sc.match },
  ownerAuthority: {
    humanQaOptionalNotReleasePrerequisite: true,
    source: 'VELMERE_CANONICAL_OWNER_DIRECTIVE_V17 + VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2',
  },
  compilerAst: { verification: astVerification, evidenceSha256: astEvidence.evidenceSha256, findings: astEvidence.findings.length },
  controls: report.controls,
  privilegeMapCount: report.privilegeMap.length,
  a04CurrentPrivilegeStateStillRequired: report.privilegeMap.length > 0,
  confirmedFinding: { findingId: confirmed.findingId, severity: confirmed.severity, confidence: confirmed.confidence, state: confirmed.state, retestStatus: confirmed.remediation?.retestStatus ?? null },
  externalEvidence: {
    slither: adjudication.evidence?.slither ?? null,
    aderyn: adjudication.evidence?.aderyn ?? null,
    behavior: adjudication.evidence?.valueBehavior ?? null,
    remediationRetest: adjudication.evidence?.remediationRetest ?? null,
  },
  a05FinalEligibilityStillExternalToLocalEngine: true,
  customerFinalCredit: false,
  paidValueCredit: false,
  report,
  truthBoundary: 'The current owner automation covenant supersedes the legacy mandatory-human A03/A04 semantics. This run proves automated A01-A04 eligibility on the real exact Multicall3 target subject to detected privilege-state requirements. A05 and Customer FINAL remain separate guarded adjudication gates and this run grants no final credit.',
};
fs.mkdirSync('artifacts/r7/audit-basic/owner-authority-real-engine', { recursive: true });
fs.writeFileSync('artifacts/r7/audit-basic/owner-authority-real-engine/R7_AUDIT_BASIC_OWNER_AUTHORITY_REAL_ENGINE.json', `${JSON.stringify(envelope, null, 2)}\n`);
console.log(JSON.stringify({ status: envelope.status, controls: report.controls, privilegeMapCount: report.privilegeMap.length, summary: report.summary, confirmedFinding: envelope.confirmedFinding, customerFinalCredit: false }, null, 2));
