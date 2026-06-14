# VELMÈRE MASTER BUILD MAP — PASS334

## PASS334 — Global Risk Map / Cross-Asset Context Brain

### Ruszone ID z mapy
- L02 — exchange/orderbook source lanes: Global Risk Map source rows reference exchange depth, klines, book ticker, fallback and second-source divergence.
- L05/L06 — OSINT/source fallback: scenario rows expose source freshness, fallback and no-panic language.
- D13/D16/D17 — AI risk ontology/source confidence/missing-data semantics: Global Risk Map converts technical market stress into source-aware human copy.
- M01/M03/M04 — customer-safe report/evidence note/safe export wording: public copy blocks bankruptcy prediction, exchange certification, guarantees and buy/sell language.
- K02/K03 — source freshness registry/event taxonomy: source rows define cadence and boundaries per data class.

### Dodane pliki
- `lib/market-integrity/global-risk-map.ts`
- `app/api/market-integrity/global-risk-map/route.ts`
- `scripts/verify-pass334-global-risk-map.mjs`

### Zmienione pliki
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `app/api/market-integrity/cross-asset/route.ts`
- `app/globals.css`
- `package.json`

### Publiczny efekt
Cross-Asset Shield ma teraz sekcję **Global Risk Map** z osobnymi pasami: crypto, exchange health, stocki, FX, real estate, commodities i ETF. Każdy pas pokazuje heat score, spokojny opis dla człowieka, source plan i brakujące dane przed wyższą pewnością.

### Guard
- `npm run verify:pass334-global-risk-map`

### Boundaries
Global Risk Map nie przewiduje bankructwa giełdy, nie certyfikuje bezpieczeństwa, nie daje porad inwestycyjnych, nie daje gwarancji i nie używa buy/sell języka.

### Następne kroki
- PASS335: podłączyć Global Risk Map do PDF Lens i AI Human Copy jako osobną sekcję raportu.
- PASS336: Global Risk Map w Orbit 360 jako warstwa heat nodes.
- PASS337: druga wersja Exchange Health z realnym adapter contract dla Binance/MEXC i second-source divergence.
