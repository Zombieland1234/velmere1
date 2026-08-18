import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const sourceRoot = path.resolve(args.get('--source-root') || 'p78-work/source');
const outDir = path.resolve(args.get('--out-dir') || 'p78-out');
const solcRoot = path.resolve(args.get('--solc-root') || 'p78-solc');
fs.mkdirSync(outDir, { recursive: true });

const TARGET = {
  chain: 'ethereum',
  chainId: '0x1',
  address: '0xbb9bc244d798123fde783fcc1c72d3bb8c189413',
  project: 'The DAO',
  sourceRepo: 'TheDAO/DAO-1.0',
  sourceCommit: 'ceb4e8c66857485dbbb130bbcf190c95f3bbd666',
  compilerExpected: 'v0.3.1-2016-04-12-3ad5e82',
  optimizerExpectedRuns: 200,
};

const SOURCE_FILES = {
  'DAO.sol': '5cb40744b278c8706c7935e094d10f464cb42822',
  'TokenCreation.sol': 'daf6ba1e40606684185a13040cd297502e3d99d1',
  'Token.sol': '58360030e464da91fa760bfcc3313b090cac58c1',
  'ManagedAccount.sol': 'c9a01df48b9a0675b7e4bd17b1c3fd51adef4734',
  'README.md': 'f851e7399e495f853b62f6de33deb036ad26f83e',
  'LICENSE': '02bbb60bc49afc2d6a1bedf96288eab236d80fbd',
};

const RPCS = [
  ['publicnode', 'https://ethereum-rpc.publicnode.com'],
  ['llamarpc', 'https://eth.llamarpc.com'],
  ['flashbots', 'https://rpc.flashbots.net'],
  ['drpc', 'https://eth.drpc.org'],
  ['1rpc', 'https://1rpc.io/eth'],
  ['cloudflare', 'https://cloudflare-eth.com'],
];

const GROUND_TRUTH = [
  {
    id: 'ethereum-foundation-2016',
    root: 'blog.ethereum.org',
    url: 'https://blog.ethereum.org/2016/06/17/critical-update-re-dao-vulnerability',
    required: ['recursive', 'split'],
  },
  {
    id: 'arxiv-2606.01794',
    root: 'arxiv.org',
    url: 'https://arxiv.org/abs/2606.01794',
    required: ['DAO 2016', 'reentrancy'],
  },
  {
    id: 'ethereum-org-security-supplement',
    root: 'ethereum.org',
    url: 'https://ethereum.org/en/developers/docs/smart-contracts/security/',
    required: ['reentrancy', 'DAO'],
    supplementary: true,
  },
];

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');
const gitBlobSha1 = (b) => sha1(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b]));
const normalizeHex = (v) => typeof v === 'string' ? v.toLowerCase().replace(/^0x/, '') : '';
const isHex = (v) => typeof v === 'string' && /^[0-9a-fA-F]+$/.test(v) && v.length >= 100;

async function fetchResponse(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow', headers: { 'user-agent': 'velmere-p78-evidence-probe/1.0', ...(options.headers || {}) } });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBytes(url) {
  const response = await fetchResponse(url);
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return { bytes: Buffer.from(await response.arrayBuffer()), status: response.status, contentType: response.headers.get('content-type') || null, finalUrl: response.url };
}

async function fetchText(url) {
  const result = await fetchBytes(url);
  return { ...result, text: result.bytes.toString('utf8') };
}

async function rpc(endpoint, method, params) {
  const response = await fetchResponse(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 78, method, params }),
  }, 12000);
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`RPC_${body.error.code}:${body.error.message}`);
  return body.result;
}

function collectHexStrings(value, prefix = '', rows = []) {
  if (typeof value === 'string') {
    const v = normalizeHex(value);
    if (isHex(v)) rows.push({ path: prefix, hex: v });
    return rows;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectHexStrings(item, `${prefix}[${i}]`, rows));
    return rows;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectHexStrings(v, prefix ? `${prefix}.${k}` : k, rows);
  }
  return rows;
}

const sourceEvidence = [];
const sourceContents = {};
for (const [name, expectedBlobSha] of Object.entries(SOURCE_FILES)) {
  const url = `https://raw.githubusercontent.com/${TARGET.sourceRepo}/${TARGET.sourceCommit}/${name}`;
  try {
    const got = await fetchBytes(url);
    const blobSha = gitBlobSha1(got.bytes);
    sourceContents[name] = got.bytes.toString('utf8');
    sourceEvidence.push({
      name,
      status: 'PASS',
      bytes: got.bytes.length,
      sha256: sha256(got.bytes),
      gitBlobSha1: blobSha,
      expectedGitBlobSha1: expectedBlobSha,
      blobMatch: blobSha === expectedBlobSha,
      contentType: got.contentType,
    });
  } catch (error) {
    sourceEvidence.push({ name, status: 'FAIL', error: String(error?.message || error) });
  }
}
const sourceBindingPass = sourceEvidence.length === Object.keys(SOURCE_FILES).length && sourceEvidence.every((r) => r.status === 'PASS' && r.blobMatch);
const readmeAddressBound = (sourceContents['README.md'] || '').toLowerCase().includes(TARGET.address);
const licenseText = sourceContents.LICENSE || '';
const licensePass = /GNU LESSER GENERAL PUBLIC LICENSE/i.test(licenseText) && /Version 3/i.test(licenseText);

