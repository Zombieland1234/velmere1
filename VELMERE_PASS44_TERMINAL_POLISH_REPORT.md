# Velmère Shield — Pass 44

## Focus
Pass 44 keeps the Shield landing clean while making the terminal layer more useful and premium.

## Main upgrades
- added client-side sortable market table headers
- sort controls now work for:
  - rank
  - price
  - 24h change
  - 7d change
  - market cap
  - 24h volume
  - risk score
- added compact table coverage counter in the table toolbar
- preserved the minimal landing direction:
  - clean search bar
  - shield icon only on the right
  - market table as the main page content
- kept watchlist star actions inside the table row

## Token modal upgrades
- added desktop expand / compact toggle for the token risk modal
- expanded mode gives more room to the chart and terminal layout
- improved chart mode controls on smaller screens with horizontal overflow
- upgraded the candlestick crosshair tooltip:
  - date
  - open
  - high
  - low
  - close
  - volume
- kept the default chart mode as candlesticks
- preserved chart fallback logic from Pass 43

## Files changed
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`

## Checks
- TSX syntax smoke passed for changed files
- i18n check passed
- Vercel preflight passed

## Note
Full `tsc --noEmit` and `next build` require project dependencies / `node_modules` inside the sandbox. Static project checks and changed-component syntax smoke passed.
