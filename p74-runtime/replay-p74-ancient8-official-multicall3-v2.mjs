import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const OUT = process.env.P74_RESULT_DIR || path.resolve('p74-ancient8-official-replay-v2-out');
const ADDRESS = '0xb76d6e8c82d06fd262ef3799db73d5a724108d4e';
const CHAIN_ID = 888888888;
const SOURCE_URL = `https://scan.ancient8.gg/api/code?address=${ADDRESS}&chainId=${CHAIN_ID}&highlight=false`;
const RPC = 'https://scan.ancient8.gg/rpc';
const EXPECTED_COMPILER = '0.8.26+commit.8a97fa7a';
const EXPECTED_RUNTIME_BYTES = 3178;
const EXPECTED_RUNTIME_SHA256 = 'sha256:435d8ffcf6c6dac190ab1d07c5c9f09d7f9ee92acd6b5c24d8149601ac12bbc1';
fs.mkdirSync(OUT, { recursive: true });

const sha256 = (b) => `sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'VelmereP74ReplayV2/1.0' },
    signal: AbortSignal.timeout(20000), cache: 'no-store',
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`source_http_${response.status}:${text.slice(0,300)}`);
  return { json: JSON.parse(text), text, status: response.status, sha256: sha256(Buffer.from(text)) };
}

async function rpc(method, params = []) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 7410, method, params });
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'VelmereP74ReplayV2/1.0' },
    body, signal: AbortSignal.timeout(20000), cache: 'no-store',
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${method}:invalid_json:http_${response.status}`); }
  if (!response.ok || json?.error || json?.result === undefined || json?.result === null) {
    throw new Error(`${method}:rpc_error:http_${response.status}:${JSON.stringify(json?.error ?? json).slice(0,300)}`);
  }
  return { result: json.result, httpStatus: response.status, requestSha256: sha256(Buffer.from(body)), responseSha256: sha256(Buffer.from(text)) };
}

function runtimeSummary(value) {
  if (typeof value !== 'string') throw new Error('runtime_not_string');
  const clean = (value.startsWith('0x') ? value.slice(2) : value).toLowerCase();
  if (!/^(?:[0-9a-f]{2})*$/.test(clean)) throw new Error('invalid_runtime_hex');
  const bytes = Buffer.from(clean, 'hex');
  return { bytes: bytes.length, sha256: sha256(bytes), hex: `0x${clean}` };
}

function stripSolidityMetadata(value) {
  const clean = (value.startsWith('0x') ? value.slice(2) : value).toLowerCase();
  if (clean.length < 4) return clean;
  const metadataBytes = Number.parseInt(clean.slice(-4), 16);
  if (!Number.isFinite(metadataBytes)) return clean;
  const cut = clean.length - 4 - metadataBytes * 2;
  return cut >= 0 ? clean.slice(0, cut) : clean;
}

function run(command, args, options = {}) {
  const row = spawnSync(command, args, { encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024, ...options });
  return { status: row.status, signal: row.signal, error: row.error ? `${row.error.name}:${row.error.message}` : null, stdout: row.stdout ?? '', stderr: row.stderr ?? '' };
}

function installSolc(tmp) {
  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec || process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
    const command = `npm install --no-audit --no-fund --ignore-scripts --prefix "${tmp}" solc@0.8.26`;
    return run(comspec, ['/d', '/s', '/c', command]);
  }
  return run('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--prefix', tmp, 'solc@0.8.26']);
}

const result = {
  schemaVersion: 'velmere.p74r2.ancient8-official-multicall3-replay.v2',
  status: 'RUNNING_NO_PRODUCT_CREDIT', generatedAt: new Date().toISOString(), chain: 'ancient8', chainId: CHAIN_ID, address: ADDRESS,
  expected: { compiler: EXPECTED_COMPILER, runtimeBytes: EXPECTED_RUNTIME_BYTES, runtimeSha256: EXPECTED_RUNTIME_SHA256 },
  observations: {}, checks: {}, errors: [],
  credit: { product: 0, currentRuntimeBytecode: 0, sourceDeploymentIdentity: 0, vulnerabilityGroundTruth: 0, customerFinal: 0, auditFinalPdf: 0, rights: 0, paidValue: 0, sale: 0, live: false },
  truthBoundary: 'PASS may grant only bounded source-to-current-runtime identity for the official Ancient8 Multicall3 deployment. Independent-provider quorum, vulnerability ground truth, product/customer-final/rights/paid/sale/LIVE remain separate gates.',
};

