# PASS333 — AI Human Copy Engine / Cross-Asset Shield Copy

## Cel
Zamienić surowe operatorowe komunikaty typu `calm prescreen`, `liquidity proof lane`, `withdrawal stress`, `reserve/liability gap` na język zrozumiały dla człowieka.

## Ruszone ID z mapy
- D14 Explainer taxonomy
- D16 Source confidence lanes
- D17 Missing-data semantics
- L06 Adapter timeouts/fallbacks
- M01 Customer-safe risk brief
- M03 Evidence note
- M04 Safe export wording
- Cross-Asset / Exchange Health AI bot copy layer

## Zrobione
- `lib/market-integrity/ai-human-copy-engine.ts`
- `app/api/market-integrity/ai-human-copy/route.ts`
- Cross-asset API zwraca `humanCopy`
- CrossAssetCollapseRadarPanel pokazuje nową tabelę `AI Human Copy Engine`
- Techniczne copy w panelach przechodzi przez `humanizeShieldCopy`
- Dodany guard `verify:pass333-ai-human-copy-engine`

## Boundary
AI bot może pisać o obserwacji, source freshness, second-source divergence i missing evidence.
AI bot nie może pisać: next FTX, giełda upada, gwarantowane bezpieczeństwo, buy/sell, panic withdrawals.

## Następny PASS334
- Orbit Drawer smooth scroll + inertial feel
- Lens PDF V2 bardziej 1:1 z preview
- dalsze usuwanie technicznego copy z customer UI
