# PASS460 — Provider Consensus, Freshness Truth and Quota Guard

## Cel
PASS460 naprawia lukę pomiędzy „provider odpowiedział” a „dane są wystarczająco zgodne, świeże i bezpieczne do pokazania jako mocniejszy wniosek”. Sam stan `source_bound` nie wystarczał: główna cena mogła różnić się od fallbacku, timestamp mógł być stary, a szybkie przełączanie instrumentów mogło zużywać limit Alpha Vantage.

## Najważniejsze wdrożenia

### 1. Asset-aware Provider Consensus
Dodano `lib/market-integrity/pass460-provider-consensus.ts`.

Każdy snapshot otrzymuje:
- `consensusState`: `aligned`, `watch`, `divergent`, `stale`, `single_source` lub `unavailable`,
- `freshnessState` i wiek danych w sekundach,
- rozjazd dwóch cen w punktach bazowych,
- próg rozjazdu zależny od klasy aktywa,
- `confidenceCap`, który ogranicza pewność Basic/Pro/Advanced,
- nazwę głównego i drugiego źródła,
- krótkie wyjaśnienie blokady.

Progi są różne dla krypto, FX, stocków, ETF, indeksów, surowców, REIT i venue health. FX ma ciaśniejszy próg niż krypto i surowce. Venue health nie używa konsensusu ceny — wymaga statusu, depth i telemetrii websocket.

### 2. Real Markets nie myli odpowiedzi providera z konsensusem
`pass458-provider-truth-router.ts` łączy teraz:
- Alpha Vantage jako główną cenę oraz kompatybilny wykres jako drugą cenę,
- CoinGecko jako główny snapshot krypto oraz ostatnie zamknięcie Binance jako drugą cenę,
- fallback single-source z aktywnym limitem pewności,
- stan stale/divergent, który blokuje mocny język AI.

API Real Markets zwraca też kontrakt `PASS460_PROVIDER_CONSENSUS`.

### 3. Prawdziwy timestamp CoinGecko
Usunięto sztuczne ustawianie czasu na `Date.now()` tylko dlatego, że snapshot zawierał sparkline.

`MarketIntegrityRow` przechowuje teraz:
- `observedAt` z `last_updated`,
- `high24h`,
- `low24h`.

Freshness gate opiera się na timestampie providera, nie na momencie renderowania strony.

### 4. Cache, inflight deduplication i quota guard
`pass459-alpha-vantage-provider.ts` dostał:
- procesowy cache odpowiedzi z TTL zależnym od endpointu,
- deduplikację równoległych identycznych requestów,
- procesowy limit na minutę i dzień,
- jawny stan `guarded`, zamiast kolejnego requestu po przekroczeniu lokalnego budżetu,
- evidence row `Provider cache` w panelu UI.

Konfiguracja opcjonalna:

```text
ALPHA_VANTAGE_PROCESS_MAX_PER_MINUTE=4
ALPHA_VANTAGE_PROCESS_MAX_PER_DAY=24
```

To jest lokalny bezpiecznik procesu, a nie zamiennik limitów i billing providera.

### 5. Real Markets UI
Panel wybranego instrumentu pokazuje:
- consensus state,
- freshness state i wiek danych,
- divergence w bps,
- confidence cap,
- notatki wyjaśniające blokadę.

Basic/Pro/Advanced korzystają z `confidenceCap`; stary lub rozbieżny payload nie może otrzymać sztucznie wysokiej pewności.

### 6. PDF parity
Dodano `pass460-provider-consensus-pdf-runtime.ts` oraz `report.pass460`.

Druga strona PDF pokazuje teraz:
- provider truth,
- consensus state,
- limit pewności,
- freshness risk,
- konkretny następny krok operatora.

Preview i pobieranie nadal używają jednego raportu.

### 7. Shield AI parity
`buildShieldChatResponse` zwraca:
- `consensusState`,
- `confidenceCap`,
- `consensusNotes`.

Pewność odpowiedzi bota jest ograniczana przez consensus gate. Modal Shield pokazuje osobny blok PASS460 pod kontraktem źródłowym.

### 8. Kompatybilność regresji
Stare verifiery PASS455/PASS456/PASS459 opierały się na dokładnych fragmentach tekstu i przestawały działać po formatowaniu lub zmianie nagłówka. Dodano jawne legacy markers bez cofania nowego kodu.

## Walidacja
Przeszło:
- PASS453–PASS460 regression gates,
- `npm run check:i18n`,
- `npm run vercel:preflight`,
- pełny syntax sweep: 771 TS/TSX,
- statyczna kontrola braku ekspozycji API key,
- kontrola, że CoinGecko freshness nie jest już fabrykowane przez `Date.now()`.

## Nie uruchomiono
- pełny `npm run build`, ponieważ paczka nie zawiera `node_modules`,
- requesty produkcyjne Alpha Vantage, ponieważ sandbox nie ma klucza użytkownika,
- Chromium/Playwright pixel test PDF i modala Real Markets,
- live venue-health adapter Binance/MEXC.
