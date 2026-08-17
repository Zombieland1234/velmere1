import https from 'node:https';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const OUT = resolve(process.env.P73_RESULT_DIR || 'p73-out');
mkdirSync(OUT, { recursive: true });

const ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11';
const ANCIENT8_RPC = 'https://rpc.ancient8.gg';
const EXPECTED_CHAIN_ID = '0x34fb5e3b8'; // 888888888
const P70_REFERENCE = Object.freeze({
  chainId: '1',
  blockNumber: 25770896,
  runtimeByteLength: 3808,
  runtimeSha256: '2756d7c52baee85cacb504f6ee1df7aad6809ac8d94a4a111d76991f90d36d6e',
  metadataStrippedCoreSha256: 'adedd3b42c412842999739844a78c8689e7496eecfef420c00e3f85aac4523d4',
  sourceCommit: 'b667d67ecfa5361a81e8f110234ce242613b0012',
  sourceSha256: '2054218939d3fa0f52f8ce1a33658d570a550671f63197356ee5744f7e188b1e',
  sourcePath: 'src/Multicall3.sol',
});
const MAINTAINER_COMMENT = Object.freeze({
  host: 'api.github.com',
  path: '/repos/mds1/multicall3/issues/comments/2495504312',
  author: 'mds1',
  issue: 336,
  requiredPhrases: [
    'deployer key has been compromised',
    'someone used it to deploy a different contract on Ancient8',
    'regular Multicall3 contract cannot be deployed at this address',
  ],
});

