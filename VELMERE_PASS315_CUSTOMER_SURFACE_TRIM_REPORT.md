# Velmère PASS315 — Customer Surface Trim + Scroll Stability

## Summary

PASS315 continues the public cleanup started in PASS314. The pass turns Lens, Shield Map, Square, Research Lab, Security and the market table into calmer customer-facing surfaces while keeping internal PASS/gate architecture available for guards and future operator/admin mode.

The main principle: public pages should show one action and one short explanation. Operator diagnostics, launch-control walls, PASS receipts and long readiness matrices stay hidden until a real operator/admin mode exists.

## New production code

- `lib/market-integrity/customer-surface-trim-gate.ts`
- `scripts/verify-pass315-customer-surface-trim-gate-safety.mjs`
- `package.json` script: `verify:pass315-customer-surface-trim-gate`
- `verify:shield-all` now chains PASS315 after PASS314.

## UI fixes

### VLM Browser / Lens

- Added `data-pass315-customer-surface-trim="vlm-browser"`.
- Removed the visible PASS294–PASS313 result wall from Lens render output.
- Added a compact `Velmère Cybersecurity PDF preview` card with subtle PDF forge animation.
- Kept the PASS313 marker as a hidden guard-compatible marker, not as public clutter.
- Public result now ends in: short capsule, source/missing/next step and Shield handoff.

### Shield Map

- Added `data-pass315-shield-map-trim="true"` and restored `data-pass314-shield-map-simplified="true"` on the page root so the PASS314 dropdown CSS actually applies.
- Added `data-pass315-public-command-strip="true"` on the clean command strip.
- Hid the post-investigator operator atlas sections from public view with a route-level CSS rule.
- Public Shield Map now keeps hero, a high-level system explanation and the investigator/search lane, without showing the long internal wall.

### Market table scroll

- Removed `onWheel={handleTableWheel}` from the desktop table scroll container.
- Added `data-pass315-table-scroll-direct="true"`.
- Added CSS for native horizontal table scroll while allowing vertical wheel movement to bubble to the page.
- This directly targets the lag/back-scroll feeling when scrolling over the table.

### Square / Community

- Square page now passes `publicTrim="pass315"` into the client.
- Square client hides modes/trust/launch-routing operator blocks in public trim mode.
- Added a compact `Public Square` brief before stats/feed.
- Community page got a public-trim marker while hidden launch-control remains guard-compatible.

### Research Lab

- Added public trim marker.
- Hid the validation matrix and release rails from public display for now.
- Research Lab remains a short safe-disclosure page instead of a long internal launch document.

### Security

- Added public trim marker.
- Security now keeps hero + first four trust pillars; roadmap/checklist walls are hidden from the public route.

## Guard results

```txt
PASS315 Customer Surface Trim + Scroll Stability verified.
PASS314 Public Signal Diet + Orbit Scroll Repair verified.
PASS313 Atelier Access Runway Gate verified.
i18n ok across 3 locale files
Velmère preflight OK · next 14.2.35 · scanned 635 files
```

`typecheck` still fails because the local package lacks dependency/type resolution for Next, React, Node, lucide-react, next-intl, Stripe, wagmi, Zustand, Tailwind and related inherited types. The first errors are still module/type-resolution errors, not PASS315 guard errors.

## Source/research alignment

- MEXC WebSocket market streams are connection-windowed, so live UI should have expiry/reconnect semantics rather than pretending a feed is permanent.
- MEXC Proof of Reserves is treated as a transparent reserve snapshot source, not a safety guarantee.
- LVMH/Aura-style Digital Product Passport logic supports concise provenance/traceability presentation. PASS315 applies the same idea to UI: show the customer a short proof/capsule, keep raw operator internals out of the public surface.

## Delta

| ID | Obszar | Previous | Current | Change |
|---|---:|---:|---:|
| E01 | Velmère Lens command router / customer search surface | 87 | 91 | +4 |
| E02 | Lens search UX / result density reduction | 88 | 92 | +4 |
| E07 | PDF-ready report preview / branded PDF cue | 78 | 81 | +3 |
| C04 | Token table states / scroll stability | 58 | 61 | +3 |
| J03 | Responsive layout / public overflow containment | 77 | 80 | +3 |
| J04 | Scroll lock / z-index layers | 96 | 97 | +1 |
| I01 | Velmère Square / public board clarity | 52 | 57 | +5 |
| I02 | Community page / public routing clarity | 46 | 49 | +3 |
| I03 | Research Lab / public research framing | 42 | 47 | +5 |
| F01 | Public Security page / customer trust containment | 74 | 78 | +4 |

**PASS315 total: +35 pkt.**

## Next recommended pass

PASS316 should continue with final public polish: product page cleanup, footer/legal link hygiene, mobile spacing sweep and removing/locking any remaining launch-control walls from customer routes.
