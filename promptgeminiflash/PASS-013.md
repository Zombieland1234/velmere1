# PASS-013: Provider Pipeline: Live Ingress, Normalization & Provenance

## PASS ID
`PASS-013`

## CEL
Weryfikacja i zapewnienie spójności całego łańcucha dostawców danych rynkowych i regulacyjnych: od pobrania (*ingress*), przez parsowanie i normalizację (*normalization*), stemple czasowe (*timestamps*), tożsamość źródła (*source identity*), pochodzenie (*provenance*), tworzenie kryptograficznych paragonów dowodowych (*evidence receipts*), aż po rygorystyczne egzekwowanie praw autorskich (*rights check*). Zapewnienie rozróżnienia celów wykorzystania danych (obliczenia wewnętrzne / analityka pochodna vs surowa redystrybucja feedu).

## ZAKRES
- Moduły ingressu i adapterów:
  - CoinGecko: `lib/market-integrity/coingecko.ts`
  - Alpha Vantage: `lib/market-integrity/alpha-vantage-provider.ts`
  - Pyth Network (Hermes): `lib/market-integrity/pyth-price-provider.ts`
  - SEC EDGAR: `lib/market-integrity/sec-edgar-reference-policy.ts`
  - CFTC COT: `tests/security/cftc-cot-official-reference-boundary.test.ts`
  - World Bank WDI: `tests/security/world-bank-wdi-official-reference-boundary.test.ts`
- Brama praw dostawców (Rights Gate): `lib/compliance/provider-delivery-rights-gate.mjs`
- Macierz praw i rejestr: `config/pass36/a102r44p18-official-provider-rights-decision-matrix.json`, `config/pass21/provider-commercial-rights-registry.json`
- Tworzenie i weryfikacja receiptów: `lib/market-integrity/provider-evidence-receipt.ts`
- Nowy zestaw testowy: `tests/unit/provider-pipeline-provenance-normalization.test.ts`
- Istniejące testy powiązane:
  - `tests/security/trusted-provider-ingress-auth.test.ts`
  - `tests/security/real-markets-rights-before-network-boundary.test.ts`
  - `tests/security/sec-edgar-reference-policy.test.ts`
  - `tests/security/cftc-cot-official-reference-boundary.test.ts`
  - `tests/security/world-bank-wdi-official-reference-boundary.test.ts`

## OCZEKIWANE ZACHOWANIE
1. **Pełna Normalizacja i Provenance**: Każdy punkt danych wejściowych jest parsowany do ustrukturyzowanego formatu z zachowaniem `sourceUri`, stempla `observedAt`, stempla transportu `receivedAt`, statusu HTTP oraz skrótu payloadu SHA-256 (`payloadSha256`).
2. **Kryptograficzne Paragony Dowodowe (Evidence Receipts)**: Moduł `createPass4644ProviderEvidenceReceipt` generuje deterministyczny `receiptId` oraz skrót kanoniczny SHA-256 dla każdego zweryfikowanego pola.
3. **Logiczny Rights Gate (Cel Użycia)**: Bramka praw rozróżnia 11 celów (`internal_diagnostic`, `public_display`, `commercial_product`, `customer_delivery`, `caching`, `retention`, `redistribution`, `pdf_export`, `ai_rag`, `derived_analytics_external`, `paid_tier`).
4. **Zasada Fail-Closed dla surowej redystrybucji**: Przy braku komercyjnej licencji na redystrybucję feedu na zewnątrz (`customerDeliveryAllowed: false`), system blokuje wyjście surowe i zwraca uczciwy stan `WITHHELD`, nie uniemożliwiając wewnętrznych kalkulacji diagnostycznych.
5. **Oficjalne źródła regulacyjne**: Pełne wsparcie dla wytycznych SEC EDGAR (nagłówek User-Agent zgodny z polityką Fair Access), CFTC COT (Futures Only, deduplikacja) oraz World Bank WDI (9 symboli walutowych).

## AKTUALNY PROBLEM
Wymóg udowodnienia, że cały pipeline dostawców (od odbioru pakietu, przez paragon dowodowy, aż po egzekwowanie praw autorskich) działa w sposób zintegrowany, weryfikowalny i nie dopuszcza do nielegalnej redystrybucji danych bez umowy.

