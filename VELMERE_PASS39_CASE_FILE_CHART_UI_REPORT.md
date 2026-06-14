# Velmère Pass 39 — Case File UI + Exchange Chart Polish

## Implemented

### 1. Persistent Alert Inbox
- Added `lib/market-integrity/alert-ledger.ts`.
- Sentinel alerts are now converted into persistent-style case records.
- Works in two modes:
  - Supabase mode when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` exist.
  - Memory fallback when no database is configured.
- New API endpoint:
  - `/api/market-integrity/alerts?limit=20`
- Updated Sentinel endpoint:
  - `/api/market-integrity/sentinel` now returns live alerts plus persisted `inbox`, `alertLedger`, and `alertStatus`.

### 2. Case File UI
- Added a two-column case-management panel on the Shield page:
  - Persistent Alert Inbox.
  - Case File / Timeline detail view.
- Each case shows:
  - symbol / name,
  - anomaly type,
  - score,
  - risk delta,
  - confidence,
  - observation count,
  - next investigation action,
  - evidence JSON button.

### 3. Severity Timeline
- Each case now gets a compact severity timeline:
  - case opened,
  - risk delta event,
  - market delta event,
  - review action.
- Timeline is built from Sentinel + memory/ledger data.

### 4. Binance/MEXC-style chart polish
- Candlestick chart now has:
  - OHLC top strip with tabular values,
  - MA / VOL / ALERTS / CROSSHAIR toolbar,
  - last price dashed line,
  - last price label on the right axis,
  - time ticks along the bottom,
  - larger chart height,
  - stronger exchange-terminal feel.

### 5. Shield About Page Upgrade
- Added animated radar/fusion visual.
- Added system-map section explaining the flow:
  - Market data,
  - Klines + depth,
  - Risk agents,
  - Evidence report.

### 6. Translation hardening
- Added PL / EN / DE translations for:
  - alert inbox,
  - case file,
  - scenario matrix,
  - timeline labels.

### 7. Supabase SQL
- Updated `docs/market-integrity-ledger.sql` with `market_integrity_alerts` table for persistent case inbox.

## Honest status
This still is not Chainalysis/Palantir. But the product now has the next serious RegTech layer: alerts are no longer just cards; they become cases with timeline, evidence links, and investigation actions.

## Suggested Pass 40
- Add user-controlled case states: `open`, `reviewing`, `closed`, `false positive`.
- Add case notes.
- Add risk delta chart inside each case.
- Add alert severity filters.
- Add CSV / JSON export for selected case.
