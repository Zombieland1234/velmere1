# PASS-008: Shield Map Relationship Topology & Graph UI

## PASS ID
`PASS-008`

## CEL
Weryfikacja trasy topologii powiązań i grafu relacji `/en/shield-map`, integralności modułu `investigator`, granic dokładnej tożsamości zapytań (exact identity handler boundary), odporności na ataki homoglifowe/double-encoding oraz ścisłego rozdzielenia dowodów wejściowych od pewności ocen.

## ZAKRES
- Trasa `/en/shield-map`
- Komponent klienta: `components/market-integrity/ShieldMapCommandClient.tsx`
- Endpoint API: `lib/server/market-integrity-route-modules/investigator.ts`
- Moduły pomocnicze: `shield-map-customer-confidence.ts`, `shield-map-customer-identity.ts`
- Zestawy testów bezpieczeństwa:
  - `a85-shield-map-exact-identity.test.ts`
  - `a102-shield-map-input-sufficiency-truth.test.ts`
  - `shield-map-customer-asset-display-boundary.test.ts`
  - `shield-map-customer-confidence-boundary.test.ts`
  - `shield-map-customer-identity-boundary.test.ts`

## OCZEKIWANE ZACHOWANIE
1. Strona `/en/shield-map` renderuje interfejs grafu powiązań (HTTP 200).
2. Endpoint powiązań poprawnie rozpoznaje i izoluje tożsamość tokenów/adresów, odrzucając próby podstawienia (cross-query substitution, homoglyphy, double-encoding).
3. Brak alternatywnych wywołań po odrzuceniu tożsamości (`alternateProviderCallsAfterIdentityRejection: 0`).
4. Wyświetlanie aktywów i poziomów pewności następuje ściśle w oparciu o zweryfikowane dowody (fail-closed).

## AKTUALNY PROBLEM
Potrzeba poprawy kompatybilności asynchronicznej w `a85-shield-map-exact-identity.test.ts` oraz walidacji całości łańcucha topologicznego.

## ZMIANY WYKONANE
- Zrefaktoryzowano blok wykonawczy w `tests/security/a85-shield-map-exact-identity.test.ts` (zamknięcie asynchroniczne IIFE), eliminując błąd top-level await w środowisku testowym.
- Zweryfikowano działanie wszystkich 5 zestawów testów:
  - `a85-shield-map-exact-identity.test.ts` -> PASS (`PASS_A85_EXACT_IDENTITY_HANDLER_BOUNDARY`, homoglyphs & double encoding rejected)
  - `a102-shield-map-input-sufficiency-truth.test.ts` -> PASS
  - `shield-map-customer-asset-display-boundary.test.ts` -> PASS
  - `shield-map-customer-confidence-boundary.test.ts` -> PASS
  - `shield-map-customer-identity-boundary.test.ts` -> PASS
- TypeScript: 0 błędów (`tsc --noEmit` czyste).

## TESTY
- 5/5 zestawów testowych Shield Map zakończonych sukcesem.
- Zapytanie `/en/shield-map` zwraca status HTTP 200.

## RUNTIME EVIDENCE
```text
Route: /en/shield-map (HTTP 200 OK)
Exact identity boundary: PASS
Cross-query substitution: rejected
Homoglyph injection: rejected
Double encoding injection: rejected
Alternate provider calls after rejection: 0
Zrzuty ekranu: artifacts/forensic/screen_investigation/shield_map_btc_scanned.png, shield_map_page.png
```

## BROWSER EVIDENCE
Zbadano zrzuty ekranu `shield_map_page.png` i `shield_map_btc_scanned.png`:
- Wizualizacja łańcucha analizy: Sources → Facts → Signals → Conflicts → Missing → Confidence → VLM Verdict
- Zeskanowany węzeł BTC z kompletem powiązań i wskaźników ryzyka
- Działający moduł command-line wyszukiwania powiązań

## PROVIDER EVIDENCE
Zgodnie z testem `a85-shield-map-exact-identity.test.ts`, w przypadku odrzucenia tożsamości żadne kolejne zapytania do zewnętrznych providerów nie są wykonywane, co zapobiega atakom typu enumeration/probing.

## CUSTOMER VALUE
Użytkownik badający podejrzany portfel lub token otrzymuje pełną, bezpieczną mapę powiązań płynności i kontraktów bez ryzyka dezinformacji poprzez zmanipulowane identyfikatory.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-009` (Market Impact & Whale Watch Engine Flow)
