# VELMÈRE PASS345 — provider/search/PDF/orbit repair

## Status
PASS345 jest kontynuacją po realnych screenach użytkownika: scroll, dropdown, PDF, Real Markets i provider state. Publiczny prototyp nadal traktować jako ok. 14% finalnego produktu, bo live adaptery, durable source ledger, finalny browser QA i produkcyjne security nadal są P0.

## Co weszło
1. Shield search: usunięty portal `createPortal` dla podpowiedzi i globalny listener scrolla, który powodował repaint/jump podczas przewijania.
2. Shield search: dropdown jest teraz inline/anchored jak VLM Browser, z markerem `data-pass345-inline-search-no-portal` i listą realnych `suggestions`, nie tylko routerowych pozycji.
3. Orbit drawer v4: dodany marker `shield-vlm-detail-panel-pass345` + `data-pass345-scroll-v4`; CSS wymusza native scroll, touch pan-y i wolniejszy right-edge reveal.
4. Real Markets: dodany `real-market-provider-contract` z lane dla crypto depth, equity/disclosure, FX reference, real estate/macro, commodities i proof passport.
5. Real Markets API: `/api/market-integrity/real-markets/provider-contract` zwraca provider contract; `/api/market-integrity/cross-asset` też eksportuje `realMarketProviderContract`.
6. Real Markets UI: dodany provider ribbon i provider chips przy tabeli, żeby placeholder nie wyglądał jak live price.
7. Universal Asset Matrix: rozszerzone z 19 do 23 instrumentów; dodane USD/PLN, QQQ, GLD, BRENT; usunięty duplicate key `XAU/USD`.
8. Lens PDF: v5 ma 5 stron — osobna strona Asset Profile + Provider Contract.
9. Lens PDF: BAT/BTC/ETH/USDT/AAPL/EURUSD dostają inne profile i inne evidence-needed, zamiast generycznego copy.
10. Guard: dodany `verify:pass345-provider-search-pdf-orbit`.

## Testy
- `verify:pass344-user-blocker-repair` ✅
- `verify:pass345-provider-search-pdf-orbit` ✅
- `check:i18n` ✅
- `typecheck` ❌ blokowane przez brak `node_modules` / typów `next`, `react`, `lucide-react`, `@types/node`, `tailwindcss`, `zustand`, itd. W PASS345 usunięto dodatkowy błąd iteracji `.entries()` w PDF route.

## Następny build order
PASS346: CoinGecko/cache full token index + stale/fallback UI + B-query QA.
PASS347: Orbit unique tile copy + drawer accordion + keyboard/ESC/focus trap.
PASS348: PDF renderer v6 visual engine + generated PDF visual regression.
PASS349: Real logos/icon map for stocks/FX/ETF/commodities + deterministic fallback.
PASS350: Security safe-harbor page + CSP/rate-limit readiness.
