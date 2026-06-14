# VELMERE VLM / SQUARE / COLLECTIONS POLISH REPORT

## Scope
This pass addresses the latest mobile and desktop issues reported after testing `velmere-store-gamma/kappa`:

- VLM mode choice prompt appearing too late or after scroll restoration.
- VLM Basic/Pro header dock being too small and too far left.
- Square post detail behavior needing a YouTube/Shorts-style modal with comments on the side instead of inline expansion.
- Square composer plus button needing to stay on top and show a login-required state for guests.
- Men/Women collection pages needing a stronger 4x5 matrix-style product architecture.
- VLM Pro needing more lore/technology depth: AMU, Möbius, golden ratio, prime rhythm and cyber/security framing.

## Implemented

### VLM Mode Choice Prompt
- Prompt now opens immediately on first route entry.
- Forces viewport scroll to top on first open to avoid browser scroll-restoration confusion.
- Locks body/html scroll while open.
- Background is more uniform, less chaotic, and less blurred.

### Header Basic/Pro Dock
- Inline Basic/Pro dock enlarged.
- Dock moved farther toward the space between Menu and the central Velmère logo.
- Labels are more legible while remaining compact.

### Velmère Square
- Post click now opens a fixed, high-end modal panel.
- Modal uses a YouTube/Shorts-inspired reading model: post content on the left, comments on the right.
- Clicking outside closes the modal.
- Comment thread has its own scroll context.
- Composer FAB is fixed to the bottom-right and has higher z-index.
- Guests can read but get a clear login-required toast before publishing/commenting.

### Collections
- Shop now presents a 4x5 collection matrix concept for Men/Women.
- Active products remain clickable.
- Empty/future slots are presented as archive/drop slots, avoiding a cheap blank-state look.
- Higher-priced products are sorted first to create stronger luxury anchoring.

### VLM Pro Lore
- Added a Scientific Lore section in Pro mode.
- Möbius Book, Golden Ratio, Prime Lattice and Anti-Gravity Study are framed as visual/design systems, not real scientific or financial claims.

## Notes
- Real Google OAuth still requires OAuth credentials and callback setup.
- Real VLM balance/token gating still requires final contract address, ABI, chain and backend verification.
- Mobile MetaMask/Phantom deep links remain limited by each wallet provider's mobile browser/deeplink behavior.
