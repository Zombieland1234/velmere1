# VELMERE PASS 81 — ADVANCED VLM NEURAL AI CONSOLE / BASIC MINIMAL CLEANUP

## Cel passa
Po feedbacku z UI: basic nadal był za ciężki, a advanced nie miał jeszcze efektu “AI analizuje + dane łączą się w VLM neural network”. Ten pass rozdziela oba tryby mocniej:

- **Basic**: minimum danych, chart-first, mało tekstu.
- **Advanced**: osobna zaawansowana warstwa VLM neural analysis z animowanymi lane cards, centralnym VLM risk core i AI feed.

---

## Najważniejsze zmiany

### 1. Basic jest naprawdę basic
**Plik:** `components/market-integrity/TokenRiskModal.tsx`

Public/basic pokazuje teraz głównie:
- wykres,
- source / density strip,
- 4 krótkie wartości: price, 24h, volume, risk,
- krótki opis, że deep analytics jest gated.

Nie ładuje już od razu ciężkich rubryk typu holder/evidence/replay/stress jako widok startowy.

### 2. Show advanced analytics otwiera AI flow
**Plik:** `components/market-integrity/TokenRiskModal.tsx`

- klik w `Show advanced analytics` nie ma być zwykłym przełącznikiem nudnych kart,
- prowadzi do AI flow / advanced layer,
- header dynamicznie pokazuje `basic view · public` albo `advanced neural · gated`.

### 3. Nowy Advanced VLM Neural Console
**Plik:** `components/market-integrity/TokenRiskModal.tsx`

Dodany komponent:
- `AdvancedVlmNeuralConsole`

Zawiera:
- lewy panel data lanes:
  - Source stream,
  - Liquidity lane,
  - Holder graph,
  - Evidence rail,
- centralny VLM risk core:
  - duży napis `VLM`,
  - risk score w centrum,
  - orbitujące/pozycjonowane agent labels,
  - “neural network” feel,
- prawy panel AI advanced feed:
  - animowane wiadomości krok po kroku,
  - safe wording,
  - missing data / source uncertainty,
  - VLM gated access copy.

### 4. Advanced dane są bardziej świadomie poukładane
**Plik:** `components/market-integrity/TokenRiskModal.tsx`

Po wejściu w advanced pokazują się dopiero cięższe elementy:
- VLM access layer,
- terminal action plan,
- liquidity danger zones,
- order book heatmap,
- AI / orchestrator / chat / replay / stress po stronie advanced.

### 5. Nowe animacje i style
**Plik:** `app/globals.css`

Dodane klasy i animacje:
- `.shield-vlm-neural-console`
- `.shield-neural-lane`
- `.shield-vlm-core`
- `.shield-ai-advanced-feed`
- `.shield-ai-feed-line`
- `@keyframes shieldLaneIn`
- `@keyframes shieldFeedIn`
- `@keyframes shieldCorePulse`

---

## Pliki ruszone
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`
- `VELMERE_PASS81_ADVANCED_VLM_NEURAL_AI_CONSOLE_REPORT.md`

---

## Weryfikacja
Przeszło:
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`

---

## Co nadal trzeba dopracować w następnych passach
1. Zrobić advanced jako jeszcze bardziej osobny full-screen layer / popup, a nie tylko sekcję w modalu.
2. Dodać prawdziwy login/session/VLM owner check.
3. Połączyć neural lanes z realnymi live API.
4. Dopieścić Shield Map i VLM Pro jako osobne pełne strony.
5. Jeszcze bardziej odchudzić basic na mobile.

---

## Realny status
Po PASS81 oceniam uczciwie projekt na około **41–46%** wizji.

Wizualnie kierunek advanced jest już dużo bliżej Twojej koncepcji: VLM w centrum, boczne dane, AI feed i gated premium layer. Produkcyjnie nadal brakuje live data, auth/session gating, billing/access enforcement i real evidence export.
