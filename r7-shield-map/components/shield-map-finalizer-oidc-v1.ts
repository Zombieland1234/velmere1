import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";

const REPO = "Zombieland1234/velmere1";
const REPO_ID = "1269597731";
const OWNER = "Zombieland1234";
const ACTOR = "Zombieland1234";
const ACTOR_ID = "213797395";
const BRANCH = "velmere-r7-successor-delta-20260825";
const WORKFLOW = "R7 Shield Map Customer Graph E2E";
const WORKFLOW_PATH = "/.github/workflows/r7-shield-map-customer-e2e.yml@";
const AUDIENCE = "velmere-r7-shield-map-finalizer";
const GITHUB_HEADERS = {
  accept: "application/vnd.github+json",
  "user-agent": "velmere-r7-shield-map-finalizer",
  "x-github-api-version": "2022-11-28",
};
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: HEADERS });

function decode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}
function json(value: string) {
  return JSON.parse(new TextDecoder().decode(decode(value))) as Record<string, unknown>;
}
function audience(value: unknown) {
  return typeof value === "string" ? value === AUDIENCE : Array.isArray(value) && value.includes(AUDIENCE);
}
async function hash(bytes: Uint8Array) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function verify(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("shape");
  const header = json(parts[0]!);
  const claims = json(parts[1]!);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("header");
  const jwksResponse = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  const keyData = (await jwksResponse.json() as { keys?: JsonWebKey[] }).keys?.find((row) => row.kid === header.kid);
  if (!jwksResponse.ok || !keyData) throw new Error("jwks");
  const key = await crypto.subtle.importKey("jwk", keyData, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(parts[2]!), signed)) throw new Error("signature");
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(claims.exp ?? 0);
  const iat = Number(claims.iat ?? 0);
  const nbf = Number(claims.nbf ?? 0);
  if (
    claims.iss !== "https://token.actions.githubusercontent.com"
    || !audience(claims.aud)
    || exp <= now - 15
    || iat < now - 900
    || iat > now + 30
    || (Number.isFinite(nbf) && nbf > now + 30)
  ) throw new Error("time");
  if (
    claims.repository !== REPO
    || String(claims.repository_id ?? "") !== REPO_ID
    || claims.repository_owner !== OWNER
    || claims.actor !== ACTOR
    || String(claims.actor_id ?? "") !== ACTOR_ID
    || claims.ref !== `refs/heads/${BRANCH}`
    || claims.workflow !== WORKFLOW
    || typeof claims.workflow_ref !== "string"
    || !claims.workflow_ref.includes(WORKFLOW_PATH)
  ) throw new Error("identity");
  const runId = String(claims.run_id ?? "");
  const sha = String(claims.sha ?? "");
  if (!/^\d{1,20}$/.test(runId) || !/^[a-f0-9]{40}$/.test(sha)) throw new Error("run");
  return { runId, sha };
}

async function githubJson(path: string) {
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: GITHUB_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`github_${response.status}`);
  return await response.json();
}
async function raw(sha: string, path: string) {
  const response = await fetch(`https://raw.githubusercontent.com/${REPO}/${sha}/${path}`, {
    headers: { "user-agent": "velmere-r7-shield-map-finalizer" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`raw_${response.status}_${path}`);
  return new Uint8Array(await response.arrayBuffer());
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { ok: false, error: "method_not_allowed" });
  const match = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return respond(401, { ok: false, error: "oidc_missing" });
  let identity: { runId: string; sha: string };
  try {
    identity = await verify(match[1]!);
  } catch (error) {
    return respond(401, { ok: false, error: error instanceof Error ? `oidc_${error.message}` : "oidc_invalid" });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return respond(400, { ok: false, error: "invalid_json" });
  }
  if (body.action !== "finalize" || Object.keys(body).length !== 1) {
    return respond(400, { ok: false, error: "action_invalid" });
  }

  try {
    const run = await githubJson(`/actions/runs/${identity.runId}`) as Record<string, unknown>;
    if (
      run.name !== WORKFLOW
      || run.path !== ".github/workflows/r7-shield-map-customer-e2e.yml"
      || run.head_branch !== BRANCH
      || run.head_sha !== identity.sha
      || !["in_progress", "completed"].includes(String(run.status ?? ""))
    ) throw new Error("run_binding");
    const jobs = await githubJson(`/actions/runs/${identity.runId}/jobs?per_page=100`) as { jobs?: Record<string, unknown>[] };
    const e2e = jobs.jobs?.find((job) => job.name === "shield-map-customer-e2e");
    if (!e2e || e2e.conclusion !== "success") throw new Error("e2e_not_success");

    let artifact: Record<string, unknown> | undefined;
    for (let attempt = 0; attempt < 10 && !artifact; attempt += 1) {
      const artifacts = await githubJson(`/actions/runs/${identity.runId}/artifacts?per_page=100`) as { artifacts?: Record<string, unknown>[] };
      artifact = artifacts.artifacts?.find((row) => row.name === `r7-shield-map-customer-e2e-${identity.sha}-${identity.runId}`);
      if (!artifact) await new Promise((resolve) => setTimeout(resolve, 750));
    }
    if (!artifact || artifact.expired === true || typeof artifact.digest !== "string" || !artifact.digest.startsWith("sha256:")) {
      throw new Error("artifact_not_bound");
    }

    const bridge = await raw(identity.sha, "r7-shield-map/components/shield-map-public-bridge-v1.ts");
    const helper = await raw(identity.sha, "r7-shield-map/components/shield-map-e2e-oidc-v1.ts");
    const finalizer = await raw(identity.sha, "r7-shield-map/components/shield-map-finalizer-oidc-v1.ts");
    const dataPlane = await raw(identity.sha, "r7-shield-map/sql/shield-map-data-plane-v1.sql");
    const workflow = await raw(identity.sha, ".github/workflows/r7-shield-map-customer-e2e.yml");

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("server_environment");
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const final = await admin.rpc("velmere_r7_finalize_shield_map_v1", {
      p_github_run_id: identity.runId,
      p_github_sha: identity.sha,
      p_workflow_sha256: await hash(workflow),
      p_artifact_digest_sha256: artifact.digest.slice(7),
      p_bridge_digest_sha256: await hash(bridge),
      p_oidc_helper_digest_sha256: await hash(helper),
      p_finalizer_digest_sha256: await hash(finalizer),
      p_data_plane_digest_sha256: await hash(dataPlane),
    });
    if (final.error) throw new Error(`rpc_${final.error.code ?? "failed"}:${final.error.message ?? ""}`);
    const reRead = await admin
      .from("velmere_r7_customer_final_ledger")
      .select("product_ordinal,product_slug,final_status,finalized_at,evidence")
      .eq("product_slug", "shield-map")
      .single();
    if (reRead.error || reRead.data?.final_status !== "FINAL") throw new Error("ledger_reread_failed");
    return respond(200, {
      ok: true,
      schemaVersion: "velmere.r7.shield-map-finalizer.v1",
      runId: identity.runId,
      headSha: identity.sha,
      artifactId: artifact.id,
      artifactDigest: artifact.digest,
      result: final.data,
      reRead: reRead.data,
      serviceRoleReturned: false,
    });
  } catch (error) {
    return respond(503, { ok: false, error: error instanceof Error ? error.message : "shield_map_finalization_failed" });
  }
});
