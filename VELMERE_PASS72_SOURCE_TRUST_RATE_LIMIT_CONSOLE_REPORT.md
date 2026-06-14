# Velmère Shield — PASS 72 Source Trust / Rate Limit / Data Readiness Console

## Scope
PASS 72 continues from PASS 71 and focuses on source truth rather than another decorative panel. The goal is to make the terminal safer and more product-realistic by separating live, partial, fallback and blocked data sources before the UI makes any risk statement.

## Main changes
- Added Terminal Source Trust module.
- Added Source Trust API endpoint.
- Added Source Trust section to the full evidence/report endpoint.
- Added Source Trust Console panel inside the token terminal.
- Added a new terminal command: `Source trust`.
- Added Shield Map PASS72 section explaining source truth, cooldowns and blocked data lanes.
- Added client-side external source cooldown after HTTP 429.
- Kept local table clicks functional during cooldown.
- Prevented one-off external scan spam by keeping search local-first and suggestions guarded.
- Added cooldown UI below clean search without reintroducing placeholder text or text scan button.
- Added CSS classes for Source Trust and Shield Map source cards.
- Extended verify scripts to lock PASS72 tokens and prevent regression.
- Normalized Launch Bridge session mode before passing it into modules expecting `member_session` instead of `member_utility`.

## Product impact
PASS 72 makes the system more honest about data quality:
- Search resolver shows cooldown instead of causing repeated 429 frustration.
- Terminal source lanes show whether data is live, partial, fallback or blocked.
- Missing order book, holder labels, contract verification, export and VLM session states are explicit blockers.
- Shield Map communicates the operating model without exposing private scoring weights.
- Premium UI is prevented from implying false certainty.

## Files changed
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `lib/market-integrity/terminal-source-trust.ts`
- `lib/market-integrity/terminal-launch-bridge.ts`
- `lib/market-integrity/terminal-usability-guard.ts`
- `app/api/market-integrity/source-trust/route.ts`
- `app/api/market-integrity/report/route.ts`
- `app/globals.css`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`

## Verification
Passed:
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`

## Typecheck note
`npm run typecheck` was attempted. It still fails in this sandbox because the package does not include full `node_modules` / framework type declarations. Missing dependencies include Next, React, next-intl, lucide-react, framer-motion, Stripe, Zustand, Tailwind and Node types. The run also reports older implicit-any / project-wide issues outside PASS72. During the attempt one source of meaningful module-level mismatch was fixed: Launch Bridge now normalizes `member_utility` to `member_session` when passing session mode into modules that expect member-session naming.

## Legal / RegTech guardrails
- No accusation language.
- No investment advice.
- No ROI/yield/passive-income language for VLM.
- Missing data increases uncertainty instead of implying safety.
- Evidence export remains blocked until source ledger and legal appendix are production-ready.

## Real status after PASS 72
Estimated completion of the full Velmère Shield / VLM vision: 39–43%.
The project is stronger as a product shell and internal operator terminal, but the biggest production blockers remain real on-chain APIs, live multi-exchange orderbook/depth, persistent audit logs, server-side rate limits/cache, wallet/session enforcement, billing/access enforcement and real evidence export infrastructure.
