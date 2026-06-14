# Velmère Design-System Repair Report

## 1. Podsumowanie wykonania
Ten pass nie próbuje doklejać kolejnych efektów. Porządkuje fundament: typografię, kontrast, spacing, język, header/footer, produkt, shop, koszyk, auth, Square i publiczne teksty VLM. Celem było uspokojenie chaosu terminal/fashion i zostawienie Web3 jako osobnej warstwy, a nie klimatu wciśniętego w każdy element sklepu.

## 2. Pliki zmienione
- app/layout.tsx
- app/[locale]/layout.tsx
- app/[locale]/account/page.tsx
- app/[locale]/dashboard/page.tsx
- app/[locale]/vlm-token/page.tsx
- app/globals.css
- tailwind.config.ts
- components/Navbar.tsx
- components/Footer.tsx
- components/CartDrawer.tsx
- components/auth/AuthGate.tsx
- components/dashboard/DashboardClient.tsx
- components/home/HomePageClient.tsx
- components/home/LuxuryProductCarousel.tsx
- components/product/ProductCard.tsx
- components/shop/ProductDetailClient.tsx
- components/shop/ShopPageClient.tsx
- components/square/VelmereSquareClient.tsx
- components/i18n/HtmlLangSync.tsx
- components/ui/primitives.tsx
- messages/en.json
- messages/pl.json
- messages/de.json

## 3. Checklist

### PRIORYTET 1 — i18n, język, polonizacja, encoding
- [DONE] Dodano runtime sync `document.documentElement.lang` dla `/pl`, `/en`, `/de`.
- [PARTIAL] SSR root nadal ma bazowo `lang="en"`, bo w aktualnej strukturze App Router root `app/layout.tsx` nie dostaje `params.locale`. DOM po hydracji ustawia poprawny język.
- [DONE] Poprawiono core PL stringi: Konto, Zaloguj, Połącz portfel, koszyk, podgląd, dostęp, polskie znaki.
- [DONE] Usunięto publiczne dev breadcrumby typu `ROOT / SHOP`.
- [DONE] Poprawiono lokalizacje footer/auth/cart/nav w EN/PL/DE.

### PRIORYTET 2 — design tokens i Tailwind
- [DONE] Uporządkowano `tailwind.config.ts` z osobnymi rolami: base/surface/elevated/text/gold/danger.
- [DONE] Usunięto duplikację semantyczną `velmere-charcoal` vs `velmere-panel` — mają teraz różne role.
- [DONE] Dodano spójne zmienne CSS w `app/globals.css`.
- [PARTIAL] Nie wyczyszczono każdej arbitralnej klasy z całego repo; globalne klasy i główne komponenty zostały ustabilizowane.

### PRIORYTET 3 — typografia
- [DONE] Zdefiniowano role fontów: serif dla nagłówków, sans dla UI/body, mono dla danych.
- [DONE] Zmniejszono nadużycie monospace w product card i footerze.
- [PARTIAL] VLM i Square nadal używają mono w metadanych i krótkich statusach, celowo jako warstwa Web3.

### PRIORYTET 4 — spacing, grid, layout
- [DONE] Dodano spójne `luxury-section`, `luxury-card`, `luxury-panel`.
- [DONE] Uspokojono shop grid: aktywne produkty + maksymalnie 2 sloty przyszłych dropów, bez 17 pustych placeholderów.
- [DONE] Footer, auth, produkt i koszyk dostały bardziej przewidywalne odstępy.

### PRIORYTET 5 — komponenty UI
- [DONE] Dodano `components/ui/primitives.tsx`: PageContainer, Section, Button, Card, Input, Badge.
- [PARTIAL] Nie przepięto całej aplikacji na prymitywy w jednym pass, żeby nie rozwalić funkcji. Prymitywy są gotowe do stopniowego użycia.

### PRIORYTET 6 — header, sidebar, footer
- [DONE] Header lżejszy: język ukryty w desktopowym headerze do 2xl i nadal dostępny w drawerze.
- [DONE] Konto jest tłumaczone przez i18n.
- [DONE] Wallet label jest tłumaczony.
- [DONE] Footer zredukowany, usunięto samotne debugowe/ryzykowne disclaimery z każdej strony; link VLM prowadzi do kontekstu.
- [DONE] Newsletter nie udaje już działającego formularza — pokazuje uczciwy staging status i link do kontaktu.

