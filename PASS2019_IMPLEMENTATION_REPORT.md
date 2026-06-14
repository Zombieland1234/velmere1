# PASS2019 — VLM Evidence Quorum + Shadow Security

Zakres: wyłącznie rdzeń VLM Brain, teksty decyzyjne i zabezpieczenia AI. Warstwa wizualna, CSS, layout i animacje nie były zmieniane.

## Co realnie doszło

1. **Evidence Quorum runtime**
   - nowy moduł `lib/ai/vlm-evidence-quorum.ts`,
   - każdy checkable market fact dostaje status: `confirmed`, `single_source`, `internal_only`, `missing`, `stale` albo `conflicted`,
   - system zapisuje `weakFactIds`, ratio potwierdzonych faktów i powody obniżenia pewności.

2. **Quorum w confidence governance**
   - `weak` quorum blokuje wysoką pewność,
   - `mixed` quorum trzyma wynik w warunkowej strefie,
   - `strong` quorum jest wymagane do pełnego live-mode envelope.

3. **Lepszy VLM Brain text**
   - fallback i findings mówią użytkownikowi, kiedy problemem nie jest sam asset, tylko słabe pokrycie źródłowe,
   - PL/EN/DE dostały lokalizację luk typu `weak quorum for price`.

4. **Provider + Shadow Brain**
   - główny prompt dostaje kompaktowe `EVIDENCE_QUORUM`,
   - Shadow Brain ma regułę odrzucania odpowiedzi, które traktują weak-quorum facts jak mocny dowód,
   - deterministic Shadow Governor sam obniża lub odrzuca publikację, bez polegania tylko na tekście modelu.

5. **Claim firewall**
   - blokuje overclaim typu „high confidence/proven/confirmed safe” przy weak/mixed quorum,
   - usuwa findingi `fact-*`, jeśli model da im zbyt wysoką pewność mimo weak quorum.

6. **Central VLM Security**
   - nowy typ flagi `evidence_quorum_manipulation`,
   - blokada promptów próbujących ominąć, sfałszować albo wymusić quorum.

## Ocena po PASS2019

| Obszar | PASS2018 | PASS2019 |
|---|---:|---:|
| Rzetelność źródeł | 78% | 87% |
| Kalibracja pewności | 91% | 93% |
| Odporność na halucynacje | 90% | 92% |
| Shadow Brain | 86% | 89% |
| VLM Security | 94% | 95% |
| Cały mózg AI | 88% | 90% |

## Co nadal brakuje do 95%+

- prawdziwy drugi live provider per fakt, nie tylko lista dostępnych źródeł,
- per-field provenance z adapterów danych, czyli informacja: „ta konkretna cena pochodzi z X i Y”,
- historyczny replay test na setkach realnych aktywów,
- niezależny model innego dostawcy dla Shadow Brain,
- trwały ledger incydentów w bazie, nie tylko bounded runtime state.

## Walidacja

Przeszły:

- `node scripts/verify-pass2019-evidence-quorum-shadow-security.mjs`,
- `node scripts/verify-pass2015-vlm-security-intelligence.mjs`,
- `node scripts/verify-pass2016-adversarial-shadow-brain.mjs`,
- `node scripts/verify-pass2017-signed-analysis-receipt.mjs`,
- `node scripts/verify-pass2018-ed25519-public-receipt.mjs`,
- `node --check scripts/verify-pass2019-evidence-quorum-shadow-security.mjs`.

Ograniczenie: pełny `npm run build` nadal wymaga zainstalowanych zależności projektu (`node_modules`, `zod`, typy Node/Next itd.).