function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }
function normalizeHex(hex) {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) throw new Error('invalid_hex');
  return hex.toLowerCase();
}
function runtimeIdentity(hex) {
  const norm = normalizeHex(hex);
  const bytes = Buffer.from(norm.slice(2), 'hex');
  return { byteLength: bytes.length, sha256: sha256(bytes), hexSha256: sha256(Buffer.from(norm, 'utf8')) };
}
function requestJson({ hostname, path, method = 'GET', body = null, headers = {} }) {
  return new Promise((resolvePromise, reject) => {
    const req = https.request({
      hostname, path, method, port: 443,
      headers: { 'user-agent': 'velmere-p73-ground-truth/1.0', 'accept': 'application/vnd.github+json', ...headers },
      timeout: 15000,
      maxRedirects: 0,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        if ((res.statusCode || 0) >= 300 && (res.statusCode || 0) < 400) return reject(new Error(`redirect_rejected:${res.statusCode}`));
        if ((res.statusCode || 0) < 200 || (res.statusCode || 0) >= 300) return reject(new Error(`http_${res.statusCode}:${raw.toString('utf8').slice(0,300)}`));
        try { resolvePromise({ json: JSON.parse(raw.toString('utf8')), raw, statusCode: res.statusCode, headers: res.headers }); }
        catch (e) { reject(new Error(`invalid_json:${e.message}`)); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
async function rpc(method, params) {
  const u = new URL(ANCIENT8_RPC);
  const payload = JSON.stringify({ jsonrpc: '2.0', id: 73, method, params });
  const { json, raw, statusCode } = await requestJson({
    hostname: u.hostname,
    path: u.pathname || '/',
    method: 'POST',
    body: payload,
    headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload), 'accept': 'application/json' },
  });
  if (json.error) throw new Error(`rpc_error:${method}:${JSON.stringify(json.error)}`);
  if (!Object.prototype.hasOwnProperty.call(json, 'result')) throw new Error(`rpc_missing_result:${method}`);
  return { result: json.result, responseSha256: sha256(raw), statusCode };
}

async function main() {
  const startedAt = new Date().toISOString();
  const chain = await rpc('eth_chainId', []);
  if (String(chain.result).toLowerCase() !== EXPECTED_CHAIN_ID) throw new Error(`chain_id_mismatch:${chain.result}`);
  const block = await rpc('eth_blockNumber', []);
  const code = await rpc('eth_getCode', [ADDRESS, 'latest']);
  const current = runtimeIdentity(code.result);
  if (current.byteLength === 0) throw new Error('ancient8_target_has_no_code');

  const source = await requestJson({ hostname: MAINTAINER_COMMENT.host, path: MAINTAINER_COMMENT.path });
  const comment = source.json;
  const body = String(comment.body || '');
  const maintainerBound = comment?.user?.login === MAINTAINER_COMMENT.author && MAINTAINER_COMMENT.requiredPhrases.every((p) => body.includes(p));
  if (!maintainerBound) throw new Error('maintainer_ground_truth_not_content_bound');

  const exactRuntimeMatchesKnownGood = current.byteLength === P70_REFERENCE.runtimeByteLength && current.sha256 === P70_REFERENCE.runtimeSha256;
  const classification = exactRuntimeMatchesKnownGood
    ? 'CURRENT_ANCIENT8_DEPLOYMENT_MATCHES_P70_CANONICAL_REFERENCE_GROUND_TRUTH_STALE_OR_REMEDIATED'
    : 'CURRENT_ANCIENT8_DEPLOYMENT_DIFFERS_FROM_P70_CANONICAL_REFERENCE_AND_OFFICIAL_MAINTAINER_GROUND_TRUTH_CONFIRMS_WRONG_CONTRACT';
  const positiveGroundTruth = !exactRuntimeMatchesKnownGood && maintainerBound;

  const receipt = {
    schemaVersion: 'velmere.p73.ancient8-multicall3-current-ground-truth.v1',
    status: positiveGroundTruth ? 'PASS_POSITIVE_CURRENT_DEPLOYMENT_IDENTITY_GROUND_TRUTH' : 'PASS_NO_POSITIVE_CURRENT_MISMATCH',
    observedAt: new Date().toISOString(), startedAt,
    target: { chain: 'Ancient8 Mainnet', chainIdDecimal: 888888888, chainIdHex: chain.result, rpcAuthority: ANCIENT8_RPC, address: ADDRESS, blockNumber: Number.parseInt(block.result, 16) },
    currentDeployment: { ...current, responseSha256: code.responseSha256 },
    canonicalReference: P70_REFERENCE,
    maintainerGroundTruth: {
      repository: 'mds1/multicall3', issue: MAINTAINER_COMMENT.issue, commentId: 2495504312,
      author: comment.user.login, authorAssociation: comment.author_association, createdAt: comment.created_at,
      contentSha256: sha256(Buffer.from(body, 'utf8')), apiResponseSha256: sha256(source.raw), contentBound: maintainerBound,
      requiredPhrasesMatched: MAINTAINER_COMMENT.requiredPhrases,
    },
    exactRuntimeMatchesKnownGood,
    positiveGroundTruth,
    classification,
    credit: {
      deploymentGroundTruthCase: positiveGroundTruth ? 1 : 0,
      vulnerabilityGroundTruthCase: 0,
      customerFinalOutput: 0,
      auditFinalPdf: 0,
      rights: 0,
      paidValue: 0,
      sale: 0,
      live: false,
    },
    truthBoundary: 'This case proves only current deployed-code identity divergence at the canonical Multicall3 address on Ancient8 when both the official Ancient8 RPC and official Multicall3 maintainer statement agree. It is not a claim about exploitable vulnerability severity, customer FINAL output, rights, paid value, sale, LIVE or WORLD_CLASS readiness.',
  };
  writeFileSync(join(OUT, 'P73_ANCIENT8_MULTICALL3_CURRENT_GROUND_TRUTH.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
  if (!positiveGroundTruth) process.exitCode = 3;
}
main().catch((error) => {
  const receipt = { schemaVersion: 'velmere.p73.ancient8-multicall3-current-ground-truth.v1', status: 'FAIL_CLOSED', error: `${error.name}: ${error.message}`, credit: { deploymentGroundTruthCase: 0, vulnerabilityGroundTruthCase: 0, customerFinalOutput: 0, rights: 0, paidValue: 0, sale: 0, live: false } };
  writeFileSync(join(OUT, 'P73_ANCIENT8_MULTICALL3_CURRENT_GROUND_TRUTH.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(1);
});
