# VELMERE PASS 79 — BASIC COMPRESSION / MODAL BALANCE / ADVANCED GATE POLISH

## Cel passa
Dociąć public/basic kartę tokena tak, żeby nie rozwalała ekranu ścianą paneli i lepiej rozdzielić:
- **basic = mało, schludnie, najważniejsze rzeczy**
- **advanced = dużo, ale dopiero po wejściu w gated warstwę**

---

## Co zmieniłem

### 1. Modal layout został bardziej zbalansowany
**Plik:** `components/market-integrity/TokenRiskModal.tsx`
- zwęziłem prawą kolumnę modala, żeby nie dominowała nad wykresem
- ustawiłem bardziej stabilny układ `chart area + compact aside`
- dodałem sticky behavior dla prawej kolumny na większych ekranach, żeby summary było pod ręką bez zalewania UI

### 2. Basic view został mocniej uproszczony
**Plik:** `components/market-integrity/TokenRiskModal.tsx`
- basic ma teraz bardziej czytelną strukturę:
  - wykres
  - kompaktowy opis trybu basic
  - 3 najważniejsze KPI
  - krótki basic review summary
  - sekcja "What basic includes"
- wywaliłem z public/basic cięższe bloki typu duże liquidity sections jako default public clutter
- basic jest bardziej “card-first”, mniej “terminal-overload”

### 3. Advanced analytics są lepiej oddzielone od basic
**Plik:** `components/market-integrity/TokenRiskModal.tsx`
- cięższe elementy są bardziej jednoznacznie przeniesione do warstwy advanced:
  - access layer
  - action plan
  - liquidity danger zones
  - order book heatmap
  - AI / orchestrator / replay / stress
- public user dostaje krótszy i spokojniejszy ekran, a advanced dalej rozwija pełny terminal

### 4. Risk score sidebar została odciążona
**Plik:** `components/market-integrity/TokenRiskModal.tsx`
- zmniejszyłem dominację dużego score carda
- score wciąż jest widoczny, ale mniej przejmuje cały ekran
- sidebar bardziej działa jako pomocnicza warstwa summary niż drugi wielki dashboard

### 5. Verify scripts zostały dopasowane do nowego kierunku UI
**Pliki:**
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`

Zmiany:
- usunięte stare oczekiwania na już niewykorzystywaną inline shield-inspector logikę
- PASS75 checks dostosowane do aktualnego command routing (`control` / `sources`) zamiast starego review tokenu

### 6. Scroll/spacing safety
**Plik:** `app/globals.css`
- zachowane wcześniejsze safety klasy dla modala i scrolla
- układ dalej działa jako jedna większa powierzchnia przewijania, bez sztucznego rozbijania public/basic na przypadkowe sekcje

---

## Ruszone pliki
- `components/market-integrity/TokenRiskModal.tsx`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`

---

## Weryfikacja
Uruchomione lokalnie:
- `node scripts/verify-market-integrity-no-truncation.mjs` ✅
- `node scripts/verify-shield-design-safety.mjs` ✅
- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅

---

## Efekt produktu po PASS79
### Public/basic:
- mniejszy chaos
- mniej wielkich bloków
- wykres i najważniejsze dane są na pierwszym planie
- lepszy rozdział pomiędzy overview i premium/deep analytics

### Advanced:
- dalej zostaje ciężka warstwa terminalowa
- ale bardziej jako świadome rozszerzenie, a nie cały ekran od razu

---

## Realny status wizji
Po tym passie całość oceniam uczciwie na około **39–44%**.

Dlaczego nie więcej:
- core UX i architektura są już dużo mocniejsze,
- ale nadal trzeba jeszcze:
  - dopieścić advanced information architecture,
  - uprościć niektóre copy,
  - jeszcze bardziej premium zrobić Shield Map,
  - rozdzielić Basic / VLM / VLM Pro / Owner lanes produkcyjnie,
  - poprawić płynność i spójność wszystkich heavy panels.
