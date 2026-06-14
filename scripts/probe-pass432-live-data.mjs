#!/usr/bin/env node
const DEFAULT_QUERIES = ["bitcoin", "ethereum", "solana", "binance", "mexc", "NVDA", "EURUSD=X"];
const queries = process.argv.slice(2).filter(Boolean);
const targets = queries.length ? queries : DEFAULT_QUERIES;

function jsonLine(label, value) {
  console.log(`${label}: ${value}`);
}

function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function price(value) {
  const n = num(value);
  if (n === null) return "missing";
  if (n >= 1000) return `$${Math.round(n).toLocaleString("en-US")}`;
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toLocaleString("en-US", { maximumSignificantDigits: 5 })}`;
}

function pct(value) {
  const n = num(value);
  if (n === null) return "missing";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "Velmere-PASS432-Probe/1.0", ...headers } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

async function probeCoinGecko(query) {
  const search = await fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
  const coins = Array.isArray(search.coins) ? search.coins : [];
  const clean = query.toLowerCase();
  const exact = coins.find((coin) => [coin.id, coin.symbol, coin.name].some((value) => String(value || "").toLowerCase() === clean));
  const coin = exact || coins[0];
  if (!coin?.id) throw new Error("no_coingecko_match");
  const params = new URLSearchParams({
    vs_currency: "usd",
    ids: coin.id,
    order: "market_cap_desc",
    per_page: "1",
    page: "1",
    sparkline: "true",
    price_change_percentage: "1h,24h,7d,14d,30d",
    locale: "en",
  });
  const rows = await fetchJson(`https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("coingecko_market_empty");
  return {
    provider: "CoinGecko",
    query,
    id: row.id,
    symbol: String(row.symbol || "").toUpperCase(),
    name: row.name,
    price: row.current_price,
    change24h: row.price_change_percentage_24h_in_currency ?? row.price_change_percentage_24h,
    marketCap: row.market_cap,
    volume24h: row.total_volume,
    sources: ["CoinGecko search", "CoinGecko markets"],
    missing: [
      num(row.current_price) === null ? "price" : null,
      num(row.price_change_percentage_24h_in_currency ?? row.price_change_percentage_24h) === null ? "24h change" : null,
      num(row.total_volume) === null ? "24h volume" : null,
      num(row.market_cap) === null ? "market cap" : null,
      "second provider",
    ].filter(Boolean),
  };
}

async function probeYahoo(query) {
  const safe = query.trim().toUpperCase();
  const symbol = safe.includes("=") || /^[A-Z.]{1,8}$/.test(safe) ? safe : null;
  const search = symbol ? null : await fetchJson(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0&enableFuzzyQuery=true`);
  const found = symbol || search?.quotes?.[0]?.symbol;
  if (!found) throw new Error("no_yahoo_match");
  const chart = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(found)}?range=5d&interval=30m&includePrePost=false&events=div%2Csplits`);
  const result = chart.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamp = result?.timestamp || [];
  const closes = (quote?.close || []).filter((value) => typeof value === "number" && Number.isFinite(value));
  const first = closes[0] ?? null;
  const last = result?.meta?.regularMarketPrice ?? closes.at(-1) ?? null;
  const change = first && last ? ((last - first) / first) * 100 : null;
  return {
    provider: "Yahoo Finance chart",
    query,
    id: found,
    symbol: found,
    name: found,
    price: last,
    change24h: change,
    marketCap: null,
    volume24h: null,
    candles: timestamp.length,
    sources: ["Yahoo Finance search/chart"],
    missing: [num(last) === null ? "price" : null, num(change) === null ? "change" : null, timestamp.length ? null : "candles", "second provider"].filter(Boolean),
  };
}

async function probe(query) {
  const looksYahoo = /[A-Z]{1,5}(\.PA|=X|=F)?$/i.test(query) && !/[a-z]{6,}/.test(query);
  const attempts = looksYahoo ? [probeYahoo, probeCoinGecko] : [probeCoinGecko, probeYahoo];
  const errors = [];
  for (const attempt of attempts) {
    try { return await attempt(query); } catch (error) { errors.push(error.message); }
  }
  return { provider: "none", query, error: errors.join(" | "), sources: [], missing: ["provider"], price: null, change24h: null };
}

console.log("PASS432 live data probe · run this locally with internet before release\n");
for (const query of targets) {
  const row = await probe(query);
  console.log(`--- ${query} ---`);
  jsonLine("provider", row.provider);
  jsonLine("symbol", row.symbol || row.id || "missing");
  jsonLine("price", price(row.price));
  jsonLine("24h/change", pct(row.change24h));
  jsonLine("sources", row.sources?.join(" · ") || "missing");
  jsonLine("missing", row.missing?.length ? row.missing.join(" · ") : "none");
  if (row.candles !== undefined) jsonLine("candles", row.candles);
  if (row.error) jsonLine("error", row.error);
  console.log("");
}
