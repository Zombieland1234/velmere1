# VELMÈRE PASS452 — Source-Bound Depth Lab + Browser/Real Markets QA

## Zakres

- Basic / Pro / Advanced pozostają odpowiednio 10 / 14 / 20 pól, ale raport zyskuje warstwę nietypowych metryk: turnover, premia FDV, amplituda 24h, quorum źródeł, udział podaży w obiegu, sufit pewności, dryf świeżości i next-best probe.
- Brak wartości nie jest pokazywany jako surowe `unknown`; pole wskazuje wymaganą klasę źródła.
- Velmère Browser zachowuje maksymalnie trzy sugestie, cztery etapy animacji V, jeden Blob PDF dla preview/download, ikonę pobierania i twardy scroll lock.
- Czytelny podgląd PDF pokazuje diagnostykę Advanced oraz przetłumaczone wyjaśnienia PL/DE/EN.
- Real Markets zyskuje kolejną paczkę dużych spółek oraz jawny kontrakt: katalog startowy + dynamiczne wyszukiwanie symbolu dostawcy.
- Binance i MEXC pozostają osobnymi venue-health lanes, bez udawania ceny giełdy.
- Dodano opcjonalny browser smoke test dla ścieżki Lens i Real Markets.

## Nowe pliki

- `lib/market-integrity/pass452-source-bound-depth-lab-runtime.ts`
- `scripts/verify-pass452-source-bound-depth-lab.mjs`
- `scripts/e2e-pass452-browser-realmarkets.mjs`

## Walidacja

- `npm run verify:pass452-source-bound-depth-lab`
- `npm run verify:pass451-pdf-exact-preview`
- `npm run check:i18n`
- `npm run vercel:preflight`

Pełny test E2E wymaga działającego lokalnego serwera i zainstalowanego Playwright/Chromium.
