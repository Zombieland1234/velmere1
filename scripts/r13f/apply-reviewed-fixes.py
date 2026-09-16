from pathlib import Path
import hashlib, json

root = Path.cwd()
expected = {
 'lib/server/market-integrity-route-modules/investigator.ts':'e85ec4fc32ac0b92d117ee5ad6bc4b5897d87fd7d4e5c7a44c6923fc97430c57',
 'lib/market-integrity/coingecko.ts':'5b404eff4db75f197630799bffce089ae15289ed91fbcb4f3f3fa20a2e86fd54',
 'lib/network/brokered-egress.ts':'3914399fb8ae468f66df65e24f686bca88c8784eb1a5cccc1868a36c782692a6',
 'lib/market-integrity/market-row-delivery-gate.ts':'df8496fad14c2e5538079a6234334f18425d771dbcb528706115708ad4f97262',
 'lib/server/lazy-route-dispatch.ts':'83f1042675aa33414b6363039aa550a5377f1f2d79a0ba5546ab298197b7f6ab',
 'lib/auth/account-session.ts':'17249c8b5a5bb948ec9ad00bddac3668b5860449694e284a6c8d0e67756ed5e0',
 'lib/server/lazy-route-modules/account--customer-artifact.ts':'f578b7e27589d0045f0278158c0b21db92cee0c42764915a502f701833632914',
 'next.config.mjs':'219988115faf25095278c01c1734441fb5d030d9a99bddf5c5dc03ee467f6d40',
}
for p, sha in expected.items():
 assert hashlib.sha256((root/p).read_bytes()).hexdigest() == sha, 'Unexpected source bytes: '+p

def read(p): return (root/p).read_text()
changes = {}
def edit(p, new):
 old=read(p)
 if new != old:
  changes[p]={'beforeSha256':hashlib.sha256(old.encode()).hexdigest(),'afterSha256':hashlib.sha256(new.encode()).hexdigest()}
  (root/p).write_text(new)
def replace(s,a,b):
 assert s.count(a)==1,(a[:80],s.count(a))
 return s.replace(a,b)

p='lib/server/market-integrity-route-modules/investigator.ts';s=read(p)
a=s.index('import {\n  attachPass4644ProviderReceipts,');b=s.index('export async function resolveShieldMapResult',a)
s=s[:a]+s[b:]
s=replace(s,'  if (!marketRow && !args.providers) {\n    marketRow = resolveFallbackMarketRow(args.query.query, args.now);\n  }\n','')
s=replace(s,'  let payload: unknown = null;','  let payload: unknown;')
s=replace(s,'  if (args.query.namespace === "address") {\n    return {\n      ok: true as const,\n      result: await providers.analyzeAddress(args.query.query),\n    };\n  }','''  if (args.query.namespace === "address") {
    try {
      return { ok: true as const, result: await providers.analyzeAddress(args.query.query) };
    } catch {
      return { ok: false as const, code: "shield_map_provider_unavailable" };
    }
  }''')
s=replace(s,'  } catch {\n    marketRow = null;\n  }','  } catch {\n    return { ok: false as const, code: "shield_map_provider_unavailable" };\n  }')
s=replace(s,'      { status: 404, headers },','      { status: resolved.code === "shield_map_provider_unavailable" ? 503 : 404, headers },')
edit(p,s)

p='lib/market-integrity/coingecko.ts';s=read(p)
s=replace(s,'import { readJsonResponseBounded }','import { resolveCoinGeckoRequestConfig } from "./coingecko-runtime-config";\nimport { readJsonResponseBounded }')
s=replace(s,'import { attachPass4644ProviderReceipts, createPass4644ProviderEvidenceReceipt, pass4644IdentityMatches, pass4644CanonicalReceiptDigest }','import { attachPass4644ProviderReceipts, createPass4644ProviderEvidenceReceipt }')
s=replace(s,'const COINGECKO_BASE = "https://api.coingecko.com/api/v3";\n\n','')
a=s.index('function cgHeaders(): HeadersInit {');b=s.index('function toNumber(',a);s=s[:a]+s[b:]
s=replace(s,'async function fetchJson<T>(url: string, revalidate = 90): Promise<T> {\n  const response = await brokeredEgressFetch(url, {\n    headers: cgHeaders(),','''async function fetchJson<T>(endpoint: string, revalidate = 90): Promise<T> {
  const { baseUrl, headers } = resolveCoinGeckoRequestConfig(process.env);
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) throw new Error("invalid_coingecko_endpoint");
  const response = await brokeredEgressFetch(`${baseUrl}${endpoint}`, {
    headers,''')
