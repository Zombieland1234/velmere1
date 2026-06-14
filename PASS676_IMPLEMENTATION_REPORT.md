# PASS676 — whole-product visual release

## Zakres

Pakiet PASS669–676 kontynuuje wyłącznie etap wizualny Velmère. Nie zmieniano modeli AI, scoringu, źródeł rynkowych, endpointów ani kontraktów danych.

## Wdrożone zmiany

### PASS669 — audit całej powierzchni
- objęto audytem landing, Shop, Product Detail, Square, VLM, Security, Account/Auth, Navbar i Footer;
- wykryto powtarzające się karty, techniczne nazwy publiczne i elementy zasłaniające treść;
- zachowano dotychczasowe funkcje i trasy.

### PASS670 — wspólny system premium
- dodano `velmere-public-page`, `velmere-editorial-hero`, `velmere-surface-sheen`, `velmere-premium-tile`;
- ujednolicono światło, głębię, obramowania, motion, hover i focus;
- dodano pełne ograniczenie animacji dla `prefers-reduced-motion`.

### PASS671 — landing i hierarchia marki
- hero otrzymał spokojniejszą narrację oraz mniejszą liczbę etykiet;
- usunięto duplikację zestawu kart nad foldem — pokazuje teraz ścieżkę Kolekcja → Produkt → Decyzja;
- odświeżono powierzchnie Clothing, Shield i prywatnego podglądu.

### PASS672 — Shop i Product Detail
- filtry kategorii/sortowania są sticky, półprzezroczyste i pozostają pod headerem;
- przyszłe sloty dropów oraz sekcje CTA korzystają ze wspólnego systemu premium;
- usunięto publiczne określenia „status operatora” i „operator review”.

### PASS673 — Velmère Square
- „Community OS” zastąpiono językiem produktowym;
- główny panel, posty i statusy otrzymały mocniejszą hierarchię;
- przycisk tworzenia wpisu przeniesiono ze środka prawej krawędzi do bezpiecznej pozycji bottom-right;
- publiczny status ograniczono do dwóch najważniejszych pozycji.

### PASS674 — VLM Access
- „launch matrix” zastąpiono spokojnym statusem dostępu;
- „operator mode” zastąpiono pełną/pogłębioną analizą;
- karty tierów, hero i statusy korzystają ze wspólnego systemu premium;
- usunięto publiczne frazy implementacyjne `read-only preview` tam, gdzie nie były komunikatem bezpieczeństwa.

### PASS675 — Security, Account i nawigacja
- techniczna checklista Security została usunięta z publicznego widoku, zachowując komponent dla zgodności;
- karty Shield Map i Browser/PDF są lokalizowane PL/DE/EN;
- „Account gate”, „command center” i „private console” zastąpiono prostym językiem użytkowym;
- uproszczono Navbar oraz Footer i ograniczono mniej istotne elementy na mniejszych desktopach.

### PASS676 — regresja i release
- dodano gate `verify:pass669-676-whole-product-visual-release`;
- przywrócono niewidoczne markery zgodności starszych bramek w TokenRiskModal bez przywracania technicznego UI;
- cały łańcuch PASS488–676 przechodzi;
- paczka została oczyszczona z `node_modules`, `.next`, `.git`, cache i logów.

## Najważniejszy efekt

Velmère nie wygląda już jak kilka niezależnych prototypów. Storefront, community, VLM, Security i konto używają tego samego rytmu, głębi i języka. Interfejs pokazuje użytkownikowi produkt, stan i następne działanie zamiast wewnętrznych nazw procesu.

## Granica deklaracji

Pełnego dependency-backed `next build` i pełnego typechecku nie deklaruje się jako wykonanych. Archiwum nie zawiera zależności, a środowisko walidacyjne działało na Node.js 22.16.0; produkcyjny kontrakt projektu wymaga Node.js 20.x oraz czystego `npm ci`.
