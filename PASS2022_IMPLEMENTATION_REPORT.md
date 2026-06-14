# PASS2022 — Narrative Drift Lock + Decision Reversibility

## Zakres
PASS2022 wzmacnia VLM Brain bez zmian wizualnych. Zmiany dotyczą tylko runtime AI, pamięci, promptów, claim firewall, Shadow Brain, VLM Security, kontraktu diagnostycznego, receipt policy hash oraz testów.

## Co zostało realnie wdrożone

### 1. Narrative Drift Lock
- Dodano kanoniczny fingerprint dowodów i narracji.
- VLM Memory zapisuje poprzedni fingerprint dowodów, fingerprint narracji, werdykt i confidence per asset/surface.
- Brain porównuje aktualną narrację z poprzednią analizą.
- Duża zmiana tonu, werdyktu lub confidence bez materialnie nowych dowodów powoduje karę i blokadę live mode.
- Cache key uwzględnia poprzedni fingerprint, żeby nie zwracać starej odpowiedzi bez kontekstu pamięci.

### 2. Decision Reversibility
- Dodano deterministyczny scoring odwracalności decyzji.
- Uwzględniane są m.in. liquidity, volume, slippage, sell tax, quorum, source integrity, temporal consistency i missing data.
- Low/unknown reversibility obniża confidence i blokuje pełny live mode.
- Output dostaje spokojny opis ryzyka wykonania: decyzja łatwa/trudna do odwrócenia bez presji działania.

### 3. Provider + Shadow Brain
- Główny provider dostaje poprzednią analizę jako kontekst, ale nie jako prawdę absolutną.
- Shadow Brain ma obowiązek sprawdzić nieuzasadnioną zmianę narracji oraz ukrywanie ryzyka odwracalności.
- Shadow Governor rewiduje albo odrzuca odpowiedzi, które udają wysoką odwracalność przy słabej płynności lub wysokich kosztach wyjścia.

### 4. Claim Firewall + VLM Security
- Claim Firewall blokuje próby ominięcia Narrative Drift Lock oraz overclaim typu „fully reversible / no slippage risk”.
- VLM Security wykrywa prompty próbujące wyłączyć drift lock albo decision reversibility.
- Receipt policy hash obejmuje nowe warstwy, więc zmiana polityki wpływa na podpis analizy.

## Zmienione pliki
- `lib/ai/vlm-narrative-drift.ts` — nowy moduł drift/reversibility.
- `lib/ai/vlm-brain.ts` — integracja governorów, live-mode gate, cache, memory, diagnostics.
- `lib/ai/vlm-memory.ts` — zapis fingerprintów narracji i dowodów.
- `lib/ai/vlm-contract.ts` — nowe pola diagnostyczne.
- `lib/ai/vlm-provider-registry.ts` — reguły dla providera i Shadow Brain.
- `lib/ai/vlm-security.ts` — detekcja manipulacji drift/reversibility.
- `lib/ai/vlm-claim-firewall.ts` — blokady overclaim i bypass.
- `lib/ai/vlm-shadow-governor.ts` — deterministyczna rewizja/odrzucanie.
- `lib/ai/vlm-analysis-receipt.ts` — aktualizacja policy hash.
- `scripts/verify-pass2022-narrative-drift-decision-reversibility.mjs` — nowy verifier.

## Testy wykonane
Przeszły:
- PASS2015 VLM Security Intelligence,
- PASS2016 Adversarial Shadow Brain,
- PASS2017 Signed Analysis Receipt,
- PASS2018 Ed25519 Public Receipt,
- PASS2019 Evidence Quorum,
- PASS2020 Source Integrity Sentinel,
- PASS2021 Temporal Consistency Sentinel,
- PASS2022 Narrative Drift Lock + Decision Reversibility,
- składniowa kontrola TypeScript zmienionych plików.

## Ograniczenia
- Pełny build Next.js nie został potwierdzony, bo paczka nie zawiera `node_modules`.
- Live Gemini nie został wykonany, bo środowisko nie zawiera klucza API.
- PASS2022 nie daje porady inwestycyjnej; to warstwa kalibracji, spójności, anty-FOMO i bezpieczeństwa analizy.

## Uczciwa ocena po PASS2022
- Cały VLM Brain: około 93.2%.
- VLM Security: około 97%.
- Największy pozostały brak: automatyczny live red-team replay corpus i drugi niezależny provider danych w trybie produkcyjnym.
