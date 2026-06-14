# VELMERE PASS 78 — FULL-WIDTH BASIC CARD / ADVANCED GATE / SHIELD MAP CLEANUP

## Zrobione

### 1) Modal tokena = prawie full-window popup
- `TokenRiskModal.tsx`
- modal startuje teraz w trybie szerokim (`expanded = true`)
- shell dostał większy max-width, więc popup wypełnia prawie całe okno
- główny scroll działa jako jedna duża powierzchnia

### 2) Basic view uproszczony
- podstawowy widok pokazuje:
  - szeroki wykres
  - krótkie summary
  - kilka kluczowych KPI
  - lekkie risk summary
- usunięto z defaultu ścianę ciężkich paneli z lewej strony
- modal ma teraz czytelniejszy układ public/basic

### 3) Gating advanced analytics
- dodany CTA: `Show advanced analytics`
- po kliknięciu pojawia się sekcja access / unlock:
  - `unlock via VLM`
  - `log in`
  - `open shield map`
- copy jasno komunikuje, że pełne dane są dla:
  - VLM members
  - Shield Pro
  - token owners / research desk

### 4) Prawa kolumna uproszczona
- basic aside zawiera:
  - risk score
  - client summary
  - access boundary
- cięższe panele pokazują się dopiero po wejściu w advanced request

### 5) Usunięcie tarczy obok wyszukiwarki
- `MarketIntegrityClient.tsx`
- usunięty okrągły przycisk shield lens obok searcha
- zostaje tylko link do pełnej `Shield map`
- inline quick-lens nie jest już eksponowany w głównym terminalu

### 6) Shield Map full width
- `ShieldMapClient.tsx`
- sekcje przestawione na `luxury-section-wide`
- kontenery `max-w-6xl` zmienione na `max-w-none`
- strona Shield Map ma dużo większy oddech i pełniejszą szerokość

### 7) Scroll / UX polish
- `app/globals.css`
- `shield-safe-scroll` ma teraz łagodniejsze `overscroll-behavior`, więc mniej blokuje przewijanie
- dodana klasa `luxury-section-wide`

## Najważniejszy efekt UX
Public/basic nie jest już przeładowany danymi.
Najpierw klient dostaje elegancką kartę z wykresem i krótką oceną.
Dopiero potem może przejść do warstwy premium / gated.

## Kolejny sensowny krok (PASS79)
1. podpiąć real auth/session dla VLM / owner access
2. zrobić prawdziwe `Advanced analytics modal layer`
3. przepiąć AI Bot / Orchestrator / Evidence do gated command workspace
4. odchudzić jeszcze bardziej microcopy w basic
5. zrobić jeszcze bardziej premium full-width Shield Map + VLM Pro page
