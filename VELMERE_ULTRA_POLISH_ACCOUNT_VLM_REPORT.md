# Velmère Ultra Polish — Account / VLM / Motion / Translation Pass

Implemented based on latest screenshots and feedback.

## Fixed
- VLM Basic/Pro dock moved further away from Menu and scaled down in header context.
- Login screen rebuilt with cleaner luxury console layout.
- Login now has separate MetaMask Wallet and Phantom Wallet buttons with wallet icons.
- Google button remains a prepared staging action, not real OAuth until keys/callbacks are configured.
- Account locked view rebuilt with login/register primary path and optional wallet preview buttons.
- Dashboard expanded with translated copy, richer overview, asset, order, security and profile states.
- Neural brain caption now aligns beneath the visual instead of floating too far to the side.
- Page transitions now have stronger but still subtle fade/blur/scale motion.
- VLM Pro received additional modules: registry, cybersecurity, AMU baseline, Angel moderation.
- Auth copy additions added for EN/PL/DE.

## Honest limitations
- Google OAuth is not production-authenticated until OAuth credentials and callbacks are configured.
- VLM balance is still not real token gating until contract address, ABI and target chain are finalized.
- Wallet mobile flow uses documented MetaMask and Phantom deeplink/browser flows; Phantom mobile provider requires Phantom browser context or a full deeplink connect protocol.