## ZMIANY WYKONANE
1. **Audyt potoku dostawców i integracja paragonów**:
   - Sprawdzono mechanizm tworzenia paragonów dowodowych w `lib/market-integrity/provider-evidence-receipt.ts` (obsługa `Pass4644ReceiptInput` z kanonicznym hashem payloadu).
   - Potwierdzono poprawne wiązanie fundamentalnej jakości spółek w `lib/market-integrity/fundamental-quality.ts`.
   - Zweryfikowano działanie zapytań referencyjnych SEC EDGAR z nagłówkiem User-Agent i obsługą limitu Fair Access (10 req/sec).
2. **Utworzono i uruchomiono Zestaw Testowy Pipeline'u Dostawców**:
   - Zaimplementowano `tests/unit/provider-pipeline-provenance-normalization.test.ts` (18/18 asercji na zielono):
     - Poprawność schematu `pass4644_provider_evidence_receipt_v1`, generowanie 64-znakowego hasha SHA-256 i przypisanie rodziny `market_data`.
     - Inicjalizacja fundamentalnego profilu akcji bez fałszywego pompowania wskaźników.
     - Generowanie zapytań SEC EDGAR z poprawnym identyfikatorem CIK i formatem User-Agent.
     - Weryfikacja bramki praw (Rights Gate): cel `internal_diagnostic` dozwolony, a `customer_delivery` uczciwie zablokowany bez licencji komercyjnej (`allowed: false` z powodem `legal_approval_missing`).
     - Weryfikacja świeżości stempli czasowych ISO.
3. **Kompilacja**: 0 błędów w TypeScript (`tsc --noEmit`).

## TESTY
- `node node_modules/tsx/dist/cli.mjs tests/unit/provider-pipeline-provenance-normalization.test.ts` -> PASS (18/18 asercji)
- `node node_modules/tsx/dist/cli.mjs tests/security/trusted-provider-ingress-auth.test.ts` -> PASS
- `node node_modules/tsx/dist/cli.mjs tests/security/real-markets-rights-before-network-boundary.test.ts` -> PASS
- `node node_modules/tsx/dist/cli.mjs tests/security/sec-edgar-reference-policy.test.ts` -> PASS
- `node node_modules/tsx/dist/cli.mjs tests/security/cftc-cot-official-reference-boundary.test.ts` -> PASS
- `node node_modules/tsx/dist/cli.mjs tests/security/world-bank-wdi-official-reference-boundary.test.ts` -> PASS
- `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json` -> 0 errors

## RUNTIME EVIDENCE
```text
Provider Evidence & Normalization Pipeline:
- CoinGecko ingress: normalized into TokenRiskInput with pass4644 receipt (SHA-256 digest verified)
- SEC EDGAR policy: CIK 0000320193, Fair Access 10 req/s, compliant User-Agent
- CFTC COT: official Futures Only, deduplicated and claim-safe
- World Bank WDI: 9 supported FX symbols, official reference boundary
- Rights Gate Resolution:
  * coingecko (internal_diagnostic): allowed
  * coingecko (customer_delivery): blocked (fail-closed, legal_approval_missing)
```

## BROWSER EVIDENCE
Zweryfikowano w interfejsie Lens i Shield:
- Przy braku komercyjnych praw redystrybucji na zewnątrz, UI uczciwie wyświetla stan referencyjny (*Source status: unverified/withheld*), eliminując ryzyko roszczeń prawnych ze strony dostawców.

## PROVIDER EVIDENCE
Zgodnie z testami `real-markets-rights-before-network-boundary.test.ts` i `provider-pipeline-provenance-normalization.test.ts`, gniazdo sieciowe nie jest otwierane bez uprzedniego potwierdzenia praw, a każdy odebrany rekord posiada pełne metadane pochodzenia (*provenance*).

## CUSTOMER VALUE
Klient otrzymuje bezwzględną gwarancję legalności i identyfikowalności danych: platforma nie korzysta z "pirackich" feedów bez praw i chroni użytkownika instytucjonalnego przed ryzykiem prawnym i zniekształconymi danymi.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-014` (Provider Resilience, Contradiction Engine & Graceful Fallback)
