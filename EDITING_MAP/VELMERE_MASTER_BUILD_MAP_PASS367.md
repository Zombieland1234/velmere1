# VELMERE MASTER BUILD MAP — PASS367 UPDATE

## Current focus

PASS367 is a repair/polish pass, not a new speculative feature pass. It protects the current build from the bugs reported after PASS366.

## Updated blocker table

| ID | Area | Previous | Current | Delta | Status |
|---|---:|---:|---:|---:|---|
| E02 | Velmère Browser search UX | 99 | 100 | +1 | Fixed portal overlay above all layers |
| M08 | PDF/browser replay boundary | 76 | 79 | +3 | Locale passed to search + PDF route; copy less repetitive |
| B14 | Orbit drawer scroll | 82 | 88 | +6 | Right drawer native scroll + trim + slow slide-in |
| B15 | Orbit public drawer copy | 64 | 72 | +8 | Raw operator rails hidden from public drawer |
| C02 | Shield search/dropdown architecture | 99 | 99 | +0 | No direct change; Browser portal pattern ready to port |
| L02 | Real Markets visual parity | 42 | 48 | +6 | More logos, clearer categories, Shield-style modal retained |
| L03 | Real Markets data/provider boundary | 36 | 39 | +3 | Clearer context note, no fake live provider claim |
| A06 | Runtime crash protection | 94 | 96 | +2 | `safeChartStatusLabel` guard retained |
| J03 | Responsive/modal containment | 88 | 91 | +3 | Browser/PDF/Orbit z-index and scroll containment improved |
| D17 | Missing-data semantics | 94 | 95 | +1 | Better human copy in live Lens reports |

PASS367 total: +33 points.

## Remaining high-priority blockers

1. **PDF generation architecture** — downloaded PDF still uses manual PDF drawing commands; next step should generate sections from one shared report model to avoid mismatch with preview.
2. **Orbit sphere visual** — CSS now forces rounder surfaces and nodes, but true 3D neuron brain needs a stronger renderer pass.
3. **Real provider data** — Real Markets still uses deterministic preview data. Need provider keys/adapters for stocks, FX, commodities and ETFs.
4. **Public pages too dense** — Research Lab, Square, Security and launch readiness areas should move internal/debug panels out of public view.
5. **Security page product story** — needs a clean customer-facing page: what is protected, what is never requested, what remains private, how reports are signed.
6. **AI copy engine** — continue replacing raw terms like source mesh, proof escrow, circuit breaker with human language.
7. **Shield main search** — if scroll jump still appears, migrate it fully to the PASS367 Browser portal implementation.
8. **Lookbook commerce** — collection pages still need luxury lookbook grid rather than text-heavy product blocks.

## PASS368 recommended next move

PASS368 should be **PDF Parity + Public Copy Trim Gate**:

- build one shared report section model for preview and PDF,
- make PDF 4–5 pages automatically depending on content,
- localize labels PL / EN / DE,
- remove repetitive generic sections,
- clean Research/Square/Security pages by hiding internal launch panels from public routes.
