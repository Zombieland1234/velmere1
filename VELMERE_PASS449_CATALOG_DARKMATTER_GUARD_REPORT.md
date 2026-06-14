# PASS449 — Catalog 413–419 Repair + Architecture Dark Matter Guard

## Naprawione realnie

- `app/api/market-integrity/real-markets/catalog/route.ts` importuje i wykonuje `buildPass413MarketCoverageUniverse()` do `buildPass419MarketCoverageUniverse()`.
- `contract` w katalogu Real Markets zawiera teraz `pass413`–`pass419` oraz `pass449`.
- Rozbito długi jednoliniowy `contract` na wieloliniowy obiekt, żeby kolejne passy nie doklejały ukrytych błędów.
- Naprawiono wcięcia i trzy buildery w jednej linii.
- Dodano liczniki `crypto` i `exchangeTokens` w odpowiedzi katalogu.

## Dark matter guard

Dodano `lib/market-integrity/pass449-architecture-dark-matter-guard.ts` z czterema twardymi kontraktami:

1. `classifyPass449Evidence()` — AI note / memory / PDF text nie mogą wracać jako dowód do risk engine.
2. `pass449RedactForLedger()` — schematyczna, rekurencyjna redakcja PII/secrets przed logiem.
3. `buildPass449IdempotencyKey()` — stabilny klucz pod webhook/order/evidence replay.
4. `pass449ArchitectureDarkMatterGuard` — mapa kolejek, RPC fallback, LLMOps, E2E i wallet state reset.

## Wallet state consistency

`lib/wallet/useWalletConnect.ts` ma teraz listener `accountsChanged` / `chainChanged`. Zmiana konta EVM czyści snapshot i resetuje sesję, żeby UI/token gate nie pracowały na starym adresie.

## Operator logs

`lib/launch/redacted-logger.ts` przepuszcza payload przez PASS449 schema redaction przed regexami. Nested JSON, wallet address, token, secret, stack i email nie powinny wyciec tylko dlatego, że siedzą głębiej w obiekcie.

## Endpoint kontrolny

Dodano `GET /api/market-integrity/architecture-guard`, który zwraca aktywny kontrakt PASS449.

## Walidacja

```bash
npm run verify:pass449-catalog-darkmatter-guard
npm run verify:pass448-depth-report-pdf-realmarkets
npm run check:i18n
npm run vercel:preflight
```
