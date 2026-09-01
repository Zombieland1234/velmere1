# Velmère PASS4640 — regresja jakości 120/120

Data: 8 lipca 2026

## Wynik po naprawach

Przebadano ponownie 120 przypadków: 30 Shield, 30 Real Markets, 30 PDF i 30 audytów kontraktów. Testy wywoływały bezpośrednio te same endpointy serwerowe, których używa interfejs.

| Moduł | Basic | Pro | Advanced | Najważniejszy wynik |
|---|---:|---:|---:|---|
| Shield | 10/10 HTTP 200 | 10/10 HTTP 422 | 10/10 HTTP 422 | Krypto pozostaje w Shield; przy braku źródeł score jest `null`, a płatne raporty są blokowane. |
| Real Markets | 10/10 HTTP 200 | 10/10 HTTP 422 | 10/10 HTTP 422 | Brak 502; ADS.DE i MC.PA są rozpoznawane poprawnie. |
| Lens PDF | 10/10 prawidłowych PDF | 10/10 HTTP 422 | 10/10 HTTP 422 | Basic generuje 2 strony; płatny PDF bez quorum nie powstaje. Szablony mają kontrakt 2/4/8 stron. |
| Audit Watch | 10/10 HTTP 200 | 10/10 HTTP 422 | 10/10 HTTP 422 | Brak wymyślonego score; zwykła odpowiedź Basic spadła do około 9,2 KB. |

## Co zostało naprawione

1. **Shield i Real Markets są rozdzielone jawnie.** BTC, ETH, SOL i pozostałe kryptowaluty nie wpadają już do `BTC-USD` ani powierzchni Real Markets.
2. **Brak danych nie udaje analizy.** Gdy nie ma potwierdzonych źródeł, klient dostaje `insufficient_data`, score `null`, confidence 0 i czytelną listę braków.
3. **Pro i Advanced są fail-closed.** Bez quorum, release gate i właściwego receipt-u endpoint zwraca 422; checkout nie może sprzedać niedostarczalnego raportu.
4. **ADS.DE i MC.PA nie zwracają już 502.** Są mapowane odpowiednio do adidas AG i LVMH.
5. **PDF ma prawdziwe różnice tierów.** Generator ma kontrakt Basic 2 strony, Pro 4 strony, Advanced 8 stron. W obecnym środowisku Basic powstaje, a płatne poziomy są uczciwie blokowane bez danych.
6. **Audyt klienta nie pokazuje stałych ocen 47/68/71.** Widok bierze score, confidence, verdict i blocker z serwerowego `customerResult`.
7. **Payload audytu został odchudzony.** Basic ma średnio 9.0 KB zamiast około 419 KB (wcześniej nawet około 1,7 MB); pełne macierze operatora są dostępne tylko w trybie `?proof=full`.
8. **Provider calls i ścieżka braku danych są szybsze.** Basic Shield może zakończyć kontrolowany prescreen bez uruchamiania całego płatnego łańcucha AI.

## Twarde wyniki regresji

- Pełna macierz: **120/120**.
- Błędne powierzchnie Shield: **0**.
- Błędne powierzchnie Real Markets: **0**.
- Odpowiedzi 502 w Shield/Real Markets: **0**.
- Liczbowe score przy zerowych źródłach: **0**.
- Płatne analizy rynku błędnie dopuszczone do publikacji: **0**.
- Prawidłowe dwustronicowe PDF Basic: **10/10**.
- Pro PDF zablokowane bez gotowości: **10/10**.
- Advanced PDF zablokowane bez gotowości: **10/10**.
- Audyty z wymyślonym score/confidence bez źródeł: **0**.
- Płatne audyty błędnie wypuszczone: **0**.

## Czy Advanced jest już godne kupna?

**W obecnym lokalnym środowisku — nadal nie można tego uczciwie potwierdzić, dlatego system go nie sprzedaje.** To jest teraz właściwe zachowanie produktu.

Advanced ma sens dopiero wtedy, gdy produkcyjne źródła dostarczą dodatkowe, potwierdzone dowody: source receipts, sprzeczności między providerami, dane ABI/uprawnień, holderów, płynności, filingów oraz finalny podpis release gate. PASS4640 naprawia najważniejszy problem: użytkownik nie zapłaci już wyłącznie za dłuższy tekst lub większą liczbę pól.

## Co jeszcze pozostaje przed sprzedażą Pro/Advanced

- Podłączyć i sprawdzić produkcyjne klucze providerów oraz durable Supabase.
- Wykonać prawdziwy Stripe checkout + webhook + entitlement replay.
- Ustalić minimalne quorum per produkt i przetestować przypadki, w których Pro/Advanced faktycznie przechodzą release gate.
- Dodać browser E2E kliknięć, pobierania PDF, stanu modala i responsywności; bieżąca macierz testuje endpointy i generowane pliki.
- Przeprowadzić testy kontraktów z realnymi ABI/source/holder/liquidity providerami; bez nich wynik pozostaje `insufficient_data`.

## Ograniczenia

Nie użyto produkcyjnych sekretów providerów, prawdziwej płatności Stripe ani trwałej bazy Supabase. Płatne tiery były testowane lokalnym, serwerowym demo entitlementem wyłącznie po to, żeby zweryfikować ich blokady. Nie zmieniano wyglądu strony.
