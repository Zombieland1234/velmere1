import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";

const MAX_BODY_BYTES = 4096;
const MARKET_ID = "wbnb-usdt-bsc";
const CHAIN_ID = 56n;
const FACTORY = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73";
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const USDT = "0x55d398326f99059ff775485246999027b3197955";
const RPC_ORIGINS = [
  "https://bsc-dataseed.bnbchain.org/",
  "https://bsc-dataseed1.bnbchain.org/",
  "https://bsc-dataseed2.bnbchain.org/",
] as const;
const LOCALES = new Set(["pl", "en", "de"]);
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: HEADERS });
const lower = (value: string) => value.toLowerCase();

async function equal(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(left)));
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(right)));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index]! ^ b[index]!;
  return diff === 0;
}
async function digestText(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (item) => item.toString(16).padStart(2, "0")).join("");
}
function hexBigInt(value: unknown, label: string) {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) throw new Error(`${label}_hex_invalid`);
  return BigInt(value);
}
function addressResult(value: unknown, label: string) {
  if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/i.test(value)) throw new Error(`${label}_address_invalid`);
  const address = `0x${value.slice(-40)}`.toLowerCase();
  if (address === "0x0000000000000000000000000000000000000000") throw new Error(`${label}_address_zero`);
  return address;
}
function padAddress(address: string) { return address.slice(2).toLowerCase().padStart(64, "0"); }
function decimal(value: bigint, decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) throw new Error("token_decimals_invalid");
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(decimals, "0").slice(0, 12).replace(/0+$/, "");
  const text = fraction ? `${whole}.${fraction}` : whole.toString();
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("decimal_conversion_invalid");
  return parsed;
}
function rounded(value: number, digits: number) { return Number(value.toFixed(digits)); }

