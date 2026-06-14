# Velmère Pass 30 — Market Integrity Search/Chart Polish Repair

## Naprawione elementy

- Pole wyszukiwania startuje puste, bez domyślnego `SOL`.
- Podpowiedzi wyszukiwania zostały ograniczone do 3 kompaktowych wyników.
- Ikony tokenów są proxowane przez `/api/market-integrity/icon`, żeby CoinGecko/Dex Screener nie zostawiały pustych avatarów w UI.
- Popup tokena używa portalu i najwyższego z-indexu, z pełnym tłem nad headerem.
- Blokada scrolla tła została uproszczona: popup nie przestawia już `body` na `position: fixed`, więc po zamknięciu nie powinien cofać strony na początek.
- Przywrócono domyślny liniowy wykres ceny jako `Wykres 1`.
- Dodano drugi tryb wykresu: `Słupki` jako osobny histogram wolumenu/aktywności.
- Dodano przycisk Shield w headerze obok wyboru języka/globusa.
- Zmniejszono hero i kafelki informacyjne, żeby strona nie wyglądała jak przeładowane demo.
- W VLM Pro dopisano warstwę `Velmère Shield` jako część cyber/RegTech: velocity, liquidity, order book i contract-risk signals.

## Granice obecnego działania

Aktualna wersja nie jest modelem AI przeszukującym dowolny internet. To live terminal oparty o publiczne API i reguły risk-engine:

- CoinGecko: market data, search, chart.
- DEX Screener: fallback dla par/tokenów DEX.
- Binance public depth: order book dla par USDT, jeśli istnieją.
- GoPlus: token security dla kontraktów EVM, jeśli jest znany adres kontraktu.

Docelowe moduły typu social NLP, mempool forensics, GNN wallet clustering, cross-chain heuristics i multi-agent data fusion są opisane jako architektura R&D, nie jako gotowe produkcyjne API w tej paczce.

## Testy

- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
