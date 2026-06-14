#!/usr/bin/env node
const DEFAULT_QUERIES = ["bitcoin", "ethereum", "solana", "binance", "mexc", "NVDA", "EURUSD=X", "GC=F"];
const targets = process.argv.slice(2).filter(Boolean).length ? process.argv.slice(2).filter(Boolean) : DEFAULT_QUERIES;
const yahooAliases = { btc: "BTC-USD", bitcoin: "BTC-USD", eth: "ETH-USD", ethereum: "ETH-USD", sol: "SOL-USD", solana: "SOL-USD", bnb: "BNB-USD", binance: "BNB-USD", nvda: "NVDA", aapl: "AAPL", msft: "MSFT", eurusd: "EURUSD=X", "eurusd=x": "EURUSD=X", gold: "GC=F", oil: "CL=F" };
const binanceAliases = { btc: "BTCUSDT", bitcoin: "BTCUSDT", eth: "ETHUSDT", ethereum: "ETHUSDT", sol: "SOLUSDT", solana: "SOLUSDT", bnb: "BNBUSDT", binance: "BNBUSDT", xrp: "XRPUSDT", doge: "DOGEUSDT", ada: "ADAUSDT" };
function num(value) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function price(value) { const n = num(value); if (n === null) return "missing"; if (n >= 1000) return `$${Math.round(n).toLocaleString("en-US")}`; if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`; return `$${n.toLocaleString("en-US", { maximumSignificantDigits: 5 })}`; }
function pct(value) { const n = num(value); return n === null ? "missing" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`; }
async function fetchJson(url) { const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "Velmere-PASS435-Live-Query-TestBench/1.0" } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return await response.json(); }
function coverage(row) { return Math.round([row.price, row.change24h, row.volume24h, row.marketCap, row.liquidity, row.candles, row.security].filter(Boolean).length / 7 * 100); }
function missing(row) { return [row.price ? null : "price", row.change24h === null || row.change24h === undefined ? "24h change" : null, row.volume24h ? null : "24h volume", row.marketCap ? null : "market cap", row.liquidity ? null : "liquidity", row.candles ? null : "candles", row.security ? null : "security flags"].filter(Boolean); }
async function probeCoinGecko(query) {
  const search = await fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
  const coins = Array.isArray(search.coins) ? search.coins : [];
  const clean = query.toLowerCase();
  const exact = coins.find((coin) => [coin.id, coin.symbol, coin.name].some((value) => String(value || "").toLowerCase() === clean));
  const coin = exact || coins[0];
  if (!coin?.id) throw new Error("no_coingecko_match");
  const params = new URLSearchParams({ vs_currency: "usd", ids: coin.id, order: "market_cap_desc", per_page: "1", page: "1", sparkline: "true", price_change_percentage: "1h,24h,7d,14d,30d", locale: "en" });
  const rows = await fetchJson(`https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("coingecko_market_empty");
  return { provider: "CoinGecko markets", family: "crypto_market", status: "ok", symbol: String(row.symbol || "").toUpperCase(), name: row.name, price: num(row.current_price), change24h: num(row.price_change_percentage_24h_in_currency ?? row.price_change_percentage_24h), volume24h: num(row.total_volume), marketCap: num(row.market_cap), liquidity: null, candles: Array.isArray(row.sparkline_in_7d?.price) ? row.sparkline_in_7d.price.length : 0, security: false };
}
async function probeDexScreener(query) {
  const data = await fetchJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
  const pairs = (Array.isArray(data.pairs) ? data.pairs : []).filter((pair) => pair?.baseToken?.symbol || pair?.baseToken?.name).sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0));
  const pair = pairs[0];
  if (!pair) throw new Error("no_dex_pair");
  return { provider: "DEX Screener pairs", family: "dex_liquidity", status: "ok", symbol: String(pair.baseToken?.symbol || "UNKNOWN").toUpperCase(), name: pair.baseToken?.name || pair.baseToken?.symbol || "Unknown token", price: num(Number(pair.priceUsd)), change24h: num(pair.priceChange?.h24), volume24h: num(pair.volume?.h24), marketCap: num(pair.marketCap ?? pair.fdv), liquidity: num(pair.liquidity?.usd), candles: 0, security: Boolean(pair.chainId && pair.baseToken?.address), pair: `${pair.chainId || "chain?"}/${pair.dexId || "dex?"}` };
}
async function probeBinanceKlines(query) {
  const symbol = binanceAliases[query.trim().toLowerCase()];
  if (!symbol) throw new Error("no_binance_symbol_map");
  const rows = await fetchJson(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=48`);
  if (!Array.isArray(rows) || rows.length < 2) throw new Error("binance_klines_empty");
  const first = Number(rows[0][1]);
  const last = Number(rows.at(-1)[4]);
  const volume = rows.reduce((sum, row) => sum + Number(row[5] || 0), 0);
  const change = first ? ((last - first) / first) * 100 : null;
  return { provider: "Binance spot klines", family: "crypto_market", status: "partial", symbol, name: symbol, price: num(last), change24h: num(change), volume24h: num(volume), marketCap: null, liquidity: null, candles: rows.length, security: false };
}
async function probeYahoo(query) {
  const clean = query.trim().toLowerCase();
  let found = yahooAliases[clean] || (/^[A-Za-z0-9.^=\-]{1,24}$/.test(query.trim()) ? query.trim().toUpperCase() : null);
  if (!found) {
    const search = await fetchJson(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0&enableFuzzyQuery=true`);
    found = search?.quotes?.[0]?.symbol;
  }
  if (!found) throw new Error("no_yahoo_match");
  const chart = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(found)}?range=5d&interval=30m&includePrePost=false&events=div%2Csplits`);
  const result = chart.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const closes = (quote?.close || []).filter((value) => typeof value === "number" && Number.isFinite(value));
  const first = closes[0] ?? null;
  const last = result?.meta?.regularMarketPrice ?? closes.at(-1) ?? null;
  const change = first && last ? ((last - first) / first) * 100 : null;
  const volume = (quote?.volume || []).filter((value) => typeof value === "number" && Number.isFinite(value)).slice(-48).reduce((sum, value) => sum + value, 0);
  return { provider: "Yahoo Finance chart unofficial", family: "real_market", status: "partial", symbol: found, name: result?.meta?.shortName || found, price: num(last), change24h: num(change), volume24h: num(volume), marketCap: null, liquidity: null, candles: closes.length, security: false };
}
async function settle(provider, query) { try { const row = await provider(query); return { ...row, coverage: coverage(row), missing: missing(row) }; } catch (error) { return { provider: provider.name.replace(/^probe/, ""), status: "error", error: error.message, coverage: 0, missing: ["provider"] }; } }
function divergence(rows) { const prices = rows.map((row) => row.price).filter((value) => typeof value === "number" && Number.isFinite(value)); if (prices.length < 2) return null; const min = Math.min(...prices), max = Math.max(...prices); return min > 0 ? ((max - min) / min) * 100 : null; }
function gate(rows) { const ok = rows.filter((row) => row.status === "ok" || row.status === "partial"); const div = divergence(ok); const missingAll = Array.from(new Set(rows.flatMap((row) => row.missing || []))); const hasPrice = ok.some((row) => typeof row.price === "number"); if (div !== null && div > 8) return ["operator_review", div, missingAll]; if (ok.length >= 2 && hasPrice && !missingAll.includes("price")) return ["release_with_missing_data", div, missingAll]; if (ok.length === 1 && hasPrice) return ["facts_only", div, missingAll]; return ["sealed_no_fake_live", div, missingAll]; }
console.log("PASS436 world brain SLO graph · provider reality before PDF/chat\n");
for (const query of targets) {
  const rows = await Promise.all([probeCoinGecko, probeDexScreener, probeBinanceKlines, probeYahoo].map((provider) => settle(provider, query)));
  const [answerGate, div, missingAll] = gate(rows);
  console.log(`--- ${query} ---`);
  console.log(`release mode: ${answerGate}${div !== null ? ` · price divergence ${div.toFixed(2)}%` : ""}`);
  for (const row of rows) console.log(`${row.provider}: ${row.status} · ${row.symbol || "?"} · ${price(row.price)} · 24h ${pct(row.change24h)} · coverage ${row.coverage}/100 · missing ${(row.missing || []).join("/") || "none"}${row.error ? ` · error ${row.error}` : ""}`);
  console.log(`missing-data replay: ${missingAll.join(" · ") || "none"}`);
  console.log("");
}

console.log("PASS436 invariant: observe-normalize-arbitrate-verify-narrate-escalate graph, schema-locked answer, one payload, no fake-live, human interrupt when evidence is weak.");
