# Velmère Mobile / VLM / Cart Polish Report

Implemented after mobile screenshots:

- Centered and constrained the neural visual on mobile so the canvas/card sits on the same optical axis as the phone viewport.
- Added first-entry VLM mode chooser modal for Basic vs Pro. It appears on phone and desktop, stores a session choice, and keeps the header switch available on desktop.
- Moved the desktop Basic/Pro dock farther between Menu and VELMÈRE, and reduced its footprint so it does not collide with the menu or collection links.
- Made Basic mode visually calmer and slightly lighter in typographic weight.
- Added additional Pro modules: Angel concierge, signal board, private vault, and security forensics.
- Compressed mobile cart drawer height and removed the oversized legal/payment block when the cart is empty, preventing clipped checkout text on small screens.
- Strengthened page transition fade/blur/scale to make route changes feel more premium without using experimental Next.js APIs.
- Added EN/PL/DE translations for the new VLM chooser and auth/wallet copy.

Honest limits:

- Google OAuth is still staged until production OAuth credentials and callback URLs are configured.
- Real VLM balance gating still requires contract address, ABI, chain selection and token registry.
- Phantom mobile still requires Phantom deeplink / Phantom browser context by design.