try {
  const source = await getJson(SOURCE_URL);
  fs.writeFileSync(path.join(OUT, 'A8SCAN_CODE_RESPONSE.json'), source.text);
  const j = source.json;
  const std = structuredClone(j.stdJsonInput);

  if (j.match !== 'exact_match' || j.creationMatch !== 'exact_match' || j.runtimeMatch !== 'exact_match') throw new Error(`verification_not_exact:${j.match}/${j.creationMatch}/${j.runtimeMatch}`);
  if (Number(j.chainId) !== CHAIN_ID || String(j.address).toLowerCase() !== ADDRESS) throw new Error('verified_target_identity_mismatch');
  if (j.compilation?.compiler !== 'solc' || j.compilation?.compilerVersion !== EXPECTED_COMPILER) throw new Error(`compiler_mismatch:${j.compilation?.compilerVersion}`);
  if (std?.language !== 'Solidity' || !std?.sources?.['Multicall3.sol']?.content) throw new Error('std_json_source_missing');
  if (std?.settings?.optimizer?.enabled !== true || std?.settings?.optimizer?.runs !== 200) throw new Error('optimizer_settings_mismatch');

  const sourceText = std.sources['Multicall3.sol'].content;
  const originalStdJsonSha256 = sha256(Buffer.from(JSON.stringify(std)));
  std.settings = { ...(std.settings ?? {}), outputSelection: { '*': { '*': ['abi', 'metadata', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } } };
  const inputText = JSON.stringify(std);
  fs.writeFileSync(path.join(OUT, 'SOLC_STANDARD_INPUT.json'), `${inputText}\n`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'velmere-p74r2-solc-'));
  const install = installSolc(tmp);
  fs.writeFileSync(path.join(OUT, 'NPM_INSTALL_STDOUT.txt'), install.stdout);
  fs.writeFileSync(path.join(OUT, 'NPM_INSTALL_STDERR.txt'), `${install.stderr}\nSPAWN_ERROR=${install.error ?? ''}\nSTATUS=${String(install.status)}\nSIGNAL=${String(install.signal ?? '')}\n`);
  if (install.status !== 0) throw new Error(`npm_install_solc_failed:status=${String(install.status)}:error=${install.error ?? 'none'}:stderr=${install.stderr.slice(0,800)}`);

  const packagePath = path.join(tmp, 'node_modules', 'solc', 'package.json');
  const solcJs = path.join(tmp, 'node_modules', 'solc', 'solc.js');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const versionRun = run(process.execPath, [solcJs, '--version'], { timeout: 30000 });
  const versionText = versionRun.stdout.trim();
  fs.writeFileSync(path.join(OUT, 'SOLC_VERSION.txt'), `${versionText}\n${versionRun.stderr}`);
  if (versionRun.status !== 0 || !versionText.includes(EXPECTED_COMPILER)) throw new Error(`solc_version_failed:${versionText}:${versionRun.stderr.slice(0,500)}`);

  const compile = run(process.execPath, [solcJs, '--standard-json'], { input: inputText, timeout: 120000 });
  fs.writeFileSync(path.join(OUT, 'SOLC_STDOUT.txt'), compile.stdout);
  fs.writeFileSync(path.join(OUT, 'SOLC_STDERR.txt'), compile.stderr);
  if (compile.status !== 0) throw new Error(`solc_compile_failed:${String(compile.status)}:${compile.error ?? ''}:${compile.stderr.slice(0,1000)}`);
  const jsonStart = compile.stdout.indexOf('{');
  if (jsonStart < 0) throw new Error('solc_json_output_missing');
  const compiled = JSON.parse(compile.stdout.slice(jsonStart));
  const hardErrors = (compiled.errors ?? []).filter((e) => e.severity === 'error');
  if (hardErrors.length) throw new Error(`solc_errors:${JSON.stringify(hardErrors).slice(0,3000)}`);
  const contract = compiled.contracts?.['Multicall3.sol']?.Multicall3;
  if (!contract) throw new Error('compiled_contract_missing');

  const replay = runtimeSummary(contract.evm?.deployedBytecode?.object ?? '');
  const [chain, head] = await Promise.all([rpc('eth_chainId'), rpc('eth_blockNumber')]);
  if (String(chain.result).toLowerCase() !== '0x34fb5e38') throw new Error(`chain_id_mismatch:${chain.result}`);
  const deployed = await rpc('eth_getCode', [ADDRESS, head.result]);
  const live = runtimeSummary(deployed.result);
  fs.writeFileSync(path.join(OUT, 'REPLAY_RUNTIME.hex'), `${replay.hex}\n`);
  fs.writeFileSync(path.join(OUT, 'LIVE_RUNTIME.hex'), `${live.hex}\n`);

  const replayCore = stripSolidityMetadata(replay.hex);
  const liveCore = stripSolidityMetadata(live.hex);
  result.observations = {
    source: { httpStatus: source.status, responseSha256: source.sha256, verifiedAt: j.verifiedAt, matchId: j.matchId, match: j.match, creationMatch: j.creationMatch, runtimeMatch: j.runtimeMatch, originalStdJsonSha256, sourceBytes: Buffer.byteLength(sourceText), sourceSha256: sha256(Buffer.from(sourceText)), compilation: j.compilation },
    toolchain: { os: process.platform, node: process.version, npmPackageVersion: pkg.version, solcVersionOutput: versionText },
    replay: { bytes: replay.bytes, sha256: replay.sha256, coreBytes: replayCore.length / 2, coreSha256: sha256(Buffer.from(replayCore, 'hex')) },
    live: { blockTag: head.result, bytes: live.bytes, sha256: live.sha256, coreBytes: liveCore.length / 2, coreSha256: sha256(Buffer.from(liveCore, 'hex')), rpcEvidence: { chain: chain.responseSha256, head: head.responseSha256, code: deployed.responseSha256 } },
  };
  result.checks = {
    sourceVerificationExact: j.match === 'exact_match' && j.creationMatch === 'exact_match' && j.runtimeMatch === 'exact_match',
    compilerExact: versionText.includes(EXPECTED_COMPILER),
    optimizerExact: std.settings.optimizer.enabled === true && std.settings.optimizer.runs === 200,
    replayExpectedBytes: replay.bytes === EXPECTED_RUNTIME_BYTES,
    replayExpectedSha256: replay.sha256 === EXPECTED_RUNTIME_SHA256,
    liveExpectedBytes: live.bytes === EXPECTED_RUNTIME_BYTES,
    liveExpectedSha256: live.sha256 === EXPECTED_RUNTIME_SHA256,
    replayLiveByteExact: replay.hex === live.hex,
    replayLiveCoreExact: replayCore === liveCore,
  };
  const pass = Object.values(result.checks).every(Boolean);
  if (pass) {
    result.status = 'PASS_BOUNDED_SOURCE_TO_CURRENT_RUNTIME_IDENTITY';
    result.credit.currentRuntimeBytecode = 1;
    result.credit.sourceDeploymentIdentity = 1;
  } else {
    result.status = 'FAIL_NO_PRODUCT_CREDIT';
  }
} catch (error) {
  result.status = 'BLOCKED_NO_PRODUCT_CREDIT';
  result.errors.push(error instanceof Error ? `${error.name}:${error.message}` : String(error));
}

fs.writeFileSync(path.join(OUT, 'P74R2_ANCIENT8_OFFICIAL_MULTICALL3_REPLAY.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, checks: result.checks, observations: result.observations, credit: result.credit, errors: result.errors }, null, 2));
