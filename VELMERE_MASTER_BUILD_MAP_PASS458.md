# Velmère Master Build Map — PASS458

## A. Browser / Lens PDF
- [x] Zachować preview = download z PASS451–456.
- [x] Utrzymać czteroetapową animację V.
- [x] Utrzymać scroll lock i ikonę download.
- [>] Następny: PDF ma pokazywać panel Provider Truth Router w języku strony.

## B. Basic / Pro / Advanced
- [x] Basic/Pro/Advanced dostają source-bound metryki zależne od klasy aktywa.
- [x] Advanced dostaje FDV, source contract i provider plan.
- [x] Krypto używa market cap z CoinGecko, nie placeholdera.
- [>] Następny: przenieść PASS458 source contract do Browser PDF reader.

## C. Real Markets
- [x] Dodany PASS458 Provider Truth Router.
- [x] Crypto route: CoinGecko + Binance klines.
- [x] Stock/ETF/REIT/FX/commodity route: compatibility fallback + wymóg głównego providera.
- [x] Venue health route: status/depth/websocket, bez fikcyjnej ceny.
- [>] Następny: keyed Alpha Vantage route dla stock/FX/commodity.

## D. Shield AI
- [x] PASS457 bot pozostaje połączony z wynikiem Shield.
- [x] PASS458 payload przekazuje sourceContract/sourcePolicy/providerPlan do modalu.
- [>] Następny: bot ma cytować providerPlan w odpowiedziach.

## E. Shield Map / VLM Brain
- [x] Handoff PASS453 nadal działa.
- [>] Następny: Orbit node ma pokazywać truthState zamiast ogólnego source state.

## F. Market data sources
- [x] CoinGecko: cena, market cap, FDV, supply, volume.
- [x] Binance: candles/klines dla krypto.
- [x] Alpha Vantage: przygotowany jako truth lane dla stock/FX/commodity.
- [x] Venue health: przygotowany pod websocket/depth/status adapter.

## G. UI / UX
- [x] Modal ma nowy panel PASS458 Provider Truth Router.
- [x] Brak źródła jest widoczny po ludzku, nie jako surowe unknown.
- [x] Compatibility fallback jest jawnie opisany.

## H. i18n
- [x] PL/DE/EN preflight przechodzi.
- [>] Następny: dodać słownikowe tłumaczenia wszystkich nowych providerPlan zamiast częściowo angielskich technicznych fraz.

## I. Build / QA
- [x] PASS453–PASS458 regresje zielone.
- [x] Vercel preflight zielony.
- [ ] Lokalny `next build` po stronie użytkownika.

## J. Kolejny pass
PASS459: keyed provider expansion — Alpha Vantage quote/overview for stocks, FX reference route, commodity method tags, PDF provider truth section, Shield AI answer contract.
