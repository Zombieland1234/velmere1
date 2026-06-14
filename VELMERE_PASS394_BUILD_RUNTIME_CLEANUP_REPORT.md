# PASS394 — Build Runtime Cleanup

## Cel
Naprawić aktualny blocker `app/api/search/lens-report/route.ts` oraz wyczyścić drobne runtime/UI błędy, które powodowały, że podpowiedzi wyszukiwania w Browser / Shield / Shield Map / Real Markets potrafiły odpiąć się od inputa albo renderować z awaryjnych współrzędnych.

## Naprawiony build error
Next.js/SWC blokował build, bo `??` było miksowane z `||` bez nawiasów w wielu polach `symbol`.

Zamiast powielać ten sam fallback, PASS394 dodaje jeden kontrakt:

```ts
const routeSymbolFallback = route.label.slice(0, 3).toUpperCase();
const reportSymbolCandidate = result?.symbol ?? cleanQuery.toUpperCase();
const resolvedReportSymbol = reportSymbolCandidate || routeSymbolFallback;
```

Następnie wszystkie sekcje AI Brain/PDF używają `resolvedReportSymbol`.

## Naprawione zachowanie search dropdown
- VLM Browser: podpowiedzi nie re-pozycjonują się już po scrollu strony; zamykają się i czyszczą stary frame, więc nie uciekają po ekranie.
- Shield main: scroll czyści także `suggestPanelFrame`, żeby nie wracały stare koordynaty.
- Shield Map: portal nie renderuje się już z fallbackiem `top: 180 / left: 24`; musi mieć prawdziwy frame z inputa.
- Real Markets: search portal zamyka się na scrollu strony zamiast „lecieć” za użytkownikiem.
- PDF modal: dopięty z-index/body lock PASS394 nad headerem.

## Guard
`npm run verify:pass394-build-runtime-cleanup`

Guard sprawdza:
- brak starego miksu `result?.symbol ?? cleanQuery.toUpperCase() || ...`;
- istnienie `resolvedReportSymbol`;
- brak fallbackowego renderu Shield Map suggestions;
- Browser/Real Markets nie re-pozycjonują dropdownów na scrollu strony;
- wszystkie pliki TS/TSX w `app`, `components`, `lib` parsują się przez TypeScript transpiler bez błędów składni.

## Wzorce produktowe
- MEXC: używać depth/k-line jako provider-ready freshness/market structure, nie jako fake-live obietnic.
- Aura/LVMH: luxury trust ma iść w stronę passport / authenticity / traceability, czyli u Velmère: premium proof, nie agresywna presja zakupu.

## Wynik
PASS394 jest hotfixem produkcyjnym: usuwa build blocker i czyści główną klasę UI bugów z odpinającymi się portalami wyszukiwania.
