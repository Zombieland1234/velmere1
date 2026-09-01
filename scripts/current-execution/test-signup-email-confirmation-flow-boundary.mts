import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { AuthSession, AuthUser } from "@supabase/supabase-js";
import {
  beginSupabaseEmailPasswordSignup,
  completeSupabaseAuthCallback,
  consumeSupabaseEmailConfirmationState,
  supabaseAuthFlowDependencies,
  SupabaseAuthFlowError,
  type EmailConfirmationStateConsumption,
  type SupabaseAuthFlowDependencies,
} from "../../lib/auth/supabase-auth-flow.ts";
import {
  buildSupabaseAuthFlowCookie,
  createSupabaseAuthFlowState,
  matchesSupabaseAuthFlowExpectedIdentity,
  readSupabaseAuthFlowState,
  type SupabaseAuthFlowState,
} from "../../lib/auth/supabase-auth-flow-state.ts";
import { SupabaseAuthSessionError } from "../../lib/auth/supabase-auth-session.ts";
import { validateSupabaseAuthCallbackContract } from "../../lib/security/auth-callback-contract.ts";
import { POST as sessionPost } from "../../app/api/auth/session/route.ts";

const SITE = "https://velmere.example";
const NOW = Date.now();
const USER_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_USER_ID = "223e4567-e89b-42d3-a456-426614174000";
const EMAIL = "member@example.test";
const OTHER_EMAIL = "other@example.test";
const PASSWORD = "controlled-password-18";
const originalEnvironment = { ...process.env };
const dependencySnapshot = { ...supabaseAuthFlowDependencies };

Object.assign(process.env, {
  NODE_ENV: "test",
  VERCEL_ENV: "preview",
  NEXT_PUBLIC_SITE_URL: SITE,
  VELMERE_ACCOUNT_SESSION_SECRET_CURRENT: "a".repeat(48),
  VELMERE_AUTH_FLOW_SECRET_CURRENT: "b".repeat(48),
  VELMERE_AUTH_SESSION_FAMILY_SECRET_CURRENT: "c".repeat(48),
});
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "VELMERE_DURABLE_IDEMPOTENCY_REQUIRED",
  "VELMERE_IDEMPOTENCY_FAIL_CLOSED",
  "VELMERE_REQUIRE_DURABLE_RATE_LIMIT",
  "VELMERE_REQUIRE_DURABLE_SECURITY_STATE",
]) delete process.env[key];

function authUser(email = EMAIL, confirmed = true, id = USER_ID): AuthUser {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: confirmed ? new Date(NOW - 60_000).toISOString() : undefined,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { display_name: "Controlled Member" },
    identities: [],
    created_at: new Date(NOW - 120_000).toISOString(),
    updated_at: new Date(NOW - 60_000).toISOString(),
    is_anonymous: false,
  } as AuthUser;
}

function authSession(user: AuthUser): AuthSession {
  return {
    access_token: `access-${user.id}`,
    refresh_token: `refresh-${user.id}`,
    expires_in: 3_600,
    expires_at: Math.floor(NOW / 1_000) + 3_600,
    token_type: "bearer",
    user,
  } as AuthSession;
}

type FixtureOptions = {
  signupUser?: AuthUser | null;
  signupSession?: AuthSession | null;
  signupError?: boolean;
  writeVerifier?: boolean;
  callbackUser?: AuthUser | null;
  callbackSession?: AuthSession | null;
  callbackError?: boolean;
  finalizeError?: Error;
  consume?: (state: SupabaseAuthFlowState) => Promise<EmailConfirmationStateConsumption>;
};

