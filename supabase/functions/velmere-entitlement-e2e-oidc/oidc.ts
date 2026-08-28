const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
const MAX_JWKS_BYTES = 65_536;
const MAX_JWKS_KEYS = 16;

export const GITHUB_OIDC_POLICY = Object.freeze({
  audience: "velmere-shared-entitlement-e2e",
  repository: "Zombieland1234/velmere1",
  repositoryId: "1269597731",
  repositoryOwner: "Zombieland1234",
  repositoryOwnerId: "213797395",
  actor: "Zombieland1234",
  actorId: "213797395",
  branch: "velmere-r7-successor-delta-20260825",
  workflow: "Velmere Shared Entitlement E2E",
  workflowRef: "Zombieland1234/velmere1/.github/workflows/velmere-shared-entitlement-e2e.yml@refs/heads/velmere-r7-successor-delta-20260825",
  subject: "repo:Zombieland1234/velmere1:ref:refs/heads/velmere-r7-successor-delta-20260825",
  refProtected: false,
  runnerEnvironment: "github-hosted",
});

export type VerifiedGithubOidc = {
  claims: Record<string, unknown>;
  expiresAt: number;
  headSha: string;
  issuedAt: number;
  runAttempt: number;
  runId: string;
  runNumber: number;
  tokenId: string;
};

export type GithubOidcVerifierOptions = {
  fetchImpl?: typeof fetch;
  nowSeconds?: number;
};

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("oidc_segment_invalid");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  try {
    const decoded = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
    let binary = "";
    for (const byte of decoded) binary += String.fromCharCode(byte);
    const canonical = btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    if (canonical !== value) throw new Error("oidc_segment_invalid");
    return decoded;
  } catch {
    throw new Error("oidc_segment_invalid");
  }
}

function decodeObject(value: string): Record<string, unknown> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
  } catch (error) {
    if (error instanceof Error && error.message === "oidc_segment_invalid") throw error;
    throw new Error("oidc_json_invalid");
  }
  if (typeof decoded !== "object" || decoded === null || Array.isArray(decoded)) throw new Error("oidc_json_invalid");
  return decoded as Record<string, unknown>;
}

async function readResponseTextBounded(response: Response, maxBytes: number): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const parsed = Number(declared);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maxBytes) {
      throw new Error("oidc_jwks_invalid");
    }
  }
  if (!response.body) throw new Error("oidc_jwks_invalid");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      total += item.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("oidc_jwks_too_large").catch(() => undefined);
        throw new Error("oidc_jwks_invalid");
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total === 0) throw new Error("oidc_jwks_invalid");
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function integerClaim(claims: Record<string, unknown>, name: string): number {
  const value = claims[name];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error(`oidc_${name}_invalid`);
  return value;
}

