import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  legacyVelmereClientAuthStorageKeys,
  purgeLegacyVelmereClientAuthCache,
  resolveVelmereClientAuthState,
} from "../../lib/auth/client-auth-state";
import {
  buildVelmereAccountCookie,
  buildVelmereAccountSession,
  resolveRequestAccount,
} from "../../lib/auth/account-session";

const ROOT = process.cwd();
let assertions = 0;
function check(condition: unknown, message: string) {
  assertions += 1;
  assert.ok(condition, message);
}

function cookiePair(setCookie: string) {
  return setCookie.split(";", 1)[0] ?? "";
}

async function main() {
  const validProfile = {
    displayName: "Velmère Member",
    accountId: "preview:member",
    provider: "preview",
  };
  const authenticated = resolveVelmereClientAuthState({ status: "authenticated", profile: validProfile });
  check(authenticated.authenticated === true, "server-authenticated profile must unlock the client view");
  check(authenticated.profile?.sessionSource === "server", "client view must mark the server as the only auth authority");
  check(resolveVelmereClientAuthState({ status: "unauthenticated" }).authenticated === false, "server unauthenticated must remain closed");
  check(resolveVelmereClientAuthState({ status: "unavailable" }).authenticated === false, "server outage must remain closed");
  check(resolveVelmereClientAuthState({ status: "authenticated", profile: { displayName: "\u0000\n" } }).authenticated === false, "invalid profile must fail closed");

  const removed: string[] = [];
  purgeLegacyVelmereClientAuthCache({ removeItem: (key: string) => { removed.push(key); } } as Storage);
  check(JSON.stringify(removed) === JSON.stringify(legacyVelmereClientAuthStorageKeys()), "legacy auth cache purge must cover the exact historical keys");

  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  process.env.NODE_ENV = "test";
  process.env.VERCEL_ENV = "preview";
  try {
    const spoofed = await resolveRequestAccount(new Request("https://preview.velmere.test/api/profile", {
      headers: {
        "x-velmere-preview-session": "active",
        "x-velmere-account-id": "victim-account",
        "x-velmere-account-email": "victim@example.com",
      },
    }));
    check(spoofed === null, "unsigned preview/account headers must never authenticate a request");

    const session = buildVelmereAccountSession({ provider: "preview", displayName: "Velmère Preview" });
    const signedCookie = cookiePair(buildVelmereAccountCookie(session));
    const signed = await resolveRequestAccount(new Request("https://preview.velmere.test/api/profile", {
      headers: { cookie: signedCookie },
    }));
    check(signed?.accountId === session.accountId, "signed server-issued preview cookie must work outside production");
    check(signed?.sessionSource === "cookie", "signed preview identity must resolve from the cookie boundary");

    const tamperedCookie = signedCookie.replace(/.$/u, signedCookie.endsWith("a") ? "b" : "a");
    const tampered = await resolveRequestAccount(new Request("https://preview.velmere.test/api/profile", {
      headers: { cookie: tamperedCookie },
    }));
    check(tampered === null, "tampered preview cookie must be rejected");

    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    const productionPreview = await resolveRequestAccount(new Request("https://velmere.test/api/profile", {
      headers: { cookie: signedCookie },
    }));
    check(productionPreview === null, "preview cookie without a verified session family must not authenticate production");
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalVercelEnv;
  }

  const clientFiles = [
    "components/auth/AuthGate.tsx",
    "components/auth/AuthFormClient.tsx",
    "components/dashboard/DashboardClient.tsx",
    "components/account/AuditAccountMessagesClient.tsx",
    "components/square/VelmereSquareClient.tsx",
    "lib/hooks/useProfile.ts",
    "lib/hooks/useSquarePosts.ts",
  ];
  const clientSource = clientFiles.map((file) => fs.readFileSync(path.join(ROOT, file), "utf8")).join("\n");
  check(!clientSource.includes("x-velmere-preview-session"), "browser clients must not emit preview-session authority headers");
  check(!clientSource.includes("x-velmere-account-id"), "browser clients must not emit account identity authority headers");
  check(!clientSource.includes('getItem("velmere:account-session")'), "browser auth must not read localStorage as authority");
  check(!clientSource.includes('getItem("velmere:account-profile")'), "browser auth must not read cached profile as authority");
  check(!clientSource.includes('setItem("velmere:account-session"'), "browser auth must not write a local authentication flag");
  check(!clientSource.includes('setItem("velmere:account-profile"'), "browser auth must not persist account PII as auth cache");

  const accountSessionSource = fs.readFileSync(path.join(ROOT, "lib/auth/account-session.ts"), "utf8");
  check(!accountSessionSource.includes('request.headers.get("x-velmere-preview-session")'), "server account resolver must not accept the unsigned preview header");
  const dashboardSource = fs.readFileSync(path.join(ROOT, "components/dashboard/DashboardClient.tsx"), "utf8");
  check(dashboardSource.includes("deleteVelmereAccountSession"), "dashboard logout must call the server session revocation route");
  const authGateSource = fs.readFileSync(path.join(ROOT, "components/auth/AuthGate.tsx"), "utf8");
  check(authGateSource.includes('status: "unavailable"'), "auth service failure must have an explicit fail-closed state");
  check(!authGateSource.includes("syncLocal"), "auth hook must not fall back to a local authority");

  console.log(JSON.stringify({
    status: "PASS_A102R4_CLIENT_AUTH_PREVIEW_HEADER_LOCAL_STORAGE_FAIL_CLOSED",
    assertions,
    unsignedPreviewHeaderAccepted: false,
    localStorageAuthAuthority: false,
    serverLogoutRequired: true,
    signedPreviewCookieOutsideProduction: true,
    productionPreviewCookieAccepted: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
