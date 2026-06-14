# PASS471 — Surface Runtime Resilience, Provider Fuzzing and Receipt Drawer

## Cel
PASS471 naprawia klasę błędów, której nie wychwytują statyczne markery: częściowe albo uszkodzone odpowiedzi providerów. Priorytetem było utrzymanie widocznego interfejsu Browser / Real Markets / Orbit nawet wtedy, gdy API zwróci `null`, brak symbolu, `NaN`, błędną świecę albo niepełną tablicę.

## 1. Real Markets: normalizacja przed Reactem
Dodano `lib/market-integrity/pass471-surface-runtime-resilience.ts` z trzema głównymi normalizerami:

- `normalizePass471CatalogRows`
- `normalizePass471ProviderSearchRows`
- `normalizePass471Quotes`

Zmiany eliminują bezpośrednie wykonywanie `.replace()`, `.toLowerCase()`, `.map()` i formatowania liczb na niezweryfikowanych wartościach providera.

### Zachowanie przy błędnym payloadzie
- rekord bez symbolu jest odrzucany;
- brak nazwy używa symbolu;
- brak źródła pokazuje `Source required`;
- nieznana klasa katalogu przechodzi do kontrolowanej klasy i operator review;
- `NaN` / Infinity stają się `null`;
- niepełna świeca jest odrzucana;
- high/low są korygowane do prawidłowych granic względem open/close;
- duplikaty symboli są usuwane.

## 2. Real Markets: miejsca integracji
`CrossAssetCollapseRadarPanel.tsx` korzysta z PASS471 na czterech granicach:

1. pobranie pełnego katalogu,
2. zdalne wyniki wyszukiwania,
3. batch quotes widocznych wierszy,
4. detail quote wybranego instrumentu.

Oznacza to, że częściowy rekord nie powinien już wywołać crasha całej tabeli.

## 3. Orbit 360 / Shield Map
`ShieldMapClient.tsx` nie zakłada już, że symbol sugestii zawsze jest stringiem.

- `suggestionGlyph(symbol: unknown)` używa bezpiecznej normalizacji;
- `shieldMapTokenLogo(symbol: unknown)` nie wykonuje `.trim()` na pustej wartości;
- scoring sugestii toleruje brak nazwy i symbolu.

## 4. Receipt history drawer
Dotychczas historia PDF była ograniczona wizualnie do trzech chipów. PASS471 dodaje:

- rozwijany drawer;
- pełną listę do 20 poprawnych lokalnych receiptów;
- symbol, depth, confidence, source count, filename i timestamp;
- `aria-expanded` i `aria-controls`;
- copy PL/DE/EN;
- jawny komunikat, że receipty są lokalne i nie zawierają treści raportu.

Naprawiono też semantykę `total`: wcześniej licznik pokazywał liczbę elementów po obcięciu listy. Teraz pokazuje wszystkie poprawne, unikalne receipty.

## 5. Receipt integrity
`buildPass470ReceiptHistory` dodatkowo:

- odrzuca niepoprawne daty;
- usuwa duplikaty po `receiptId`;
- sortuje dopiero zweryfikowane elementy;
- zachowuje redaction boundary `no_raw_payload`.

## 6. Fuzz verifier
Dodano `scripts/verify-pass471-surface-runtime-resilience.mjs`.

Testy semantyczne obejmują:

- katalog z `null` i brakującym symbolem;
- duplikaty AAPL;
- nieznany quote type;
- quote z `NaN`;
- świecę z odwróconymi high/low;
- świecę bez timestampu;
- duplikaty receiptów;
- receipt z niepoprawną datą;
- kolizje nazw natywnych konstruktorów.

## 7. Playwright scenario
Dodano `scripts/e2e-pass471-malformed-payload-resilience.mjs`.

Test interceptuje katalog i quote API, zwraca celowo uszkodzone dane, otwiera Real Markets i sprawdza brak widocznego runtime overlay. Test jest gotowy, ale nie został uruchomiony w sandboxie z powodu braku Playwright/Chromium.

## Zmienione / dodane pliki
- `lib/market-integrity/pass471-surface-runtime-resilience.ts`
- `lib/market-integrity/pass470-browser-runtime-qa.ts`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `scripts/verify-pass471-surface-runtime-resilience.mjs`
- `scripts/e2e-pass471-malformed-payload-resilience.mjs`
- `package.json`

## Walidacja wykonana
- `npm run verify:pass466-browser-market-pdf-waterfall`
- `npm run verify:pass467-result-priority-runtime`
- `npm run verify:pass468-browser-shield-orbit-handoff`
- `npm run verify:pass469-pdf-a4-download-receipt`
- `npm run verify:pass470-browser-runtime-qa`
- `npm run verify:pass471-surface-runtime-resilience`
- `npm run check:i18n`
- `npm run vercel:preflight`
- pełny syntax sweep: 775 TS/TSX, 0 błędów

## Test nieuruchomiony
`npm run e2e:pass471-malformed-payload-resilience` zakończył się kontrolowanym statusem skip, ponieważ Playwright/Chromium nie są zainstalowane.

## Blockery środowiskowe
- brak `node_modules` — brak pełnego `next build`;
- brak Chromium/Playwright — brak wizualnego screenshot comparison;
- live provider smoke wymaga sieci, kluczy oraz działających publicznych endpointów.
