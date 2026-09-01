import assert from "node:assert/strict";
import type { AuthSession, AuthUser } from "@supabase/supabase-js";
import {
  AuthSessionFamilyError,
  authSessionSubjectFingerprint,
  buildAuthSessionFamilyCookie,
  type AuthSessionFamilyState,
} from "../../lib/auth/auth-session-family.ts";
import {
  refreshSupabaseCookieSession,
  SupabaseAuthSessionError,
  type SupabaseAuthSessionDependencies,
} from "../../lib/auth/supabase-auth-session.ts";
import { PUT as refreshSessionRoute } from "../../app/api/auth/session/route.ts";

const NOW = Date.now();
const USER_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_USER_ID = "223e4567-e89b-42d3-a456-426614174000";
const FAMILY_ID = "323e4567-e89b-42d3-a456-426614174000";
const originalEnvironment = { ...process.env };

Object.assign(process.env, {
  NODE_ENV: "test",
  VERCEL_ENV: "preview",
  VELMERE_ACCOUNT_SESSION_SECRET_CURRENT: "a".repeat(48),
  VELMERE_AUTH_SESSION_FAMILY_SECRET_CURRENT: "b".repeat(48),
});
delete process.env.VELMERE_REQUIRE_DURABLE_RATE_LIMIT;
delete process.env.VELMERE_REQUIRE_DURABLE_SECURITY_STATE;

function authUser(id = USER_ID): AuthUser {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: `${id === USER_ID ? "member" : "other"}@example.test`,
    email_confirmed_at: new Date(NOW - 60_000).toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: new Date(NOW - 120_000).toISOString(),
    updated_at: new Date(NOW - 60_000).toISOString(),
    is_anonymous: false,
  } as AuthUser;
}

function authSession(user: AuthUser): AuthSession {
  return {
    access_token: `access-${user.id}`,
    refresh_token: "refresh-token-controlled-fixture",
    expires_in: 3_600,
    expires_at: Math.floor(NOW / 1_000) + 3_600,
    token_type: "bearer",
    user,
  } as AuthSession;
}

function familyState(subject = USER_ID): AuthSessionFamilyState {
  return {
    schemaVersion: "velmere.auth-session-family.v1",
    familyId: FAMILY_ID,
    generation: 1,
    subjectFingerprint: authSessionSubjectFingerprint(subject),
    expiresAt: Math.floor(NOW / 1_000) + 3_600,
  };
}

function cookiePair(setCookie: string) {
  return setCookie.split(";", 1)[0] ?? "";
}

type FamilyCookieMode = "valid" | "missing" | "malformed" | "duplicate";

function refreshRequest(mode: FamilyCookieMode, subject = USER_ID) {
  const cookies = ["velmere_supabase_refresh=refresh-token-controlled-fixture"];
  if (mode !== "missing") {
    const valid = cookiePair(buildAuthSessionFamilyCookie(familyState(subject)));
    if (mode === "valid") cookies.push(valid);
    if (mode === "malformed") cookies.push("velmere_auth_family=malformed.attacker-controlled");
    if (mode === "duplicate") cookies.push(valid, valid);
  }
  return new Request("https://velmere.example/api/auth/session", {
    method: "PUT",
    headers: { cookie: cookies.join("; ") },
  });
}

function dependencyFixture(input: {
  user?: AuthUser;
  refreshRejected?: boolean;
  rotateError?: Error;
} = {}) {
  const user = input.user ?? authUser();
  const session = authSession(user);
  const counters = {
    createClient: 0,
    refresh: 0,
    bind: 0,
    issue: 0,
    rotate: 0,
    setSession: 0,
    signOut: 0,
  };
  const dependencies: SupabaseAuthSessionDependencies = {
    createAuthClient: () => {
      counters.createClient += 1;
      return {
        auth: {
          async signInWithPassword() { return { data: { user, session }, error: null }; },
          async signUp() { return { data: { user, session }, error: null }; },
          async refreshSession() {
            counters.refresh += 1;
            return input.refreshRejected
              ? { data: { user: null, session: null }, error: { code: "refresh_rejected" } }
              : { data: { user, session }, error: null };
          },
          async getUser() { return { data: { user }, error: null }; },
          async setSession() {
            counters.setSession += 1;
            return { data: { user, session }, error: null };
          },
          async signOut() {
            counters.signOut += 1;
            return { error: null };
          },
        },
      };
    },
    async bindSubject() {
      counters.bind += 1;
      return {
        schemaVersion: "velmere.account-supabase-subject-binding.v1",
        status: "bound",
        durable: true,
      };
    },
    requestId: () => "auth_bind_refresh_family_fixture",
    async issueFamily() {
      counters.issue += 1;
      return {
        status: "issued",
        cookie: "unexpected-new-family-cookie",
        state: familyState(user.id),
      };
    },
    async rotateFamily() {
      counters.rotate += 1;
      if (input.rotateError) throw input.rotateError;
      const state = { ...familyState(user.id), generation: 2 };
      return { status: "rotated", cookie: buildAuthSessionFamilyCookie(state), state };
    },
  } as SupabaseAuthSessionDependencies;
  return { dependencies, counters };
}

async function capturedError(operation: () => Promise<unknown>) {
  try {
    await operation();
    return null;
  } catch (error) {
    return error;
  }
}

const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
function check(id: string, passed: unknown, detail?: unknown) {
  checks.push({ id, passed: Boolean(passed), detail });
}

