# Velmère PASS2014 - Brain & Security World-Class Matrix

## Ocena po PASS2014

| Obszar | Ocena | Co już działa | Co dzieli od poziomu światowego |
|---|---:|---|---|
| Rozumowanie VLM Brain | 82% | tiered reasoning, alternatywne wyjaśnienia, falsyfikator, anti-FOMO | niezależny judge model, benchmark na setkach realnych przypadków |
| Rzetelność faktów | 84% | canonical fact packet, schema, claim firewall, unsupported-number gate | pełne pokrycie wszystkich klas aktywów i pól fundamentalnych |
| Źródła i provenance | 72% | niezależni providerzy, freshness, source IDs, confidence cap | realny multi-provider quorum, podpisy snapshotów, source contamination graph |
| Kalibracja pewności | 86% | pewność ograniczona jakością, brakami, konfliktami i evidence coverage | kalibracja empiryczna na historycznych wynikach i Brier score |
| Basic / Pro / Advanced | 83% | różne protokoły myślenia, nie tylko różna długość | osobne benchmarki i kontrakty danych dla każdej klasy aktywów |
| Jakość tekstów PL / EN / DE | 81% | naturalniejszy fallback, lokalne etykiety, spokojny język | profesjonalny review native-speaker i pełna terminologia finansowa DE/PL |
| Anti-FOMO / autonomia decyzji | 91% | brak presji, scarcity, fear amplification i trade calls | testy behawioralne z użytkownikami i pomiar błędnej interpretacji |
| Prompt injection | 85% | NFKC, zero-width, wielojęzyczne wzorce, encoded payload quarantine | zewnętrzny detector/model armor i ciągle aktualizowany corpus ataków |
| Ochrona sekretów i danych | 86% | redakcja kluczy, bearerów, seedów, haseł i output inspection | DLP klasy enterprise, klasyfikacja PII i retencja per typ danych |
| Pamięć AI | 80% | hash klucza, TTL, limit, scope asset/surface, poison rejection | trwała pamięć z consent, wersjonowaniem i kryptograficznym audytem |
| Bezpieczeństwo narzędzi | 88% | allowlista, schema args, asset boundary, max 3, deduplikacja | capability tokens, per-tool risk policy i human approval dla akcji |
| API abuse / koszt | 79% | limity requestów, payloadu, URL, tokenów i circuit breaker | trwały distributed limiter, per-user quotas i anomaly detection |
| Odporność na halucynacje | 84% | source firewall, schema, fallback, missing-data discipline | adversarial shadow model i automatyczny contradiction resolver |
| Red-team / testy | 68% | scenariusze statyczne, injection, memory poison, unsafe claims | duży corpus, fuzzing Unicode/JSON, live CI i regularne testy zewnętrzne |
| Monitoring i incydenty | 64% | diagnostyka, trace ID, provider errors, audit receipts w części systemu | centralny AI SOC, alerty, metryki driftu, playbook i automatyczny rollback |
| Gotowość produkcyjna AI | 76% | bezpieczny fallback i ograniczona autonomia | pełny build/live load test, SLA providerów, observability i disaster drills |

**Średnia ważona po PASS2014: 81%.**

To jest mocny, świadomie ograniczony system analityczny. Nie jest jeszcze uczciwie "najlepszy na świecie", ponieważ nie ma pełnego multi-provider quorum, rozbudowanego live red-team corpus, niezależnego judge modelu i empirycznej kalibracji na dużym zbiorze.

## Wdrożone w PASS2014

1. Epistemic Governor:
   - wymusza dowód przeciwny do głównej tezy,
   - blokuje mylenie korelacji z przyczyną,
   - rozdziela facts-only, bounded interpretation i counterfactual review,
   - oblicza evidence coverage oraz uncertainty budget.
2. Prompt Security Inspection:
   - Unicode NFKC,
   - usuwanie zero-width i directional controls,
   - wykrywanie encoded payloadów,
   - wzorce PL / EN / DE,
   - klasyfikacja block / review / none.
