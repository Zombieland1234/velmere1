# PASS-005: Real Markets Route (/en/real-markets) Catalog & Stock Feeds

## PASS ID
`PASS-005`

## CEL
Weryfikacja trasy `/en/real-markets` pod kątem prawidłowego działania katalogu multi-asset (akcje, ETF-y, surowce, metale), prawidłowego egzekwowania praw dostawców przed zapytaniami sieciowymi (*rights before network*) oraz spójności prezentacji 585 aktywów w trybie referencyjnym/cross-surface.

## ZAKRES
- Trasa `/en/real-markets`
- Moduł katalogu: `lib/search/real-market-lens.ts`
- Orchestrator: `lib/market-integrity/real-markets-route-orchestrator.ts`
- Granice praw sieciowych: `real-markets-rights-before-network-boundary.test.ts`
- Spójność między-powierzchniowa: `a102-real-markets-cross-surface-truth.test.ts`
- Test jednostkowy katalogu: `tests/unit/real-markets-customer-catalog.test.ts`

## OCZEKIWANE ZACHOWANIE
1. Trasa `/en/real-markets` zwraca HTTP 200 na desktopie i urządzeniach mobilnych.
2. Status praw autorskich: zapytania bez uprzedniej weryfikacji praw są blokowane przed otwarciem gniazda sieciowego (*rights before network policy*).
3. Katalog z powodzeniem udostępnia uniwersum co najmniej 555-585 instrumentów (AAPL, NVDA, MSFT, GOOGL, AMZN, BTC.D, XPD/USD itd.).
4. Wszystkie instrumenty posiadają prawidłowe identyfikatory, unikalne symbole i bezpieczne etykiety 'source_bound' lub 'provider pending'.

## AKTUALNY PROBLEM
Weryfikacja zachowania trasy i testów bezpieczeństwa Real Markets.

## ZMIANY WYKONANE
- Utrzymano w 100% integralność testów:
  - `tests/security/real-markets-rights-before-network-boundary.test.ts` (PASS)
  - `tests/security/a102-real-markets-cross-surface-truth.test.ts` (PASS)
  - `tests/unit/real-markets-customer-catalog.test.ts` (10/10 PASS)
- Zachowano zero błędów TypeScript (`tsc --noEmit` czyste).

## TESTY
- `node node_modules/tsx/dist/cli.mjs tests/security/real-markets-rights-before-network-boundary.test.ts` -> PASS
- `node node_modules/tsx/dist/cli.mjs tests/security/a102-real-markets-cross-surface-truth.test.ts` -> PASS
- `node node_modules/tsx/dist/cli.mjs tests/unit/real-markets-customer-catalog.test.ts` -> PASS (10/10 testów zielonych)
- Kompilator tsc: 0 errors

## RUNTIME EVIDENCE
```text
Route: /en/real-markets (HTTP 200 OK)
Catalog size: 585 instruments validated
No physical network leakage on unverified rights (0 calls)
Unit test: 10 passed, 0 failed
Zrzut ekranu: preview_screenshots/real-markets_clean.png
```

## BROWSER EVIDENCE
Zbadano zrzut ekranu `preview_screenshots/real-markets_clean.png`:
- Status '585 catalog ready'
- Prezentacja akcji AAPL, NVDA, MSFT, GOOGL, AMZN z wykresami trajektorii i metrykami
- Prawidłowo wyrenderowany układ tabeli ze złotymi akcentami

## PROVIDER EVIDENCE
Zgodnie z testem `real-markets-rights-before-network-boundary.test.ts`, żadne zapytanie sieciowe (Yahoo Finance / Stooq) nie zostaje wysłane w środowisku produkcyjnym, jeśli preflight praw autorskich nie posiada statusu zatwierdzonego (*'rights denial happens before every provider socket'*).

## CUSTOMER VALUE
Klient otrzymuje stabilny katalog rynkowy dla setek instrumentów tradycyjnych bez ryzyka naruszenia regulacji prawnych lub wycieków telemetrycznych.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-006` (Browser / Lens Route & Contract Search)
