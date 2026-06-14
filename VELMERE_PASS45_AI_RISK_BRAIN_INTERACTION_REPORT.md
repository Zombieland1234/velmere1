# Velmère Shield — Pass 45

## Direction
This pass moves Shield away from a simple token scanner and toward a richer SOC-style risk interface: interactive Shield brain on the landing page, stronger modal intelligence, holder-risk analysis, and a dedicated risk-brain JSON endpoint.

## Added

### Interactive Shield brain strip
- clicking the shield icon no longer feels dead/static
- a compact animated AI risk-brain layer opens under the search
- animated layers show: Velocity, Liquidity, Holders, Contract, Order book, Data
- scan action also opens the brain strip and pulses the visual layer

### Risk brain API
- new deterministic endpoint:
  - `/api/market-integrity/brain?query=BTC`
  - `/api/market-integrity/brain?query=SOL`
  - `/api/market-integrity/brain?query=OM`
- new engine file:
  - `lib/market-integrity/risk-brain.ts`
- report endpoint now includes `riskBrain`

### Modal risk brain
- token modal now includes a new **Velmère AI risk brain** card
- it explains the dominant layer, microstructure points, confidence and uncertainty
- includes direct link to Risk Brain JSON

### Holder intelligence
- replaced the old flat holder block with a real holder-risk lens
- it evaluates:
  - top-holder concentration
  - supply / FDV overhang
  - liquidity coverage
  - volume pressure
  - holder coverage confidence
- when real holder API data is missing, the UI does not show fake certainty; it labels proxy/unknown and gives next hardening step

### Empty-space reduction
- holder area is no longer a plain placeholder
- modal side panel has denser information with fewer dead zones
- main page keeps the clean search + shield + table direction but adds optional interactive intelligence only after click/scan

## Files touched
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `lib/market-integrity/risk-brain.ts`
- `app/api/market-integrity/brain/route.ts`
- `app/api/market-integrity/report/route.ts`

## Checked
- TSX/TS syntax smoke for changed files
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`

## Honest limitation
Full holder clustering still requires real chain-specific holder APIs, wallet labeling, CEX wallet exclusion, and historical snapshots. This pass builds the UI/API architecture and honest proxy layer without pretending missing chain data is real evidence.