for (const mode of ["missing", "malformed", "duplicate"] as const) {
  const fixture = dependencyFixture();
  const error = await capturedError(() => refreshSupabaseCookieSession(refreshRequest(mode), fixture.dependencies));
  check(`${mode}:rejected-as-family-reuse`, error instanceof SupabaseAuthSessionError && error.code === "session_family_reuse", error instanceof Error ? error.message : "accepted");
  check(`${mode}:provider-not-called`, fixture.counters.createClient === 0 && fixture.counters.refresh === 0, fixture.counters);
  check(`${mode}:no-durable-mutation`, fixture.counters.bind === 0 && fixture.counters.issue === 0 && fixture.counters.rotate === 0, fixture.counters);
}

{
  const fixture = dependencyFixture();
  const result = await refreshSupabaseCookieSession(refreshRequest("valid"), fixture.dependencies);
  check("valid:rotates-existing-family", fixture.counters.rotate === 1 && result.sessionFamilyState === "rotated", fixture.counters);
  check("valid:never-issues-replacement-family", fixture.counters.issue === 0, fixture.counters);
  check("valid:provider-and-binding-once", fixture.counters.refresh === 1 && fixture.counters.bind === 1, fixture.counters);
  check("valid:account-remains-subject-bound", result.account.accountId === `supabase:${USER_ID}` && result.account.sessionFamily?.generation === 2, result.account);
}

{
  const fixture = dependencyFixture({ user: authUser(OTHER_USER_ID) });
  const error = await capturedError(() => refreshSupabaseCookieSession(refreshRequest("valid", USER_ID), fixture.dependencies));
  check("subject-mismatch:rejected", error instanceof SupabaseAuthSessionError && error.code === "session_family_reuse", error instanceof Error ? error.message : "accepted");
  check("subject-mismatch:no-binding", fixture.counters.bind === 0 && fixture.counters.rotate === 0 && fixture.counters.issue === 0, fixture.counters);
  check("subject-mismatch:provider-session-revoked", fixture.counters.setSession === 1 && fixture.counters.signOut === 1, fixture.counters);
}

{
  const fixture = dependencyFixture({ refreshRejected: true });
  const error = await capturedError(() => refreshSupabaseCookieSession(refreshRequest("valid"), fixture.dependencies));
  check("provider-rejection:remains-401", error instanceof SupabaseAuthSessionError && error.code === "refresh_rejected", error instanceof Error ? error.message : "accepted");
  check("provider-rejection:no-durable-mutation", fixture.counters.bind === 0 && fixture.counters.rotate === 0 && fixture.counters.issue === 0, fixture.counters);
}

{
  const fixture = dependencyFixture();
  delete fixture.dependencies.rotateFamily;
  const error = await capturedError(() => refreshSupabaseCookieSession(refreshRequest("valid"), fixture.dependencies));
  check("rotation-adapter-missing:fails-closed", error instanceof SupabaseAuthSessionError && error.code === "session_family_unavailable", error instanceof Error ? error.message : "accepted");
  check("rotation-adapter-missing:no-provider-or-mutation", Object.values(fixture.counters).every((value) => value === 0), fixture.counters);
}

{
  const fixture = dependencyFixture({ rotateError: new AuthSessionFamilyError("family_revoked") });
  const error = await capturedError(() => refreshSupabaseCookieSession(refreshRequest("valid"), fixture.dependencies));
  check("durably-revoked-family:rejected-as-reuse", error instanceof SupabaseAuthSessionError && error.code === "session_family_reuse", error instanceof Error ? error.message : "accepted");
  check("durably-revoked-family:no-binding-or-reissue", fixture.counters.bind === 0 && fixture.counters.issue === 0 && fixture.counters.rotate === 1, fixture.counters);
  check("durably-revoked-family:provider-session-revoked", fixture.counters.setSession === 1 && fixture.counters.signOut === 1, fixture.counters);
}

{
  const response = await refreshSessionRoute(refreshRequest("missing"));
  const payload = await response.json() as { code?: string };
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie") ?? ""];
  const serialized = setCookies.join("\n");
  check("route:missing-family-is-401", response.status === 401 && payload.code === "session_family_reuse", { status: response.status, payload });
  for (const name of ["velmere_account_session", "velmere_supabase_access", "velmere_supabase_refresh", "velmere_auth_family"]) {
    check(`route:clears-${name}`, serialized.includes(`${name}=`) && serialized.includes("Max-Age=0"), serialized);
  }
}

{
  const response = await refreshSessionRoute(new Request("https://velmere.example/api/auth/session", {
    method: "PUT",
    headers: { cookie: cookiePair(buildAuthSessionFamilyCookie(familyState())) },
  }));
  const payload = await response.json() as { code?: string };
  const serialized = (typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie") ?? ""]).join("\n");
  check("route:missing-refresh-is-401", response.status === 401 && payload.code === "refresh_token_missing", { status: response.status, payload });
  check("route:missing-refresh-clears-family-and-account", serialized.includes("velmere_auth_family=") && serialized.includes("velmere_account_session=") && serialized.includes("Max-Age=0"), serialized);
}

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.refresh-session-family-revocation-boundary.v1",
  status: failed.length ? "FAIL_LOCAL_PRODUCT_DEFECT" : "PASS_LOCAL_ONLY",
  assertions: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  truth: {
    refreshMayIssueReplacementFamily: false,
    missingOrInvalidFamilyCallsProvider: false,
    subjectMismatchMayBindAccount: false,
    familyReuseResponseClearsLocalAuthCookies: true,
    stagingCredit: false,
    customerFinalCredit: false,
  },
}, null, 2));

for (const key of Object.keys(process.env)) {
  if (!(key in originalEnvironment)) delete process.env[key];
}
Object.assign(process.env, originalEnvironment);
assert.equal(failed.length, 0, `${failed.length} refresh/session-family revocation assertions failed`);
