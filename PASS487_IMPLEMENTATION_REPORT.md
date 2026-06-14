# Velmère PASS480–PASS487 — Implementation Report

## Zakres

Pakiet rozwija jednocześnie wykresy, Real Markets, identyfikację aktywów, VLM Brain, poziomy Basic/Pro/Advanced, Browser/PDF Forge oraz Shield Map.

## PASS480 — Unified source-only chart runtime

- Jeden interaktywny runtime świec dla powierzchni rynkowych.
- Przeciąganie zachowuje się jak bezpośrednia manipulacja: historia podąża za dłonią/kursorem.
- Wheel zoom, pinch zoom, klawiatura, reset i przyciski przybliżania.
- Adaptacyjne okno świec i ochrona przed NaN/niepoprawnym OHLC.
- Brak `Math.random`, generatorów zastępczych i sztucznych świec.

## PASS481 — Asset identity registry

- Wspólny rejestr identyfikacji dla crypto, equities, ETF, FX, commodities, REIT, indices i exchanges.
- Rozszerzone aliasy providerów i kontrolowany fallback `MKT` zamiast przypadkowego `?`.
- Resolver ikon zachowuje kompatybilność z wcześniejszym PASS476.

## PASS482 — Real Markets terminal

- Stabilny przekrój rynku: crypto, venues, equities, indices, FX, ETF, commodities i real estate.
- Wyszukiwanie jest oddzielone od katalogu — wpisywanie frazy nie kurczy automatycznie całej tabeli.
- Priorytetowy overview i deterministyczny scoring sugestii.
- Mobile cards pozostają osobną, czytelną reprezentacją terminala.

## PASS483 — VLM source-bound market

- Panel VLM pokazuje wykres wyłącznie wtedy, gdy istnieją potwierdzone świece providera.
- Brak feedu jest jawnym stanem produktu, a nie atrapą ceny lub market cap.
- Basic i Pro różnią się liczbą oraz głębokością metryk.

## PASS484 — Analysis depth manifest

- Basic: 10 pól.
- Pro: 14 pól.
- Advanced: 20 pól.
- Każdy poziom ma własny cel, zakres, wykluczenia i regułę kalibracji pewności.

## PASS485 — Evidence reasoning brain

- Nowy deterministyczny pipeline: **najmocniejszy fakt → główne napięcie → krytyczny brak → następny test**.
- Pewność jest ograniczana pokryciem dowodów.
- Brak danych nie może zostać zamieniony w fakt ani narrację AI.
- VLM Neural Audit pokazuje reasoning cockpit przed pełną macierzą pól.
- Renderer 3D dostał adaptacyjny DPR, pauzę poza viewportem/ukrytą kartą i subtelną reakcję na wskaźnik.
- `prefers-reduced-motion` wyłącza zbędny ruch.

## PASS486 — Evidence-bound PDF Forge

- Generowanie PDF rozpoczyna request od razu; usunięto sztuczne oczekiwanie przed wywołaniem API.
- Animacja zachowuje minimalną, krótką czytelność zależną od poziomu Basic/Pro/Advanced.
- Etapy: identity, sources/freshness, evidence reasoning, one-payload seal.
- Widoczne quality gates: preview/download parity, jawne braki, źródła i podpis Velmère.
- Pasek postępu wykorzystuje wagi etapów zamiast równego, pozornego progresu.

## PASS487 — Shield decision field

- Shield Map dostał centralny rdzeń ryzyka i sześć połączonych osi.
- Desktop: animowane pole decyzyjne z liniami relacji i radialnym układem.
- Mobile: czytelny rdzeń oraz karty osi bez nakładania i poziomego scrolla.
- Jawnie widoczne: największa presja, najspokojniejsza oś, liczba braków i następny test.
- Animacje respektują reduced motion.

## Wzorce referencyjne

- TradingView Lightweight Charts: obsługa scale/scroll, kinetic scrolling i interakcji dotykowych.
- Apple Human Interface Guidelines: motion ma wspierać orientację, a nie odciągać uwagę; reduced motion musi być respektowane.
- MEXC Spot V3 API/WebSocket: dane rynkowe powinny mieć jawny provider route i nie mogą być zastępowane wygenerowanym feedem.
- Aura Blockchain Consortium: premium trust UX powinien eksponować autentyczność, traceability i źródło informacji.

## Walidacja

- PASS480–484 verifier: PASS.
- PASS485–486 verifier: PASS.
- PASS487 verifier: PASS.
- PL/DE/EN i18n gate: PASS.
- Vercel preflight: PASS — 797 plików.
- Parser TypeScript: 801 plików TS/TSX, 0 błędów składni.
- `package.json`: poprawny JSON.
- ZIP integrity: sprawdzane po spakowaniu.

## Ograniczenie środowiska

Pełny `npm ci` został dwukrotnie przerwany sygnałem SIGTERM przez sandbox przed utworzeniem `node_modules`. Z tego powodu w tym środowisku nie deklaruję pełnego `npm run build`. Projekt wymaga Node.js 20.x, podczas gdy sandbox używał Node.js 22.16.0. Niezależne gate’y kodu, i18n, preflight i pełny parser TS/TSX przeszły poprawnie.
