# PASS464 Implementation Report — Fundamental Quality Layer

## Cel
Rozszerzyć Real Markets z prostych pól `OVERVIEW` o źródłową ocenę jakości sprawozdań i funduszy. PASS464 ma pokazywać, czy dane finansowe są kompletne i świeże, a nie tylko wyświetlać wycenę. Brakujące kwartały, częściowy bilans albo niedostępny benchmark nie mogą zamieniać się w syntetyczne zera ani zbyt pewny werdykt.

## Wdrożenia

### 1. Statement-aware fundamentals
- Dodano `lib/market-integrity/pass464-fundamental-quality.ts`.
- Akcje i REIT wykorzystują osobne payloady `INCOME_STATEMENT`, `BALANCE_SHEET` oraz `CASH_FLOW`.
- TTM powstaje wyłącznie z czterech kompletnych kwartałów; w innym przypadku używany jest jawny raport roczny albo stan `source required`.
- Dług nie jest sumowany z częściowego bilansu. Wymagany jest `totalDebt` albo komplet short-term + long-term debt.
- Liczone są m.in. FCF TTM, marża FCF, cash conversion, current ratio, debt/equity, debt/EBITDA oraz net debt/EBITDA.

### 2. Filing i freshness
- Gdy dostępny jest CIK i `SEC_USER_AGENT`, serwer może pobrać ostatni 10-Q, 10-K, 20-F lub 40-F z SEC submissions.
- Bez SEC data końca okresu pozostaje jawnym proxy — nie jest nazywana datą filing.
- Freshness ma stany `fresh`, `aging`, `stale`, `missing`.
- Stary raport, częściowe sprawozdania i brak prawdziwej daty złożenia obniżają `qualityScore` i `confidenceCap`.

### 3. ETF / REIT concentration
- ETF profile pobiera do 100 dostępnych pozycji zamiast tylko dekoracyjnego top-10.
- Liczone są concentration top 1/3/5/10, holdings HHI, effective holdings, top-3 sectors i sector HHI.
- Benchmark overlap jest wyliczany tylko z jawnie pobranego drugiego profilu holdings.
- Brak benchmarku pozostaje `comparison_required` lub `unsupported`.

### 4. Provider i quota safety
- Ciężkie zapytania fundamentals uruchamiają się wyłącznie w detail mode.
- Alpha Vantage quota reservation jest atomowa w procesie, aby równoległe requesty nie przekraczały lokalnego limitu przed rejestracją.
- SEC ma osobny cache i inflight dedupe.
- Klucze i user-agent pozostają server-only.

### 5. Confidence gate
- Provider consensus i freshness nie są już jedynym limitem pewności.
- Końcowy cap jest minimum z provider consensus i fundamental quality.
- Dobry live quote nie może przykryć starego filingu, ujemnego FCF, niepełnego bilansu albo wysokiej koncentracji ETF.

### 6. Real Markets UI
- Dodano czytelny panel `PASS464 Fundamental quality`.
- Akcje/REIT pokazują filing/period, FCF TTM, net debt/EBITDA, current ratio, FCF margin, cash conversion, net debt i freshness.
- ETF pokazuje top-10 concentration, effective holdings, top-3 sectors i benchmark overlap.
- Flagi ryzyka są oddzielone od surowego provider ledger.
- Brak danych jest opisany jako `source required`, bez klient-facing `unknown`.

### 7. PDF i AI evidence contract
- `VelmereMarketSnapshot` może przenosić fundamental state, score, cap, filing date, FCF, leverage oraz ETF concentration/overlap.
- PASS459 provider truth PDF i PASS460 consensus PDF respektują PASS464 confidence cap.
- Preview i download nadal korzystają z jednego raportu; nowe pola pojawiają się tylko, gdy rzeczywisty snapshot je dostarczy.
- AI/audit evidence w Real Markets otrzymuje ten sam quality state i boundary.

## Walidacja
- PASS453–PASS464 regression gates: OK.
- PASS464 runtime semantics: OK.
- Test: pełne 4 kwartały → poprawny TTM/FCF.
- Test: tylko 3 kwartały → brak syntetycznego TTM.
- Test: częściowy dług → brak zaniżonego total debt.
- Test: ETF concentration/overlap → poprawny top-3 i wspólna waga.
- Pełny syntax sweep: 776 TS/TSX, 0 błędów składni.
- i18n PL/DE/EN: OK.
- Vercel preflight: OK, 772 pliki.
- Pełny Next build: niewykonany — brak lokalnego `node_modules`.
- Live Alpha Vantage/SEC smoke: niewykonany — brak produkcyjnych sekretów i działającej aplikacji.
- Chromium/Playwright/PDF pixel diff: niewykonany.
