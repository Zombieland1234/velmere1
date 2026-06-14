# Velmère Master Build Map — PASS459

## A. Velmère Browser / Lens / PDF
- [x] Czteroetapowa animacja V pozostaje aktywna.
- [x] Preview = download pozostaje oparte na jednym raporcie.
- [x] Scroll-lock, Escape, focus trap i download icon pozostają aktywne.
- [x] PDF ma PASS459 Provider Truth na stronie source ledger.
- [x] PDF pokazuje cenę, market cap/proxy, volume, timestamp i confidence ze źródłem.
- [x] Brak danych zmienia się w provider plan, nie gołe `unknown`.
- [>] PASS460: pixel QA czterech stron w Chromium i test realnego pobranego PDF.

## B. Basic / Pro / Advanced
- [x] Basic: identity, cena, market cap/proxy, 24h, volume, range, source, freshness, confidence, next step.
- [x] Pro: 1h/7d, FDV, turnover, drugi provider, quorum, evidence debt i znaczenie rynkowe.
- [x] Advanced: liquidity, slippage, depth, holders, unlocks, venue resilience, source entropy, fake-live, narrative drift, lineage i execution ceiling.
- [x] Provider evidence może zasilić analizę wybranego stock/ETF/FX/commodity.
- [>] PASS460: metryki fundamentalne dla equity — P/E, shares, 52w range, filing age i earnings cadence jako właściwe pola Pro/Advanced.

## C. Real Markets
- [x] Provider router rozdziela klasy aktywów.
- [x] Krypto: CoinGecko market snapshot + Binance candles.
- [x] Stock/ETF/REIT/exchange equity: keyed `GLOBAL_QUOTE` + `OVERVIEW` w detail view.
- [x] FX: keyed `CURRENCY_EXCHANGE_RATE`.
- [x] Gold/silver: `GOLD_SILVER_SPOT`.
- [x] WTI/Brent/natural gas: jawna seria referencyjna z boundary.
- [x] Batch nie wypala limitu klucza — tylko pojedynczy `detail=1`.
- [x] Venue health nadal nie udaje stocka ani ceny giełdy.
- [>] PASS460: exchange-health REST adapters dla Binance i MEXC: ping, ticker, depth freshness i incident state.

## D. Shield AI
- [x] Bot jest renderowany w modalu Shield.
- [x] Odpowiedź jest związana z aktualnym wynikiem i historią.
- [x] Dodano source contract, provider plan i provider facts.
- [x] Brak market cap/liquidity/holders/slippage tworzy konkretny następny adapter.
- [x] PL/DE/EN dla nowej warstwy.
- [>] PASS460: bot Real Markets korzystający bezpośrednio z `providerEvidence` wybranego instrumentu.

## E. Shield Map / VLM Brain
- [x] Handoff Browser → PDF → Shield → Shield Map pozostaje zgodny z PASS453.
- [x] Source boundary może zostać przekazana jako jedna narracja.
- [>] PASS460: node Orbit `truthState/providerStatus` i wizualny source quorum zamiast ogólnej kropki statusu.

## F. Provider / Data Backbone
- [x] `ALPHA_VANTAGE_API_KEY` jest server-only.
- [x] Jawne stany: source_bound, not_configured, rate_limited, provider_error, unsupported.
- [x] Alpha Vantage throttle/error nie staje się pustym ekranem.
- [x] CoinGecko/Binance pozostają właściwą ścieżką krypto.
- [x] Yahoo compatibility jest opisane jako fallback wykresu.
- [>] PASS460: drugi provider equity/FX i source divergence bez podwójnego kosztu na każdy row.

## G. UI / UX
- [x] Modal pokazuje funkcje providera i dowody zamiast technicznego dumpu.
- [x] Status klucza jest widoczny bez ujawniania sekretu.
- [x] Panel Provider Truth jest przed warstwą diagnostyczną operatora.
- [x] Długie wartości mają break-word i kontrolowane gridy.
- [>] PASS460: visual density QA na 1080p, laptop, tablet i mobile.

## H. i18n
- [x] i18n gate PL/DE/EN przechodzi.
- [x] Shield Provider Truth ma trzy języki.
- [x] PDF Provider Truth jest lokalizowany.
- [>] PASS460: pełna lokalizacja technicznych `providerPlan` pochodzących z Real Markets routera.

## I. Build / QA
- [x] PASS453–PASS459 regresje zielone.
- [x] 770 TS/TSX przechodzi syntax parser.
- [x] Vercel preflight zielony.
- [x] Package JSON zawiera verifier PASS459.
- [ ] Pełny `npm run build` w środowisku z `node_modules`.
- [ ] Playwright: Browser → V forge → PDF → download → close.
- [ ] Playwright: Real Markets row → keyed detail → tier modal → close.

## J. Security / Secrets
- [x] Provider key nie trafia do UI ani PDF.
- [x] Requesty providerów mają timeout.
- [x] API state nie obiecuje bezpieczeństwa ani wypłacalności venue.
- [x] Source gap pozostaje jawny.
- [>] PASS460: rate-limit ledger i cache/stale-while-revalidate dla keyed detail.

## K. Performance / Quota
- [x] Tabela batchowa nie uruchamia kosztownych keyed calls.
- [x] Keyed hydration tylko dla jednego wybranego instrumentu.
- [x] Overview ma dłuższy cache niż quote.
- [x] Compatibility candles są scalane bez drugiego fetchu UI.
- [>] PASS460: server cache deduplication dla szybkiego przełączania timeframe.

## L. Otwarte blockery
1. Brak kompletnego `node_modules` w paczce roboczej — brak pełnego builda.
2. Brak realnego `ALPHA_VANTAGE_API_KEY` w sandboxie — parser i routing zweryfikowane, ale produkcyjny keyed response wymaga sekretu użytkownika.
3. Indeksy nadal wymagają dedykowanego breadth/constituents providera.
4. Venue health wymaga realnych adapterów status/depth/ping, nie samego kontraktu.
5. Nie wykonano jeszcze Chromium pixel testu PDF.
6. Provider plan w Real Markets jest częściowo techniczny i wymaga pełnej lokalizacji.

## M. Kolejność dalszej pracy
- **PASS460:** Venue Health Live Adapter + equity fundamentals depth + Orbit truth state + E2E PDF/Real Markets.
- **PASS461:** second-source divergence, keyed cache ledger, source freshness SLA.
- **PASS462:** public beta blocker sweep, mobile density i pełny build/release packet.
