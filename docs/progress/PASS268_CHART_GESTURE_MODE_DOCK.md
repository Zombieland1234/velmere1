# PASS268 — Chart natural-pan + no-OPIS VLM mode dock

## User-visible fix

- The chart pan direction is now locked to the user-requested natural contract: drag right moves the visible chart window right; drag left moves it left.
- The Basic / Pro / Advanced mode dock is now action-only. The extra `OPIS` buttons and mode-guide popup are removed from the token modal.
- A small status/trust rail stays under the depth buttons: chart-first, status lane, MwSt-safe copy. It is deliberately not a buy call, investment promise, public badge or urgency trick.

## Research notes applied before implementation

- MEXC-style exchange UX pattern used: chart-first, timeframe buttons, compact data chips and execution/source clarity.
- LVMH-style luxury pattern used: less clutter, status through restraint, premium spacing and trust through verifiable wording instead of loud badges.
- Psychology guard: scarcity/FOMO is only framed as review queue/status, not as a reason to buy or rush. MwSt/VAT trust language stays about commerce clarity and never implies token performance.

## Files touched

- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`
- `lib/launch/master-build-progress-delta-pass268.ts`
- `lib/launch/master-build-areas.ts`
- `lib/launch/project-progress.ts`
- `docs/progress/VELMERE_MASTER_BUILD_MAP.md`
- `docs/progress/PROJECT_PROGRESS_LEDGER.md`
- `scripts/verify-pass268-chart-gesture-mode-dock-safety.mjs`
- `package.json`

## Delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| C07 | Chart engine | 88% | 91% | +3% |
| C08 | Token modal shell | 93% | 94% | +1% |
| D18 | Basic / Pro / Advanced depth contract | 90% | 91% | +1% |
| J02 | Accessibility / ARIA | 62% | 63% | +1% |
| M04 | Safe export wording | 86% | 87% | +1% |

<!-- PASS268 marker: Chart natural pan + no-OPIS VLM mode dock active. -->
