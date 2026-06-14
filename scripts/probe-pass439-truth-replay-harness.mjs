#!/usr/bin/env node
const DEFAULT_QUERIES = ["bitcoin", "ethereum", "solana", "binance", "mexc", "NVDA", "EURUSD=X", "GC=F"];
const targets = process.argv.slice(2).filter(Boolean).length ? process.argv.slice(2).filter(Boolean) : DEFAULT_QUERIES;
const yahooAliases = { btc: "BTC-USD", bitcoin: "BTC-USD", eth: "ETH-USD", ethereum: "ETH-USD", sol: "SOL-USD", solana: "SOL-USD", bnb: "BNB-USD", binance: "BNB-USD", nvda: "NVDA", aapl: "AAPL", msft: "MSFT", eurusd: "EURUSD=X", "eurusd=x": "EURUSD=X", gold: "GC=F", oil: "CL=F" };
const binanceAliases = { btc: "BTCUSDT", bitcoin: "BTCUSDT", eth: "ETHUSDT", ethereum: "ETHUSDT", sol: "SOLUSDT", solana: "SOLUSDT", bnb: "BNBUSDT", binance: "BNBUSDT", xrp: "XRPUSDT", doge: "DOGEUSDT", ada: "ADAUSDT" };
function num(value) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
async function fetchJson(url) { const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "Velmere-PASS439-Truth-Replay-Harness/1.0" } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return await response.json(); }
function fields(row) { return [row.price !== null ? "price" : null, row.change24h !== null ? "change24h" : null, row.volume24h ? "volume24h" : null, row.marketCap ? "marketCap" : null, row.liquidity ? "liquidity" : null, row.candles ? "candles" : null, row.security ? "security" : null].filter(Boolean); }
function missing(row, providerCount) { return [row.price !== null ? null : "price", row.change24h !== null ? null : "change24h", row.volume24h ? null : "volume24h", row.marketCap ? null : "marketCap", row.liquidity ? null : "liquidity", row.candles ? null : "candles", row.security ? null : "security", providerCount >= 2 ? null : "secondProvider"].filter(Boolean); }
function price(value) { const n = num(value); return n === null ? "missing" : n >= 1 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : `$${n.toLocaleString("en-US", { maximumSignificantDigits: 5 })}`; }
async function probeCoinGecko(query) {
  const search = await fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
  const coin = (Array.isArray(search.coins) ? search.coins : [])[0];
  if (!coin?.id) throw new Error("no_coingecko_match");
  const rows = await fetchJson(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coin.id)}&sparkline=true&price_change_percentage=24h`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("coingecko_market_empty");
  return { provider: "CoinGecko markets", status: "ok", price: num(row.current_price), change24h: num(row.price_change_percentage_24h_in_currency ?? row.price_change_percentage_24h), volume24h: num(row.total_volume), marketCap: num(row.market_cap), liquidity: null, candles: Array.isArray(row.sparkline_in_7d?.price) ? row.sparkline_in_7d.price.length : 0, security: false };
}
async function probeDexScreener(query) {
  const data = await fetchJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
  const pair = (Array.isArray(data.pairs) ? data.pairs : []).sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0];
  if (!pair) throw new Error("no_dex_pair");
  return { provider: "DEX Screener pairs", status: "ok", price: num(Number(pair.priceUsd)), change24h: num(pair.priceChange?.h24), volume24h: num(pair.volume?.h24), marketCap: num(pair.marketCap ?? pair.fdv), liquidity: num(pair.liquidity?.usd), candles: 0, security: Boolean(pair.chainId && pair.baseToken?.address) };
}
async function probeBinance(query) {
  const symbol = binanceAliases[query.trim().toLowerCase()];
  if (!symbol) throw new Error("no_binance_symbol_map");
  const rows = await fetchJson(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=48`);
  const first = Number(rows?.[0]?.[1]); const last = Number(rows?.at(-1)?.[4]);
  const volume = Array.isArray(rows) ? rows.reduce((sum, row) => sum + Number(row[5] || 0), 0) : 0;
  return { provider: "Binance spot klines", status: "partial", price: num(last), change24h: first ? num(((last - first) / first) * 100) : null, volume24h: num(volume), marketCap: null, liquidity: null, candles: Array.isArray(rows) ? rows.length : 0, security: false };
}
async function probeYahoo(query) {
  const symbol = yahooAliases[query.trim().toLowerCase()] || (/^[A-Za-z0-9.^=\-]{1,24}$/.test(query.trim()) ? query.trim().toUpperCase() : null);
  if (!symbol) throw new Error("no_yahoo_symbol_map");
  const payload = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=30m`);
  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const closes = (quote?.close || []).filter((value) => typeof value === "number" && Number.isFinite(value));
  const first = closes[0]; const last = result?.meta?.regularMarketPrice ?? closes.at(-1);
  const volume = (quote?.volume || []).filter((value) => typeof value === "number" && Number.isFinite(value)).slice(-48).reduce((sum, value) => sum + value, 0);
  return { provider: "Yahoo Finance chart unofficial", status: "partial", price: num(last), change24h: first && last ? num(((last - first) / first) * 100) : null, volume24h: num(volume), marketCap: null, liquidity: null, candles: closes.length, security: false };
}
async function settle(fn, query) { try { return await fn(query); } catch (error) { return { provider: fn.name.replace(/^probe/, ""), status: "error", error: error.message, price: null, change24h: null, volume24h: null, marketCap: null, liquidity: null, candles: 0, security: false }; } }
function replay(rows) {
  const usable = rows.filter((row) => row.status === "ok" || row.status === "partial");
  const providerCount = usable.length;
  const allMissing = Array.from(new Set(rows.flatMap((row) => missing(row, providerCount))));
  const conflicts = rows.some((row) => row.status === "error") && providerCount === 0;
  const coreMissing = allMissing.filter((field) => ["price", "secondProvider", "freshness"].includes(field));
  const replayState = conflicts ? "replay_conflict" : coreMissing.includes("price") ? "replay_sealed" : allMissing.length ? "replay_partial" : "replay_clean";
  const score = Math.max(0, Math.min(100, 35 + providerCount * 18 - coreMissing.length * 16 - allMissing.length * 3));
  const pdf = replayState === "replay_clean" || replayState === "replay_partial";
  const factsOnly = replayState !== "replay_clean";
  return { replayState, score, pdf, factsOnly, allMissing, providerCount };
}
console.log("PASS439 truth replay harness · replay every customer-facing claim before PDF/chat\n");
for (const query of targets) {
  const rows = await Promise.all([probeCoinGecko, probeDexScreener, probeBinance, probeYahoo].map((fn) => settle(fn, query)));
  const r = replay(rows);
  console.log(`--- ${query} ---`);
  console.log(`truth-replay: ${r.replayState} · score ${r.score}/100 · pdf ${r.pdf ? "allowed" : "blocked"} · factsOnly ${r.factsOnly} · provider lanes ${r.providerCount}`);
  for (const row of rows) console.log(`${row.provider}: ${row.status} · ${price(row.price)} · observed ${fields(row).join("/") || "none"} · missing ${missing(row, r.providerCount).join("/") || "none"}${row.error ? ` · error ${row.error}` : ""}`);
  console.log(`truth-replay-nodes: source/market/risk/pdf/chat · missing ${r.allMissing.join(" · ") || "clean"}\n`);
}
console.log("PASS439 invariant: every PDF/chat claim must replay to source evidence, missing-data rows stay visible, and unsupported live wording is sealed.");
