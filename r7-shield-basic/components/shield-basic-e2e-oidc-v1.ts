import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";

const REPOSITORY = "Zombieland1234/velmere1";
const REPOSITORY_ID = "1269597731";
const OWNER = "Zombieland1234";
const ACTOR = "Zombieland1234";
const ACTOR_ID = "213797395";
const BRANCH = "velmere-r7-successor-delta-20260825";
const WORKFLOW = "R7 Shield Basic Customer Tile E2E";
const WORKFLOW_PATH = "/.github/workflows/r7-shield-basic-customer-e2e.yml@";
const AUDIENCE = "velmere-r7-shield-basic-e2e";
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: HEADERS });

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}
function decodeJson(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as Record<string, unknown>;
}
function audienceOk(value: unknown) {
  return typeof value === "string" ? value === AUDIENCE : Array.isArray(value) && value.includes(AUDIENCE);
}

async function verifyOidc(token: string) {
  const segments = token.split(".");
  if (segments.length !== 3) throw new Error("shape");
  const header = decodeJson(segments[0]!);
  const claims = decodeJson(segments[1]!);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("header");
  const jwksResponse = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  const jwks = await jwksResponse.json() as { keys?: JsonWebKey[] };
  const jwk = jwks.keys?.find((candidate) => candidate.kid === header.kid);
  if (!jwksResponse.ok || !jwk) throw new Error("jwks");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(segments[2]!),
    new TextEncoder().encode(`${segments[0]}.${segments[1]}`),
  );
  if (!valid) throw new Error("signature");
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(claims.exp ?? 0);
  const iat = Number(claims.iat ?? 0);
  const nbf = Number(claims.nbf ?? 0);
  if (claims.iss !== "https://token.actions.githubusercontent.com"
      || !audienceOk(claims.aud)
      || exp <= now - 15
      || iat < now - 900
      || iat > now + 30
      || (Number.isFinite(nbf) && nbf > now + 30)) throw new Error("time");
  if (claims.repository !== REPOSITORY
      || String(claims.repository_id ?? "") !== REPOSITORY_ID
      || claims.repository_owner !== OWNER
      || claims.actor !== ACTOR
      || String(claims.actor_id ?? "") !== ACTOR_ID
      || claims.ref !== `refs/heads/${BRANCH}`
      || claims.workflow !== WORKFLOW
      || typeof claims.workflow_ref !== "string"
      || !claims.workflow_ref.includes(WORKFLOW_PATH)) throw new Error("identity");
  const runId = String(claims.run_id ?? "");
  const sha = String(claims.sha ?? "");
  if (!/^\d{1,20}$/.test(runId) || !/^[a-f0-9]{40}$/.test(sha)) throw new Error("run");
  return { runId, sha };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { ok: false, error: "method_not_allowed" });
  const match = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return respond(401, { ok: false, error: "oidc_missing" });
  let verified: { runId: string; sha: string };
  try { verified = await verifyOidc(match[1]!); }
  catch (error) { return respond(401, { ok: false, error: error instanceof Error ? `oidc_${error.message}` : "oidc_invalid" }); }

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return respond(400, { ok: false, error: "invalid_json" }); }
  if (body.action !== "capability" || Object.keys(body).length !== 1) return respond(400, { ok: false, error: "action_invalid" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return respond(503, { ok: false, error: "server_environment_unavailable" });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const capability = await admin.rpc("velmere_r7_read_shield_server_capability_for_oidc");
  if (capability.error || typeof capability.data !== "string" || capability.data.length < 48) {
    return respond(503, { ok: false, error: "shield_capability_unavailable" });
  }
  return respond(200, {
    ok: true,
    schemaVersion: "velmere.r7.shield-basic-e2e-capability.v1",
    runId: verified.runId,
    headSha: verified.sha,
    shieldServerCapability: capability.data,
    serviceRoleReturned: false,
    customerFinalCredit: false,
  });
});
