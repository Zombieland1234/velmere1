# VELMÈRE PASS455 — Human Decision Layer + PDF Forge + Real Markets Universe

## Cel

PASS455 porządkuje wynik dla człowieka. Zamiast kolejnej technicznej tabeli użytkownik najpierw widzi: co potwierdzono, co to znaczy, czego brakuje i jaki jest następny krok.

## Basic / Pro / Advanced

- **Basic · 10**: cena, kapitalizacja, 24h, wolumen, zakres, źródło, świeżość, sufit pewności i następne sprawdzenie.
- **Pro · 14**: 1h/7d, FDV, turnover, drugie źródło, quorum, dług dowodowy i znaczenie rynkowe.
- **Advanced · 20**: płynność wykonania, slippage, depth, koncentracja holderów, unlock pressure, venue health, timestamp drift, source entropy, fake-live risk, narrative drift, lineage, odporność providerów i granica publikacji wniosku.

Wszystkie opisy znaczenia metryk są teraz lokalizowane w PL/DE/EN. Nie ma już sytuacji, w której polski lub niemiecki raport pokazuje angielskie objaśnienia pól.

## Browser i PDF

- domyślnie otwiera się czytelny Reader;
- dokładny PDF 1:1 nadal jest dostępny jako osobna karta;
- cztery etapy animacji V pozostają widoczne i odpowiadają realnemu przepływowi danych;
- podgląd i pobranie nadal korzystają z tego samego payloadu;
- ikona pobierania, focus trap, Escape i blokada scrollowania tła pozostają aktywne;
- strona PDF używa lokalizowanych znaczeń i decision-first układu.

## Real Markets

Dodano domyślną kategorię **Wszystko / Alles / All**. Mieszany katalog zaczyna się od Binance, MEXC, BTC, ETH, AAPL, NVDA, EUR/USD i złota, dzięki czemu użytkownik od razu widzi giełdy, krypto, akcje, FX i surowce. Venue health nadal pozostaje oddzielone od ceny akcji.

## Shield Map

Surowe `unknown` w publicznym copy zostało zastąpione przez czytelne stany: `brak źródła`, `Quelle fehlt`, `source missing`. Typ wewnętrzny może nadal zachować stan techniczny, ale użytkownik nie dostaje debugowego śmietnika.

## Walidacja

- PASS455 verifier
- PASS454 regression
- PASS453 regression
- i18n PL/DE/EN
- Vercel preflight
- ZIP integrity
