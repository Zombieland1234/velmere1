# PASS430 — Brain Answer Verifier Runtime

Zakres: bugfix całej paczki + dalsze ulepszanie mózgu AI, bez dokładania ciężkiego Orbit 360.

## Implementacja

- Dodano `lib/market-integrity/pass430-brain-answer-verifier-runtime.ts`.
- Mózg dostał `proofState`, `responseMode`, `answerReadinessScore`, `proofChecklist`, `proofLedger`, `answerEnvelope`, `memoryLearningFence` i `repairPlan`.
- `risk-brain.ts` buduje i zwraca `pass430` oraz dodaje linię PASS430 do decision path.
- Lens report buduje `pass430` jako customer-facing proof contract bez technicznego copy.
- API `/analyze`, `/brain`, `/chat`, `/angel` zwracają `pass430` do debugowania/operatora.

## Guardy jakości

- Pamięć wieloletnia nie może nadpisać świeżych źródeł.
- Drugi provider i missing data muszą być widoczne przed mocniejszą odpowiedzią.
- Ten sam payload zostaje źródłem dla PDF, preview i odpowiedzi.
- Brak claimów typu sentience, buy/sell, gwarancja ceny, ukryty provider.
- Basic/Pro/Advanced dalej korzystają z tego samego truth-source.

## Walidacja

- `npm run verify:pass430-brain-answer-verifier-runtime`
- `npm run check:i18n`
- `npm run vercel:preflight`
