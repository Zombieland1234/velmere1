# Velmère Shield — PASS 57 Gemini Terminal QA Hardening

## Scope
This pass continues from `velmere_pass56_full_visual_chart_modal_quality` and focuses on the Gemini checklist: exchange-grade chart semantics, responsive modal behavior, practical SOC analyst bot behavior, holder uncertainty visibility, VLM legal/access guardrails and verification hardening.

## What changed

### 1. Candlestick chart semantics and density
- Reworked range profiles so `1m`, `15m`, `1h`, `4h`, `1d` and `7d` behave like exchange candle intervals instead of tiny sparse windows.
- Added responsive candle density using `ResizeObserver`, `minimumVisibleBars` and `pixelsPerBar` so the chart adapts to modal width rather than only scaling a fixed SVG.
- Fixed an important naming/syntax risk in `ExchangeCandlesChart`: local price range is now `priceRange` instead of shadowing the `range` prop.
- Added visible bar count to the chart HUD: `visible x/y`.
- Added `preserveAspectRatio="none"` to keep the terminal chart filling its shell cleanly on mobile/desktop.
- Improved time tick formatting for minute/hour/day/week style ranges.

### 2. Binance/MEXC-style data mapping
- Updated Binance kline mapping:
  - `1m` -> 1m candles, 180 bars
  - `15m` -> 15m candles, 180 bars
  - `1h` -> 1h candles, 180 bars
  - `4h` -> 4h candles, 180 bars
  - `1d` -> 1d candles, 180 bars
  - `7d` -> 1w candles, 104 bars
- Added source labels that describe the real terminal interval.
- Adjusted cache windows by range.

### 3. CoinGecko fallback chart source
- Reworked CoinGecko chart fallback to request enough history for each exchange-like range.
- Added `resampleMarketChartPoints` so fallback points do not collapse into tiny sparse slices.
- Kept fallback behavior explicit: live Binance candles are preferred; CoinGecko/sparkline fallback remains contextual only.

### 4. Modal / mobile quality
- Modal now behaves more like a mobile bottom sheet on small screens and keeps full terminal layout on desktop.
- Reduced oversized mobile symbol title from `text-4xl` to `text-3xl` with responsive scaling.
- Kept body/html scroll locked while the modal is open.
- Added max-height and internal scrolling for AI bot command/history areas to prevent giant panels from pushing layout apart.

### 5. AI Risk Bot / SOC analyst mode
- Upgraded AI bot version to `VELMERE_AI_RISK_BOT_V2_PASS57`.
- Added data uncertainty percent into bot decisions and UI badges.
- Added SOC runbook guidance:
  - freeze wording at anomaly/review until sources are verified,
  - compare all candle ranges before escalation,
  - separate whales from CEX/custody/team wallets,
  - export evidence JSON before handoff.
- Guardrail now explicitly says: `Not financial advice. Algorithmic risk flag only.`

### 6. Holder Intelligence 2.0
- Upgraded holder intelligence version to `velmere-holder-intelligence-v2-pass57`.
- Added `dataUncertaintyPercent` as an explicit numeric output.
- UI now shows both data completeness and data uncertainty percent.
- Legal note now includes: `Not financial advice. Algorithmic risk flag only.`

### 7. VLM Access Layer bugfix
- Fixed a real data-scale bug: holder `dataCompleteness` is 0-100, but VLM access logic compared it as if it were 0-1.
- Fixed VLM stress access calculation to use `stress.scenarios.map(...)` instead of mapping the stress brief object itself.
- Holder feature reason now shows correct completeness/uncertainty percentages instead of inflated values.

### 8. Verify scripts
- Expanded `verify-market-integrity-no-truncation.mjs` to include `binance-klines.ts` and `coingecko.ts`.
- Expanded `verify-shield-design-safety.mjs` to check PASS 57 tokens:
  - `ResizeObserver`
  - `dataUncertaintyPercent`
  - exchange responsive SVG safety
  - PASS 57 AI/holder versions
  - CoinGecko resampling
  - Binance weekly interval support
- Added guards against the old holder completeness scale bug.

## Files changed
- `components/market-integrity/TokenRiskModal.tsx`
- `lib/market-integrity/binance-klines.ts`
- `lib/market-integrity/coingecko.ts`
- `lib/market-integrity/holder-intelligence.ts`
- `lib/market-integrity/ai-risk-bot.ts`
- `lib/market-integrity/vlm-access-layer.ts`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`
- `VELMERE_PASS57_GEMINI_TERMINAL_QA_HARDENING_REPORT.md`

## Verification run
Passed:

```bash
node scripts/verify-market-integrity-no-truncation.mjs
node scripts/verify-shield-design-safety.mjs
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
```

Additional check attempted:

```bash
npm run typecheck
```

This could not be fully trusted in the sandbox because `node_modules` is not installed. TypeScript reported missing `next`, `react`, `lucide-react`, `next-intl`, `stripe`, `zustand`, Node types and JSX intrinsic types. The dependency-related failure is expected in this unpacked ZIP environment.

## Honest product status
After PASS 57, Velmère Shield is around 19-22% of the full vision. The terminal is more coherent, charts are semantically stronger, and RegTech guardrails are safer, but the product still needs real on-chain holder APIs, live depth aggregation, authenticated VLM gating, persistent case workflows, production AI chat, billing/access logic and full legal pages before it can be treated as a serious public product.
