import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";

const REPOSITORY = "Zombieland1234/velmere1";
const REPOSITORY_ID = "1269597731";
const OWNER = "Zombieland1234";
const ACTOR = "Zombieland1234";
const ACTOR_ID = "213797395";
const BRANCH = "velmere-r7-successor-delta-20260825";
const WORKFLOW = "R7 Shield Basic Customer Tile E2E";
const WORKFLOW_FILE = ".github/workflows/r7-shield-basic-customer-e2e.yml";
const WORKFLOW_REF_FRAGMENT = `/${WORKFLOW_FILE}@`;
const AUDIENCE = "velmere-r7-shield-basic-finalizer";
const JOB_NAME = "shield-basic-customer-e2e";
const REPO_BRIDGE_PATH = "r7-shield-basic/components/shield-basic-public-bridge-v1.ts";
const REPO_HELPER_PATH = "r7-shield-basic/components/shield-basic-e2e-oidc-v1.ts";
const GH_HEADERS = {
  accept: "application/vnd.github+json",
  "user-agent": "velmere-r7-shield-finalizer",
  "x-github-api-version": "2022-11-28",
};
const RESPONSE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};
const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: RESPONSE_HEADERS });

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}
function decodeJson(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as Record<string, unknown>;
}
function audienceMatches(value: unknown) {
  return typeof value === "string" ? value === AUDIENCE : Array.isArray(value) && value.includes(AUDIENCE);
}
async function sha256(bytes: Uint8Array) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
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
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(segments[2]!),
    new TextEncoder().encode(`${segments[0]}.${segments[1]}`),
  );
  if (!valid) throw new Error("oidc_signature_invalid");

  const now = Math.floor(Date.now() / 1000);
  const expires = Number(claims.exp ?? 0);
  const issued = Number(claims.iat ?? 0);
  const notBefore = Number(claims.nbf ?? 0);
  if (
    claims.iss !== "https://token.actions.githubusercontent.com" ||
    !audienceMatches(claims.aud) ||
    expires <= now - 15 ||
    issued < now - 900 ||
    issued > now + 30 ||
    (Number.isFinite(notBefore) && notBefore > now + 30)
  ) throw new Error("oidc_time_invalid");

  if (
    claims.repository !== REPOSITORY ||
    String(claims.repository_id ?? "") !== REPOSITORY_ID ||
    claims.repository_owner !== OWNER ||
    claims.actor !== ACTOR ||
    String(claims.actor_id ?? "") !== ACTOR_ID ||
    claims.ref !== `refs/heads/${BRANCH}` ||
    claims.workflow !== WORKFLOW ||
    typeof claims.workflow_ref !== "string" ||
    !claims.workflow_ref.includes(WORKFLOW_REF_FRAGMENT)
  ) throw new Error("oidc_identity_invalid");

  const runId = String(claims.run_id ?? "");
  const headSha = String(claims.sha ?? "");
  if (!/^\d{1,20}$/.test(runId) || !/^[a-f0-9]{40}$/.test(headSha)) throw new Error("oidc_run_invalid");
  return { runId, headSha };
}

async function githubJson(path: string) {
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, {
    headers: GH_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`github_${response.status}`);
  return await response.json();
}
async function rawFile(headSha: string, path: string) {
  const response = await fetch(`https://raw.githubusercontent.com/${REPOSITORY}/${headSha}/${path}`, {
    headers: { "user-agent": "velmere-r7-shield-finalizer" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`raw_${response.status}_${path}`);
  return new Uint8Array(await response.arrayBuffer());
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { ok: false, error: "method_not_allowed" });
  const match = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return respond(401, { ok: false, error: "oidc_missing" });

  let verified: { runId: string; headSha: string };
  try {
    verified = await verifyOidc(match[1]!);
  } catch (error) {
    return respond(401, { ok: false, error: error instanceof Error ? error.message : "oidc_invalid" });
  }

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return respond(400, { ok: false, error: "invalid_json" }); }
  if (body.action !== "finalize" || Object.keys(body).length !== 1) {
    return respond(400, { ok: false, error: "action_invalid" });
  }

  try {
    const run = await githubJson(`/actions/runs/${verified.runId}`) as Record<string, unknown>;
    if (
      run.name !== WORKFLOW ||
      run.path !== WORKFLOW_FILE ||
      run.head_branch !== BRANCH ||
      run.head_sha !== verified.headSha ||
      !["in_progress", "completed"].includes(String(run.status ?? ""))
    ) throw new Error("run_binding_invalid");

    const jobs = await githubJson(`/actions/runs/${verified.runId}/jobs?per_page=100`) as {
      jobs?: Record<string, unknown>[];
    };
    const e2e = jobs.jobs?.find((job) => job.name === JOB_NAME);
    if (!e2e || e2e.conclusion !== "success") throw new Error("e2e_job_not_success");

    const expectedArtifactName = `r7-shield-basic-customer-e2e-${verified.headSha}-${verified.runId}`;
    let artifact: Record<string, unknown> | undefined;
    for (let attempt = 0; attempt < 30 && !artifact; attempt += 1) {
      const artifacts = await githubJson(`/actions/runs/${verified.runId}/artifacts?per_page=100`) as {
        artifacts?: Record<string, unknown>[];
      };
      artifact = artifacts.artifacts?.find((candidate) => candidate.name === expectedArtifactName);
      if (!artifact) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (
      !artifact ||
      artifact.expired === true ||
      typeof artifact.digest !== "string" ||
      !artifact.digest.startsWith("sha256:")
    ) throw new Error("artifact_not_bound");

    const bridge = await rawFile(verified.headSha, REPO_BRIDGE_PATH);
    const helper = await rawFile(verified.headSha, REPO_HELPER_PATH);
    const workflow = await rawFile(verified.headSha, WORKFLOW_FILE);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) throw new Error("server_environment_unavailable");
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const finalization = await admin.rpc("velmere_r7_finalize_shield_basic_v1", {
      p_github_run_id: verified.runId,
      p_github_sha: verified.headSha,
      p_workflow_sha256: await sha256(workflow),
      p_artifact_digest_sha256: artifact.digest.slice(7),
      p_bridge_digest_sha256: await sha256(bridge),
      p_oidc_helper_digest_sha256: await sha256(helper),
    });
    if (finalization.error) throw new Error(`rpc_${finalization.error.code ?? "failed"}`);

    return respond(200, {
      ok: true,
      schemaVersion: "velmere.r7.shield-basic-finalizer.v2",
      runId: verified.runId,
      headSha: verified.headSha,
      artifactId: artifact.id,
      artifactDigest: artifact.digest,
      result: finalization.data,
      serviceRoleReturned: false,
    });
  } catch (error) {
    return respond(503, {
      ok: false,
      error: error instanceof Error ? error.message : "shield_finalization_failed",
    });
  }
});
