import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";

const REPOSITORY = "Zombieland1234/velmere1";
const REPOSITORY_ID = "1269597731";
const OWNER = "Zombieland1234";
const ACTOR = "Zombieland1234";
const ACTOR_ID = "213797395";
const AUTOMATION_ACTOR = "github-actions[bot]";
const AUTOMATION_ACTOR_ID = "41898282";
const BRANCH = "velmere-r7-successor-delta-20260825";
const WORKFLOW = "R7 Audit Basic Bridge E2E V2";
const WORKFLOW_PATH = "/.github/workflows/r7-audit-basic-bridge-e2e-v2.yml@";
const AUDIENCE = "velmere-r7-audit-basic-e2e-v2";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CASE_REF = /^[A-Za-z0-9][A-Za-z0-9:._-]{7,159}$/;
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
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function decodeJson(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as Record<string, unknown>;
}
function audienceOk(value: unknown) {
  return typeof value === "string" ? value === AUDIENCE : Array.isArray(value) && value.includes(AUDIENCE);
}
async function verifyOidc(token: string) {
  const segments = token.split(".");
  if (segments.length !== 3) throw new Error("oidc_shape_invalid");
  const header = decodeJson(segments[0]!);
  const claims = decodeJson(segments[1]!);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("oidc_header_invalid");
  const jwksResponse = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!jwksResponse.ok) throw new Error("oidc_jwks_unavailable");
  const jwks = await jwksResponse.json() as { keys?: JsonWebKey[] };
  const jwk = jwks.keys?.find((candidate) => candidate.kid === header.kid);
  if (!jwk) throw new Error("oidc_kid_unknown");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(segments[2]!),
    new TextEncoder().encode(`${segments[0]}.${segments[1]}`),
  );
  if (!valid) throw new Error("oidc_signature_invalid");
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(claims.exp ?? 0);
  const nbf = Number(claims.nbf ?? 0);
  const iat = Number(claims.iat ?? 0);
  if (claims.iss !== "https://token.actions.githubusercontent.com" || !audienceOk(claims.aud)) throw new Error("oidc_authority_invalid");
  if (!Number.isFinite(exp) || exp <= now - 15 || !Number.isFinite(iat) || iat < now - 900 || iat > now + 30 || (Number.isFinite(nbf) && nbf > now + 30)) throw new Error("oidc_claim_time_invalid");
  const eventName = String(claims.event_name ?? "");
  const actorAllowed = (
    claims.actor === ACTOR && String(claims.actor_id ?? "") === ACTOR_ID
  ) || (
    eventName === "workflow_dispatch"
    && claims.actor === AUTOMATION_ACTOR
    && String(claims.actor_id ?? "") === AUTOMATION_ACTOR_ID
  );
  if (claims.repository !== REPOSITORY
      || String(claims.repository_id ?? "") !== REPOSITORY_ID
      || claims.repository_owner !== OWNER
      || !actorAllowed
      || claims.ref !== `refs/heads/${BRANCH}`
      || claims.workflow !== WORKFLOW
      || typeof claims.workflow_ref !== "string"
      || !claims.workflow_ref.includes(WORKFLOW_PATH)
      || !["push", "workflow_dispatch"].includes(eventName)) {
    throw new Error("oidc_workflow_invalid");
  }
  const runId = String(claims.run_id ?? "");
  const runAttempt = Number(claims.run_attempt ?? 0);
  if (!/^\d{1,20}$/.test(runId) || !Number.isInteger(runAttempt) || runAttempt < 1 || runAttempt > 100) throw new Error("oidc_run_invalid");
  return { claims, runId, runAttempt };
}
function randomPassword() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("") + "Aa1!";
}
function randomLease() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function operatorFingerprint(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return "operator_" + Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 20);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { ok: false, error: "method_not_allowed" });
  const match = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return respond(401, { ok: false, error: "oidc_missing" });
  let verified: { claims: Record<string, unknown>; runId: string; runAttempt: number };
  try { verified = await verifyOidc(match[1]!); }
  catch (error) { return respond(401, { ok: false, error: error instanceof Error ? error.message : "oidc_invalid" }); }

  let raw = "";
  try { raw = await request.text(); } catch { return respond(400, { ok: false, error: "invalid_body" }); }
  if (new TextEncoder().encode(raw).byteLength > 8192) return respond(413, { ok: false, error: "request_too_large" });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return respond(400, { ok: false, error: "invalid_json" }); }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return respond(503, { ok: false, error: "server_environment_unavailable" });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

  const assertRunUser = async (userId: string) => {
    if (!UUID.test(userId)) throw new Error("user_id_invalid");
    const fetched = await admin.auth.admin.getUserById(userId);
    if (fetched.error || !fetched.data.user) throw new Error("run_user_missing");
    const metadata = fetched.data.user.app_metadata ?? {};
    if (metadata.velmere_test !== true
        || metadata.r7_audit_basic_e2e_v2 !== true
        || String(metadata.r7_run_id ?? "") !== verified.runId
        || Number(metadata.r7_run_attempt ?? 0) !== verified.runAttempt) {
      throw new Error("run_user_binding_invalid");
    }
    return fetched.data.user;
  };

  if (body.action === "cleanup") {
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter((value): value is string => typeof value === "string") : [];
    if (userIds.length < 1 || userIds.length > 4) return respond(400, { ok: false, error: "cleanup_users_invalid" });
    let deleted = 0;
    for (const userId of userIds) {
      try {
        await assertRunUser(userId);
        const result = await admin.auth.admin.deleteUser(userId);
        if (!result.error) deleted += 1;
      } catch { }
    }
    return respond(200, { ok: true, action: "cleanup", runId: verified.runId, runAttempt: verified.runAttempt, requested: userIds.length, deleted, rawSecretsReturned: false, serviceRoleReturned: false });
  }

  if (body.action === "claim") {
    const caseRef = typeof body.caseRef === "string" ? body.caseRef : "";
    if (!CASE_REF.test(caseRef)) return respond(400, { ok: false, error: "case_ref_invalid" });
    const workerPrincipal = `r7-audit-basic-e2e-v2:${verified.runId}:${verified.runAttempt}`;
    const leaseToken = randomLease();
    const claimed = await admin.rpc("velmere_claim_basic_audit_worker_lease", {
      p_case_ref: caseRef,
      p_worker_principal: workerPrincipal,
      p_claim_request_id: `claim:v2:${verified.runId}:${verified.runAttempt}:${caseRef}`,
      p_lease_token: leaseToken,
      p_lease_seconds: 300,
    });
    if (claimed.error) return respond(503, { ok: false, error: "claim_rpc_failed", code: claimed.error.code ?? null });
    if (!claimed.data || claimed.data.ok !== true) return respond(409, { ok: false, error: String(claimed.data?.error ?? "claim_rejected") });
    return respond(200, { ok: true, action: "claim", runId: verified.runId, runAttempt: verified.runAttempt, workerPrincipal, leaseToken, claim: claimed.data, serviceRoleReturned: false });
  }

  if (body.action !== "provision") return respond(400, { ok: false, error: "action_invalid" });
  const capability = await admin.rpc("velmere_r7_read_audit_server_capability_for_oidc");
  if (capability.error || typeof capability.data !== "string" || capability.data.length < 48 || capability.data.length > 256) {
    return respond(503, { ok: false, error: "audit_server_capability_unavailable" });
  }
  const createdIds: string[] = [];
  const provision = async (label: "a" | "b") => {
    const password = randomPassword();
    const email = `r7-audit-basic-v2-${verified.runId}-${verified.runAttempt}-${label}@example.com`;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        velmere_test: true,
        r7_audit_basic_e2e_v2: true,
        r7_run_id: verified.runId,
        r7_run_attempt: verified.runAttempt,
        label,
      },
    });
    if (created.error || !created.data.user) throw new Error(`create_user_${label}_failed`);
    const userId = created.data.user.id;
    createdIds.push(userId);
    const accountId = `supabase:${userId.toLowerCase()}`;
    const binding = await admin.rpc("velmere_bind_account_to_supabase_subject", {
      p_account_id: accountId,
      p_supabase_subject: userId,
      p_request_id: `r7auditv2_${verified.runId}_${verified.runAttempt}_${label}`,
      p_operator_fingerprint: await operatorFingerprint(`${verified.runId}:${verified.runAttempt}:${label}:${String(verified.claims.actor_id ?? "")}`),
    });
    if (binding.error || !["bound", "already_bound"].includes(String(binding.data ?? ""))) throw new Error(`bind_${label}_failed`);
    const signed = await publicClient.auth.signInWithPassword({ email, password });
    if (signed.error || !signed.data.session?.access_token) throw new Error(`signin_${label}_failed`);
    return { userId, accountId, accessToken: signed.data.session.access_token };
  };
  try {
    const a = await provision("a");
    const b = await provision("b");
    return respond(200, {
      ok: true,
      action: "provision",
      schemaVersion: "velmere.r7.audit-basic-e2e-v2-session.v1",
      runId: verified.runId,
      runAttempt: verified.runAttempt,
      a,
      b,
      auditServerCapability: capability.data,
      serviceRoleReturned: false,
      customerFinalCredit: false,
    });
  } catch (error) {
    for (const userId of createdIds) {
      try { await admin.auth.admin.deleteUser(userId); } catch { }
    }
    return respond(500, { ok: false, error: error instanceof Error ? error.message : "provision_failed", partialUsersCleaned: true });
  }
});
