# PASS-006: Browser / Lens Route & Contract Search

## PASS ID
`PASS-006`

## CEL
Weryfikacja trasy wyszukiwarki `/en/browser` (Velmère Lens), endpointu `/api/search`, integralności transportu tokenów źródłowych (signed source-result transport), oddzielenia wskaźników pokrycia dowodowego od kalibracji ryzyka oraz zachowania zapory praw autorskich dla raportów Lens.

## ZAKRES
- Trasa `/en/browser`
- Komponent wyszukiwarki: `app/[locale]/browser/page.tsx`
- Endpoint API: `app/api/search/route.ts`
- Moduły: `lib/search/search-route-orchestrator.ts`, `lib/search/search-route-crypto-provider.ts`, `lib/search/search-route-market-provider.ts`
- Zestawy testowe bezpieczeństwa:
  - `a102-lens-public-source-metric-truth.test.ts`
  - `a102-lens-report-source-metric-truth.test.ts`
  - `a102-lens-source-token-transport.test.ts`
  - `a102-browser-pdf-evidence-confidence-separation.test.ts`
  - `a102-p36-browser-tier-runtime-profiles.test.mjs`

## OCZEKIWANE ZACHOWANIE
1. Strona `/en/browser` renderuje portal wyszukiwawczy Lens (HTTP 200).
2. Wyszukiwanie tokena (np. BTC) zwraca podsumowanie analityczne oparte wyłącznie na sprawdzonych faktach.
3. Transport danych i tokenów w wynikach wyszukiwania jest kryptograficznie zabezpieczony.
4. Etykiety pokrycia dowodami i wskaźniki ryzyka w widoku Lens nie podszywają się pod certyfikowaną kalibrację modeli bez dowodu.
5. Profile wykonawcze tierów (Basic, Pro, Advanced) dla widoku Browser pozostają ściśle powiązane ze statusem uprawnień.

## AKTUALNY PROBLEM
Potrzeba potwierdzenia pełnego łańcucha walidacji wyszukiwarki i braku halucynacji AI w podsumowaniach Lens.

## ZMIANY WYKONANE
- Zweryfikowano działanie wszystkich powiązanych zestawów testów:
  - `a102-lens-public-source-metric-truth.test.ts` -> PASS
  - `a102-lens-report-source-metric-truth.test.ts` -> PASS
  - `a102-lens-source-token-transport.test.ts` -> PASS
  - `a102-browser-pdf-evidence-confidence-separation.test.ts` -> PASS
  - `a102-p36-browser-tier-runtime-profiles.test.mjs` -> PASS (33 asercje, status kontraktu)
- Potwierdzono brak błędów TypeScript (0 błędów w całym repozytorium).

## TESTY
- Test API: `fetch('/api/search?q=BTC&mode=all&locale=en')` -> zwraca `ok: true`, wygenerowane podsumowanie badawcze i sugestie
- 5 testów jednostkowych/integracyjnych bezpieczeństwa Lens przeszło w 100%

## RUNTIME EVIDENCE
```text
Route: /en/browser (HTTP 200 OK)
API: /api/search (HTTP 200 OK)
Lens firewall & signed transport: 5/5 test suites passed
Browser search input -> Suggestions loaded -> Enter -> Analysis ready
Zrzut ekranu: preview_screenshots/browser_clean.png
```

## BROWSER EVIDENCE
Zbadano zrzut ekranu `preview_screenshots/browser_clean.png`:
- Widok 'Velmère Lens — asset and source search'
- Główny pasek wyszukiwania 'Where should we begin?'
- Szybkie filtry tokenów: BTC, ETH, SOL
- 4 kafelki akcji: 01 Explore Bitcoin Cash, 02 Open in Shield, 03 Relationship map, 04 A4 report

## PROVIDER EVIDENCE
Zgodnie z testem `a102-lens-public-source-metric-truth.test.ts`, metryki publiczne w Lens są chronione zaporą uniemożliwiającą prezentację nieautoryzowanych feedów zewnętrznych bez podpisanych uprawnień.

## CUSTOMER VALUE
Użytkownik wyszukujący dowolne aktywo (krypto, kontrakt, walutę) otrzymuje natychmiastową, zwięzłą syntezę prawdy rynkowej powiązaną ze źródłami, bez marketingowego szumu i halucynacji.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-007` (Security Audits Route Prescreen Intake Flow)
