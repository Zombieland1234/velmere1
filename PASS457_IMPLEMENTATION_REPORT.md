# PASS457 — Shield AI Runtime + Progressive Disclosure

## Objective
Connect the customer-visible Shield AI to the actual loaded risk result and history, remove literal `unknown` output from that assistant lane, respect PL/DE/EN, and stop the Shield modal from presenting dozens of legacy operator gates as one long public wall of text.

## Implemented

### 1. Shield AI is now actually rendered
- `AskShieldChatPanel` existed but was not mounted in the public token modal.
- It is now rendered directly below Basic / Pro / Advanced controls.
- The panel receives the same `result`, `history` and active locale as the rest of Shield.
- A PASS457 source-state badge reports `source_bound`, `partial` or `source_required`.

### 2. Shared missing-data policy
- `shield-chat.ts` now uses `humanMissingValue` instead of returning the literal string `unknown`.
- Missing price, liquidity, volume, stress and candle values are explained as source requirements.
- Internal uncertainty semantics remain available through `sourceState` and risk tone.
- No missing number is replaced with a synthetic value.

### 3. Full PL / DE / EN assistant lane
- Risk, holder, liquidity, candle, evidence and general answers have localized labels, headlines, actions and guardrails.
- Prompt recognition understands Polish, German and English terms.
- The in-modal quick prompts and placeholder follow the selected page language.
- API routes sanitize locale to `pl`, `de` or `en` before building the deterministic Shield answer.

### 4. Public UI cleanup
- The large legacy PASS gate stack remains available for engineering/operator inspection.
- It is now placed inside one collapsed `Operator diagnostics` disclosure.
- The public reading order is now:
  1. market chart,
  2. Basic / Pro / Advanced,
  3. connected Shield AI answer,
  4. optional operator diagnostics.
- This preserves regression markers and historical controls without forcing them into the customer-facing flow.

### 5. API parity
The following routes now pass locale into the same Shield response builder:
- `/api/market-integrity/angel`
- `/api/market-integrity/chat`
- `/api/market-integrity/report`

## Files changed
- `lib/market-integrity/shield-chat.ts`
- `components/market-integrity/TokenRiskModal.tsx`
- `app/api/market-integrity/angel/route.ts`
- `app/api/market-integrity/chat/route.ts`
- `app/api/market-integrity/report/route.ts`
- `scripts/verify-pass457-shield-ai-progressive-disclosure.mjs`
- `package.json`

## Validation
Passed:
- `npm run verify:pass457-shield-ai-progressive-disclosure`
- `npm run verify:pass456-asset-aware-pdf-realmarkets`
- `npm run verify:pass455-human-decision-pdf-forge`
- `npm run verify:pass454-evidence-dense-human-analysis`
- `npm run verify:pass453-unified-intelligence-handoff`
- `npm run check:i18n`
- `npm run vercel:preflight`

Results:
- PASS457 parsed 766 TS/TSX files.
- i18n parity passed across PL / DE / EN.
- Vercel preflight scanned 762 files.

## Current blockers
- A full `next build` still requires installed dependencies.
- Browser visual QA still requires a running Next.js server and Chromium.
- Real stock fundamentals, exchange reserves and true order-book slippage still require production provider adapters.
- The older operator modules remain large; PASS457 hides them from the public flow but does not yet delete or consolidate their source files.

## Next pass
**PASS458 — Real Markets Provider Truth Router**
- explicit provider registry per asset class,
- stock fundamentals adapter contract,
- venue-status/depth contract for Binance and MEXC,
- source freshness and fallback reason shown directly in table rows,
- runtime probe for AAPL, BTC, EUR/USD, gold and Binance venue health.
