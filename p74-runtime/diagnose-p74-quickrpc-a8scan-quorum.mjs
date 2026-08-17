import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT = process.env.P74_RESULT_DIR || path.resolve('p74-quickrpc-a8scan-out');
const A8 = 'https://scan.ancient8.gg/rpc';
const QUICK = 'https://quickrpc.com/api/ancient8';
const CHAIN = '0x34fb5e38';
const LAG = 64n;
const TARGETS = {
  canonicalExpected: '0xca11bde05977b3631167028862be2a173976ca11',
  officialDocumented: '0xb76d6e8c82d06fd262ef3799db73d5a724108d4e',
};
fs.mkdirSync(OUT, { recursive: true });
const sha = (b) => `sha256:${crypto.createHash('sha256').update(b).digest('hex')}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function norm(v) { return typeof v === 'string' ? v.toLowerCase() : v; }
function summarizeCode(v) {
  if (typeof v !== 'string' || !/^0x(?:[0-9a-fA-F]{2})*$/.test(v)) throw new Error('invalid_bytecode');
  const b = Buffer.from(v.slice(2), 'hex');
  return { byteLength: b.length, empty: b.length === 0, sha256: sha(b) };
}
async function rpcOnce(url, provider, method, params = [], attempt = 1) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 7406, method, params });
  const started = Date.now();
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'VelmereP74QuickRPC/1.0' }, body, signal: AbortSignal.timeout(15000), cache: 'no-store' });
    const text = await r.text();
    let j;
    try { j = JSON.parse(text); } catch { return { status: 'FAIL', provider, method, attempt, httpStatus: r.status, error: `invalid_json:${text.slice(0,220)}`, latencyMs: Date.now() - started, responseSha256: sha(Buffer.from(text)) }; }
    if (!r.ok || j?.error || j?.result === undefined || j?.result === null) return { status: 'FAIL', provider, method, attempt, httpStatus: r.status, error: JSON.stringify(j?.error ?? j).slice(0,320), latencyMs: Date.now() - started, responseSha256: sha(Buffer.from(text)) };
    return { status: 'PASS', provider, method, attempt, httpStatus: r.status, result: j.result, latencyMs: Date.now() - started, requestSha256: sha(Buffer.from(body)), responseSha256: sha(Buffer.from(text)) };
  } catch (e) {
    return { status: 'FAIL', provider, method, attempt, error: e instanceof Error ? `${e.name}:${e.message}` : String(e), latencyMs: Date.now() - started };
  }
}
async function rpc(url, provider, method, params = []) {
  const attempts = [];
  for (let i = 1; i <= 3; i++) {
    const row = await rpcOnce(url, provider, method, params, i);
    attempts.push(row);
    if (row.status === 'PASS') return { ...row, attempts };
    if (i < 3) await sleep([300, 900][i - 1]);
  }
  return { ...attempts.at(-1), attempts };
}

const result = {
  schemaVersion: 'velmere.p74.quickrpc-a8scan-exact-block-quorum.v1',
  status: 'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',
  generatedAt: new Date().toISOString(),
  chain: 'ancient8', chainIdDecimal: 888888888,
  providers: { a8scan: { root: A8, family: 'a8scan_blockscout_proxy' }, quickrpc: { root: QUICK, family: 'quickrpc_public_gateway' } },
  targets: TARGETS, observations: {}, checks: {}, errors: [],
  credit: { product: 0, currentRuntimeBytecode: 0, vulnerabilityGroundTruth: 0, customerFinal: 0, auditFinalPdf: 0, rights: 0, paidValue: 0, sale: 0, live: false },
  truthBoundary: 'Control-only two-root diagnostic. PASS requires exact Ancient8 chain ID, same exact snapshot block hash, and byte-identical code at both target addresses. eth_getProof support is recorded separately. Even PASS grants zero product/release credit until cryptographic MPT verification and guarded product integration plus exact-Windows/live regression pass.',
};

try {
  const [a8Chain, qChain, a8Head] = await Promise.all([
    rpc(A8, 'a8scan', 'eth_chainId'), rpc(QUICK, 'quickrpc', 'eth_chainId'), rpc(A8, 'a8scan', 'eth_blockNumber'),
  ]);
  result.observations.identity = { a8Chain, qChain, a8Head };
  if (a8Chain.status !== 'PASS' || qChain.status !== 'PASS' || a8Head.status !== 'PASS') throw new Error('provider_identity_or_a8_head_unavailable');
  if (norm(a8Chain.result) !== CHAIN || norm(qChain.result) !== CHAIN) throw new Error(`chain_id_mismatch:a8=${a8Chain.result}:quick=${qChain.result}`);
  const head = BigInt(a8Head.result);
  if (head <= LAG) throw new Error('a8_head_too_low');
  const snapshot = head - LAG;
  const tag = `0x${snapshot.toString(16)}`;
  result.observations.snapshot = { blockNumberDecimal: snapshot.toString(), blockTag: tag, safetyLagBlocks: LAG.toString() };

  const [a8Block, qBlock] = await Promise.all([
    rpc(A8, 'a8scan', 'eth_getBlockByNumber', [tag, false]),
    rpc(QUICK, 'quickrpc', 'eth_getBlockByNumber', [tag, false]),
  ]);
  result.observations.blocks = { a8scan: a8Block, quickrpc: qBlock };

  const rows = {};
  for (const [id, address] of Object.entries(TARGETS)) {
    const [a8Code, qCode, a8Proof, qProof] = await Promise.all([
      rpc(A8, 'a8scan', 'eth_getCode', [address, tag]),
      rpc(QUICK, 'quickrpc', 'eth_getCode', [address, tag]),
      rpc(A8, 'a8scan', 'eth_getProof', [address, [], tag]),
      rpc(QUICK, 'quickrpc', 'eth_getProof', [address, [], tag]),
    ]);
    const row = { address, a8scan: { code: a8Code, proof: a8Proof }, quickrpc: { code: qCode, proof: qProof }, codeByteIdentical: false, proofCodeHashIdentical: false };
    if (a8Code.status === 'PASS') try { row.a8scan.codeSummary = summarizeCode(a8Code.result); } catch (e) { result.errors.push(`${id}:a8_code:${e.message}`); }
    if (qCode.status === 'PASS') try { row.quickrpc.codeSummary = summarizeCode(qCode.result); } catch (e) { result.errors.push(`${id}:quick_code:${e.message}`); }
    if (row.a8scan.codeSummary && row.quickrpc.codeSummary) row.codeByteIdentical = row.a8scan.codeSummary.sha256 === row.quickrpc.codeSummary.sha256 && row.a8scan.codeSummary.byteLength === row.quickrpc.codeSummary.byteLength;
    if (a8Proof.status === 'PASS' && qProof.status === 'PASS') row.proofCodeHashIdentical = norm(a8Proof.result?.codeHash) === norm(qProof.result?.codeHash) && norm(a8Proof.result?.storageHash) === norm(qProof.result?.storageHash);
    rows[id] = row;
  }
  result.observations.targets = rows;

  const exactBlockHash = a8Block.status === 'PASS' && qBlock.status === 'PASS' && norm(a8Block.result?.hash) === norm(qBlock.result?.hash) && BigInt(a8Block.result?.number) === snapshot && BigInt(qBlock.result?.number) === snapshot;
  result.checks = {
    chainIdsExact: norm(a8Chain.result) === CHAIN && norm(qChain.result) === CHAIN,
    exactBlockHashAgrees: exactBlockHash,
    canonicalCodeAgrees: !!rows.canonicalExpected?.codeByteIdentical && !rows.canonicalExpected?.a8scan?.codeSummary?.empty,
    officialCodeAgrees: !!rows.officialDocumented?.codeByteIdentical && !rows.officialDocumented?.a8scan?.codeSummary?.empty,
    targetRuntimesDiffer: !!rows.canonicalExpected?.a8scan?.codeSummary && !!rows.officialDocumented?.a8scan?.codeSummary && rows.canonicalExpected.a8scan.codeSummary.sha256 !== rows.officialDocumented.a8scan.codeSummary.sha256,
    a8ProofAvailableForCanonical: rows.canonicalExpected?.a8scan?.proof?.status === 'PASS',
    a8ProofAvailableForOfficial: rows.officialDocumented?.a8scan?.proof?.status === 'PASS',
    quickrpcProofAvailableForCanonical: rows.canonicalExpected?.quickrpc?.proof?.status === 'PASS',
    quickrpcProofAvailableForOfficial: rows.officialDocumented?.quickrpc?.proof?.status === 'PASS',
    proofCodeHashesAgreeCanonical: !!rows.canonicalExpected?.proofCodeHashIdentical,
    proofCodeHashesAgreeOfficial: !!rows.officialDocumented?.proofCodeHashIdentical,
  };
  const corePass = result.checks.chainIdsExact && result.checks.exactBlockHashAgrees && result.checks.canonicalCodeAgrees && result.checks.officialCodeAgrees && result.checks.targetRuntimesDiffer;
  result.status = corePass ? 'DIAGNOSTIC_PASS_NO_PRODUCT_CREDIT' : 'DIAGNOSTIC_INCONCLUSIVE_NO_PRODUCT_CREDIT';
} catch (e) {
  result.status = 'DIAGNOSTIC_BLOCKED_NO_PRODUCT_CREDIT';
  result.errors.push(e instanceof Error ? `${e.name}:${e.message}` : String(e));
}
fs.writeFileSync(path.join(OUT, 'P74_QUICKRPC_A8SCAN_QUORUM_DIAGNOSTIC.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, checks: result.checks, errors: result.errors, observations: result.observations }, null, 2));
