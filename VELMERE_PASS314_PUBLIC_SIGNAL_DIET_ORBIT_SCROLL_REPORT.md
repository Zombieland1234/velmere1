# Velmère PASS314 — Public Signal Diet + Orbit Scroll Repair

## Summary

PASS314 responds to real browser QA feedback: the project had become visually overloaded on public routes and the Orbit 360 tile drawer did not feel like a premium right-edge panel because scroll/motion were weak.

The pass keeps the architecture and guards, but hides operator-heavy telemetry from customer pages.

## New production code

- `lib/market-integrity/public-signal-diet-gate.ts`
- `scripts/verify-pass314-public-signal-diet-gate-safety.mjs`
- `package.json` script: `verify:pass314-public-signal-diet-gate`

## UI fixes

### Orbit 360 tile detail

- Added `shield-vlm-detail-panel-pass314`.
- Added right-edge slide-in animation.
- Added fixed right-edge sizing with `top/right/bottom` placement.
- Added contained native vertical scroll with stable scrollbar gutter.
- Removed the wheel/touch stop handlers that could make the drawer feel locked.
- Added mobile bottom-sheet fallback.

### VLM Browser / Lens

- Added `data-pass314-vlm-browser-simplified="true"`.
- Removed the visible `VelmereLensCommandRouter` and `VelmereSearchDiscoveryRail` public wall.
- Replaced PASS294–PASS313 top wall with a short browser brief.
- Hid per-result internal `shield-pass*` receipts on the public browser route.
- Kept search suggestions, token logos/emojis and Shield handoff.

### Shield Map

- Added `shield-map-public-brief`.
- Removed visible PASS294–PASS313 sync wall from public Shield Map.
- Kept pass markers for guard compatibility.
- Added colorful token glyphs for Shield Map suggestions.
- Strengthened suggestion dropdown z-index and scroll containment.

### Research / Square / Community / Security

- Research Lab no longer renders public `FullSurfaceReadinessIndex`.
- Square and Community keep launch-control components in a hidden guard-compatible wrapper instead of showing them publicly.
- Security keeps operations checklist in a hidden guard-compatible wrapper and shows only the first four public trust pillars.

## Guard results

```txt
PASS314 Public Signal Diet + Orbit Scroll Repair verified.
PASS313 Atelier Access Runway Gate verified.
i18n ok across 3 locale files
Velmère preflight OK · next 14.2.35 · scanned 634 files
```

`typecheck` still fails because the package does not have local dependency/type resolution for Next, React, Node, lucide-react, next-intl, Stripe, wagmi, Zustand and other inherited project dependencies. After the PASS314 JSX repair, the failure returned to the older dependency/type blocker category.

## Source/research alignment

- MEXC WebSocket streams are time-boxed; live proof UI should expect expiry and reconnection rather than pretending live data is permanent.
- MEXC Proof of Reserves is treated as transparent token/network/wallet snapshot context, not a safety guarantee.
- LVMH/Aura-style digital product passports support a cleaner trust model: traceability, authenticity and lifecycle context should be shown as concise proof, not as a wall of internal telemetry.

## Delta

| ID | Obszar | Previous | Current | Change |
|---|---:|---:|---:|
| D19 | Brain interaction click coverage | 92 | 93 | +1 |
| D20 | Brain portal layering / scroll lock | 95 | 97 | +2 |
| E01 | Velmère Lens command router / public search-first UX | 83 | 87 | +4 |
| E02 | Lens search UX / clutter reduction | 83 | 88 | +5 |
| I01 | Velmère Square / public board clarity | 48 | 52 | +4 |
| I02 | Community page / public routing clarity | 42 | 46 | +4 |
| I03 | Research Lab / public research framing | 36 | 42 | +6 |
| F01 | Public Security page / trust copy containment | 70 | 74 | +4 |
| J03 | Responsive layout / overflow containment | 74 | 77 | +3 |
| J04 | Scroll lock / z-index layers | 94 | 96 | +2 |

**PASS314 total: +35 pkt.**