s=s.replace('${COINGECKO_BASE}/','/')
s=s.replace('  wbtc: "bitcoin",','  wbtc: "wrapped-bitcoin",').replace('  "wrapped btc": "bitcoin",','  "wrapped btc": "wrapped-bitcoin",').replace('  "wrapped bitcoin": "bitcoin",','  "wrapped bitcoin": "wrapped-bitcoin",').replace('  weth: "ethereum",','  weth: "weth",').replace('  wbnb: "binancecoin",','  wbnb: "wbnb",')
for line in ['  "btc contract": "bitcoin",','  "btc-contract": "bitcoin",','  "bitcoin contract": "bitcoin",','  "kontrakt btc": "bitcoin",','  "kontrakt bitcoin": "bitcoin",','  "eth contract": "ethereum",','  "ethereum contract": "ethereum",','  "sol contract": "solana",','  "bnb contract": "binancecoin",']:
 s=replace(s,line+'\n','')
s=replace(s,'''  const exact = suggestions.find(
    (coin) =>
      coin.id.toLowerCase() === clean ||
      coin.symbol.toLowerCase() === clean ||
      coin.name.toLowerCase() === clean,
  );
  return (exact ?? suggestions[0])?.id ?? null;''','''  const exactId = suggestions.filter((coin) => coin.id.toLowerCase() === clean);
  if (exactId.length === 1) return exactId[0].id;
  if (exactId.length > 1) return null;
  const exact = suggestions.filter(
    (coin) => coin.symbol.toLowerCase() === clean || coin.name.toLowerCase() === clean,
  );
  // A fuzzy first hit or duplicate ticker is not an identity proof.
  return exact.length === 1 ? exact[0].id : null;''')
a=s.index('export async function searchCoinGeckoMarket');b=s.index('type ChartRangeProfile',a)
s=s[:a]+'''export async function searchCoinGeckoMarket(query: string) {
  const clean = query.trim().toLowerCase().slice(0, 80);
  if (!clean) return null;
  const id = await resolveCoinId(clean);
  if (!id) return null;
  let rows: MarketIntegrityRow[];
  try {
    rows = await fetchCoinGeckoMarkets({ ids: [id], perPage: 10 });
  } catch {
    // Preserve the actual fallback provider's receipts. Never relabel a
    // Binance response as CoinGecko or manufacture a successful HTTP receipt.
    const { fetchBinanceMarketFallback } = await import("./binance-market-fallback");
    rows = (await fetchBinanceMarketFallback({ perPage: 100 })).rows;
  }
  const matches = rows.filter((row) => row.id.toLowerCase() === id.toLowerCase());
  if (matches.length !== 1) return null;
  const row = matches[0];
  // The evidence firewall remains the only publication authority. Searching
  // must not reset freshness, completeness, scores, confidence, or provenance.
  applyMarketRowRiskDeliveryFirewall({ row, generatedAt: new Date().toISOString() });
  return row;
}

'''+s[b:]
edit(p,s)

p='lib/network/brokered-egress.ts';s=read(p)
s=replace(s,'coingecko: { hosts: ["api.coingecko.com"],','coingecko: { hosts: ["api.coingecko.com", "pro-api.coingecko.com"],');edit(p,s)

p='lib/market-integrity/market-row-delivery-gate.ts';s=read(p)
s=replace(s,'''  return (
    delivery.fields[fieldId]?.state === "verified" ||
    delivery.fields[fieldId]?.valueAvailable === true ||
    (delivery.state as string) === "reference" ||
    delivery.state === "withheld"
  );''','  return delivery.fields[fieldId]?.state === "verified";')
