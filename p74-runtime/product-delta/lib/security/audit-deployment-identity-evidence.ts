import { readResponseBytesBounded } from "@/lib/network/fetch-with-deadline";
import { safeEgressFetchWithTrace, VelmereEgressPolicyError } from "@/lib/network/safe-egress";
import { buildPass2814ExternalUrlDecision } from "@/lib/market-integrity/top1-source-poisoning-ssrf-firewall";
import { canonicalJson } from "@/lib/security/canonical-json";
import { sha256BytesDigest, sha256Digest } from "@/lib/security/cryptographic-digest";

export const PASS5002_AUDIT_DEPLOYMENT_IDENTITY_EVIDENCE_ID = "pass5002-audit-deployment-identity-evidence-v1" as const;

export type AuditDeploymentIdentityState = "verified_current" | "not_applicable" | "blocked" | "mismatch" | "error";

export type AuditDeploymentIdentityEvidence = {
  schemaVersion: typeof PASS5002_AUDIT_DEPLOYMENT_IDENTITY_EVIDENCE_ID;
  state: AuditDeploymentIdentityState;
  generatedAt: string;
  target: {
    chain: string;
    chainId: string;
    address: string;
  };
  provider: {
    providerId: "a8scan-current-deployment-verifier";
    providerFamily: "a8scan_conduit_verification";
    upstreamRoot: "scan.ancient8.gg";
    independenceEligible: false;
  };
  source: {
    verificationUrlDigest: string | null;
    responseDigest: string | null;
    responseBytes: number;
    matchId: number | null;
    verifiedAt: string | null;
    exactMatch: boolean;
    compiler: string | null;
    compilerVersion: string | null;
    optimizerEnabled: boolean | null;
    optimizerRuns: number | null;
    sourceBytes: number;
    sourceDigest: string | null;
  };
  runtime: {
    blockNumber: string | null;
    blockHash: string | null;
    blockTimestamp: string | null;
    sourceTimestampProvenance: "blockchain" | "missing";
    byteLength: number;
    runtimeDigest: string | null;
  };
  replayReference: {
    runId: "32063820844";
    artifactId: "9299112031";
    artifactDigest: "sha256:13234f0670449fbce6fa80a7d810785a2f1ad872194cc7b106ee452e6ab36693";
    sourceDigest: "sha256:e9a893737791350d763db354b1b1f5eb48a7b3046cdc7933713867ea7c340a74";
    runtimeDigest: "sha256:435d8ffcf6c6dac190ab1d07c5c9f09d7f9ee92acd6b5c24d8149601ac12bbc1";
    runtimeBytes: 3178;
    compilerVersion: "0.8.26+commit.8a97fa7a";
    optimizerRuns: 200;
  };
  independentProviderQuorum: false;
  blockers: string[];
  evidenceDigest: string;
  truthBoundary: string;
};

const ANCIENT8_CHAIN = "ancient8";
const ANCIENT8_CHAIN_ID = "888888888";
const ANCIENT8_OFFICIAL_MULTICALL3 = "0xb76d6e8c82d06fd262ef3799db73d5a724108d4e";
const A8SCAN_HOST = "scan.ancient8.gg";
const A8SCAN_BASE = `https://${A8SCAN_HOST}`;
const MAX_SOURCE_BYTES = 1_500_000;
const MAX_RPC_BYTES = 1_000_000;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;
const REPLAY_REFERENCE = Object.freeze({
  runId: "32063820844" as const,
  artifactId: "9299112031" as const,
  artifactDigest: "sha256:13234f0670449fbce6fa80a7d810785a2f1ad872194cc7b106ee452e6ab36693" as const,
  sourceDigest: "sha256:e9a893737791350d763db354b1b1f5eb48a7b3046cdc7933713867ea7c340a74" as const,
  runtimeDigest: "sha256:435d8ffcf6c6dac190ab1d07c5c9f09d7f9ee92acd6b5c24d8149601ac12bbc1" as const,
  runtimeBytes: 3178 as const,
  compilerVersion: "0.8.26+commit.8a97fa7a" as const,
  optimizerRuns: 200 as const,
});

