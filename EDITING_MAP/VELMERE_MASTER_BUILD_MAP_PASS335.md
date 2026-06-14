# VELMÈRE MASTER BUILD MAP — PASS335

## PASS335 — Global Risk Map → Lens A4 PDF context

### Zakres
PASS335 podpina Global Risk Map do VLM Browser / Lens A4 PDF, żeby raport nie był już tylko tokenową kartką, ale krótkim dokumentem z globalnym kontekstem rynku.

### Zrobione
- `components/search/VelmereIntelligenceSearchClient.tsx`
  - dodany `buildGlobalRiskMap()`
  - dodany marker `data-pass335-global-context-pdf`
  - A4 preview pokazuje sekcję `Global market context`
  - sekcja pokazuje 3 najwyższe lane heat: label, heat, level, human copy
- `app/api/search/lens-report/route.ts`
  - PDF builder dostał `GLOBAL MARKET CONTEXT`
  - HTML export dostał `.pass335-global-context`
  - raport nadal zawiera safe boundary: not financial advice, not a safety certificate, not a guaranteed result, not a buy/sell signal
- `app/globals.css`
  - dodane style A4 dla global risk context
- `scripts/verify-pass335-global-risk-pdf-context.mjs`
  - guard sprawdza marker, route, PDF/HTML export i safe boundaries
- `package.json`
  - dodany `verify:pass335-global-risk-pdf-context`

### ID / mapa
- M02 Lens report preview: +1
- M06 Report download route: +1
- M08 PDF/browser replay boundary: +1
- K02 Source freshness registry: +1
- L06 Adapter fallback/freshness boundary: +1
- D24 Human copy / PL/EN/DE safe copy: +1
- Cross-asset / Global Risk Map: +1

### Blockery
- Pełny typecheck nadal odpada przez brak lokalnych zależności/typów w paczce (`next`, `react`, `next-intl`, `lucide-react`, `tailwindcss`, `zustand`, `@types/node`, itd.).
- Global Risk Map dalej jest statycznym/szkieletowym kontekstem do czasu podpięcia realnych adapterów.
- PDF jest generowany prostym rendererem PDF, więc nadal nie jest idealnie 1:1 z HTML preview, ale ma już tę samą logikę i sekcję globalnego kontekstu.

### Następny PASS336
- Lens PDF V3: wyrównanie HTML preview i PDF jeszcze bliżej 1:1.
- Compact A4 composer: lepszy layout wielu sekcji bez przepełniania strony.
- Orbit Global Risk overlay: pokazanie globalnych lane heat jako orbitalny pierścień wokół tokena.
