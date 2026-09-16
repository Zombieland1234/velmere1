from pathlib import Path
import hashlib,json
root=Path.cwd()
expected={
 'lib/market-integrity/coingecko.ts':'0b35959c316789c283166c6f3d95d6bb71fa102224643e9b514700588a6f2a6b',
 'lib/market-integrity/customer-report-source-binding.ts':'490ea8f700b993b92d966f6450587e12b76aae0e28b887c1366cee125eceb0bf',
 'lib/server/market-integrity-route-modules/markets.ts':'29a9570b3a078404bb6b8b0ce77adfab41c1bc0065509ded6728a23444bce632',
}
for p,h in expected.items():assert hashlib.sha256((root/p).read_bytes()).hexdigest()==h,'Unexpected bytes: '+p
changes={}
def save(p,s):
 old=(root/p).read_bytes();new=s.encode()
 changes[p]={'beforeSha256':hashlib.sha256(old).hexdigest(),'afterSha256':hashlib.sha256(new).hexdigest()}
 (root/p).write_bytes(new)
def one(s,a,b):
 assert s.count(a)==1,(a,s.count(a));return s.replace(a,b)
p='lib/market-integrity/customer-report-source-binding.ts';s=(root/p).read_text()
s=one(s,'    return requested === expected || resolved === expected || normalizedIdentity(receipt.resolvedIdentity?.marketId) === expectedMarket;','''    const resolvedMarket = normalizedIdentity(receipt.resolvedIdentity?.marketId);
    const resolvedSymbol = normalizedSymbol(receipt.resolvedIdentity?.symbol);
    const requestedMatches = requested === expected || requested === expectedMarket
      || (!requested.startsWith("market:") && Boolean(resolvedSymbol)
        && normalizedSymbol(requested.replace(/^symbol:/, "")) === resolvedSymbol);
    // A correct resolved label does not cure a contradictory requested asset.
    return requestedMatches && resolved === expected && resolvedMarket === expectedMarket;''');save(p,s)
p='lib/market-integrity/coingecko.ts';s=(root/p).read_text()
s=one(s,'  ids,\n}: {','  ids,\n  queryIdentity,\n}: {')
s=one(s,'  ids?: string[];\n} = {})','  ids?: string[];\n  queryIdentity?: string;\n} = {})')
s=one(s,'      requestedIdentity: row.id,','      requestedIdentity: queryIdentity ?? row.id,')
s=s.replace('      identityMatched: true,','      identityMatched: !queryIdentity || (ids?.length === 1 && row.id.toLowerCase() === ids[0].toLowerCase()),',1)
s=one(s,'      normalizedPayload: buildMarketRowEvidencePayload(row),','''      normalizedPayload: {
        ...buildMarketRowEvidencePayload(row),
        // Bind a search to the actual fetched bytes, in the same receipt and
        // with the original provider timestamp; never mint it from a fallback.
        ...(queryIdentity ? { id: row.id, symbol: row.symbol, price: row.price } : {}),
      },''')
s=one(s,'fetchCoinGeckoMarkets({ ids: [id], perPage: 10 });','fetchCoinGeckoMarkets({ ids: [id], perPage: 10, queryIdentity: clean });');save(p,s)
p='lib/server/market-integrity-route-modules/markets.ts';s=(root/p).read_text()
a=s.index('  const shieldRightsPreflight = buildShieldBasicDeliveryPreflight("markets");')
b=s.index('  const providerErrors: string[] = [];',a)
s=s[:a]+'''  const shieldRightsPreflight = buildShieldBasicDeliveryPreflight("markets");
  if ((!shieldRightsPreflight.customerDeliveryAllowed || !shieldRightsPreflight.providerNetworkAllowed) && !hasBrokeredEgressTestTransport()) {
    return jsonNoStore(toShieldBasicCustomerSafeWithheld("markets"), 503);
  }
  const fieldRightsPreflight = buildP99RealMarketsBasicDeliveryPreflight();
  if ((!fieldRightsPreflight.customerDeliveryAllowed || !fieldRightsPreflight.providerNetworkAllowed) && !hasBrokeredEgressTestTransport()) {
    return jsonNoStore(toShieldBasicCustomerSafeWithheld("markets"), 503);
  }

'''+s[b:];save(p,s)
out=root/'r13f-evidence';out.mkdir(exist_ok=True)
(out/'CONTRACT_EDIT_MANIFEST.json').write_text(json.dumps(changes,indent=2)+'\n')
print(json.dumps(changes))
