# PASS685–692 — visual interaction finish

## Zakres

Pakiet został wykonany na bazie PASS684 jako etap wyłącznie wizualny i UX. Nie zmieniano modeli AI, scoringu ryzyka, źródeł danych, kontraktów raportów ani endpointów API.

## Wdrożenia

### PASS685 — spokojny ekran odzyskiwania
- usunięto publiczne komunikaty `KERNEL PANIC`, `SYSTEM BREAKDOWN` i surowe błędy runtime;
- dodano lokalizowany ekran PL/DE/EN z dwoma jasnymi działaniami: ponów i wróć na stronę główną;
- techniczny digest pozostaje dyskretnym kodem pomocniczym tylko wtedy, gdy istnieje.

### PASS686 — globalne szybkie przejście
- paleta Cmd/Ctrl+K została przebudowana z terminala deweloperskiego na nawigację produktową;
- dodano lokalizację PL/DE/EN;
- pozostawiono tylko użyteczne miejsca: Sklep, Browser, Shield, Shield Map, Angel i portfel;
- usunięto `ROUTE`, `LOCAL TERMINAL STATE` i przełączanie pamięci trybu;
- zastosowano wspólną konstytucję warstw i blokadę scrolla.

### PASS687 — logowanie bez zaplecza technicznego
- usunięto komunikaty o OAuth, kluczach, sesjach serwera i „Not live”;
- dodano przełącznik Logowanie / Nowe konto;
- dodano pokaż/ukryj hasło, czytelne błędy i wspólny styl pól;
- portfel pojawia się dopiero w ścieżce tworzenia konta jako opcjonalny element;
- zlikwidowano powtórzoną ścianę kart zaufania w formularzu.

### PASS688 — lokalizowana scena bezpieczeństwa konta
- LoginSecurityVisual używa języka strony;
- techniczne określenia zastąpiono trzema ludzkimi zasadami: oddzielone konto, portfel na żądanie i nazwana zgoda;
- zachowano animację sieci z obsługą reduced-motion.

### PASS689 — premium cookie consent
- poprawiono pełne tłumaczenia PL/DE/EN;
- banner jest kompaktowy, respektuje safe-area i nie zasłania głównych modali;
- ustawienia rozwijają się płynnie i pokazują stan kategorii bez ściany tekstu;
- przyciski mają jasną hierarchię: tylko niezbędne / wszystkie / szczegóły.

### PASS690 — portfel bez zmiennych środowiskowych
- usunięto publiczny tekst `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` oraz język typu „injected route”;
- inne portfele otwierają się jako zagnieżdżony panel zgodny z warstwami produktu;
- na telefonie panel respektuje safe-area i własny scroll;
- stany są opisane jako Gotowe / Otwórz zamiast Preview i konfiguracji technicznej.

### PASS691 — produkty i zakup
- karty produktów nie pokazują informacji o „operator surfaces”, providerach i blockerach;
- poprawiono opis szczegółu produktu w PL/DE/EN;
- „Fulfillment” zastąpiono czytelną sekcją dostawy;
- techniczny `TBC` zastąpiono lokalizowanym stanem Wkrótce/Bald/Soon;
- dodano spójny focus dla kart produktów.

### PASS692 — header-safe overlay system
- LuxuryActionModal, SideActionPanel i menu używają jednej geometrii pod globalnym headerem;
- dodano wspólny styl pól, autofill, focus, command items i wallet choices;
- wszystkie warstwy respektują safe-area, wewnętrzny scroll i reduced-motion;
- dodano dedykowaną bramkę regresji PASS685–692.

## Zmienione powierzchnie

- globalna paleta nawigacji;
- ekran błędu;
- login i scena bezpieczeństwa;
- cookie consent;
- wybór portfela;
- menu, drawery i action modals;
- karty produktów i szczegół produktu;
- wspólny system CSS;
- tłumaczenia PL/DE/EN.

## Walidacja

- PASS647–653: PASS
- PASS654–660: PASS
- PASS661–668: PASS
- PASS669–676: PASS
- PASS677–684: PASS
- PASS685–692: PASS
- i18n PL/DE/EN: PASS
- Vercel preflight: PASS — 922 pliki
- parser TS/TSX: 921 plików, 0 błędów składni
- CSS: poprawnie domknięte nawiasy
- JSON: package i locale messages poprawne

## Granica deklaracji

Pełny dependency-backed `next build`, ESLint i `tsc --noEmit` nie zostały wykonane, ponieważ archiwum handoff nie zawiera `node_modules`. Finalny build należy uruchomić po `npm ci` w Node.js 20.x.
