# VELMERE TEST RESULTS

Aktualizacja: 2026-06-10

## PASS757–761 — Shield terminal

- `npm ci`: PASS (919 pakietów)
- `tsc --noEmit`: PASS
- `verify:pass757-761-shield-terminal`: PASS
- `git diff --check`: PASS
- Runtime Playwright: oczekuje na wspólny E2E gate; nie oznaczono jako PASS
- Production build: nadal wymaga powtórzenia po ograniczeniu pamięci workera

## PASS762–771 — Real Markets, Shield Map, Lens i PDF

- `verify:pass762-764-real-markets`: PASS
- `verify:pass765-767-shield-map`: PASS
- `verify:pass768-771-lens-pdf`: PASS
- `tsc --noEmit`: PASS po wszystkich zmianach
- Real Markets canonical contract: PASS
- Lens server canonical report → preview/download parity: PASS statyczny i typów
- Runtime Playwright oraz production build: nadal oczekują na wspólny gate

## PASS772–776 — centralny VLM contract, provider i bounded agent

- `verify:pass772-776-vlm-core`: PASS
- `tsc --noEmit`: PASS
- oficjalne `@google/genai`: wdrożone
- stary `@google/generative-ai`: usunięty
- VLM output v3 + canonical fact packet: PASS
- provider retry/cache/dedupe/circuit breaker: PASS statyczny i typów
- bounded tool registry (maks. 3): PASS
- claim firewall + deterministic fallback: PASS
- Gemini live: oczekuje na prawdziwy `GEMINI_API_KEY`; nie oznaczono jako PASS

## PASS777–783 — source truth, claim firewall, memory i AI safety

- `verify:pass777-783-vlm-safety`: PASS
- `eval:vlm-brain`: PASS
- `tsc --noEmit`: PASS
- source arbitration: provider diversity + freshness + provenance + conflicts
- claim firewall: blokuje nieudokumentowane liczby i source IDs
- memory: TTL, limit, clear, brak sekretów
- Unified Angel: jeden provider i jawny fallback
- PL/EN/DE deterministic fallback: PASS w evalach
- token/cost governor + trace/latency/usage/cache: PASS statyczny i typów
- prompt injection redaction: PASS
- 429/5xx retry i circuit breaker: PASS statyczny; live smoke test wymaga klucza


## PASS784–789 — account, commerce, community, accessibility, performance i i18n

- `verify:pass784-789-product-gates`: PASS — 29/29 kontroli.
- pełny `tsc --noEmit` na Node 24.16: PASS.
- `check:i18n`: PASS — zgodność kluczy PL/EN/DE.
- lint zmienionych plików: PASS, 0 błędów i 0 ostrzeżeń po poprawkach.
- konto można utworzyć bez portfela; portfel pozostaje opcjonalny.
- aliasy `/login`, `/member`, `/account` i wersje locale istnieją.
- checkout korzysta z realnego `getCheckoutReadiness`, Stripe i bramek prawnych/fulfilment.
- Square: publiczny odczyt, publikacja po koncie, lokalny status pending i moderation-first.
- Research Lab: jawna granica twierdzeń, falsyfikacja i replikacja.
- globalne aktualizacje UI po każdym click/key/scroll: usunięte.
- historyczny document-wide wheel listener w Shield: przeniesiony na konkretny panel.
- loading states dodane dla Shield, Real Markets, Shield Map i Lens.
- Playwright Chromium: testy zostały przygotowane, ale systemowy Chromium zwraca `ERR_BLOCKED_BY_ADMINISTRATOR` dla lokalnych adresów. Pobranie własnego Chromium zostało zablokowane przez DNS `EAI_AGAIN`. Nie oznaczono E2E jako PASS.
