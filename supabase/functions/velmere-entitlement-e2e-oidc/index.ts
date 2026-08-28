import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";
import { verifyGithubOidc, type VerifiedGithubOidc } from "./oidc.ts";

const SOURCE_VERSION = "velmere-entitlement-e2e-oidc.v1";
const EXPECTED_SUPABASE_URL = "https://yljjyowcvjgjcamffnvd.supabase.co";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENTITLEMENT_ID = /^ent_[a-f0-9]{48}$/;
const CUSTOMER_JWT = /^[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,2048}$/;
const RESPONSE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
};
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: RESPONSE_HEADERS,
});
const noRedirectFetch: typeof fetch = (input, init = {}) => fetch(input, {
  ...init,
  redirect: "error",
});

type AdminClient = ReturnType<typeof createClient>;
type RunUser = {
  accessToken: string;
  accountId: string;
  reconnectVerified: true;
  userId: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(body: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(body).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function randomPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("") + "Aa1!";
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function operatorFingerprint(value: string): Promise<string> {
  return "operator_" + (await sha256Hex(value)).slice(0, 20);
}

async function readBodyTextBounded(
  message: Request | Response,
  maxBytes: number,
  errorCode: string,
  sizeErrorCode = errorCode,
): Promise<string> {
  const declared = message.headers.get("content-length");
  if (declared !== null) {
    const parsed = Number(declared);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maxBytes) {
      throw new Error(sizeErrorCode);
    }
  }
  if (!message.body) throw new Error(errorCode);
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      total += item.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel(sizeErrorCode).catch(() => undefined);
        throw new Error(sizeErrorCode);
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total === 0) throw new Error(errorCode);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(errorCode);
  }
}

function accountIdFor(userId: string): string {
  return `supabase:${userId.toLowerCase()}`;
}

async function parseBody(request: Request): Promise<{ body: Record<string, unknown>; raw: string }> {
  let raw: string;
  try {
    raw = await readBodyTextBounded(request, 8_192, "invalid_body", "request_too_large");
  } catch (error) {
    if (error instanceof Error && error.message === "request_too_large") throw error;
    throw new Error("invalid_body");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("invalid_json");
  }
  if (!isObject(parsed)) throw new Error("invalid_json");
  return { body: parsed, raw };
}

async function assertRunUser(
  admin: AdminClient,
  userId: string,
  verified: VerifiedGithubOidc,
): Promise<{ accountId: string }> {
  if (!UUID.test(userId)) throw new Error("run_user_id_invalid");
  const fetched = await admin.auth.admin.getUserById(userId);
  const metadata = fetched.data.user?.app_metadata ?? {};
  if (fetched.error
      || !fetched.data.user
      || metadata.velmere_test !== true
      || metadata.velmere_shared_entitlement_e2e !== true
      || String(metadata.r7_run_id ?? "") !== verified.runId
      || Number(metadata.r7_run_attempt ?? 0) !== verified.runAttempt
      || String(metadata.r7_head_sha ?? "") !== verified.headSha
      || !/^[a-f0-9]{64}$/.test(String(metadata.r7_oidc_jti_sha256 ?? ""))) {
    throw new Error("run_user_binding_invalid");
  }
  return { accountId: accountIdFor(userId) };
}

