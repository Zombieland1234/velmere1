# PASS684 — public journey visual release

## Zakres

PASS677–684 kontynuuje wyłącznie etap wizualny Velmère. Nie zmieniano silnika AI, scoringu ryzyka, adapterów źródeł, endpointów rynkowych ani kontraktów danych.

## Wdrożone zmiany

### PASS677 — stabilny motion między trasami
- skrócono i uspokojono przejście stron;
- dodano subtelną linię przejścia bez przesuwania layoutu;
- pełne wyłączenie animacji przy `prefers-reduced-motion`.

### PASS678 — koszyk bez ściany statusów
- pusty koszyk został przebudowany na jeden spokojny stan zakupowy;
- usunięto cztery techniczne karty dowodowe z pierwszego widoku;
- dodano trzy proste informacje: dopasowanie, dostawa/zwrot i pochodzenie;
- główna akcja prowadzi bezpośrednio do kolekcji.

### PASS679 — checkout bez zaplecza wdrożeniowego
- usunięto publiczne nazwy providerów i opisy kontroli startu;
- ekran pokazuje prosty status dostępności oraz cztery informacje widoczne przed płatnością;
- CTA prowadzą do kolekcji i kontaktu, bez presji i odliczania.

### PASS680 — FAQ i kontakt
- FAQ dostało dostępne klawiaturą akordeony `details/summary`;
- dodano szybkie ścieżki do dostawy, zwrotów i kontaktu;
- kontakt nie renderuje już pod właściwą stroną pełnego dokumentu prawnego;
- kontakt został podzielony na produkty, zamówienia i konto oraz jasną granicę bezpieczeństwa.

### PASS681 — publiczna opowieść Shield
- usunięto procenty budowy, roadmapę R&D i wewnętrzne informacje MVP/SOC;
- strona wyjaśnia teraz Shield przez cztery warstwy, cztery korzyści i jeden prosty przebieg analizy;
- dodano spokojną wizualizację orbity bez przeciążenia tekstem.

### PASS682 — Research Lab
- hero, metodologia, wyniki i granica twierdzeń używają jednej hierarchii;
- tabela wyników została zamieniona na cztery czytelne metryki;
- eksperymentalny tor odwrotny jest zwijany zamiast stale zajmować ekran;
- zachowano treść i granice bezpieczeństwa bez zmiany badań.

### PASS683 — loading i 404
- dodano spójny skeleton strony;
- dodano lokalizowany PL/DE/EN ekran 404 z przejściem do strony głównej lub Lens;
- oba stany korzystają z systemu premium i safe-area.

### PASS684 — regresja i release
- dodano gate `verify:pass677-684-public-journey-release`;
- wszystkie zmienione pliki przeszły parser TS/TSX;
- sprawdzono strukturę CSS, i18n, Vercel preflight oraz kluczowe bramki Shield/Browser/overlay;
- archiwum oczyszczono z `node_modules`, `.next`, `.git`, cache i logów.

## Najważniejszy efekt

Ekrany wcześniej wyglądające jak zaplecze projektu — pusty koszyk, zablokowany checkout, kontakt, FAQ, opis Shield i Research Lab — zachowują się teraz jak jeden gotowy produkt. Użytkownik widzi jeden cel, jedno następne działanie i krótkie informacje zamiast wewnętrznej dokumentacji.

## Granica deklaracji

Pełny dependency-backed `next build` i `tsc --noEmit` nie są deklarowane jako wykonane. Archiwum nie zawiera zależności, a środowisko działa na Node.js 22.16.0 przy produkcyjnym kontrakcie Node.js 20.x. Przed wdrożeniem należy wykonać czyste `npm ci`, `npm run typecheck` i `npm run build` pod Node.js 20.x.
