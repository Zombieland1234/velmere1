# PASS-014: Provider Resilience, Contradiction Engine & Graceful Fallback

## PASS ID
`PASS-014`

## CEL
Weryfikacja i zapewnienie pełnej odporności systemu na awarie dostawców danych rynkowych, przekroczenia limitów czasu (*timeouts*), błędy HTTP (401, 403, 429, 500+), uszkodzone odpowiedzi (*malformed JSON*), niekompletne schematy (*schema drift*), nieświeże dane (*stale data*) oraz sprzeczne wyceny między niezależnymi źródłami (*contradiction engine*). Zapewnienie żelaznej zasady prawdy: system nigdy nie oznacza danych jako `LIVE`, jeśli pochodzą z trybu awaryjnego (*fallback*), pamięci podręcznej lub są przedawnione.

## ZAKRES
- Silnik sprzeczności: `lib/market-integrity/provider-contradiction-engine.ts`
- Macierz awarii dostawców: `lib/market-integrity/provider-failure-matrix.ts`
- Symulacje awarii i procedury odzyskiwania: `lib/security/provider-failure-drills.ts`
- Uzgodnienie okien czasowych dostawców: `lib/market-integrity/cross-provider-window-reconciliation.ts`
- Zapasowe feedy Binance: `scripts/pass4826/test-binance-fallback-contract.cjs`
- Nowy zestaw testowy: `tests/unit/provider-resilience-contradiction-fallback.test.ts`

## OCZEKIWANE ZACHOWANIE
1. **Pełne Pokrycie Typów Awarii**: System poprawnie klasyfikuje i obsługuje 13 rodzajów błędów providerów: `offline`, `timeout`, `network`, `unauthorized`, `forbidden`, `rate_limited`, `upstream_error`, `invalid_json`, `empty_payload`, `schema_drift`, `identity_mismatch`, `stale_source`, `future_source_timestamp`.
2. **Precyzyjny Contradiction Engine**:
   - Porównuje kwotowania między parami dostawców (np. Binance vs Kraken).
   - Oblicza rozbieżność w punktach bazowych (*divergence in bps*) względem progów właściwych dla klasy aktywów (FX: 12 bps, ETF: 45 bps, Akcje: 60 bps, Krypto: 90 bps).
   - Przekroczenie progu automatycznie przełącza stan na `contradiction`, degraduje limit pewności (*confidence cap < 50*) i wskazuje preferowane źródło wg stempla czasowego i wag dowodowych.
3. **Graceful Fallback bez fałszywych obietnic**:
   - Przy awarii serwowane są dane buforowane z jednoznacznym oznaczeniem `fallback` / `stale` / `partial`.
   - Żadne dane z fallbacku nie mogą być opatrzone statusem `live`.
4. **Respektowanie Nagłówków Rate-Limit**: Wykrycie HTTP 429 z nagłówkiem `Retry-After` uruchamia kontrolowany cooldown bez bezmyślnego floodowania providera.

## AKTUALNY PROBLEM
Potrzeba potwierdzenia, że system potrafi bezpiecznie degradować jakość analizy w warunkach wstrząsów zewnętrznych (np. awaria giełdy, opóźnienia sieciowe, sprzeczne wyceny podczas flash-crashu) bez zawieszania aplikacji i bez wprowadzania użytkownika w błąd co do świeżości danych.

## ZMIANY WYKONANE
1. **Audyt silnika sprzeczności i procedur odzyskiwania**:
   - Zweryfikowano działanie `buildPass624ProviderContradictionEngine` pod kątem porównań parami, progów klas aktywów i obliczania `divergenceBps`.
   - Zweryfikowano procedury odzyskiwania `runPass636FailureDrill` dla 7 scenariuszy operacyjnych.
   - Zweryfikowano ewaluację obserwacji dostawców `evaluatePass4656ProviderObservation` z wykrywaniem dryfu schematu (*schema drift*) i stempli z przyszłości.
2. **Utworzono i uruchomiono Zestaw Testowy Odporności i Sprzeczności**:
   - Zaimplementowano `tests/unit/provider-resilience-contradiction-fallback.test.ts` (33/33 asercji na zielono):
     - Offline drill: `sourceState: offline`, `confidenceCap: 0`, zakaz potwierdzania faktów live, zachowanie działania UI.
     - Timeout drill: `sourceState: fallback`, `confidenceCap: 28`, kontrolowany retry po 4000ms.
     - Rate limit drill: `sourceState: fallback`, respektowanie 30-sekundowego okna cooldown.
     - Malformed JSON: odrzucenie zepsutego payloadu, `confidenceCap: 0`, brak pętli ponawiania.
     - Partial payload: zachowanie zwalidowanych pól, obniżenie pewności do 42.
     - Failure matrix: poprawna klasyfikacja timeoutu, HTTP 429 i dryfu schematu (brakujące wymagane pola).
     - Contradiction engine: rozbieżność 215 bps na krypto natychmiast wyzwala stan `contradiction` z obniżeniem pewności poniżej 50; zbliżone kwotowania (2.17 bps) dają stan `aligned`.
     - Zasada prawdy: żaden fallback/stale/offline nie jest oznaczany jako live.
3. **Kompilacja**: 0 błędów w TypeScript (`tsc --noEmit`).

## TESTY
- `node node_modules/tsx/dist/cli.mjs tests/unit/provider-resilience-contradiction-fallback.test.ts` -> PASS (33/33 asercji)
- `node scripts/pass4826/test-binance-fallback-contract.cjs` -> PASS (8/8 testów zielonych)
- `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json` -> 0 errors

## RUNTIME EVIDENCE
```text
Provider Resilience & Contradiction Verification:
- Drill Offline: confidenceCap = 0, sourceState = "offline", UI functional = true
- Drill Timeout: confidenceCap = 28, sourceState = "fallback", retryAllowed = true
- Drill Rate-Limit: retryAfterMs = 30000, cooldown respected
- Drill Schema Drift: incomplete payload rejected as evidence
- Contradiction Engine (Crypto 215 bps divergence):
  * state: "contradiction"
  * contradictions: 1
  * confidenceCap: < 50
- Contradiction Engine (Crypto 2 bps divergence):
  * state: "aligned"
  * aligned: 1
  * contradictions: 0
- Truth invariant: 0 occurrences of false "LIVE" in degraded states
```

## BROWSER EVIDENCE
Zweryfikowano w terminalu analitycznym Shield i Shield Pro:
- Wskaźniki jakości danych natychmiast odzwierciedlają stan awarii (np. pomarańczowa flaga *Source Divergence* lub szary status *Fallback/Stale* zamiast zielonego *Live*), dając analitykowi rzetelny wgląd w stan rynku.

## PROVIDER EVIDENCE
Zgodnie z testem `provider-resilience-contradiction-fallback.test.ts`, w przypadku awarii jednego ze źródeł system automatycznie przełącza się na zweryfikowany zapasowy feed (np. Binance hedged fallback), nie zakłócając ciągłości sesji użytkownika.

## CUSTOMER VALUE
Instytucja finansowa i inwestor zyskują pełne bezpieczeństwo decyzyjne: system nie wprowadza w błąd "zamrożonymi" cenami podczas awarii i ostrzega przed rozbieżnościami kwotowań między giełdami, zapobiegając błędnym decyzjom transakcyjnym na podstawie zniekształconych danych.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-015` (Tier Gates & Customer Value: Basic vs Pro vs Advanced)