async function rpc(origin: string, method: string, params: unknown[]) {
  const response = await fetch(origin, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    redirect: "error",
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`rpc_http_${response.status}`);
  const body = await response.json() as { result?: unknown; error?: { code?: unknown } };
  if (body.error || body.result === undefined) throw new Error(`rpc_result_${String(body.error?.code ?? "missing")}`);
  return body.result;
}
async function head(origin: string) {
  const [chain, block, gas] = await Promise.all([
    rpc(origin, "eth_chainId", []),
    rpc(origin, "eth_getBlockByNumber", ["latest", false]),
    rpc(origin, "eth_gasPrice", []),
  ]);
  if (hexBigInt(chain, "chain") !== CHAIN_ID) throw new Error("chain_id_mismatch");
  if (!block || typeof block !== "object" || Array.isArray(block)) throw new Error("block_invalid");
  const row = block as Record<string, unknown>;
  return {
    origin,
    blockNumber: hexBigInt(row.number, "block_number"),
    blockTimestamp: hexBigInt(row.timestamp, "block_timestamp"),
    gasPrice: hexBigInt(gas, "gas_price"),
    gasUsed: hexBigInt(row.gasUsed, "gas_used"),
    gasLimit: hexBigInt(row.gasLimit, "gas_limit"),
    blockHash: typeof row.hash === "string" && /^0x[0-9a-f]{64}$/i.test(row.hash) ? row.hash.toLowerCase() : null,
  };
}
async function call(origin: string, to: string, data: string) {
  return await rpc(origin, "eth_call", [{ to, data }, "latest"]);
}
async function market(origin: string) {
  const pair = addressResult(await call(origin, FACTORY, `0xe6a43905${padAddress(WBNB)}${padAddress(USDT)}`), "pair");
  const [factoryCode, pairCode, token0Raw, token1Raw, decimals0Raw, decimals1Raw, reservesRaw] = await Promise.all([
    rpc(origin, "eth_getCode", [FACTORY, "latest"]),
    rpc(origin, "eth_getCode", [pair, "latest"]),
    call(origin, pair, "0x0dfe1681"),
    call(origin, pair, "0xd21220a7"),
    call(origin, addressResult(await call(origin, pair, "0x0dfe1681"), "token0_pre"), "0x313ce567"),
    call(origin, addressResult(await call(origin, pair, "0xd21220a7"), "token1_pre"), "0x313ce567"),
    call(origin, pair, "0x0902f1ac"),
  ]);
  if (typeof factoryCode !== "string" || factoryCode.length < 100 || typeof pairCode !== "string" || pairCode.length < 100) throw new Error("contract_code_missing");
  const token0 = addressResult(token0Raw, "token0");
  const token1 = addressResult(token1Raw, "token1");
  if (new Set([token0, token1]).size !== 2 || ![token0, token1].includes(WBNB) || ![token0, token1].includes(USDT)) throw new Error("pair_identity_mismatch");
  const decimals0 = Number(hexBigInt(decimals0Raw, "decimals0"));
  const decimals1 = Number(hexBigInt(decimals1Raw, "decimals1"));
  if (typeof reservesRaw !== "string" || !/^0x[0-9a-f]{192}$/i.test(reservesRaw)) throw new Error("reserves_shape_invalid");
  const raw = reservesRaw.slice(2);
  const reserve0Raw = BigInt(`0x${raw.slice(0, 64)}`);
  const reserve1Raw = BigInt(`0x${raw.slice(64, 128)}`);
  const reserveTimestamp = BigInt(`0x${raw.slice(128, 192)}`);
  if (reserve0Raw <= 0n || reserve1Raw <= 0n || reserveTimestamp <= 0n) throw new Error("reserves_empty");
  const amount0 = decimal(reserve0Raw, decimals0);
  const amount1 = decimal(reserve1Raw, decimals1);
  const baseReserve = token0 === WBNB ? amount0 : amount1;
  const quoteReserve = token0 === USDT ? amount0 : amount1;
  const price = quoteReserve / baseReserve;
  if (!Number.isFinite(price) || price <= 0 || quoteReserve <= 0 || baseReserve <= 0) throw new Error("market_math_invalid");
  return { pair, token0, token1, decimals0, decimals1, reserve0Raw: reserve0Raw.toString(), reserve1Raw: reserve1Raw.toString(), reserveTimestamp, baseReserve, quoteReserve, price, liquidityQuote: quoteReserve * 2 };
}

