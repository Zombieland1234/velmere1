import assert from "node:assert/strict";
import { coinToMarketRow } from "../../lib/market-integrity/coingecko";
import {
  persistMarketSnapshot,
  readMarketSnapshotWithDurable,
} from "../../lib/market-integrity/market-snapshot-cache";
import { withPass4825BrokeredEgressTestTransport } from "../../lib/network/brokered-egress";

const GLOBAL_KEY = "__velmereMarketSnapshotCachePass4826";
const original = {
  url: process.env.SUPABASE_URL,
  publicUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function clearMemory() {
  delete (globalThis as typeof globalThis & Record<string, unknown>)[GLOBAL_KEY];
}

function restoreEnvironment() {
  if (original.url === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = original.url;
  if (original.publicUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = original.publicUrl;
  if (original.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = original.key;
  clearMemory();
}

function rows(count: number, generatedAt: string) {
  return Array.from({ length: count }, (_, index) => coinToMarketRow({
    id: `broker-boundary-asset-${index}`,
    symbol: `b${index}`,
    name: `Broker boundary asset ${index}`,
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

async function verifyBoundary(perPage: 100 | 250) {
  clearMemory();
  const generatedAt = new Date().toISOString();
  const marketRows = rows(perPage, generatedAt);
  let storedRow: Record<string, unknown> | null = null;
  let writeCalls = 0;
  let writePolicyBytes = 0;

  const writeReceipt = await withPass4825BrokeredEgressTestTransport(
    async (_url, init, context) => {
      writeCalls += 1;
      writePolicyBytes = context.maxRequestBytes;
      assert.equal(init.method, "POST");
      storedRow = JSON.parse(String(init.body)) as Record<string, unknown>;
      return new Response("", { status: 201 });
    },
    () => persistMarketSnapshot({
      page: 1,
      perPage,
      rows: marketRows,
      source: `PASS4826 real broker boundary ${perPage}`,
      generatedAt,
    }),
  );

  assert.equal(writeReceipt.durableStored, true, `${perPage}: durable write must cross the real broker policy`);
  assert.equal(writeReceipt.mode, "memory_and_supabase");
  assert.equal(writeCalls, 1);
  assert.ok(storedRow);
  const bodyBytes = Buffer.byteLength(JSON.stringify(storedRow), "utf8");
  assert.ok(bodyBytes > 1_048_576, `${perPage}: fixture must regress the former 1 MiB broker mismatch`);
  assert.ok(writePolicyBytes >= bodyBytes, `${perPage}: broker request policy must cover the accepted body`);

  clearMemory();
  let readCalls = 0;
  let readPolicyBytes = 0;
  const read = await withPass4825BrokeredEgressTestTransport(
    async (_url, init, context) => {
      readCalls += 1;
      readPolicyBytes = context.maxResponseBytes;
      assert.equal(init.method ?? "GET", "GET");
      return Response.json([storedRow]);
    },
    () => readMarketSnapshotWithDurable({ page: 1, perPage }),
  );
  assert.equal(readCalls, 1);
  assert.equal(read?.readMode, "supabase");
  assert.equal(read?.rows.length, perPage);
  assert.ok(readPolicyBytes >= Buffer.byteLength(JSON.stringify([storedRow]), "utf8"));

  return { perPage, bodyBytes, writePolicyBytes, readPolicyBytes };
}

async function main() {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-pass4826-offline-boundary";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    const receipts = [await verifyBoundary(100), await verifyBoundary(250)];
    console.log(JSON.stringify({
      ok: true,
      schemaVersion: "velmere.pass4826.durable-market-broker-boundary.v1",
      receipts,
      externalCalls: 0,
    }, null, 2));
  } finally {
    restoreEnvironment();
  }
}

main().catch((error) => {
  restoreEnvironment();
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
