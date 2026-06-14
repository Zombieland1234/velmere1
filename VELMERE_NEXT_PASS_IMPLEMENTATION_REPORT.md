# Velmère – next implementation pass

## Wdrożone w tym przebiegu

### 1) Square / VMR Secure
- Wzmocniony lock scrolla przy otwartym poście lub composerze (`body`, `html`, `wheel`, `touchmove` blokowane do czasu zamknięcia).
- Modal posta pozostaje jako pełny overlay z zamknięciem przez `X` i klik w tło.
- Pływający przycisk Square został przeniesiony do prawej krawędzi ekranu i chowa się, gdy otwarty jest modal lub composer.
- Angel nadal chowa się pod modalami / composerem.

### 2) Home
- Mózg / access core został powiększony o ok. 10% i dostał mocniejszy glow / skalę projekcji.
- Pod karuzelą produktów wróciła duża sekcja edytorialowa `EditorialFeatureSwitcher`:
  - jedno duże zdjęcie,
  - opis po prawej,
  - przyciski poprzedni / następny,
  - wskaźniki slajdów,
  - CTA do produktu.

### 3) Motion Lab
- Stara strona opisowa została przerobiona na stronę z prawdziwymi preview animacji.
- Dodano sekcję `Apps concept` dla WLMR z modułami:
  - Drop Calendar
  - Signal Studio
  - Archive Rooms
  - Fit Advisor
  - Wallet Safety
  - Member Pass
- Dodano 20 interaktywnych / animowanych preview do wyboru.

### 4) Navbar
- Z desktopowego paska nawigacji usunięto szybkie linki do kolekcji męskiej i damskiej.
- W górnym pasku zostają uproszczone linki: `Collection` i `VLM`.
- Rozszerzone linki nadal są dostępne z menu bocznego.

## Nowe komponenty
- `components/home/EditorialFeatureSwitcher.tsx`

## Zmodyfikowane pliki
- `components/home/HomePageClient.tsx`
- `components/home/NeuralBrainVisual.tsx`
- `components/Navbar.tsx`
- `components/square/VelmereSquareClient.tsx`
- `components/lab/VelmereMotionLabClient.tsx`

## Dane potrzebne od Ciebie przed pełnym wdrożeniem produkcyjnym

### Firma / dane prawne
1. Pełna nazwa firmy lub imię i nazwisko sprzedawcy.
2. Adres rejestrowy / adres do kontaktu.
3. Email supportowy i reklamacyjny.
4. Numer telefonu (jeśli ma być publiczny).
5. Kraj działalności.
6. Forma działalności (jednoosobowa / spółka itd.).
7. NIP / VAT UE / numer rejestrowy – jeśli już będą.
8. Dane do `Impressum`, `Terms`, `Privacy`, `Returns`, `Shipping`.

### Sklep / operacje
9. Realne czasy wysyłki per kraj / region.
10. Kraje sprzedaży.
11. Przewoźnicy i koszty dostawy.
12. Polityka zwrotów (ile dni, kto płaci za zwrot, adres zwrotu).
13. Metody płatności.
14. Kiedy produkt jest `in stock`, `preorder`, `made to order`.

### VLM / Web3
15. Czy VLM ma być tylko access layer, czy kiedyś token live.
16. Obsługiwane chainy.
17. Lista portfeli docelowych poza MetaMask / Phantom.
18. Czy panel ma być read-only na starcie, czy z czasem live.
19. Copy prawne dotyczące braku obietnicy zysku / braku oferty inwestycyjnej.
20. Jeśli kiedyś live: adres kontraktu, ABI, audit, network, ostrzeżenia ryzyka.

### Content / branding
21. Ostateczny podział kolekcji (czy chcesz nadal osobne męskie / damskie w menu bocznym).
22. Które z 20 preview animacji zostają.
23. Czy sekcja Apps concept ma wejść do produkcji jako normalna strona.
24. Finalne języki (teraz: PL / EN / DE).
25. Finalne zdjęcia hero / produktów, jeśli chcesz podmienić obecne assety.

## Rekomendowany następny krok
1. Odpalić lokalnie i przejrzeć:
   - `/pl`
   - `/pl/square`
   - `/pl/motion-lab`
2. Wybrać numery animacji do zachowania.
3. Dać dane prawne i sklepowe.
4. Zrobić finalny pass tłumaczeń PL / EN / DE.
5. Dopiero potem produkcyjny hardening i deploy.