function positiveDecimalStringClaim(claims: Record<string, unknown>, name: string): number {
  const value = claims[name];
  if (typeof value !== "string" || !/^[1-9][0-9]{0,15}$/.test(value)) {
    throw new Error(`oidc_${name}_invalid`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`oidc_${name}_invalid`);
  return parsed;
}

function exactIdentityClaims(claims: Record<string, unknown>): boolean {
  const branchRef = `refs/heads/${GITHUB_OIDC_POLICY.branch}`;
  const refProtectionValid = claims.ref_protected === undefined
    || claims.ref_protected === GITHUB_OIDC_POLICY.refProtected
    || claims.ref_protected === String(GITHUB_OIDC_POLICY.refProtected);
  return claims.repository === GITHUB_OIDC_POLICY.repository
    && claims.repository_id === GITHUB_OIDC_POLICY.repositoryId
    && claims.repository_owner === GITHUB_OIDC_POLICY.repositoryOwner
    && claims.repository_owner_id === GITHUB_OIDC_POLICY.repositoryOwnerId
    && claims.actor === GITHUB_OIDC_POLICY.actor
    && claims.actor_id === GITHUB_OIDC_POLICY.actorId
    && claims.ref === branchRef
    && claims.ref_type === "branch"
    && refProtectionValid
    && claims.sub === GITHUB_OIDC_POLICY.subject
    && claims.workflow === GITHUB_OIDC_POLICY.workflow
    && claims.workflow_ref === GITHUB_OIDC_POLICY.workflowRef
    && claims.runner_environment === GITHUB_OIDC_POLICY.runnerEnvironment
    && ["push", "workflow_dispatch"].includes(String(claims.event_name ?? ""));
}

export async function verifyGithubOidc(
  token: string,
  options: GithubOidcVerifierOptions = {},
): Promise<VerifiedGithubOidc> {
  if (token.length < 64 || token.length > 16_384 || /\s/.test(token)) throw new Error("oidc_shape_invalid");
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => segment.length < 2)) throw new Error("oidc_shape_invalid");
  const header = decodeObject(segments[0]!);
  const claims = decodeObject(segments[1]!);
  if (header.alg !== "RS256"
      || (header.typ !== undefined && header.typ !== "JWT")
      || typeof header.kid !== "string"
      || !/^[A-Za-z0-9._-]{1,200}$/.test(header.kid)) {
    throw new Error("oidc_header_invalid");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  let jwksResponse: Response;
  try {
    jwksResponse = await fetchImpl(JWKS_URL, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new Error("oidc_jwks_unavailable");
  }
  if (!jwksResponse.ok) throw new Error("oidc_jwks_unavailable");
  if (!(jwksResponse.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    throw new Error("oidc_jwks_invalid");
  }
  let keys: JsonWebKey[];
  try {
    const jwks = JSON.parse(
      await readResponseTextBounded(jwksResponse, MAX_JWKS_BYTES),
    ) as { keys?: JsonWebKey[] };
    keys = Array.isArray(jwks.keys) ? jwks.keys : [];
  } catch {
    throw new Error("oidc_jwks_invalid");
  }
  if (keys.length < 1 || keys.length > MAX_JWKS_KEYS) throw new Error("oidc_jwks_invalid");
  const matchingKeys = keys.filter((candidate) => candidate.kid === header.kid);
  if (matchingKeys.length === 0) throw new Error("oidc_kid_unknown");
  if (matchingKeys.length !== 1) throw new Error("oidc_jwk_invalid");
  const jwk = matchingKeys[0]!;
  if (jwk.kty !== "RSA"
      || (jwk.alg !== undefined && jwk.alg !== "RS256")
      || (jwk.use !== undefined && jwk.use !== "sig")
      || (Array.isArray(jwk.key_ops) && !jwk.key_ops.includes("verify"))) {
    throw new Error("oidc_jwk_invalid");
  }

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
  } catch {
    throw new Error("oidc_jwk_invalid");
  }
  const signed = new TextEncoder().encode(`${segments[0]}.${segments[1]}`);
  const signature = decodeBase64Url(segments[2]!);
  const signatureValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signed);
  if (!signatureValid) throw new Error("oidc_signature_invalid");

  if (claims.iss !== ISSUER || claims.aud !== GITHUB_OIDC_POLICY.audience) throw new Error("oidc_authority_invalid");
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1_000);
  if (!Number.isSafeInteger(now)) throw new Error("oidc_verifier_clock_invalid");
  const issuedAt = integerClaim(claims, "iat");
  const notBefore = integerClaim(claims, "nbf");
  const expiresAt = integerClaim(claims, "exp");
  if (issuedAt < now - 600
      || issuedAt > now + 30
      || notBefore < issuedAt - 600
      || notBefore > issuedAt + 30
      || notBefore > now + 30
      || expiresAt <= now - 15
      || expiresAt <= issuedAt
      || expiresAt - issuedAt > 600
      || expiresAt - notBefore > 1_200) {
    throw new Error("oidc_claim_time_invalid");
  }
  if (!exactIdentityClaims(claims)) throw new Error("oidc_identity_invalid");

  const runId = claims.run_id;
  const runAttempt = positiveDecimalStringClaim(claims, "run_attempt");
  const runNumber = positiveDecimalStringClaim(claims, "run_number");
  const headSha = String(claims.sha ?? "");
  const workflowSha = String(claims.workflow_sha ?? "");
  const tokenId = String(claims.jti ?? "");
  if (typeof runId !== "string" || !/^[1-9][0-9]{0,19}$/.test(runId)
      || runAttempt < 1 || runAttempt > 100
      || runNumber < 1
      || !/^[a-f0-9]{40}$/.test(headSha)
      || workflowSha !== headSha
      || !/^[A-Za-z0-9._:-]{8,200}$/.test(tokenId)) {
    throw new Error("oidc_run_invalid");
  }
  return { claims, expiresAt, headSha, issuedAt, runAttempt, runId, runNumber, tokenId };
}
