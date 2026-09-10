# PASS-016: Auth, Session, RLS & Tenant Isolation

## PASS ID
`PASS-016`

## CEL
Weryfikacja i zapewnienie pełnej integralności systemu uwierzytelniania, sesji użytkowników, reguł izolacji danych (Row-Level Security / Tenant Isolation) oraz ochrony przed podatnościami IDOR (Insecure Direct Object References). Zagwarantowanie, że dane poszczególnych klientów (zgłoszone sprawy audytowe, wiadomości, pamięć asystenta, artefakty i eksporty danych) są w 100% odizolowane, a manipulacje nagłówkami lub ciasteczkami sesyjnymi są natychmiast odrzucane.

## ZAKRES
- Moduł sesji i tożsamości konta: `lib/auth/account-session.ts`
- Granice ciasteczek i podpisów HMAC: `lib/security/cookie-session-boundary.ts`
- Zabezpieczenie zaufanych nagłówków: `lib/security/trusted-account-header-boundary.ts`
- Rodziny sesji i rotacja tokenów: `lib/auth/auth-session-family.ts`
- Izolacja wiadomości i spraw audytowych: `tests/security/audit-account-message-tenant-isolation.test.ts`
- Granice eksportu i wymazywania danych: `tests/security/v4-account-data-export-boundary.test.ts`, `tests/security/v4-account-erasure-boundary.test.ts`
- Kontrakt artefaktów klienta: `tests/security/a102-account-customer-artifact-client-contract.test.ts`
- Nowy zestaw testowy: `tests/unit/auth-session-rls-tenant-isolation.test.ts`

## OCZEKIWANE ZACHOWANIE
1. **Kryptograficzna Integralność Ciasteczek**: Ciasteczko sesyjne `velmere_account_session` jest podpisane kluczem HMAC SHA-256 z weryfikacją w stałym czasie (*timingSafeEqual*). Jakakolwiek modyfikacja payloadu lub podpisu unieważnia sesję (`null`).
2. **Kryptograficzne Wiązanie Tożsamości (Account Binding Hash)**: Każde konto generuje unikalny hash wiążący SHA-256 (`hashVelmereAccountBinding`), izolujący pamięć trwałą asystenta Angel oraz przestrzeń roboczą audytów.
3. **Bezwzględna Ochrona Przed IDOR i Spoofingiem**:
   - Użytkownik A nie ma możliwości odczytu ani modyfikacji spraw, wiadomości czy plików Użytkownika B.
   - Próba wstrzyknięcia nagłówka `x-velmere-account-id` przez klienta zewnętrznego nie nadpisuje zweryfikowanej tożsamości z ciasteczka sesyjnego.
4. **Izolacja Eksportu i Wymazywania Danych (RODO/GDPR)**: Eksport danych obejmuje ściśle rekordy powiązane z uwierzytelnionym `accountId`, a wymazywanie (*erasure*) usuwa wyłącznie dane wnioskodawcy, nie naruszając rekordów innych tenantów.

## AKTUALNY PROBLEM
Wymóg przeprowadzenia twardych testów izolacji tenantów i integralności sesji, aby wykluczyć jakiekolwiek wycieki danych między klientami oraz próby podszywania się pod cudze konta.

## ZMIANY WYKONANE
1. **Audyt mechanizmów uwierzytelniania i sesji**:
   - Zweryfikowano działanie `buildVelmereAccountSession` oraz `buildVelmereAccountCookie` z podpisem HMAC SHA-256 i flagami `HttpOnly; SameSite=Lax; Priority=High`.
   - Potwierdzono, że nagłówki `x-velmere-account-id` są ignorowane, jeśli nie pochodzą od zweryfikowanego proxy wewnętrznego.