function dependencyFixture(options: FixtureOptions = {}) {
  const signupUser = options.signupUser === undefined ? authUser(EMAIL, false) : options.signupUser;
  const signupSession = options.signupSession === undefined ? null : options.signupSession;
  const callbackUser = options.callbackUser === undefined ? authUser() : options.callbackUser;
  const callbackSession = options.callbackSession === undefined
    ? callbackUser ? authSession(callbackUser) : null
    : options.callbackSession;
  const counters = { createClient: 0, signUp: 0, exchange: 0, verifyOtp: 0, finalize: 0, consume: 0 };
  let signUpInput: {
    email: string;
    password: string;
    options: { data?: Record<string, unknown>; emailRedirectTo: string };
  } | null = null;
  const consumedNonces = new Set<string>();
  const dependencies: SupabaseAuthFlowDependencies = {
    createFlowClient(storage) {
      counters.createClient += 1;
      return {
        auth: {
          async signUp(input) {
            counters.signUp += 1;
            signUpInput = input;
            if (options.writeVerifier !== false) storage.setItem("sb-controlled-auth-code-verifier", "controlled-pkce-verifier/redirect");
            return options.signupError
              ? { data: { user: null, session: null }, error: { code: "controlled_signup_rejection" } }
              : { data: { user: signupUser, session: signupSession }, error: null };
          },
          async signInWithOAuth() { return { data: { url: null }, error: { code: "not_used" } }; },
          async resetPasswordForEmail() { return { data: {}, error: { code: "not_used" } }; },
          async exchangeCodeForSession() {
            counters.exchange += 1;
            return options.callbackError
              ? { data: { user: null, session: null }, error: { code: "controlled_callback_rejection" } }
              : { data: { user: callbackUser, session: callbackSession }, error: null };
          },
          async verifyOtp() {
            counters.verifyOtp += 1;
            return options.callbackError
              ? { data: { user: null, session: null }, error: { code: "controlled_callback_rejection" } }
              : { data: { user: callbackUser, session: callbackSession }, error: null };
          },
          async getUser() { return { data: { user: callbackUser }, error: null }; },
          async updateUser() { return { data: { user: callbackUser }, error: null }; },
          async signOut() { return { error: null }; },
        },
      } as never;
    },
    finalizeSession: (async (user: AuthUser) => {
      counters.finalize += 1;
      if (options.finalizeError) throw options.finalizeError;
      return {
        schemaVersion: "velmere.supabase-auth-session.v1" as const,
        account: { accountId: `supabase:${user.id}`, displayName: "Controlled Member" },
        user: { id: user.id, email: user.email },
        bindingStatus: "bound" as const,
        cookieHeaders: ["controlled-auth-cookie"],
        familyCookie: "controlled-family-cookie",
        sessionExpiresIn: 3_600,
      } as never;
    }) as SupabaseAuthFlowDependencies["finalizeSession"],
    sessionDependencies: {} as SupabaseAuthFlowDependencies["sessionDependencies"],
    async consumeEmailConfirmationState(state) {
      counters.consume += 1;
      if (options.consume) return options.consume(state);
      if (consumedNonces.has(state.nonce)) return "replayed";
      consumedNonces.add(state.nonce);
      return "consumed";
    },
  };
  return { dependencies, counters, getSignUpInput: () => signUpInput };
}

function cookiePair(setCookie: string) {
  return setCookie.split(";", 1)[0] ?? "";
}

function callbackRequest(
  state: SupabaseAuthFlowState,
  setCookie: string,
  callback: { code?: string; tokenHash?: string; type?: string; duplicateCode?: string } = { code: "controlled-code" },
) {
  const url = new URL("/api/auth/callback", SITE);
  url.searchParams.set("state", state.nonce);
  url.searchParams.set("intent", state.intent);
  url.searchParams.set("locale", state.locale);
  if (callback.code) url.searchParams.set("code", callback.code);
  if (callback.duplicateCode) url.searchParams.append("code", callback.duplicateCode);
  if (callback.tokenHash) url.searchParams.set("token_hash", callback.tokenHash);
  if (callback.type) url.searchParams.set("type", callback.type);
  return new Request(url, { headers: { cookie: cookiePair(setCookie) } });
}

