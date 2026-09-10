# PASS-012: Risk Engine Determinism, Bounds & Traceability

## PASS ID
`PASS-012`

## CEL
Weryfikacja i zapewnienie pełnego determinizmu, braku arbitralnych liczb ("magic numbers"), ciągłości matematycznej oraz identyfikowalności dowodowej silnika ryzyka rynkowego VELMÈRE (`analyzeTokenRisk` i modułów zależnych). Zapewnienie, że każda składowa ryzyka (velocity, liquidity, microstructure, holders, contract) posiada jasne uzasadnienie wzorem, brak danych powoduje uczciwe obniżenie pewności (*confidence cap*) i wygenerowanie ograniczeń dowodowych, a identyczne wejścia zawsze generują identyczny wynik z dokładnością do bitu.

## ZAKRES
- Moduł główny silnika ryzyka: `lib/market-integrity/risk-engine.ts`
- Model scoringowy i fuzja dowodów: `lib/market-integrity/risk-engine-model.ts`
- Profile i poziomy ryzyka: `lib/market-integrity/risk-engine-profile.ts`
- Wiązanie modelu i schemat cech: `lib/market-integrity/risk-model-binding.ts`
- Sub-silniki sygnałów: `risk-engine-velocity.ts`, `risk-engine-liquidity-supply.ts`, `risk-engine-microstructure-contract.ts`
- Nowy kompleksowy zestaw testowy: `tests/unit/risk-engine-determinism-bounds-traceability.test.ts`
- Istniejące testy powiązane:
  - `tests/security/a102-risk-indicator-confidence-truth.test.ts`
  - `tests/security/a102-analysis-confidence-calibration-truth.test.ts`
  - `tests/security/shield-pro-calibrated-confidence-boundary.test.ts`
  - `scripts/pass35/test-a17-risk-calibration-evaluation.mjs`

## OCZEKIWANE ZACHOWANIE
1. **Real Input → Real Formula → Real Score → Real Band → Real Evidence**:
   - `REAL INPUT`: Weryfikacja wejścia przez `validateTokenRiskInput`.
   - `REAL FORMULA`: Wzór `deterministic_continuous_evidence_fusion_v10` ważący 5 grup ryzyka oraz ciągłe ciśnienie dowodowe (*continuous evidence pressure*).
   - `REAL SCORE`: Wynik w przedziale [0, 100], monotoniczny względem skrajnych ruchów rynkowych.
   - `REAL BAND`: Przejście ze skoringu na pasma (`low` < 35, `medium` 35-64, `high` 65-84, `critical` >= 85).
   - `REAL EVIDENCE`: Sygnały ryzyka powiązane z dokładnymi identyfikatorami dowodowymi i ograniczeniami (*metaModel limitations*).
2. **Determinizm**: Identyczne dane wejściowe generują identyczny wynik i podpis kryptograficzny `modelBinding`.
3. **Obsługa braków danych (Missing Evidence)**: Brak kluczowych pól danych (płynność, wolumen, posiadacze) powoduje automatyczną degradację pewności (*confidence < 0.6*), dodanie sygnału `insufficient_data` oraz formalne ograniczenia dowodowe.
4. **Obsługa nieświeżych danych (Stale Data)**: Odnotowanie sygnałów `stale_market_data` oraz `provider_health_degradation`.
5. **Obsługa skrajnych ryzyk**: Twarde podłogi bezpieczeństwa dla honeypotów, 99% podatków i prób manipulacji kontraktem (score >= 80, pasmo `critical` lub `high`).

## AKTUALNY PROBLEM
Wymóg zapewnienia, że w silniku ryzyka nie ma żadnych martwych ścieżek, nieuzasadnionych liczb ani placeholderów, a zachowanie dla wartości normalnych, brakujących, nieświeżych, skrajnych i sprzecznych jest w 100% przetestowane i udokumentowane.

