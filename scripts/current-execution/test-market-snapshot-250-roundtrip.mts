import assert from "node:assert/strict";
import { coinToMarketRow } from "../../lib/market-integrity/coingecko.ts";
import {
  getMarketSnapshotCacheStatus,
  persistMarketSnapshot,
  readMarketSnapshotWithDurable,
} from "../../lib/market-integrity/market-snapshot-cache.ts";
import { withPass4825BrokeredEgressTestTransport } from "../../lib/network/brokered-egress.ts";

const GLOBAL_KEY = "__velmereMarketSnapshotCachePass4826";
const original = {
  url: process.env.SUPABASE_URL,
  publicUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function clearMemory() {
  delete (globalThis as typeof globalThis & Record<string, unknown>)[GLOBAL_KEY];
}

function restore() {
  if (original.url === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = original.url;
  if (original.publicUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = original.publicUrl;
  if (original.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = original.key;
  clearMemory();
}

function buildRows(count: number, generatedAt: string) {
  return Array.from({ length: count }, (_, index) => coinToMarketRow({
    id: `current-boundary-asset-${index}`,
    symbol: `c${index}`,
    name: `Current boundary asset ${index}`,
    current_price: 100 + index,
    market_cap: 1_000_000_000 + index,
    market_cap_rank: index + 1,
    fully_diluted_valuation: 1_500_000_000 + index,
    total_volume: 100_000_000 + index,
    high_24h: 110 + index,
    low_24h: 90 + index,
    price_change_percentage_1h_in_currency: 1,
    price_change_percentage_24h_in_currency: 2,
    price_change_percentage_7d_in_currency: 3,
    price_change_percentage_14d_in_currency: 4,
    price_change_percentage_30d_in_currency: 5,
    circulating_supply: 10_000_000,
    total_supply: 20_000_000,
    max_supply: 30_000_000,
    ath: 200 + index,
    ath_change_percentage: -50,
    last_updated: generatedAt,
    sparkline_in_7d: {
      price: Array.from({ length: 400 }, (_item, point) => 100 + index + point / 100),
    },
  }));
}

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-current-execution-offline-boundary";
delete process.env.NEXT_PUBLIC_SUPABASE_URL;

try {
  clearMemory();
  const generatedAt = new Date().toISOString();
  const rows = buildRows(250, generatedAt);
  let storedRow: Record<string, unknown> | null = null;
  const write = await withPass4825BrokeredEgressTestTransport(
    async (_url, init) => {
      storedRow = JSON.parse(String(init.body)) as Record<string, unknown>;
      return new Response("", { status: 201 });
    },
    () => persistMarketSnapshot({
      page: 1,
      perPage: 250,
      rows,
      source: "current execution canonical bucket 250",
      generatedAt,
    }),
  );
  assert.equal(write.durableStored, true);
  assert.ok(storedRow);
  const serializedBytes = Buffer.byteLength(JSON.stringify([storedRow]), "utf8");
  clearMemory();
  const read = await withPass4825BrokeredEgressTestTransport(
    async () => Response.json([storedRow]),
    () => readMarketSnapshotWithDurable({ page: 1, perPage: 250 }),
  );
  const status = getMarketSnapshotCacheStatus();
  assert.equal(read?.readMode, "supabase", `cache status: ${JSON.stringify(status)}`);
  assert.equal(read.rows.length, 250);
  console.log(JSON.stringify({
    schemaVersion: "velmere.current-execution.market-snapshot-250-roundtrip.v1",
    status: "PASS_LOCAL_ONLY",
    serializedBytes,
    rows: read.rows.length,
    customerFinalCredit: false,
  }, null, 2));
} finally {
  restore();
}
