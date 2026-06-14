# PASS328 — A4 PDF Print Polish + Click-Gated Browser Preview

## Scope
PASS328 kontynuuje mapę po PASS327 i domyka kolejny P0/P1 obszar: VLM Browser / Lens A4 PDF. Zasada publiczna zostaje taka sama: klient widzi krótki wynik i może sam kliknąć `Otwórz podgląd PDF`; kartka A4 nie wyskakuje automatycznie po samym searchu.

## Zmienione pliki
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `app/api/search/lens-report/route.ts`
- `app/globals.css`
- `scripts/verify-pass328-a4-pdf-print-polish-safety.mjs`
- `package.json`

## Realne poprawki
1. **VLM Browser click gate**
   - Naprawiono flow: po zwykłym wyszukaniu wynik zostaje na stronie, ale `pdfPreviewResult` nie otwiera już automatycznie A4.
   - A4 pokazuje się dopiero po kliknięciu `Otwórz podgląd PDF`.

2. **A4 preview polish**
   - Dodano `data-pass328-a4-report-sheet` i `data-pass328-a4-report-grid`.
   - Kartka ma teraz sekcje: Executive brief, Query, Source state, Freshness confidence, Report status, Customer boundary, Export lane, What Lens checked, Human brief, Proof passport lane, Missing data, Next operator step, Legal / trust boundary, signature slot.
   - Dodano miejsce na przyszły podpis graficzny i mocniejszy footer `Velmère Cybersecurity`.

3. **Print CSS**
   - Dodano globalny kontrakt `@page { size: A4; margin: 0; }`.
   - A4 ma proporcje `210 / 297`, lepszy cień, print-safe layout, mobile grid fallback i print media rules.

4. **PDF endpoint**
   - `/api/search/lens-report?format=pdf&q=...` dalej zwraca `application/pdf`.
   - Route dostał PASS328 marker, Proof passport lane, source freshness boundary i bezpieczne disclaimery.

5. **Inspiracja / research**
   - MEXC: traktować market/depth/live data jako źródła wymagające freshness, reconnect, expiry i fallback. Nie udawać live danych bez czasu źródła.
   - LVMH / DPP: użyte jako kierunek dla customer-readable provenance, lifecycle traceability i proof passport language, bez nadmiaru technicznej ściany.

## Guardy
- `npm run verify:pass328-a4-pdf-print-polish` ✅
- `npm run verify:pass327-orbit-browser-lookbook-polish` ✅
- `npm run check:i18n` ✅

## Typecheck / build blocker
`npm run typecheck` nadal odpada przez stary globalny blocker zależności/typów: `next`, `react`, `lucide-react`, `next-intl`, `stripe`, `wagmi`, `zustand`, `tailwindcss`, `@types/node` itd. To nie jest nowy błąd PASS328 i nie wolno oznaczać pełnego typecheck/build jako zielonego do czasu instalacji zależności i porządkowania typów.

## Delta mapy
- E02 Lens search UX: +1 — search nie auto-otwiera A4.
- E07 PDF-ready report preview: +3 — layout raportu dostał sekcje i print contract.
- M02 Lens report preview: +3 — preview wygląda bardziej jak dokument.
- M06 Report download route: +1 — endpoint utrzymany i rozszerzony.
- M08 PDF/browser replay boundary: +2 — click-gated preview + safe export boundary.
- B03 Visual rhythm: +1 — mniej chaosu w Browser report.
- J03/J04 responsive/print boundary: +2 — A4 CSS i mobile grid fallback.

Łącznie: +13 punktów.
