import {
  mapR7RestoreFailure,
  readR7BoundedJsonRequest,
  validateR7BrowserBasicRequest,
} from "./bounded-json.mts";
import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";

const JWT_SHAPE = /^[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,2048}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  },
});

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match || !JWT_SHAPE.test(match[1])) return null;
  return match[1];
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });
  const requestRead = await readR7BoundedJsonRequest(request);
  if (!requestRead.ok) return json(requestRead.status, { ok: false, error: requestRead.error });
  const requestValidation = validateR7BrowserBasicRequest(requestRead.body);
  if (!requestValidation.ok) return json(400, { ok: false, error: requestValidation.error });
  const body = requestValidation.request;

  const token = bearerToken(request);
  if (!token) return json(401, { ok: false, error: "authentication_required" });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return json(503, { ok: false, error: "server_environment_unavailable" });
  }

  // Verify the supplied access token with GoTrue. The token remains only in
  // memory and is never logged, persisted or returned in a response.
  const caller = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser(token);
  const user = userData.user;
  if (userError || !user || !UUID.test(user.id)) {
    return json(401, { ok: false, error: "authentication_invalid" });
  }

  // Resolve the account through an authenticated function that also checks the
  // JWT session_id against the live GoTrue auth.sessions row.  This prevents a
  // still-unexpired token from surviving logout for the sensitive restore path.
  const { data: currentAccountData, error: currentAccountError } = await caller.rpc(
    "velmere_current_active_session_account_id",
  );
  if (currentAccountError) {
    return json(503, { ok: false, error: "session_binding_unavailable" });
  }
  const currentAccount = typeof currentAccountData === "string" ? currentAccountData : null;
  if (!currentAccount) return json(401, { ok: false, error: "session_inactive" });
  const expectedAccount = `supabase:${user.id.toLowerCase()}`;
  if (currentAccount !== expectedAccount) {
    return json(403, { ok: false, error: "account_binding_invalid" });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (body.action === "receipt") {
    const { data, error } = await admin.rpc("velmere_r7_common_staging_summary");
    if (error) return json(502, { ok: false, error: "staging_receipt_failed", code: error.code ?? null });
    return json(200, { ok: true, action: "receipt", receipt: data, rawSecretsReturned: false });
  }
  if (body.action === "restore") {
    const { data, error } = await admin.rpc(
      "velmere_r7_restore_artifact_from_backup_for_owner",
      { p_backup_id: body.backupId, p_expected_account_id: currentAccount },
    );
    const publicFailure = mapR7RestoreFailure(error?.code);
    if (publicFailure) return json(publicFailure.status, { ok: false, error: publicFailure.error });
    if (error) return json(502, { ok: false, error: "staging_restore_failed" });
    return json(200, {
      ok: true,
      action: "restore",
      created: data?.created === true,
      backupId: body.backupId,
      snapshotId: data?.snapshot?.snapshotId ?? null,
      snapshotDigest: data?.snapshot?.snapshotDigest ?? null,
      pdfDigest: data?.blob?.pdfDigest ?? null,
      rawSecretsReturned: false,
      customerFinalCredit: false,
    });
  }
  return json(400, { ok: false, error: "action_invalid" });
});
