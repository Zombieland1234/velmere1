# VELMERE PASS 80 — AI ANALYSIS CHAT / BASIC CLEANUP / ADVANCED FLOW

## Cel
Zamiast ładować użytkownikowi od razu dużą ścianę paneli, analiza może otwierać się jako eleganckie okno czatu. AI "pisze" krótką analizę krok po kroku, a pełny terminal advanced zostaje za VLM / login / owner access.

## Co zmieniłem

### 1. AI Analysis Chat popup
**Plik:** `components/market-integrity/TokenRiskModal.tsx`

Dodany komponent:
- `AiAnalysisChatPopup`

Działanie:
- pojawia się jako małe okno czatu na dole po prawej
- wiadomości pojawiają się sekwencyjnie, jakby AI pisało analizę
- pokazuje:
  - start analizy tokena
  - source check
  - risk read
  - dominant layer
  - access gate
- ma CTA:
  - `Open advanced`
  - `Keep basic`

### 2. Basic jeszcze bardziej odciążony
**Plik:** `components/market-integrity/TokenRiskModal.tsx`

Zmieniłem logikę modala:
- dopóki user nie włączy advanced, modal jest jedno-kolumnowy
- prawa kolumna z risk score / dodatkowymi panelami nie zasłania już basic widoku
- basic ma teraz:
  - krótki risk read
  - button `AI analysis chat`
  - wykres
  - 3 KPI
  - basic review summary
  - krótki opis co basic zawiera

### 3. Advanced dopiero po wyborze
**Plik:** `components/market-integrity/TokenRiskModal.tsx`

Prawa kolumna i cięższe panele pokazują się dopiero po:
- kliknięciu `Show advanced analytics`
- kliknięciu AI Bot / Orchestrator / Evidence
- kliknięciu `Open advanced` w oknie AI chat

### 4. Animacje chatu
**Plik:** `app/globals.css`

Dodane klasy:
- `.shield-ai-analysis-chat`
- `.shield-ai-chat-message`

Dodane keyframes:
- `shieldChatRise`
- `shieldChatMessage`

Efekt:
- popup wchodzi płynnie
- wiadomości pojawiają się po kolei
- UI wygląda bardziej jak rozmowa z AI, a nie jak statyczna tabelka

## Pliki ruszone
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`
- `VELMERE_PASS80_AI_ANALYSIS_CHAT_BASIC_ADVANCED_FLOW_REPORT.md`

## Weryfikacja
Przeszło:
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`

## Typecheck
`npm run typecheck` nadal nie przechodzi, bo paczka w sandboxie nie ma pełnych zależności / typów (`next`, `react`, `lucide-react`, `next-intl`, itd.) oraz ma starsze błędy spoza tego passa.

## Efekt UX
Basic jest teraz bardziej zgodny z założeniem:
- mało tekstu
- mniej paneli
- czytelny wykres
- AI analiza jako czat
- pełny terminal dopiero w advanced

## Realny status
Po PASS80: około **40–45%** wizji.

To poprawia UX i kierunek produktu, ale do 100% nadal brakuje: real auth/VLM gating, real owner access, live holder/on-chain data, live orderbook, persistent audit logs, export evidence i pełna produkcyjna architektura danych.
