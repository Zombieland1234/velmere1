# PASS433 — Real Internet Data Arbitration

Scope: bugfix + AI brain only. PASS433 turns the previous live-data probe into an arbitration layer that can show what providers were actually attempted, what fields resolved, what is still missing, and whether PDF/chat may say live, partial, conflict, or sealed.

Implemented:

- `lib/market-integrity/pass433-real-internet-data-arbitration.ts`
  - provider probes for crypto-market, DEX liquidity, token security, real-market, exchange-health lanes
  - `real_internet_confirmed`, `real_internet_partial`, `cross_source_conflict`, `missing_data_hunt`, `sealed_no_fake_live`
  - missing-data hunter with customer-visible fields and next-provider hints
  - no-fake-live envelope for PDF/chat confidence caps
- `risk-brain.ts`
  - exposes `pass433`
  - adds PASS433 line to the decision path
- `lens-report.ts`
  - adds `pass433` customer-facing real-data contract without a second copy generator
- API routes
  - `/api/market-integrity/analyze`
  - `/api/market-integrity/brain`
  - `/api/market-integrity/chat`
  - `/api/market-integrity/angel`
  - `/api/market-integrity/probe`
- Probe route
  - actively attempts CoinGecko and DEX Screener + GoPlus lanes before returning arbitration
  - returns `providerAttempts`, `pass432`, `pass433`, `arbitration`, and combined repair plan
- Local script
  - `npm run probe:pass433-real-internet-data -- bitcoin ethereum solana NVDA EURUSD=X MEXC`

Release rule: if a field is missing, the UI/PDF/chat must show it. PASS433 must never invent second-provider confirmation or live data when provider status is error, partial, or not attempted.
