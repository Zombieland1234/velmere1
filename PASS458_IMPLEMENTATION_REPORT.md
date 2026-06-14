# PASS458 — Real Markets Provider Truth Router

## Cel
PASS458 naprawia największy problem Real Markets: jeden ślepy adapter traktował krypto, akcje, FX, ETF, surowce, REIT i venue health prawie tak samo. To powodowało wrażenie losowych danych, pustych pól, niejasnego `unknown` i ryzyko udawania „live” tam, gdzie brakowało właściwego źródła.

## Wdrożone

### 1. Provider Truth Router
Dodano `lib/market-integrity/pass458-provider-truth-router.ts`.

Router klasyfikuje każdy symbol do osobnej ścieżki:
- `crypto`
- `stock`
- `index`
- `fx`
- `etf`
- `commodity`
- `real_estate`
- `exchange_equity`
- `venue_health`

Każda odpowiedź API dostaje teraz:
- `assetClass`
- `truthState`
- `providerKind`
- `sourceContract`
- `sourcePolicy`
- `providerPlan`
- `missingReason`
- `secondSourceRequired`
- `docs`

### 2. Crypto: CoinGecko + Binance
Dla BTC/ETH/SOL/BNB/XRP/ADA/DOGE/LINK/AVAX/DOT/USDT/USDC router używa:
- CoinGecko `/coins/markets` jako źródła ceny, market cap, FDV, supply i 24h volume.
- Binance klines jako świec, gdy para jest dostępna.
- Oznaczonego fallbacku chartowego, gdy Binance/CoinGecko nie odpowie.

### 3. Stock / ETF / REIT / FX / surowce
Te klasy aktywów nie udają pełnego źródła instytucjonalnego, dopóki nie ma klucza/provider lane.

Zamiast fake-live router pokazuje:
- compatibility adapter,
- source contract,
- missing reason,
- wymaganą ścieżkę Alpha Vantage / filing / holdings / contract method.

### 4. Venue health bez fikcyjnej ceny
Binance, MEXC, Coinbase, OKX, Kraken i Bybit w trybie venue health nie dostają ceny giełdy. Dostają status `source_required` i plan źródeł: status/depth/websocket/reconnect/incident ledger.

### 5. UI Real Markets
`CrossAssetCollapseRadarPanel.tsx` pokazuje teraz panel `PASS458 Provider Truth Router` w modalu:
- status truthState,
- source contract,
- source policy,
- 3 kroki providerPlan,
- brakujące źródła bez surowego `unknown`.

### 6. Basic / Pro / Advanced
Audit evidence dostał nowe pola:
- FDV,
- 7D,
- PASS458 source contract,
- provider plan,
- jawny market cap z CoinGecko, jeśli dostępny.

## Walidacja

Przeszło:
- `npm run check:i18n`
- `npm run verify:pass453-unified-intelligence-handoff`
- `npm run verify:pass454-evidence-dense-human-analysis`
- `npm run verify:pass455-human-decision-pdf-forge`
- `npm run verify:pass456-asset-aware-pdf-realmarkets`
- `npm run verify:pass457-shield-ai-progressive-disclosure`
- `npm run verify:pass458-provider-truth-router`
- `npm run vercel:preflight`

## Nie uruchomiono
Pełny `next build` nie został uruchomiony, bo paczka robocza nie zawiera kompletnego `node_modules`.
