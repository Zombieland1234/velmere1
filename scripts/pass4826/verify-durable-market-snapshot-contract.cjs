const assert = require("node:assert/strict");
const fs = require("node:fs");

const cache = fs.readFileSync("lib/market-integrity/market-snapshot-cache.ts", "utf8");
const routeShell = fs.readFileSync("app/api/market-integrity/[operation]/route.ts", "utf8");
const registry = fs.readFileSync("lib/server/route-registries/market-integrity.ts", "utf8");
const route = fs.readFileSync("lib/server/market-integrity-route-modules/markets.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260717000005_4826_durable_market_lkg_snapshots.sql", "utf8");
const schema = fs.readFileSync("lib/db/schema.sql", "utf8");

const checks = [
  ["durable table adapter", cache.includes('TABLE = "velmere_market_snapshots"')],
  ["service-role-only credential", cache.includes("SUPABASE_SERVICE_ROLE_KEY") && !cache.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")],
  ["bounded response", cache.includes("readJsonResponseBounded") && cache.includes("MAX_SERIALIZED_BYTES")],
  ["coherent broker transfer limits", cache.includes("DURABLE_TRANSFER_MAX_BYTES") && cache.includes("maxRequestBytes: DURABLE_TRANSFER_MAX_BYTES") && cache.includes("maxResponseBytes: DURABLE_TRANSFER_MAX_BYTES")],
  ["brokered egress", cache.includes("brokeredConfiguredOriginFetch")],
  ["canonical payload hash", cache.includes("canonicalJson") && cache.includes('createHash("sha256")')],
  ["tamper rejection", cache.includes("hashSnapshotPayload(entry) !== entry.payloadHash")],
  ["expiry and max-age gate", cache.includes("snapshotStillUsable") && cache.includes("entry.expiresAt")],
  ["row validation", cache.includes("validMarketRow") && cache.includes("MAX_ROWS = 250")],
  ["strict risk result validation", cache.includes("validTokenRiskResult") && cache.includes("validRiskSignal")],
  ["bounded durable key cardinality", cache.includes("MARKET_SNAPSHOT_MAX_PAGE = 20") && cache.includes("MARKET_SNAPSHOT_PER_PAGE_BUCKETS")],
  ["future-date rejection", cache.includes("generatedAtMs > Date.now() + 5 * 60_000")],
  ["secret redaction", cache.includes("Bearer [redacted]")],
  ["dynamic route dispatch", routeShell.includes("MARKET_INTEGRITY_ROUTES") && routeShell.includes("dispatchLazyRoute") && routeShell.includes('unknownError: "unknown_market_integrity_route"')],
  ["registry markets binding", registry.includes('"markets": { methods: ["GET"] as const, load: () => import("@/lib/server/market-integrity-route-modules/markets") }')],
  ["route durable write", route.includes("await persistMarketSnapshot")],
  ["route cold-start durable read", route.includes("await readMarketSnapshotWithDurable")],
  ["route durable abuse limit", route.includes("await applyApiRateLimit") && route.includes('keyPrefix: "market-integrity-markets"')],
  ["route exposes LKG provenance", route.includes("snapshotReadMode") && route.includes("snapshotPayloadHash")],
  ["migration RLS", migration.includes("enable row level security")],
  ["migration explicit revoke", migration.includes("revoke all on table public.velmere_market_snapshots from anon, authenticated")],
  ["migration service-role policy", migration.includes("velmere_market_snapshots_service_role_all")],
  ["migration hash constraint", migration.includes("velmere_market_snapshots_payload_hash_check")],
  ["migration bounded key and row binding", migration.includes("page between 1 and 20") && migration.includes("per_page in (10, 25, 50, 100, 250)") && migration.includes("velmere_market_snapshots_key_binding_check") && migration.includes("velmere_market_snapshots_row_count_match_check")],
  ["canonical schema synchronized", schema.includes("PASS4826: durable, service-role-only last-known-good market sweep cache")],
];

for (const [label, ok] of checks) {
  assert.equal(ok, true, label);
  console.log(`PASS ${label}`);
}
console.log(`PASS durable market LKG contract ${checks.length}/${checks.length}`);
