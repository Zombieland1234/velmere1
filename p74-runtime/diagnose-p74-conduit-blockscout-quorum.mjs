import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT = process.env.P74_RESULT_DIR || path.resolve('p74-conduit-diagnostic-out');
const CONDUIT_RPC = 'https://rpc-ancient8-mainnet-0.t.conduit.xyz/';
const BLOCKSCOUT_RPC = 'https://scan.ancient8.gg/api/eth-rpc';
const EXPECTED_CHAIN_ID = '0x34fb5e38';
const TARGETS = Object.freeze({
  canonicalExpected: '0xca11bde05977b3631167028862be2a173976ca11',
  officialDocumented: '0xb76d6e8c82d06fd262ef3799db73d5a724108d4e',
});

fs.mkdirSync(OUT, { recursive: true });
const sha256 = (buf) => `sha256:${crypto.createHash('sha256').update(buf).digest('hex')}`;

function normalizeCode(value) {
  if (typeof value !== 'string' || !/^0x(?:[a-fA-F0-9]{2})*$/.test(value)) throw new Error('invalid_evm_bytecode');
  return value.toLowerCase();
}
function summarizeCode(code) {
  const normalized = normalizeCode(code);
  const payload = Buffer.from(normalized.slice(2), 'hex');
  return { byteLength: payload.length, empty: payload.length === 0, sha256: sha256(payload) };
}
async function rpc(url, provider, method, params = []) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 74, method, params });
  const started = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'VelmereP74Diagnostic/3.0' },
    body,
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${provider}:${method}:invalid_json:http_${response.status}:${text.slice(0,180)}`); }
  if (!response.ok) throw new Error(`${provider}:${method}:http_${response.status}:${text.slice(0,180)}`);
  if (json?.error || typeof json?.result !== 'string') throw new Error(`${provider}:${method}:rpc_error:${JSON.stringify(json?.error ?? json).slice(0,240)}`);
  return {
    result: json.result,
    statusCode: response.status,
    latencyMs: Date.now() - started,
    requestDigest: sha256(Buffer.from(body)),
  };
}

async function main() {
  const result = {
    schemaVersion: 'velmere.p74.conduit-blockscout-bytecode-diagnostic.v1',
    status: 'DIAGNOSTIC_RUNNING_NO_PRODUCT_CREDIT',
    generatedAt: new Date().toISOString(),
    chain: 'ancient8',
    chainIdDecimal: 888888888,
    sources: {
      conduit: { upstreamRoot: 'rpc-ancient8-mainnet-0.t.conduit.xyz', providerFamily: 'conduit_public_rpc' },
      blockscout: { upstreamRoot: 'scan.ancient8.gg', providerFamily: 'blockscout_instance_eth_rpc' },
    },
    targets: TARGETS,
    observations: {},
    quorum: null,
    errors: [],
    credit: { productChange: 0, deploymentGroundTruth: 0, currentRuntimeBytecode: 0, vulnerabilityGroundTruth: 0, customerFinal: 0, sale: 0, live: false },
    truthBoundary: 'Control-only network diagnostic. Conduit and Blockscout are treated only as independent acquisition roots, not decentralized node-consensus proof. No product or release numerator is promoted by this run.',
  };
  try {
    const [conduitChain, blockscoutChain, conduitHead, blockscoutHead] = await Promise.all([
      rpc(CONDUIT_RPC, 'conduit', 'eth_chainId'),
      rpc(BLOCKSCOUT_RPC, 'blockscout', 'eth_chainId'),
      rpc(CONDUIT_RPC, 'conduit', 'eth_blockNumber'),
      rpc(BLOCKSCOUT_RPC, 'blockscout', 'eth_blockNumber'),
    ]);
    result.observations.chainIds = { conduit: conduitChain, blockscout: blockscoutChain };
    result.observations.heads = { conduit: conduitHead, blockscout: blockscoutHead };
    if (conduitChain.result.toLowerCase() !== EXPECTED_CHAIN_ID || blockscoutChain.result.toLowerCase() !== EXPECTED_CHAIN_ID) {
      throw new Error(`chain_id_mismatch:conduit=${conduitChain.result}:blockscout=${blockscoutChain.result}`);
    }
    const conduitN = BigInt(conduitHead.result);
    const blockscoutN = BigInt(blockscoutHead.result);
    const snapshotN = conduitN < blockscoutN ? conduitN : blockscoutN;
    const snapshotTag = `0x${snapshotN.toString(16)}`;
    result.observations.snapshot = {
      blockNumberDecimal: snapshotN.toString(10),
      blockTag: snapshotTag,
      headGapBlocks: (conduitN >= blockscoutN ? conduitN - blockscoutN : blockscoutN - conduitN).toString(10),
    };

    const bytecode = {};
    for (const [id, address] of Object.entries(TARGETS)) {
      const [conduitCode, blockscoutCode] = await Promise.all([
        rpc(CONDUIT_RPC, 'conduit', 'eth_getCode', [address, snapshotTag]),
        rpc(BLOCKSCOUT_RPC, 'blockscout', 'eth_getCode', [address, snapshotTag]),
      ]);
      const conduitNormalized = normalizeCode(conduitCode.result);
      const blockscoutNormalized = normalizeCode(blockscoutCode.result);
      bytecode[id] = {
        address,
        conduit: { ...conduitCode, code: summarizeCode(conduitNormalized) },
        blockscout: { ...blockscoutCode, code: summarizeCode(blockscoutNormalized) },
        byteIdentical: conduitNormalized === blockscoutNormalized,
      };
    }
    result.observations.bytecode = bytecode;
    const canonical = bytecode.canonicalExpected;
    const alternate = bytecode.officialDocumented;
    const canonicalAgreement = canonical.byteIdentical && !canonical.conduit.code.empty && !canonical.blockscout.code.empty;
    const alternateAgreement = alternate.byteIdentical && !alternate.conduit.code.empty && !alternate.blockscout.code.empty;
    const distinctTargets = canonical.conduit.code.sha256 !== alternate.conduit.code.sha256;
    result.quorum = {
      twoIndependentAcquisitionRoots: true,
      sameCommonBlock: true,
      canonicalCodeAgrees: canonicalAgreement,
      officialDocumentedCodeAgrees: alternateAgreement,
      canonicalAndOfficialDocumentedDiffer: distinctTargets,
      pass: canonicalAgreement && alternateAgreement && distinctTargets,
    };
    result.status = result.quorum.pass ? 'DIAGNOSTIC_PASS_NO_PRODUCT_CREDIT' : 'DIAGNOSTIC_INCONCLUSIVE_NO_PRODUCT_CREDIT';
  } catch (error) {
    result.status = 'DIAGNOSTIC_BLOCKED_NO_PRODUCT_CREDIT';
    result.errors.push(error instanceof Error ? `${error.name}:${error.message}` : String(error));
  }
  fs.writeFileSync(path.join(OUT, 'P74_CONDUIT_BLOCKSCOUT_BYTECODE_DIAGNOSTIC.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
