import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { deduplicateCanonicalWhaleTransfers, canonicalWhaleEventId } from '../r7-work/lib/market-integrity/whale-watch-onchain-event-identity.ts';
import type { WhaleTransferEvent } from '../r7-work/lib/market-integrity/whale-watch-types.ts';

const RPC_PRIMARY = 'https://bsc-dataseed.bnbchain.org';
const RPC_SECONDARY = 'https://bsc-dataseed-public.bnbchain.org';
const TOKEN = '0x55d398326f99059ff775485246999027b3197955';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const CHAIN = 'eip155:56';
const hexNum = (v: string) => Number(BigInt(v));
const sha = (v: unknown) => crypto.createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const addressFromTopic = (v: string) => `0x${v.slice(-40).toLowerCase()}`;
const validHash = (v: unknown) => typeof v === 'string' && /^0x[a-f0-9]{64}$/iu.test(v);

type RpcBody = { result?: unknown; error?: unknown };
async function rpc(url: string, method: string, params: unknown[], timeoutMs = 20_000) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'velmere-r7-whale-finality-proof' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`rpc_http_${method}_${res.status}`);
  const body = await res.json() as RpcBody;
  if (body.error || body.result === undefined || body.result === null) {
    throw new Error(`rpc_result_${method}:${JSON.stringify(body.error ?? null).slice(0, 300)}`);
  }
  return body.result as any;
}

const chain = await rpc(RPC_PRIMARY, 'eth_chainId', []);
assert.equal(String(chain).toLowerCase(), '0x38');
const latest = await rpc(RPC_PRIMARY, 'eth_getBlockByNumber', ['latest', false]);
const finalized = await rpc(RPC_PRIMARY, 'eth_getBlockByNumber', ['finalized', false]);
assert.ok(validHash(latest.hash));
assert.ok(validHash(finalized.hash));
const latestNumber = hexNum(latest.number);
const finalizedNumber = hexNum(finalized.number);
assert.ok(finalizedNumber > 0 && finalizedNumber <= latestNumber);

const decimalsRaw = String(await rpc(RPC_PRIMARY, 'eth_call', [{ to: TOKEN, data: '0x313ce567' }, 'finalized']));
const decimals = hexNum(decimalsRaw);
assert.ok(Number.isSafeInteger(decimals) && decimals >= 0 && decimals <= 36);

type Found = { block: any; receipt: any; log: any };
let found: Found | null = null;
for (let offset = 0; offset < 30 && !found; offset += 1) {
  const blockNumber = finalizedNumber - offset;
  const tag = `0x${blockNumber.toString(16)}`;
  const block = await rpc(RPC_PRIMARY, 'eth_getBlockByNumber', [tag, true]);
  if (!block || !validHash(block.hash) || !Array.isArray(block.transactions)) continue;

  try {
    const receipts = await rpc(RPC_PRIMARY, 'eth_getBlockReceipts', [tag], 30_000);
    if (Array.isArray(receipts)) {
      for (const receipt of receipts) {
        const log = (Array.isArray(receipt?.logs) ? receipt.logs : []).find((row: any) =>
          String(row?.address ?? '').toLowerCase() === TOKEN &&
          String(row?.topics?.[0] ?? '').toLowerCase() === TRANSFER_TOPIC &&
          Array.isArray(row?.topics) && row.topics.length >= 3,
        );
        if (log) { found = { block, receipt, log }; break; }
      }
    }
  } catch {
    const likely = block.transactions.filter((tx: any) => String(tx?.to ?? '').toLowerCase() === TOKEN).slice(0, 100);
    for (const tx of likely) {
      const receipt = await rpc(RPC_PRIMARY, 'eth_getTransactionReceipt', [tx.hash]);
      const log = (Array.isArray(receipt?.logs) ? receipt.logs : []).find((row: any) =>
        String(row?.address ?? '').toLowerCase() === TOKEN &&
        String(row?.topics?.[0] ?? '').toLowerCase() === TRANSFER_TOPIC &&
        Array.isArray(row?.topics) && row.topics.length >= 3,
      );
      if (log) { found = { block, receipt, log }; break; }
    }
  }
}
if (!found) throw new Error('no_finalized_usdt_transfer_found_within_30_blocks');