### PRIORYTET 7 — commerce vs VLM/Web3
- [DONE] Commerce ma czytelniejszy język i mniej terminalowych ramek.
- [DONE] VLM pozostaje osobną warstwą: metadane, portfel, statusy.
- [DONE] Dane Web3 zostały bardziej sprowadzone do estetyki cyfrowej metki.

### PRIORYTET 8 — produkty, shop, merchandising
- [DONE] Usunięto publiczne `[ LOGISTICS ]: TAPSTITCH / PRINTFUL PROTOCOL` z PDP.
- [DONE] Breadcrumby są ludzkie: `Velmère / Sklep / Nazwa produktu`.
- [DONE] Usunięto wymuszone grayscale z głównych zdjęć produktowych i listingów.
- [DONE] Shop nie pokazuje 17 pustych slotów.

### PRIORYTET 9 — Velmère Square
- [DONE] Usunięto grayscale z mediów Square.
- [DONE] Poprawiono część polskich komunikatów Square.
- [PARTIAL] Pełna przebudowa feedu na 3-kolumnowy Twitter/Binance layout to osobny, większy etap; nie ruszano głębokiej logiki post modal, żeby nie rozwalić ostatniego hotfixa.

### PRIORYTET 10 — modale, dialogi, drawer, accessibility
- [DONE] Dodano skip-to-content.
- [DONE] Utrzymano `aria-modal` w drawerach/modalu, nie usunięto istniejących aria-labels.
- [PARTIAL] Pełny focus trap i focus restore dla wszystkich modalów wymaga dodatkowego passu z testem klawiatury w przeglądarce.

### PRIORYTET 11 — animacje, blur, wydajność
- [DONE] Uspójniono easing globalny `cubic-bezier(0.16, 1, 0.3, 1)`.
- [DONE] Zredukowano brutalne globalne scroll/blur duplikacje w CSS.
- [DONE] Zachowano reduced-motion.

### PRIORYTET 12 — koszyk, auth, checkout, placeholdery
- [DONE] Koszyk ma tłumaczone komunikaty empty/checkout/terms.
- [DONE] AuthGate nie ma już twardych angielskich propsów na account/dashboard.
- [DONE] Newsletter nie jest disabled inputem udającym działanie.
- [PARTIAL] Checkout nadal zależy od realnych Stripe env — nie udaję, że płatności działają bez kluczy.

### PRIORYTET 13 — pliki specjalne
- [DONE] Sprawdzone i zmienione główne pliki z listy.
- [PARTIAL] Nie dotknięto wszystkich pojedynczych komponentów VLM, bo jest ich kilkadziesiąt i pełna migracja design-system wymaga kolejnego passu.

## 4. Testy
- `npm run check:i18n` — DONE, przeszło: `i18n ok across 3 locale files`.
- `npm install` — BLOCKED w sandboxie przez timeout.
- `npm run typecheck` — BLOCKED bez pełnego `node_modules`; po naprawieniu błędu składni w Navbarze typecheck zatrzymał się głównie na brakujących modułach/types.
- `npm run build` — BLOCKED, bo pełna instalacja zależności nie zakończyła się w sandboxie.

## 5. Co sprawdzić ręcznie w przeglądarce
- 360px: header, menu, cart drawer, auth, shop grid.
- 390px: VLM prompt, Square plus, product page sticky CTA.
- 768px: tablet layout shop/home/Square.
- 1024px: header balance i centralny blok logo/collection.
- 1440px: whitespace, hero scale, product grid, footer.

## 6. Rzeczy świadomie nierobione w tym pass
- Prawdziwy Google OAuth — wymaga credentials/callbacków.
- Realny VLM token balance/gating — wymaga finalnego kontraktu, ABI i chaina.
- Pełna migracja całego repo na nowe prymitywy UI — przygotowano fundament, migracja powinna iść sekcjami.
