# PASS463 Implementation Report — Canonical Pair Coverage

## Cel
Usunąć pozostałe założenie „BTC jako proxy dla wszystkiego” i sprawić, aby Browser, PDF, Shield AI oraz Real Markets porównywały dokładnie to aktywo i dokładnie te pary, które użytkownik analizuje. Rozjazd USD/USDT/USDC ma być jawny, confidence-capped i nigdy przedstawiany jako idealna zgodność walut kwotowanych.

## Wdrożenia

### 1. Canonical Pair Coverage
- Dodano `pass463-canonical-pair-coverage.ts`.
- Resolver normalizuje aliasy i symbole: BTC/XBT, ETH, SOL, BNB, XRP, ADA, DOGE, LINK, AVAX, DOT, LTC, BCH, XLM, UNI, ATOM, NEAR, AAVE i ETC.
- Każde venue dostaje osobną parę kanoniczną: np. `ETHUSDT` na Binance/MEXC oraz `ETH-USD` na Coinbase.
- Brak skonfigurowanej pary nie generuje sztucznej wartości. Przykład: BNB na Coinbase zwraca `unsupported`, a drugi provider przechodzi na MEXC.
- Nieznany, ale bezpieczny symbol może dostać parę `candidate`; provider musi ją potwierdzić przed językiem `source_bound`.

### 2. Quote-basis gate
- Dodano stany: `same_quote`, `fiat_stable_proxy`, `stable_stable_proxy`, `unsupported`.
- USD/USDT jest monitorowanym proxy z karą pewności 10 punktów.
- USDT/USDC jest stablecoin proxy z karą 6 punktów.
- Identyczna waluta kwotowana nie dostaje kary.
- Nieporównywalna baza, np. EUR/USDT bez osobnego FX feedu, blokuje bezpośrednie liczenie divergence.

### 3. Venue Health per aktywo
- Cache, inflight dedupe, quota key i durable snapshot są izolowane przez `venue + canonical asset`.
- ETH nie może nadpisać BTC, a SOL nie może odziedziczyć starego snapshotu XRP.
- Snapshot zawiera: asset symbol, base, quote, pair resolution state i wyjaśnienie pokrycia pary.
- Publiczne endpointy nadal nie są certyfikatem rezerw, wypłacalności ani dostępności wypłat.

### 4. Cross-Venue Consensus
- Porównanie używa realnych par dla wybranego aktywa.
- Confidence cap uwzględnia divergence, freshness, spread, health gap oraz quote-basis penalty.
- `unsupported` quote basis nie jest traktowane jak poprawna cena porównawcza.
- Dynamiczny wybór drugiego venue preferuje Coinbase, gdy ma parę kanoniczną; w innym przypadku przechodzi na Binance/MEXC.
- Runtime testy potwierdziły m.in. BTC Binance↔Coinbase i BNB Binance↔MEXC.

### 5. Browser / Search / PDF
- Dokładne wyniki CoinGecko dla wspieranych symboli mogą dołączyć właściwy pair-aware evidence packet.
- `marketSnapshot` przechowuje asset, primary/secondary quote, quote-basis state, penalty oraz pair resolution.
- PDF pokazuje aktywo/parę kanoniczną, quote basis, pair coverage, divergence oraz confidence cap.
- Preview i download nadal używają jednego raportu.
- Brak drugiego porównywalnego venue pozostaje jawną luką; nie jest automatycznie usuwany z `missingData`.

### 6. Shield AI
- Shield AI pobiera evidence dla aktualnego symbolu, nie wyłącznie BTC.
- Source contract mówi, które venue, pary i waluty kwotowane faktycznie użyto.
- Bot może opisywać price/spread/depth/freshness, ale nie może gwarantować bezpieczeństwa giełdy, rezerw ani wypłat.
- Pair coverage oraz quote-basis penalty trafiają do provider facts i operator plan.

### 7. Real Markets UI / API
- Real Markets pokazuje `Pair coverage`, quote currency, pair resolution note i quote-basis penalty.
- `provider_error` i `unsupported` nie są oznaczane jako live source.
- Real Markets API i Cross Asset API zwracają kontrakt PASS463.
- Router krypto nie ma już zdublowanego fallbacku `market.volume24h`.

## Testy runtime
- `BTC` → Binance `BTCUSDT`, Coinbase `BTC-USD`.
- `ETH-USD` → canonical asset `ETH`, Coinbase `ETH-USD`.
- `SOLUSDT` → canonical asset `SOL`, MEXC `SOLUSDT`.
- `XRP` → Coinbase `XRP-USD`.
- `BNB` → Coinbase `unsupported`, preferowany drugi provider MEXC.
- USD/USDT → `fiat_stable_proxy`, kara 10.
- USDT/USDC → `stable_stable_proxy`, kara 6.
- EUR/USDT → `unsupported`, brak bezpośredniego divergence.

## Walidacja
- PASS453–PASS463 regression gates: OK.
- PASS463 verifier: 14 kluczowych plików.
- Resolver i cross-venue synthetic runtime cases: OK.
- Full syntax parse: 775 TS/TSX, 0 parse errors.
- i18n PL/DE/EN: OK.
- Vercel preflight: OK, 771 plików.
- Live REST smoke: niewykonany — sandbox nie rozwiązał DNS Binance, MEXC ani Coinbase.
- Pełny Next build: niewykonany — brak lokalnego `node_modules`.
- Playwright/PDF render diff: niewykonany — brak działającej aplikacji i Chromium.
