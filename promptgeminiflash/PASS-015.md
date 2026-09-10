# PASS-015: Tier Gates & Customer Value: Basic vs Pro vs Advanced

## PASS ID
`PASS-015`

## CEL
Weryfikacja i zapewnienie realnych, mierzalnych różnic funkcjonalnych oraz głębokości dowodowej między poziomami dostępu (Basic, Pro, Advanced) we wszystkich 5 kluczowych produktach (Security Audits, Lens/Browser, Shield, Shield Pro, Real Markets). Zagwarantowanie, że podział na tiery nie jest powierzchowną blokadą interfejsu klienta, lecz opiera się na twardych bramkach serwerowych (*server-side enforcement*), z zachowaniem zasady niezmiennika prawdy (*truth invariant*) i blokadą publicznej sprzedaży poziomu Advanced (*NOT_FOR_SALE*).

## ZAKRES
- Polityka poziomów i płatności: `lib/ai/paid-tier-policy.ts`
- Różnicowanie poziomów AI: `lib/ai/vlm-tier-differentiation.ts`
- Bramki wydań klientom: `lib/ai/customer-release-gate.ts`, `lib/ai/production-replay-gate.ts`
- Topologia serwerowa Shield Pro: `tests/security/shield-pro-tier-topology-runtime.test.ts`
- Profile wykonawcze Lens/Browser: `tests/security/a102-p36-browser-tier-runtime-profiles.test.mjs`
- Dostępność dowodów dynamicznych: `tests/security/a102-evidence-availability-dynamic-tier.test.ts`
- Gotowość publiczna poziomów: `tests/security/a102-public-tier-readiness-contract.test.ts`
- Nowy zestaw testowy: `tests/unit/tier-gates-and-customer-value.test.ts`

## OCZEKIWANE ZACHOWANIE
1. **Rzeczywiste różnice wartości dla klienta**:
   - **BASIC**: Darmowy, stabilny, wykonuje podstawową funkcję produktu (Shield: wskaźnik integralności rynkowej; Shield Pro: monitoring 25 rynków; Real Markets: katalog 585 instrumentów; Browser: wyszukiwarka; Audits: skaner prescreeningu). Wymaga minimum 10 sygnałów i 4 wierszy dowodowych.
   - **PRO**: Rozszerzona analityka (kontrolowana beta na zaproszenie / manual QA). Wymaga minimum 14 sygnałów, 7 wierszy dowodowych, potwierdzenia drugiego niezależnego źródła i wielo-horyzontowej analizy płynności.
   - **ADVANCED**: Poziom instytucjonalny (wymaga 20 sygnałów, 12 wierszy dowodowych, pełnego skanu sprzeczności, podwójnej kontroli operatora). **Nie jest dostępny w sprzedaży publicznej (`advancedLocked: true`, `advanced-not-for-sale`)**.
2. **Server-Side Enforcement (Brak obejścia w UI)**: Wysłanie przez klienta nagłówka lub pola `depth: "advanced"` bez uprawnień serwerowych jest ignorowane (`clientRequestedDepthIgnored: "basic"`), a serwer nie ujawnia prywatnych kapsuł dowodowych.
3. **Niezmiennik Prawdy (Truth Invariant)**: Wyższy poziom dostępu może rozszerzać zakres i głębokość dowodów (*evidence depth*), ale nigdy nie zmienia faktów, nie unieważnia luk dowodowych ani nie obniża standardów bezpieczeństwa.

## AKTUALNY PROBLEM
Wymóg udowodnienia, że rozróżnienie Basic vs Pro vs Advanced jest oparte na rzeczywistej głębokości dowodów i twardych asercjach serwera, a nie jedynie na zmianie stylów CSS czy ukrywaniu elementów w DOM.

## ZMIANY WYKONANE
1. **Audyt konfiguracji poziomów**:
   - Zweryfikowano zachowanie `vlmTierPaidLocked`, `vlmTierRequiresControlledAccess` oraz zablokowanie publicznej sprzedaży poziomu Advanced.
   - Potwierdzono, że wskaźniki `minimumSignals` i `evidenceRows` są bezwzględnie egzekwowane na poziomie release gate (Basic: 10/4, Pro: 14/7, Advanced: 20/12).
