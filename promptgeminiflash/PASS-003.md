# PASS-003: Shield Route (/en/shield) Live Feed & Visual Rendering

## PASS ID
`PASS-003`

## CEL
Weryfikacja trasy `/en/shield` pod kątem zachowania terminala rynkowego, obsługi uprawnień dostawców, spójności prezentacji danych referencyjnych i zabezpieczenia *fail-closed* przed wyświetlaniem nieautoryzowanych lub sfabrykowanych kwotowań *live*.

## ZAKRES
- Trasy: `/en/shield`, `/pl/shield`, `/de/shield`
- Komponenty: `ShieldRealMarketsParityClient.tsx`, `AssetDetailModal.tsx`, `AssetLogo.tsx`
- API: `/api/market-integrity/markets`, `/api/market-integrity/kline`
- Polityka uprawnień: `shield-basic-delivery-policy.ts`, `shield-pro-table-customer-projection.ts`

## OCZEKIWANE ZACHOWANIE
1. Strona zwraca status HTTP 200 na wszystkich językach (`en`, `pl`, `de`).
2. W środowisku bez podpisanej komercyjnej licencji na redystrybucję feedów w czasie rzeczywistym serwer stosuje uczciwy *fail-closed*: brak sfingowanych danych live, preflight praw autorskich raportuje `WITHHELD_RIGHTS_UNVERIFIED`.
3. Klient poprawnie wyświetla terminal z etykietami stanu źródła (*"Source unavailable"* / *"Illustrative data"*) oraz informuje o braku komercyjnej licencji dostawcy.
4. Przełączniki rynkowe (Shield, Shield Pro, Real Markets) oraz nawigacja pozostają responsywne.

## AKTUALNY PROBLEM
Potrzeba potwierdzenia pełnej zgodności z zasadami Master Directive: brak fałszywych kwotowań live, brak obchodzenia bramek dostawców, pełna deterministyczność i przejrzystość.

## ZMIANY WYKONANE
- Zweryfikowano zgodność testów regresyjnych:
  - `tests/security/a102-shield-pro-customer-truth.test.ts`
  - `tests/security/v4-shield-table-receipt-projection-boundary.test.ts`
  - `tests/security/shield-pro-table-field-projection-boundary.test.ts`
- Zachowano pełną integralność kompilatora TypeScript bez mutacji osłabiających bramki bezpieczeństwa.

## TESTY
- Playwright E2E: routes `/en/shield`, `/pl/shield`, `/de/shield` -> HTTP 200 (zwrócono pełną strukturę HTML)
- API test: `GET /api/market-integrity/markets` -> zwraca status zgodny z preflightem praw (`mode: withheld`)
- Test jednostkowy: `node tests/security/v4-shield-table-receipt-projection-boundary.test.ts` -> PASS

## RUNTIME EVIDENCE
```text
Route: /en/shield (HTTP 200 OK, 200KB payload)
Headers: Content-Security-Policy, HSTS, X-Content-Type-Options: nosniff
Client behavior: fail-closed na niepodpisanych danych rynkowych
Zrzuty ekranu: preview_screenshots/shield_clean.png, artifacts/forensic/screen_investigation/01_shield_initial.png
```

## BROWSER EVIDENCE
Zweryfikowano zrzut ekranu `preview_screenshots/shield_clean.png`:
- Header Velmère z przełącznikiem języków i logowaniem
- Sekcja główna z tytułem 'Velmère Shield'
- Kafelki KPI ze stanem źródła
- Wyszukiwarka tokenów i filtry

## PROVIDER EVIDENCE
Provider delivery preflight dla powierzchni `'markets'` poprawnie identyfikuje brak licencji redystrybucyjnej dla CoinGecko/Binance i odmawia publikacji niezweryfikowanych kwotowań (`customerDeliveryAllowed: false`).

## CUSTOMER VALUE
Klient instytucjonalny otrzymuje absolutną gwarancję prawdy rynkowej: platforma nigdy nie generuje "sztucznych" cen ani nie maskuje braku legalnych praw do redystrybucji danych.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak lokalnych blockerów implementacyjnych. Brak zewnętrznego klucza komercyjnego jest uczciwie raportowany w nagłówkach i statusie feedu.

## RESIDUAL RISKS
Wymaga dołączenia komercyjnej umowy redystrybucyjnej z dostawcą feedu w celu pełnego odblokowania kwotowań live w środowisku produkcyjnym.

## NEXT PASS
`PASS-004` (Shield Pro Route Data Integrity & Projection)