function clean(value: unknown, max = 256) {
  return typeof value === "string" ? value.replace(/[<>{}\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function normalizedAddress(value: unknown) {
  const address = clean(value, 96).toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(address) ? address : null;
}

function normalizedHex(value: unknown, bytes?: number) {
  const text = clean(value, bytes ? bytes * 2 + 2 : 300).toLowerCase();
  if (!/^0x[a-f0-9]+$/.test(text)) return null;
  if (bytes !== undefined && text.length !== bytes * 2 + 2) return null;
  return text;
}

function blockTimestamp(value: unknown) {
  const hex = normalizedHex(value);
  if (!hex) return null;
  try {
    const seconds = Number(BigInt(hex));
    return Number.isSafeInteger(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
  } catch {
    return null;
  }
}

function sourceContentFromVerification(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const stdJsonInput = record.stdJsonInput;
  if (!stdJsonInput || typeof stdJsonInput !== "object") return null;
  const sources = (stdJsonInput as Record<string, unknown>).sources;
  if (!sources || typeof sources !== "object") return null;
  const multicall = (sources as Record<string, unknown>)["Multicall3.sol"];
  if (!multicall || typeof multicall !== "object") return null;
  const content = (multicall as Record<string, unknown>).content;
  return typeof content === "string" ? content : null;
}

function sourceSettings(value: unknown) {
  if (!value || typeof value !== "object") return { enabled: null, runs: null };
  const stdJsonInput = (value as Record<string, unknown>).stdJsonInput;
  if (!stdJsonInput || typeof stdJsonInput !== "object") return { enabled: null, runs: null };
  const settings = (stdJsonInput as Record<string, unknown>).settings;
  if (!settings || typeof settings !== "object") return { enabled: null, runs: null };
  const optimizer = (settings as Record<string, unknown>).optimizer;
  if (!optimizer || typeof optimizer !== "object") return { enabled: null, runs: null };
  const enabled = (optimizer as Record<string, unknown>).enabled;
  const runs = (optimizer as Record<string, unknown>).runs;
  return {
    enabled: typeof enabled === "boolean" ? enabled : null,
    runs: Number.isFinite(Number(runs)) ? Math.trunc(Number(runs)) : null,
  };
}

async function fetchBounded(url: string, init: RequestInit, operation: string, maxResponseBytes: number) {
  const decision = buildPass2814ExternalUrlDecision(url);
  if (!decision.allowed || !decision.normalizedUrl) throw new Error(`deployment_identity_url_blocked:${operation}`);
  const parsed = new URL(decision.normalizedUrl);
  if (parsed.hostname.toLowerCase() !== A8SCAN_HOST) throw new Error(`deployment_identity_host_not_allowed:${operation}`);
  const { response, trace } = await safeEgressFetchWithTrace(decision.normalizedUrl, init, {
    allowedHosts: new Set([A8SCAN_HOST]),
    allowSubdomains: false,
    maxRedirects: 0,
    timeoutMs: 8_000,
    operation,
    allowedMethods: [String(init.method ?? "GET").toUpperCase()],
    maxRequestBytes: typeof init.body === "string" ? Math.max(256, Buffer.byteLength(init.body, "utf8")) : 0,
    maxResponseBytes,
  });
  const bytes = await readResponseBytesBounded(response, maxResponseBytes);
  if (new URL(trace.finalUrl).hostname.toLowerCase() !== A8SCAN_HOST) throw new Error(`deployment_identity_redirect_host_not_allowed:${operation}`);
  if (!response.ok || bytes.byteLength === 0) throw new Error(`deployment_identity_http_${response.status}:${operation}`);
  return { bytes, statusCode: response.status, finalUrl: trace.finalUrl };
}

async function fetchJsonGet(url: string, operation: string, maxResponseBytes: number) {
  const row = await fetchBounded(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json", "user-agent": "VelmereAuditDeploymentIdentity/5002" },
  }, operation, maxResponseBytes);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(row.bytes);
  return { ...row, json: JSON.parse(text) as unknown };
}

async function rpc(method: string, params: unknown[], operation: string) {
  const body = canonicalJson({ jsonrpc: "2.0", id: 5002, method, params });
  const row = await fetchBounded(`${A8SCAN_BASE}/rpc`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json", accept: "application/json", "user-agent": "VelmereAuditDeploymentIdentity/5002" },
    body,
  }, operation, MAX_RPC_BYTES);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(row.bytes);
  const json = JSON.parse(text) as { result?: unknown; error?: unknown };
  if (json.error !== undefined || json.result === undefined || json.result === null) throw new Error(`deployment_identity_rpc_error:${operation}`);
  return { ...row, result: json.result };
}

function finalize(value: Omit<AuditDeploymentIdentityEvidence, "evidenceDigest">): AuditDeploymentIdentityEvidence {
  return { ...value, evidenceDigest: sha256Digest(canonicalJson(value)) };
}

function emptyEvidence(args: {
  state: Exclude<AuditDeploymentIdentityState, "verified_current">;
  chain: string;
  chainId: string;
  address: string;
  blockers: string[];
}): AuditDeploymentIdentityEvidence {
  return finalize({
    schemaVersion: PASS5002_AUDIT_DEPLOYMENT_IDENTITY_EVIDENCE_ID,
    state: args.state,
    generatedAt: new Date().toISOString(),
    target: { chain: args.chain, chainId: args.chainId, address: args.address },
    provider: {
      providerId: "a8scan-current-deployment-verifier",
      providerFamily: "a8scan_conduit_verification",
      upstreamRoot: A8SCAN_HOST,
      independenceEligible: false,
    },
    source: {
      verificationUrlDigest: null,
      responseDigest: null,
      responseBytes: 0,
      matchId: null,
      verifiedAt: null,
      exactMatch: false,
      compiler: null,
      compilerVersion: null,
      optimizerEnabled: null,
      optimizerRuns: null,
      sourceBytes: 0,
      sourceDigest: null,
    },
    runtime: {
      blockNumber: null,
      blockHash: null,
      blockTimestamp: null,
      sourceTimestampProvenance: "missing",
      byteLength: 0,
      runtimeDigest: null,
    },
    replayReference: REPLAY_REFERENCE,
    independentProviderQuorum: false,
    blockers: Array.from(new Set(args.blockers.filter(Boolean))).slice(0, 12),
    truthBoundary: "No deployment identity credit. A8Scan/Conduit is one provider family; independent runtime-provider quorum remains a separate fail-closed gate.",
  });
}

export function verifyAuditDeploymentIdentityEvidence(value: AuditDeploymentIdentityEvidence | null | undefined) {
  if (!value || value.schemaVersion !== PASS5002_AUDIT_DEPLOYMENT_IDENTITY_EVIDENCE_ID) return false;
  const { evidenceDigest, ...unsigned } = value;
  if (sha256Digest(canonicalJson(unsigned)) !== evidenceDigest) return false;
  if (value.independentProviderQuorum !== false || value.provider.independenceEligible !== false) return false;
  if (value.state !== "verified_current") return true;
  return value.target.chain === ANCIENT8_CHAIN
    && value.target.chainId === ANCIENT8_CHAIN_ID
    && value.target.address === ANCIENT8_OFFICIAL_MULTICALL3
    && value.source.exactMatch === true
    && value.source.sourceDigest === REPLAY_REFERENCE.sourceDigest
    && value.source.compiler === "solc"
    && value.source.compilerVersion === REPLAY_REFERENCE.compilerVersion
    && value.source.optimizerEnabled === true
    && value.source.optimizerRuns === REPLAY_REFERENCE.optimizerRuns
    && value.runtime.byteLength === REPLAY_REFERENCE.runtimeBytes
    && value.runtime.runtimeDigest === REPLAY_REFERENCE.runtimeDigest
    && Boolean(value.runtime.blockNumber)
    && Boolean(value.runtime.blockHash)
    && Number.isFinite(Date.parse(value.runtime.blockTimestamp ?? ""))
    && value.runtime.sourceTimestampProvenance === "blockchain"
    && value.blockers.includes("independent_runtime_provider_quorum_unavailable")
    && SHA256_PATTERN.test(value.source.verificationUrlDigest ?? "")
    && SHA256_PATTERN.test(value.source.responseDigest ?? "");
}

export async function buildAuditDeploymentIdentityEvidence(input: {
  chain?: string;
  chainId?: string | null;
  address?: string | null;
}): Promise<AuditDeploymentIdentityEvidence> {
  const chain = clean(input.chain, 48).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const chainId = clean(input.chainId, 24);
  const address = normalizedAddress(input.address) ?? clean(input.address, 96).toLowerCase();
  if (chain !== ANCIENT8_CHAIN || chainId !== ANCIENT8_CHAIN_ID || address !== ANCIENT8_OFFICIAL_MULTICALL3) {
    return emptyEvidence({ state: "not_applicable", chain, chainId, address, blockers: ["deployment_identity_reference_not_registered"] });
  }

  try {
    const verificationUrl = `${A8SCAN_BASE}/api/code?address=${encodeURIComponent(address)}&chainId=${ANCIENT8_CHAIN_ID}&highlight=false`;
    const [verification, chainResult, headResult] = await Promise.all([
      fetchJsonGet(verificationUrl, "audit_deployment_identity_source", MAX_SOURCE_BYTES),
      rpc("eth_chainId", [], "audit_deployment_identity_chain"),
      rpc("eth_blockNumber", [], "audit_deployment_identity_head"),
    ]);
    if (normalizedHex(chainResult.result) !== "0x34fb5e38") throw new Error("deployment_identity_chain_id_mismatch");
    const blockNumber = normalizedHex(headResult.result);
    if (!blockNumber) throw new Error("deployment_identity_block_number_invalid");
    const [blockResult, codeResult] = await Promise.all([
      rpc("eth_getBlockByNumber", [blockNumber, false], "audit_deployment_identity_block"),
      rpc("eth_getCode", [address, blockNumber], "audit_deployment_identity_code"),
    ]);

    const verificationRecord = verification.json && typeof verification.json === "object" ? verification.json as Record<string, unknown> : null;
    if (!verificationRecord) throw new Error("deployment_identity_source_json_invalid");
    const sourceContent = sourceContentFromVerification(verificationRecord);
    if (!sourceContent) throw new Error("deployment_identity_source_missing");
    const sourceBytes = new TextEncoder().encode(sourceContent);
    const sourceDigest = sha256BytesDigest(sourceBytes);
    const compilation = verificationRecord.compilation && typeof verificationRecord.compilation === "object"
      ? verificationRecord.compilation as Record<string, unknown>
      : null;
    const settings = sourceSettings(verificationRecord);
    const exactMatch = verificationRecord.match === "exact_match"
      && verificationRecord.creationMatch === "exact_match"
      && verificationRecord.runtimeMatch === "exact_match";

    const block = blockResult.result && typeof blockResult.result === "object" ? blockResult.result as Record<string, unknown> : null;
    if (!block) throw new Error("deployment_identity_block_missing");
    if (normalizedHex(block.number) !== blockNumber) throw new Error("deployment_identity_block_mismatch");
    const blockHash = normalizedHex(block.hash, 32);
    const timestamp = blockTimestamp(block.timestamp);
    if (!blockHash || !timestamp) throw new Error("deployment_identity_block_provenance_invalid");

    const runtimeHex = normalizedHex(codeResult.result);
    if (!runtimeHex || runtimeHex === "0x" || (runtimeHex.length - 2) % 2 !== 0) throw new Error("deployment_identity_runtime_missing");
    const runtimeBytes = Uint8Array.from(Buffer.from(runtimeHex.slice(2), "hex"));
    const runtimeDigest = sha256BytesDigest(runtimeBytes);
    const compilerVersion = clean(compilation?.compilerVersion, 96) || null;
    const compiler = clean(compilation?.compiler, 32) || null;
    const targetMatch = normalizedAddress(verificationRecord.address) === address
      && String(verificationRecord.chainId ?? "") === ANCIENT8_CHAIN_ID;
    const replayMatch = exactMatch
      && targetMatch
      && sourceDigest === REPLAY_REFERENCE.sourceDigest
      && compiler === "solc"
      && compilerVersion === REPLAY_REFERENCE.compilerVersion
      && settings.enabled === true
      && settings.runs === REPLAY_REFERENCE.optimizerRuns
      && runtimeBytes.byteLength === REPLAY_REFERENCE.runtimeBytes
      && runtimeDigest === REPLAY_REFERENCE.runtimeDigest;

    const value = finalize({
      schemaVersion: PASS5002_AUDIT_DEPLOYMENT_IDENTITY_EVIDENCE_ID,
      state: replayMatch ? "verified_current" : "mismatch",
      generatedAt: new Date().toISOString(),
      target: { chain, chainId, address },
      provider: {
        providerId: "a8scan-current-deployment-verifier",
        providerFamily: "a8scan_conduit_verification",
        upstreamRoot: A8SCAN_HOST,
        independenceEligible: false,
      },
      source: {
        verificationUrlDigest: sha256Digest(verification.finalUrl),
        responseDigest: sha256BytesDigest(verification.bytes),
        responseBytes: verification.bytes.byteLength,
        matchId: Number.isFinite(Number(verificationRecord.matchId)) ? Math.trunc(Number(verificationRecord.matchId)) : null,
        verifiedAt: Number.isFinite(Date.parse(clean(verificationRecord.verifiedAt, 80))) ? new Date(Date.parse(clean(verificationRecord.verifiedAt, 80))).toISOString() : null,
        exactMatch,
        compiler,
        compilerVersion,
        optimizerEnabled: settings.enabled,
        optimizerRuns: settings.runs,
        sourceBytes: sourceBytes.byteLength,
        sourceDigest,
      },
      runtime: {
        blockNumber,
        blockHash,
        blockTimestamp: timestamp,
        sourceTimestampProvenance: "blockchain",
        byteLength: runtimeBytes.byteLength,
        runtimeDigest,
      },
      replayReference: REPLAY_REFERENCE,
      independentProviderQuorum: false,
      blockers: replayMatch
        ? ["independent_runtime_provider_quorum_unavailable"]
        : ["current_runtime_or_verified_source_mismatch", "independent_runtime_provider_quorum_unavailable"],
      truthBoundary: replayMatch
        ? "The official Ancient8 alternate deployment currently matches the exact P74R5 source/compiler replay reference at a blockchain-timestamped exact block. A8Scan/Conduit is one provider family, so independent runtime-provider quorum remains OPEN. This proves deployment/source identity only, not a source-code vulnerability, exploitability, commercial rights, customer FINAL, sale readiness or LIVE."
        : "Current Ancient8 explorer/source/runtime bytes do not match the pinned P74R5 replay reference. Fail closed; no deployment identity credit.",
    });
    if (!verifyAuditDeploymentIdentityEvidence(value)) throw new Error("deployment_identity_evidence_self_verification_failed");
    return value;
  } catch (error) {
    const blocker = error instanceof VelmereEgressPolicyError ? error.code : error instanceof Error ? error.message.slice(0, 180) : "deployment_identity_evidence_failed";
    return emptyEvidence({ state: error instanceof VelmereEgressPolicyError ? "blocked" : "error", chain, chainId, address, blockers: [blocker, "independent_runtime_provider_quorum_unavailable"] });
  }
}
