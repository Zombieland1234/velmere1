import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";

const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
const REPOSITORY = "Zombieland1234/velmere1";
const REPOSITORY_ID = "1269597731";
const OWNER = "Zombieland1234";
const OWNER_ID = "213797395";
const ACTOR = "Zombieland1234";
const ACTOR_ID = "213797395";
const BRANCH = "velmere-r7-successor-delta-20260825";
const WORKFLOW = "R7 Angel Supabase Provider Capability Probe";
const WORKFLOW_REF = `${REPOSITORY}/.github/workflows/r7-angel-supabase-provider-capability-probe.yml@refs/heads/${BRANCH}`;
const AUDIENCE_PREFIX = "velmere-r7-angel-provider-capability:";
const MAX_BODY_BYTES = 1_024;
const MAX_JWKS_BYTES = 65_536;
const MAX_JWKS_KEYS = 16;
const RESPONSE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

let cachedKeys: JsonWebKey[] | null = null;
let cachedKeysUntil = 0;

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: RESPONSE_HEADERS });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("oidc_segment_invalid");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - value.length % 4) % 4);
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  } catch {
    throw new Error("oidc_segment_invalid");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const canonical = btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (canonical !== value) throw new Error("oidc_segment_invalid");
  return bytes;
}

function decodeObject(value: string): Record<string, unknown> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decodeBase64Url(value)));
  } catch (error) {
    if (error instanceof Error && error.message === "oidc_segment_invalid") throw error;
    throw new Error("oidc_json_invalid");
  }
  if (!isObject(decoded)) throw new Error("oidc_json_invalid");
  return decoded;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  ));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readTextBounded(message: Request | Response, maxBytes: number, label: string): Promise<string> {
  const declared = message.headers.get("content-length");
  if (declared !== null) {
    const parsed = Number(declared);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maxBytes) {
      throw new Error(`${label}_too_large`);
    }
  }
  if (!message.body) throw new Error(`${label}_missing`);
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      total += item.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel(`${label}_too_large`).catch(() => undefined);
        throw new Error(`${label}_too_large`);
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total < 1) throw new Error(`${label}_missing`);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label}_invalid_utf8`);
  }
}

function integerClaim(claims: Record<string, unknown>, name: string): number {
  const value = claims[name];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`oidc_${name}_invalid`);
  }
  return value;
}

async function loadJwks(): Promise<JsonWebKey[]> {
  const now = Date.now();
  if (cachedKeys && now < cachedKeysUntil) return cachedKeys;
  let response: Response;
  try {
    response = await fetch(JWKS_URL, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new Error("oidc_jwks_unavailable");
  }
  if (!response.ok) throw new Error("oidc_jwks_unavailable");
  if ((response.headers.get("content-type") ?? "").split(";", 1)[0]!.trim().toLowerCase()
      !== "application/json") {
    throw new Error("oidc_jwks_invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readTextBounded(response, MAX_JWKS_BYTES, "oidc_jwks"));
  } catch {
    throw new Error("oidc_jwks_invalid");
  }
  if (!isObject(parsed) || !Array.isArray(parsed.keys)
      || parsed.keys.length < 1 || parsed.keys.length > MAX_JWKS_KEYS) {
    throw new Error("oidc_jwks_invalid");
  }
  const keys = parsed.keys as JsonWebKey[];
  const kids = keys.map((key) => key.kid);
  if (kids.some((kid) => typeof kid !== "string") || new Set(kids).size !== kids.length) {
    throw new Error("oidc_jwks_invalid");
  }
  cachedKeys = keys;
  cachedKeysUntil = now + 5 * 60_000;
  return keys;
}

async function verifyGithubOidc(token: string, expectedAudience: string): Promise<Record<string, unknown>> {
  if (token.length < 64 || token.length > 16_384 || /\s/.test(token)) {
    throw new Error("oidc_shape_invalid");
  }
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => segment.length < 2)) {
    throw new Error("oidc_shape_invalid");
  }
  const header = decodeObject(segments[0]!);
  const claims = decodeObject(segments[1]!);
  if (header.alg !== "RS256"
      || (header.typ !== undefined && header.typ !== "JWT")
      || typeof header.kid !== "string"
      || !/^[A-Za-z0-9._-]{1,200}$/.test(header.kid)) {
    throw new Error("oidc_header_invalid");
  }

  const now = Math.floor(Date.now() / 1_000);
  const issuedAt = integerClaim(claims, "iat");
  const notBefore = integerClaim(claims, "nbf");
  const expiresAt = integerClaim(claims, "exp");
  const headSha = String(claims.sha ?? "");
  if (claims.iss !== ISSUER
      || claims.aud !== expectedAudience
      || claims.repository !== REPOSITORY
      || claims.repository_id !== REPOSITORY_ID
      || claims.repository_owner !== OWNER
      || claims.repository_owner_id !== OWNER_ID
      || claims.actor !== ACTOR
      || claims.actor_id !== ACTOR_ID
      || claims.ref !== `refs/heads/${BRANCH}`
      || claims.ref_type !== "branch"
      || claims.sub !== `repo:${REPOSITORY}:ref:refs/heads/${BRANCH}`
      || claims.workflow !== WORKFLOW
      || claims.workflow_ref !== WORKFLOW_REF
      || claims.workflow_sha !== headSha
      || claims.runner_environment !== "github-hosted"
      || !["push", "workflow_dispatch"].includes(String(claims.event_name ?? ""))
      || !/^[a-f0-9]{40}$/.test(headSha)
      || !/^[1-9][0-9]{0,19}$/.test(String(claims.run_id ?? ""))
      || !/^[1-9][0-9]{0,5}$/.test(String(claims.run_attempt ?? ""))
      || issuedAt < now - 600 || issuedAt > now + 30
      || notBefore < issuedAt - 600 || notBefore > issuedAt + 30 || notBefore > now + 30
      || expiresAt <= now - 15 || expiresAt <= issuedAt || expiresAt - issuedAt > 600) {
    throw new Error("oidc_claim_invalid");
  }

  const keys = await loadJwks();
  const matches = keys.filter((key) => key.kid === header.kid);
  if (matches.length !== 1) throw new Error("oidc_jwk_invalid");
  const jwk = matches[0]!;
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
  const signatureValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(segments[2]!),
    new TextEncoder().encode(`${segments[0]}.${segments[1]}`),
  );
  if (!signatureValid) throw new Error("oidc_signature_invalid");
  return claims;
}

function configured(name: string): boolean {
  const value = Deno.env.get(name);
  return typeof value === "string" && value.trim().length >= 16;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { ok: false, error: "method_not_allowed" });
  const mediaType = (request.headers.get("content-type") ?? "")
    .split(";", 1)[0]!.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return respond(415, { ok: false, error: "content_type_invalid" });
  }
  let rawBody: string;
  try {
    rawBody = await readTextBounded(request, MAX_BODY_BYTES, "request");
  } catch (error) {
    const code = error instanceof Error ? error.message : "request_invalid";
    return respond(code === "request_too_large" ? 413 : 400, { ok: false, error: code });
  }
  if (rawBody !== '{"action":"probe"}') {
    return respond(400, { ok: false, error: "body_invalid" });
  }
  const bodySha256 = await sha256Hex(rawBody);
  const bearer = (request.headers.get("authorization") ?? "").match(/^Bearer\s+([^\s]+)$/i);
  if (!bearer) return respond(401, { ok: false, error: "oidc_missing" });
  try {
    await verifyGithubOidc(bearer[1]!, `${AUDIENCE_PREFIX}${bodySha256}`);
  } catch (error) {
    return respond(401, { ok: false, error: error instanceof Error ? error.message : "oidc_invalid" });
  }

  const geminiApiKeyConfigured = configured("GEMINI_API_KEY");
  const googleGenerativeAiApiKeyConfigured = configured("GOOGLE_GENERATIVE_AI_API_KEY");
  const googleApiKeyConfigured = configured("GOOGLE_API_KEY");
  const openAiApiKeyConfigured = configured("OPENAI_API_KEY");
  const anthropicApiKeyConfigured = configured("ANTHROPIC_API_KEY");
  return respond(200, {
    ok: true,
    schemaVersion: "velmere.r7.angel-provider-env-capability.v1",
    status: geminiApiKeyConfigured
        || googleGenerativeAiApiKeyConfigured
        || googleApiKeyConfigured
        || openAiApiKeyConfigured
        || anthropicApiKeyConfigured
      ? "CONFIGURED"
      : "NOT_CONFIGURED",
    geminiApiKeyConfigured,
    googleGenerativeAiApiKeyConfigured,
    googleApiKeyConfigured,
    openAiApiKeyConfigured,
    anthropicApiKeyConfigured,
    secretValuesReturned: false,
    secretLengthsReturned: false,
    secretHashesReturned: false,
    providerExecuted: false,
    customerFinalCredit: false,
  });
});