const copy = {
  pl: { title: "Real Markets Basic — puls WBNB/USDT", subtitle: "Darmowy, bieżący snapshot ceny, rezerw, płynności i stanu BNB Chain z quorum publicznych odczytów.", labels: ["Rynek", "Cena spot", "Płynność w USDT", "Rezerwa WBNB", "Wysokość bloku", "Wiek bloku", "Cena gazu", "Quorum RPC"], disclosure: "Dane są opisowym snapshotem on-chain i mogą zmienić się natychmiast. To nie jest oferta, gwarancja wykonania ani porada inwestycyjna." },
  en: { title: "Real Markets Basic — WBNB/USDT pulse", subtitle: "A free current snapshot of price, reserves, liquidity, and BNB Chain health from a quorum of public reads.", labels: ["Market", "Spot price", "Liquidity in USDT", "WBNB reserve", "Block height", "Block age", "Gas price", "RPC quorum"], disclosure: "This is a descriptive on-chain snapshot that can change immediately. It is not an offer, execution guarantee, or investment advice." },
  de: { title: "Real Markets Basic — WBNB/USDT-Puls", subtitle: "Kostenloser aktueller Snapshot von Preis, Reserven, Liquidität und BNB-Chain-Zustand aus einem Quorum öffentlicher Reads.", labels: ["Markt", "Spotpreis", "Liquidität in USDT", "WBNB-Reserve", "Blockhöhe", "Blockalter", "Gaspreis", "RPC-Quorum"], disclosure: "Dies ist ein beschreibender On-Chain-Snapshot und kann sich sofort ändern. Kein Angebot, keine Ausführungsgarantie und keine Anlageberatung." },
} as const;

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { ok: false, error: "method_not_allowed" });
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) return respond(413, { ok: false, error: "request_too_large" });
  let raw = "";
  try { raw = await request.text(); } catch { return respond(400, { ok: false, error: "invalid_body" }); }
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return respond(413, { ok: false, error: "request_too_large" });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return respond(400, { ok: false, error: "invalid_json" }); }
  if (Object.keys(body).some((key) => !["schemaVersion", "marketId", "locale"].includes(key))) return respond(400, { ok: false, error: "request_shape_invalid" });
  if (body.schemaVersion !== "velmere.r7.real-markets-basic-request.v1") return respond(400, { ok: false, error: "schema_invalid" });
  const marketId = typeof body.marketId === "string" ? body.marketId : "";
  const locale = typeof body.locale === "string" ? body.locale : "en";
  if (marketId !== MARKET_ID) return respond(404, { ok: false, error: "market_not_found" });
  if (!LOCALES.has(locale)) return respond(400, { ok: false, error: "locale_invalid" });

  const supplied = (request.headers.get("x-velmere-real-markets-basic-v1-server-capability") ?? "").trim();
  if (supplied.length < 48 || supplied.length > 256) return respond(403, { ok: false, error: "server_capability_missing" });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return respond(503, { ok: false, error: "server_environment_unavailable" });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const capability = await admin.rpc("velmere_r7_read_real_markets_basic_v1_server_capability_for_oidc");
  if (capability.error || typeof capability.data !== "string" || !await equal(supplied, capability.data)) return respond(403, { ok: false, error: "server_capability_invalid" });

  const headResults = await Promise.allSettled(RPC_ORIGINS.map((origin) => head(origin)));
  const heads = headResults.filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof head>>> => item.status === "fulfilled").map((item) => item.value);
  if (heads.length < 2) return respond(503, { ok: false, error: "rpc_quorum_unavailable" });
  heads.sort((a, b) => a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : 0);
  if (heads[heads.length - 1]!.blockNumber - heads[0]!.blockNumber > 3n) return respond(503, { ok: false, error: "rpc_head_divergence" });
  const selectedHead = heads[heads.length - 1]!;

  let snapshot: Awaited<ReturnType<typeof market>> | null = null;
  let selectedOrigin = selectedHead.origin;
  for (const candidate of [...heads].reverse()) {
    try { snapshot = await market(candidate.origin); selectedOrigin = candidate.origin; break; } catch { }
  }
  if (!snapshot) return respond(503, { ok: false, error: "market_snapshot_unavailable" });

  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const blockAge = Number(nowSeconds - selectedHead.blockTimestamp);
  const reserveAge = Number(selectedHead.blockTimestamp - snapshot.reserveTimestamp);
  if (blockAge < -30 || blockAge > 180 || reserveAge < -60 || reserveAge > 7200) return respond(503, { ok: false, error: "market_snapshot_stale_or_future" });
  const gasGwei = Number(selectedHead.gasPrice) / 1e9;
  const gasUtilization = Number(selectedHead.gasUsed * 10000n / selectedHead.gasLimit) / 100;
  const sourceAsOf = new Date(Number(selectedHead.blockTimestamp) * 1000).toISOString();
  const reserveAsOf = new Date(Number(snapshot.reserveTimestamp) * 1000).toISOString();
  const marketDigest = await digestText([MARKET_ID, selectedHead.blockNumber.toString(), selectedHead.blockHash ?? "", snapshot.pair, snapshot.reserve0Raw, snapshot.reserve1Raw, snapshot.reserveTimestamp.toString()].join("\n"));
  const localized = copy[locale as keyof typeof copy];
  const cards = [
    { id: "market", label: localized.labels[0], value: "WBNB / USDT · BNB Chain", state: "VERIFIED_ON_CHAIN" },
    { id: "spot-price", label: localized.labels[1], value: rounded(snapshot.price, 6), unit: "USDT per WBNB", state: "CURRENT" },
    { id: "liquidity", label: localized.labels[2], value: rounded(snapshot.liquidityQuote, 2), unit: "USDT", state: "DERIVED" },
    { id: "base-reserve", label: localized.labels[3], value: rounded(snapshot.baseReserve, 6), unit: "WBNB", state: "ON_CHAIN" },
    { id: "block-height", label: localized.labels[4], value: selectedHead.blockNumber.toString(), state: "QUORUM_BOUND" },
    { id: "block-age", label: localized.labels[5], value: blockAge, unit: "seconds", state: "CURRENT" },
    { id: "gas-price", label: localized.labels[6], value: rounded(gasGwei, 4), unit: "gwei", state: "CURRENT" },
    { id: "rpc-quorum", label: localized.labels[7], value: `${heads.length}/${RPC_ORIGINS.length}`, state: "PASS" },
  ];

  return respond(200, {
    ok: true,
    schemaVersion: "velmere.r7.real-markets-basic-customer-pulse.v1",
    productSlug: "real-markets-basic",
    productOrdinal: 13,
    tier: "basic",
    freeBasic: true,
    paidValueCredit: false,
    customerVisible: true,
    productContract: "DIRECT_CHAIN_WBNB_USDT_MARKET_PULSE_FREE_BASIC",
    locale,
    title: localized.title,
    subtitle: localized.subtitle,
    cards,
    structuredPayload: {
      marketId: MARKET_ID,
      chainId: Number(CHAIN_ID),
      factoryAddress: FACTORY,
      pairAddress: snapshot.pair,
      baseTokenAddress: WBNB,
      quoteTokenAddress: USDT,
      token0: snapshot.token0,
      token1: snapshot.token1,
      spotPriceQuotePerBase: rounded(snapshot.price, 10),
      baseReserve: rounded(snapshot.baseReserve, 10),
      quoteReserve: rounded(snapshot.quoteReserve, 4),
      liquidityQuote: rounded(snapshot.liquidityQuote, 4),
      blockNumber: selectedHead.blockNumber.toString(),
      blockHash: selectedHead.blockHash,
      sourceAsOf,
      reserveAsOf,
      blockAgeSeconds: blockAge,
      reserveAgeSeconds: reserveAge,
      gasPriceGwei: rounded(gasGwei, 6),
      gasUtilizationPercent: rounded(gasUtilization, 2),
      rpcQuorum: { configured: RPC_ORIGINS.length, passed: heads.length, maxBlockDivergence: Number(heads[heads.length - 1]!.blockNumber - heads[0]!.blockNumber), selectedOriginIndex: RPC_ORIGINS.indexOf(selectedOrigin as typeof RPC_ORIGINS[number]) },
      marketDigest: `sha256:${marketDigest}`,
    },
    currentness: { state: "CURRENT", sourceAsOf, reserveAsOf, maxBlockAgeSeconds: 180, maxReserveAgeSeconds: 7200 },
    rights: { sourceClass: "PUBLIC_BLOCKCHAIN_FACTS", customerDisplayRightsBasis: "FIRST_PARTY_DERIVATION_FROM_PUBLIC_BLOCKCHAIN_FACTS", rawProviderPayloadReturned: false, externalProviderRedistributionClaimed: false, providerLogosUsed: false },
    uncertaintyDisclosure: localized.disclosure,
    serviceRoleReturned: false,
    rawCapabilityReturned: false,
    truthBoundary: "Real Markets Basic is a free current on-chain market pulse for one bounded market. It is not a historical monitor, execution venue, price guarantee, personalized advice, or paid automation. Pro and Advanced must add materially stronger history, monitoring, correlation, and team workflows without degrading Basic.",
  });
});
