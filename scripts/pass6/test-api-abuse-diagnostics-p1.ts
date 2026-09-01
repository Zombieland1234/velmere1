import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getExpensiveRouteBudgetSnapshot } from "../../lib/security/expensive-route-concurrency-budget";
import { readCurrentConsolidatedRoute } from "../lib/current-route-contract";

const root = process.cwd();
const read = (relative: string) => readFile(`${root}/${relative}`, "utf8");

async function main() {
  const chat = readCurrentConsolidatedRoute("/api/market-integrity/chat").handlerSource;
  const brandIcon = readCurrentConsolidatedRoute("/api/market-integrity/brand-icon").handlerSource;
  const [contact, gateway] = await Promise.all([
    read("app/api/contact/message/route.ts"),
    read("lib/market-integrity/angel-provider-gateway.ts"),
  ]);

  assert.ok(chat.indexOf("const abuseShield = await applyApiAbuseShield") < chat.indexOf("const marketRow = await searchCoinGeckoMarket"));
  assert.match(chat, /resolveRequestAccount\(request\)/);
  assert.match(chat, /velmere-market-chat-provider-cost/);
  assert.match(chat, /cost:\s*4/);
  assert.match(chat, /withExpensiveRouteBudget\(request,\s*"market_chat_get"/);
  assert.match(chat, /cache-control",\s*"private, no-store"/);

  assert.ok(brandIcon.indexOf("const shield = await applyApiAbuseShield") < brandIcon.indexOf("const icon = await fetchBrandIcon(domain)"));
  assert.match(brandIcon, /providerId:\s*"brand-icon-egress"/);

  assert.ok(contact.indexOf("const trustedClient = requireTrustedRateLimitClient") < contact.indexOf("const rateLimit = await applyDurableRateLimit"));
  assert.doesNotMatch(contact, /request\.headers\.get\("x-forwarded-for"\)/);
  assert.doesNotMatch(contact, /request\.headers\.get\("x-real-ip"\)/);

  const publicDiagnostics = gateway.slice(gateway.lastIndexOf("providerDiagnostics:"));
  assert.match(publicDiagnostics, /providerClass:/);
  assert.match(publicDiagnostics, /errorCode,/);
  assert.match(publicDiagnostics, /correlationId,/);
  assert.doesNotMatch(publicDiagnostics, /baseUrl:/);
  assert.doesNotMatch(publicDiagnostics, /error,/);

  const capacity = getExpensiveRouteBudgetSnapshot().market_chat_get;
  assert.equal(capacity.maxActive, 3);
  assert.equal(capacity.maxQueue, 8);
  assert.equal(capacity.active, 0);

  console.log(JSON.stringify({
    gate: "PASS6_API_ABUSE_DIAGNOSTICS_P1",
    status: "PASS",
    assertions: 20,
    liveCalls: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
