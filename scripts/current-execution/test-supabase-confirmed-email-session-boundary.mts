import assert from "node:assert/strict";
import type { AuthSession, AuthUser } from "@supabase/supabase-js";
import { authSessionSubjectFingerprint } from "../../lib/auth/auth-session-family.ts";
import {
  establishSupabasePasswordSession,
  finalizeVerifiedSupabaseSession,
  inspectSupabaseCookieSession,
  SupabaseAuthSessionError,
  type SupabaseAuthSessionDependencies,
} from "../../lib/auth/supabase-auth-session.ts";

const NOW = Date.now();
const USER_ID = "123e4567-e89b-42d3-a456-426614174000";

function authUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "member@example.test",
    email_confirmed_at: new Date(NOW - 60_000).toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: new Date(NOW - 120_000).toISOString(),
    updated_at: new Date(NOW - 60_000).toISOString(),
    is_anonymous: false,
    ...overrides,
  } as AuthUser;
}

function authSession(user: AuthUser): AuthSession {
  return {
    access_token: "access-token-controlled-fixture",
    refresh_token: "refresh-token-controlled-fixture",
    expires_in: 3_600,
    expires_at: Math.floor(NOW / 1_000) + 3_600,
    token_type: "bearer",
    user,
  } as AuthSession;
}

function dependenciesFor(user: AuthUser) {
  const counters = { bind: 0, issueFamily: 0, signUp: 0, signIn: 0, inspect: 0 };
  const session = authSession(user);
  const dependencies: SupabaseAuthSessionDependencies = {
    createAuthClient: () => ({
      auth: {
        async signInWithPassword() {
          counters.signIn += 1;
          return { data: { user, session }, error: null };
        },
        async signUp() {
          counters.signUp += 1;
          return { data: { user, session }, error: null };
        },
        async refreshSession() {
          return { data: { user, session }, error: null };
        },
        async getUser() {
          counters.inspect += 1;
          return { data: { user }, error: null };
        },
        async setSession() {
          return { data: { user, session }, error: null };
        },
        async signOut() {
          return { error: null };
        },
      },
    }),
    async bindSubject() {
      counters.bind += 1;
      return {
        schemaVersion: "velmere.account-supabase-subject-binding.v1",
        status: "bound",
        durable: true,
      };
    },
    requestId: () => "auth_bind_controlled_fixture",
    async issueFamily(subject) {
      counters.issueFamily += 1;
      assert.equal(subject, USER_ID);
      return {
        status: "issued",
        cookie: "controlled-family-cookie",
        state: {
          schemaVersion: "velmere.auth-session-family.v1",
          familyId: "123e4567-e89b-42d3-a456-426614174001",
          generation: 1,
          subjectFingerprint: authSessionSubjectFingerprint(USER_ID),
          expiresAt: Math.floor(NOW / 1_000) + 3_600,
        },
      };
    },
  } as SupabaseAuthSessionDependencies;
  return { dependencies, counters, session };
}

async function expectConfirmationRequired(operation: () => Promise<unknown>) {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof SupabaseAuthSessionError);
    assert.equal(error.code, "email_confirmation_required");
    assert.equal(error.httpStatus, 202);
    return true;
  });
}

const blockedUsers: Array<[string, AuthUser]> = [
  ["missing-email-confirmation", authUser({ email_confirmed_at: undefined })],
  ["empty-email-confirmation", authUser({ email_confirmed_at: "" })],
  ["invalid-email-confirmation", authUser({ email_confirmed_at: "not-a-timestamp" })],
  ["future-email-confirmation", authUser({ email_confirmed_at: new Date(NOW + 10 * 60_000).toISOString() })],
  ["phone-only-confirmation", authUser({ email_confirmed_at: undefined, phone_confirmed_at: new Date(NOW - 60_000).toISOString(), confirmed_at: new Date(NOW - 60_000).toISOString() })],
  ["missing-email", authUser({ email: undefined })],
  ["malformed-email", authUser({ email: "not-an-email" })],
];

let assertions = 0;
for (const [label, user] of blockedUsers) {
  const { dependencies, counters, session } = dependenciesFor(user);
  await expectConfirmationRequired(() => finalizeVerifiedSupabaseSession(user, session, undefined, undefined, dependencies));
  assert.deepEqual(counters, { bind: 0, issueFamily: 0, signUp: 0, signIn: 0, inspect: 0 }, `${label}: no durable identity or family mutation`);
  assertions += 5;
}

for (const mode of ["create", "signin"] as const) {
  const user = authUser({ email_confirmed_at: undefined });
  const { dependencies, counters } = dependenciesFor(user);
  await expectConfirmationRequired(() => establishSupabasePasswordSession({
    mode,
    email: "member@example.test",
    password: "controlled-password-only",
  }, dependencies));
  assert.equal(counters.bind, 0, `${mode}: unconfirmed identity is not bound`);
  assert.equal(counters.issueFamily, 0, `${mode}: unconfirmed identity gets no session family`);
  assert.equal(counters[mode === "create" ? "signUp" : "signIn"], 1, `${mode}: provider called exactly once`);
  assertions += 4;
}

{
  const user = authUser({ email_confirmed_at: undefined });
  const { dependencies, counters } = dependenciesFor(user);
  const request = new Request("https://velmere.example/api/auth/session", {
    headers: { cookie: "velmere_supabase_access=controlled-access-token" },
  });
  await expectConfirmationRequired(() => inspectSupabaseCookieSession(request, dependencies));
  assert.equal(counters.inspect, 1);
  assert.equal(counters.bind, 0);
  assertions += 3;
}

{
  const user = authUser();
  const { dependencies, counters, session } = dependenciesFor(user);
  const result = await finalizeVerifiedSupabaseSession(user, session, undefined, undefined, dependencies);
  assert.equal(result.user.email, "member@example.test");
  assert.equal(result.account.email, "member@example.test");
  assert.equal(result.account.accountId, `supabase:${USER_ID}`);
  assert.equal(counters.bind, 1);
  assert.equal(counters.issueFamily, 1);
  assertions += 5;
}

console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.supabase-confirmed-email-session-boundary.v1",
  status: "PASS_LOCAL_ONLY",
  assertions,
  blockedCases: blockedUsers.map(([label]) => label),
  coveredPaths: ["signup", "signin", "refresh-or-callback-finalization", "access-token-inspection"],
  durableBindingBeforeConfirmation: false,
  sessionFamilyBeforeConfirmation: false,
  productionOrStagingCredit: false,
}, null, 2));
