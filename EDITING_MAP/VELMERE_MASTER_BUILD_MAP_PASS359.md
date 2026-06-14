# VELMERE MASTER BUILD MAP - PASS359

## PASS359 - Browser init, exact search, PDF spacing, public trim

### Naprawione realnie w kodzie
- VLM Browser/Lens: dropdown podpowiedzi wraca bezposrednio pod input zamiast wisiec pod karta przez globalny PASS340 floating rule.
- VLM Browser/Lens: ETH / BTC / USDT / BAT / BNB / SOL exact query ma tryb single-result. Exact symbol/id/name nie oddaje listy z Tetherem albo innymi monetami.
- CoinGecko live lane: ranking nie uzywa juz surowego `includes()` jako glownego filtra dla krotkich zapytan. Najpierw symbol/id/name, potem prefix, dopiero na koncu dluzszy substring.
- Search seed: dodany Tether / USDT z logo CoinGecko i stablecoin copy.
- PDF Lens: page 2 dostal bezpieczniejsze A4 spacing, mniej cadence boxes, wieksze odstepy i marker przeciw overlapowi.
- PDF Lens: rozszerzone asset profiles dla SOL, BNB, NVDA, XAU/Gold + zachowane BTC/ETH/BAT/USDT/AAPL/FX.
- Shield public surface: PASS294-PASS313 operator sync waterfall ukryty na publicznej powierzchni, zeby UI nie wygladal jak dump operatora.
- Orbit drawer: dodany PASS359 right-edge drawer class, wolniejsze wejscie, native scroll zone, touch-action pan-y i trim operatorowych blokow.
- Vercel preflight: zachowane compatibility markers dla starszych guardow po inline stabilization.

### Testy
- npm run verify:pass359-browser-init-search-pdf-trim - PASS
- npm run verify:pass358-browser-search-logo-resolver - PASS
- npm run verify:pass357-market-width-logo-grid - PASS
- npm run check:i18n - PASS
- npm run vercel:preflight - PASS

### Nieoznaczone jako zrobione
- Typecheck/build nieodpalony, bo eksportowa paczka nie ma `node_modules`.
- Pelny UI QA w przegladarce musi byc zrobiony u uzytkownika po instalacji zaleznosci.

### Kolejne ID
- PASS360: Search panel component extraction + keyboard navigation hard QA.
- PASS361: Shield/Shield Map exact ranking wspolny modul.
- PASS362: PDF generator V3 - wiecej ludzkiego copy i asset-specific sections bez ASCII-lamanych polskich znakow.
- PASS363: Orbit 360 drawer content diet + slow neural reveal.
- PASS364: Real Markets card mode zamiast tabel publicznych.