3. Memory Poisoning Defense:
   - pamięć przypięta do aktywa i powierzchni,
   - hashowany identyfikator sesji,
   - podejrzane pytania i odpowiedzi nie trafiają do pamięci.
4. Tool Capability Boundary:
   - allowlista,
   - ścisły asset ID,
   - maksymalnie trzy wywołania,
   - deduplikacja powtarzanych tool calls.
5. Output Security:
   - pełny raport, findings, contradictions, next checks i missing data są kontrolowane,
   - odpowiedź providera jest skanowana przed publikacją,
   - podejrzany prompt VLM przechodzi do bezpiecznej analizy faktów bez jego instrukcji.
6. Endpoint Hardening:
   - limity URL, body i częstotliwości,
   - kontrola origin dla POST,
   - bezpieczne odpowiedzi bez cache.

## Droga do 95%

| Priorytet | Nowy moduł | Efekt |
|---|---|---|
| P0 | Multi-Provider Evidence Quorum | cena, wolumen, timestamp i kluczowe fakty zatwierdzane przez minimum 2 niezależne źródła |
| P0 | Adversarial Shadow Brain | drugi model próbuje obalić analizę przed publikacją |
| P0 | AI Security Event Ledger | każde odrzucenie promptu, narzędzia i claimu trafia do redagowanego rejestru incydentów |
| P0 | Live Red-Team CI | automatyczny corpus prompt injection, Unicode, JSON smuggling, memory poison i tool escape |
| P1 | Calibration Lab | Brier score, reliability curves i kalibracja confidence per klasa aktywa |
| P1 | Temporal Contradiction Engine | porównuje bieżący wniosek z historią i wykrywa nagłą zmianę narracji bez zmiany danych |
| P1 | Source Contamination Graph | wykrywa, gdy pozornie różne strony kopiują dane z jednego pierwotnego źródła |
| P1 | Signed Analysis Receipt | hash faktów, źródeł, modelu, prompt policy i wyniku dla późniejszej weryfikacji |
| P1 | Asset-Class Brains | osobne kontrakty reasoning dla crypto, stocks, ETF, FX, commodities, REIT i audit/security |
| P2 | User Misinterpretation Simulator | sprawdza, czy tekst może zostać błędnie odebrany jako sygnał kupna, gwarancja lub oskarżenie |

## Innowacje do poziomu 100%

### Counterfactual Twin

Każda analiza tworzy dwie konkurencyjne interpretacje: benign i adverse. Werdykt może zostać opublikowany dopiero po wskazaniu faktu rozstrzygającego między nimi.

### Evidence Half-Life

Każdy claim ma własny okres ważności. Cena może starzeć się w minutach, filing w miesiącach, a status kontraktu po każdym upgrade. Pewność spada według realnej natury dowodu, nie jednego globalnego TTL.

### Decision Reversibility Score

System ocenia nie tylko ryzyko aktywa, ale też koszt pomyłki i odwracalność decyzji. Im trudniej wyjść z błędnej decyzji, tym wyższy próg dowodowy.

### Narrative Drift Lock

VLM nie może nagle zmienić tonu z calm na critical bez wskazania nowych faktów, źródeł lub konfliktów, które uzasadniają zmianę.

### Proof-of-Non-Knowledge

Raport podpisuje także to, czego model nie wie. Brak danych staje się kontrolowanym artefaktem audytowym, a nie pustym polem do uzupełnienia narracją.

### Attack-to-Test Compiler

Każdy realny odrzucony atak jest automatycznie redagowany, anonimizowany i zamieniany w nowy test regresyjny. Obrona rośnie wraz z próbami ataku.

## Zasada końcowa

Velmère ma być najlepsze nie dlatego, że mówi najpewniej, lecz dlatego, że najlepiej odróżnia:

`co wiadomo -> czego nie wiadomo -> co może być innym wyjaśnieniem -> co zmieni ocenę -> jaki jest najbezpieczniejszy kolejny test`
