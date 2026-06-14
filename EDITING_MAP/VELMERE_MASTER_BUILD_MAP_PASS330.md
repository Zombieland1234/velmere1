# PASS330 — Cross-Asset Shield / Exchange Collapse Radar

## User request
Add real estate, stocks, currencies/FX, full exchanges like Binance and MEXC, plus historical FTX data so the VLM Shield AI bot can check whether a venue shows collapse-style warning patterns. Build this step-by-step with separate tables.

## Implemented in this pass
- `lib/market-integrity/cross-asset-collapse-radar.ts`
  - Cross-asset universe rows:
    - crypto exchanges / venues
    - stocks / public companies
    - currencies / FX
    - real estate / REITs / property proxies
    - FTX historical collapse template
  - Exchange-collapse radar rows:
    - Binance
    - MEXC
    - Coinbase/Kraken as second-source venues
    - FTX historical reference
  - FTX old-data pattern library:
    - native-token collateral loop
    - withdrawal stress / freeze lane
    - reserve/liability mismatch
    - contagion dependency graph
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
  - Adds separate visual tables inside the Shield token modal.
  - Keeps strong customer-safe boundary: no bankruptcy prediction, no exchange safety certificate, no investment advice.
- `app/globals.css`
  - Adds PASS330 premium dark UI styling for the new cross-asset tables.
- `components/market-integrity/TokenRiskModal.tsx`
  - Renders CrossAssetCollapseRadarPanel under the chart in the main Shield token modal.
- `app/api/market-integrity/cross-asset/route.ts`
  - Exposes the same Cross-Asset Shield registry as JSON for the AI bot / future adapters.

## Source inspiration used
- MEXC official docs: spot market endpoints and websocket streams for klines/depth/ticker/source freshness.
- Binance official docs: spot API/klines and proof-of-reserves transparency lane.
- FTX historical research/news: native token collateral, withdrawal stress, reserve/liability gap, contagion graph.

## Next build order
1. Wire Binance/MEXC live market adapters: klines, depth, ticker, websocket health, source timestamp.
2. Add exchange status table: reserve proof, withdrawal incident notes, native-token exposure and source freshness.
3. Build FTX historical regression pack: timeline, FTT collateral loop, withdrawal run, bankruptcy trigger, contagion graph.
4. Add stocks/FX/real-estate adapters: quotes, volatility, macro/rates proxy and benchmark divergence.
5. Connect AI bot answer format: evidence row, missing-data row, next-check row and safe customer wording.

## Validation
- PASS328 A4 PDF verification passed.
- VLM Brain orbit cleanup verification passed.
- Full typecheck is still blocked by pre-existing missing dependency/type setup in this extracted project copy.
