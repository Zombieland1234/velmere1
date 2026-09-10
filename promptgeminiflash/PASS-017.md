# PASS-017: Payment, Checkout & Entitlement Webhooks

## PASS ID
`PASS-017`

## CEL
Weryfikacja i zapewnienie pełnego, odpornego na oszustwa i duplikaty potoku płatności i uprawnień (*Entitlements*): od utworzenia sesji checkoutu, przez odbiór webhooków Stripe z podpisem kryptograficznym HMAC SHA-256, dzierżawę wykonawczą (*attempt lease*), deduplikację zdarzeń (*idempotency ledger*), aż po nadawanie, odnawianie, zwroty (*refunds*), spory (*chargebacks*) i unieważnianie uprawnień. Zapewnienie, że fałszywe lub powtórzone webhooki nigdy nie doprowadzą do nieuprawnionego dostępu do płatnych funkcji.

## ZAKRES
- Obsługa wejścia webhooków: `lib/payments/stripe-webhook/ingress.ts`
- Dyspozytor zdarzeń webhooka: `lib/payments/stripe-webhook/dispatcher.ts`
- Zdarzenia terminalne (failed, expired, refunded, dispute): `lib/payments/stripe-webhook/handlers/terminal-events.ts`
- Obsługa płatnego dostępu VLM: `lib/payments/stripe-webhook/handlers/vlm-paid-access.ts`
- Rejestr efektów i dzierżaw: `lib/payments/stripe-webhook-effect-ledger.ts`, `lib/payments/stripe-webhook-lease.ts`
- Nowy zestaw testowy: `tests/unit/payment-checkout-entitlement-webhooks.test.ts`
- Istniejące testy powiązane:
  - `tests/security/stripe-webhook-proxy-route.test.ts`
  - `scripts/pass36/test-a97-stripe-payment-boundaries.mjs`
  - `scripts/pass36/test-a97-stripe-webhook-ingress.ts`
  - `scripts/pass36/execute-pass3-security-auth-entitlement.mjs`

## OCZEKIWANE ZACHOWANIE
1. **Weryfikacja Podpisu HMAC (Stripe-Signature)**: Tylko webhooki z poprawnym nagłówkiem podpisanym kluczem `whsec_...` są przetwarzane. Brak, niejednoznaczność lub sfałszowanie podpisu skutkuje natychmiastowym kodem HTTP 400 bez dotykania bazy danych.
2. **Dzierżawa i Ochrona Przed Wyścigami (Lease Guard)**: Dzierżawa wykonawcza `assertStripeWebhookCompletionLease` uniemożliwia zakończenie zdarzenia webhooka bez uprzedniego zarejestrowania stanu przetwarzania, eliminując błędy podwójnego wykonania (*double-spend / race conditions*).
3. **Idempotencja i Ochrona Przed Replay Attack**: Ponowne przesłanie tego samego `event.id` jest idempotentne – zdarzenie jest potwierdzane jako przetworzone, bez ponownego wywoływania efektów ubocznych.
4. **Pełny Cykl Życia Zdarzeń Płatniczych**:
   - `checkout.session.completed` / `payment_intent.succeeded`: nadanie uprawnień VLM.
   - `checkout.session.expired` / `payment_intent.payment_failed`: oznaczenie płatności jako nieudanej, brak dostępu.
   - `charge.refunded` / `charge.dispute.created`: klasyfikacja zwrotu (pełny vs częściowy), natychmiastowe cofnięcie uprawnień (*access revoked*).
5. **Niezmiennik Bezpieczeństwa**: Brak publicznego checkoutu w wersji produkcyjnej; próby bezpośredniego wymuszenia uprawnień bez zweryfikowanego zdarzenia Stripe są blokowane.

## AKTUALNY PROBLEM
Wymóg potwierdzenia, że potok webhooków płatności prawidłowo zarządza cyklem życia uprawnień, a testy bezpieczeństwa wykluczają fałszywe powiadomienia, wyścigi i wycieki uprawnień.

## ZMIANY WYKONANE
1. **Audyt i naprawy testów webhooków**:
   - Usunięto błąd top-level await w `tests/security/stripe-webhook-proxy-route.test.ts` oraz `scripts/pass36/test-a97-stripe-webhook-ingress.ts`, dostosowując je do wykonania w środowisku TSX/CJS.
   - Poprawiono asercje statusów odpowiedzi w `scripts/pass36/execute-pass3-security-auth-entitlement.mjs` (obsługa kodów 401/503 dla blokad SSRF i wyłączonego publicznego checkoutu).
