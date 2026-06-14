# Velmère Master Build Map — PASS461

## A. Velmère Browser / Lens / PDF
- [x] Animacja V w czterech etapach pozostaje aktywna.
- [x] Preview i download używają jednego raportu.
- [x] Scroll-lock, Escape, focus trap i ikona pobierania pozostają aktywne.
- [x] Provider Truth PASS459 i Consensus PASS460 pozostają w PDF.
- [ ] Natywna strona Venue Health z metrykami PASS461 w PDF.
- [>] PASS462: przenieść health score, spread, depth i continuity do raportu dla Binance/MEXC.

## B. Basic / Pro / Advanced
- [x] Basic zachowuje 10 pól i asset-aware semantics.
- [x] Pro zachowuje 14 pól i drugi provider/evidence debt.
- [x] Advanced zachowuje 20 pól i nietypowe metryki.
- [x] Venue health ma własne pola zamiast fikcyjnej ceny/market cap.
- [x] Health score ogranicza confidence cap.
- [>] PASS462: stock fundamentals: P/E, shares outstanding, 52w range, filing age i earnings cadence.

## C. Real Markets
- [x] Provider router rozdziela klasy aktywów.
- [x] Binance i MEXC mają live public Spot REST probe.
- [x] Mierzone są ping/time/ticker/book/depth/klines.
- [x] Venue nie udaje instrumentu z ceną.
- [x] Detail hydration chroni quota; tabela nie odpala probe’u masowo.
- [x] API zwraca kontrakt PASS461.
- [ ] Live adaptery Coinbase, Kraken, OKX i Bybit.
- [>] PASS462: drugi niezależny venue provider i incident comparison.

## D. Shield AI
- [x] Bot jest widoczny i korzysta z bieżącego wyniku.
- [x] Source contract/provider plan/provider facts są aktywne.
- [x] Consensus state ogranicza język i pewność.
- [ ] Dokładne metryki PASS461 nie są jeszcze natywnym payloadem odpowiedzi Shield AI.
- [>] PASS462: przekazać health score, latency, spread, depth i continuity do bota.

## E. Shield Map / VLM Brain
- [x] Handoff Browser → PDF → Shield → Shield Map pozostaje aktywny.
- [x] Orbit ma state-aware badge.
- [x] Orbit rozróżnia aligned/watch/divergent/stale/single_source/probing/unavailable.
- [x] Widoczne są chipy CONSENSUS/FRESHNESS/SOURCE/EVIDENCE.
- [x] Animacja reaguje tempem i stylem na stan.
- [>] PASS462: dynamiczne nody telemetryczne venue oraz drill-down po kliknięciu.

## F. Provider / Data Backbone
- [x] Dodano PASS461 venue runtime.
- [x] Cache pamięci 20 s i inflight deduplication.
- [x] Stale fallback do 10 minut.
- [x] Durable rate-limit używa istniejącej warstwy security.
- [x] Opcjonalny Upstash snapshot i redagowany provider ledger.
- [x] Jawne storage/quota/cache states.
- [x] Żaden sekret nie trafia do klienta.
- [>] PASS462: zunifikować trwały ledger Alpha Vantage i venue health.

## G. UI / UX
- [x] Real Markets pokazuje osobny panel Live Venue Health.
- [x] Panel ma czytelne KPI przed diagnostyką operatora.
- [x] Brak danych pokazuje boundary/provider error, nie `unknown`.
- [x] Venue health jest oddzielone wizualnie od stocków/krypto.
- [x] Orbit consensus jest widoczny bez otwierania technicznego JSON-u.
- [>] PASS462: responsive QA 1080p/laptop/tablet/mobile oraz redukcja wysokości modala.

## H. i18n
- [x] Gate PL/DE/EN przechodzi.
- [x] Orbit state labels mają PL/DE/EN.
- [x] Nie naruszono istniejących lokalizacji Browser/PDF/Shield.
- [ ] Część technicznych metric labels PASS461 jest nadal wspólna/angielska.
- [>] PASS462: pełne przetłumaczenie metrics, boundary i websocket policy.

## I. Build / QA
- [x] PASS453–PASS461 regresje zielone.
- [x] Pełny syntax sweep TS/TSX zielony.
- [x] i18n zielony.
- [x] Vercel preflight zielony.
- [x] Package JSON zawiera verifier PASS461.
- [x] Statyczny gate zakazuje fikcyjnej ceny venue.
- [ ] Pełny `npm run build` w środowisku z `node_modules`.
- [ ] Live network probe w środowisku z działającym DNS.
- [ ] Playwright Real Markets → Venue → Orbit → close.

## J. Security / Secrets
- [x] Publiczne endpointy nie wymagają API key.
- [x] Fetch ma timeout i no-store.
- [x] Rate-limit zamyka probe przed requestem przy wyczerpanym budżecie.
- [x] Ledger przechowuje tylko redagowane metryki i błędy.
- [x] Provider error nie jest zamieniany w optymistyczny werdykt.
- [x] Venue health nie oznacza wypłacalności, rezerw ani bezpieczeństwa środków.
- [>] PASS462: security event dla incidentów, stale i provider divergence.

## K. Performance / Quota
- [x] Tabela nie odpytuje venue health per row.
- [x] Detail mode odpala pojedynczy chroniony probe.
- [x] Sześć endpointów jest pobieranych równolegle.
- [x] Cache i inflight dedupe ograniczają burst.
- [x] Quota fallback wykorzystuje ostatni snapshot zamiast nowego requestu.
- [x] Upstash jest opcjonalny i ma jawny fallback.
- [>] PASS462: stale-while-revalidate oraz telemetry budget dashboard.

## L. Otwarte blockery
1. Brak `node_modules` — brak pełnego builda Next.js.
2. Sandbox nie rozwiązał DNS dla Binance/MEXC — brak realnego smoke testu odpowiedzi.
3. Brak Chromium/Playwright — brak pixel i interaction QA.
4. Upstash musi być skonfigurowany, aby ledger był trwały między cold startami.
5. Coinbase/Kraken/OKX/Bybit nie mają jeszcze produkcyjnych adapterów PASS461.
6. PASS461 korzysta z REST snapshotu; websocket lifecycle jest kontraktem, nie uruchomioną sesją.
7. Venue health nie obejmuje proof-of-reserves, wypłat, status page ani social incident feed.
8. Część technicznych etykiet wymaga pełnego PL/DE/EN.

## M. Kolejność dalszej pracy
- **PASS462:** drugi venue source, Shield AI/PDF venue metrics, pełne i18n i stock fundamentals depth.
- **PASS463:** WebSocket heartbeat/reconnect runtime, incident ledger i live Orbit telemetry nodes.
- **PASS464:** Playwright/pixel QA, pełny build, mobile blocker sweep i release packet public beta.
