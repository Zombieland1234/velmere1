# Velmère Pass 27 — Market Integrity Full Fix

## Cel
Naprawienie Velmère Shield po audycie UI/użytkownika: brakujące loga tokenów, zbyt łagodny scoring dla parabolicznych wzrostów, brak wyboru interwałów wykresu, brak słupków wolumenu, zbyt chaotyczny układ, brak ładowania większej liczby tokenów oraz scroll strony w tle po otwarciu modala.

## Zmienione obszary
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `lib/market-integrity/coingecko.ts`
- `lib/market-integrity/risk-engine.ts`
- `lib/market-integrity/risk-types.ts`
- `app/api/market-integrity/chart/route.ts`
- `app/api/market-integrity/markets/route.ts`
- `messages/pl.json`
- `messages/en.json`
- `messages/de.json`

## Najważniejsze poprawki
1. **Loga tokenów**
   - Dodany fallback avatar z tickerem, gdy zewnętrzny obrazek nie ładuje się poprawnie.
   - Obrazki używają `referrerPolicy="no-referrer"` i `onError`, więc nie pokazują już brzydkiej ikony uszkodzonego obrazka.

2. **Risk engine**
   - Dodane sygnały:
     - `rapid_intraday_move`
     - `parabolic_24h_gain`
     - `parabolic_7d_gain`
   - Token z mocnym wzrostem 7d, np. +245%, nie dostaje już automatycznie 0/100. System traktuje paraboliczny ruch jako ryzyko market-integrity, nawet jeśli cena rośnie.

3. **Więcej tokenów**
   - Market sweep startuje od 100 tokenów.
   - Dodano przycisk `Load more / Załaduj więcej tokenów`, który pobiera kolejne strony API.
   - Wyszukiwarka nie ogranicza się już tylko do załadowanej tabeli — używa CoinGecko Search API, a potem pobiera dokładny market row po ID.

4. **Popup tokena**
   - Dodane interwały wykresu:
     - 1m
     - 15m
     - 1h
     - 4h
     - 1d
     - 7d
   - Dodany endpoint `/api/market-integrity/chart` oparty o CoinGecko `market_chart`.
   - Wykres zawiera linię ceny i słupki wolumenu, jeśli API zwróci dane volume.
   - Tło modala jest bardziej jednolite i mocniej odcina stronę.
   - Scroll strony w tle jest blokowany przez `body/html overflow hidden` + fixed body restore.

5. **UI/UX**
   - Sekcja hero została zmniejszona i uproszczona.
   - Usunięty ciężki, zbyt długi roadmapowy układ pod tabelą.
   - Tabela działa bardziej jak terminal CoinMarketCap: top/trending/watchlist/highest risk, klik w monetę, popup z kartą wywiadowczą.

6. **Prawnie bezpieczny język**
   - Nadal używamy języka: `risk signal`, `possible manipulation risk`, `market-integrity`, `not legal proof`.
   - System nie pisze twardo “scam”, bo to wymaga dowodu i human review.

## Testy
- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅

## Uwaga techniczna
Pełny live scanner całego rynku w czasie rzeczywistym wymaga docelowo bazy/cache/cron joba. Ta wersja robi live fetch po stronie serwera i umożliwia ładowanie kolejnych stron API oraz wyszukiwanie tokenów poza pierwszą tabelą.