const groundTruthEvidence = [];
for (const row of GROUND_TRUTH) {
  try {
    const got = await fetchText(row.url);
    const compact = got.text.replace(/\s+/g, ' ');
    const assertions = row.required.map((needle) => ({ needle, matched: compact.toLowerCase().includes(needle.toLowerCase()) }));
    groundTruthEvidence.push({
      id: row.id,
      root: row.root,
      supplementary: Boolean(row.supplementary),
      status: assertions.every((x) => x.matched) ? 'PASS' : 'FAIL_ASSERTION',
      httpStatus: got.status,
      bytes: got.bytes.length,
      sha256: sha256(got.bytes),
      assertions,
    });
  } catch (error) {
    groundTruthEvidence.push({ id: row.id, root: row.root, supplementary: Boolean(row.supplementary), status: 'FAIL_FETCH', error: String(error?.message || error) });
  }
}
const primaryGroundTruth = groundTruthEvidence.filter((r) => !r.supplementary);
const groundTruthPass = primaryGroundTruth.length >= 2 && primaryGroundTruth.every((r) => r.status === 'PASS') && new Set(primaryGroundTruth.map((r) => r.root)).size >= 2;

const rpcEvidence = await Promise.all(RPCS.map(async ([id, endpoint]) => {
  try {
    const chainId = await rpc(endpoint, 'eth_chainId', []);
    const code = await rpc(endpoint, 'eth_getCode', [TARGET.address, 'latest']);
    const clean = normalizeHex(code);
    return {
      id,
      host: new URL(endpoint).host,
      status: chainId === TARGET.chainId && clean.length > 0 ? 'PASS' : 'FAIL_RESPONSE',
      chainId,
      codeBytes: Math.floor(clean.length / 2),
      codeSha256: clean ? sha256(Buffer.from(clean, 'hex')) : null,
    };
  } catch (error) {
    return { id, host: new URL(endpoint).host, status: 'FAIL', error: String(error?.message || error) };
  }
}));
const groups = new Map();
for (const row of rpcEvidence.filter((r) => r.status === 'PASS')) {
  const k = row.codeSha256;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(row);
}
const quorum = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0] || [null, []];
const runtimeQuorumPass = quorum[1].length >= 4;
const runtimeSha256 = quorum[0];
const runtimeBytes = quorum[1][0]?.codeBytes || 0;

let analyzer = { status: 'FAIL', error: 'not_run' };
try {
  const moduleUrl = pathToFileURL(path.join(sourceRoot, 'lib/security/solidity-structured-signal.mjs')).href;
  const mod = await import(moduleUrl);
  const result = mod.analyzeSolidityStructuredSignals(sourceContents['DAO.sol'] || '');
  analyzer = {
    status: 'PASS',
    analyzerClass: result.analyzerClass,
    signals: result.signals,
    reentrancyOrderDetected: result.signals.includes('reentrancy_order'),
    reentrancyModifierDetected: result.signals.includes('reentrancy_modifier_callback'),
    compilerAstCredit: result.compilerAstCredit,
    limitations: result.limitations,
    sourceHasPragma: /\bpragma\s+solidity\b/i.test(sourceContents['DAO.sol'] || ''),
  };
} catch (error) {
  analyzer = { status: 'FAIL', error: String(error?.stack || error) };
}

let compilerReplay = { status: 'NOT_RUN', package: 'solc@0.3.1-1' };
try {
  const requireFromSolc = createRequire(path.join(solcRoot, 'package.json'));
  const solc = requireFromSolc('solc');
  const compilerVersion = typeof solc.version === 'function' ? String(solc.version()) : null;
  const compileSources = {};
  for (const name of ['DAO.sol', 'TokenCreation.sol', 'Token.sol', 'ManagedAccount.sol']) compileSources[name] = sourceContents[name];
  const output = solc.compile({ sources: compileSources }, 1);
  const contracts = output?.contracts || {};
  const contractKeys = Object.keys(contracts);
  const daoKey = contractKeys.find((k) => k === 'DAO' || k.endsWith(':DAO')) || null;
  const daoOutput = daoKey ? contracts[daoKey] : null;
  const candidates = collectHexStrings(daoOutput || {}).sort((a, b) => b.hex.length - a.hex.length);
  const exactRuntimeCandidates = runtimeSha256 && quorum[1].length ? candidates.filter((c) => sha256(Buffer.from(c.hex, 'hex')) === runtimeSha256) : [];
  compilerReplay = {
    status: 'PASS_COMPILE',
    package: 'solc@0.3.1-1',
    compilerVersion,
    compilerVersionMatchesExpectedCommit: compilerVersion ? compilerVersion.includes('0.3.1') && compilerVersion.includes('3ad5e82') : false,
    contractKeys,
    daoKey,
    outputErrors: output?.errors || [],
    daoOutputKeys: daoOutput && typeof daoOutput === 'object' ? Object.keys(daoOutput) : [],
    hexCandidates: candidates.slice(0, 12).map((c) => ({ path: c.path, bytes: c.hex.length / 2, sha256: sha256(Buffer.from(c.hex, 'hex')) })),
    exactRuntimeMatchPaths: exactRuntimeCandidates.map((c) => c.path),
    exactRuntimeMatch: exactRuntimeCandidates.length > 0,
  };
} catch (error) {
  compilerReplay = { status: 'FAIL', package: 'solc@0.3.1-1', error: String(error?.stack || error) };
}

