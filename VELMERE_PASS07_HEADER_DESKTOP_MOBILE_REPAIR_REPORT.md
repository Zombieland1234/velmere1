# Velmère Pass 07 — Header desktop/mobile repair

## What changed

- Rebuilt the navbar spacing so the header uses the full viewport width instead of a centered 1440px container.
- Moved the desktop navigation to the left side next to Menu and kept it away from the centered VELMÈRE logo.
- Kept the VELMÈRE logo centered and clickable with its own pointer-safe layer.
- Reduced the account button to icon-only. The full “Prywatna konsola membera” text no longer appears in the top header.
- Kept the member chip as the right-side identity element on very large desktop screens: display name + wallet state/address.
- Made Mail icon-only and hidden on smaller screens.
- Tightened mobile spacing: menu icon, centered logo, account icon, cart icon. Wallet/language/mail/member chip stay off small mobile widths.

## Why

The previous pass made the header too crowded: logo, navigation, account text, mail, cart and member chip were competing for the same horizontal space. This pass separates the header into clean zones:

- left: menu + desktop nav,
- center: VELMÈRE logo,
- right: utility icons + member chip.

## Checks run

- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK
- Static bad-pattern scan — OK for `repeat: Infinity`, `iterationCount`, `border-white/12`, old invalid opacity classes.

## Build note

Full `next build` was not run in this sandbox because dependencies are not installed here. The package remains configured for Vercel with `npm install` and `npm run build`.
