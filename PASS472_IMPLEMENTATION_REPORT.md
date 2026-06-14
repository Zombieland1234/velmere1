# PASS472 — Vercel Build Gate + i18n False Positive Hotfix

## Naprawione
- `scripts/check-i18n.mjs`: usunięto fałszywy i18n crash, gdzie regex traktował runtime `result.token.symbol` / `snapshot.token.image` jako widoczny klucz `Token.*`.
- `components/market-integrity/AssetLogo.tsx`: zamiana raw `<img>` na `next/image` z `fill`, `sizes`, `unoptimized`, fallbackiem i zachowaniem logo/glyph.
- `components/security/SecurityTrustPage.tsx`: przywrócono publiczną warstwę Security Trust do kontraktu PASS188/PASS189/PASS193: `buildSecurityTrustSnapshot`, `securityTrustPillars`, `SecurityOperationsChecklistPanel`, production boundary.
- `repair:codex-handoff`: root source-artifacts Codexa zostały przeniesione do `docs/codex-handoff/*.txt`, żeby Next/Vercel ich nie kompilował.

## Walidacja lokalna
- `npm run check:i18n` ✅
- `npm run repair:codex-handoff` ✅
- `npm run vercel:preflight` ✅ — 788 plików przeskanowane

## Nieuruchomione
- Pełny `next build` nie został ukończony w sandboxie, bo `npm ci` nie dociągnął kompletnego `next` w tym środowisku. Na Vercel powinno przejść dalej, bo tam install w logu zakończył się poprawnie przed wcześniejszym błędem i18n.