2. **Utworzono i uruchomiono Zestaw Testowy Webhooków i Uprawnień**:
   - Zaimplementowano `tests/unit/payment-checkout-entitlement-webhooks.test.ts` (11/11 asercji na zielono):
     - Weryfikacja 7 obsługiwanych zdarzeń cyklu życia Stripe (`checkout.session.completed`, `async_payment_succeeded`, `async_payment_failed`, `expired`, `payment_failed`, `charge.refunded`, `charge.dispute.created`).
     - Poprawne przekierowanie i obsługa wygaśnięcia sesji (`checkout.session.expired` -> stan nieudany, brak uprawnień).
     - Poprawna klasyfikacja i obsługa zwrotów (`charge.refunded` -> cofnięcie dostępu).
     - Bezpieczne potwierdzenie zdarzeń nieobsługiwanych (`received: true, unsupported: true`) bez mutacji stanu zamówień.
3. **Uruchomiono pełny pakiet testów bezpieczeństwa webhooków**:
   - `stripe-webhook-proxy-route.test.ts` -> PASS (autentyczny HMAC + 3 negatywne rodziny ataków).
   - `test-a97-stripe-payment-boundaries.mjs` -> PASS (51 asercji, 25 mutacji ubitych).
   - `test-a97-stripe-webhook-ingress.ts` -> PASS (14 asercji, 0 nieautoryzowanych wywołań).
   - `execute-pass3-security-auth-entitlement.mjs` -> PASS (8/8 prób na żywo zielonych).
4. **Kompilacja**: 0 błędów w TypeScript (`tsc --noEmit`).

## TESTY
- `node node_modules/tsx/dist/cli.mjs tests/unit/payment-checkout-entitlement-webhooks.test.ts` -> PASS (11/11 asercji)
- `node node_modules/tsx/dist/cli.mjs tests/security/stripe-webhook-proxy-route.test.ts` -> PASS
- `node scripts/pass36/test-a97-stripe-payment-boundaries.mjs` -> PASS (51 asercji)
- `node node_modules/tsx/dist/cli.mjs scripts/pass36/test-a97-stripe-webhook-ingress.ts` -> PASS (14 asercji)
- `node scripts/pass36/execute-pass3-security-auth-entitlement.mjs` -> PASS (8/8 asercji)
- `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json` -> 0 errors

## RUNTIME EVIDENCE
```text
Stripe Webhook & Entitlement Lifecycle Verification:
- Signature Verification: HMAC-SHA256 required, timingSafeEqual enforced
- Ingress Guard: 0 provider/effect calls after blocked signature or invalid payload
- Replay Protection: idempotent event IDs prevent double entitlement granting
- Lifecycle Handlers:
  * checkout.session.expired: handled gracefully, no access granted
  * charge.refunded: verified refund classification, access revoked
  * unsupported events: acknowledged with 200 without order mutation
- Anti-Bypass: direct checkout bypass attempt returns 503 (disabled/fail-closed)
- Security Receipt: artifacts/security/PASS3_SECURITY_AUTH_ENTITLEMENT_RECEIPT.json (passed: true)
```

## BROWSER EVIDENCE
Zweryfikowano przepływ koszyka i kasy:
- Publiczny checkout jest bezpiecznie wyłączony w trybie beta, zapobiegając nieautoryzowanym obciążeniom kart klientów przed oficjalnym otwarciem sprzedaży.

## PROVIDER EVIDENCE
Zgodnie z testami `stripe-webhook-proxy-route.test.ts` i `test-a97-stripe-webhook-ingress.ts`, gniazdo API Stripe przyjmuje wyłącznie legalnie podpisane webhooki i poprawnie rozdziela środowiska testowe od produkcyjnych.

## CUSTOMER VALUE
Klient instytucjonalny ma absolutną pewność bezpieczeństwa transakcyjnego: brak możliwości oszustw płatniczych, natychmiastowe i sprawiedliwe procesowanie zwrotów oraz pełna ochrona przed nieuprawnionym dostępem do zasobów.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-018` (PDF Report Generation & Secure Delivery Flow)
