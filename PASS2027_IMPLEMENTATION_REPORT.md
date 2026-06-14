# PASS2027 — Live Screenshot Visual Alignment Fix

Zakres: poprawki na bazie screenów użytkownika dla Real Markets, Shield, Audit Watch i Shield Map. Zmiany dotyczą warstwy UI/CSS oraz stabilności układu, bez zmian w logice płatności i bez cofania VLM Security.

## Co zostało poprawione

| Obszar | Problem ze screena | Poprawka PASS2027 | Status |
|---|---|---|---:|
| Real Markets modal | prawa kolumna była pustą ramką, brak widocznych Basic/Pro/Advanced | dodany twardy action stack `unified-asset-action-stack-pass2027` i CSS wymuszający widoczność 3 kart | 93% |
| Shield modal | za dużo wrażenia ramek/tabelek nałożonych na siebie | nowy kontrakt `minimal-separated-windows-no-overlap`: jedna rama modala, osobny header, osobny chart, osobny action rail | 92% |
| Metric cards | cena potrafiła skracać się do `39...` | PASS2027 znosi wymuszone ellipsis w readoutach i zwiększa budżet kart | 91% |
| Audit Watch | strona była zbyt wąska i wyglądała prymitywnie | layout rozciągnięty prawie na pełną szerokość z małym marginesem, większy formularz i pełniejsze sekcje | 90% |
| Audit Watch search | złote obramowanie miało zniknąć | zachowany clean focus bez złotej ramki | 94% |
| Shield Map | brak animowanego napisu nad wyszukiwarką | dodana animacja pisania/usuwania: źródła, dowody, decyzja | 88% |
| Real Markets icons | ikony indeksów/asset class mogły wpadać w ogólny fallback | poprawione mapowanie `indices -> index`, większe i bardziej stabilne logo w modalu | 86% |
| Minimalizm | blank/nested windows, ciężar tła | mocniejszy backdrop i brak pseudowarstw w PASS2027 modal shell | 91% |

## Pliki zmienione

- `app/globals.css`
- `components/market-integrity/UnifiedAssetAnalysisControls.tsx`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `components/market-integrity/ShieldMapCommandClient.tsx`
- `components/security/SecurityAuditWatchPage.tsx`
- `components/security/VlmAuditCommandClient.tsx`
- `scripts/verify-pass2027-visual-alignment-fix.mjs`

## Testy

Przeszły:

- `verify-pass2015-vlm-security-intelligence.mjs`
- `verify-pass2019-evidence-quorum-shadow-security.mjs`
- `verify-pass2020-source-integrity-sentinel.mjs`
- `verify-pass2021-temporal-consistency-sentinel.mjs`
- `verify-pass2022-narrative-drift-decision-reversibility.mjs`
- `verify-pass2023-vlm-audit-product.mjs`
- `verify-pass2024-vlm-paid-access.mjs`
- `verify-pass2025-vlm-paid-entitlement-ledger.mjs`
- `verify-pass2026-audit-modal-visual-polish.mjs`
- `verify-pass2027-visual-alignment-fix.mjs`
- TypeScript transpile check dla zmienionych plików TS/TSX.

## Ograniczenie

Pełny `next build` nie został potwierdzony, bo paczka nie zawiera `node_modules`. Live screenshot po poprawkach też wymaga uruchomienia projektu lokalnie lub na Vercel.