const { block, receipt, log } = found;
const blockNumber = hexNum(String(log.blockNumber ?? receipt.blockNumber));
const blockHash = String(log.blockHash ?? receipt.blockHash ?? '').toLowerCase();
const txHash = String(log.transactionHash ?? receipt.transactionHash ?? '').toLowerCase();
assert.ok(validHash(blockHash));
assert.ok(validHash(txHash));
assert.ok(blockNumber <= finalizedNumber);
const canonicalBlock = await rpc(RPC_PRIMARY, 'eth_getBlockByNumber', [`0x${blockNumber.toString(16)}`, false]);
assert.equal(String(canonicalBlock.hash).toLowerCase(), blockHash);
const confirmations = latestNumber - blockNumber + 1;
assert.ok(confirmations > 0);
const logIndex = hexNum(String(log.logIndex));
const amountBase = Number(BigInt(String(log.data))) / 10 ** decimals;
assert.ok(Number.isFinite(amountBase) && amountBase > 0);
const observedAt = new Date(hexNum(String(block.timestamp)) * 1000).toISOString();
const from = addressFromTopic(String(log.topics[1]));
const to = addressFromTopic(String(log.topics[2]));
const sourceDigest = sha({ rpc: 'bnb-chain', blockNumber, blockHash, txHash, logIndex, data: log.data, topics: log.topics });

const realEvent: WhaleTransferEvent = {
  eventId: 'provider-supplied-ignored',
  chainId: CHAIN,
  contractAddress: TOKEN,
  txHash,
  logIndex,
  blockNumber,
  blockHash,
  confirmations,
  finality: 'finalized',
  reorgState: 'canonical',
  tokenDecimals: decimals,
  observedAt,
  amountBase,
  fromHolderId: from,
  toHolderId: to,
  fromCategory: 'unknown',
  toCategory: 'unknown',
  kind: 'transfer',
  providerFamily: 'bnb-chain',
  providerFamilies: ['bnb-chain'],
  status: 'verified_staging',
  sourceDigest,
  sourceDigests: [sourceDigest],
};
const expectedId = canonicalWhaleEventId({ chainId: CHAIN, contractAddress: TOKEN, txHash, logIndex });
const canonical = deduplicateCanonicalWhaleTransfers([realEvent]);
assert.equal(canonical.transfers.length, 1);
assert.equal(canonical.transfers[0]?.eventId, expectedId);
assert.equal(canonical.transfers[0]?.finality, 'finalized');
assert.equal(canonical.transfers[0]?.reorgState, 'canonical');

let secondaryEndpointSamePhysicalLog = false;
try {
  const receipt2 = await rpc(RPC_SECONDARY, 'eth_getTransactionReceipt', [txHash]);
  const log2 = (Array.isArray(receipt2?.logs) ? receipt2.logs : []).find((row: any) =>
    String(row?.address ?? '').toLowerCase() === TOKEN && hexNum(String(row.logIndex)) === logIndex,
  );
  secondaryEndpointSamePhysicalLog = Boolean(log2) &&
    String(log2.blockHash).toLowerCase() === blockHash &&
    String(log2.data).toLowerCase() === String(log.data).toLowerCase();
} catch {
  secondaryEndpointSamePhysicalLog = false;
}

const duplicate: WhaleTransferEvent = {
  ...realEvent,
  eventId: 'second-observation-provider-controlled-id',
  sourceDigest: sha({ duplicateOf: expectedId }),
  sourceDigests: [sha({ duplicateOf: expectedId })],
};
const dual = deduplicateCanonicalWhaleTransfers([realEvent, duplicate]);
assert.equal(dual.transfers.length, 1);
assert.equal(dual.duplicatesDropped, 1);