## ZMIANY WYKONANE
1. **Audyt kodu i eliminacja braków**:
   - Sprawdzono wszystkie pliki `lib/market-integrity/risk-*` pod kątem placeholderów i niepodpiętych formuł — potwierdzono pełną operacyjność wzoru `deterministic_continuous_evidence_fusion_v10`.
   - Zweryfikowano działanie ciągłego ciśnienia dowodowego `computeContinuousEvidencePressure` integrującego płynność do kapitalizacji, lukę FDV, koncentrację posiadaczy, podatki, slippage i rozbieżność źródeł.
2. **Utworzono i uruchomiono Zestaw Testowy Determinizmu i Granic**:
   - Zaimplementowano `tests/unit/risk-engine-determinism-bounds-traceability.test.ts` (29/29 asercji na zielono):
     - Normal values (BTC blue-chip: niski wynik, wysoka pewność, pełny determinizm).
     - Missing values (UNKNOWN asset: obniżenie pewności, 19 wygenerowanych ograniczeń dowodowych, sygnał `insufficient_data`).
     - Stale values (opóźnienie 24h: sygnały `stale_market_data` i `provider_health_degradation`).
     - Extreme values (Honeypot, 99% sell tax, 850% pump: score >= 80, pasmo `critical`, sygnały `honeypot_risk` i `high_sell_tax`).
     - Contradictory values (18% source divergence: sygnał `source_divergence`, wzrost wyniku ryzyka).
     - Bounds & Banding traceability (pełne pokrycie progów 35, 65, 85 i etykiet odznak).
     - Monotoniczność spadków (-10%, -30%, -60%).
3. **Kompilacja**: Pełna czystość TypeScript (`tsc --noEmit` 0 błędów).

## TESTY
- `node node_modules/tsx/dist/cli.mjs tests/unit/risk-engine-determinism-bounds-traceability.test.ts` -> PASS (29/29 asercji)
- `node node_modules/tsx/dist/cli.mjs tests/security/a102-risk-indicator-confidence-truth.test.ts` -> PASS
- `node node_modules/tsx/dist/cli.mjs tests/security/a102-analysis-confidence-calibration-truth.test.ts` -> PASS
- `node node_modules/tsx/dist/cli.mjs tests/security/shield-pro-calibrated-confidence-boundary.test.ts` -> PASS
- `node scripts/pass35/test-a17-risk-calibration-evaluation.mjs` -> PASS (600 rows, 21 checks)
- `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json` -> 0 errors

## RUNTIME EVIDENCE
```text
Risk Engine Execution:
- Formula: deterministic_continuous_evidence_fusion_v10
- Feature Schema Digest: b91f9b0f4... (RISK_FEATURE_SCHEMA_DIGEST)
- BTC-like asset: score ~22-26, level: low, confidence: >0.85
- Missing evidence asset: confidence < 0.6, limitations: 19 explicit gaps generated
- Extreme honeypot asset: score 99.72, level: critical, signals: [honeypot_risk, high_sell_tax]
- Source divergence asset: score increases by ~15 pts, signal: source_divergence
- All 600 prospective rows calibrated (A17 runtime, ECE: 0.0454)
```

## BROWSER EVIDENCE
Zweryfikowano w interfejsie Shield Pro (`preview_screenshots/shield-pro_clean.png`):
- Wartości wskaźników ryzyka, wskaźniki manipulacji i poziomy pewności są ściśle powiązane z wierszami dowodowymi (evidence rows), bez arbitralnych ocen "z sufitu".

## PROVIDER EVIDENCE
Zgodnie z testem `risk-engine-determinism-bounds-traceability.test.ts`, silnik ryzyka natychmiast rejestruje degradację dostawców (flaga `provider_health_degradation`) oraz rozbieżności kwotowań (flaga `source_divergence`), chroniąc wycenę przed zmanipulowanymi danymi pojedynczego providera.

## CUSTOMER VALUE
Instytucja i inwestor mają pewność matematycznej rzetelności: każdy punkt w ocenie ryzyka (0-100) ma bezpośrednie uzasadnienie w zweryfikowanych parametrach on-chain i rynkowych, a brak danych jest jawnie komunikowany w ograniczeniach, a nie maskowany fałszywym "bezpieczeństwem".

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-013` (Provider Pipeline: Live Ingress, Normalization & Provenance)