async function provisionRunUser(
  admin: AdminClient,
  url: string,
  anonKey: string,
  verified: VerifiedGithubOidc,
  label: "a" | "b",
  createdIds: string[],
): Promise<RunUser> {
  const password = randomPassword();
  const tokenTag = verified.tokenId.replace(/-/g, "").slice(0, 16).toLowerCase();
  const email = `r7-shared-entitlement-${verified.runId}-${verified.runAttempt}-${tokenTag}-${label}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      label,
      r7_head_sha: verified.headSha,
      r7_oidc_jti_sha256: await sha256Hex(verified.tokenId),
      r7_run_attempt: verified.runAttempt,
      r7_run_id: verified.runId,
      velmere_shared_entitlement_e2e: true,
      velmere_test: true,
    },
  });
  if (created.error || !created.data.user || !UUID.test(created.data.user.id)) {
    throw new Error(`create_user_${label}_failed`);
  }
  const userId = created.data.user.id;
  const accountId = accountIdFor(userId);
  createdIds.push(userId);
  const binding = await admin.rpc("velmere_bind_account_to_supabase_subject", {
    p_account_id: accountId,
    p_supabase_subject: userId,
    p_request_id: `r7shared_${verified.runId}_${verified.runAttempt}_${tokenTag}_${label}`,
    p_operator_fingerprint: await operatorFingerprint(
      `${verified.runId}:${verified.runAttempt}:${verified.tokenId}:${label}:${String(verified.claims.actor_id ?? "")}`,
    ),
  });
  if (binding.error || !["bound", "already_bound"].includes(String(binding.data ?? ""))) {
    throw new Error(`bind_user_${label}_failed`);
  }

  const firstClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: noRedirectFetch },
  });
  const firstSignIn = await firstClient.auth.signInWithPassword({ email, password });
  const firstAccessToken = firstSignIn.data.session?.access_token;
  if (firstSignIn.error || !firstAccessToken) throw new Error(`first_signin_${label}_failed`);
  const staleSessionClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: noRedirectFetch, headers: { Authorization: `Bearer ${firstAccessToken}` } },
  });
  const signedOut = await firstClient.auth.signOut({ scope: "local" });
  if (signedOut.error) throw new Error(`local_signout_${label}_failed`);
  const staleBinding = await staleSessionClient.rpc("velmere_current_active_session_account_id");
  if (staleBinding.error || staleBinding.data !== null) throw new Error(`old_session_still_active_${label}`);

  const reconnectedClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: noRedirectFetch },
  });
  const secondSignIn = await reconnectedClient.auth.signInWithPassword({ email, password });
  const accessToken = secondSignIn.data.session?.access_token;
  if (secondSignIn.error || !accessToken || accessToken === firstAccessToken) {
    throw new Error(`reconnect_${label}_failed`);
  }
  const activeSessionClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: noRedirectFetch, headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const activeBinding = await activeSessionClient.rpc("velmere_current_active_session_account_id");
  if (activeBinding.error || activeBinding.data !== accountId) throw new Error(`reconnect_binding_${label}_failed`);
  return { accessToken, accountId, reconnectVerified: true, userId };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { ok: false, error: "method_not_allowed" });
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!bearer) return respond(401, { ok: false, error: "oidc_missing" });
  let verified: VerifiedGithubOidc;
  try {
    verified = await verifyGithubOidc(bearer[1]!);
  } catch (error) {
    return respond(401, { ok: false, error: error instanceof Error ? error.message : "oidc_invalid" });
  }

  let parsedBody: { body: Record<string, unknown>; raw: string };
  try {
    parsedBody = await parseBody(request);
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_body";
    return respond(code === "request_too_large" ? 413 : 400, { ok: false, error: code });
  }
  const body = parsedBody.body;
  const action = typeof body.action === "string" ? body.action : "";
  if (!["cleanup", "grant_advanced", "provision", "resolve", "revoke"].includes(action)) {
    return respond(400, { ok: false, error: "action_invalid" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (url !== EXPECTED_SUPABASE_URL || !anonKey || !serviceRoleKey) {
    return respond(503, { ok: false, error: "server_environment_unavailable" });
  }
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: noRedirectFetch },
  });
  const requestSha256 = await sha256Hex(parsedBody.raw);
  const tokenIdSha256 = await sha256Hex(verified.tokenId);
  const consumed = await admin.rpc("velmere_r7_consume_shared_entitlement_oidc_jti_v1", {
    p_jti_sha256: tokenIdSha256,
    p_github_run_id: verified.runId,
    p_run_attempt: verified.runAttempt,
    p_head_sha: verified.headSha,
    p_action: action,
    p_request_sha256: requestSha256,
    p_token_issued_at: new Date(verified.issuedAt * 1_000).toISOString(),
    p_token_expires_at: new Date(verified.expiresAt * 1_000).toISOString(),
  });
  if (consumed.error) {
    return respond(503, {
      ok: false,
      error: "oidc_consumption_unavailable",
      serviceRoleReturned: false,
      customerFinalCredit: false,
      paidValueFinalCredit: false,
    });
  }
  if (consumed.data !== true) {
    return respond(409, {
      ok: false,
      error: "oidc_jti_replayed",
      serviceRoleReturned: false,
      customerFinalCredit: false,
      paidValueFinalCredit: false,
    });
  }

  if (body.action === "provision") {
    if (!exactKeys(body, ["action"])) return respond(400, { ok: false, error: "provision_shape_invalid" });
    const createdIds: string[] = [];
    let entitlementMutationAttempted = false;
    try {
      const a = await provisionRunUser(admin, url, anonKey, verified, "a", createdIds);
      const b = await provisionRunUser(admin, url, anonKey, verified, "b", createdIds);
      entitlementMutationAttempted = true;
      const entitlement = await admin.rpc("velmere_r7_create_browser_pro_test_entitlement_v1", {
        p_github_run_id: verified.runId,
        p_account_id: a.accountId,
      });
      if (entitlement.error || typeof entitlement.data !== "string" || !ENTITLEMENT_ID.test(entitlement.data)) {
        throw new Error("pro_entitlement_create_failed");
      }
      return respond(200, {
        ok: true,
        action: "provision",
        schemaVersion: "velmere.shared-entitlement-e2e-session.v2",
        sourceVersion: SOURCE_VERSION,
        runId: verified.runId,
        runAttempt: verified.runAttempt,
        githubSha: verified.headSha,
        a,
        b,
        proEntitlementId: entitlement.data,
        reconnectVerified: a.reconnectVerified && b.reconnectVerified,
        oldSessionsInactive: true,
        serverCapabilityReturned: false,
        rawPasswordsReturned: false,
        refreshTokensReturned: false,
        serviceRoleReturned: false,
        customerFinalCredit: false,
        paidValueFinalCredit: false,
      });
    } catch (error) {
      let entitlementCleanupSucceeded = !entitlementMutationAttempted;
      if (entitlementMutationAttempted) {
        const cleanup = await admin.rpc("velmere_r7_cleanup_browser_test_entitlements_v1", {
          p_github_run_id: verified.runId,
        });
        entitlementCleanupSucceeded = !cleanup.error;
      }
      let deletedUsers = 0;
      for (const userId of createdIds) {
        try {
          const removed = await admin.auth.admin.deleteUser(userId);
          if (!removed.error) deletedUsers += 1;
        } catch { /* counted as incomplete below */ }
      }
      let identityCleanupSucceeded = createdIds.length === 0;
      if (createdIds.length > 0) {
        const identityCleanup = await admin.rpc("velmere_r7_verify_shared_entitlement_user_cleanup_v1", {
          p_user_ids: createdIds,
        });
        identityCleanupSucceeded = !identityCleanup.error
          && isObject(identityCleanup.data)
          && identityCleanup.data.requested === createdIds.length
          && identityCleanup.data.usersAbsent === true
          && identityCleanup.data.bindingsAbsent === true;
      }
      return respond(500, {
        ok: false,
        error: error instanceof Error ? error.message : "provision_failed",
        partialCleanupAttempted: true,
        partialCleanupVerified: entitlementCleanupSucceeded
          && deletedUsers === createdIds.length
          && identityCleanupSucceeded,
        requestedUserCleanup: createdIds.length,
        deletedUsers,
        entitlementCleanupSucceeded,
        identityCleanupSucceeded,
        serviceRoleReturned: false,
        customerFinalCredit: false,
        paidValueFinalCredit: false,
      });
    }
  }

  if (body.action === "resolve") {
    if (!exactKeys(body, ["accessToken", "action", "requiredTier", "userId"])
        || typeof body.userId !== "string"
        || typeof body.accessToken !== "string"
        || !CUSTOMER_JWT.test(body.accessToken)
        || !["basic", "pro", "advanced"].includes(String(body.requiredTier ?? ""))) {
      return respond(400, { ok: false, error: "resolve_shape_invalid" });
    }
    try {
      await assertRunUser(admin, body.userId, verified);
    } catch (error) {
      return respond(403, { ok: false, error: error instanceof Error ? error.message : "resolve_user_invalid" });
    }
    const caller = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: noRedirectFetch },
    });
    const callerUser = await caller.auth.getUser(body.accessToken);
    if (callerUser.error || callerUser.data.user?.id !== body.userId) {
      return respond(403, { ok: false, error: "resolve_session_user_mismatch" });
    }
    const capability = await admin.rpc("velmere_r7_read_product_entitlement_server_capability_for_oidc");
    if (capability.error
        || typeof capability.data !== "string"
        || capability.data.length < 48
        || capability.data.length > 512) {
      return respond(503, { ok: false, error: "entitlement_capability_unavailable" });
    }
    let bridgeResponse: Response;
    try {
      bridgeResponse = await fetch(`${url}/functions/v1/velmere-product-entitlement-bridge`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${body.accessToken}`,
          "content-type": "application/json",
          "x-velmere-entitlement-server-capability": capability.data,
        },
        body: JSON.stringify({
          schemaVersion: "velmere.product-entitlement-bridge-request.v1",
          action: "resolve",
          productSlug: "browser",
          requiredTier: body.requiredTier,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return respond(503, { ok: false, error: "entitlement_bridge_unavailable" });
    }
    let bridgeBody: Record<string, unknown> = {};
    try {
      const bridgeContentType = (bridgeResponse.headers.get("content-type") ?? "").toLowerCase();
      if (!bridgeContentType.includes("application/json")) throw new Error("bridge_content_type_invalid");
      const parsed = JSON.parse(
        await readBodyTextBounded(bridgeResponse, 65_536, "bridge_response_too_large"),
      );
      if (isObject(parsed)) bridgeBody = parsed;
    } catch { /* invalid bridge bodies fail closed below */ }
    const allowed = bridgeResponse.status === 200 && bridgeBody.allowed === true;
    const safeError = typeof bridgeBody.error === "string"
      && /^[a-z][a-z0-9_]{2,80}$/.test(bridgeBody.error)
      ? bridgeBody.error
      : null;
    return respond(200, {
      ok: true,
      action: "resolve",
      sourceVersion: SOURCE_VERSION,
      bridgeStatus: bridgeResponse.status,
      bridgeOk: bridgeBody.ok === true,
      allowed,
      error: safeError,
      serverCapabilityReturned: false,
      accessTokenReturned: false,
      serviceRoleReturned: false,
      customerFinalCredit: false,
      paidValueFinalCredit: false,
    });
  }

  if (body.action === "grant_advanced") {
    if (!exactKeys(body, ["action", "userId"]) || typeof body.userId !== "string") {
      return respond(400, { ok: false, error: "grant_advanced_shape_invalid" });
    }
    let accountId: string;
    try {
      accountId = (await assertRunUser(admin, body.userId, verified)).accountId;
    } catch (error) {
      return respond(403, { ok: false, error: error instanceof Error ? error.message : "run_user_invalid" });
    }
    const granted = await admin.rpc("velmere_r7_grant_browser_advanced_preserving_pro_test_v1", {
      p_github_run_id: verified.runId,
      p_account_id: accountId,
    });
    if (granted.error) {
      const terminalReplay = granted.error.message === "r7_browser_advanced_regrant_after_revocation_denied";
      return respond(terminalReplay ? 409 : 503, {
        ok: false,
        error: terminalReplay ? "advanced_grant_replay_rejected" : "advanced_grant_unavailable",
        providerCode: granted.error.code ?? null,
      });
    }
    if (!isObject(granted.data)
        || typeof granted.data.entitlementId !== "string"
        || !ENTITLEMENT_ID.test(granted.data.entitlementId)
        || !["CREATED", "IDEMPOTENT_ACTIVE"].includes(String(granted.data.state ?? ""))) {
      return respond(503, { ok: false, error: "advanced_grant_response_invalid" });
    }
    return respond(200, {
      ok: true,
      action: "grant_advanced",
      sourceVersion: SOURCE_VERSION,
      entitlementId: granted.data.entitlementId,
      state: granted.data.state,
      serviceRoleReturned: false,
      customerFinalCredit: false,
      paidValueFinalCredit: false,
    });
  }

  if (body.action === "revoke") {
    if (!exactKeys(body, ["action", "entitlementId"])
        || typeof body.entitlementId !== "string"
        || !ENTITLEMENT_ID.test(body.entitlementId)) {
      return respond(400, { ok: false, error: "revoke_shape_invalid" });
    }
    const revoked = await admin.rpc("velmere_r7_revoke_browser_test_entitlement_v1", {
      p_github_run_id: verified.runId,
      p_entitlement_id: body.entitlementId,
    });
    if (revoked.error) {
      return respond(503, { ok: false, error: "revoke_unavailable", providerCode: revoked.error.code ?? null });
    }
    return respond(200, {
      ok: true,
      action: "revoke",
      revoked: revoked.data === true,
      serviceRoleReturned: false,
      customerFinalCredit: false,
      paidValueFinalCredit: false,
    });
  }

  if (body.action === "cleanup") {
    if (!exactKeys(body, ["action", "entitlementIds", "userIds"])
        || !Array.isArray(body.userIds)
        || !Array.isArray(body.entitlementIds)) {
      return respond(400, { ok: false, error: "cleanup_shape_invalid" });
    }
    const userIds = body.userIds.filter((value): value is string => typeof value === "string" && UUID.test(value));
    const entitlementIds = body.entitlementIds.filter(
      (value): value is string => typeof value === "string" && ENTITLEMENT_ID.test(value),
    );
    if (userIds.length !== body.userIds.length
        || userIds.length < 1 || userIds.length > 4
        || new Set(userIds).size !== userIds.length
        || entitlementIds.length !== body.entitlementIds.length
        || entitlementIds.length < 1 || entitlementIds.length > 4
        || new Set(entitlementIds).size !== entitlementIds.length) {
      return respond(400, { ok: false, error: "cleanup_targets_invalid" });
    }
    for (const userId of userIds) {
      try {
        // Cleanup can use a newly issued short-lived OIDC JWT after the
        // lifecycle JWT expires. It remains bound to the exact run attempt,
        // commit SHA, workflow, branch, repository, owner and actor.
        await assertRunUser(admin, userId, verified);
      } catch (error) {
        return respond(403, { ok: false, error: error instanceof Error ? error.message : "cleanup_user_invalid" });
      }
    }

    let revokeErrors = 0;
    for (const entitlementId of entitlementIds) {
      const revoked = await admin.rpc("velmere_r7_revoke_browser_test_entitlement_v1", {
        p_github_run_id: verified.runId,
        p_entitlement_id: entitlementId,
      });
      if (revoked.error) revokeErrors += 1;
    }
    const cleanup = await admin.rpc("velmere_r7_cleanup_browser_test_entitlements_v1", {
      p_github_run_id: verified.runId,
    });
    let deleted = 0;
    for (const userId of userIds) {
      const removed = await admin.auth.admin.deleteUser(userId);
      if (!removed.error) deleted += 1;
    }
    const identityCleanup = await admin.rpc("velmere_r7_verify_shared_entitlement_user_cleanup_v1", {
      p_user_ids: userIds,
    });
    const identityCleanupVerified = !identityCleanup.error
      && isObject(identityCleanup.data)
      && identityCleanup.data.requested === userIds.length
      && identityCleanup.data.usersAbsent === true
      && identityCleanup.data.bindingsAbsent === true;
    const confirmedDeleted = identityCleanupVerified ? userIds.length : 0;
    const entitlementCleanup = await admin.rpc("velmere_r7_verify_browser_test_entitlement_cleanup_v1", {
      p_github_run_id: verified.runId,
    });
    const cleanupVerified = revokeErrors === 0
      && !cleanup.error
      && deleted === userIds.length
      && identityCleanupVerified
      && !entitlementCleanup.error
      && entitlementCleanup.data === true;
    return respond(200, {
      ok: cleanupVerified,
      action: "cleanup",
      sourceVersion: SOURCE_VERSION,
      cleanupVerified,
      requestedUsers: userIds.length,
      deleted,
      confirmedDeleted,
      identityCleanupVerified,
      accountBindingsCleanupVerified: identityCleanupVerified,
      requestedEntitlements: entitlementIds.length,
      entitlementCleanupVerified: entitlementCleanup.data === true,
      serviceRoleReturned: false,
      customerFinalCredit: false,
      paidValueFinalCredit: false,
    });
  }

  return respond(400, { ok: false, error: "action_invalid" });
});
