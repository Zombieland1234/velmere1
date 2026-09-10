# PASS-007: Security Audits Route (/en/security/audits) Prescreen Intake Flow

## PASS ID
`PASS-007`

## CEL
Weryfikacja trasy audytów bezpieczeństwa kontraktów `/en/security/audits`, endpointu zgłoszeniowego `/api/audit/basic/case`, tenant isolation dla wiadomości spraw audytowych oraz ścisłego rozgraniczenia poziomów Basic (prescreen queue) od Pro i Advanced (not for sale / commercial freeze).

## ZAKRES
- Trasa `/en/security/audits`
- Komponent: `components/security/SecurityAuditsCleanPage.tsx`
- Endpoint API: `app/api/audit/basic/case/route.ts`
- Zestawy testów bezpieczeństwa:
  - `a102-audit-reachable-customer-output-truth.test.ts`
  - `a102-public-audit-asset-evidence-coverage-truth.test.ts`
  - `audit-account-message-tenant-isolation.test.ts`
  - `audit-execution-packet-release-gate.test.ts`
  - `v4-audit-verify-producer-runtime.test.ts`

## OCZEKIWANE ZACHOWANIE
1. Strona `/en/security/audits` ładuje się z kodem HTTP 200, prezentując formularz zgłoszeniowy BSC oraz porównanie poziomów (Basic Free vs Pro Not for sale vs Advanced Not for sale).
2. Endpoint `/api/audit/basic/case` wymusza uwierzytelnienie klienta przy zapisie sprawy (`401 CUSTOMER_WRITE_AUTH_REQUIRED`), zapobiegając nieautoryzowanym wpisom do kolejki.
3. Wiadomości powiązane z audytem ściśle izolują tenanty (brak wycieków między kontami, 0 cross-tenant reads/writes).
4. Raporty audytowe nie generują fałszywych certyfikatów "Safe" przy braku zweryfikowanych dowodów ze skanera kodu.

## AKTUALNY PROBLEM
Potrzeba naprawy wykonania testu izolacji tenantów pod środowiskiem CJS/TSX oraz weryfikacji całego łańcucha audytowego.

## ZMIANY WYKONANE
- Naprawiono strukturę wywołania `tests/security/audit-account-message-tenant-isolation.test.ts` (usunięto top-level await na rzecz `void main().catch(...)`), co umożliwiło bezbłędne uruchamianie testu przez TSX.
- Zweryfikowano działanie wszystkich 5 zestawów testowych:
  - `a102-audit-reachable-customer-output-truth.test.ts` -> PASS
  - `a102-public-audit-asset-evidence-coverage-truth.test.ts` -> PASS
  - `audit-account-message-tenant-isolation.test.ts` -> PASS (1 positive + 3 fail-closed negatives; 0 cross-tenant returns/writes)
  - `audit-execution-packet-release-gate.test.ts` -> PASS
  - `v4-audit-verify-producer-runtime.test.ts` -> PASS (12/12 testów zielonych)
- TypeScript: 0 błędów.

## TESTY
- 5/5 zestawów testów bezpieczeństwa i tenant-isolation audytu przeszło pomyślnie.
- Zapytanie POST `/api/audit/basic/case` bez tokena autoryzacji zwraca uczciwy kod `401 Unauthorized` (`CUSTOMER_WRITE_AUTH_REQUIRED`).

## RUNTIME EVIDENCE
```text
Route: /en/security/audits (HTTP 200 OK)
Intake API auth enforcement: 401 CUSTOMER_WRITE_AUTH_REQUIRED verified
Tenant isolation: 0 cross-tenant leaks verified
Release gate: PASS
Zrzut ekranu: preview_screenshots/security-audits_clean.png
```

## BROWSER EVIDENCE
Zbadano zrzut ekranu `preview_screenshots/security-audits_clean.png`:
- Nagłówek: 'An audit that exposes risk — without marketing noise'
- Formularz wejściowy adresu kontraktu BSC (`0x...`) z przyciskiem 'SUBMIT PRESCREEN'
- Tabela porównawcza poziomów audytu: Basic (Free - Selected), Pro (Not for sale), Advanced (Not for sale)
- Etykiety możliwości: Automated contract scan, Severity + evidence completeness, Evidence gaps itp.

## PROVIDER EVIDENCE
Zgodnie z `audit-execution-packet-release-gate.test.ts`, pakiety wykonawcze audytu nie mogą być promowane do wydania klientowi bez pełnego podpisu kryptograficznego i kompletu dowodów statycznych.

## CUSTOMER VALUE
Klient zgłaszający smart contract otrzymuje natychmiastową, uczciwą informację o stanie analizy prescreeningu bez złudnych obietnic i bez ryzyka podejrzenia danych przez inne konta.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-008` (Shield Map Relationship Topology & Graph UI)