s=replace(s,'''  const publishedScore = (delivery.risk.state === "verified" && delivery.risk.score !== null)
    ? delivery.risk.score
    : (typeof row.result?.score === "number" ? row.result.score : delivery.risk.score);
  const riskVerified = publishedScore !== null && publishedScore !== undefined;''','''  const riskVerified = delivery.state === "verified"
    && delivery.risk.state === "verified"
    && typeof delivery.risk.score === "number"
    && Number.isFinite(delivery.risk.score)
    && delivery.risk.score >= 0 && delivery.risk.score <= 100;
  const publishedScore = riskVerified ? delivery.risk.score : null;''')
s=replace(s,'''        confidence: typeof delivery.risk.confidencePercent === "number"
          ? delivery.risk.confidencePercent / 100
          : (typeof row.result?.confidence === "number" ? row.result.confidence : 0.88),
        dataSources: delivery.verifiedProviderIds.length > 0 ? delivery.verifiedProviderIds : (row.result?.dataSources?.length ? row.result.dataSources : ["coingecko", "reference"]),''','''        confidence: typeof delivery.risk.confidencePercent === "number"
          && Number.isFinite(delivery.risk.confidencePercent)
          && delivery.risk.confidencePercent >= 0 && delivery.risk.confidencePercent <= 100
          ? delivery.risk.confidencePercent / 100
          : null,
        dataSources: delivery.verifiedProviderIds,''')
s=replace(s,'        aiSummary: row.result?.aiSummary,','        aiSummary: undefined,');edit(p,s)

p='lib/server/lazy-route-dispatch.ts';s=read(p)
s=replace(s,'''  } catch (err) {
    console.error('[lazy-route-dispatch ERROR]', key, err);
    return response({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }''','''  } catch {
    // Do not expose SDK errors, request data, credentials or stack traces.
    return response({ ok: false, error: unavailableError }, 503, { "retry-after": "30" });
  }''')
s=s.replace('const handler = loadedModule[method];','const handler = loadedModule?.[method];')
s=replace(s,'  return handler(request);','''  try {
    return await handler(request);
  } catch {
    return response({ ok: false, error: unavailableError }, 503, { "retry-after": "30" });
  }''');edit(p,s)

p='lib/auth/account-session.ts';s=read(p)
mark='export async function resolveRequestAccount('
helper='''/** Cheap rejection only: this never authenticates a request or grants access.
 * Recognized signed cookies still require durable rate limiting, family
 * revocation checks and owner binding. A raw Bearer JWT is not this API's
 * account-session credential and must not bypass its cookie boundary.
 */
export function hasRequestAccountCredential(request: Request): boolean {
  return Boolean(request.headers.get("x-velmere-account-auth")?.trim())
    || decodeSession(readUniqueSecurityCookie(request, "account_session")) !== null;
}

'''
s=replace(s,mark,helper+mark);edit(p,s)
p='lib/server/lazy-route-modules/account--customer-artifact.ts';s=read(p)
s=replace(s,'import { resolveRequestAccount }','import { hasRequestAccountCredential, resolveRequestAccount }')
s=replace(s,'  if (lengthGuard) return lengthGuard;','''  if (lengthGuard) return lengthGuard;
  if (!hasRequestAccountCredential(request)) {
    return NextResponse.json({ ok: false, error: "account_session_required" }, {
      status: 401, headers: { "cache-control": "no-store" },
    });
  }''');edit(p,s)
p='next.config.mjs';s=read(p)
s=replace(s,'typescript: { ignoreBuildErrors: true },','typescript: { ignoreBuildErrors: false },');edit(p,s)
out=root/'r13f-evidence';out.mkdir(exist_ok=True)
(out/'EDIT_MANIFEST.json').write_text(json.dumps(changes,indent=2)+'\n')
print(json.dumps({'changedPaths':list(changes),'count':len(changes)}))
