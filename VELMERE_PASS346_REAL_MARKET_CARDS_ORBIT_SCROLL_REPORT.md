# VELMÈRE PASS346 — Real Markets cards + Orbit scroll hardlock

## Status
PASS346 jest odpowiedzią na nowe screeny i opis użytkownika: Real Markets nie może być poziomą, ciężką tabelą z debug copy; Exchange Stability nie może powtarzać tego samego objaśnienia w każdym wierszu; Second Source Divergence musi być zrozumiały dla ludzi; Orbit drawer po kliknięciu kafelka musi przewijać się zawsze, nie losowo.

Publiczny prototyp nadal traktować jako ok. 15% finalnego produktu: PASS346 poprawia UX i czytelność, ale prawdziwe provider keys, durable source ledger, browser QA, PDF visual regression i security production hardening nadal są P0.

## Co weszło
1. Real Market Terminal: usunięty publiczny poziomy table-first layout i zamieniony na responsywne karty assetów.
2. Każdy stock/FX/ETF/real estate/commodity dostaje kartę jak Shield: logo/avatar, symbol, nazwa, class chip, price lane, risk pill, mini trend, AI copy i source/proof/second-source lanes.
3. Dodana mapa logotypów dla real stocks i proxy: Apple, Nvidia, Microsoft, Coinbase, JPMorgan, LVMH, SPY, QQQ, VNQ, GLD plus deterministic fallback dla FX/commodities.
4. Exchange Stability: zamienione z szerokiej tabeli na karty giełd. Jedno objaśnienie “Stability wyżej = lepiej / social niżej = lepiej” jest tylko w nagłówku, nie powtarza się pod każdym wierszem.
5. Second Source Divergence: zamienione z nieczytelnej tabeli na reader cards z trzema krokami: Primary → Second source → Missing before confidence.
6. Second Source public copy jest pokazany po ludzku: bez mylenia stock disclosure z rezerwami giełd.
7. Orbit 360 drawer: dodany PASS346 hardlock scroll. Wheel delta jest ręcznie kierowany do panelu (`panel.scrollTop += event.deltaY`), więc scroll nie powinien raz wpadać w body/orbit, a raz w drawer.
8. Orbit drawer: CSS wymusza fixed right-edge panel, `overflow-y: scroll`, `touch-action: pan-y`, `overscroll-behavior: contain`, brak containment blokującego scroll.
9. Dodany guard `verify:pass346-real-market-cards-orbit-scroll`.
10. Zachowana kompatybilność PASS344/PASS345 guardów.

## Testy
- `verify:pass346-real-market-cards-orbit-scroll` ✅
- `verify:pass345-provider-search-pdf-orbit` ✅
- `verify:pass344-user-blocker-repair` ✅
- `check:i18n` ✅
- `typecheck` ❌ dalej blokowane przez brak środowiska zależności/typów w paczce eksportowej (`next`, `react`, `lucide-react`, `@types/node`, `tailwindcss`, `zustand`, itd.).

## Research direction
- Binance zostaje głównym pierwszym market-data lane dla crypto orderbook/klines/ticker.
- MEXC zostaje websocket lane z obowiązkowym heartbeat/reconnect/expiry/fallback state.
- LVMH/DPP wzmacnia kierunek proof-passport: traceability, provenance, transparency i customer-readable trust.

## Następny build order
PASS347: Orbit unique tile copy + drawer accordion/read mode + focus trap/ESC/mobile QA.
PASS348: PDF renderer v6 visual engine + downloaded PDF visual regression.
PASS349: Full logo/icon provider map + image cache + deterministic fallback for all assets.
PASS350: Security safe-harbor page + CSP/rate-limit readiness.
PASS351: CoinGecko/cache full token index + stale/fallback UI + B-query QA.
