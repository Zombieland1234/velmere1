# Velmère Shield — Pass 49

## Focus
This pass tightens the direction agreed in the chat: Shield must feel like an AI risk bot and a premium investigation terminal, not a static dashboard.

## Added
- AI Risk Bot engine:
  - `lib/market-integrity/ai-risk-bot.ts`
- AI Risk Bot API:
  - `/api/market-integrity/assistant?query=BTC`
  - `/api/market-integrity/assistant?query=SOL`
  - `/api/market-integrity/assistant?query=OM`
- Evidence report now includes:
  - `aiRiskBot`

## Main UI improvements
- Shield icon now feels more alive with persistent pulse / glow.
- Shield inspector now has:
  - AI bot JSON shortcut
  - Shield map shortcut
  - three operating rules:
    - ask
    - verify
    - guard
- Main page keeps the agreed clean layout:
  - search
  - shield icon
  - table

## Token modal improvements
- Added `Velmère AI risk bot` panel.
- The bot produces:
  - verdict
  - narrative
  - dominant layer
  - confidence
  - ranked commands
  - uncertainty guard
  - next analyst question
- Header now has an `AI Bot` JSON link next to evidence.
- Chart section now has a chart analyst note and range/bar/mode status so the area does not feel empty under the chart.

## Binance / MEXC candle improvement
`lib/market-integrity/binance-klines.ts` now returns denser candle sets:
- 7d: 1h x 168 candles
- 1d: 15m x 96 candles
- 4h: 5m x 48 candles
- 1h: 1m x 60 candles
- 15m: 1m x 60 candles
- 1m: 1m x 120 candles

This makes non-1h ranges look much closer to a real trading terminal instead of showing a few weak bars.

## Logo / token icon consistency
- Existing icon proxy remains active in table and modal.
- Modal header keeps token logo next to symbol/name.
- Table rows keep token logo next to every coin.

## Verification
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- TS/TSX smoke transpile for changed files.
