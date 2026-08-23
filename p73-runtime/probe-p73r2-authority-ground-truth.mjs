import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const OUT = resolve(process.env.P73_RESULT_DIR || 'p73-out');
mkdirSync(OUT, { recursive: true });

const CANONICAL_MULTICALL3 = '0xca11bde05977b3631167028862be2a173976ca11';
const ANCIENT8_DOCUMENTED_MULTICALL3 = '0xb76d6e8c82d06fd262ef3799db73d5a724108d4e';
const ANCIENT8_DOCS = 'https://docs.ancient8.gg/using-ancient8-chain/contracts';
const MAINTAINER_API = 'https://api.github.com/repos/mds1/multicall3/issues/comments/2495504312';
const REQUIRED_MAINTAINER_PHRASES = [
  'deployer key has been compromised',
  'someone used it to deploy a different contract on Ancient8',
  'regular Multicall3 contract cannot be deployed at this address',
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { 'user-agent': 'velmere-p73r2-ground-truth/1.0', ...headers },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`http_${response.status}:${url}`);
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:') throw new Error(`non_https_redirect:${response.url}`);
  const text = await response.text();
  return { text, finalUrl: response.url, status: response.status, headers: Object.fromEntries(response.headers.entries()) };
}
function normalizeSearchText(text) {
  return text.replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').toLowerCase();
}

async function main() {
  const startedAt = new Date().toISOString();

  const ancient8 = await fetchText(ANCIENT8_DOCS, { accept: 'text/html,application/xhtml+xml' });
  const ancientHost = new URL(ancient8.finalUrl).hostname.toLowerCase();
  if (ancientHost !== 'docs.ancient8.gg') throw new Error(`ancient8_docs_host_mismatch:${ancientHost}`);
  const ancientText = normalizeSearchText(ancient8.text);
  const ancient8Bound = ancientText.includes('multicall3') && ancientText.includes(ANCIENT8_DOCUMENTED_MULTICALL3);
  if (!ancient8Bound) throw new Error('ancient8_multicall3_address_not_content_bound');

  const maintainer = await fetchText(MAINTAINER_API, { accept: 'application/vnd.github+json' });
  const maintainerHost = new URL(maintainer.finalUrl).hostname.toLowerCase();
  if (maintainerHost !== 'api.github.com') throw new Error(`github_api_host_mismatch:${maintainerHost}`);
  const comment = JSON.parse(maintainer.text);
  const body = String(comment.body || '');
  const maintainerBound = comment?.user?.login === 'mds1'
    && comment?.author_association === 'OWNER'
    && REQUIRED_MAINTAINER_PHRASES.every((phrase) => body.includes(phrase));
  if (!maintainerBound) throw new Error('maintainer_comment_not_content_bound');

  const addressDivergence = CANONICAL_MULTICALL3 !== ANCIENT8_DOCUMENTED_MULTICALL3;
  if (!addressDivergence) throw new Error('unexpected_equal_addresses');

  const receipt = {
    schemaVersion: 'velmere.p73r2.ancient8-multicall3-dual-authority-ground-truth.v1',
    status: 'PASS_POSITIVE_DEPLOYMENT_ADDRESS_GROUND_TRUTH',
    observedAt: new Date().toISOString(),
    startedAt,
    target: {
      chain: 'Ancient8 Mainnet',
      chainIdDecimal: 888888888,
      canonicalMulticall3Address: CANONICAL_MULTICALL3,
      ancient8DocumentedMulticall3Address: ANCIENT8_DOCUMENTED_MULTICALL3,
      addressDivergence,
    },
    ancient8Authority: {
      sourceUrl: ANCIENT8_DOCS,
      finalUrl: ancient8.finalUrl,
      httpStatus: ancient8.status,
      rawBytes: Buffer.byteLength(ancient8.text),
      rawSha256: sha256(Buffer.from(ancient8.text, 'utf8')),
      contentBound: ancient8Bound,
      requiredFacts: ['Multicall3', ANCIENT8_DOCUMENTED_MULTICALL3],
    },
    multicall3MaintainerAuthority: {
      repository: 'mds1/multicall3',
      issue: 336,
      commentId: 2495504312,
      author: comment.user.login,
      authorAssociation: comment.author_association,
      createdAt: comment.created_at,
      rawResponseSha256: sha256(Buffer.from(maintainer.text, 'utf8')),
      bodySha256: sha256(Buffer.from(body, 'utf8')),
      contentBound: maintainerBound,
      requiredPhrases: REQUIRED_MAINTAINER_PHRASES,
    },
    adjudication: {
      deploymentAddressGroundTruth: 'POSITIVE',
      currentRuntimeIdentity: 'CURRENT_RUNTIME_UNVERIFIED_RPC_QUORUM_UNAVAILABLE',
      vulnerabilityExploitability: 'NOT_CREDITED',
      conclusion: 'The canonical 0xca11... Multicall3 address must not be assumed to contain the canonical Multicall3 implementation on Ancient8. The Multicall3 maintainer documents a compromised deployer-key wrong-contract deployment there, while Ancient8 currently documents a different Multicall3 address.',
    },
    credit: {
      deploymentGroundTruthCase: 1,
      currentRuntimeBytecodeCase: 0,
      vulnerabilityGroundTruthCase: 0,
      customerFinalOutput: 0,
      auditFinalPdf: 0,
      rights: 0,
      paidValue: 0,
      sale: 0,
      live: false,
    },
    truthBoundary: 'This receipt credits one externally grounded deployment-address identity case only. It does not assert the current runtime bytecode at 0xca11..., does not assert an exploitable vulnerability in the Multicall3 source, and cannot promote customer FINAL output, PDF finality, rights, paid value, sale, LIVE or WORLD_CLASS readiness.',
  };

  writeFileSync(join(OUT, 'P73R2_ANCIENT8_MULTICALL3_DUAL_AUTHORITY_GROUND_TRUTH.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  const receipt = {
    schemaVersion: 'velmere.p73r2.ancient8-multicall3-dual-authority-ground-truth.v1',
    status: 'FAIL_CLOSED',
    error: `${error.name}: ${error.message}`,
    credit: { deploymentGroundTruthCase: 0, currentRuntimeBytecodeCase: 0, vulnerabilityGroundTruthCase: 0, customerFinalOutput: 0, auditFinalPdf: 0, rights: 0, paidValue: 0, sale: 0, live: false },
  };
  writeFileSync(join(OUT, 'P73R2_ANCIENT8_MULTICALL3_DUAL_AUTHORITY_GROUND_TRUTH.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(1);
});
