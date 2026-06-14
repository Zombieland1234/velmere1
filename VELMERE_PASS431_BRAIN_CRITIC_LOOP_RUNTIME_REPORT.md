# VELMÈRE PASS431 — Brain Critic Loop Runtime

Scope: bugfix całej paczki + dalsze ulepszanie mózgu AI. Angel pozostaje zaparkowany jako gateway, a aktualny focus to verifier/critic przed publiczną odpowiedzią, PDF i chat.

## Implementacja

- Dodano `lib/market-integrity/pass431-brain-critic-loop-runtime.ts`.
- Dodano `buildPass431BrainCriticLoopRuntime(...)` dla głównego risk brain.
- Dodano `buildPass431LensCriticContract(...)` dla Lens/PDF.
- `risk-brain.ts` buduje i zwraca `pass431` oraz dopisuje go do `decisionPath`.
- `lib/search/lens-report.ts` dodaje `pass431` do resolved report payload.
- API `/analyze`, `/brain`, `/chat`, `/angel` zwracają `pass431` jako diagnostykę mózgu.
- Dodano `scripts/verify-pass431-brain-critic-loop-runtime.mjs` i script npm.

## Co robi PASS431

- Critic loop przed publiczną odpowiedzią.
- Wykrywa powtórki w ledgerze i missing data.
- Ucina za mocne claimy przy braku quorum, drugim providerze albo niskim confidence.
- Pilnuje field budget 10/14/20.
- Trzyma pamięć latami jako context, ale nie pozwala jej nadpisać świeżych źródeł.
- Wymusza jeden payload i jeden porządek sekcji dla PDF/chat.

## Guardy

- Brak sentience claim.
- Brak buy/sell instruction.
- Brak drugiego generatora narracji.
- Brak `NEXT_PUBLIC_*AI/KEY/ANGEL`.
- Lens ma dalej max 3 sugestie i customer-facing copy.