const replacement = blockHash[2] === '0' ? '1' : '0';
const badBlockHash = `0x${replacement}${blockHash.slice(3)}`;
const physicalConflict = deduplicateCanonicalWhaleTransfers([realEvent, { ...duplicate, blockHash: badBlockHash }]);
assert.equal(physicalConflict.transfers.length, 0);
assert.ok(physicalConflict.blockers.includes('whale_transfer_physical_log_conflict'));
const reorgMutation = deduplicateCanonicalWhaleTransfers([realEvent, { ...duplicate, reorgState: 'reorged' }]);
assert.equal(reorgMutation.transfers.length, 0);
assert.ok(reorgMutation.blockers.includes('whale_transfer_reorg_conflict'));
const unconfirmed = deduplicateCanonicalWhaleTransfers([{ ...realEvent, confirmations: 0, finality: 'unconfirmed' }]);
assert.equal(unconfirmed.transfers.length, 0);
assert.ok(unconfirmed.blockers.includes('whale_transfer_not_confirmed'));
const badDecimals = deduplicateCanonicalWhaleTransfers([{ ...realEvent, tokenDecimals: 255 }]);
assert.equal(badDecimals.transfers.length, 0);
assert.ok(badDecimals.blockers.includes('whale_transfer_token_decimals_invalid'));

const evidence = {
  schemaVersion: 'velmere.r7.whale-watch-real-bsc-finality-proof.v2',
  status: 'PASS_REAL_BSC_FINALIZED_EVENT_AND_REORG_GUARDS',
  github: { runId: process.env.GITHUB_RUN_ID, runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT), headSha: process.env.GITHUB_SHA },
  exactCurrentSource: {
    fullSourceAggregateSha256: process.env.R7_RISK_FULL_SOURCE_AGGREGATE_SHA256,
    fullSourceManifestSha256: process.env.R7_RISK_FULL_SOURCE_MANIFEST_SHA256,
    executionSliceAggregateSha256: process.env.R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256,
    executionSliceManifestSha256: process.env.R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256,
  },
  chainId: 56,
  chainIdentity: CHAIN,
  rpcAuthority: 'BNB_CHAIN_PUBLIC_MAINNET_RPC',
  officialRpcPrimary: RPC_PRIMARY,
  secondaryOfficialEndpointChecked: true,
  secondaryOfficialEndpointSamePhysicalLog,
  finalizedHead: { number: finalizedNumber, hash: String(finalized.hash).toLowerCase() },
  latestHeadNumber: latestNumber,
  token: { contract: TOKEN, decimals },
  realTransfer: { eventId: expectedId, blockNumber, blockHash, txHash, logIndex, confirmations, finality: 'finalized', reorgState: 'canonical', amountTokenUnits: amountBase, observedAt },
  canonicalBlockHashRefetchMatch: true,
  duplicateObservationCollapsed: dual.duplicatesDropped === 1,
  adversarialGuards: { conflictingBlockHashWithheld: true, reorgMutationWithheld: true, unconfirmedWithheld: true, invalidDecimalsWithheld: true },
  actualReorgObserved: false,
  actualReorgClaimed: false,
  rightsState: 'INTERNAL_DIAGNOSTIC_ONLY',
  customerVisibleNumbersAuthorized: false,
  paidProviderRequired: false,
  customerFinalCredit: false,
  paidValueCredit: false,
  truthBoundary: 'A real BSC finalized ERC-20 Transfer log was observed through an official public BNB Chain RPC and verified against its canonical block hash. Reorg/conflict behavior was tested by adversarial mutation of that real event; no real reorg was observed or claimed. This is internal validation only and does not authorize customer-visible provider data or Customer FINAL.',
};
fs.writeFileSync('R7_WHALE_WATCH_REAL_BSC_FINALITY_PROOF.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