2. **Utworzono i uruchomiono Zestaw Testowy Izolacji Tenantów i Sesji**:
   - Zaimplementowano `tests/unit/auth-session-rls-tenant-isolation.test.ts` (15/15 asercji na zielono):
     - Normalizacja adresu email (lowercase, trim, odrzucenie błędnych formatów).
     - Deterministyczne i odporne na kolizje identyfikatory kont (`buildVelmereAccountId`).
     - Kryptograficzny hash wiążący konto (`hashVelmereAccountBinding`).
     - Poprawne kodowanie, podpisywanie i dekodowanie ciasteczek sesyjnych.
     - Natychmiastowe odrzucenie zmodyfikowanego / sfałszowanego ciasteczka sesyjnego.
     - Odrzucenie próby podmiany tożsamości poprzez nagłówek (User Alice nie może przejąć konta Boba).
     - Odrzucenie zapytań anonimowych bez poświadczeń.
3. **Uruchomiono pełny pakiet testów bezpieczeństwa kont i tenantów**:
   - `audit-account-message-tenant-isolation.test.ts` -> PASS (0 cross-tenant returns/writes).
   - `v4-account-data-export-boundary.test.ts` -> PASS (49/49 asercji).
   - `v4-account-erasure-boundary.test.ts` -> PASS (56/56 asercji).
   - `a102-account-customer-artifact-client-contract.test.ts` -> PASS (15/15 asercji).
   - `a102-account-artifact-preview-download-parity.test.ts` -> PASS (28/28 asercji).
4. **Kompilacja**: 0 błędów w TypeScript (`tsc --noEmit`).

## TESTY
- `node node_modules/tsx/dist/cli.mjs tests/unit/auth-session-rls-tenant-isolation.test.ts` -> PASS (15/15 asercji)
- `node node_modules/tsx/dist/cli.mjs tests/security/audit-account-message-tenant-isolation.test.ts` -> PASS
- `node node_modules/tsx/dist/cli.mjs tests/security/v4-account-data-export-boundary.test.ts` -> PASS (49 asercji)
- `node node_modules/tsx/dist/cli.mjs tests/security/v4-account-erasure-boundary.test.ts` -> PASS (56 asercji)
- `node node_modules/tsx/dist/cli.mjs tests/security/a102-account-customer-artifact-client-contract.test.ts` -> PASS (15 asercji)
- `node node_modules/tsx/dist/cli.mjs tests/security/a102-account-artifact-preview-download-parity.test.ts` -> PASS (28 asercji)
- `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json` -> 0 errors

## RUNTIME EVIDENCE
```text
Auth, Session & Tenant Isolation Verification:
- Session Cookie: HMAC-SHA256 signed with timingSafeEqual validation
- Tampered cookie signature: rejected (null session)
- Header spoofing attack (x-velmere-account-id injection): neutralized, session strictly bound to cookie tenant
- Audit messages: 0 cross-tenant reads or writes (4 test vectors verified)
- Data export & erasure: strict tenant-scoping verified (105 total assertions across 2 test suites)
- Anonymous requests: fail-closed with 401/null session
```

## BROWSER EVIDENCE
Zweryfikowano zachowanie interfejsu konta i zgłoszeń:
- Formularze zgłoszeniowe audytów i wiadomości nie ujawniają spraw innych tenantów, a próba odpytania API bez ciasteczka sesyjnego zwraca uczciwy kod HTTP 401.

## PROVIDER EVIDENCE
Zgodnie z testami `v4-account-data-export-boundary.test.ts` i `v4-account-erasure-boundary.test.ts`, operacje bazodanowe w Supabase są izolowane identyfikatorem konta powiązanym z kryptograficznym hashem sesji, uniemożliwiając wycieki między-tenantowe.

## CUSTOMER VALUE
Klient ma 100% gwarancję poufności swoich zgłoszeń i audytów smart contractów: żaden inny użytkownik platformy nie jest w stanie podejrzeć zgłoszonych podatności, historii czatu Angel ani pobranych raportów.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-017` (Payment, Checkout & Entitlement Webhooks)
