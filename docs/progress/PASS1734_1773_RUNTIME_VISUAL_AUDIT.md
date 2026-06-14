# PASS1734–1773 — Runtime visual audit, popups, cart, modal minimalism

Goal: audit the whole active project surface for the exact issues reported by the user: missing popup windows, missing cart sheet, excessive color/noise, messy layout, modal lag, and non-minimal market flows.

## Product decisions

- Header dropdowns are treated as one exclusive family: language, wallet and account cannot stay open together.
- Cart is allowed to open only as a bottom sheet with its own scroll owner.
- Shield and Real Markets keep one public modal grammar: rectangular chart + attached Basic/Pro/Advanced rail.
- Bubble/orbit/circular public asset modal styles remain suppressed.
- Gold remains the primary luxury accent; cyan is restricted to source/analysis states.

## Runtime work

- Added PASS1734 runtime cleanliness contract with eight lanes and 29 required checks.
- Added richer popup/cart markers for Playwright and manual QA.
- Hardened DropdownRoot with anchored/fallback placement metadata and viewport-clamped width.
- Added header exclusive opener helper to avoid competing dropdown/cart states.
- Added cart open event detail and a PASS1734 bottom-sheet marker.
- Added chart wheel ownership marker and capture-phase default prevention so page/modal scroll does not steal chart zoom.
- Added CSS override layer for popup visibility, cart bottom sheet placement, rectangular modal minimalism, bubble/orbit suppression and mobile three-button rail.

## Still not claimed

Full npm ci, typecheck, lint, build and browser Playwright are still not claimed in this sandbox. This pass is a static/runtime-readiness hardening pass and should be followed by real click QA on a Node 24 machine.
