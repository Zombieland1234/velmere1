# PASS327 — Orbit Browser Lookbook Polish Gate

## Scope
- VLM Orbit 360: right-edge tile drawer keeps native scroll unlocked and uses a PASS327 marker for QA.
- VLM Browser/Lens: scan CTA no longer uses a sparkle/Gemini-like icon; it uses a Velmère `V` sigil.
- A4 PDF preview: adds a human-readable brief, source freshness language and a signature slot.
- Clothing: public collection copy is trimmed toward a lookbook and operator/provider language stays out of product cards.

## Design references applied
- Exchange-style data surfaces: depth/order-book ideas are used only as UI inspiration for source/depth/flow lanes, not as trading advice.
- Luxury house discipline: public surface is cleaner; hidden operator walls remain in docs/admin.

## PASS327 checks
Run:

```bash
npm run verify:pass327-orbit-browser-lookbook-polish
```

## Still blocked
- Real browser QA on Vercel/mobile for wheel/touch scroll.
- Real source ledger, orderbook adapters and durable evidence store.
- Real checkout/provider SKU/tax/shipping/legal review before production commerce.
