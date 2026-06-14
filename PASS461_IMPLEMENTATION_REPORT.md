# PASS461 — Live Venue Health, Durable Provider Ledger i Orbit Consensus

## Cel
PASS461 zamyka lukę pomiędzy ogólnym opisem kondycji giełdy a mierzalnym, source-bound snapshotem Binance/MEXC. Venue nie jest akcją i nie powinno otrzymywać fikcyjnej ceny ani kapitalizacji. Zamiast tego nowy runtime mierzy dostępność endpointów, opóźnienie, zegar serwera, spread, głębokość, ciągłość świec i świeżość danych, a następnie przekazuje ten sam stan do Real Markets i Orbit 360.

## Najważniejsze wdrożenia

### 1. Live Venue Health Runtime
Dodano `lib/market-integrity/pass461-venue-health-runtime.ts`.

Dla Binance oraz MEXC runtime odpytuje publiczne endpointy Spot:
- ping,
- server time,
- ticker 24h,
- best bid/ask,
- order book depth,
- świece 1m.

Z odpowiedzi wyliczane są:
- średnia latencja requestów,
- rozjazd zegara serwera,
- spread w bps,
- bid/ask notional dla pierwszych 20 poziomów,
- imbalance głębokości,
- ciągłość świec 1m,
- freshness,
- health score i confidence cap.

Stany końcowe:
- `source_bound`,
- `review`,
- `stale`,
- `provider_error`,
- `unsupported`.

### 2. Zero fikcyjnej ceny venue
Binance i MEXC nadal nie udają stocków ani tokenów giełdy. Venue row ma `currentPrice: null`, a jego prawda danych opiera się na telemetrycznym health snapshotcie. Brak odpowiedzi nie jest zastępowany wymyśloną liczbą.

### 3. Cache, deduplikacja i trwały ledger
Dodano:
- cache pamięci procesu: 20 sekund,
- deduplikację równoległych probe’ów,
- stale fallback do 10 minut,
- trwały rate-limit przez istniejący `applyDurableRateLimit`,
- opcjonalny snapshot i redagowany ledger w Upstash Redis REST,
- jawne `storageMode`, `quotaMode`, `quotaRemaining` i `cacheState`.

Zmienne konfiguracyjne:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
VELMERE_VENUE_PROBE_MAX_PER_MINUTE=12
VELMERE_MARKET_PROVIDER_CACHE_TTL_SECONDS=180
VELMERE_MARKET_PROVIDER_LEDGER_MAX=600
VELMERE_MARKET_PROVIDER_LEDGER_KEY=velmere:pass461:provider-ledger
```

Upstash jest opcjonalny. Bez konfiguracji runtime jawnie działa w trybie pamięci, a awaria trwałego storage przełącza stan na `upstash_fallback_memory`.

### 4. Provider Truth Router
`pass458-provider-truth-router.ts` został rozszerzony o:
- `binance_venue_health`,
- `mexc_venue_health`,
- `venue_health_unsupported`.

Tabela nie odpala probe’u dla każdego wiersza. Dopiero otwarcie szczegółów Binance/MEXC uruchamia chroniony snapshot. Coinbase, OKX, Kraken i Bybit pozostają jawnie oznaczone jako kolejne adaptery, a nie jako źródła już podłączone.

### 5. API
Dodano:
- `GET /api/market-integrity/venue-health?venue=binance|mexc`,
- kontrakt PASS461 w API Real Markets,
- kontrakt PASS461 w API cross-asset.

Endpoint nie buforuje odpowiedzi po stronie przeglądarki (`cache-control: no-store`), ale runtime stosuje własny kontrolowany cache i ledger.

### 6. Real Markets UI
Modal wybranego venue pokazuje teraz panel PASS461:
- venue i para referencyjna,
- stan oraz health score,
- latency,
- spread,
- depth imbalance,
- kline continuity,
- cache/storage/quota,
- politykę websocket lifecycle,
- błędy providera,
- boundary opisujący ograniczenia wniosku.

Basic/Pro/Advanced otrzymały natywne pola venue:
- `venueHealthScore`,
- `venueLatencySpread`,
- `venueDepthContinuity`,
- `venuePersistence`.

Ryzyko venue jest wyprowadzane z health score, a nie z przypadkowego score stocka.

### 7. Orbit 360 Consensus State
`ShieldMapClient.tsx` i `globals.css` otrzymały wizualny stan konsensusu:
- aligned,
- watch,
- divergent,
- stale,
- single_source,
- probing,
- unavailable,
- idle.

Orbit pokazuje badge, score oraz cztery chipy: CONSENSUS, FRESHNESS, SOURCE i EVIDENCE. Kolor i tempo animacji zależą od stanu, więc użytkownik nie widzi już jednej neutralnej kropki dla wszystkich przypadków.

### 8. WebSocket lifecycle policy
Snapshot zawiera oddzielną politykę dla Binance i MEXC:
- endpoint,
- heartbeat,
- reconnect z jitterem,
- ponowną subskrypcję i odbudowę depth,
- rotację długotrwałego połączenia przed limitem sesji.

PASS461 nie deklaruje aktywnego websocketu, jeśli działa wyłącznie REST probe. Polityka opisuje kolejny krok produkcyjnego adaptera.

## Walidacja
Przeszło:
- `verify:pass461-live-venue-health-orbit`,
- regresje PASS453–PASS461,
- pełny syntax sweep TS/TSX,
- `check:i18n`,
- `vercel:preflight`,
- statyczna kontrola braku fikcyjnej ceny venue,
- kontrola kontraktów API, Real Markets i Orbit.

## Ograniczenia środowiska
- Sandbox nie rozwiązał DNS dla publicznych endpointów Binance/MEXC, dlatego nie wykonano realnego probe’u sieciowego. To ograniczenie środowiska, nie potwierdzona awaria API.
- Nie wykonano pełnego `npm run build`, ponieważ paczka nie zawiera `node_modules`.
- Nie wykonano Chromium/Playwright i pixel QA.
- Trwałość snapshotów i quota ledger wymaga skonfigurowanego Upstash; bez niego działa jawny fallback pamięci procesu.
