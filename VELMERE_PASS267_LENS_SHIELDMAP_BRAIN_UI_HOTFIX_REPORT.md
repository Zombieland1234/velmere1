# Velmère PASS267 — Lens / Shield Map / VLM Brain UI screenshot hotfix

## Zrobione

1. **VLM Brain Orbit / Basic / Pro / Advanced**
   - Usunięto renderowanie małego badge `źródło live / source live` z kart Orbit/static, żeby nie zasłaniał danych na kafelkach.
   - Dodano `data-vlm-brain-mode={mode}` do portalu szczegółów klikniętego kafelka.
   - Dodano widoczną notkę trybu w drawerze: Basic / Pro / Advanced.
   - Drawer klikniętego kafelka został dociągnięty do prawej krawędzi, dostał mocniejsze `max-height`, scroll containment i sticky header.
   - Basic ukrywa ciężkie panele release/export/PASS, Pro ukrywa najgłębsze panele, Advanced zostawia pełny stos danych.

2. **Velmère Lens**
   - Przebudowano główną wyszukiwarkę Lens na sugestie typu Shield: ticker, nazwa, emoji/logo, confidence i akcja.
   - Dodano seed-sugestie: BTC, ETH, SOL, USDC, VLM, Contract Lens, OSINT.
   - Kliknięcie sugestii ustawia tryb i odpala `/api/search` jako szybki handoff do właściwego modułu.
   - Naprawiono wcześniejszy bałagan formularza/sugestii w komponencie Lens.

3. **Shield Map search**
   - Wyszukiwarka Shield Map dostała portal `createPortal(document.body)` jak main Shield search, żeby dropdown nie był ucinany przez panele.
   - Dodano glyph/avatar dla sugestii tokenów oraz scrollowalny panel wyników.
   - Kliknięcie sugestii od razu odpala investigator scan dla wybranego tokena.

4. **Protokół / mapa progresu**
   - Dodano `PASS267` delta file: `lib/launch/master-build-progress-delta-pass267.ts`.
   - Zaktualizowano `docs/progress/VELMERE_MASTER_BUILD_MAP.md`.
   - Zaktualizowano `lib/launch/project-progress.ts` i `lib/launch/master-build-areas.ts` markerami PASS267.
   - Dodano guard: `scripts/verify-pass267-lens-shieldmap-brain-ui-hotfix-safety.mjs`.
   - Dodano `verify:pass267-lens-shieldmap-brain-ui-hotfix` do `package.json` i do `verify:shield-all`.
   - Dodano PASS267 check do `scripts/vercel-preflight.mjs`.

## Walidacja

- `npm run verify:pass267-lens-shieldmap-brain-ui-hotfix` — PASS
- `npm run verify:pass266-claim-traceability-matrix-comprehension-gate` — PASS
- `npm run vercel:preflight` — PASS
- `npm run typecheck` — NIEPEŁNE: nie da się rzetelnie wykonać w tym ZIP-ie, bo nie ma `node_modules`; TypeScript zgłasza brak modułów typu `next`, `react`, `@types/node`, `wagmi`, `zustand`, itd.

## Pliki główne zmienione

- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `app/globals.css`
- `package.json`
- `scripts/vercel-preflight.mjs`
- `scripts/verify-pass267-lens-shieldmap-brain-ui-hotfix-safety.mjs`
- `lib/launch/master-build-progress-delta-pass267.ts`
- `docs/progress/VELMERE_MASTER_BUILD_MAP.md`
- `lib/launch/project-progress.ts`
- `lib/launch/master-build-areas.ts`
