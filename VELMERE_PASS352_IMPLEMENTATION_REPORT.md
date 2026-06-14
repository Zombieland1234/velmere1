# VELMÈRE PASS352 — Shield-grade Real Markets + Orbit scroll contract

## Zmienione pliki
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `app/[locale]/market-integrity/cross-asset/page.tsx`
- `app/globals.css`
- `scripts/verify-pass352-shield-grade-reader-orbit-contract.mjs`
- `package.json`
- `EDITING_MAP/VELMERE_MASTER_BUILD_MAP_PASS352.md`
- `VELMERE_NEXT_CHAT_PROMPT_PASS352.txt`

## Najważniejsze
- Real Markets ma teraz Shield-grade card contract: logo/glyph fallback, source/proof/risk strip, mini trend, front copy i details zamiast tabeli.
- Exchange Stability nie powtarza już explanation wszędzie; ma clean ledger.
- Second Source jest wyjaśnione jako 3 kroki dla człowieka.
- Orbit drawer ma PASS352 native scroll contract i leak stop dla body/orbit.

## Guardy
- `verify:pass352-shield-grade-reader-orbit-contract` ✅
- `verify:pass351-clean-reader-orbit-scroll-router` ✅
- `verify:pass350-shield-reader-orbit-scroll-engine` ✅
- `verify:pass349-clean-reader-orbit-scrollframe` ✅
- `verify-pass348-real-market-pro-orbit-native` ✅
- `verify-pass347-real-market-reader-orbit-v5` ✅
- `verify-pass346-real-market-cards-orbit-scroll` ✅
- `verify-pass345-provider-search-pdf-orbit` ✅
- `verify-pass344-user-blocker-repair` ✅
- `check:i18n` ✅
- `typecheck` ❌ nadal blokowany przez brak zależności/typów w paczce eksportowej (`next`, `react`, `lucide-react`, `next-intl`, `@types/node`, `tailwindcss`, `zustand`, itd.).
