# Velmère Shield — Pass 52

## Pass scope
This pass pushes Shield closer to the intended AI-bot / SOC terminal direction rather than a static dashboard.

## Added
- `lib/market-integrity/shield-chat.ts`
  - deterministic Ask Shield response engine
  - understands risk, holders, liquidity, candles, evidence and general prompts
  - returns headline, answer, cards, next actions, guardrails and confidence
- `app/api/market-integrity/chat/route.ts`
  - `/api/market-integrity/chat?query=BTC&prompt=Explain+risk`
  - returns grounded Shield chat JSON
- report endpoint now includes `shieldChat`

## Modal upgrades
- replaced the old static command deck with an interactive **Ask Shield AI bot** panel
- quick commands:
  - Explain risk without hype
  - Audit holders and clusters
  - Check exit depth
  - Read candles like Binance
  - Build evidence report
- added custom prompt input
- generated response cards directly in the modal
- added Chat JSON link for evidence/debugging

## Holder map upgrade
- replaced the sparse holder flow row with a dense cluster-card map
- whale / CEX / DEX / retail / team / unknown nodes now fill the space better
- lane scores remain visible without creating large empty areas

## Design safety
- added more CSS safety classes for chat and cluster panels
- updated no-truncation guard to include chat engine and chat route
- kept no-fraud/no-investment-advice guardrails inside the chat engine

## Checks
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
