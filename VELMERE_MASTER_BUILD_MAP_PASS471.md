# VELMÈRE MASTER BUILD MAP — PASS471

## A. Velmère Browser / Lens
- [x] Zachowana kolejność: wyszukiwarka → znaleziony instrument → PDF/Shield/Orbit → pozostały katalog.
- [x] Wyniki API są normalizowane przed wejściem do Reacta.
- [x] Brak symbolu, nazwy, źródeł, confidence albo tablic nie wywraca karty.
- [x] Historia PDF została rozwinięta z trzech chipów do pełnego, lokalnego drawera.
- [x] Drawer pokazuje symbol, poziom, confidence, liczbę źródeł, filename i czas.
- [x] Receipt drawer jest obsługiwany klawiaturą oraz posiada `aria-expanded` / `aria-controls`.

## B. PDF A4 / Preview / Download
- [x] Zachowane cztery etapy animacji V.
- [x] Zachowany wybór Basic / Pro / Advanced podczas generowania.
- [x] Preview i download nadal korzystają z tego samego Bloba.
- [x] Scroll-lock, focus trap, Escape i przywracanie fokusu utrzymane.
- [x] Receipt history odrzuca niepoprawne daty i duplikaty.
- [x] `total` pokazuje wszystkie poprawne receipty, a nie tylko widoczną część listy.
- [ ] Screenshot comparison Basic/Pro/Advanced w Chromium — scenariusz gotowy, środowisko bez Playwright.

## C. Basic / Pro / Advanced
- [x] Basic pozostaje warstwą ceny, kapitalizacji, 24h, wolumenu, źródła i świeżości.
- [x] Pro zachowuje drugie źródło, 1h/7d, świece, quorum i luki dowodowe.
- [x] Advanced zachowuje liquidity, slippage, depth, venue health, filings, fundamentals i anomalie.
- [x] Uszkodzony quote nie tworzy fałszywych liczb; pola stają się source-required/unavailable.

## D. Shield AI
- [x] Handoff z Browsera pozostaje kontekstem, nie gotowym werdyktem.
- [x] Nie zmieniono granicy własnego skanu Shielda.
- [x] Brak źródła nie jest maskowany tekstem pewnego wniosku.
- [ ] Następny pass: fuzz pełnego payloadu odpowiedzi AI i panelu operatora.

## E. Orbit 360 / Shield Map
- [x] Avatar i glyph nie wywołują już `.trim()` na `undefined`.
- [x] Scoring sugestii przyjmuje brak symbolu/nazwy bez crasha.
- [x] Handoff instrumentu i confidence z PASS468 pozostaje aktywny.
- [ ] Następny pass: wizualny test focus/scroll drawera Orbit w Chromium.

## F. Real Markets
- [x] Katalog providerów przechodzi przez `normalizePass471CatalogRows`.
- [x] Wyniki wyszukiwania providerów przechodzą przez `normalizePass471ProviderSearchRows`.
- [x] Batch quote oraz detail quote przechodzą przez `normalizePass471Quotes`.
- [x] Null, brak symbolu, duplikat i błędna klasa aktywa nie wywracają tabeli.
- [x] Niepełne świece są odrzucane, a high/low są naprawiane do prawidłowych granic OHLC.
- [x] `NaN` / Infinity nie trafiają do renderowania cen i procentów.

## G. Provider Truth / Consensus
- [x] Normalizer zachowuje jawne stany `live` / `unavailable`.
- [x] Brak source label dostaje `Source required`, a nie fake-live.
- [x] Provider plan, functions, docs, notes i evidence są ograniczane i czyszczone.
- [x] Duplikaty symboli są usuwane przed zbudowaniem tabeli.
- [ ] Live smoke Binance/MEXC/Coinbase wymaga sieci i działających endpointów.

## H. Accessibility / Keyboard
- [x] Receipt drawer ma natywny button, `aria-expanded` i `aria-controls`.
- [x] Zachowany modal focus loop dla forge i preview.
- [x] Tab / Shift+Tab pozostają zamknięte w aktywnym dialogu.
- [x] Download, close, Basic/Pro/Advanced i reader toggle pozostają w kolejności fokusu.
- [ ] Pełny keyboard-only Playwright pozostaje do uruchomienia lokalnie.

## I. i18n
- [x] Dodane copy PL/DE/EN dla: pokaż historię, ukryj historię i granica prywatności receiptów.
- [x] `npm run check:i18n` przechodzi dla 3 locale files.
- [x] Drawer nie zawiera nowego angielskiego copy w polskiej lub niemieckiej ścieżce.

## J. Runtime Safety / Fuzzing
- [x] Dodany `pass471-surface-runtime-resilience.ts`.
- [x] Dodany fuzz audit katalogu, wyszukiwania i quote payloadów.
- [x] Testy obejmują `null`, `undefined`, duplikaty, `NaN`, błędne OHLC i niepoprawne daty.
- [x] Skan kolizji natywnych konstruktorów respektuje bezpieczne aliasy, np. `Map as MapIcon`.
- [x] 775 plików TS/TSX przeszło syntax sweep bez błędów.

## K. Automated QA
- [x] `verify:pass471-surface-runtime-resilience` dodany do package scripts.
- [x] PASS466–PASS471 regression chain przechodzi.
- [x] Vercel preflight przechodzi — 779 scanned files.
- [x] Dodany `e2e:pass471-malformed-payload-resilience` z route interception.
- [ ] E2E nieuruchomiony: brak Playwright/Chromium w sandboxie.

## L. Packaging / Release
- [x] Pełny projekt pakowany bez `.git`, `.next`, `node_modules` i cache builda.
- [x] ZIP sprawdzany przez `unzip -t`.
- [x] SHA-256 zapisany osobno.
- [x] Raport, mapa, progres i lista zmienionych plików zawarte w paczce.

## M. PASS472 Backlog
- Uruchomić realny Playwright: malformed Real Markets → brak runtime overlay.
- Screenshot assertions dla Basic/Pro/Advanced A4.
- Fuzz response contract Shield AI / TokenRiskModal.
- Przenieść wspólny modal scroll-lock do jednego hooka, aby uniknąć driftu między Browser, Real Markets i Shield.
- Dodać provider response schema version do API i telemetrykę odrzuconych rekordów bez zapisywania payloadu.
