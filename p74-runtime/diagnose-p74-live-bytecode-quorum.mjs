import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT = process.env.P74_RESULT_DIR || path.resolve('p74-diagnostic-out');
const BLOCKSCOUT_RPC = 'https://scan.ancient8.gg/api/eth-rpc';
const ROUTESCAN_BASE = 'https://api.routescan.io/v2/network/mainnet/evm/888888888/etherscan/api';
const CHAIN_ID_DEC = 888888888;
const CHAIN_ID_HEX = '0x34fb5e38';
const TARGETS = Object.freeze({
  canonicalExpected: '0xca11bde05977b3631167028862be2a173976ca11',
  officialDocumented: '0xb76d6e8c82d06fd262ef3799db73d5a724108d4e',
});

fs.mkdirSync(OUT, { recursive: true });

function sha256Hex(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function normalizeCode(value) {
  if (typeof value !== 'string' || !/^0x(?:[a-fA-F0-9]{2})*$/.test(value)) throw new Error('invalid_evm_bytecode');
  return value.toLowerCase();
}

function codeSummary(code) {
  const normalized = normalizeCode(code);
  const payload = normalized.slice(2);
  return {
    hexChars: payload.length,
    byteLength: payload.length / 2,
    empty: payload.length === 0,
    sha256: sha256Hex(Buffer.from(payload, 'hex')),
  };
}

async function fetchJson(url, init, label) {
  const started = Date.now();
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12000), cache: 'no-store' });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${label}:invalid_json:http_${response.status}:${text.slice(0,160)}`); }
  if (!response.ok) throw new Error(`${label}:http_${response.status}:${text.slice(0,160)}`);
  return { json, statusCode: response.status, latencyMs: Date.now() - started };
}

async function blockscout(method, params = []) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 74, method, params });
  const { json, statusCode, latencyMs } = await fetchJson(BLOCKSCOUT_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'VelmereP74Diagnostic/2.0' },
    body,
  }, `blockscout:${method}`);
  if (!json || json.error || typeof json.result !== 'string') throw new Error(`blockscout:${method}:rpc_error:${JSON.stringify(json?.error ?? json).slice(0,240)}`);
  return { result: json.result, statusCode, latencyMs, requestDigest: sha256Hex(Buffer.from(body)) };
}

async function routescan(action, params = {}) {
  const url = new URL(ROUTESCAN_BASE);
  url.searchParams.set('module', 'proxy');
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const { json, statusCode, latencyMs } = await fetchJson(url, {
    method: 'GET',
    headers: { accept: 'application/json', 'user-agent': 'VelmereP74Diagnostic/2.0' },
  }, `routescan:${action}`);
  if (!json || json.error || typeof json.result !== 'string') throw new Error(`routescan:${action}:rpc_error:${JSON.stringify(json?.error ?? json).slice(0,240)}`);
  return { result: json.result, statusCode, latencyMs, requestDigest: sha256Hex(Buffer.from(url.toString())) };
}

async function main() {
  const result = {
    schemaVersion: 'velmere.p74.live-bytecode-quorum-diagnostic.v2',
    status: 'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',
    generatedAt: new Date().toISOString(),
    chain: 'ancient8',
    chainIdDecimal: CHAIN_ID_DEC,
    chainIdHex: CHAIN_ID_HEX,
    sources: {
      blockscout: { upstreamRoot: 'scan.ancient8.gg', providerFamily: 'blockscout_instance_eth_rpc', transport: 'POST /api/eth-rpc' },
      routescan: { upstreamRoot: 'api.routescan.io', providerFamily: 'routescan_etherscan_proxy_api', transport: 'GET module=proxy' },
    },
    targets: TARGETS,
    observations: {},
    quorum: null,
    errors: [],
    credit: {
      productChange: 0,
      deploymentGroundTruth: 0,
      currentRuntimeBytecode: 0,
      vulnerabilityGroundTruth: 0,
      customerFinal: 0,
      sale: 0,
      live: false,
    },
    truthBoundary: 'Control-only live diagnostic. It changes no product bytes and grants zero release credit. Blockscout and Routescan are independent acquisition roots, not a decentralized node-consensus proof. A future product receipt may credit current runtime bytecode only after exact product integration, same-block byte agreement, and exact Windows engineering pass.',
  };

  try {
    const [blockscoutChainId, blockscoutHead, routescanHead] = await Promise.all([
      blockscout('eth_chainId'),
      blockscout('eth_blockNumber'),
      routescan('eth_blockNumber'),
    ]);
    result.observations.chainId = { blockscout: blockscoutChainId };
    result.observations.heads = { blockscout: blockscoutHead, routescan: routescanHead };
    if (blockscoutChainId.result.toLowerCase() !== CHAIN_ID_HEX) throw new Error(`chain_id_mismatch:${blockscoutChainId.result}`);
    const blockscoutN = BigInt(blockscoutHead.result);
    const routescanN = BigInt(routescanHead.result);
    const snapshotN = blockscoutN < routescanN ? blockscoutN : routescanN;
    const snapshotTag = `0x${snapshotN.toString(16)}`;
    result.observations.snapshot = {
      blockNumberDecimal: snapshotN.toString(10),
      blockTag: snapshotTag,
      headGapBlocks: (blockscoutN >= routescanN ? blockscoutN - routescanN : routescanN - blockscoutN).toString(10),
    };

    const targetRows = {};
    for (const [id, address] of Object.entries(TARGETS)) {
      const [blockscoutCode, routescanCode] = await Promise.all([
        blockscout('eth_getCode', [address, snapshotTag]),
        routescan('eth_getCode', { address, tag: snapshotTag }),
      ]);
      const blockscoutNormalized = normalizeCode(blockscoutCode.result);
      const routescanNormalized = normalizeCode(routescanCode.result);
      targetRows[id] = {
        address,
        blockscout: { ...blockscoutCode, code: codeSummary(blockscoutNormalized) },
        routescan: { ...routescanCode, code: codeSummary(routescanNormalized) },
        byteIdentical: blockscoutNormalized === routescanNormalized,
      };
    }
    result.observations.bytecode = targetRows;
    const canonical = targetRows.canonicalExpected;
    const alternate = targetRows.officialDocumented;
    const twoRoots = result.sources.blockscout.upstreamRoot !== result.sources.routescan.upstreamRoot;
    const sameAtCanonical = canonical.byteIdentical && !canonical.blockscout.code.empty && !canonical.routescan.code.empty;
    const sameAtAlternate = alternate.byteIdentical && !alternate.blockscout.code.empty && !alternate.routescan.code.empty;
    const distinctDeployments = canonical.blockscout.code.sha256 !== alternate.blockscout.code.sha256;
    result.quorum = {
      twoIndependentRoots: twoRoots,
      sameCommonBlock: true,
      canonicalCodeAgrees: sameAtCanonical,
      officialDocumentedCodeAgrees: sameAtAlternate,
      canonicalAndOfficialDocumentedDiffer: distinctDeployments,
      pass: twoRoots && sameAtCanonical && sameAtAlternate && distinctDeployments,
    };
    result.status = result.quorum.pass ? 'DIAGNOSTIC_PASS_NO_PRODUCT_CREDIT' : 'DIAGNOSTIC_INCONCLUSIVE_NO_PRODUCT_CREDIT';
  } catch (error) {
    result.status = 'DIAGNOSTIC_BLOCKED_NO_PRODUCT_CREDIT';
    result.errors.push(error instanceof Error ? `${error.name}:${error.message}` : String(error));
  }

  fs.writeFileSync(path.join(OUT, 'P74_LIVE_BYTECODE_QUORUM_DIAGNOSTIC.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
