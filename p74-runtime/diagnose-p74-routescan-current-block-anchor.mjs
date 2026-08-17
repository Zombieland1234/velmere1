import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT = process.env.P74_RESULT_DIR || path.resolve('p74-routescan-current-block-anchor-out');
const A8_RPC = 'https://scan.ancient8.gg/rpc';
const ROUTESCAN_BASE = 'https://api.routescan.io/v2/network/mainnet/evm/888888888';
const CHAIN_ID_HEX = '0x34fb5e38';
const CHAIN_ID_DEC = '888888888';
const SAFETY_LAG = 64n;
fs.mkdirSync(OUT, { recursive: true });

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const normalizeHex = (v) => typeof v === 'string' ? v.toLowerCase() : v;

async function rpc(method, params = []) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 7405, method, params });
  const started = Date.now();
  const response = await fetch(A8_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'VelmereP74RoutescanAnchor/1.0' },
    body,
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${method}:invalid_json:http_${response.status}:${text.slice(0,180)}`); }
  if (!response.ok || json?.error || json?.result === undefined || json?.result === null) {
    throw new Error(`${method}:rpc_error:http_${response.status}:${JSON.stringify(json?.error ?? json).slice(0,260)}`);
  }
  return { result: json.result, httpStatus: response.status, latencyMs: Date.now() - started, requestSha256: sha256(Buffer.from(body)), responseSha256: sha256(Buffer.from(text)) };
}

async function rest(url) {
  const started = Date.now();
  const response = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json', 'user-agent': 'VelmereP74RoutescanAnchor/1.0' },
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`routescan_invalid_json:http_${response.status}:${text.slice(0,220)}`); }
  if (!response.ok) throw new Error(`routescan_http_${response.status}:${JSON.stringify(json).slice(0,300)}`);
  return { json, httpStatus: response.status, latencyMs: Date.now() - started, responseSha256: sha256(Buffer.from(text)), url };
}

const result = {
  schemaVersion: 'velmere.p74.routescan-current-block-anchor.v1',
  status: 'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',
  generatedAt: new Date().toISOString(),
  chain: 'ancient8',
  chainIdDecimal: 888888888,
  safetyLagBlocks: SAFETY_LAG.toString(),
  observations: {},
  checks: {},
  errors: [],
  credit: { product: 0, currentRuntimeBytecode: 0, vulnerabilityGroundTruth: 0, customerFinal: 0, auditFinalPdf: 0, rights: 0, paidValue: 0, sale: 0, live: false },
  truthBoundary: 'Control-only independent block-anchor diagnostic. PASS requires A8Scan and Routescan to identify the same Ancient8 exact block number with the same block hash. PASS itself grants zero product/release credit; it is only eligible as an independent anchor input to a later MPT current-bytecode proof and guarded product integration.',
};

try {
  const [chain, head] = await Promise.all([rpc('eth_chainId'), rpc('eth_blockNumber')]);
  if (normalizeHex(chain.result) !== CHAIN_ID_HEX) throw new Error(`a8_chain_id_mismatch:${chain.result}`);
  const headN = BigInt(head.result);
  if (headN <= SAFETY_LAG) throw new Error(`a8_head_too_low:${head.result}`);
  const snapshot = headN - SAFETY_LAG;
  const tag = `0x${snapshot.toString(16)}`;
  const block = await rpc('eth_getBlockByNumber', [tag, false]);
  const b = block.result;
  if (!b || typeof b !== 'object') throw new Error('a8_block_missing');
  if (BigInt(b.number) !== snapshot) throw new Error(`a8_block_number_mismatch:${b.number}:${snapshot}`);
  const ts = Number(BigInt(b.timestamp));
  if (!Number.isSafeInteger(ts) || ts <= 0) throw new Error(`a8_timestamp_invalid:${b.timestamp}`);
  const from = new Date((ts - 4) * 1000).toISOString();
  const to = new Date((ts + 5) * 1000).toISOString();
  const blocksUrl = `${ROUTESCAN_BASE}/blocks?timestampFrom=${encodeURIComponent(from)}&timestampTo=${encodeURIComponent(to)}&sort=asc`;
  const chainsUrl = `${ROUTESCAN_BASE}/blockchains?description=false&tags=false`;
  const [routescanBlocks, routescanChains] = await Promise.all([rest(blocksUrl), rest(chainsUrl)]);
  const items = Array.isArray(routescanBlocks.json?.items) ? routescanBlocks.json.items : [];
  const exact = items.find((row) => Number(row?.number) === Number(snapshot));
  const chainItems = Array.isArray(routescanChains.json?.items) ? routescanChains.json.items : [];
  const chainRow = chainItems.find((row) => String(row?.chainId) === CHAIN_ID_DEC || String(row?.evmChainId) === CHAIN_ID_DEC) ?? chainItems[0] ?? null;

  result.observations = {
    a8scan: {
      chainId: chain.result,
      head: head.result,
      snapshotBlockNumber: snapshot.toString(),
      snapshotBlockTag: tag,
      block: { number: b.number, hash: b.hash, parentHash: b.parentHash, stateRoot: b.stateRoot, timestamp: b.timestamp, timestampIso: new Date(ts * 1000).toISOString() },
      requestEvidence: { chain, head, block: { httpStatus: block.httpStatus, latencyMs: block.latencyMs, requestSha256: block.requestSha256, responseSha256: block.responseSha256 } },
    },
    routescan: {
      timestampWindow: { from, to },
      blocksHttpStatus: routescanBlocks.httpStatus,
      blocksResponseSha256: routescanBlocks.responseSha256,
      candidateCount: items.length,
      exactBlock: exact ?? null,
      chainHttpStatus: routescanChains.httpStatus,
      chainResponseSha256: routescanChains.responseSha256,
      chainRow,
    },
  };

  result.checks = {
    a8ChainExact: normalizeHex(chain.result) === CHAIN_ID_HEX,
    a8ExactBlockReturned: BigInt(b.number) === snapshot,
    routescanReturnedCandidates: items.length > 0,
    routescanExactBlockNumberFound: !!exact,
    routescanExactChainId: !!exact && String(exact.chainId) === CHAIN_ID_DEC,
    routescanBlockHashMatchesA8Scan: !!exact && normalizeHex(exact.id) === normalizeHex(b.hash),
    routescanParentHashMatchesA8Scan: !!exact && normalizeHex(exact.parent) === normalizeHex(b.parentHash),
  };
  const pass = Object.values(result.checks).every(Boolean);
  result.status = pass ? 'DIAGNOSTIC_PASS_NO_PRODUCT_CREDIT' : 'DIAGNOSTIC_INCONCLUSIVE_NO_PRODUCT_CREDIT';
} catch (error) {
  result.status = 'DIAGNOSTIC_BLOCKED_NO_PRODUCT_CREDIT';
  result.errors.push(error instanceof Error ? `${error.name}:${error.message}` : String(error));
}

fs.writeFileSync(path.join(OUT, 'P74_ROUTEScan_CURRENT_BLOCK_ANCHOR.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, checks: result.checks, errors: result.errors, observations: result.observations }, null, 2));
