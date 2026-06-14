# VELMÈRE MASTER BUILD MAP — PASS336

## PASS336 — Market Source Cadence Matrix

Cel: VLM Shield ma umieć odróżnić szybkie dane giełdowe od wolnych danych makro i historycznych wzorców FTX, zanim AI bot pokaże użytkownikowi pewność lub ostrzeżenie.

## Zmienione ID mapy

- L02 — orderbook/depth provider: dodany cadence/TTL model dla Binance/MEXC.
- L06 — adapter timeouts/fallbacks: dodany osobny Matrix z fast-live / daily / slow macro / historical lanes.
- K02 — source freshness registry: rozszerzone o source cadence matrix.
- D16 — source confidence lanes: AI musi pokazać rytm źródła przed confidence.
- D17 — missing-data semantics: wolne albo brakujące źródło nie jest neutralne.
- M01/M02 — report/PDF: kolejny krok to pokazanie cadence summary w Lens PDF.

## Nowe pliki

- `lib/market-integrity/market-source-cadence-matrix.ts`
- `app/api/market-integrity/market-source-cadence/route.ts`
- `scripts/verify-pass336-market-source-cadence-matrix.mjs`

## Zmienione pliki

- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `app/api/market-integrity/cross-asset/route.ts`
- `app/globals.css`
- `package.json`

## Bezpieczne granice copy

- Nie mówić: exchange is collapsing, next FTX, insolvent, guaranteed unsafe.
- Nie mówić: buy/sell, trade now, guaranteed market direction.
- Mówić: live source limited, second-source required, historical regression pattern, cadence mismatch, source freshness.

## Research notes

- Binance/MEXC: szybkie lane depth/klines/ticker/websocket muszą mieć TTL, reconnect i fallback.
- ECB FX: daily reference, nie cena transakcyjna i nie szybki alert.
- FRED/FHFA/real estate: wolne dane makro, nie realtime alarm.
- FTX: tylko regression pack/historyczny wzorzec, nigdy publiczny werdykt bez operator evidence.

## Następny PASS337

1. Podpiąć Cadence Matrix do Lens PDF jako małą sekcję `Source rhythm`.
2. Dodać Orbit 360 Global Risk nodes: crypto, exchange, stocks, FX, real estate, ETF.
3. Zrobić publiczny AI copy: `źródło szybkie`, `źródło dzienne`, `źródło makro`, `historyczny wzorzec`.
