# Velmère Shield — PASS 66

## PASS 66 — Terminal Usability Guard / Search Resolver / Sort UX Stability

### Scope
This pass continues after PASS 65 and focuses on the real issues observed in local UI usage:

- ticker search should resolve safely before falling back to analyze API,
- the search field stays clean and empty,
- sort headers must be reversible and understandable,
- the token modal should avoid page-level kernel panic,
- AI/Orchestrator/VLM/Shield controls should remain in-panel workflows, not raw JSON pages,
- source honesty and safe RegTech wording must stay visible.

### Changes implemented

1. Added `terminal-usability-guard.ts`
   - Builds a PASS66 usability/readiness object for the terminal.
   - Scores search resolver, two-way sort, modal stability, command routing, source honesty, mobile readability and legal-safe language.
   - Contains sort contracts, keyboard contracts, source honesty rows and kernel panic prevention rules.

2. Added `/api/market-integrity/usability-guard`
   - Produces a live usability guard payload for a token query.
   - Keeps mode as operator-session review with safe disclaimers.

3. Extended report endpoint
   - `app/api/market-integrity/report/route.ts` now includes `terminalUsabilityGuard` inside the evidence bundle.

4. Improved search flow
   - Added remote suggestion resolution before analyze fallback.
   - `SOL`, `BTC`, `ETH` style tickers can resolve through local rows or `/search` before the heavier analyze path.
   - Added a compact clear button without reintroducing a text scan button.
   - `Escape` closes suggestions and clears the current search.

5. Improved sort UX
   - Sort headers now expose direction copy through `aria-label`, `title` and screen-reader text.
   - Table header area shows the active sort mode, e.g. `sort · risk score · highest risk first`.
   - Missing values still fall to the bottom.

6. Added Terminal Usability Guard panel in the token modal
   - New command: `Usability guard`.
   - New panel: `Terminal usability guard · PASS66`.
   - Shows usability score, mode, checks, sort contract, kernel-panic prevention and source honesty.

7. Fixed chart range profile duplication
   - Removed duplicated `1d` range profile entry in `TokenRiskModal.tsx`.
   - Added verify checks so this does not come back silently.

8. CSS/design system additions
   - `.shield-usability-guard`
   - `.shield-sort-hint`
   - `.shield-search-icon-button`

9. QA scripts extended
   - `verify-market-integrity-no-truncation.mjs` now checks PASS66 files/tokens.
   - `verify-shield-design-safety.mjs` now checks PASS66 UI safety and duplicate `1d` profile prevention.

### Files changed

- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`
- `lib/market-integrity/terminal-usability-guard.ts`
- `app/api/market-integrity/usability-guard/route.ts`
- `app/api/market-integrity/report/route.ts`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`
- `VELMERE_PASS66_TERMINAL_USABILITY_GUARD_REPORT.md`

### Verification run

Passed:

```bash
node scripts/verify-market-integrity-no-truncation.mjs
node scripts/verify-shield-design-safety.mjs
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
```

Results:

```text
Market integrity no-truncation smoke passed.
Shield design safety checks passed.
i18n ok across 3 locale files
Velmère preflight OK · next 14.2.35 · scanned 310 files
```

### Typecheck note

`npm run typecheck` was attempted. It still cannot fully pass in this sandbox because the package has no installed dependency tree/types. The output is dominated by missing modules such as `next`, `react`, `lucide-react`, `next-intl`, `stripe`, `zustand`, `tailwindcss`, Node types and older unrelated project errors such as `AuthGate children` and implicit-any in legacy admin/store files.

A PASS66-specific type issue found during the first attempt was fixed: `liquidity.depthState` was replaced with the correct `liquidity.sourceMode` contract.

### Honest status

After PASS66, Velmère Shield / VLM is around 34–37% of the full vision. This pass improves real usability, stability and operator guardrails. The main production blockers remain live on-chain API, multi-exchange orderbook/depth, real wallet/session gating, billing/access enforcement, persistent audit logs, rate-limit middleware, real export infrastructure and legal/data-source policy pages.
