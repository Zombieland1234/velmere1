import assert from "node:assert/strict";
import {
  buildVelmereAccountId,
  hashVelmereAccountBinding,
  normalizeVelmereEmail,
  resolveRequestAccount,
  buildVelmereAccountSession,
  buildVelmereAccountCookie,
} from "../../lib/auth/account-session.ts";

async function main() {
  let assertions = 0;
  const ok = (cond: boolean, msg: string) => {
    assertions += 1;
    assert.ok(cond, msg);
  };

  console.log("=== PASS-016: AUTH, SESSION & TENANT ISOLATION SUITE ===");

  // 1. Email Normalization
  ok(normalizeVelmereEmail("Alice@Example.COM") === "alice@example.com", "Email normalization lowercases and trims");
  ok(normalizeVelmereEmail("invalid-email") === undefined, "Malformed email is rejected");
  ok(normalizeVelmereEmail("") === undefined, "Empty email is rejected");

  // 2. Deterministic & Collision-Resistant Account IDs
  const accountAlice1 = buildVelmereAccountId({ email: "alice@example.com", provider: "email" });
  const accountAlice2 = buildVelmereAccountId({ email: "alice@example.com", provider: "email" });
  const accountBob = buildVelmereAccountId({ email: "bob@example.com", provider: "email" });

  ok(accountAlice1 === accountAlice2, "Identical email must yield identical accountId");
  ok(accountAlice1 !== accountBob, "Distinct emails must yield distinct accountIds");
  ok(accountAlice1.startsWith("email:"), "Account ID preserves provider prefix");

  // 3. Cryptographic Account Binding Hash
  const hashAlice = hashVelmereAccountBinding(accountAlice1);
  const hashBob = hashVelmereAccountBinding(accountBob);
  ok(typeof hashAlice === "string" && hashAlice.length === 64, "Account binding hash is 64-char hex SHA-256");
  ok(hashAlice !== hashBob, "Account bindings for distinct tenants must never collide");

  // 4. Session Cookie Signing & Anti-Tampering
  const aliceSession = buildVelmereAccountSession({
    displayName: "Alice",
    handle: "alice",
    email: "alice@example.com",
    provider: "preview",
  });
  const aliceSessionCookie = buildVelmereAccountCookie(aliceSession).split(";")[0];
  ok(Boolean(aliceSessionCookie), "Session cookie encodes and signs successfully");

  // Request with valid Alice session cookie
  const aliceReq = new Request("http://localhost:3000/api/account/profile", {
    headers: { cookie: aliceSessionCookie },
  });
  const aliceResolved = await resolveRequestAccount(aliceReq);
  ok(aliceResolved?.accountId === aliceSession.accountId, "Valid session cookie resolves to Alice's account");
  ok(aliceResolved?.email === "alice@example.com", "Email preserved in resolved session");

  // Request with tampered session cookie (tampered signature)
  const tamperedCookie = aliceSessionCookie.slice(0, 80) + "xxxxxx" + aliceSessionCookie.slice(86);
  const tamperedReq = new Request("http://localhost:3000/api/account/profile", {
    headers: { cookie: tamperedCookie },
  });
  const tamperedResolved = await resolveRequestAccount(tamperedReq);
  ok(tamperedResolved === null, "Tampered session cookie must fail signature verification and return null");

  // 5. Anti-IDOR & Tenant Isolation Principle
  // Verifying that Alice cannot impersonate Bob by passing header claims
  const spoofedReq = new Request("http://localhost:3000/api/account/profile", {
    headers: {
      cookie: aliceSessionCookie,
      "x-velmere-account-id": accountBob,
    },
  });
  const spoofedResolved = await resolveRequestAccount(spoofedReq);
  ok(spoofedResolved?.accountId === aliceSession.accountId, "Header spoofing cannot override Alice's verified session");
  ok(spoofedResolved?.accountId !== accountBob, "Bob's account cannot be accessed by Alice via headers");

  // 6. Anonymous Request Rejection
  const anonReq = new Request("http://localhost:3000/api/account/profile");
  const anonResolved = await resolveRequestAccount(anonReq);
  ok(anonResolved === null, "Request without credentials must resolve to null");

  console.log(`PASS-016 Auth, Session & Tenant Isolation: PASS (${assertions}/${assertions} assertions)`);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