function confirmationFlow(email = EMAIL, locale: "en" | "pl" | "de" = "en") {
  const draft = createSupabaseAuthFlowState({ intent: "email_confirmation", expectedEmail: email, locale, returnPath: `/${locale}/account` });
  const state: SupabaseAuthFlowState = { ...draft, storage: { "sb-controlled-auth-code-verifier": "controlled-pkce-verifier/redirect" } };
  return { state, setCookie: buildSupabaseAuthFlowCookie(state) };
}

async function capturedError(operation: () => Promise<unknown>) {
  try { await operation(); return null; } catch (error) { return error; }
}

const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
function check(id: string, passed: unknown, detail?: unknown) {
  checks.push({ id, passed: Boolean(passed), detail });
}

try {
  const routeFixture = dependencyFixture();
  Object.assign(supabaseAuthFlowDependencies, routeFixture.dependencies);
  const response = await sessionPost(new Request(`${SITE}/api/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: SITE },
    body: JSON.stringify({ provider: "email", mode: "create", email: EMAIL.toUpperCase(), password: PASSWORD, displayName: "Controlled Member", locale: "de" }),
  }));
  const payload = await response.json() as { code?: string; confirmationRequired?: boolean; authenticated?: boolean };
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie") ?? ""];
  const flowHeader = setCookies.find((value) => value.startsWith("velmere_supabase_flow=")) ?? "";
  const signUpInput = routeFixture.getSignUpInput();
  check("route:pending-signup-is-202-not-authenticated", response.status === 202 && payload.code === "email_confirmation_required" && payload.confirmationRequired === true && payload.authenticated !== true, { status: response.status, payload });
  check("route:provider-signup-called-once", routeFixture.counters.signUp === 1, routeFixture.counters);
  check("route:issues-http-only-callback-scoped-flow-cookie", flowHeader.includes("Path=/api/auth/callback") && flowHeader.includes("HttpOnly") && flowHeader.includes("SameSite=Lax") && flowHeader.includes("Max-Age=600"), flowHeader);
  const allCookies = setCookies.join("\n");
  for (const name of ["velmere_account_session", "velmere_supabase_access", "velmere_supabase_refresh", "velmere_auth_family"]) {
    check(`route:pending-signup-clears-${name}`, allCookies.includes(`${name}=`) && allCookies.includes("Max-Age=0"), allCookies);
  }
  assert.ok(flowHeader && signUpInput, "controlled route must issue a flow cookie and call signUp");
  const redirect = new URL(signUpInput.options.emailRedirectTo);
  check("initiator:redirect-is-exact-canonical-callback", redirect.origin === SITE && redirect.pathname === "/api/auth/callback" && redirect.hash === "" && redirect.username === "" && redirect.password === "", redirect.toString());
  check("initiator:redirect-query-is-exactly-bound", Array.from(redirect.searchParams.keys()).sort().join(",") === "intent,locale,state" && redirect.searchParams.get("intent") === "email_confirmation" && redirect.searchParams.get("locale") === "de", redirect.toString());
  check("initiator:normalized-email-is-sent-only-to-provider", signUpInput.email === EMAIL && !redirect.toString().includes(EMAIL) && !flowHeader.includes(EMAIL), { providerEmail: signUpInput.email, redirect: redirect.toString() });
  check("initiator:password-never-enters-redirect-or-flow-cookie", signUpInput.password === PASSWORD && !redirect.toString().includes(PASSWORD) && !flowHeader.includes(PASSWORD));
  const routeState = readSupabaseAuthFlowState(new Request(redirect, { headers: { cookie: cookiePair(flowHeader) } }));
  assert.ok(routeState, "controlled route flow cookie must decode");
  check("state:intent-locale-return-are-bound", routeState.intent === "email_confirmation" && routeState.locale === "de" && routeState.returnPath === "/de/account", routeState);
  check("state:expected-email-is-hmac-bound", matchesSupabaseAuthFlowExpectedIdentity(routeState, EMAIL) && !matchesSupabaseAuthFlowExpectedIdentity(routeState, OTHER_EMAIL), routeState.expectedIdentityFingerprint);
  check("state:pkce-verifier-is-preserved-in-signed-cookie", routeState.storage["sb-controlled-auth-code-verifier"] === "controlled-pkce-verifier/redirect", routeState.storage);

  const confirmed = authUser();
  const immediateFixture = dependencyFixture({ signupUser: confirmed, signupSession: authSession(confirmed) });
  const immediate = await beginSupabaseEmailPasswordSignup(new Request(`${SITE}/api/auth/session`), { email: EMAIL, password: PASSWORD, locale: "pl" }, immediateFixture.dependencies);
  check("initiator:auto-confirmed-provider-session-is-physically-finalized", immediate.status === "authenticated" && immediateFixture.counters.finalize === 1, { status: immediate.status, counters: immediateFixture.counters });
  const unconfirmed = authUser(EMAIL, false);
  const unconfirmedFixture = dependencyFixture({ signupUser: unconfirmed, signupSession: authSession(unconfirmed), finalizeError: new SupabaseAuthSessionError("email_confirmation_required") });
  const unconfirmedResult = await beginSupabaseEmailPasswordSignup(new Request(`${SITE}/api/auth/session`), { email: EMAIL, password: PASSWORD }, unconfirmedFixture.dependencies);
  check("initiator:unconfirmed-provider-session-never-becomes-authenticated", unconfirmedResult.status === "confirmation_required" && unconfirmedFixture.counters.finalize === 1, { status: unconfirmedResult.status, counters: unconfirmedFixture.counters });
  const rejectedFixture = dependencyFixture({ signupError: true });
  const rejectedError = await capturedError(() => beginSupabaseEmailPasswordSignup(new Request(`${SITE}/api/auth/session`), { email: EMAIL, password: PASSWORD }, rejectedFixture.dependencies));
  check("initiator:provider-rejection-fails-closed", rejectedError instanceof SupabaseAuthFlowError && rejectedError.code === "signup_start_rejected", rejectedError instanceof Error ? rejectedError.message : "accepted");
  const missingVerifierFixture = dependencyFixture({ writeVerifier: false });
  const missingVerifierError = await capturedError(() => beginSupabaseEmailPasswordSignup(new Request(`${SITE}/api/auth/session`), { email: EMAIL, password: PASSWORD }, missingVerifierFixture.dependencies));
  check("initiator:missing-pkce-verifier-fails-closed", missingVerifierError instanceof SupabaseAuthFlowError && missingVerifierError.code === "signup_start_rejected", missingVerifierError instanceof Error ? missingVerifierError.message : "accepted");

  const replayFlow = confirmationFlow();
  const replayFixture = dependencyFixture();
  const completed = await completeSupabaseAuthCallback(callbackRequest(replayFlow.state, replayFlow.setCookie), replayFixture.dependencies);
  check("callback:valid-code-flow-finalizes-once", completed.intent === "email_confirmation" && completed.returnPath === "/en/account" && replayFixture.counters.finalize === 1 && replayFixture.counters.consume === 1, replayFixture.counters);
  const replayError = await capturedError(() => completeSupabaseAuthCallback(callbackRequest(replayFlow.state, replayFlow.setCookie), replayFixture.dependencies));
  check("callback:exact-replay-is-rejected-before-second-finalize", replayError instanceof SupabaseAuthFlowError && replayError.code === "flow_replay_rejected" && replayFixture.counters.finalize === 1, { error: replayError instanceof Error ? replayError.message : "accepted", counters: replayFixture.counters });
  const otpFlow = confirmationFlow(EMAIL, "pl");
  const otpFixture = dependencyFixture();
  const otpCompleted = await completeSupabaseAuthCallback(callbackRequest(otpFlow.state, otpFlow.setCookie, { tokenHash: "controlled-token-hash", type: "signup" }), otpFixture.dependencies);
  check("callback:signup-otp-mode-remains-intent-bound", otpCompleted.intent === "email_confirmation" && otpFixture.counters.verifyOtp === 1 && otpFixture.counters.exchange === 0 && otpFixture.counters.finalize === 1, otpFixture.counters);
  const crossAccountFlow = confirmationFlow();
  const crossAccountUser = authUser(OTHER_EMAIL, true, OTHER_USER_ID);
  const crossAccountFixture = dependencyFixture({ callbackUser: crossAccountUser, callbackSession: authSession(crossAccountUser) });
  const crossAccountError = await capturedError(() => completeSupabaseAuthCallback(callbackRequest(crossAccountFlow.state, crossAccountFlow.setCookie), crossAccountFixture.dependencies));
  check("callback:cross-account-email-is-rejected-before-consume-or-bind", crossAccountError instanceof SupabaseAuthFlowError && crossAccountError.code === "flow_identity_mismatch" && crossAccountFixture.counters.consume === 0 && crossAccountFixture.counters.finalize === 0, { error: crossAccountError instanceof Error ? crossAccountError.message : "accepted", counters: crossAccountFixture.counters });
  const unavailableFlow = confirmationFlow();
  const unavailableFixture = dependencyFixture({ consume: async () => "unavailable" });
  const unavailableError = await capturedError(() => completeSupabaseAuthCallback(callbackRequest(unavailableFlow.state, unavailableFlow.setCookie), unavailableFixture.dependencies));
  check("callback:durable-consume-unavailable-fails-closed-before-bind", unavailableError instanceof SupabaseAuthFlowError && unavailableError.code === "flow_nonce_unavailable" && unavailableFixture.counters.finalize === 0, { error: unavailableError instanceof Error ? unavailableError.message : "accepted", counters: unavailableFixture.counters });
  const missingAdapterFlow = confirmationFlow();
  const missingAdapterFixture = dependencyFixture();
  delete missingAdapterFixture.dependencies.consumeEmailConfirmationState;
  const missingAdapterError = await capturedError(() => completeSupabaseAuthCallback(callbackRequest(missingAdapterFlow.state, missingAdapterFlow.setCookie), missingAdapterFixture.dependencies));
  check("callback:missing-consume-adapter-fails-closed", missingAdapterError instanceof SupabaseAuthFlowError && missingAdapterError.code === "flow_nonce_unavailable" && missingAdapterFixture.counters.finalize === 0, missingAdapterError instanceof Error ? missingAdapterError.message : "accepted");
  const providerFailureFlow = confirmationFlow();
  const providerFailureFixture = dependencyFixture({ callbackError: true });
  const providerFailureError = await capturedError(() => completeSupabaseAuthCallback(callbackRequest(providerFailureFlow.state, providerFailureFlow.setCookie), providerFailureFixture.dependencies));
  check("callback:provider-failure-does-not-consume-or-finalize", providerFailureError instanceof SupabaseAuthFlowError && providerFailureError.code === "callback_rejected" && providerFailureFixture.counters.consume === 0 && providerFailureFixture.counters.finalize === 0, { error: providerFailureError instanceof Error ? providerFailureError.message : "accepted", counters: providerFailureFixture.counters });
  const localOnlyConsumption = await consumeSupabaseEmailConfirmationState(confirmationFlow().state);
  check("callback:runtime-memory-fallback-never-counts-as-durable-consume", localOnlyConsumption === "unavailable", localOnlyConsumption);

  const tamperFlow = confirmationFlow();
  const pair = cookiePair(tamperFlow.setCookie);
  const separator = pair.indexOf("=");
  const rawValue = decodeURIComponent(pair.slice(separator + 1));
  const tamperedValue = `${rawValue.slice(0, -1)}${rawValue.endsWith("a") ? "b" : "a"}`;
  const tamperedCookie = `${pair.slice(0, separator)}=${encodeURIComponent(tamperedValue)}`;
  check("state:tampered-signature-is-rejected", readSupabaseAuthFlowState(new Request(`${SITE}/api/auth/callback`, { headers: { cookie: tamperedCookie } })) === null);
  check("state:duplicate-cookie-is-rejected", readSupabaseAuthFlowState(new Request(`${SITE}/api/auth/callback`, { headers: { cookie: `${pair}; ${pair}` } })) === null);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiredState: SupabaseAuthFlowState = { ...tamperFlow.state, issuedAt: nowSeconds - 600, expiresAt: nowSeconds };
  const expiredCookie = buildSupabaseAuthFlowCookie(expiredState);
  check("state:expired-signed-flow-is-rejected", readSupabaseAuthFlowState(new Request(`${SITE}/api/auth/callback`, { headers: { cookie: cookiePair(expiredCookie) } })) === null);
  const offsiteState = { ...tamperFlow.state, returnPath: "https://attacker.example/collect" } as SupabaseAuthFlowState;
  const offsiteCookie = buildSupabaseAuthFlowCookie(offsiteState);
  check("state:offsite-signed-return-url-is-rejected", readSupabaseAuthFlowState(new Request(`${SITE}/api/auth/callback`, { headers: { cookie: cookiePair(offsiteCookie) } })) === null);
  const missingIdentityState = { ...tamperFlow.state };
  delete missingIdentityState.expectedIdentityFingerprint;
  const missingIdentityCookie = buildSupabaseAuthFlowCookie(missingIdentityState);
  check("state:email-confirmation-without-identity-binding-is-rejected", readSupabaseAuthFlowState(new Request(`${SITE}/api/auth/callback`, { headers: { cookie: cookiePair(missingIdentityCookie) } })) === null);
  const googleWithIdentity = { ...createSupabaseAuthFlowState({ intent: "google_oauth", locale: "en" }), expectedIdentityFingerprint: tamperFlow.state.expectedIdentityFingerprint } as SupabaseAuthFlowState;
  const googleWithIdentityCookie = buildSupabaseAuthFlowCookie(googleWithIdentity);
  check("state:identity-binding-cannot-be-confused-into-other-intents", readSupabaseAuthFlowState(new Request(`${SITE}/api/auth/callback`, { headers: { cookie: cookiePair(googleWithIdentityCookie) } })) === null);

  const stateMismatch = callbackRequest(tamperFlow.state, tamperFlow.setCookie);
  const stateMismatchUrl = new URL(stateMismatch.url);
  stateMismatchUrl.searchParams.set("state", "A".repeat(32));
  check("contract:state-tamper-is-rejected", validateSupabaseAuthCallbackContract(new Request(stateMismatchUrl), tamperFlow.state).ok === false);
  const localeMismatchUrl = new URL(stateMismatch.url);
  localeMismatchUrl.searchParams.set("locale", "de");
  check("contract:locale-tamper-is-rejected", validateSupabaseAuthCallbackContract(new Request(localeMismatchUrl), tamperFlow.state).ok === false);
  const intentMismatchUrl = new URL(stateMismatch.url);
  intentMismatchUrl.searchParams.set("intent", "google_oauth");
  check("contract:intent-tamper-is-rejected", validateSupabaseAuthCallbackContract(new Request(intentMismatchUrl), tamperFlow.state).ok === false);
  check("contract:duplicate-code-is-rejected", validateSupabaseAuthCallbackContract(callbackRequest(tamperFlow.state, tamperFlow.setCookie, { code: "one", duplicateCode: "two" }), tamperFlow.state).ok === false);
  check("contract:code-and-otp-mode-confusion-is-rejected", validateSupabaseAuthCallbackContract(callbackRequest(tamperFlow.state, tamperFlow.setCookie, { code: "one", tokenHash: "two", type: "signup" }), tamperFlow.state).ok === false);
  check("contract:cross-intent-otp-type-is-rejected", validateSupabaseAuthCallbackContract(callbackRequest(tamperFlow.state, tamperFlow.setCookie, { tokenHash: "controlled-token", type: "recovery" }), tamperFlow.state).ok === false);
  const recoveryState = createSupabaseAuthFlowState({ intent: "password_recovery", locale: "en" });
  check("contract:code-mode-cannot-cross-into-password-recovery", validateSupabaseAuthCallbackContract(callbackRequest(recoveryState, buildSupabaseAuthFlowCookie(recoveryState), { code: "controlled-code" }), recoveryState).ok === false);

  const rotationFlow = confirmationFlow();
  process.env.VELMERE_AUTH_FLOW_SECRET_PREVIOUS = "b".repeat(48);
  process.env.VELMERE_AUTH_FLOW_SECRET_CURRENT = "d".repeat(48);
  const rotatedState = readSupabaseAuthFlowState(new Request(`${SITE}/api/auth/callback`, { headers: { cookie: cookiePair(rotationFlow.setCookie) } }));
  check("state:secret-rotation-preserves-valid-in-flight-identity-binding", Boolean(rotatedState && matchesSupabaseAuthFlowExpectedIdentity(rotatedState, EMAIL)));
  process.env.VELMERE_AUTH_FLOW_SECRET_CURRENT = "b".repeat(48);
  delete process.env.VELMERE_AUTH_FLOW_SECRET_PREVIOUS;

  const flowSource = await readFile(new URL("../../lib/auth/supabase-auth-flow.ts", import.meta.url), "utf8");
  const stateSource = await readFile(new URL("../../lib/auth/supabase-auth-flow-state.ts", import.meta.url), "utf8");
  const callbackContractSource = await readFile(new URL("../../lib/security/auth-callback-contract.ts", import.meta.url), "utf8");
  const sessionRouteSource = await readFile(new URL("../../app/api/auth/session/route.ts", import.meta.url), "utf8");
  const authClientSource = await readFile(new URL("../../components/auth/AuthFormClient.tsx", import.meta.url), "utf8");
  check("source:signup-has-dedicated-pkce-flow-initiator", flowSource.includes("beginSupabaseEmailPasswordSignup"));
  check("source:customer-signup-route-uses-flow-initiator", sessionRouteSource.includes("beginSupabaseEmailPasswordSignup"));
  check("source:signup-binds-provider-email-redirect", flowSource.includes("emailRedirectTo: callbackUrl(request, draft)"));
  check("source:signed-state-binds-expected-identity", stateSource.includes("expectedIdentityFingerprint"));
  check("source:callback-checks-identity-before-session-finalization", flowSource.indexOf("matchesSupabaseAuthFlowExpectedIdentity") < flowSource.indexOf("dependencies.finalizeSession(result.data.user"));
  check("source:callback-consumes-state-before-session-finalization", flowSource.indexOf("consumeEmailConfirmationState") < flowSource.indexOf("dependencies.finalizeSession(result.data.user"));
  check("source:pkce-email-confirmation-code-callback-is-intent-bound", callbackContractSource.includes('state.intent === "google_oauth" || state.intent === "email_confirmation"'));
  check("source:customer-locale-is-sent-into-signup-flow", authClientSource.includes("locale: locale === \"pl\" || locale === \"de\" ? locale : \"en\""));
} finally {
  Object.assign(supabaseAuthFlowDependencies, dependencySnapshot);
  for (const key of Object.keys(process.env)) if (!(key in originalEnvironment)) delete process.env[key];
  Object.assign(process.env, originalEnvironment);
}

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.signup-email-confirmation-flow-boundary.v2",
  status: failed.length ? "FAIL_LOCAL_PRODUCT_DEFECT" : "PASS_LOCAL_ONLY",
  assertions: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  truth: {
    realEmailSent: false,
    externalAccountCreated: false,
    durableReplayAdapterExercised: false,
    defaultLocalMemoryAcceptedAsDurable: false,
    unconfirmedIdentityAuthenticated: false,
    stagingCredit: false,
    customerFinalCredit: false,
  },
}, null, 2));
assert.equal(failed.length, 0, `${failed.length} signup/email-confirmation boundary assertions failed`);
