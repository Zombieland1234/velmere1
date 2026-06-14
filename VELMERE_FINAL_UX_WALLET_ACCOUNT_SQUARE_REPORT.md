# Velmère Final UX / Wallet / Account / Square Repair

Implemented after live inspection notes:

- Centered the desktop header as a single middle cluster: VELMÈRE + Men + Women, with Menu left and utilities right.
- Hardened the header background so white/light page sections do not wash out the logo or navigation.
- Moved UTC/EPOCH to the bottom-left desktop only and kept Angel as the bottom-right concierge bubble.
- Restored Angel to a cleaner ivory/gold mobile bubble style and kept it clear of the clock.
- Removed hard VLM balance gating from Square and Archive. Square is now public read-only for guests; login unlocks posting and comments.
- Account/Dashboard now require a local account session instead of wallet-only access.
- Dashboard has clearer account, assets, order, security and profile modules, plus a $0 simulation lane that does not send transactions.
- Wallet connection now blocks secondary wallet connection once a wallet is active and exposes disconnect only.
- Mobile MetaMask/Phantom flow sets a pending connection flag before deep-linking and auto-requests connection after the dapp opens inside the wallet browser.
- Improved route transitions and Basic/Pro transition timing to avoid rapid-toggle glitches.
- Angel system prompt now includes Square moderation behavior: ALLOW / REVIEW / BLOCK with short reasons.

Notes:
- MetaMask mobile requires the MetaMask in-app browser/deep link when no injected provider exists.
- Phantom mobile browse deep links are the supported web path for opening the dapp inside Phantom and exposing the Solana provider.
- Dashboard test action is simulation-only; it does not transfer funds or send a real transaction.
