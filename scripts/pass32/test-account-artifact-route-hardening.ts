import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GET as getRouteHealth } from "../../lib/server/lazy-route-modules/security--audit-watch--route-health.js";
import { GET as getDeliveryReceipt } from "../../lib/server/lazy-route-modules/security--audit-watch--delivery-receipt.js";
import { GET as getSupportHandoff } from "../../lib/server/lazy-route-modules/security--audit-watch--support-handoff.js";

const cwd = process.cwd();

function source(path: string) {
  return readFileSync(`${cwd}/${path}`, "utf8");
}

const routes = [
  ["route-health", getRouteHealth, "http://velmere.local/api/security/audit-watch/route-health?id=foreign"],
  ["delivery-receipt", getDeliveryReceipt, "http://velmere.local/api/security/audit-watch/delivery-receipt?receiptId=foreign"],
  ["support-handoff", getSupportHandoff, "http://velmere.local/api/security/audit-watch/support-handoff?receiptId=foreign"],
] as const;

for (const [name, handler, url] of routes) {
  const response = await handler(new Request(url));
  assert.equal(response.status, 401, `${name} must reject a request without an account session`);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  assert.equal((await response.json() as { error?: string }).error, "account_session_required");
}

const routeHealth = source("lib/server/lazy-route-modules/security--audit-watch--route-health.ts");
assert.match(routeHealth, /accountId:\s*account\.accountId/);
assert.match(routeHealth, /recordPing:\s*false/);
assert.match(routeHealth, /recordEvent:\s*false/);

const supportHandoff = source("lib/server/lazy-route-modules/security--audit-watch--support-handoff.ts");
assert.match(supportHandoff, /timingSafeEqual/);
assert.match(supportHandoff, /accountId:\s*account\.accountId/);
assert.match(supportHandoff, /const accessState = packet\.ok/);
assert.doesNotMatch(supportHandoff, /searchParams\.get\(["']accessState["']\)/);
assert.match(supportHandoff, /recordEvent:\s*false/);

const deliveryReceipt = source("lib/server/lazy-route-modules/security--audit-watch--delivery-receipt.ts");
assert.match(deliveryReceipt, /accountId:\s*account\.accountId/);
assert.match(deliveryReceipt, /operatorId:\s*_operatorId/);

const routeHealthLedger = source("lib/security/route-health-ledger.ts");
assert.match(routeHealthLedger, /input\.recordPing === true/);

const supportLedger = source("lib/security/support-handoff-event-ledger.ts");
assert.match(supportLedger, /support_handoff_authenticated_actor_required/);

for (const page of [
  "app/[locale]/security/audits/delivery-receipt/[receiptId]/page.tsx",
  "app/[locale]/security/audits/support-handoff/[receiptId]/page.tsx",
]) {
  const pageSource = source(page);
  assert.match(pageSource, /resolveRequestAccount/);
  assert.match(pageSource, /accountId:\s*account\.accountId/);
  assert.match(pageSource, /notFound\(\)/);
}

console.log("PASS account artifact GET routes require an authenticated owner binding");
console.log("PASS account artifact GET routes are read-only and private-cache safe");
console.log("PASS client-controlled gate fields cannot promote support access");
