# Velmère Shield — PASS 60

## PASS 60 — AI Evidence + Liquidity Workflow + Source Honesty Spine

This pass continues from PASS 59 and focuses on turning the premium terminal into a more honest analyst workflow. The priority was not to add visual noise on the clean main page, but to strengthen the modal with evidence workflow, liquidity intelligence, source quality, VLM policy guardrails and build-to-100 production gates.

## Main outcomes

- Added a PASS60 Evidence Workflow module and modal panel.
- Added a PASS60 Liquidity Intelligence module and modal panel.
- Added source-ledger thinking: live/partial/fallback data must be visible beside strong visuals.
- Added API endpoints for evidence workflow and liquidity intelligence.
- Extended the full evidence bundle report endpoint with the new PASS60 modules.
- Updated AI Risk Bot to v5 with evidence/liquidity/source audit commands.
- Updated Holder Intelligence to v5 with source-ledger gates.
- Updated Terminal Readiness to v2 with a PASS60 production spine.
- Updated VLM Access Layer to v2 with policy spine guardrails.
- Extended verification scripts so future passes must keep the new modules and UI tokens present.

## Files changed

- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`
- `lib/market-integrity/evidence-workflow.ts`
- `lib/market-integrity/liquidity-intelligence.ts`
- `lib/market-integrity/ai-risk-bot.ts`
- `lib/market-integrity/holder-intelligence.ts`
- `lib/market-integrity/terminal-readiness.ts`
- `lib/market-integrity/vlm-access-layer.ts`
- `app/api/market-integrity/evidence-workflow/route.ts`
- `app/api/market-integrity/liquidity-intelligence/route.ts`
- `app/api/market-integrity/report/route.ts`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`

## Product notes

### Evidence workflow

The modal now has a dedicated evidence workflow panel with:

- case ID,
- evidence grade,
- source ledger,
- case steps,
- missing data,
- analyst commands,
- export/legal guardrails.

It keeps the correct RegTech tone: anomaly, review, missing data, uncertainty. It does not accuse tokens and does not provide investment advice.

### Liquidity intelligence

Liquidity is now handled as a dedicated intelligence layer, not just a decorative heatmap. It includes:

- source mode: live orderbook / market metrics / fallback uncertainty,
- liquidity risk score,
- uncertainty percent,
- visible depth,
- $10k slippage simulation where available,
- volume pressure,
- bid/ask imbalance,
- missing liquidity data and commands.

### Source honesty

PASS60 explicitly strengthens the idea that premium UI cannot hide weak data. If data is fallback/partial, the terminal must say so.

### VLM layer

VLM remains utility/access only. PASS60 adds stronger policy spine gates:

- access, not investment,
- member usage limits,
- wallet/session proof,
- policy pack before launch.

No ROI, yield, passive income, guaranteed profit or investment wording was added.

## Verification

Passed:

```bash
node scripts/verify-market-integrity-no-truncation.mjs
node scripts/verify-shield-design-safety.mjs
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
```

Typecheck was also attempted, but the sandbox/project package does not have the full dependency tree installed. It fails on missing modules such as `next`, `react`, `lucide-react`, `next-intl`, `stripe`, `zustand`, `tailwindcss`, Node types and several older project-level TypeScript issues already present outside this pass.

## Honest status

After PASS 60, the realistic full-vision status is around 24–27%.

The terminal is becoming more product-shaped: evidence workflow, liquidity intelligence, holder source gates, VLM access policy and command workflow exist. It is still not near 100% because production requires real on-chain APIs, live multi-exchange depth, wallet/session gating, persistent user state, audit logs, rate limits, export pipeline, billing/access, legal policy pack and production-grade data contracts.