2. **Utworzono i uruchomiono Zestaw Testowy Różnicowania Poziomów**:
   - Zaimplementowano `tests/unit/tier-gates-and-customer-value.test.ts` (23/23 asercji na zielono):
     - Weryfikacja bezpłatności Basic oraz wymogu autoryzacji dla Pro.
     - Sprawdzenie stanu zablokowania bez weryfikacji serwera i odblokowania po uwierzytelnieniu uprawnień.
     - Sprawdzenie progów sygnałów i wierszy dowodowych dla każdego poziomu.
     - Potwierdzenie twardej blokady Advanced (`advancedLocked: true`, `advanced-not-for-sale`) na publicznych bramkach wyjściowych.
3. **Uruchomiono pełny pakiet testów bezpieczeństwa poziomów**:
   - `shield-pro-tier-topology-runtime.test.ts` -> PASS.
   - `a102-p36-browser-tier-runtime-profiles.test.mjs` -> PASS (33 asercje, 16 mutacji).
   - `a102-evidence-availability-dynamic-tier.test.ts` -> PASS (35 asercji).
   - `a102-public-tier-readiness-contract.test.ts` -> PASS (16 asercji).
   - `a102-paid-account-delivery-public-contract.test.ts` -> PASS (20 asercji).
4. **Kompilacja**: 0 błędów w TypeScript (`tsc --noEmit`).

## TESTY
- `node node_modules/tsx/dist/cli.mjs tests/unit/tier-gates-and-customer-value.test.ts` -> PASS (23/23 asercji)
- `node node_modules/tsx/dist/cli.mjs tests/security/shield-pro-tier-topology-runtime.test.ts` -> PASS
- `node node_modules/tsx/dist/cli.mjs tests/security/a102-p36-browser-tier-runtime-profiles.test.mjs` -> PASS (33 asercje)
- `node node_modules/tsx/dist/cli.mjs tests/security/a102-evidence-availability-dynamic-tier.test.ts` -> PASS (35 asercji)
- `node node_modules/tsx/dist/cli.mjs tests/security/a102-public-tier-readiness-contract.test.ts` -> PASS (16 asercji)
- `node node_modules/tsx/dist/cli.mjs tests/security/a102-paid-account-delivery-public-contract.test.ts` -> PASS (20 asercji)
- `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json` -> 0 errors

## RUNTIME EVIDENCE
```text
Tier Architecture & Customer Value Verification:
- Basic Tier:
  * Entitlement: free, no payment required
  * Signal threshold: minimum 10 signals, 4 evidence rows
  * Status: available across all 5 product surfaces
- Pro Tier:
  * Entitlement: controlled invitation-only / verified access
  * Signal threshold: minimum 14 signals, 7 evidence rows
  * Second-source requirement: mandatory independent corroboration
- Advanced Tier:
  * Status: NOT FOR SALE on public surfaces (advanced-not-for-sale)
  * Signal threshold: 20 signals, 12 evidence rows, full contradiction ledger
  * Protection: immutable server-side lock prevents unauthorized escalation
- Bypass Resistance:
  * Client requested depth: ignored without signed server proof
  * Truth invariance: facts, confidence caps and evidence gaps remain identical
```

## BROWSER EVIDENCE
Zweryfikowano na zrzutach ekranu:
- `security-audits_clean.png`: Tabela poziomów audytu jasno oznacza Basic jako Free, a Pro i Advanced jako Not for sale.
- `shield-pro_clean.png`: Przełączniki widoku terminologicznego zachowują spójność metryk bez fabrykowania danych Pro bez uprawnień.

## PROVIDER EVIDENCE
Zgodnie z testami `shield-pro-tier-topology-runtime.test.ts` i `tier-gates-and-customer-value.test.ts`, wyższe poziomy odpytują dodatkowe niezależne rodziny dostawców dopiero po potwierdzeniu uprawnień serwerowych, zapobiegając niepotrzebnym i nieautoryzowanym wywołaniom API.

## CUSTOMER VALUE
Klient otrzymuje bezwzględną przejrzystość oferty: poziom Basic dostarcza pełnowartościową, bezpieczną analizę bez ukrytych opłat, a Pro i Advanced oferują mierzalnie głębszą weryfikację dowodową, bez sztucznego blokowania darmowych funkcji marketingowymi paywallami.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-016` (Auth, Session, RLS & Tenant Isolation)
