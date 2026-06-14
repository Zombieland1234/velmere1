# PASS718–725 — editorial UI release

## Zakres

Pakiet kontynuuje etap wyłącznie wizualny i UX na bazie PASS717. Nie zmieniano modeli AI, scoringu ryzyka, adapterów danych, endpointów ani kontraktów raportów.

## Wdrożone zmiany

### PASS718 — audit gęstości informacji
- przejrzano landing, sklep, karty produktów, Navbar i Shield Map;
- wykryto powtarzające się sekcje, teksty opisujące sam projekt oraz techniczne panele widoczne przed właściwym wynikiem;
- zachowano wszystkie trasy i istniejące funkcje.

### PASS719 — landing product-first
- narracja została zmieniona z komentarza o projektowaniu storefrontu na język marki i produktu;
- usunięto powtarzającą się sekcję zasad storefrontu i końcowe podsumowanie audytowe;
- skrócono sekcję dostępu, eliminując drugi raz powtarzaną ścieżkę Kolekcja → Produkt → Decyzja;
- strona jest krótsza i ma mniej konkurujących dominant.

### PASS720 — karta produktu editorial
- duża karta produktu nie jest już mini-dashboardem z trzema metrykami i dodatkowym panelem lookbookowym;
- obraz, nazwa, krótki opis, dwie cechy, rozmiary i cena tworzą jedną hierarchię;
- zachowano zmianę zdjęcia, dostępność, warianty i przejście do szczegółu produktu;
- poprawiono rytm desktop/mobile i zachowanie reduced-motion.

### PASS721 — spokojniejszy Shop
- usunięto publiczny panel instruujący użytkownika, jak powinna działać ścieżka klienta;
- filtr pokazuje liczbę produktów i ma osobny przewijany rail sortowania na telefonie;
- slot przyszłego dropu jest krótszy i ma wyraźny, editorialny placeholder zamiast pustej makiety;
- siatka produktowa zaczyna się szybciej po hero.

### PASS722 — Shield Map bez technicznego hero
- usunięto publiczny budżet FPS, stan motion i cztery karty stanu silników;
- hero prowadzi przez trzy kroki: źródła, następna weryfikacja i raport;
- komunikat prescreen został skrócony i przestał brzmieć jak dokumentacja operatora;
- z wyniku usunięto publiczne pole operatorMode.

### PASS723 — progressive disclosure Shield Map
- command dock, temporal replay, scenariusze, kolejka weryfikacji i evidence packet są domyślnie ukryte;
- pełna analiza pozostaje dostępna jednym przełącznikiem;
- podstawowy widok pokazuje werdykt, liczby, sześć osi ryzyka, braki danych i następny krok;
- funkcje zostały zachowane, ale nie zalewają pierwszego widoku.

### PASS724 — spokojniejszy Navbar
- usunięto dodatkową etykietę wysyłki z desktopowego paska;
- selector języka pokazuje aktywny kod języka i nie używa ciągłej animacji obrotu;
- aktywna trasa ma stan `aria-current` oraz subtelny wizualny marker;
- historyczne frazy wymagane przez stare testy pozostają wyłącznie w komentarzach zgodności.

### PASS725 — regresja i release
- dodano gate `verify:pass718-725-editorial-ui-release`;
- zachowano zgodność wszystkich bramek PASS647–717;
- parser sprawdził 933 pliki TS/TSX bez błędów składni;
- i18n PL/DE/EN, CSS, JSON i Vercel preflight przeszły;
- paczka została oczyszczona z node_modules, .next, .git, cache, logów i tsbuildinfo.

## Najważniejszy efekt

Velmère ma teraz mniej elementów, ale każdy ma większą wagę. Landing przestał komentować własny UX, sklep szybciej pokazuje produkty, karta produktu jest bardziej modowa niż techniczna, a Shield Map daje prosty wynik bez obowiązkowego przechodzenia przez warstwy diagnostyczne.

## Granica walidacji

Nie wykonano pełnego dependency-backed `next build` w sandboxie, ponieważ środowisko ma Node.js 22, a projekt wymaga Node.js 24.16 i npm 11.16. Wykonano pełny parser składni, i18n, historyczne bramki UI, nowy verifier oraz Vercel preflight.
