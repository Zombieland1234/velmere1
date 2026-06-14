# Velmère Mega Pass 04–10 — Final UX/Web3 Polish

## Honest implementation boundary
This pass implements real UI/UX, state, layout and Web3-flow improvements inside the codebase. It does not pretend that external production services are live without credentials. Google OAuth remains a production-ready/stub account action until OAuth provider IDs and callbacks are configured. Real VLM balance gating remains a UI/access architecture until the final token contract address, ABI and chain are provided.

## Implemented highlights
- Header collision repair: VLM Basic/Pro switch moved into a compact left dock between Menu and the centered brand group. It no longer collides with Men’s/Women’s Collection on desktop.
- VLM Basic/Pro transition rebuild: cinematic full-screen transition with grid, orbital scan, mode card, signal rows and more premium timing.
- VLM mode switch made smaller and denser in header context.
- Square post interaction changed from a fixed side overlay to inline expansion inside the feed. Posts now scroll naturally with their comments.
- Square comment layer rebuilt as a grey module instead of a black broken container.
- Comment input no longer sticks to viewport bottom in the feed context.
- Login/account flow remains account-first and wallet-optional.
- Mobile/touch improvements retained from previous pass: deep links for MetaMask/Phantom, audio hidden on mobile, safe input sizes, bottom ticker removal on mobile.

## Explicitly not faked
- Google sign-in is not real OAuth until Google provider credentials are added.
- VLM token ownership is not real until final contract details are added.
- $0 transaction lane is a simulation UI; it does not send on-chain transactions.

## Verification
- i18n check: passed across PL/EN/DE.
- TypeScript/TSX parse check: 203 files, 0 parse errors.
