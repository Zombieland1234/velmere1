# PASS450 — Tiered Human Analysis + PDF / Browser / Real Markets Repair

## Cel

PASS450 porządkuje warstwę, którą widzi człowiek. Ten sam payload zasila teraz trzy poziomy analizy, podgląd PDF, pobrany PDF oraz część danych wyświetlanych w Velmère Browser. Brak źródła nie może zostać zamieniony w zmyśloną wartość ani w nagie `unknown`.

## Basic · 10 pól

- instrument,
- cena,
- kapitalizacja,
- zmiana 24h,
- wolumen 24h,
- zakres 24h,
- główne źródło,
- czas obserwacji,
- pewność źródeł,
- następny krok.

## Pro · 14 pól

Pro dodaje dynamikę 1h i 7d, FDV, relację wolumenu do kapitalizacji, drugie źródło, stan źródeł, luki dowodowe i opis znaczenia wyniku.

## Advanced · 20 pól

Advanced dodaje płynność, symulowany poślizg, głębokość bid/ask, podaż w obiegu, float, koncentrację holderów, unlock/vesting, venue health, source lineage i nietypową anomalię. Każde pole ma stan: potwierdzone, do weryfikacji, brak źródła albo nie dotyczy.

## Velmère Browser i PDF

- wynik wyszukiwania pokazuje cenę, kapitalizację, zmianę 24h i wolumen bez otwierania raportu,
- zachowano dużą animację `V` oraz cztery widoczne etapy generowania,
- podgląd używa twardej blokady scrolla tła i zamykania klawiszem Escape,
- przycisk pobrania ma ikonę Download,
- cztery strony A4 mają teraz role: brief, source ledger, Basic/Pro/Advanced oraz mapa decyzji,
- podgląd i download korzystają z jednego `LensReport.pass450`, więc treść nie powinna rozjeżdżać się między ekranem i plikiem.

## Tłumaczenia

Warstwa PASS450 ma osobne treści PL, DE i EN. Braki danych są opisywane jako `Wymaga źródła`, `Quelle erforderlich` lub `Source required`, razem z nazwą brakującego pola.

## Real Markets

- zakładki pokazują liczbę dostępnych instrumentów,
- w kategorii giełd lane'y Binance i MEXC są ustawione przed operatorami publicznymi,
- venue health nie udaje ceny akcji,
- panel pokazuje jawnie zasadę no-fake-live.

## Shield / Neural Audit

Basic, Pro i Advanced mają widoczną obietnicę zakresu 10 / 14 / 20 pól. Advanced otrzymał dodatkowe wskaźniki: turnover, liquidity ratio, unlock pressure, source quorum i rozbieżność agentów.

## Walidacja

```bash
npm run verify:pass450-tiered-human-analysis
npm run verify:pass449-catalog-darkmatter-guard
npm run verify:pass448-depth-report-pdf-realmarkets
npm run verify:pass447-pdf-preview-realmarkets-catalog
npm run check:i18n
npm run vercel:preflight
```

Pełny `next build` nie został uruchomiony w środowisku roboczym, ponieważ paczka nie zawiera `node_modules`. Parser TS/TSX, skrypty regresji, i18n i preflight pozostają obowiązkową bramką przed ZIP-em.