const rawDetectorPass = analyzer.status === 'PASS' && (analyzer.reentrancyOrderDetected || analyzer.reentrancyModifierDetected);
const detectorLegacyVisibilityGap = analyzer.status === 'PASS' && !analyzer.sourceHasPragma && !rawDetectorPass;
const compilerExactPass = compilerReplay.status === 'PASS_COMPILE' && compilerReplay.compilerVersionMatchesExpectedCommit && compilerReplay.exactRuntimeMatch;

const status = sourceBindingPass && readmeAddressBound && licensePass && groundTruthPass && runtimeQuorumPass
  ? (rawDetectorPass && compilerExactPass ? 'PASS_P78_DAO_GROUND_TRUTH_AND_EXACT_REPLAY' : 'PASS_P78_DAO_EXTERNAL_GROUND_TRUTH_WITH_INTERNAL_BLOCKERS')
  : 'FAIL_P78_DAO_EVIDENCE_ENVELOPE';

const receipt = {
  schemaVersion: 'velmere.p78.dao-real-vulnerability-ground-truth-diagnostic.v1',
  generatedAt: new Date().toISOString(),
  status,
  target: TARGET,
  source: {
    sourceBindingPass,
    readmeAddressBound,
    licensePass,
    files: sourceEvidence,
  },
  currentRuntime: {
    quorumRequired: 4,
    quorumObserved: quorum[1].length,
    pass: runtimeQuorumPass,
    runtimeSha256,
    runtimeBytes,
    agreeingProviders: quorum[1].map((r) => r.id),
    rpcEvidence,
  },
  vulnerabilityGroundTruth: {
    kind: 'reentrancy',
    exploitedHistorically: true,
    targetFunction: 'splitDAO',
    primaryIndependentRootsRequired: 2,
    pass: groundTruthPass,
    evidence: groundTruthEvidence,
    boundedClaim: 'The DAO 2016 splitDAO path is a historically exploited reentrancy vulnerability. This receipt does not prove that arbitrary current contracts are exploitable.',
  },
  currentVelmereDetector: {
    ...analyzer,
    rawDetectorPass,
    legacyVisibilityGap: detectorLegacyVisibilityGap,
    note: detectorLegacyVisibilityGap ? 'Pinned compiler is pre-0.5 and source has no pragma; current structured analyzer therefore may misclassify omitted visibility as unspecified instead of legacy-public.' : null,
  },
  compilerReplay,
  gates: {
    sourceBindingPass,
    readmeAddressBound,
    licensePass,
    groundTruthPass,
    runtimeQuorumPass,
    rawDetectorPass,
    compilerExactPass,
  },
  zeroFakeCredit: {
    customerFinal: '0/20',
    auditFinalPdf: '0/3',
    paidValue: '0/10',
    saleEligible: '0/20',
    live: false,
  },
  truthBoundary: 'P78 diagnostic only. External historical vulnerability ground truth, current runtime quorum, source/license binding, current Velmere detector behavior, and compiler replay are measured separately. No Customer FINAL, Audit FINAL PDF, rights, paid-value, sale, LIVE, exploit-generation or world-class credit is granted by this diagnostic.',
};
receipt.integritySha256 = sha256(Buffer.from(JSON.stringify(receipt)));
const outPath = path.join(outDir, 'P78_DAO_REAL_GROUND_TRUTH_DIAGNOSTIC.json');
fs.writeFileSync(outPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ status: receipt.status, gates: receipt.gates, runtime: receipt.currentRuntime, detector: { rawDetectorPass, legacyVisibilityGap: detectorLegacyVisibilityGap, signals: analyzer.signals }, compilerReplay: { status: compilerReplay.status, compilerVersion: compilerReplay.compilerVersion, exactRuntimeMatch: compilerReplay.exactRuntimeMatch }, integritySha256: receipt.integritySha256 }, null, 2));
if (!sourceBindingPass || !readmeAddressBound || !licensePass || !groundTruthPass || !runtimeQuorumPass) process.exit(2);
