# Velmère PASS661–668 — Visual Clarity Release

## Zakres

Pakiet rozwija wyłącznie publiczną warstwę wizualną i UX. Nie zmieniano modeli AI, scoringu ryzyka, źródeł danych, kontraktów API ani logiki raportów.

## Wdrożone passy

| Pass | Obszar | Wdrożenie |
|---|---|---|
| PASS661 | Browser discovery | Cztery szybkie ścieżki wejścia w analizę zamiast pustej przestrzeni pod wyszukiwarką. |
| PASS662 | Browser density | Wynik ma krótszy waterfall, mniej metryk i jeden kompaktowy rail Basic / Pro / Advanced. |
| PASS663 | Shield public copy | Zrozumiały placeholder, spokojne etykiety i usunięcie publicznego języka terminal/runtime/operator. |
| PASS664 | Shield chart-first | Pierwszy ekran modala ograniczony do obrazu ryzyka, pokrycia dowodów i następnego sprawdzenia; wykres ma pierwszeństwo. |
| PASS665 | Shield Map focus | Drawer skrócony do podsumowania, 4 relacji, 3 źródeł, historii i następnego kroku. |
| PASS666 | Overlay constitution | Koszyk i Angel Panel używają wspólnego systemu warstw i zaczynają się pod globalnym headerem. |
| PASS667 | Public PASS cleanup | Numerowane tytuły PASS255–288 usunięte z Routera Browsera w PL/DE/EN; wymagane stare frazy przeniesione do niewidocznych komentarzy zgodności. |
| PASS668 | Release gate | Nowy verifier pilnuje discovery, chart-first, limitów gęstości, czystego copy, header-safe drawers, mobile i reduced-motion. |

## Najważniejsze efekty produktowe

### Velmère Browser

- ekran startowy prowadzi użytkownika do konkretnych analiz BTC, ETH i SOL;
- szybkie ścieżki mają wyraźny hover, focus, numerację oraz krótki opis wartości;
- wynik nie powtarza tych samych chipów i nie pokazuje nadmiaru kart naraz;
- Basic / Pro / Advanced są pokazane jako jeden lekki rail 10 / 14 / 20;
- historyczne nazwy PASS nie występują już w tytułach ani aria-labelach.

### Velmère Shield

- wyszukiwarka posiada czytelny placeholder;
- publiczne komunikaty mówią o analizie i weryfikacji, a nie o terminalu lub operatorze;
- modal otwiera się w spokojnej hierarchii chart-first;
- górny strip wykresu pokazuje tylko źródło, pewność oraz luki;
- techniczne karty o routingu PDF nie konkurują z ceną i wykresem.

### Shield Map

- drawer nie jest dokumentacją systemu;
- najpierw widoczne jest krótkie znaczenie sygnału;
- relacje ograniczone są do 4, a źródła do 3 najważniejszych pozycji;
- następne sprawdzenie ma własny, jednoznaczny blok;
- mobile zachowuje przewijanie wewnętrzne i bezpieczną przestrzeń pod headerem.

### Warstwy i ruch

- CartDrawer i AngelPanel korzystają z jednego kontraktu backdrop/panel;
- szuflady nie zakrywają globalnego headera;
- stany hover/focus/active mają spójny język wizualny;
- animacje respektują `prefers-reduced-motion`;
- układ został dopracowany dla szerokości 320–430 px.

## Granica zmian

Nie zmieniono:

- modeli i promptów AI;
- providerów, adapterów ani źródeł rynkowych;
- scoringu ryzyka;
- payloadów API;
- logiki generowania PDF;
- kontraktu poziomów 10 / 14 / 20.

## Walidacja

- `check:i18n`: PASS — PL / DE / EN;
- `vercel:preflight`: PASS — Next.js 14.2.35, 922 przeskanowane pliki;
- PASS661–668 visual clarity gate: PASS;
- PASS654–660: PASS;
- PASS647–653: PASS;
- PASS642–646: PASS;
- PASS627–631: PASS;
- PASS612–616: PASS;
- PASS573–579: PASS;
- parser składni TS/TSX: 918 plików, 0 błędów;
- CSS structural guard: PASS;
- skan publicznych komponentów: 0 numerowanych tytułów PASS;
- integralność ZIP: sprawdzana po spakowaniu.

Pełnego dependency-backed `next build` i semantycznego `tsc --noEmit` nie deklarujemy w tym środowisku. Produkcyjny kontrakt projektu wymaga Node.js 20.x i czystego `npm ci`.
